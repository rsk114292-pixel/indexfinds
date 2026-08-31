const TENANT_LEGACY_PATH_REDIRECTS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "litbuyitems.com": {
    "/litbuy-haul": "/en/haul-review",
    "/litbuy-spreadsheet": "https://litbuyindex.com/en",
    "/shipping.html": "/en/shipping",
    "/invitation-code.html": "/en/invitation-code",
    "/guide.html": "/en/guide",
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
