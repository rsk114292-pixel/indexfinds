import { writeFile } from "node:fs/promises";

const rawArgs = process.argv.slice(2);
const outputFlag = rawArgs.indexOf("--output");
const outputPath = outputFlag >= 0 ? rawArgs[outputFlag + 1] : null;
const summaryOnly = rawArgs.includes("--summary-only");
const domains = rawArgs.filter(
  (value, index) =>
    (outputFlag < 0 || (index !== outputFlag && index !== outputFlag + 1)) &&
    !value.startsWith("--"),
);

if (domains.length === 0) {
  console.error(
    "Usage: node audit-tenant-seo.mjs <domain> [...domain] [--output report.json]",
  );
  process.exit(2);
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; IndexFinds release audit/2.0; +https://indexfinds.com)";
const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_DELAYS_MS = [0, 500, 1_500];
const CONCURRENCY = 4;

function match(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || null;
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, url.pathname === "/" ? "/" : "");
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((entry) =>
    decodeHtml(entry[1].trim()),
  );
}

function extractLinks(html, baseUrl) {
  const links = [];
  for (const entry of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeHtml(entry[1].trim());
    if (
      !href ||
      href.startsWith("#") ||
      /^(?:mailto|tel|javascript|data):/i.test(href)
    ) {
      continue;
    }
    try {
      links.push(normalizeUrl(new URL(href, baseUrl).toString()));
    } catch {
      links.push(href);
    }
  }
  return [...new Set(links)];
}

function extractJsonLd(html) {
  const blocks = [];
  for (const entry of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const source = decodeHtml(entry[1].trim());
    try {
      blocks.push({ valid: true, value: JSON.parse(source) });
    } catch (error) {
      blocks.push({
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return blocks;
}

function jsonLdTypes(blocks) {
  const types = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value["@type"] === "string") types.add(value["@type"]);
    if (Array.isArray(value["@type"])) {
      value["@type"].forEach((type) => types.add(type));
    }
    Object.values(value).forEach(visit);
  };
  blocks.filter((block) => block.valid).forEach((block) => visit(block.value));
  return [...types].sort();
}

function defaultCrawlerIsBlocked(robots) {
  const blocks = [];
  let agents = [];
  let rules = [];

  const commit = () => {
    if (agents.length > 0) blocks.push({ agents, rules });
    agents = [];
    rules = [];
  };

  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) {
      if (rules.length > 0) commit();
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (rules.length > 0) commit();
      agents.push(value.toLowerCase());
    } else if (agents.length > 0) {
      rules.push({ field, value });
    }
  }
  commit();

  return blocks.some(
    (block) =>
      block.agents.includes("*") &&
      block.rules.some(
        (rule) => rule.field === "disallow" && rule.value === "/",
      ),
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
  const redirect = options.redirect || "follow";
  let lastError = null;

  for (const retryDelay of RETRY_DELAYS_MS) {
    if (retryDelay > 0) await delay(retryDelay);
    try {
      const response = await fetch(url, {
        redirect,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "user-agent": USER_AGENT,
        },
      });
      const body = options.body === false ? "" : await response.text();
      if (
        response.status >= 500 ||
        (response.status === 429 && !options.allowRateLimit)
      ) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      return {
        response,
        body,
        attempts: RETRY_DELAYS_MS.indexOf(retryDelay) + 1,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    error: lastError || "request failed",
    attempts: RETRY_DELAYS_MS.length,
  };
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

async function readSitemap(domain) {
  const root = await request(`https://${domain}/sitemap.xml`);
  if (!root.response) {
    return {
      status: null,
      error: root.error,
      childSitemaps: [],
      urls: [],
      failures: [`sitemap request failed: ${root.error}`],
    };
  }

  const rootLocs = extractLocs(root.body);
  const isIndex = /<sitemapindex\b/i.test(root.body);
  const childSitemaps = isIndex ? rootLocs : [];
  const failures = [];
  const urls = isIndex ? [] : rootLocs;

  const children = await mapLimit(childSitemaps, 2, async (url) => {
    const result = await request(url);
    if (!result.response || result.response.status !== 200) {
      failures.push(
        `child sitemap ${url} returned ${result.response?.status || result.error}`,
      );
      return [];
    }
    return extractLocs(result.body);
  });
  children.forEach((entries) => urls.push(...entries));

  return {
    status: root.response.status,
    error: null,
    childSitemaps,
    urls: [...new Set(urls)],
    failures,
  };
}

function pageMetadata(url, response, html) {
  const jsonLd = extractJsonLd(html);
  const title = match(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = match(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  const robots = match(
    html,
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
  );
  const canonical = match(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  const favicon = match(
    html,
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
  );
  const h1Values = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(
    (entry) =>
      entry[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
  );
  const h1 = h1Values[0] || null;
  const h1Count = h1Values.length;
  const failures = [];
  const expectedCanonical = normalizeUrl(url);
  const actualCanonical = canonical
    ? normalizeUrl(new URL(canonical, url).toString())
    : null;

  if (response.status !== 200) failures.push(`status ${response.status}`);
  if (!title) failures.push("missing title");
  if (!description) failures.push("missing description");
  if (h1Count !== 1) failures.push(`expected one h1, found ${h1Count}`);
  const metadataText = [title, description, h1].filter(Boolean).join(" ");
  if (/\b(?:search_term_string|undefined|null)\b|lorem ipsum/i.test(metadataText)) {
    failures.push("placeholder text in title, description or h1");
  }
  if (/\bIndexFinds\b/i.test([title, description].filter(Boolean).join(" "))) {
    failures.push("generic IndexFinds text in tenant metadata");
  }
  if (!robots || !/\bindex\b/i.test(robots) || /\bnoindex\b/i.test(robots)) {
    failures.push(`unexpected robots metadata: ${robots || "missing"}`);
  }
  if (actualCanonical !== expectedCanonical) {
    failures.push(
      `canonical ${actualCanonical || "missing"} != ${expectedCanonical}`,
    );
  }
  if (jsonLd.length === 0) failures.push("missing JSON-LD");
  if (jsonLd.some((block) => !block.valid)) failures.push("invalid JSON-LD");

  return {
    url,
    status: response.status,
    finalUrl: response.url,
    title,
    description,
    h1,
    h1Count,
    robots,
    canonical: actualCanonical,
    favicon,
    jsonLdTypes: jsonLdTypes(jsonLd),
    links: extractLinks(html, url),
    failures,
  };
}

async function audit(domain) {
  const origin = `https://${domain}`;
  const [home, robots, sitemap, www, httpApex] = await Promise.all([
    request(`${origin}/`),
    request(`${origin}/robots.txt`),
    readSitemap(domain),
    request(`https://www.${domain}/en`, { redirect: "manual", body: false }),
    request(`http://${domain}/en`, { redirect: "manual", body: false }),
  ]);

  const failures = [];
  const warnings = [];
  const robotsBody = robots.body || "";
  const robotsSitemap = match(robotsBody, /^\s*Sitemap:\s*(\S+)\s*$/im);
  const expectedSitemap = `${origin}/sitemap.xml`;

  if (!home.response || home.response.status !== 200) {
    failures.push(`home returned ${home.response?.status || home.error}`);
  }
  if (home.response && normalizeUrl(home.response.url) !== `${origin}/en`) {
    failures.push(`home final URL ${home.response.url} != ${origin}/en`);
  }
  if (!robots.response || robots.response.status !== 200) {
    failures.push(`robots returned ${robots.response?.status || robots.error}`);
  }
  if (defaultCrawlerIsBlocked(robotsBody)) {
    failures.push("robots blocks all crawlers");
  }
  if (robotsSitemap !== expectedSitemap) {
    failures.push(
      `robots sitemap ${robotsSitemap || "missing"} != ${expectedSitemap}`,
    );
  }
  if (sitemap.status !== 200) {
    failures.push(`sitemap returned ${sitemap.status || sitemap.error}`);
  }
  failures.push(...sitemap.failures);
  if (sitemap.urls.length === 0) failures.push("sitemap has no page URLs");

  const validateRedirect = (label, result) => {
    const location = result.response?.headers.get("location");
    if (!result.response || ![301, 308].includes(result.response.status)) {
      failures.push(`${label} returned ${result.response?.status || result.error}`);
      return { status: result.response?.status || null, location };
    }
    if (location !== `${origin}/en`) {
      failures.push(`${label} location ${location} != ${origin}/en`);
    }
    return { status: result.response.status, location };
  };

  const wwwRedirect = validateRedirect("www redirect", www);
  const httpRedirect = validateRedirect("http redirect", httpApex);

  const pages = await mapLimit(sitemap.urls, CONCURRENCY, async (url) => {
    const result = await request(url);
    if (!result.response) {
      return {
        url,
        failures: [`request failed: ${result.error}`],
        links: [],
      };
    }
    return pageMetadata(url, result.response, result.body);
  });

  pages.forEach((page) => {
    page.failures.forEach((failure) => failures.push(`${page.url}: ${failure}`));
  });

  const groupedTitles = pages.reduce((groups, page) => {
    if (page.title) (groups[page.title] ||= []).push(page.url);
    return groups;
  }, {});
  const groupedDescriptions = pages.reduce((groups, page) => {
    if (page.description) (groups[page.description] ||= []).push(page.url);
    return groups;
  }, {});
  const titleDuplicates = Object.entries(groupedTitles).filter(
    ([, urls]) => urls.length > 1,
  );
  const descriptionDuplicates = Object.entries(groupedDescriptions).filter(
    ([, urls]) => urls.length > 1,
  );
  if (titleDuplicates.length > 0) {
    failures.push("duplicate titles within sitemap");
  }
  if (descriptionDuplicates.length > 0) {
    failures.push("duplicate descriptions within sitemap");
  }

  const internalLinks = new Set();
  const externalLinks = new Set();
  pages.flatMap((page) => page.links || []).forEach((link) => {
    try {
      const url = new URL(link);
      if (url.hostname === domain || url.hostname === `www.${domain}`) {
        internalLinks.add(link);
      } else {
        externalLinks.add(link);
      }
    } catch {
      failures.push(`invalid link: ${link}`);
    }
  });

  const brokenInternalLinks = [];
  await mapLimit([...internalLinks], CONCURRENCY, async (url) => {
    const result = await request(url);
    if (!result.response || result.response.status >= 400) {
      brokenInternalLinks.push({
        url,
        status: result.response?.status || null,
        error: result.error || null,
      });
    }
  });
  brokenInternalLinks.forEach((link) => {
    failures.push(
      `broken internal link ${link.url}: ${link.status || link.error}`,
    );
  });

  const externalLinkChecks = [];
  const supportLinks = [...externalLinks].filter((link) => {
    try {
      return new URL(link).hostname === "wa.me";
    } catch {
      return false;
    }
  });
  const sourceLinks = [...externalLinks].filter((link) => {
    try {
      return new URL(link).hostname !== "wa.me";
    } catch {
      return false;
    }
  });

  if (
    supportLinks.length === 0 ||
    supportLinks.some((link) => new URL(link).pathname !== "/85254930490")
  ) {
    failures.push("missing or incorrect WhatsApp support link");
  }
  if (sourceLinks.length === 0) {
    failures.push("missing official source link");
  }

  await mapLimit(sourceLinks, CONCURRENCY, async (url) => {
    const result = await request(url, { body: false, allowRateLimit: true });
    const status = result.response?.status || null;
    externalLinkChecks.push({
      url,
      status,
      finalUrl: result.response?.url || null,
      error: result.error || null,
    });
    if ([404, 410].includes(status)) {
      failures.push(`broken official source link ${url}: ${status}`);
    } else if (
      !result.response ||
      status >= 500 ||
      [401, 403, 429].includes(status)
    ) {
      warnings.push(
        `official source link could not be conclusively verified ${url}: ${status || result.error}`,
      );
    }
  });

  const homePage = pages.find((page) => page.url === `${origin}/en`) || null;
  let faviconCheck = null;
  if (homePage?.favicon) {
    const faviconUrl = new URL(homePage.favicon, `${origin}/en`).toString();
    const favicon = await request(faviconUrl, { body: false });
    faviconCheck = {
      url: faviconUrl,
      status: favicon.response?.status || null,
      contentType: favicon.response?.headers.get("content-type") || null,
      error: favicon.error || null,
    };
    if (!favicon.response || favicon.response.status !== 200) {
      failures.push(
        `favicon returned ${favicon.response?.status || favicon.error}`,
      );
    }
    if (faviconCheck.contentType && !/^image\//i.test(faviconCheck.contentType)) {
      failures.push(`favicon content type ${faviconCheck.contentType}`);
    }
  } else {
    failures.push("home favicon missing");
  }

  return {
    domain,
    result: failures.length === 0 ? "pass" : "fail",
    homeStatus: home.response?.status || null,
    homeFinalUrl: home.response?.url || null,
    robotsStatus: robots.response?.status || null,
    robotsDisallowAll: defaultCrawlerIsBlocked(robotsBody),
    robotsSitemap,
    sitemapStatus: sitemap.status,
    childSitemapCount: sitemap.childSitemaps.length,
    sitemapPageCount: sitemap.urls.length,
    wwwRedirect,
    httpRedirect,
    favicon: faviconCheck,
    uniqueTitleCount: new Set(pages.map((page) => page.title).filter(Boolean)).size,
    uniqueDescriptionCount: new Set(
      pages.map((page) => page.description).filter(Boolean),
    ).size,
    internalLinkCount: internalLinks.size,
    externalLinkCount: externalLinks.size,
    externalLinks: [...externalLinks].sort(),
    sourceLinkCount: sourceLinks.length,
    supportLinkCount: supportLinks.length,
    externalLinkChecks: externalLinkChecks.sort((a, b) =>
      a.url.localeCompare(b.url),
    ),
    brokenInternalLinks,
    pages,
    warnings,
    failures,
  };
}

const results = await mapLimit(domains, 2, audit);
const report = {
  generatedAt: new Date().toISOString(),
  domainCount: results.length,
  passedDomainCount: results.filter((result) => result.result === "pass").length,
  failedDomainCount: results.filter((result) => result.result === "fail").length,
  reviewedPageCount: results.reduce(
    (sum, result) => sum + result.sitemapPageCount,
    0,
  ),
  failureCount: results.reduce(
    (sum, result) => sum + result.failures.length,
    0,
  ),
  warningCount: results.reduce(
    (sum, result) => sum + result.warnings.length,
    0,
  ),
  results,
};

if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

if (!summaryOnly) {
  for (const result of results) console.log(JSON.stringify(result));
}
console.error(
  JSON.stringify({
    domainCount: report.domainCount,
    passedDomainCount: report.passedDomainCount,
    failedDomainCount: report.failedDomainCount,
    reviewedPageCount: report.reviewedPageCount,
    failureCount: report.failureCount,
    warningCount: report.warningCount,
    outputPath,
  }),
);

if (report.failedDomainCount > 0) process.exitCode = 1;
