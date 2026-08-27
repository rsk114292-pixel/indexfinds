import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { SUBSITE_GUIDES } from "../../web/src/lib/subsite-guides";
import { CATEGORY_LINKS } from "./categories";
import { handleRequest, handleRequestWithEnv } from "./index";
import { createCategoryUrl } from "./render";
import {
  getSiteDefinition,
  isSiteReleasedForIndexing,
  SITE_DEFINITIONS,
} from "./sites";

describe("subsite category hub", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("covers the same 42 active subsites and excludes retired or independent projects", () => {
    const workerDomains = SITE_DEFINITIONS.map((site) => site.domain).sort();
    const webDomains = SUBSITE_GUIDES.map((site) => site.domain).sort();

    expect(workerDomains).toEqual(webDomains);
    expect(workerDomains).toHaveLength(42);
    expect(workerDomains).not.toContain("1to1reps.com");
    expect(workerDomains).not.toContain("xiangshoe.net");
  });

  it("publishes exactly the requested eight main-site category routes", () => {
    expect(CATEGORY_LINKS.map((category) => category.slug)).toEqual([
      "shoes",
      "tops",
      "outerwear",
      "bottoms",
      "bags",
      "watches",
      "accessories",
      "electronics",
    ]);
  });

  it("configures apex and www Worker routes for every in-scope zone", () => {
    const configSource = readFileSync(
      new URL("../wrangler.jsonc", import.meta.url),
      "utf8",
    );
    const config = JSON.parse(configSource.replace(/,\s*([}\]])/g, "$1")) as {
      env: {
        production: { routes: Array<{ pattern: string; zone_name: string }> };
      };
    };
    const routes = config.env.production.routes;

    expect(routes).toHaveLength(SITE_DEFINITIONS.length * 2);
    for (const site of SITE_DEFINITIONS) {
      expect(routes).toEqual(
        expect.arrayContaining([
          { pattern: `${site.domain}/*`, zone_name: site.domain },
          { pattern: `www.${site.domain}/*`, zone_name: site.domain },
        ]),
      );
    }
  });

  it("adds agent and source attribution to category links", () => {
    const site = getSiteDefinition("www.cssbuyitems.com");
    expect(site).toBeDefined();

    const url = new URL(createCategoryUrl(site!, "shoes"));
    expect(url.pathname).toBe("/en/categories/shoes");
    expect(url.searchParams.get("agent")).toBe("cssbuy");
    expect(url.searchParams.get("utm_source")).toBe("cssbuyitems.com");
    expect(url.searchParams.get("utm_campaign")).toBe(
      "subsite_category_directory",
    );
  });

  it("does not invent an agent parameter for YDA Express", () => {
    const site = getSiteDefinition("www.ydaexpress.net");
    expect(site).toBeDefined();

    const url = new URL(createCategoryUrl(site!, "shoes"));
    expect(url.searchParams.get("agent")).toBeNull();
    expect(url.searchParams.get("utm_source")).toBe("ydaexpress.net");
  });

  it("renders the eight category cards for both home and legacy URLs", async () => {
    for (const path of ["/", "/spreadsheet/old-product-link/"]) {
      const response = handleRequest(
        new Request(`https://acbuyindex.com${path}`),
      );
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html.match(/data-category-card=/g)).toHaveLength(8);
      expect(html).toContain("This subsite no longer stores product listings");
      expect(html).toContain("agent=acbuy");
    }
  });

  it("serves SEO support files and rejects unknown hosts", async () => {
    const robots = handleRequest(
      new Request("https://acbuyindex.com/robots.txt"),
    );
    expect(await robots.text()).toContain(
      "Sitemap: https://acbuyindex.com/sitemap.xml",
    );

    const unknown = handleRequest(new Request("https://xiangshoe.net/"));
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("keeps every tenant outside the independently released batch noindex", async () => {
    const released = SITE_DEFINITIONS.filter(isSiteReleasedForIndexing).map(
      (site) => site.domain,
    );
    expect(released).toEqual([
      "acbuyindex.com",
      "allchinabuyfinder.com",
      "allchinabuyindex.com",
      "bbdbuyeufinds.com",
      "bbdbuyeus.com",
      "bbdbuyeusheet.com",
      "boonbuyfind.net",
      "boonbuyindex.com",
      "cnshopperindex.com",
      "cssbuycatalog.com",
      "cssbuyindex.com",
      "cssbuyitems.com",
      "ydaexpress.net",
      "ydaexpress.org",
    ]);

    const draftSite = getSiteDefinition("eastmallbuyindex.com")!;
    const page = handleRequest(new Request("https://eastmallbuyindex.com/"));
    expect(page.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(await page.text()).toContain(
      '<meta name="robots" content="noindex,follow">',
    );
    expect(
      await handleRequest(
        new Request("https://eastmallbuyindex.com/robots.txt"),
      ).text(),
    ).toBe("User-agent: *\nDisallow: /\n");
    expect(
      await handleRequest(
        new Request("https://cssbuyindex.com/sitemap.xml"),
      ).text(),
    ).not.toContain(`<loc>https://${draftSite.domain}/</loc>`);
  });

  it("supports local preview selection without accepting arbitrary hosts", async () => {
    const preview = handleRequest(
      new Request("http://localhost:8787/?site=superbuyindex.com"),
    );
    expect(preview.status).toBe(200);
    expect(await preview.text()).toContain("Superbuy Index Category Directory");

    const invalidMethod = handleRequest(
      new Request("https://superbuyindex.com/", { method: "POST" }),
    );
    expect(invalidMethod.status).toBe(405);
    expect(invalidMethod.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("proxies an allowlisted tenant to the shared app with trusted headers", async () => {
    const fetchMock = vi.fn(async (upstream: Request) =>
      new Response("tenant app", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequestWithEnv(
      new Request("https://boonbuyindex.com/en/query-method?view=full"),
      {
        ORIGIN_URL: "https://indexfinds-preview.example",
        TENANT_PROXY_SECRET: "test-secret",
        SITE_ALLOWLIST: "boonbuyindex.com,cnshopperindex.com",
      },
    );

    expect(response.status).toBe(200);
    const upstream = fetchMock.mock.calls[0]?.[0] as Request;
    expect(upstream.url).toBe(
      "https://indexfinds-preview.example/en/query-method?view=full",
    );
    expect(upstream.headers.get("x-indexfinds-tenant-host")).toBe(
      "boonbuyindex.com",
    );
    expect(upstream.headers.get("x-indexfinds-tenant-secret")).toBe(
      "test-secret",
    );
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });

  it("keeps Worker previews noindex and limits them to the current batch", async () => {
    const fetchMock = vi.fn(async () => new Response("preview", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const env = {
      ORIGIN_URL: "https://indexfinds-preview.example",
      TENANT_PROXY_SECRET: "test-secret",
      SITE_ALLOWLIST: "acbuyindex.com",
    };

    const preview = await handleRequestWithEnv(
      new Request(
        "https://indexfinds-subsite-category-hub-staging.workers.dev/en?site=acbuyindex.com",
      ),
      env,
    );
    expect(preview.status).toBe(200);
    expect(preview.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(preview.headers.get("Set-Cookie")).toContain(
      "indexfinds_preview_site=acbuyindex.com",
    );

    const excluded = await handleRequestWithEnv(
      new Request(
        "https://indexfinds-subsite-category-hub-staging.workers.dev/en?site=ydaexpress.net",
      ),
      env,
    );
    expect(excluded.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("redirects public http and www traffic to the canonical apex", async () => {
    const response = await handleRequestWithEnv(
      new Request("http://www.acbuyindex.com/en/directory?ref=legacy"),
      {
        ORIGIN_URL: "https://indexfinds-preview.example",
        TENANT_PROXY_SECRET: "test-secret",
      },
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(
      "https://acbuyindex.com/en/directory?ref=legacy",
    );
  });
});
