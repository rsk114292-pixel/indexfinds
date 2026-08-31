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
