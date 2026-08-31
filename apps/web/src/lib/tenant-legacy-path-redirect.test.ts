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
