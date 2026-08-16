import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SUBSITE_GUIDES } from "../../web/src/lib/subsite-guides";
import { CATEGORY_LINKS } from "./categories";
import { handleRequest } from "./index";
import { createCategoryUrl } from "./render";
import { getSiteDefinition, SITE_DEFINITIONS } from "./sites";

describe("subsite category hub", () => {
  it("covers the same 41 subsites and excludes the independent project", () => {
    const workerDomains = SITE_DEFINITIONS.map((site) => site.domain).sort();
    const webDomains = SUBSITE_GUIDES.map((site) => site.domain).sort();

    expect(workerDomains).toEqual(webDomains);
    expect(workerDomains).toHaveLength(41);
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
      new Request("https://litbuyindex.com/robots.txt"),
    );
    expect(await robots.text()).toContain(
      "Sitemap: https://litbuyindex.com/sitemap.xml",
    );

    const unknown = handleRequest(new Request("https://xiangshoe.net/"));
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get("X-Robots-Tag")).toContain("noindex");
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
});
