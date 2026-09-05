import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  getAllTenantResearchPages,
  getTenantResearchPage,
} from "./tenant-research-pages";

const REVIEWED_DOMAINS = [
  "cssbuycatalog.com",
  "cssbuyindex.com",
  "cssbuyitems.com",
  "eastmallbuyindex.com",
  "fishgooindex.com",
  "goatedbuyindex.com",
  "hipobuyindex.com",
  "hoobuyindex.net",
  "itaobuyindex.com",
] as const;

describe("tenant official-source boundaries", () => {
  it("removes the expired iTaoBuy campaign from both homepage variants", () => {
    const homePageSource = readFileSync(
      path.join(
        process.cwd(),
        "src/app/[locale]/(shop)/HomePageClient.tsx",
      ),
      "utf8",
    );
    const removedComponent = path.join(
      process.cwd(),
      "src/components/tenant/ItaobuyOfficialPromotion.tsx",
    );

    expect(homePageSource).not.toContain("ItaobuyOfficialPromotion");
    expect(homePageSource).not.toContain(
      "Daily 8kg/5kg Free Shipping - 7 Days in a Row!",
    );
    expect(existsSync(removedComponent)).toBe(false);

    const sourceLedger = readFileSync(
      path.join(
        process.cwd(),
        "../../Docs/seo-content-rollout/official-platform-sources.csv",
      ),
      "utf8",
    );
    expect(sourceLedger).toContain('"Free Shipping Giveaway (expired)"');
    expect(sourceLedger).toContain(
      "expired on 2026-08-31; removed from the tenant homepage",
    );
  });

  it("gives all 61 reviewed pages a dated first-party source boundary", () => {
    const pages = getAllTenantResearchPages().filter((page) =>
      REVIEWED_DOMAINS.includes(
        page.domain as (typeof REVIEWED_DOMAINS)[number],
      ),
    );
    const sourceLedger = readFileSync(
      path.join(
        process.cwd(),
        "../../Docs/seo-content-rollout/official-platform-sources.csv",
      ),
      "utf8",
    );

    expect(pages).toHaveLength(61);
    for (const page of pages) {
      expect(page).toEqual(
        expect.objectContaining({
          reviewedAt: "2026-09-06",
          sourceUrl: expect.stringMatching(/^https:\/\//),
          sourceLabel: expect.any(String),
          methodNote: expect.any(String),
        }),
      );
      expect(page.methodNote?.length).toBeGreaterThan(80);
      expect(sourceLedger).toContain(`"${page.sourceUrl}"`);
    }
  });

  it("uses the precise official page for each high-risk claim boundary", () => {
    expect(getTenantResearchPage("cssbuyitems.com", "shipping")).toEqual(
      expect.objectContaining({
        sourceUrl: "https://new.cssbuy.com/estimates",
        methodNote: expect.stringContaining("estimate"),
      }),
    );
    expect(getTenantResearchPage("cssbuyindex.com", "forwarding")).toEqual(
      expect.objectContaining({
        sourceUrl: "https://new.cssbuy.com/shipforme",
      }),
    );
    expect(getTenantResearchPage("eastmallbuyindex.com", "legit")).toEqual(
      expect.objectContaining({
        sourceUrl:
          "https://www.eastmallbuy.com/index/information/index/information_id/22.html",
        methodNote: expect.stringContaining("not independent proof"),
      }),
    );
    expect(
      getTenantResearchPage("eastmallbuyindex.com", "referral-code"),
    ).toEqual(
      expect.objectContaining({
        sourceUrl: "https://www.eastmallbuy.com/index/help/info/id/91.html",
        methodNote: expect.stringContaining("no active code"),
      }),
    );
    expect(
      getTenantResearchPage("fishgooindex.com", "fishgoo-checklist"),
    ).toEqual(
      expect.objectContaining({
        sourceUrl: "https://blog.fishgoo.com/how-to-check-qc-photos/",
        methodNote: expect.stringContaining("not as proof"),
      }),
    );
    expect(getTenantResearchPage("goatedbuyindex.com", "shipping")).toEqual(
      expect.objectContaining({
        sourceUrl:
          "https://www.goatedbuy.com/#/pages/estimation/shipping",
        methodNote: expect.stringContaining("client application"),
      }),
    );
    expect(getTenantResearchPage("hipobuyindex.com", "guide")).toEqual(
      expect.objectContaining({
        sourceUrl: "https://app.hipobuy.com/",
        methodNote: expect.stringContaining(
          "No public first-party source was found",
        ),
      }),
    );
    expect(getTenantResearchPage("hoobuyindex.net", "guide")).toEqual(
      expect.objectContaining({
        sourceUrl: "https://hoobuy.com/fill-buy",
        methodNote: expect.stringContaining("cannot determine"),
      }),
    );
    expect(getTenantResearchPage("hoobuyindex.net", "shipping")).toEqual(
      expect.objectContaining({
        sourceUrl: "https://hoobuy.com/estimation",
      }),
    );
    expect(getTenantResearchPage("itaobuyindex.com", "qc-evidence")).toEqual(
      expect.objectContaining({
        sourceUrl:
          "https://www.itaobuy.com/help/detail?namespaceCode=help_center&articleCode=proxy_disclaimer",
        methodNote: expect.stringContaining("does not verify"),
      }),
    );
  });

  it("records unresolved official-source conflicts without publishing promises", () => {
    const fishgooPages = getAllTenantResearchPages().filter(
      (page) => page.domain === "fishgooindex.com",
    );
    const fishgooCopy = JSON.stringify(fishgooPages);

    expect(fishgooPages[0]?.methodNote).toMatch(/90 or 100 days/);
    expect(fishgooCopy).not.toMatch(/(?:90|100)[ -]day free storage/i);

    const goatedShipping = getTenantResearchPage(
      "goatedbuyindex.com",
      "shipping",
    );
    expect(goatedShipping?.methodNote).toContain("checked live");
    expect(JSON.stringify(goatedShipping)).not.toMatch(
      /guaranteed (?:rate|delivery|transit)/i,
    );
  });
});
