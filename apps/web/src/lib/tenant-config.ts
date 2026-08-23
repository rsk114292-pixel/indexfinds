import {
  getSubsiteGuideByDomain,
  type SubsiteGuideDefinition,
} from "./subsite-guides";
import { getAgentPlatform } from "./agent-platforms";
import { getOfficialPlatformLogo } from "./platform-logo-assets";
import { getTenantEditorialProfile } from "./tenant-editorial-profiles";

export interface TenantConfig extends SubsiteGuideDefinition {
  canonicalOrigin: string;
  branding?: TenantBranding;
}

export interface TenantBranding {
  siteName: string;
  wordmark: string;
  logoPath: string;
  faviconPath: string;
  themeColor: string;
  primaryColor: string;
  primaryHoverColor: string;
  accentColor: string;
  seoTitle: string;
  description: string;
  heroEyebrow: string;
  heroPrimary: string;
  heroSecondary: string;
  supportingLine: string;
  indexing: "ready" | "draft";
  editorial: TenantEditorial;
}

export interface TenantEditorial {
  homeVariant: "index" | "catalog" | "guide";
  introTitle: string;
  introDescription: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  brandTitle: string;
  brandDescription: string;
}

const TENANT_BRANDING: Partial<Record<string, TenantBranding>> = {
  "usfansindex.net": {
    siteName: "USFans Index",
    wordmark: "USFans Index",
    logoPath: "/images/agents/usfans.png",
    faviconPath: "/tenants/usfans/favicon.svg",
    themeColor: "#111827",
    primaryColor: "#d84a24",
    primaryHoverColor: "#b83a1b",
    accentColor: "#f4a340",
    seoTitle: "USFans Spreadsheet & Product Index | Search Products",
    description:
      "Search the USFans product index by product, brand or category. Compare prices and product details, then choose how to buy.",
    heroEyebrow: "USFans product discovery",
    heroPrimary: "Search the USFans product index.",
    heroSecondary: "Compare before you buy.",
    supportingLine:
      "Explore product details, browse categories and choose your preferred buying route.",
    indexing: "ready",
    editorial: {
      homeVariant: "index",
      introTitle: "Start with the USFans index.",
      introDescription:
        "Search current products, narrow the catalog by category or brand, then compare the available buying routes.",
      primaryCtaLabel: "Open the USFans guide",
      primaryCtaHref: "/usfans-spreadsheet",
      brandTitle: "Brands in the USFans index.",
      brandDescription:
        "Open live brand pages, review product counts and move directly into the catalog.",
    },
  },
};

const DRAFT_PALETTES = {
  "agent-feed": {
    primaryColor: "#c2410c",
    primaryHoverColor: "#9a3412",
    accentColor: "#f59e0b",
  },
  "direct-products": {
    primaryColor: "#0f766e",
    primaryHoverColor: "#115e59",
    accentColor: "#f59e0b",
  },
  "guide-only": {
    primaryColor: "#df642d",
    primaryHoverColor: "#bc471d",
    accentColor: "#6b93c5",
  },
} as const;

function buildDraftBranding(guide: SubsiteGuideDefinition): TenantBranding {
  const platform = guide.agentKey ? getAgentPlatform(guide.agentKey) : undefined;
  const logo = guide.agentKey
    ? getOfficialPlatformLogo(guide.agentKey)?.src
    : undefined;
  const palette = DRAFT_PALETTES[guide.productMode];
  const subject = platform?.name || guide.title;
  const isCatalog = guide.productMode === "direct-products";
  const isGuide = guide.productMode === "guide-only";
  const profile = getTenantEditorialProfile(guide.domain);

  return {
    siteName: guide.title,
    wordmark: guide.title,
    logoPath: logo || "/tenants/catalog/favicon.svg",
    faviconPath: logo || "/tenants/catalog/favicon.svg",
    themeColor: "#111827",
    ...palette,
    seoTitle: profile?.guideTitle || `${guide.title} | Product Research`,
    description:
      profile?.summary ||
      (isGuide
        ? `Use ${guide.title} to research marketplace listings and compare the available details.`
        : isCatalog
          ? `Browse ${guide.title} by category, brand or product.`
          : `Search ${guide.title} by product, brand or category.`),
    heroEyebrow: `${guide.title} catalog research`,
    heroPrimary:
      profile?.heroTitle ||
      (isGuide
        ? `Research products with ${guide.title}.`
        : isCatalog
          ? `Browse the ${guide.title}.`
          : `Search the ${guide.title}.`),
    heroSecondary:
      profile?.heroAccent ||
      (isGuide
        ? "Compare details before choosing a route."
        : isCatalog
          ? "Browse with clearer product context."
          : "Compare listings and buying routes."),
    supportingLine: isGuide
      ? "Use the linked source pages to confirm current product details before choosing a buying route."
      : isCatalog
        ? "Open each listing source to confirm current price, availability and service terms."
        : `Compare the available ${subject} listing details, then confirm current price and service terms on the destination site.`,
    indexing: "draft",
    editorial: {
      homeVariant: isGuide ? "guide" : isCatalog ? "catalog" : "index",
      introTitle: profile?.guideTitle ||
        (isGuide
          ? `Use ${guide.title} as a research guide.`
          : isCatalog
            ? `Explore ${guide.title}.`
            : `Start with ${guide.title}.`),
      introDescription:
        profile?.summary ||
        (isGuide
          ? "Compare marketplace information, open the available source details and decide which route to research next."
          : isCatalog
            ? "Start with a category or brand, then open individual product pages to review the available listing details."
            : "Search products, narrow the catalog by category or brand, then review the available buying routes."),
      primaryCtaLabel: "Open the research guide",
      primaryCtaHref: "/site-guide",
      brandTitle: `Brands in ${guide.title}.`,
      brandDescription:
        "Browse current brand pages, review visible product counts and continue into the catalog.",
    },
  };
}

interface TenantRequestHeaders {
  get(name: string): string | null;
}

function firstForwardedHost(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

/**
 * Resolves an IndexFinds-owned subsite without changing routing or rendering.
 * This is the shared entry point for later tenant-specific metadata and UI.
 */
export function getTenantConfigByHost(
  value: string | null | undefined,
): TenantConfig | null {
  const guide = getSubsiteGuideByDomain(value);
  if (!guide) return null;

  return {
    ...guide,
    canonicalOrigin: `https://${guide.domain}`,
    branding: TENANT_BRANDING[guide.domain] || buildDraftBranding(guide),
  };
}

export function resolveTenantFromHeaders(
  headers: TenantRequestHeaders,
  localFallbackHost?: string,
): TenantConfig | null {
  const host =
    firstForwardedHost(headers.get("x-forwarded-host")) || headers.get("host");
  return getTenantConfigByHost(host) || getTenantConfigByHost(localFallbackHost);
}

export function isTenantLocaleIndexable(
  tenant: TenantConfig,
  locale: string,
): boolean {
  return tenant.branding?.indexing === "ready" && locale === "en";
}
