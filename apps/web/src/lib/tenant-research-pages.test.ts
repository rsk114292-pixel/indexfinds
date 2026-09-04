import { readFileSync } from "node:fs";
import path from "node:path";
import {
  getAllTenantResearchPages,
  getTenantResearchPage,
  getTenantResearchPaths,
  getTenantResearchProfile,
} from "./tenant-research-pages";
import { SUBSITE_GUIDES } from "./subsite-guides";
import { NEW_AGENT_TENANTS } from "./new-agent-tenants";
import { getTenantConfigByHost } from "./tenant-config";

describe("tenant research pages", () => {
  it("publishes four distinct 1to1 research path sets", () => {
    expect(getTenantResearchPaths("1to1finds.cloud")).toEqual([
      "/categories",
      "/evidence-cloud",
      "/link-ledger",
      "/image-review",
      "/decision-handoff",
      "/faq",
    ]);
    expect(getTenantResearchPaths("1to1finds.com")).toEqual([
      "/categories",
      "/finds-method",
      "/search-vocabulary",
      "/source-check",
      "/qc-questions",
      "/faq",
    ]);
    expect(getTenantResearchPaths("1to1reps.com")).toEqual([
      "/categories",
      "/finds",
      "/qc-checklist",
      "/agent-guide",
      "/source-safety",
      "/faq",
    ]);
    expect(getTenantResearchPaths("1to1spreadsheet.com")).toEqual([
      "/categories",
      "/spreadsheet-method",
      "/source-fields",
      "/qc-record",
      "/handoff-checklist",
      "/faq",
    ]);
  });

  it("keeps every Next-hosted tenant out of the generic category fallback", () => {
    const missingCategoryFronts = SUBSITE_GUIDES.filter(
      ({ domain }) => !getTenantResearchPage(domain, "categories"),
    ).map(({ domain }) => domain);

    expect(SUBSITE_GUIDES).toHaveLength(58);
    expect(missingCategoryFronts).toEqual([]);
  });

  it("preserves the five distinct ACBuy legacy research paths", () => {
    expect(getTenantResearchPaths("acbuyindex.com")).toEqual([
      "/directory",
      "/platform-guide",
      "/category-research",
      "/safety-research",
      "/faq",
      "/categories",
    ]);
  });

  it("preserves the two distinct AllChinaBuy source-site path sets", () => {
    expect(getTenantResearchPaths("allchinabuyindex.com")).toEqual([
      "/categories",
      "/guide",
      "/shipping-checklist",
      "/research-log",
      "/regions",
      "/faq",
    ]);
    expect(getTenantResearchPaths("allchinabuyfinder.com")).toEqual([
      "/categories",
      "/finder-guide",
      "/search-ideas",
      "/product-checklist",
      "/faq",
    ]);
  });

  it("preserves three distinct BBDbuy research path sets", () => {
    expect(getTenantResearchPaths("bbdbuyeufinds.com")).toEqual([
      "/categories",
      "/eu-finds",
      "/eu-guide",
      "/qc-checklist",
      "/shipping-planner",
      "/faq",
    ]);
    expect(getTenantResearchPaths("bbdbuyeus.com")).toEqual([
      "/search-guide",
      "/order-workflow",
      "/parcel-checklist",
      "/us-shipping",
      "/faq",
      "/categories",
    ]);
    expect(getTenantResearchPaths("bbdbuyeusheet.com")).toEqual([
      "/categories",
      "/eu-sheet",
      "/checklist",
      "/faq",
    ]);
  });

  it("preserves three distinct CSSBuy research path sets", () => {
    expect(getTenantResearchPaths("cssbuyitems.com")).toEqual([
      "/categories",
      "/cssbuy-score",
      "/guide",
      "/safety",
      "/search-ideas",
      "/shipping",
      "/faq",
    ]);
    expect(getTenantResearchPaths("cssbuyindex.com")).toEqual([
      "/categories",
      "/cssbuy-score",
      "/guide",
      "/forwarding",
      "/safety",
      "/search-ideas",
      "/faq",
    ]);
    expect(getTenantResearchPaths("cssbuycatalog.com")).toEqual([
      "/categories",
      "/spreadsheet",
      "/guide",
      "/forwarding",
      "/usa",
      "/safety",
      "/faq",
    ]);
  });

  it("preserves distinct Kakobuy shortlist and item-file path sets", () => {
    const paths = [
      "/categories",
      "/guide",
      "/kakobuy-score",
      "/safety",
      "/search-ideas",
      "/shipping",
      "/faq",
    ];
    expect(getTenantResearchPaths("kakobuyindex.net")).toEqual(paths);
    expect(getTenantResearchPaths("kakobuyitems.com")).toEqual(paths);
  });

  it("preserves three distinct LitBuy source-site path sets", () => {
    expect(getTenantResearchPaths("litbuyindex.com")).toEqual([
      "/categories",
      "/codes-coupons",
      "/faq",
      "/guide",
      "/safety",
      "/search-ideas",
      "/shipping",
      "/freight-estimator",
    ]);
    expect(getTenantResearchPaths("litbuyitems.com")).toEqual([
      "/categories",
      "/coupons",
      "/faq",
      "/guide",
      "/haul-review",
      "/invitation-code",
      "/safety",
      "/shipping",
    ]);
    expect(getTenantResearchPaths("litbuyproducts.com")).toEqual([
      "/coupons",
      "/faq",
      "/guide",
      "/invitation-code",
      "/safety",
      "/shipping",
      "/spreadsheet",
      "/categories",
    ]);
  });

  it("preserves the LoongBuy evidence-route path set", () => {
    expect(getTenantResearchPaths("loongbuys.net")).toEqual([
      "/categories",
      "/guide",
      "/shipping-calculator",
      "/reviews",
      "/safety",
      "/faq",
    ]);
    expect(
      getTenantResearchPage("loongbuys.net", "shipping-calculator"),
    ).toEqual(
      expect.objectContaining({
        seoTitle:
          "LoongBuy Shipping Calculator Guide | Inputs and Final Charge",
        sourceUrl: "https://service.loongbuy.com/en/query/freight",
        sourceLabel: "Open the official LoongBuy freight query",
      }),
    );
  });

  it("preserves the LoveGoBuy catalog and order-action path set", () => {
    expect(getTenantResearchPaths("lovegobuyindex.com")).toEqual([
      "/categories",
      "/faq",
      "/guide",
      "/is-lovegobuy-legit",
      "/lovegobuy-coupon-code",
      "/lovegobuy-spreadsheet",
      "/refund-lovegobuy-order",
    ]);
  });

  it("preserves distinct MuleBuy index and item evidence path sets", () => {
    const itemPaths = [
      "/categories",
      "/mulebuy-spreadsheet",
      "/spreadsheet-checklist",
      "/search-ideas",
      "/buyer-safety",
      "/shipping-weight-guide",
      "/faq",
    ];
    expect(getTenantResearchPaths("mulebuyindex.net")).toEqual([
      "/categories",
      "/mulebuy-spreadsheet",
      "/spreadsheet-checklist",
      "/search-ideas",
      "/order-status-guide",
      "/buyer-safety",
      "/shipping-weight-guide",
      "/tracking",
      "/faq",
    ]);
    expect(getTenantResearchPaths("mulebuyitems.com")).toEqual(itemPaths);
    expect(
      getTenantResearchPage("mulebuyindex.net", "order-status-guide")?.seoTitle,
    ).toBe("MuleBuy Order Pending Guide | Check Status Before Acting");
  });

  it("preserves the Oopbuy link-review path set", () => {
    expect(getTenantResearchPaths("oopbuyindex.net")).toEqual([
      "/guide",
      "/categories",
      "/oopbuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
    expect(getTenantResearchPage("oopbuyindex.net", "shipping")?.seoTitle).toBe(
      "Oopbuy Shipping Prices Guide | Two Costs and Parcel Evidence",
    );
    expect(
      getTenantResearchPage("superbuydeals.com", "shipping-weight-guide")
        ?.seoTitle,
    ).toBe("Superbuy Shipping Calculator Guide | Inputs and Final Cost");
  });

  it("preserves the OrientDig category-evidence path set", () => {
    expect(getTenantResearchPaths("orientdigindex.com")).toEqual([
      "/orientdig-spreadsheet",
      "/categories",
      "/orientdig-qc-photos-guide",
      "/orientdig-shoes-spreadsheet",
      "/orientdig-hoodies-spreadsheet",
      "/orientdig-bags-spreadsheet",
      "/orientdig-electronics-spreadsheet",
      "/search-ideas",
      "/spreadsheet-checklist",
      "/orient-score-methodology",
      "/shipping-weight-guide",
      "/buyer-safety",
      "/faq",
    ]);
  });

  it("preserves the Parcel Up product-to-parcel path set", () => {
    expect(getTenantResearchPaths("parcelupindex.com")).toEqual([
      "/getting-started",
      "/fees-and-budgeting",
      "/shipping-and-warehouse",
      "/tracking",
      "/qc-checklist",
      "/product-index-method",
      "/official-sources",
      "/methodology",
      "/about-parcel-up-index",
      "/categories",
    ]);
  });

  it("aligns opportunity-page metadata with observed search intent", () => {
    expect(getTenantResearchPage("gtbuyindex.com", "shipping")?.seoTitle).toBe(
      "GTBuy Shipping Estimate Guide | Weight, Dimensions and Routes",
    );
    expect(
      getTenantResearchPage("litbuyproducts.com", "invitation-code")?.seoTitle,
    ).toBe("LitBuy Invitation Code Guide | Verify Current Registration Offers");
  });

  it("preserves distinct Sugargoo and Superbuy evidence path sets", () => {
    expect(getTenantResearchPaths("sugargooindex.net")).toEqual([
      "/sugargoo-spreadsheet",
      "/categories",
      "/sugargoo-qc-guide",
      "/sugargoo-shipping-guide",
      "/sugargoo-buying-guide",
      "/tracking",
      "/faq",
    ]);
    expect(getTenantResearchPaths("superbuydeals.com")).toEqual([
      "/superbuy-spreadsheet",
      "/categories",
      "/spreadsheet-checklist",
      "/shipping-weight-guide",
      "/faq",
    ]);
    expect(getTenantResearchPaths("superbuyindex.com")).toEqual([
      "/superbuy-spreadsheet",
      "/categories",
      "/search-ideas",
      "/spreadsheet-checklist",
      "/shipping-weight-guide",
      "/buyer-safety",
      "/faq",
    ]);
    expect(getTenantResearchPaths("superbuyitems.com")).toEqual([
      "/superbuy-items",
      "/superbuy-product-links",
      "/superbuy-qc",
      "/superbuy-shipping",
      "/superbuy-review",
      "/categories",
      "/faq",
    ]);
  });

  it("preserves CNShopper, EastMallBuy and Fishgoo source paths", () => {
    expect(getTenantResearchPaths("cnshopperindex.com")).toEqual([
      "/cnshopper-products",
      "/category-map",
      "/source-checklist",
      "/order-handoff",
      "/faq",
      "/categories",
    ]);
    expect(getTenantResearchPaths("eastmallbuyindex.com")).toEqual([
      "/guide",
      "/categories",
      "/spreadsheet",
      "/reddit",
      "/legit",
      "/referral-code",
      "/faq",
    ]);
    expect(getTenantResearchPaths("fishgooindex.com")).toEqual([
      "/guide",
      "/categories",
      "/fishgoo-checklist",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
  });

  it("keeps the YDA parcel and source-review paths separate", () => {
    expect(getTenantResearchPaths("ydaexpress.net")).toEqual([
      "/parcel-brief",
      "/warehouse-checklist",
      "/consolidation-planner",
      "/tracking-handoff",
      "/faq",
      "/categories",
    ]);
    expect(getTenantResearchPaths("ydaexpress.org")).toEqual([
      "/service-map",
      "/terms-checklist",
      "/shopping-agent-vs-forwarding",
      "/quote-evidence",
      "/faq",
      "/categories",
    ]);
    expect(
      getTenantResearchPage("ydaexpress.net", "terms-checklist"),
    ).toBeNull();
    expect(getTenantResearchPage("ydaexpress.org", "parcel-brief")).toBeNull();
  });

  it("preserves distinct BoonBuy, GoatedBuy, GTBuy and Hipobuy research paths", () => {
    expect(getTenantResearchPaths("boonbuyfind.net")).toEqual([
      "/categories",
      "/search-guide",
      "/product-checklist",
      "/platform-guide",
      "/faq",
    ]);
    expect(getTenantResearchPaths("boonbuyindex.com")).toEqual([
      "/boonbuy-products",
      "/query-method",
      "/source-checklist",
      "/route-boundaries",
      "/faq",
      "/categories",
    ]);
    expect(getTenantResearchPaths("goatedbuyindex.com")).toEqual([
      "/guide",
      "/categories",
      "/goatedbuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
    expect(getTenantResearchPaths("gtbuyindex.com")).toEqual([
      "/guide",
      "/categories",
      "/gtbuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
    expect(getTenantResearchPaths("hipobuyindex.com")).toEqual([
      "/guide",
      "/categories",
      "/hipobuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
  });

  it("preserves HooBuy, both JoyaGoo intents and KameyMall source paths", () => {
    expect(getTenantResearchPaths("hoobuyindex.net")).toEqual([
      "/guide",
      "/categories",
      "/hoobuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
    expect(getTenantResearchPage("hoobuyindex.net", "shipping")).toEqual(
      expect.objectContaining({
        seoTitle:
          "HooBuy Shipping Calculator Guide | Inputs and Estimate Limits",
        sourceUrl: "https://hoobuy.com/estimation",
        sourceLabel: "Open the official HooBuy estimator",
        questions: expect.arrayContaining([
          expect.objectContaining({
            question: "Does this page calculate a HooBuy shipping price?",
          }),
        ]),
      }),
    );
    expect(getTenantResearchPaths("joyabuyfinds.com")).toEqual([
      "/guide",
      "/categories",
      "/joyagoo-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
    expect(getTenantResearchPaths("joyagooindex.com")).toEqual([
      "/guide",
      "/categories",
      "/joyagoo-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
    expect(getTenantResearchPaths("kameymallindex.com")).toEqual([
      "/guide",
      "/categories",
      "/review",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
  });

  it("preserves the YoyBuy spreadsheet review sequence", () => {
    expect(getTenantResearchPaths("yoybuyindex.com")).toEqual([
      "/spreadsheet",
      "/categories",
      "/qc-checklist",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ]);
  });

  it("keeps every reviewed page specific and evidence-led", () => {
    const pages = getAllTenantResearchPages();

    expect(pages).toHaveLength(394);
    expect(new Set(pages.map((page) => page.seoTitle)).size).toBe(394);
    expect(new Set(pages.map((page) => page.description)).size).toBe(394);
    expect(new Set(pages.map((page) => page.title)).size).toBe(394);

    const copy = JSON.stringify(pages);
    expect(copy).not.toMatch(/IndexFinds|official ACBuy site/i);
    expect(copy).not.toMatch(/[—–]/);
    expect(copy).not.toMatch(
      /\b(guaranteed authenticity|guaranteed quality|genuine product|best quality|fixed delivery time)\b/i,
    );
  });

  it("keeps indexable research-page search snippets semantically distinct", () => {
    const pages = getAllTenantResearchPages().filter((page) =>
      getTenantConfigByHost(page.domain)?.branding?.indexablePaths?.includes(
        `/${page.slug}`,
      ),
    );
    const tokens = (value: string) =>
      new Set(
        value
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .split(/\s+/)
          .filter((token) => token.length > 2),
      );

    for (let leftIndex = 0; leftIndex < pages.length; leftIndex += 1) {
      const left = pages[leftIndex];
      const leftTokens = tokens(
        `${left.seoTitle} ${left.description} ${left.title}`,
      );
      for (let rightIndex = leftIndex + 1; rightIndex < pages.length; rightIndex += 1) {
        const right = pages[rightIndex];
        if (left.domain === right.domain) continue;
        const rightTokens = tokens(
          `${right.seoTitle} ${right.description} ${right.title}`,
        );
        const overlap = [...leftTokens].filter((token) =>
          rightTokens.has(token),
        ).length;
        const similarity =
          overlap / (leftTokens.size + rightTokens.size - overlap);

        expect({
          left: `${left.domain}/${left.slug}`,
          right: `${right.domain}/${right.slug}`,
          belowDuplicateThreshold: similarity < 0.72,
        }).toEqual({
          left: `${left.domain}/${left.slug}`,
          right: `${right.domain}/${right.slug}`,
          belowDuplicateThreshold: true,
        });
      }
    }
  });

  it("gives every new agent a source-backed and semantically distinct page set", () => {
    const pages = getAllTenantResearchPages();

    for (const tenant of NEW_AGENT_TENANTS) {
      const tenantPages = pages.filter((page) => page.domain === tenant.domain);
      expect(tenantPages).toHaveLength(7);
      expect(tenantPages.every((page) => page.reviewedAt === "2026-09-03")).toBe(
        true,
      );
      expect(
        tenantPages.every(
          (page) =>
            page.sourceUrl === tenant.research.evidenceUrl &&
            page.methodNote === tenant.research.officialEvidence,
        ),
      ).toBe(true);
    }

    for (const slug of [
      "categories",
      "guide",
      "source-check",
      "qc-checklist",
      "shipping",
      "safety",
      "faq",
    ]) {
      const normalized = NEW_AGENT_TENANTS.map((tenant) => {
        const page = getTenantResearchPage(tenant.domain, slug)!;
        return JSON.stringify([
          page.description,
          page.intro,
          ...page.sections.map((section) => section.description),
          ...(page.questions || []).map((question) => question.answer),
        ])
          .toLowerCase()
          .replaceAll(tenant.platformName.toLowerCase(), "[platform]")
          .replaceAll(tenant.domain, "[domain]");
      });

      expect(new Set(normalized).size).toBe(NEW_AGENT_TENANTS.length);
    }
  });

  it("uses different visual research profiles for each research intent", () => {
    expect(getTenantResearchProfile("1to1finds.cloud")?.variant).toBe("ledger");
    expect(getTenantResearchProfile("1to1finds.com")?.variant).toBe("finder");
    expect(getTenantResearchProfile("1to1reps.com")?.variant).toBe("source");
    expect(getTenantResearchProfile("1to1spreadsheet.com")?.variant).toBe(
      "sheet",
    );
    expect(getTenantResearchProfile("acbuyindex.com")?.variant).toBe("source");
    expect(getTenantResearchProfile("allchinabuyindex.com")?.variant).toBe(
      "ledger",
    );
    expect(getTenantResearchProfile("allchinabuyfinder.com")?.variant).toBe(
      "finder",
    );
    expect(getTenantResearchProfile("bbdbuyeufinds.com")?.variant).toBe(
      "eu-finds",
    );
    expect(getTenantResearchProfile("bbdbuyeus.com")?.variant).toBe(
      "us-parcel",
    );
    expect(getTenantResearchProfile("bbdbuyeusheet.com")?.variant).toBe(
      "sheet",
    );
    expect(getTenantResearchProfile("cssbuyitems.com")?.variant).toBe(
      "item-check",
    );
    expect(getTenantResearchProfile("cssbuyindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("cssbuycatalog.com")?.variant).toBe(
      "catalog-map",
    );
    expect(getTenantResearchProfile("kakobuyindex.net")?.variant).toBe(
      "shortlist",
    );
    expect(getTenantResearchProfile("kakobuyitems.com")?.variant).toBe(
      "item-file",
    );
    expect(getTenantResearchProfile("litbuyindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("litbuyitems.com")?.variant).toBe(
      "item-file",
    );
    expect(getTenantResearchProfile("litbuyproducts.com")?.variant).toBe(
      "catalog-map",
    );
    expect(getTenantResearchProfile("loongbuys.net")?.variant).toBe(
      "item-check",
    );
    expect(getTenantResearchProfile("lovegobuyindex.com")?.variant).toBe(
      "catalog-map",
    );
    expect(getTenantResearchProfile("mulebuyindex.net")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("mulebuyitems.com")?.variant).toBe(
      "item-file",
    );
    expect(getTenantResearchProfile("oopbuyindex.net")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("orientdigindex.com")?.variant).toBe(
      "ledger",
    );
    expect(getTenantResearchProfile("parcelupindex.com")?.variant).toBe(
      "source",
    );
    expect(getTenantResearchProfile("sugargooindex.net")?.variant).toBe(
      "source",
    );
    expect(getTenantResearchProfile("superbuydeals.com")?.variant).toBe(
      "ledger",
    );
    expect(getTenantResearchProfile("superbuyindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("superbuyitems.com")?.variant).toBe(
      "item-file",
    );
    expect(getTenantResearchProfile("cnshopperindex.com")?.variant).toBe(
      "catalog-map",
    );
    expect(getTenantResearchProfile("eastmallbuyindex.com")?.variant).toBe(
      "shortlist",
    );
    expect(getTenantResearchProfile("fishgooindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("boonbuyfind.net")?.variant).toBe("source");
    expect(getTenantResearchProfile("boonbuyindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("goatedbuyindex.com")?.variant).toBe(
      "shortlist",
    );
    expect(getTenantResearchProfile("gtbuyindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("hipobuyindex.com")?.variant).toBe(
      "item-file",
    );
    expect(getTenantResearchProfile("hoobuyindex.net")?.variant).toBe(
      "item-check",
    );
    expect(getTenantResearchProfile("joyabuyfinds.com")?.variant).toBe(
      "finder",
    );
    expect(getTenantResearchProfile("joyagooindex.com")?.variant).toBe(
      "ledger",
    );
    expect(getTenantResearchProfile("kameymallindex.com")?.variant).toBe(
      "catalog-map",
    );
    expect(getTenantResearchProfile("yoybuyindex.com")?.variant).toBe("sheet");
    expect(getTenantResearchProfile("ydaexpress.net")?.variant).toBe(
      "us-parcel",
    );
    expect(getTenantResearchProfile("ydaexpress.org")?.variant).toBe("ledger");
  });

  it("does not return an ACBuy page for an unrelated tenant", () => {
    expect(getTenantResearchPage("cssbuyindex.com", "directory")).toBeNull();
    expect(getTenantResearchPage("acbuyindex.com", "missing")).toBeNull();
    expect(getTenantResearchPage("allchinabuyfinder.com", "guide")).toBeNull();
  });

  it("keeps unverified tenant hero artwork out of research-page rendering", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src",
        "app",
        "[locale]",
        "(shop)",
        "[platformSlug]",
        "page.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("profile.heroImage");
  });
});
