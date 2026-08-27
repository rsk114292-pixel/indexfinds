const domains = process.argv.slice(2);

if (domains.length === 0) {
  console.error("Usage: node audit-tenant-seo.mjs <domain> [...domain]");
  process.exit(2);
}

function match(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || null;
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

async function request(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "IndexFinds release audit/1.0" },
    });
    return { response, body: await response.text() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function audit(domain) {
  const [home, robots, sitemap] = await Promise.all([
    request(`https://${domain}/`),
    request(`https://${domain}/robots.txt`),
    request(`https://${domain}/sitemap.xml`),
  ]);
  const html = home.body || "";
  const robotsBody = robots.body || "";
  const sitemapBody = sitemap.body || "";

  return {
    domain,
    homeStatus: home.response?.status || null,
    finalUrl: home.response?.url || null,
    title: match(html, /<title[^>]*>([^<]*)<\/title>/i),
    metaRobots: match(
      html,
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
    ),
    xRobotsTag: home.response?.headers.get("x-robots-tag") || null,
    canonical: match(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    ),
    favicon: match(
      html,
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    ),
    legacyDirectory: html.includes("Directory powered by IndexFinds"),
    robotsStatus: robots.response?.status || null,
    robotsDisallowAll: defaultCrawlerIsBlocked(robotsBody),
    robotsHasSitemap: /Sitemap:\s*https?:\/\//i.test(robotsBody),
    sitemapStatus: sitemap.response?.status || null,
    sitemapUrlCount: (sitemapBody.match(/<loc>/g) || []).length,
    error: home.error || robots.error || sitemap.error || null,
  };
}

const results = await Promise.all(domains.map(audit));
for (const result of results) console.log(JSON.stringify(result));
