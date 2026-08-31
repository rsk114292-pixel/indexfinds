const TENANT_LEGACY_PATH_REDIRECTS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "litbuyitems.com": {
    "/litbuy-haul": "/en/haul-review",
    "/litbuy-spreadsheet": "https://litbuyindex.com/en",
    "/shipping.html": "/en/shipping",
    "/invitation-code.html": "/en/invitation-code",
    "/guide.html": "/en/guide",
    "/faq.html": "/en/faq",
  },
  "litbuyproducts.com": {
    "/invitation-code.html": "/en/invitation-code",
    "/coupons.html": "/en/coupons",
  },
  "superbuydeals.com": {
    "/shipping-weight-guide.html": "/en/shipping-weight-guide",
    "/categories.html": "/en/categories",
  },
  "joyagooindex.com": {
    "/faq.html": "/en/faq",
  },
  "kakobuyindex.net": {
    "/safety.html": "/en/safety",
  },
  "usfansindex.net": {
    "/contact.html": "/en/contact",
  },
  "joyabuyfinds.com": {
    "/how-much-is-joyagoo-shipping": "/en/shipping",
    "/how-to-use-joyagoo": "/en/guide",
    "/joyagoo-shopping-guide": "/en/guide",
    "/faq.html": "/en/faq",
  },
  "orientdigindex.com": {
    "/categories.html": "/en/categories",
    "/spreadsheet-checklist.html": "/en/spreadsheet-checklist",
    "/privacy.html": "/en/privacy",
  },
  "eastmallbuyindex.com": {
    "/reddit.html": "/en/reddit",
  },
  "fishgooindex.com": {
    "/faq.html": "/en/faq",
  },
  "goatedbuyindex.com": {
    "/safety.html": "/en/safety",
    "/guide.html": "/en/guide",
    "/search-ideas.html": "/en/search-ideas",
    "/faq.html": "/en/faq",
  },
  "gtbuyindex.com": {
    "/categories.html": "/en/categories",
    "/shipping.html": "/en/shipping",
    "/safety.html": "/en/safety",
    "/guide.html": "/en/guide",
    "/faq.html": "/en/faq",
  },
  "kameymallindex.com": {
    "/review.html": "/en/review",
    "/categories.html": "/en/categories",
    "/search-ideas.html": "/en/search-ideas",
    "/safety.html": "/en/safety",
    "/shipping.html": "/en/shipping",
  },
  "loongbuys.net": {
    "/safety.html": "/en/safety",
    "/faq.html": "/en/faq",
    "/reviews.html": "/en/reviews",
    "/guide.html": "/en/guide",
  },
  "mulebuyindex.net": {
    "/shipping-weight-guide.html": "/en/shipping-weight-guide",
    "/contact.html": "/en/contact",
    "/faq.html": "/en/faq",
  },
  "mulebuyitems.com": {
    "/mulebuy-items": "/en/mulebuy-spreadsheet",
    "/shipping-weight-guide.html": "/en/shipping-weight-guide",
    "/faq.html": "/en/faq",
    "/buyer-safety.html": "/en/buyer-safety",
    "/contact.html": "/en/contact",
    "/categories.html": "/en/categories",
  },
  "bbdbuyeufinds.com": {
    "/bbdbuyeu-product-discovery": "/en/eu-finds",
    "/bbdbuyeu-qc-photo-finds": "/en/qc-checklist",
    "/news/bbdbuyeu-finds-checklist": "/en/eu-finds",
    "/news/how-bbdbuyeu-finds-work": "/en/eu-guide",
  },
  "allchinabuyfinder.com": {
    "/allchinabuy-finder": "/en/finder-guide",
  },
};

export function getTenantLegacyPathRedirectUrl(
  requestUrl: string,
  tenantDomain: string,
): string | null {
  const request = new URL(requestUrl);
  const normalizedPath = request.pathname.replace(/\/+$/, "") || "/";
  const target =
    TENANT_LEGACY_PATH_REDIRECTS[tenantDomain.toLowerCase()]?.[
      normalizedPath.toLowerCase()
    ];

  if (!target) return null;

  const redirect = new URL(target, request);
  redirect.search = request.search;
  redirect.hash = "";
  return redirect.toString();
}
