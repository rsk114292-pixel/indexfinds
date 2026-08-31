import {
  getAllTenantResearchPages,
  getTenantResearchPage,
  getTenantResearchPaths,
  getTenantResearchProfile,
} from "./tenant-research-pages";

describe("tenant research pages", () => {
  it("does not publish research pages for the retired 1to1Reps tenant", () => {
    expect(getTenantResearchPaths("1to1reps.com")).toEqual([]);
    expect(getTenantResearchProfile("1to1reps.com")).toBeNull();
  });

  it("preserves the five distinct ACBuy legacy research paths", () => {
    expect(getTenantResearchPaths("acbuyindex.com")).toEqual([
      "/directory",
      "/platform-guide",
      "/category-research",
      "/safety-research",
      "/faq",
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
    ]);
  });

  it("preserves the LoongBuy evidence-route path set", () => {
    expect(getTenantResearchPaths("loongbuys.net")).toEqual([
      "/categories",
      "/guide",
      "/reviews",
      "/safety",
      "/faq",
    ]);
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
      "/faq",
    ]);
    expect(getTenantResearchPaths("mulebuyitems.com")).toEqual(itemPaths);
    expect(
      getTenantResearchPage("mulebuyindex.net", "order-status-guide")
        ?.seoTitle,
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
      "/qc-checklist",
      "/product-index-method",
      "/official-sources",
      "/methodology",
      "/about-parcel-up-index",
    ]);
  });

  it("aligns opportunity-page metadata with observed search intent", () => {
    expect(
      getTenantResearchPage("gtbuyindex.com", "shipping")?.seoTitle,
    ).toBe(
      "GTBuy Shipping Estimate Guide | Weight, Dimensions and Routes",
    );
    expect(
      getTenantResearchPage("litbuyproducts.com", "invitation-code")
        ?.seoTitle,
    ).toBe(
      "LitBuy Invitation Code Guide | Verify Current Registration Offers",
    );
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
      "/cnshopper-products", "/category-map", "/source-checklist", "/order-handoff", "/faq",
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
    ]);
    expect(getTenantResearchPaths("ydaexpress.org")).toEqual([
      "/service-map",
      "/terms-checklist",
      "/shopping-agent-vs-forwarding",
      "/quote-evidence",
      "/faq",
    ]);
    expect(
      getTenantResearchPage("ydaexpress.net", "terms-checklist"),
    ).toBeNull();
    expect(
      getTenantResearchPage("ydaexpress.org", "parcel-brief"),
    ).toBeNull();
  });

  it("preserves distinct BoonBuy, GoatedBuy, GTBuy and Hipobuy research paths", () => {
    expect(getTenantResearchPaths("boonbuyfind.net")).toEqual([
      "/categories", "/search-guide", "/product-checklist", "/platform-guide", "/faq",
    ]);
    expect(getTenantResearchPaths("boonbuyindex.com")).toEqual([
      "/boonbuy-products", "/query-method", "/source-checklist", "/route-boundaries", "/faq",
    ]);
    expect(getTenantResearchPaths("goatedbuyindex.com")).toEqual([
      "/guide", "/categories", "/goatedbuy-score", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
    expect(getTenantResearchPaths("gtbuyindex.com")).toEqual([
      "/guide", "/categories", "/gtbuy-score", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
    expect(getTenantResearchPaths("hipobuyindex.com")).toEqual([
      "/guide", "/categories", "/hipobuy-score", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
  });

  it("preserves HooBuy, both JoyaGoo intents and KameyMall source paths", () => {
    expect(getTenantResearchPaths("hoobuyindex.net")).toEqual([
      "/guide", "/categories", "/hoobuy-score", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
    expect(getTenantResearchPaths("joyabuyfinds.com")).toEqual([
      "/guide", "/categories", "/joyagoo-score", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
    expect(getTenantResearchPaths("joyagooindex.com")).toEqual([
      "/guide", "/categories", "/joyagoo-score", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
    expect(getTenantResearchPaths("kameymallindex.com")).toEqual([
      "/guide", "/categories", "/review", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
  });

  it("preserves the YoyBuy spreadsheet review sequence", () => {
    expect(getTenantResearchPaths("yoybuyindex.com")).toEqual([
      "/spreadsheet", "/categories", "/qc-checklist", "/search-ideas", "/shipping", "/safety", "/faq",
    ]);
  });

  it("keeps every reviewed page specific and evidence-led", () => {
    const pages = getAllTenantResearchPages();

    expect(pages).toHaveLength(264);
    expect(new Set(pages.map((page) => page.seoTitle)).size).toBe(264);
    expect(new Set(pages.map((page) => page.description)).size).toBe(264);
    expect(new Set(pages.map((page) => page.title)).size).toBe(264);

    const copy = JSON.stringify(pages);
    expect(copy).not.toMatch(/IndexFinds|official ACBuy site/i);
    expect(copy).not.toMatch(/[—–]/);
    expect(copy).not.toMatch(
      /\b(guaranteed authenticity|guaranteed quality|genuine product|best quality|fixed delivery time)\b/i,
    );
  });

  it("uses different visual research profiles for each research intent", () => {
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
    expect(getTenantResearchProfile("cnshopperindex.com")?.variant).toBe("catalog-map");
    expect(getTenantResearchProfile("eastmallbuyindex.com")?.variant).toBe(
      "shortlist",
    );
    expect(getTenantResearchProfile("fishgooindex.com")?.variant).toBe(
      "query-index",
    );
    expect(getTenantResearchProfile("boonbuyfind.net")?.variant).toBe("source");
    expect(getTenantResearchProfile("boonbuyindex.com")?.variant).toBe("query-index");
    expect(getTenantResearchProfile("goatedbuyindex.com")?.variant).toBe("shortlist");
    expect(getTenantResearchProfile("gtbuyindex.com")?.variant).toBe("query-index");
    expect(getTenantResearchProfile("hipobuyindex.com")?.variant).toBe("item-file");
    expect(getTenantResearchProfile("hoobuyindex.net")?.variant).toBe("item-check");
    expect(getTenantResearchProfile("joyabuyfinds.com")?.variant).toBe("finder");
    expect(getTenantResearchProfile("joyagooindex.com")?.variant).toBe("ledger");
    expect(getTenantResearchProfile("kameymallindex.com")?.variant).toBe("catalog-map");
    expect(getTenantResearchProfile("yoybuyindex.com")?.variant).toBe("sheet");
    expect(getTenantResearchProfile("ydaexpress.net")?.variant).toBe("us-parcel");
    expect(getTenantResearchProfile("ydaexpress.org")?.variant).toBe("ledger");
  });

  it("does not return an ACBuy page for an unrelated tenant", () => {
    expect(getTenantResearchPage("cssbuyindex.com", "directory")).toBeNull();
    expect(getTenantResearchPage("acbuyindex.com", "missing")).toBeNull();
    expect(
      getTenantResearchPage("allchinabuyfinder.com", "guide"),
    ).toBeNull();
  });
});
