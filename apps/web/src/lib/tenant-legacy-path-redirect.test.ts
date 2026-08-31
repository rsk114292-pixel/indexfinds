import { getTenantLegacyPathRedirectUrl } from "./tenant-legacy-path-redirect";

describe("tenant legacy path redirects", () => {
  it.each([
    ["/litbuy-haul/", "https://litbuyitems.com/en/haul-review"],
    ["/shipping.html", "https://litbuyitems.com/en/shipping"],
    ["/invitation-code.html", "https://litbuyitems.com/en/invitation-code"],
    ["/guide.html", "https://litbuyitems.com/en/guide"],
  ])("redirects %s to its current reviewed page", (pathname, expected) => {
    expect(
      getTenantLegacyPathRedirectUrl(
        `https://litbuyitems.com${pathname}`,
        "litbuyitems.com",
      ),
    ).toBe(expected);
  });

  it("consolidates the old spreadsheet path on the dedicated LitBuy index", () => {
    expect(
      getTenantLegacyPathRedirectUrl(
        "https://litbuyitems.com/litbuy-spreadsheet/?utm_source=legacy",
        "litbuyitems.com",
      ),
    ).toBe("https://litbuyindex.com/en?utm_source=legacy");
  });

  it("does not redirect an unrelated tenant or unsupported legacy article", () => {
    expect(
      getTenantLegacyPathRedirectUrl(
        "https://litbuyitems.com/litbuy-news/litbuy-vs-superbuy/",
        "litbuyitems.com",
      ),
    ).toBeNull();
    expect(
      getTenantLegacyPathRedirectUrl(
        "https://example.com/shipping.html",
        "example.com",
      ),
    ).toBeNull();
  });

  it.each([
    [
      "superbuydeals.com",
      "/shipping-weight-guide.html",
      "https://superbuydeals.com/en/shipping-weight-guide",
    ],
    [
      "superbuydeals.com",
      "/categories.html",
      "https://superbuydeals.com/en/categories",
    ],
    [
      "joyagooindex.com",
      "/faq.html",
      "https://joyagooindex.com/en/faq",
    ],
    [
      "kakobuyindex.net",
      "/safety.html",
      "https://kakobuyindex.net/en/safety",
    ],
    [
      "usfansindex.net",
      "/contact.html",
      "https://usfansindex.net/en/contact",
    ],
  ])(
    "recovers an exposed legacy path for %s",
    (domain, pathname, expected) => {
      expect(
        getTenantLegacyPathRedirectUrl(
          `https://${domain}${pathname}`,
          domain,
        ),
      ).toBe(expected);
    },
  );

  it.each([
    ["eastmallbuyindex.com", "/reddit.html", "/en/reddit"],
    ["fishgooindex.com", "/faq.html", "/en/faq"],
    ["goatedbuyindex.com", "/safety.html", "/en/safety"],
    ["goatedbuyindex.com", "/guide.html", "/en/guide"],
    ["goatedbuyindex.com", "/search-ideas.html", "/en/search-ideas"],
    ["goatedbuyindex.com", "/faq.html", "/en/faq"],
    ["gtbuyindex.com", "/categories.html", "/en/categories"],
    ["gtbuyindex.com", "/shipping.html", "/en/shipping"],
    ["gtbuyindex.com", "/safety.html", "/en/safety"],
    ["gtbuyindex.com", "/guide.html", "/en/guide"],
    ["gtbuyindex.com", "/faq.html", "/en/faq"],
    ["kameymallindex.com", "/review.html", "/en/review"],
    ["kameymallindex.com", "/categories.html", "/en/categories"],
    ["kameymallindex.com", "/search-ideas.html", "/en/search-ideas"],
    ["kameymallindex.com", "/safety.html", "/en/safety"],
    ["kameymallindex.com", "/shipping.html", "/en/shipping"],
    ["litbuyitems.com", "/faq.html", "/en/faq"],
    ["litbuyproducts.com", "/invitation-code.html", "/en/invitation-code"],
    ["litbuyproducts.com", "/coupons.html", "/en/coupons"],
    ["loongbuys.net", "/safety.html", "/en/safety"],
    ["loongbuys.net", "/faq.html", "/en/faq"],
    ["loongbuys.net", "/reviews.html", "/en/reviews"],
    ["loongbuys.net", "/guide.html", "/en/guide"],
    ["mulebuyindex.net", "/shipping-weight-guide.html", "/en/shipping-weight-guide"],
    ["mulebuyindex.net", "/contact.html", "/en/contact"],
    ["mulebuyindex.net", "/faq.html", "/en/faq"],
    ["mulebuyitems.com", "/mulebuy-items/", "/en/mulebuy-spreadsheet"],
    ["mulebuyitems.com", "/shipping-weight-guide.html", "/en/shipping-weight-guide"],
    ["mulebuyitems.com", "/faq.html", "/en/faq"],
    ["mulebuyitems.com", "/buyer-safety.html", "/en/buyer-safety"],
    ["mulebuyitems.com", "/contact.html", "/en/contact"],
    ["mulebuyitems.com", "/categories.html", "/en/categories"],
    ["bbdbuyeufinds.com", "/bbdbuyeu-product-discovery/", "/en/eu-finds"],
    ["bbdbuyeufinds.com", "/bbdbuyeu-qc-photo-finds/", "/en/qc-checklist"],
    ["bbdbuyeufinds.com", "/news/bbdbuyeu-finds-checklist/", "/en/eu-finds"],
    ["bbdbuyeufinds.com", "/news/how-bbdbuyeu-finds-work/", "/en/eu-guide"],
    ["allchinabuyfinder.com", "/allchinabuy-finder/", "/en/finder-guide"],
  ])("recovers a GSC-exposed path for %s", (domain, pathname, target) => {
    expect(
      getTenantLegacyPathRedirectUrl(`https://${domain}${pathname}`, domain),
    ).toBe(`https://${domain}${target}`);
  });

  it.each([
    ["mulebuyitems.com", "/disclaimer.html"],
    ["allchinabuyfinder.com", "/best-allchinabuy-finds/"],
    ["allchinabuyfinder.com", "/allchinabuy-spreadsheet/"],
    ["bbdbuyeufinds.com", "/news/bbdbuyeu-haul-finds-guide/"],
  ])(
    "keeps a GSC-exposed page without a strict equivalent out of redirects for %s",
    (domain, pathname) => {
      expect(
        getTenantLegacyPathRedirectUrl(`https://${domain}${pathname}`, domain),
      ).toBeNull();
    },
  );

  it.each([
    [
      "joyabuyfinds.com",
      "/how-much-is-joyagoo-shipping/",
      "https://joyabuyfinds.com/en/shipping",
    ],
    [
      "joyabuyfinds.com",
      "/how-to-use-joyagoo/",
      "https://joyabuyfinds.com/en/guide",
    ],
    [
      "joyabuyfinds.com",
      "/joyagoo-shopping-guide/",
      "https://joyabuyfinds.com/en/guide",
    ],
    [
      "joyabuyfinds.com",
      "/faq.html",
      "https://joyabuyfinds.com/en/faq",
    ],
    [
      "orientdigindex.com",
      "/categories.html",
      "https://orientdigindex.com/en/categories",
    ],
    [
      "orientdigindex.com",
      "/spreadsheet-checklist.html",
      "https://orientdigindex.com/en/spreadsheet-checklist",
    ],
    [
      "orientdigindex.com",
      "/privacy.html",
      "https://orientdigindex.com/en/privacy",
    ],
  ])(
    "recovers a high-impression legacy path for %s",
    (domain, pathname, expected) => {
      expect(
        getTenantLegacyPathRedirectUrl(
          `https://${domain}${pathname}`,
          domain,
        ),
      ).toBe(expected);
    },
  );

  it.each([
    ["joyabuyfinds.com", "/joyagoo-review/"],
    ["joyabuyfinds.com", "/joyagoo-qc-guide/"],
    ["joyabuyfinds.com", "/joyagoo-news/"],
  ])(
    "keeps a JoyaGoo legacy page without an equivalent out of soft redirects",
    (domain, pathname) => {
      expect(
        getTenantLegacyPathRedirectUrl(
          `https://${domain}${pathname}`,
          domain,
        ),
      ).toBeNull();
    },
  );

  it.each([
    ["superbuydeals.com", "/superbuy-shopping-agent/"],
    ["superbuydeals.com", "/superbuy-haul/"],
  ])(
    "does not soft-redirect a retired page without an equivalent for %s",
    (domain, pathname) => {
      expect(
        getTenantLegacyPathRedirectUrl(
          `https://${domain}${pathname}`,
          domain,
        ),
      ).toBeNull();
    },
  );
});
