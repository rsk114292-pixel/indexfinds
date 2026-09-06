import { readFileSync } from "node:fs";
import path from "node:path";
import { getTenantResearchPage } from "./tenant-research-pages";

const SOURCE_LEDGER = readFileSync(
  path.join(
    process.cwd(),
    "../../Docs/seo-content-rollout/official-platform-sources.csv",
  ),
  "utf8",
);

describe("tenant research evidence coverage", () => {
  it.each([
    ["acbuyindex.com", "platform-guide", "https://www.acbuy.com/en/", "2026-09-06"],
    ["acbuyindex.com", "faq", "https://www.acbuy.com/en/", "2026-09-06"],
    ["allchinabuyindex.com", "shipping-checklist", "https://www.allchinabuy.com/en/page/guide/appagent/", "2026-09-06"],
    ["allchinabuyindex.com", "research-log", "https://www.allchinabuy.com/en/page/guide/appagent/", "2026-09-06"],
    ["allchinabuyfinder.com", "faq", "https://www.allchinabuy.com/en/page/help/", "2026-09-06"],
    ["litbuyindex.com", "codes-coupons", "https://www.litbuy.com/", "2026-09-05"],
    ["litbuyitems.com", "coupons", "https://www.litbuy.com/", "2026-09-05"],
    ["litbuyproducts.com", "coupons", "https://www.litbuy.com/", "2026-09-05"],
  ] as const)(
    "%s/%s uses its reviewed first-party source",
    (domain, slug, sourceUrl, reviewedAt) => {
      expect(getTenantResearchPage(domain, slug)).toEqual(
        expect.objectContaining({
          sourceUrl,
          reviewedAt,
          sourceLabel: expect.any(String),
          methodNote: expect.any(String),
        }),
      );
      expect(SOURCE_LEDGER).toContain(`"${sourceUrl}"`);
      expect(SOURCE_LEDGER).toContain(`/en/${slug}`);
    },
  );

  it("keeps Superbuy calculator and reconciliation claims inside their evidence boundary", () => {
    const page = getTenantResearchPage(
      "superbuydeals.com",
      "shipping-weight-guide",
    );

    expect(page).toEqual(
      expect.objectContaining({
        sourceUrl: "https://login.superbuy.com/en/page/query/freight/",
        reviewedAt: "2026-09-05",
      }),
    );
    expect(page?.methodNote).toContain("Separate official Shopping Agent Guidance");
    expect(page?.methodNote).toContain("neither source guarantees the final charge");
  });

  it("records Parcel Up's search-index-only evidence and direct-access limit", () => {
    const page = getTenantResearchPage(
      "parcelupindex.com",
      "about-parcel-up-index",
    );

    expect(page).toEqual(
      expect.objectContaining({
        sourceUrl: "https://parcelup.com/help",
        reviewedAt: "2026-09-05",
      }),
    );
    expect(page?.methodNote).toContain("search-index evidence");
    expect(page?.methodNote).toContain("Direct access returned 403");
    expect(SOURCE_LEDGER).toContain("/en/about-parcel-up-index");
  });

  it("does not claim a verified public LitBuy estimator URL", () => {
    const page = getTenantResearchPage("litbuyindex.com", "freight-estimator");
    const copy = JSON.stringify(page);

    expect(page).toEqual(
      expect.objectContaining({
        sourceUrl: "https://www.litbuy.com/",
        reviewedAt: "2026-09-04",
      }),
    );
    expect(page?.description).toMatch(/^If LitBuy currently links/);
    expect(page?.methodNote).toContain("does not contain a precise public freight-estimator URL");
    expect(copy).not.toContain("official LitBuy freight estimator");
    expect(copy).not.toContain("Use the current Freight Estimator");
  });

  it("treats YDA service scope as a check rather than a verified offer", () => {
    const page = getTenantResearchPage("ydaexpress.org", "service-map");
    const copy = JSON.stringify(page);

    expect(page).toEqual(
      expect.objectContaining({
        sourceUrl: "https://www.ydaexpress.com/",
        reviewedAt: "2026-09-04",
      }),
    );
    expect(page?.intro).toMatch(/^Before relying/);
    expect(page?.methodNote).toContain("does not establish");
    expect(copy).not.toContain(
      "The official site describes shopping-agent and parcel-forwarding functions",
    );
  });
});
