import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
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
const extendedResources = args.includes("--extended-resources");
const selfTest = args.includes("--self-test");

const usage =
  "Usage: node audit-production-sitemap.mjs --domain example.com --state state.json --output report.json [--sitemap URL] [--origin-ip IP] [--delay-ms 500] [--max-pages N] [--recheck-failures] [--extended-resources]";

if (args.includes("--help")) {
  console.log(`${usage}\n       node audit-production-sitemap.mjs --self-test`);
  process.exit(0);
}

if (!selfTest && (!domain || !sitemapUrl || !statePath || !outputPath)) {
  console.error(usage);
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
let lastRequestStartedAt = 0;

async function waitForRequestSlot() {
  if (!extendedResources || delayMs <= 0) return;
  const remaining = delayMs - (Date.now() - lastRequestStartedAt);
  if (remaining > 0) await sleep(remaining);
  lastRequestStartedAt = Date.now();
}

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

function readAttribute(tag, name) {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    "i",
  );
  const result = tag.match(pattern);
  return result ? decodeXml(result[1] ?? result[2] ?? result[3] ?? "") : null;
}

function findLinkHref(html, relToken, accept = () => true) {
  for (const matchResult of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = readAttribute(matchResult[0], "rel");
    if (!rel?.toLowerCase().split(/\s+/).includes(relToken)) continue;
    const href = readAttribute(matchResult[0], "href");
    if (href && accept(href)) return href;
  }
  return null;
}

function findMetaContent(html, name) {
  for (const matchResult of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (readAttribute(matchResult[0], "name")?.toLowerCase() !== name) continue;
    return readAttribute(matchResult[0], "content");
  }
  return null;
}

function findScriptSource(html, accept = () => true) {
  for (const matchResult of html.matchAll(/<script\b[^>]*>/gi)) {
    const source = readAttribute(matchResult[0], "src");
    if (source && accept(source)) return source;
  }
  return null;
}

function resolveUrl(value, baseUrl) {
  if (!value) return null;
  if (/^data:/i.test(value)) return value;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function headerValue(headers, name) {
  const value = headers?.[name];
  return Array.isArray(value) ? value.join(", ") : value || null;
}

function isSiteHost(hostname) {
  if (!domain) return false;
  const apex = domain.replace(/^www\./i, "");
  return hostname === apex || hostname === `www.${apex}`;
}

function requestOnce(
  url,
  redirects = 0,
  maxBodyBytes = MAX_BODY_BYTES,
  keepTail = true,
  redirectChain = [],
) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = https.request(
      {
        hostname:
          originIp && isSiteHost(parsed.hostname) ? originIp : parsed.hostname,
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
          const nextUrl = new URL(location, url).toString();
          response.resume();
          resolve(
            requestOnce(
              nextUrl,
              redirects + 1,
              maxBodyBytes,
              keepTail,
              [
                ...redirectChain,
                {
                  status: response.statusCode || 0,
                  from: url,
                  to: nextUrl,
                  location,
                },
              ],
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
            redirectChain,
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
      await waitForRequestSlot();
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

function discoverResources(html, pageUrl) {
  const declaredIcon =
    findLinkHref(html, "icon") ||
    findLinkHref(html, "apple-touch-icon") ||
    findLinkHref(html, "mask-icon");
  const faviconSource = declaredIcon
    ? /^data:/i.test(declaredIcon)
      ? "inline"
      : "declared"
    : "fallback";
  const faviconUrl = declaredIcon
    ? resolveUrl(declaredIcon, pageUrl)
    : new URL("/favicon.ico", pageUrl).toString();
  const acceptSameSite = (value) => {
    const resolved = resolveUrl(value, pageUrl);
    return resolved && !/^data:/i.test(resolved) && isSiteHost(new URL(resolved).hostname);
  };

  return {
    faviconSource: faviconUrl ? faviconSource : "missing",
    faviconUrl,
    stylesheetUrl: resolveUrl(
      findLinkHref(html, "stylesheet", acceptSameSite),
      pageUrl,
    ),
    scriptUrl: resolveUrl(findScriptSource(html, acceptSameSite), pageUrl),
  };
}

async function checkResource(type, url, state) {
  const key = `${type}:${url}`;
  if (
    state.resources[key] &&
    (!state.resources[key].transientFailure || !state.resources[key].sameSite)
  ) {
    return state.resources[key];
  }

  const result = await request(url, { maxBodyBytes: 1_024, keepTail: false });
  const contentType = headerValue(result.headers, "content-type");
  const failures = [];
  const warnings = [];
  if (result.transientFailure) {
    failures.push(`persistent ${result.status || result.error}`);
  } else if (result.status < 200 || result.status >= 300) {
    failures.push(`status ${result.status || result.error}`);
  }
  if (
    type === "favicon" &&
    result.status >= 200 &&
    result.status < 300 &&
    /text\/html/i.test(contentType || "")
  ) {
    failures.push(`HTML response (${contentType})`);
  } else if (
    type === "favicon" &&
    result.status >= 200 &&
    result.status < 300 &&
    contentType &&
    !/^image\//i.test(contentType)
  ) {
    warnings.push(`unexpected content type ${contentType}`);
  }

  const record = {
    type,
    url,
    status: result.status || null,
    finalUrl: result.url || null,
    contentType,
    attempts: result.attempts,
    checkedAt: new Date().toISOString(),
    sameSite: isSiteHost(new URL(url).hostname),
    transientFailure: Boolean(result.transientFailure),
    failures,
    warnings,
  };
  state.resources[key] = record;
  return record;
}

async function inspectExtendedResources(html, pageUrl, state) {
  const discovered = discoverResources(html, pageUrl);
  const checks = [];
  if (discovered.faviconUrl && discovered.faviconSource !== "inline") {
    checks.push(["favicon", discovered.faviconUrl]);
  }
  if (discovered.stylesheetUrl) {
    checks.push(["stylesheet", discovered.stylesheetUrl]);
  }
  if (discovered.scriptUrl) checks.push(["script", discovered.scriptUrl]);

  const resourceFailures = [];
  const warnings = [];
  let stopReason = null;
  let faviconStatus = discovered.faviconSource === "inline" ? "inline" : null;
  let faviconFinalUrl = null;
  for (const [type, resourceUrl] of checks) {
    const result = await checkResource(type, resourceUrl, state);
    if (type === "favicon") {
      faviconStatus = result.status;
      faviconFinalUrl = result.finalUrl;
    }
    resourceFailures.push(
      ...result.failures.map((failure) => `${type} ${resourceUrl}: ${failure}`),
    );
    warnings.push(
      ...result.warnings.map((warning) => `${type} ${resourceUrl}: ${warning}`),
    );
    if (result.sameSite && result.transientFailure) {
      stopReason = `persistent transient ${type} failure at ${resourceUrl}: ${result.status || result.failures[0]}`;
      break;
    }
  }

  if (!discovered.faviconUrl) {
    resourceFailures.push("favicon declaration is invalid");
  }

  return {
    faviconSource: discovered.faviconSource,
    faviconUrl: discovered.faviconUrl,
    faviconStatus,
    faviconFinalUrl,
    criticalResourceUrls: {
      stylesheet: discovered.stylesheetUrl,
      script: discovered.scriptUrl,
    },
    resourceFailures,
    warnings,
    stopReason,
  };
}

function inspectPage(url, result) {
  const html = result.body || "";
  const title = match(html, /<title[^>]*>([^<]*)<\/title>/i);
  const canonical = findLinkHref(html, "canonical");
  const robots = findMetaContent(html, "robots");
  const xRobotsTag = extendedResources
    ? headerValue(result.headers, "x-robots-tag")
    : null;
  const h1Count = [...html.matchAll(/<h1\b/gi)].length;
  const expected = normalizeUrl(url);
  const finalUrl = normalizeUrl(result.url || url);
  const expectedCanonical = result.redirectChain?.length ? finalUrl : expected;
  const actualCanonical = canonical
    ? normalizeUrl(new URL(canonical, finalUrl).toString())
    : null;
  const failures = [];
  const warnings = [];

  if (result.status !== 200) failures.push(`status ${result.status || result.error}`);
  if (!isSiteHost(new URL(finalUrl).hostname)) {
    failures.push(`cross-host final URL ${finalUrl}`);
  }
  if (!title) failures.push("missing title");
  if (!actualCanonical) failures.push("missing canonical");
  if (actualCanonical && new URL(actualCanonical).hostname !== domain) {
    failures.push(`cross-host canonical ${actualCanonical}`);
  }
  if (actualCanonical && actualCanonical !== expectedCanonical) {
    failures.push(`canonical ${actualCanonical} != ${expectedCanonical}`);
  }
  if (robots && /\bnoindex\b/i.test(robots)) failures.push(`sitemap page is noindex: ${robots}`);
  if (xRobotsTag && /\bnoindex\b/i.test(xRobotsTag)) {
    failures.push(`sitemap page has X-Robots-Tag noindex: ${xRobotsTag}`);
  }
  if (h1Count !== 1) failures.push(`h1 count ${h1Count}`);
  if (/search_term_string|lorem ipsum|\bundefined\b|\bnull\b/i.test(`${title || ""} ${canonical || ""}`)) {
    failures.push("placeholder text in head");
  }
  if (result.redirectChain?.length) {
    warnings.push(`redirected ${result.redirectChain.length} time(s) to ${finalUrl}`);
  }

  return {
    url,
    status: result.status || null,
    finalUrl,
    title,
    canonical: actualCanonical,
    robots,
    h1Count,
    attempts: result.attempts,
    failures,
    ...(extendedResources
      ? {
          auditVersion: 2,
          redirectCount: result.redirectChain?.length || 0,
          redirectChain: result.redirectChain || [],
          xRobotsTag,
          effectiveRobots: [robots, xRobotsTag].filter(Boolean).join("; ") || null,
          warnings,
        }
      : {}),
  };
}

function runSelfTest() {
  const html = `<!doctype html><html><head>
    <link href="/expected" rel="canonical">
    <meta content="noindex, follow" name="robots">
    <link href="data:image/svg+xml,%3Csvg/%3E" rel="icon">
    <link href=/app.css rel=stylesheet>
    <script defer src="/app.js"></script>
  </head><body><h1>Check</h1></body></html>`;
  assert.equal(findLinkHref(html, "canonical"), "/expected");
  assert.equal(findMetaContent(html, "robots"), "noindex, follow");
  assert.match(findLinkHref(html, "icon"), /^data:image\/svg\+xml/);
  assert.equal(findLinkHref(html, "stylesheet"), "/app.css");
  assert.equal(findScriptSource(html), "/app.js");
  assert.equal(resolveUrl("../favicon.ico", "https://example.com/en/page"), "https://example.com/favicon.ico");
  assert.equal(headerValue({ "x-robots-tag": ["index", "follow"] }, "x-robots-tag"), "index, follow");
  console.log(JSON.stringify({ selfTest: "passed", checks: 7 }));
}

if (selfTest) {
  runSelfTest();
  process.exit(0);
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
    ...(extendedResources
      ? { schemaVersion: 2, auditProfile: "extended-v2", resources: {} }
      : {}),
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

if (extendedResources) {
  state.schemaVersion = 2;
  state.resources ||= {};
  state.auditProfile = Object.values(state.results).some(
    (result) => result.auditVersion !== 2,
  )
    ? "mixed-basic-v1-extended-v2"
    : "extended-v2";
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

  const pageResult = inspectPage(url, result);
  if (extendedResources) {
    const {
      stopReason,
      resourceFailures,
      warnings,
      ...resourceFields
    } = await inspectExtendedResources(result.body || "", pageResult.finalUrl, state);
    if (stopReason) {
      state.stoppedReason = stopReason;
      await saveState(state);
      console.error(stopReason);
      process.exitCode = 75;
      break;
    }
    pageResult.failures.push(...resourceFailures);
    pageResult.warnings.push(...warnings);
    Object.assign(pageResult, resourceFields, { resourceFailures });
  }

  state.results[url] = pageResult;
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
const extendedResults = results.filter((result) => result.auditVersion === 2);
const resourceResults = Object.values(state.resources || {});
const resourceFailures = resourceResults.filter(
  (result) => result.failures.length > 0,
);
const faviconSourceCounts = extendedResults.reduce((counts, result) => {
  const source = result.faviconSource || "missing";
  counts[source] = (counts[source] || 0) + 1;
  return counts;
}, {});
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
  coverageByAuditVersion: {
    basicV1: results.length - extendedResults.length,
    extendedV2: extendedResults.length,
  },
  ...(extendedResources
    ? {
        auditProfile: state.auditProfile,
        schemaVersion: state.schemaVersion,
        redirectedPageCount: extendedResults.filter(
          (result) => result.redirectCount > 0,
        ).length,
        xRobotsTagPageCount: extendedResults.filter(
          (result) => result.xRobotsTag,
        ).length,
        xRobotsNoindexCount: extendedResults.filter((result) =>
          /\bnoindex\b/i.test(result.xRobotsTag || ""),
        ).length,
        faviconSourceCounts,
        warningCount: extendedResults.reduce(
          (count, result) => count + (result.warnings?.length || 0),
          0,
        ),
        resourceSummary: {
          uniqueChecked: resourceResults.length,
          passed: resourceResults.length - resourceFailures.length,
          failed: resourceFailures.length,
          byType: Object.fromEntries(
            ["favicon", "stylesheet", "script"].map((type) => [
              type,
              resourceResults.filter((result) => result.type === type).length,
            ]),
          ),
        },
        resourceFailures,
      }
    : {}),
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, failures: undefined }));

if (state.remainingCount === 0 && failures.length > 0) process.exitCode = 1;
