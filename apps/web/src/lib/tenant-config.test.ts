import {
  getTenantConfigByHost,
  isTenantLocaleIndexable,
  resolveTenantFromHeaders,
} from "./tenant-config";
import { SUBSITE_GUIDES } from "./subsite-guides";
import { TENANT_EDITORIAL_PROFILES } from "./tenant-editorial-profiles";

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

  it("preserves guide-only tenants without inventing an agent", () => {
    expect(getTenantConfigByHost("1to1reps.com")).toEqual(
      expect.objectContaining({ agentKey: null, productMode: "guide-only" }),
    );
  });

  it("uses the first forwarded host", () => {
    const headers = new Headers({
      host: "indexfinds.com",
      "x-forwarded-host": "superbuyitems.com, proxy.internal",
    });
    expect(resolveTenantFromHeaders(headers)?.domain).toBe("superbuyitems.com");
  });

  it("does not treat the main site or an unknown host as a tenant", () => {
    expect(getTenantConfigByHost("indexfinds.com")).toBeNull();
    expect(getTenantConfigByHost("localhost:3103")).toBeNull();
  });

  it("applies the USFans pilot branding through the local host fallback", () => {
    const headers = new Headers({ host: "localhost:3103" });
    expect(resolveTenantFromHeaders(headers, "usfansindex.net")).toEqual(
      expect.objectContaining({
        domain: "usfansindex.net",
        agentKey: "usfans",
        branding: expect.objectContaining({
          siteName: "USFans Index",
          logoPath: "/images/agents/usfans.png",
        }),
      }),
    );
  });

  it("keeps the USFans public brand copy independent", () => {
    const branding = getTenantConfigByHost("usfansindex.net")?.branding;

    expect(branding).toEqual(
      expect.objectContaining({
        siteName: "USFans Index",
        heroEyebrow: "USFans product discovery",
        indexing: "ready",
      }),
    );
    expect(branding?.seoTitle).not.toContain("IndexFinds");
    expect(branding?.heroEyebrow).not.toContain("IndexFinds");
  });

  it("builds a local tenant shell for every listed subsite", () => {
    for (const guide of SUBSITE_GUIDES) {
      const tenant = getTenantConfigByHost(guide.domain);

      expect(tenant).toEqual(
        expect.objectContaining({
          domain: guide.domain,
          productMode: guide.productMode,
          branding: expect.objectContaining({
            siteName: guide.title,
            editorial: expect.objectContaining({
              primaryCtaHref: expect.stringMatching(/^\//),
            }),
          }),
        }),
      );
    }
  });

  it("keeps all non-pilot tenants in draft indexing mode", () => {
    const draftTenants = SUBSITE_GUIDES.filter(
      ({ domain }) => domain !== "usfansindex.net",
    );

    expect(draftTenants.length).toBeGreaterThan(30);
    for (const guide of draftTenants) {
      expect(getTenantConfigByHost(guide.domain)?.branding?.indexing).toBe(
        "draft",
      );
    }
  });

  it("indexes only the reviewed English tenant locale", () => {
    const usfans = getTenantConfigByHost("usfansindex.net")!;
    const draft = getTenantConfigByHost("acbuyindex.com")!;

    expect(isTenantLocaleIndexable(usfans, "en")).toBe(true);
    expect(isTenantLocaleIndexable(usfans, "zh")).toBe(false);
    expect(isTenantLocaleIndexable(draft, "en")).toBe(false);
  });

  it("gives every draft tenant an explicit editorial profile", () => {
    const draftDomains = SUBSITE_GUIDES.filter(
      ({ domain }) => domain !== "usfansindex.net",
    ).map(({ domain }) => domain);

    expect(Object.keys(TENANT_EDITORIAL_PROFILES).sort()).toEqual(
      draftDomains.sort(),
    );
  });

  it("uses distinct draft homepage and guide copy", () => {
    const draftBranding = SUBSITE_GUIDES.filter(
      ({ domain }) => domain !== "usfansindex.net",
    ).map(({ domain }) => getTenantConfigByHost(domain)?.branding);

    expect(new Set(draftBranding.map((item) => item?.heroPrimary)).size).toBe(
      draftBranding.length,
    );
    expect(new Set(draftBranding.map((item) => item?.seoTitle)).size).toBe(
      draftBranding.length,
    );
    for (const branding of draftBranding) {
      expect(branding?.editorial.primaryCtaHref).toBe("/site-guide");
      expect(branding?.supportingLine).not.toBe(branding?.description);
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
      expect(getTenantConfigByHost(guide.domain)?.branding?.logoPath).not.toBe(
        "/tenants/catalog/favicon.svg",
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
      getTenantConfigByHost("1to1reps.com")?.branding?.editorial.homeVariant,
    ).toBe("guide");
    expect(getTenantConfigByHost("1to1reps.com")?.agentKey).toBeNull();
  });
});
