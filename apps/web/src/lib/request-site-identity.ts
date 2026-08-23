import { headers } from "next/headers";
import { generateAlternates } from "./seo";
import {
  resolveSiteIdentityFromHeaders,
  type SiteIdentity,
} from "./tenant-config";

export async function getRequestSiteIdentity() {
  return resolveSiteIdentityFromHeaders(
    await headers(),
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
}

export function buildSiteAlternates(
  identity: SiteIdentity,
  path: string,
  locale: string,
) {
  if (!identity.tenant) {
    return generateAlternates(path, locale, identity.siteUrl);
  }

  const canonical = `${identity.siteUrl}/en${path}`;
  return {
    canonical,
    languages: { en: canonical, "x-default": canonical },
  };
}
