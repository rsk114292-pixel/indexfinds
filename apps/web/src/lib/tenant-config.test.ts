import {
  getTenantFaviconAttributes,
  getTenantConfigByHost,
  isMainSiteHost,
  isTenantLocaleIndexable,
  isTenantPathIndexable,
  resolveSiteIdentityFromHeaders,
  resolveTenantFromHeaders,
} from "./tenant-config";
import { SUBSITE_GUIDES } from "./subsite-guides";
import { TENANT_EDITORIAL_PROFILES } from "./tenant-editorial-profiles";
import { getAgentPlatform } from "./agent-platforms";
import { getOfficialPlatformLogo } from "./platform-logo-assets";

describe("tenant config", () => {
  it("resolves a direct-product subsite from a host with a port", () => {
    expect(getTenantConfigByHost("www.cssbuyitems.com:443")).toEqual(
      expect.objectContaining({
        domain: "cssbuyitems.com",
        agentKey: "cssbuy",
        productMode: "direct-products",
        canonicalOrigin: "https://cssbuyitems.com",
      }),
    );
  });

  it("does not resolve the retired 1to1Reps tenant", () => {
    expect(getTenantConfigByHost("1to1reps.com")).toBeNull();
  });

  it("gives BoonBuy Find a source-note guide with the verified agent filter", () => {
    const tenant = getTenantConfigByHost("boonbuyfind.net");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "boonbuy",
        productMode: "guide-only",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "BoonBuy Find",
        logoPath: "/images/agents/boonbuy.png",
        heroEyebrow: "Independent BoonBuy discovery guide",
        indexing: "ready",
        indexablePaths: [
          "",
          "/categories",
          "/search-guide",
          "/product-checklist",
          "/platform-guide",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("guide");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds|official site/i);
  });

  it("gives BoonBuy Index a distinct reviewed query-index experience", () => {
    const tenant = getTenantConfigByHost("boonbuyindex.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({ agentKey: "boonbuy", productMode: "agent-feed" }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "BoonBuy Index",
        logoPath: "/images/agents/boonbuy.png",
        heroEyebrow: "Independent BoonBuy query index",
        indexing: "ready",
        indexablePaths: [
          "",
          "/boonbuy-products",
          "/query-method",
          "/source-checklist",
          "/route-boundaries",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("index");
    expect(branding?.editorial.primaryCtaHref).toBe("/query-method");
  });

  it("gives CNShopper Index a category-led source-check experience", () => {
    const tenant = getTenantConfigByHost("cnshopperindex.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "cnshopper",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "CNShopper Index",
        logoPath: "/images/agents/cnshopper.png",
        heroEyebrow: "Independent CNShopper catalog guide",
        indexing: "ready",
        indexablePaths: [
          "",
          "/cnshopper-products",
          "/category-map",
          "/source-checklist",
          "/order-handoff",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(/spreadsheet|indexfinds|guaranteed|delivery time/i);
  });

  it("gives EastMallBuy Index a shortlist-triage experience", () => {
    const tenant = getTenantConfigByHost("eastmallbuyindex.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "eastmallbuy",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "EastMallBuy Index",
        logoPath: "/images/agents/eastmallbuy.png",
        heroEyebrow: "Independent EastMallBuy shortlist guide",
        indexing: "ready",
        indexablePaths: [
          "",
          "/guide",
          "/categories",
          "/spreadsheet",
          "/reddit",
          "/legit",
          "/referral-code",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("index");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(
      /spreadsheet|indexfinds|reddit|referral|guaranteed|delivery time/i,
    );
  });

  it("gives both YDA research domains distinct reviewed purposes", () => {
    const parcel = getTenantConfigByHost("ydaexpress.net")!;
    const sources = getTenantConfigByHost("ydaexpress.org")!;

    expect(parcel).toEqual(
      expect.objectContaining({ agentKey: null, productMode: "guide-only" }),
    );
    expect(sources).toEqual(
      expect.objectContaining({ agentKey: null, productMode: "guide-only" }),
    );
    expect(parcel.branding).toEqual(
      expect.objectContaining({
        siteName: "YDA Parcel Guide",
        showLogo: false,
        faviconPath: "/tenants/ydaexpress-net/favicon.svg",
        indexing: "ready",
        indexablePaths: [
          "", "/parcel-brief", "/warehouse-checklist",
          "/consolidation-planner", "/tracking-handoff", "/faq",
        ],
      }),
    );
    expect(sources.branding).toEqual(
      expect.objectContaining({
        siteName: "YDA Source Review",
        showLogo: false,
        faviconPath: "/tenants/ydaexpress-org/favicon.svg",
        indexing: "ready",
        indexablePaths: [
          "", "/service-map", "/terms-checklist",
          "/shopping-agent-vs-forwarding", "/quote-evidence", "/faq",
        ],
      }),
    );
    expect(parcel.branding?.seoTitle).not.toBe(sources.branding?.seoTitle);
    expect(parcel.branding?.editorial.homeVariant).toBe("guide");
    expect(sources.branding?.editorial.homeVariant).toBe("archive");
  });

  it("gives Fishgoo Index an intent-led search experience", () => {
    const tenant = getTenantConfigByHost("fishgooindex.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "fishgoo",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "Fishgoo Index",
        logoPath: "/images/agents/fishgoo.ico",
        heroEyebrow: "Independent Fishgoo product-intent guide",
        indexing: "ready",
        indexablePaths: [
          "",
          "/guide",
          "/categories",
          "/fishgoo-checklist",
          "/search-ideas",
          "/shipping",
          "/safety",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(
      /spreadsheet|indexfinds|official site|guaranteed|delivery time/i,
    );
  });

  it("gives GoatedBuy Index an evidence-scoring experience", () => {
    const tenant = getTenantConfigByHost("goatedbuyindex.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "goatedbuy",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "GoatedBuy Index",
        logoPath: "/images/agents/goatedbuy.svg",
        heroEyebrow: "Independent GoatedBuy result-scoring guide",
        indexing: "ready",
        indexablePaths: [
          "",
          "/guide",
          "/categories",
          "/goatedbuy-score",
          "/search-ideas",
          "/shipping",
          "/safety",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("guide");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(
      /spreadsheet|indexfinds|official site|guaranteed|delivery time/i,
    );
  });

  it("gives GTBuy a reviewed query-to-source experience", () => {
    const tenant = getTenantConfigByHost("gtbuyindex.com");
    expect(tenant).toEqual(
      expect.objectContaining({ agentKey: "gtbuy", productMode: "agent-feed" }),
    );
    expect(tenant?.branding).toEqual(
      expect.objectContaining({
        wordmark: "GTBuy",
        logoPath: "/images/agents/gtbuy.png",
        indexing: "ready",
        indexablePaths: [
          "", "/guide", "/categories", "/gtbuy-score", "/search-ideas",
          "/shipping", "/safety", "/faq",
        ],
      }),
    );
  });

  it("gives Hipobuy a reviewed source-to-QC experience", () => {
    const tenant = getTenantConfigByHost("hipobuyindex.com");
    expect(tenant).toEqual(
      expect.objectContaining({ agentKey: "hipobuy", productMode: "agent-feed" }),
    );
    expect(tenant?.branding).toEqual(
      expect.objectContaining({
        wordmark: "Hipobuy",
        logoPath: "/images/agents/hipobuy.png",
        indexing: "ready",
        indexablePaths: [
          "", "/guide", "/categories", "/hipobuy-score", "/search-ideas",
          "/shipping", "/safety", "/faq",
        ],
      }),
    );
  });

  it("gives BBDbuy US a destination-aware product research experience", () => {
    const tenant = getTenantConfigByHost("bbdbuyeus.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "bbdbuy",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "BBDbuy US Guide",
        logoPath: "/images/agents/bbdbuy.ico",
        heroEyebrow: "Independent US planning guide",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("index");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(/spreadsheet|indexfinds|guaranteed|delivery time/i);
  });

  it("gives BBDbuy EU Finds a category-first regional research experience", () => {
    const tenant = getTenantConfigByHost("bbdbuyeufinds.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "bbdbuy",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "BBDbuy EU Finds",
        logoPath: "/images/agents/bbdbuy.ico",
        heroEyebrow: "Independent EU discovery guide",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(/spreadsheet|indexfinds|guaranteed|delivery time/i);
  });

  it("gives BBDbuy EU Sheet a field-led shortlist experience", () => {
    const tenant = getTenantConfigByHost("bbdbuyeusheet.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "bbdbuy",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "BBDbuy EU Sheet",
        logoPath: "/images/agents/bbdbuy.ico",
        heroEyebrow: "Independent EU sheet directory",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("guide");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.supportingLine}`,
    ).not.toMatch(/indexfinds|guaranteed|delivery time/i);
  });

  it("uses the first forwarded host", () => {
    const headers = new Headers({
      host: "indexfinds.com",
      "x-forwarded-host": "superbuyitems.com, proxy.internal",
    });
    expect(resolveTenantFromHeaders(headers)?.domain).toBe("superbuyitems.com");
  });

  it("accepts a tenant proxy host only with the server-side secret", () => {
    const previousSecret = process.env.INDEXFINDS_TENANT_PROXY_SECRET;
    process.env.INDEXFINDS_TENANT_PROXY_SECRET = "test-proxy-secret";

    try {
      const trustedHeaders = new Headers({
        host: "indexfinds-web.vercel.app",
        "x-indexfinds-tenant-host": "usfansindex.net",
        "x-indexfinds-tenant-secret": "test-proxy-secret",
      });
      const untrustedHeaders = new Headers({
        host: "indexfinds.com",
        "x-indexfinds-tenant-host": "usfansindex.net",
        "x-indexfinds-tenant-secret": "wrong-secret",
      });

      expect(resolveTenantFromHeaders(trustedHeaders)?.domain).toBe(
        "usfansindex.net",
      );
      expect(resolveTenantFromHeaders(untrustedHeaders)).toBeNull();
    } finally {
      if (previousSecret === undefined) {
        delete process.env.INDEXFINDS_TENANT_PROXY_SECRET;
      } else {
        process.env.INDEXFINDS_TENANT_PROXY_SECRET = previousSecret;
      }
    }
  });

  it("resolves tenant URLs and names from the request host", () => {
    const identity = resolveSiteIdentityFromHeaders(
      new Headers({ host: "usfansindex.net" }),
    );

    expect(identity.siteUrl).toBe("https://usfansindex.net");
    expect(identity.siteName).toBe("USFans");
  });

  it("indexes only production-validated tenant-specific public paths", () => {
    const usfans = getTenantConfigByHost("usfansindex.net")!;
    const itaobuy = getTenantConfigByHost("itaobuyindex.com")!;
    const acbuy = getTenantConfigByHost("acbuyindex.com")!;

    expect(isTenantPathIndexable(usfans, "/en")).toBe(false);
    expect(isTenantPathIndexable(usfans, "/en/usfans-spreadsheet")).toBe(false);
    expect(isTenantPathIndexable(usfans, "/en/products/example")).toBe(false);
    expect(isTenantPathIndexable(usfans, "/en/privacy")).toBe(false);
    expect(isTenantPathIndexable(itaobuy, "/en")).toBe(false);
    expect(isTenantPathIndexable(itaobuy, "/en/site-guide")).toBe(false);
    expect(isTenantPathIndexable(itaobuy, "/en/products/example")).toBe(false);
    expect(isTenantPathIndexable(itaobuy, "/zh/site-guide")).toBe(false);
    expect(isTenantPathIndexable(acbuy, "/en")).toBe(true);
    expect(isTenantPathIndexable(acbuy, "/en/directory")).toBe(true);
    expect(isTenantPathIndexable(acbuy, "/en/platform-guide")).toBe(true);
    expect(isTenantPathIndexable(acbuy, "/en/category-research")).toBe(true);
    expect(isTenantPathIndexable(acbuy, "/en/safety-research")).toBe(true);
    expect(isTenantPathIndexable(acbuy, "/en/faq")).toBe(true);
    expect(isTenantPathIndexable(acbuy, "/en/site-guide")).toBe(false);
    expect(isTenantPathIndexable(acbuy, "/zh/directory")).toBe(false);
  });

  it("does not treat the main site or an unknown host as a tenant", () => {
    expect(getTenantConfigByHost("indexfinds.com")).toBeNull();
    expect(getTenantConfigByHost("localhost:3103")).toBeNull();
  });

  it("allows only the configured main, loopback, and exact preview hosts", () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const previousVercelUrl = process.env.VERCEL_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://indexfinds.com";
    process.env.VERCEL_URL = "indexfinds-preview.vercel.app";

    try {
      expect(isMainSiteHost("indexfinds.com:443")).toBe(true);
      expect(isMainSiteHost("www.indexfinds.com")).toBe(true);
      expect(isMainSiteHost("localhost:3103")).toBe(true);
      expect(isMainSiteHost("indexfinds-preview.vercel.app")).toBe(true);
      expect(isMainSiteHost("unknown-example.invalid")).toBe(false);
    } finally {
      if (previousSiteUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
      }
      if (previousVercelUrl === undefined) {
        delete process.env.VERCEL_URL;
      } else {
        process.env.VERCEL_URL = previousVercelUrl;
      }
    }
  });

  it("applies the USFans pilot branding through the local host fallback", () => {
    const headers = new Headers({ host: "localhost:3103" });
    expect(resolveTenantFromHeaders(headers, "usfansindex.net")).toEqual(
      expect.objectContaining({
        domain: "usfansindex.net",
        agentKey: "usfans",
        branding: expect.objectContaining({
          siteName: "USFans",
          logoPath: "/images/agents/usfans.png",
        }),
      }),
    );
  });

  it("declares the official USFans favicon at its real size", () => {
    const faviconPath = getTenantConfigByHost("usfansindex.net")!.branding!
      .faviconPath;

    expect(getTenantFaviconAttributes(faviconPath)).toEqual({
      type: "image/png",
      sizes: "48x48",
    });
  });

  it("keeps the USFans public brand copy independent", () => {
    const branding = getTenantConfigByHost("usfansindex.net")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "USFans",
        heroEyebrow: "Independent USFans source checks",
        indexing: "ready",
      }),
    );
    expect(branding?.seoTitle).not.toContain("IndexFinds");
    expect(branding?.heroEyebrow).not.toContain("IndexFinds");
  });

  it("gives the reviewed ACBuy site a six-page indexing allowlist", () => {
    const branding = getTenantConfigByHost("acbuyindex.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "ACBuy Index",
        logoPath: "/images/agents/acbuy.ico",
        heroEyebrow: "ACBuy search index",
        indexing: "ready",
        indexablePaths: [
          "",
          "/directory",
          "/platform-guide",
          "/category-research",
          "/safety-research",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.primaryCtaHref).toBe("/platform-guide");
    expect(branding?.heroPrimary).not.toBe(
      getTenantConfigByHost("usfansindex.net")?.branding?.heroPrimary,
    );
  });

  it("gives iTaoBuy a reviewed source-trace archive", () => {
    const tenant = getTenantConfigByHost("itaobuyindex.com");
    const branding = tenant?.branding;

    expect(tenant).toEqual(
      expect.objectContaining({
        agentKey: "itaobuy",
        productMode: "agent-feed",
      }),
    );
    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "iTaoBuy",
        wordmark: "iTaoBuy",
        logoPath: "/images/agents/itaobuy.ico",
        faviconPath: "/images/agents/itaobuy.ico",
        heroEyebrow: "Independent iTaoBuy research archive",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("archive");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary} ${branding?.editorial.introDescription}`,
    ).toMatch(/spreadsheet/i);
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/indexfinds|official site|guaranteed|delivery time/i);
  });

  it("gives the reviewed AllChinaBuy index a seven-page allowlist", () => {
    const branding = getTenantConfigByHost("allchinabuyindex.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "AllChinaBuy Index",
        logoPath: "/images/agents/allchinabuy.ico",
        heroEyebrow: "AllChinaBuy product directory",
        indexing: "ready",
        indexablePaths: [
          "",
          "/categories",
          "/guide",
          "/shipping-checklist",
          "/research-log",
          "/regions",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.primaryCtaHref).toBe("/guide");
    expect(branding?.heroPrimary).not.toBe(
      getTenantConfigByHost("acbuyindex.com")?.branding?.heroPrimary,
    );
  });

  it("gives the reviewed AllChinaBuy finder a separate six-page allowlist", () => {
    const branding = getTenantConfigByHost("allchinabuyfinder.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "AllChinaBuy Finder",
        indexing: "ready",
        indexablePaths: [
          "",
          "/categories",
          "/finder-guide",
          "/search-ideas",
          "/product-checklist",
          "/faq",
        ],
      }),
    );
    expect(branding?.editorial.primaryCtaHref).toBe("/finder-guide");
  });

  it("gives CSSBuy a reviewed query-first experience without spreadsheet claims", () => {
    const branding = getTenantConfigByHost("cssbuyindex.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "CSSBuy Index",
        logoPath: "/tenants/cssbuy/favicon-48x48.png",
        heroEyebrow: "CSSBuy query index",
        indexing: "ready",
      }),
    );
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet/i);
  });

  it("gives AllChinaBuy Finder a distinct reviewed catalog experience", () => {
    const branding = getTenantConfigByHost("allchinabuyfinder.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "AllChinaBuy Finder",
        logoPath: "/images/agents/allchinabuy.ico",
        heroEyebrow: "AllChinaBuy category finder",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(branding?.seoTitle).toContain("Browse Categories");
    expect(branding?.description.toLowerCase()).not.toContain("indexfinds");
  });

  it("gives CSSBuy Catalog a reviewed category-first experience", () => {
    const branding = getTenantConfigByHost("cssbuycatalog.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "CSSBuy Catalog",
        logoPath: "/tenants/cssbuy/favicon-48x48.png",
        heroEyebrow: "CSSBuy category catalog",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("gives CSSBuy Items a reviewed item-first experience", () => {
    const branding = getTenantConfigByHost("cssbuyitems.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "CSSBuy Items",
        logoPath: "/tenants/cssbuy/favicon-48x48.png",
        heroEyebrow: "CSSBuy item review",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("items");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("gives Kakobuy Index a reviewed shortlist-first experience", () => {
    const branding = getTenantConfigByHost("kakobuyindex.net")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "Kakobuy Index",
        wordmark: "Kakobuy",
        logoPath: "/tenants/kakobuyindex/official-app-icon.png",
        heroEyebrow: "Independent Kakobuy shortlist index",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("index");
    expect(branding?.indexablePaths).toHaveLength(8);
  });

  it("gives Kakobuy Items a reviewed evidence-first experience", () => {
    const branding = getTenantConfigByHost("kakobuyitems.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "Kakobuy Items",
        wordmark: "Kakobuy",
        logoPath: "/tenants/kakobuyindex/official-app-icon.png",
        heroEyebrow: "Kakobuy item evidence",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("items");
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("gives LitBuy Index a reviewed query-and-refresh experience", () => {
    const branding = getTenantConfigByHost("litbuyindex.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "LitBuy Search Index",
        wordmark: "Litbuy",
        logoPath: "/images/agents/litbuy.png",
        heroEyebrow: "Independent LitBuy query index",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("index");
    expect(branding?.indexablePaths).toHaveLength(8);
  });

  it("gives LitBuy Items a reviewed option-first experience", () => {
    const branding = getTenantConfigByHost("litbuyitems.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "LitBuy Items",
        wordmark: "Litbuy",
        logoPath: "/images/agents/litbuy.png",
        heroEyebrow: "Independent LitBuy item file",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("items");
    expect(branding?.indexablePaths).toHaveLength(8);
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("gives LitBuy Products a reviewed category-map experience", () => {
    const branding = getTenantConfigByHost("litbuyproducts.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "LitBuy Product Catalog",
        wordmark: "Litbuy",
        logoPath: "/images/agents/litbuy.png",
        heroEyebrow: "Independent LitBuy category map",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(branding?.indexablePaths).toHaveLength(8);
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("gives LoongBuy a reviewed link-to-parcel evidence route", () => {
    const branding = getTenantConfigByHost("loongbuys.net")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "LoongBuy Research Guide",
        wordmark: "Loongbuy",
        logoPath: "/images/agents/loongbuy.ico",
        heroEyebrow: "Independent LoongBuy evidence route",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("guide");
    expect(branding?.indexablePaths).toHaveLength(6);
  });

  it("gives LoveGoBuy a reviewed catalog-to-order-stage experience", () => {
    const branding = getTenantConfigByHost("lovegobuyindex.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "LoveGoBuy Product Directory",
        wordmark: "Lovegobuy",
        logoPath: "/images/agents/lovegobuy.ico",
        heroEyebrow: "Independent LoveGoBuy order board",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("catalog");
    expect(branding?.indexablePaths).toHaveLength(8);
  });

  it("gives Superbuy Items a reviewed product-page-first experience", () => {
    const branding = getTenantConfigByHost("superbuyitems.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "Superbuy Item Evidence Files",
        logoPath: "/images/agents/superbuy.svg",
        heroEyebrow: "Superbuy item review",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("items");
    expect(branding?.indexablePaths).toHaveLength(8);
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("gives MuleBuy Index a reviewed query-and-row experience", () => {
    const branding = getTenantConfigByHost("mulebuyindex.net")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "MuleBuy Spreadsheet Index",
        wordmark: "MuleBuy",
        logoPath: "/images/agents/mulebuy.ico",
        heroEyebrow: "Independent MuleBuy spreadsheet index",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("index");
    expect(branding?.indexablePaths).toHaveLength(8);
  });

  it("gives MuleBuy Items a reviewed layered item experience", () => {
    const branding = getTenantConfigByHost("mulebuyitems.com")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "MuleBuy Item Evidence",
        wordmark: "MuleBuy",
        logoPath: "/images/agents/mulebuy.ico",
        heroEyebrow: "Independent MuleBuy item evidence",
        indexing: "ready",
      }),
    );
    expect(branding?.editorial.homeVariant).toBe("items");
    expect(branding?.indexablePaths).toHaveLength(8);
    expect(
      `${branding?.seoTitle} ${branding?.description} ${branding?.heroPrimary}`,
    ).not.toMatch(/spreadsheet|indexfinds/i);
  });

  it("builds a local tenant shell for every listed subsite", () => {
    for (const guide of SUBSITE_GUIDES) {
      const tenant = getTenantConfigByHost(guide.domain);

      expect(tenant).toEqual(
        expect.objectContaining({
          domain: guide.domain,
          productMode: guide.productMode,
          branding: expect.objectContaining({
            siteName: expect.any(String),
            editorial: expect.objectContaining({
              primaryCtaHref: expect.stringMatching(/^\//),
            }),
          }),
        }),
      );
    }
  });

  it("has no remaining draft tenant after the YDA editorial review", () => {
    const draftTenants = SUBSITE_GUIDES.filter(
      ({ domain }) =>
        ![
          "usfansindex.net",
          "itaobuyindex.com",
          "acbuyindex.com",
          "allchinabuyindex.com",
          "allchinabuyfinder.com",
          "bbdbuyeufinds.com",
          "bbdbuyeus.com",
          "bbdbuyeusheet.com",
          "cssbuyitems.com",
          "cssbuyindex.com",
          "cssbuycatalog.com",
          "kakobuyindex.net",
          "kakobuyitems.com",
          "litbuyindex.com",
          "litbuyitems.com",
          "litbuyproducts.com",
          "loongbuys.net",
          "lovegobuyindex.com",
          "mulebuyindex.net",
          "mulebuyitems.com",
          "oopbuyindex.net",
          "orientdigindex.com",
          "parcelupindex.com",
          "sugargooindex.net",
          "superbuydeals.com",
          "superbuyindex.com",
          "superbuyitems.com",
          "cnshopperindex.com",
          "eastmallbuyindex.com",
          "fishgooindex.com",
          "boonbuyfind.net",
          "boonbuyindex.com",
          "goatedbuyindex.com",
          "gtbuyindex.com",
          "hipobuyindex.com",
          "hoobuyindex.net",
          "joyabuyfinds.com",
          "joyagooindex.com",
          "kameymallindex.com",
          "yoybuyindex.com",
          "ydaexpress.net",
          "ydaexpress.org",
        ].includes(domain),
    );

    expect(draftTenants).toHaveLength(0);
  });

  it("indexes only production-validated tenants in English", () => {
    const releasedDomains = SUBSITE_GUIDES.filter(({ domain }) => {
      const tenant = getTenantConfigByHost(domain)!;
      expect(isTenantLocaleIndexable(tenant, "zh")).toBe(false);
      return isTenantLocaleIndexable(tenant, "en");
    }).map(({ domain }) => domain);

    expect(releasedDomains).toEqual([
      "acbuyindex.com",
      "allchinabuyfinder.com",
      "allchinabuyindex.com",
      "bbdbuyeufinds.com",
      "bbdbuyeus.com",
      "bbdbuyeusheet.com",
      "boonbuyfind.net",
      "boonbuyindex.com",
      "cnshopperindex.com",
      "ydaexpress.net",
      "ydaexpress.org",
    ]);
  });

  it("gives every non-USFans tenant an explicit editorial profile", () => {
    const profiledDomains = SUBSITE_GUIDES.filter(
      ({ domain }) => domain !== "usfansindex.net",
    ).map(({ domain }) => domain);

    expect(Object.keys(TENANT_EDITORIAL_PROFILES).sort()).toEqual(
      profiledDomains.sort(),
    );
  });

  it("uses distinct non-USFans homepage and guide copy", () => {
    const profiledTenants = SUBSITE_GUIDES.filter(
      ({ domain }) => domain !== "usfansindex.net",
    ).map(({ domain }) => ({
      domain,
      branding: getTenantConfigByHost(domain)?.branding,
    }));

    const fields = [
      "seoTitle",
      "description",
      "heroPrimary",
      "supportingLine",
    ] as const;
    const duplicateGroups = fields.flatMap((field) => {
      const groups = new Map<string, string[]>();
      for (const { domain, branding } of profiledTenants) {
        const value = branding?.[field] || "";
        groups.set(value, [...(groups.get(value) || []), domain]);
      }
      return [...groups.entries()]
        .filter(([, domains]) => domains.length > 1)
        .map(([value, domains]) => ({ field, value, domains }));
    });
    expect(duplicateGroups).toEqual([]);
    for (const { domain, branding } of profiledTenants) {
      const expectedCta = (
        {
          "acbuyindex.com": "/platform-guide",
          "allchinabuyindex.com": "/guide",
          "allchinabuyfinder.com": "/finder-guide",
          "bbdbuyeufinds.com": "/eu-finds",
          "bbdbuyeus.com": "/search-guide",
          "bbdbuyeusheet.com": "/eu-sheet",
          "cssbuyitems.com": "/cssbuy-score",
          "cssbuyindex.com": "/guide",
          "cssbuycatalog.com": "/guide",
          "kakobuyindex.net": "/guide",
          "kakobuyitems.com": "/guide",
          "litbuyindex.com": "/guide",
          "litbuyitems.com": "/guide",
          "litbuyproducts.com": "/guide",
          "loongbuys.net": "/guide",
          "lovegobuyindex.com": "/guide",
          "mulebuyindex.net": "/mulebuy-spreadsheet",
          "mulebuyitems.com": "/spreadsheet-checklist",
          "oopbuyindex.net": "/oopbuy-score",
          "orientdigindex.com": "/orient-score-methodology",
          "parcelupindex.com": "/getting-started",
          "sugargooindex.net": "/sugargoo-buying-guide",
          "superbuydeals.com": "/spreadsheet-checklist",
          "superbuyindex.com": "/superbuy-spreadsheet",
          "superbuyitems.com": "/superbuy-items",
          "cnshopperindex.com": "/category-map",
          "eastmallbuyindex.com": "/guide",
          "fishgooindex.com": "/guide",
          "boonbuyfind.net": "/search-guide",
          "boonbuyindex.com": "/query-method",
          "goatedbuyindex.com": "/guide",
          "gtbuyindex.com": "/guide",
          "hipobuyindex.com": "/guide",
          "hoobuyindex.net": "/guide",
          "joyabuyfinds.com": "/guide",
          "joyagooindex.com": "/guide",
          "kameymallindex.com": "/guide",
          "yoybuyindex.com": "/spreadsheet",
          "ydaexpress.net": "/parcel-brief",
          "ydaexpress.org": "/service-map",
        } as Record<string, string>
      )[domain];
      expect(branding?.editorial.primaryCtaHref).toBe(
        expectedCta || "/site-guide",
      );
      expect(branding?.supportingLine).not.toBe(branding?.description);
    }
  });

  it("keeps reviewed tenants distinct from each other", () => {
    const reviewed = [
      "itaobuyindex.com",
      "usfansindex.net",
      "acbuyindex.com",
      "allchinabuyindex.com",
      "allchinabuyfinder.com",
      "bbdbuyeufinds.com",
      "bbdbuyeus.com",
      "bbdbuyeusheet.com",
      "cssbuyitems.com",
      "cssbuyindex.com",
      "cssbuycatalog.com",
      "kakobuyindex.net",
      "kakobuyitems.com",
      "litbuyindex.com",
      "litbuyitems.com",
      "litbuyproducts.com",
      "loongbuys.net",
      "lovegobuyindex.com",
      "mulebuyindex.net",
      "mulebuyitems.com",
      "oopbuyindex.net",
      "orientdigindex.com",
      "parcelupindex.com",
      "sugargooindex.net",
      "superbuydeals.com",
      "superbuyindex.com",
      "superbuyitems.com",
      "cnshopperindex.com",
      "eastmallbuyindex.com",
      "fishgooindex.com",
      "boonbuyfind.net",
      "boonbuyindex.com",
      "goatedbuyindex.com",
      "gtbuyindex.com",
      "hipobuyindex.com",
      "hoobuyindex.net",
      "joyabuyfinds.com",
      "joyagooindex.com",
      "kameymallindex.com",
      "yoybuyindex.com",
      "ydaexpress.net",
      "ydaexpress.org",
    ].map((domain) => getTenantConfigByHost(domain)!.branding!);

    for (const field of ["seoTitle", "description", "heroPrimary"] as const) {
      expect(new Set(reviewed.map((branding) => branding[field])).size).toBe(
        reviewed.length,
      );
    }
  });

  it("keeps draft editorial copy neutral and evidence-led", () => {
    const copy = JSON.stringify(TENANT_EDITORIAL_PROFILES);

    expect(copy).not.toMatch(
      /\b(authentic|genuine|official|premium|high[- ]quality|best quality|guaranteed|durability|longevity)\b/i,
    );
    expect(copy).not.toMatch(/[—–]/);
  });

  it("uses an official platform asset for every agent-backed tenant", () => {
    for (const guide of SUBSITE_GUIDES.filter(({ agentKey }) => agentKey)) {
      const branding = getTenantConfigByHost(guide.domain)?.branding;
      const platform = getAgentPlatform(guide.agentKey!);
      const officialLogo = getOfficialPlatformLogo(guide.agentKey!)?.src;

      expect(branding?.wordmark).toBe(platform?.name);
      expect(branding?.logoPath).toBe(officialLogo);
      expect(branding?.faviconPath).toBe(officialLogo);
      expect(branding?.wordmark).not.toMatch(
        /\s(?:index|items|catalog|products|finder|finds|sheet|deals|guide)$/i,
      );
    }
  });

  it("uses purpose-specific home structures without inventing an agent", () => {
    expect(
      getTenantConfigByHost("acbuyindex.com")?.branding?.editorial.homeVariant,
    ).toBe("index");
    expect(
      getTenantConfigByHost("cssbuycatalog.com")?.branding?.editorial
        .homeVariant,
    ).toBe("catalog");
    expect(
      getTenantConfigByHost("cssbuyitems.com")?.branding?.editorial.homeVariant,
    ).toBe("items");
    expect(
      getTenantConfigByHost("itaobuyindex.com")?.branding?.editorial
        .homeVariant,
    ).toBe("archive");
  });
});
