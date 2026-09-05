import { readFile, writeFile } from "node:fs/promises";
import https from "node:https";

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const domain = option("--domain");
const sitemapUrl = option("--sitemap", domain ? `https://${domain}/sitemap.xml` : null);
const originIp = option("--origin-ip");
const statePath = option("--state");
const outputPath = option("--output");
const delayMs = Number(option("--delay-ms", "500"));
const maxPages = Number(option("--max-pages", "0"));
const recheckFailures = args.includes("--recheck-failures");

if (!domain || !sitemapUrl || !statePath || !outputPath) {
  console.error(
    "Usage: node audit-production-sitemap.mjs --domain example.com --state state.json --output report.json [--sitemap URL] [--origin-ip IP] [--delay-ms 500] [--max-pages N]",
  );
  process.exit(2);
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; IndexFinds low-load production audit/1.0; +https://indexfinds.com)";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_SITEMAP_BYTES = 16 * 1024 * 1024;
// Every sitemap URL is expected to resolve. Recheck 404/410 as well so a
// temporary server-render data miss cannot be recorded as a permanent stale
// sitemap entry. A genuinely missing URL will still fail after all attempts.
const RETRYABLE_STATUS = new Set([
  404,
  410,
  429,
  500,
  502,
  503,
  504,
  520,
  521,
  522,
  523,
  524,
]);
const TRANSIENT_STATUS = new Set([
  429,
  500,
  502,
  503,
  504,
  520,
  521,
  522,
  523,
  524,
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) =>
    decodeXml(match[1].trim()),
  );
}

function match(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || null;
}

function requestOnce(
  url,
  redirects = 0,
  maxBodyBytes = MAX_BODY_BYTES,
  keepTail = true,
) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = https.request(
      {
        hostname: originIp || parsed.hostname,
        servername: parsed.hostname,
        port: 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-encoding": "identity",
          "accept-language": "en-US,en;q=0.9",
          host: parsed.hostname,
          "user-agent": USER_AGENT,
        },
        timeout: 20_000,
      },
      (response) => {
        const location = response.headers.location;
        if (
          location &&
          [301, 302, 303, 307, 308].includes(response.statusCode || 0) &&
          redirects < 5
        ) {
          response.resume();
          resolve(
            requestOnce(
              new URL(location, url).toString(),
              redirects + 1,
              maxBodyBytes,
              keepTail,
            ),
          );
          return;
        }

        const chunks = [];
        const tailChunks = [];
        let bytes = 0;
        let tailBytes = 0;
        const finish = () => {
          const prefix = Buffer.concat(chunks);
          const tail = keepTail ? Buffer.concat(tailChunks) : Buffer.alloc(0);
          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            url,
            body: Buffer.concat(
              tail.length ? [prefix, Buffer.from("\n"), tail] : [prefix],
            ).toString("utf8"),
          });
        };
        response.on("data", (chunk) => {
          const prefixRemaining = Math.max(0, maxBodyBytes - bytes);
          if (prefixRemaining > 0) {
            const prefixSlice =
              chunk.length > prefixRemaining
                ? chunk.subarray(0, prefixRemaining)
                : chunk;
            chunks.push(prefixSlice);
          }
          bytes += chunk.length;
          if (keepTail && bytes > maxBodyBytes) {
            tailChunks.push(chunk);
            tailBytes += chunk.length;
            while (tailBytes > maxBodyBytes && tailChunks.length > 1) {
              tailBytes -= tailChunks.shift().length;
            }
          }
        });
        response.on("end", finish);
        response.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new Error("request timeout")));
    request.on("error", reject);
    request.end();
  });
}

async function request(
  url,
  { maxBodyBytes = MAX_BODY_BYTES, keepTail = true } = {},
) {
  const delays = [0, 1_500, 5_000];
  let last = null;
  for (const retryDelay of delays) {
    if (retryDelay) await sleep(retryDelay);
    try {
      last = await requestOnce(url, 0, maxBodyBytes, keepTail);
      if (!RETRYABLE_STATUS.has(last.status)) {
        return { ...last, attempts: delays.indexOf(retryDelay) + 1 };
      }
    } catch (error) {
      last = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  return {
    ...last,
    attempts: delays.length,
    transientFailure:
      !last?.status || TRANSIENT_STATUS.has(last.status),
  };
}

async function readSitemap(url, seen = new Set()) {
  const normalized = normalizeUrl(url);
  if (seen.has(normalized)) return [];
  seen.add(normalized);

  const result = await request(url, {
    maxBodyBytes: MAX_SITEMAP_BYTES,
    keepTail: false,
  });
  if (result.status !== 200) {
    throw new Error(`sitemap ${url} returned ${result.status || result.error}`);
  }
  const locs = extractLocs(result.body);
  if (!/<sitemapindex\b/i.test(result.body)) return locs;

  const urls = [];
  for (const child of locs) {
    urls.push(...(await readSitemap(child, seen)));
    await sleep(delayMs);
  }
  return urls;
}

function inspectPage(url, result) {
  const html = result.body || "";
  const title = match(html, /<title[^>]*>([^<]*)<\/title>/i);
  const canonical = match(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  const robots = match(
    html,
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
  );
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  const expected = normalizeUrl(url);
  const actualCanonical = canonical
    ? normalizeUrl(new URL(canonical, url).toString())
    : null;
  const failures = [];

  if (result.status !== 200) failures.push(`status ${result.status || result.error}`);
  if (!title) failures.push("missing title");
  if (!actualCanonical) failures.push("missing canonical");
  if (actualCanonical && new URL(actualCanonical).hostname !== domain) {
    failures.push(`cross-host canonical ${actualCanonical}`);
  }
  if (actualCanonical && actualCanonical !== expected) {
    failures.push(`canonical ${actualCanonical} != ${expected}`);
  }
  if (robots && /\bnoindex\b/i.test(robots)) failures.push(`sitemap page is noindex: ${robots}`);
  if (h1Count !== 1) failures.push(`h1 count ${h1Count}`);
  if (/search_term_string|lorem ipsum|\bundefined\b|\bnull\b/i.test(`${title || ""} ${canonical || ""}`)) {
    failures.push("placeholder text in head");
  }

  return {
    url,
    status: result.status || null,
    finalUrl: result.url || null,
    title,
    canonical: actualCanonical,
    robots,
    h1Count,
    attempts: result.attempts,
    failures,
  };
}

async function loadState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return null;
  }
}

async function saveState(state) {
  state.updatedAt = new Date().toISOString();
  state.completedCount = Object.keys(state.results).length;
  state.remainingCount = state.totalCount - state.completedCount;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

let state = await loadState();
if (!state) {
  const urls = [...new Set((await readSitemap(sitemapUrl)).map(normalizeUrl))].filter(
    (url) => new URL(url).hostname === domain,
  );
  state = {
    domain,
    sitemapUrl,
    originIp: originIp || null,
    startedAt: new Date().toISOString(),
    updatedAt: null,
    totalCount: urls.length,
    completedCount: 0,
    remainingCount: urls.length,
    urls,
    results: {},
    stoppedReason: null,
  };
  await saveState(state);
}

if (state.domain !== domain || state.sitemapUrl !== sitemapUrl) {
  throw new Error("checkpoint does not match the requested domain and sitemap");
}

if (recheckFailures) {
  for (const [url, result] of Object.entries(state.results)) {
    if (result.failures?.length > 0) delete state.results[url];
  }
  await saveState(state);
}

let processedThisRun = 0;
for (const url of state.urls) {
  if (state.results[url]) continue;
  if (maxPages > 0 && processedThisRun >= maxPages) break;

  const result = await request(url);
  if (result.transientFailure) {
    state.stoppedReason = `persistent transient failure at ${url}: ${result.status || result.error}`;
    await saveState(state);
    console.error(state.stoppedReason);
    process.exitCode = 75;
    break;
  }

  state.results[url] = inspectPage(url, result);
  state.stoppedReason = null;
  processedThisRun += 1;
  if (processedThisRun % 25 === 0) {
    await saveState(state);
    console.log(`${domain}: ${state.completedCount}/${state.totalCount}`);
  }
  await sleep(delayMs);
}

await saveState(state);
const results = Object.values(state.results);
const failures = results.filter((result) => result.failures.length > 0);
const report = {
  generatedAt: new Date().toISOString(),
  domain,
  mode: originIp ? "production-origin-with-public-host-and-sni" : "public",
  sitemapUrl,
  totalCount: state.totalCount,
  completedCount: state.completedCount,
  remainingCount: state.remainingCount,
  stoppedReason: state.stoppedReason,
  passedCount: results.length - failures.length,
  failedCount: failures.length,
  failures,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, failures: undefined }));

if (state.remainingCount === 0 && failures.length > 0) process.exitCode = 1;
