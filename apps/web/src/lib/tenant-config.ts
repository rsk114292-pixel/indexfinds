import {
  getSubsiteGuideByDomain,
  type SubsiteGuideDefinition,
} from "./subsite-guides";
import { getAgentPlatform } from "./agent-platforms";
import { getOfficialPlatformLogo } from "./platform-logo-assets";
import { getTenantEditorialProfile } from "./tenant-editorial-profiles";
import { getSiteName, getSiteUrl } from "./site-config";

export interface TenantConfig extends SubsiteGuideDefinition {
  canonicalOrigin: string;
  branding?: TenantBranding;
}

export interface SiteIdentity {
  tenant: TenantConfig | null;
  siteUrl: string;
  siteName: string;
}

export interface TenantBranding {
  siteName: string;
  wordmark: string;
  logoPath: string;
  showLogo?: boolean;
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
  indexablePaths?: readonly string[];
  editorial: TenantEditorial;
}

export interface TenantEditorial {
  homeVariant: "index" | "catalog" | "guide" | "items" | "archive";
  introTitle: string;
  introDescription: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  brandTitle: string;
  brandDescription: string;
}

const INDEX_READY_TENANT_DOMAINS = new Set([
  "acbuyindex.com",
  "allchinabuyfinder.com",
  "allchinabuyindex.com",
  "bbdbuyeufinds.com",
  "bbdbuyeus.com",
  "bbdbuyeusheet.com",
  "boonbuyfind.net",
  "boonbuyindex.com",
  "cnshopperindex.com",
  "cssbuycatalog.com",
  "cssbuyindex.com",
  "cssbuyitems.com",
  "eastmallbuyindex.com",
  "fishgooindex.com",
  "goatedbuyindex.com",
  "gtbuyindex.com",
  "hipobuyindex.com",
  "hoobuyindex.net",
  "itaobuyindex.com",
  "joyabuyfinds.com",
  "joyagooindex.com",
  "kakobuyindex.net",
  "kakobuyitems.com",
  "kameymallindex.com",
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
  "usfansindex.net",
  "ydaexpress.net",
  "ydaexpress.org",
  "yoybuyindex.com",
]);

export function isTenantReleasedForIndexing(tenant: TenantConfig): boolean {
  return (
    tenant.branding?.indexing === "ready" &&
    INDEX_READY_TENANT_DOMAINS.has(tenant.domain)
  );
}

export function getTenantFaviconAttributes(faviconPath: string): {
  type: "image/svg+xml" | "image/png" | "image/x-icon";
  sizes: string;
} {
  const type = faviconPath.endsWith(".svg")
    ? "image/svg+xml"
    : faviconPath.endsWith(".png")
      ? "image/png"
      : "image/x-icon";
  const pngSize = faviconPath.match(/favicon-(\d+)(?:x(\d+))?\.png$/);
  const knownPngSize =
    faviconPath === "/images/agents/usfans.png" ? "48x48" : null;
  const sizes = pngSize
    ? `${pngSize[1]}x${pngSize[2] || pngSize[1]}`
    : knownPngSize || "any";

  return { type, sizes };
}

const TENANT_BRANDING: Partial<Record<string, TenantBranding>> = {
  "acbuyindex.com": {
    siteName: "ACBuy Index",
    wordmark: "ACBuy Index",
    logoPath: "/images/agents/acbuy.ico",
    faviconPath: "/tenants/acbuy/favicon-128.png",
    themeColor: "#0b2d3a",
    primaryColor: "#087c68",
    primaryHoverColor: "#065f52",
    accentColor: "#31b38c",
    seoTitle: "ACBuy Product Index | Search and Compare Listings",
    description:
      "Search ACBuy-linked products by keyword, category or brand. Review visible listing details and build a focused shortlist before choosing a buying route.",
    heroEyebrow: "ACBuy search index",
    heroPrimary: "Find ACBuy-linked products.",
    heroSecondary: "Shortlist before you buy.",
    supportingLine:
      "Search current listings, review source details and keep only the products worth comparing.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/directory",
      "/platform-guide",
      "/category-research",
      "/safety-research",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Turn a broad catalog into a focused shortlist.",
      introDescription:
        "Search with a precise phrase, remove weak matches and review the source fields that matter before opening an external route.",
      primaryCtaLabel: "Read the ACBuy workflow guide",
      primaryCtaHref: "/platform-guide",
      brandTitle: "Browse brands in the ACBuy index.",
      brandDescription:
        "Use live brand pages to narrow the catalog, compare product counts and continue into specific listings.",
    },
  },
  "allchinabuyindex.com": {
    siteName: "AllChinaBuy Index",
    wordmark: "AllChinaBuy Index",
    logoPath: "/tenants/allchinabuy/favicon-48x48.png",
    faviconPath: "/tenants/allchinabuy/favicon-48x48.png",
    themeColor: "#123c50",
    primaryColor: "#0f9276",
    primaryHoverColor: "#08725e",
    accentColor: "#31b38c",
    seoTitle: "AllChinaBuy Product Index | Search and Compare Listings",
    description:
      "Search AllChinaBuy-linked products by keyword, brand or category. Compare visible listing fields and keep a practical review checklist before continuing.",
    heroEyebrow: "AllChinaBuy product directory",
    heroPrimary: "Search the AllChinaBuy index.",
    heroSecondary: "Compare with a clear checklist.",
    supportingLine:
      "Start with a focused query, compare current listing details and confirm external terms before choosing a route.",
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
    editorial: {
      homeVariant: "index",
      introTitle: "Research the catalog in a repeatable order.",
      introDescription:
        "Move from a specific query to brand and category pages, then review the source fields that remain important outside the catalog.",
      primaryCtaLabel: "Open the AllChinaBuy index guide",
      primaryCtaHref: "/guide",
      brandTitle: "Navigate the AllChinaBuy-linked brand index.",
      brandDescription:
        "Use brand pages as a structured checkpoint between broad product searches and individual listing review.",
    },
  },
  "allchinabuyfinder.com": {
    siteName: "AllChinaBuy Finder",
    wordmark: "AllChinaBuy Finder",
    logoPath: "/tenants/allchinabuyfinder/favicon-48x48.png",
    faviconPath: "/tenants/allchinabuyfinder/favicon-48x48.png",
    themeColor: "#102f42",
    primaryColor: "#0f806d",
    primaryHoverColor: "#0a6759",
    accentColor: "#f2bb73",
    seoTitle: "AllChinaBuy Finder | Browse Categories and Build Better Queries",
    description:
      "Browse AllChinaBuy-linked categories, turn a product idea into a focused query and review visible listing details before opening an external source.",
    heroEyebrow: "AllChinaBuy category finder",
    heroPrimary: "Start with a product direction.",
    heroSecondary: "Build a query worth checking.",
    supportingLine:
      "Move from a broad category to a specific phrase, then verify images, options and current source details before continuing.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/finder-guide",
      "/search-ideas",
      "/product-checklist",
      "/faq",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Turn category browsing into a useful search plan.",
      introDescription:
        "Choose a product group first, add the detail that separates strong matches, then confirm the current information at the linked source.",
      primaryCtaLabel: "Open the AllChinaBuy finder guide",
      primaryCtaHref: "/finder-guide",
      brandTitle: "Use brands after the category is clear.",
      brandDescription:
        "Treat the brand index as a second filter after you have narrowed the product type and the listing fields you need to compare.",
    },
  },
  "bbdbuyeufinds.com": {
    siteName: "BBDbuy EU Finds",
    wordmark: "BBDbuy EU Finds",
    logoPath: "/tenants/bbdbuyeufinds/favicon-48x48.png",
    faviconPath: "/tenants/bbdbuyeufinds/favicon-48x48.png",
    themeColor: "#10243a",
    primaryColor: "#2376b9",
    primaryHoverColor: "#195d94",
    accentColor: "#8fdcf4",
    seoTitle: "BBDbuy EU Finds | Browse Products with Destination Context",
    description:
      "Browse BBDbuy-linked categories and listings with EU sizing, compatibility and destination questions kept beside the product research.",
    heroEyebrow: "Independent EU discovery guide",
    heroPrimary: "Start with the category, not the route.",
    heroSecondary: "Keep EU questions beside every find.",
    supportingLine:
      "Narrow the product type, record sizing or compatibility needs and confirm destination-specific terms outside the catalog.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/eu-finds",
      "/eu-guide",
      "/qc-checklist",
      "/shipping-planner",
      "/faq",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Build an EU-ready research brief before comparing listings.",
      introDescription:
        "Choose a category, add the sizing, plug or material detail that matters and keep destination restrictions separate from product claims.",
      primaryCtaLabel: "Read the BBDbuy EU discovery guide",
      primaryCtaHref: "/eu-finds",
      brandTitle: "Use brands as a second layer after the product type.",
      brandDescription:
        "Brand pages can organize alternatives once the category and regional requirements are clear, while current route terms remain an external check.",
    },
  },
  "bbdbuyeus.com": {
    siteName: "BBDbuy US Guide",
    wordmark: "BBDbuy US Guide",
    logoPath: "/tenants/bbdbuyeus/favicon-48x48.png",
    faviconPath: "/tenants/bbdbuyeus/favicon-48x48.png",
    themeColor: "#111b29",
    primaryColor: "#e98305",
    primaryHoverColor: "#c96e00",
    accentColor: "#ffbd73",
    seoTitle: "BBDbuy US Guide | Product Search and Parcel Planning",
    description:
      "Search BBDbuy-linked products first, then separate listing prices from warehouse measurements, route rules and destination costs for a US-bound parcel.",
    heroEyebrow: "Independent US planning guide",
    heroPrimary: "Research the item before the route.",
    heroSecondary: "Plan the US parcel with real measurements.",
    supportingLine:
      "Build the product shortlist first, then use warehouse weight, dimensions and current platform terms for the parcel decision.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/search-guide",
      "/order-workflow",
      "/parcel-checklist",
      "/us-shipping",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Keep product discovery and parcel planning in the right order.",
      introDescription:
        "Compare listing evidence before purchase, then move to warehouse measurements and current US route information without treating the catalog price as a landed cost.",
      primaryCtaLabel: "Read the BBDbuy US research guide",
      primaryCtaHref: "/search-guide",
      brandTitle: "Use brands to organize the shortlist, not estimate shipping.",
      brandDescription:
        "Brand pages can group comparable products, while parcel weight, dimensions, restrictions and current route terms still require separate confirmation.",
    },
  },
  "bbdbuyeusheet.com": {
    siteName: "BBDbuy EU Sheet",
    wordmark: "BBDbuy EU Sheet",
    logoPath: "/tenants/bbdbuyeusheet/favicon-48x48.png",
    faviconPath: "/tenants/bbdbuyeusheet/favicon-48x48.png",
    themeColor: "#251d15",
    primaryColor: "#b87518",
    primaryHoverColor: "#915a10",
    accentColor: "#f6cd78",
    seoTitle: "BBDbuy EU Sheet | Product Research Directory and Checklist",
    description:
      "Use a compact BBDbuy EU sheet structure to search listings, record exact variants, preserve source links and keep missing product fields visible.",
    heroEyebrow: "Independent EU sheet directory",
    heroPrimary: "Turn every result into one useful row.",
    heroSecondary: "Keep the source beside the claim.",
    supportingLine:
      "Record the exact variant, visible evidence and open question without filling incomplete fields with seller language or assumptions.",
    indexing: "ready",
    indexablePaths: ["", "/categories", "/eu-sheet", "/checklist", "/faq"],
    editorial: {
      homeVariant: "guide",
      introTitle: "Use a small field set that is easy to verify.",
      introDescription:
        "Keep the source URL, selected variant, visible evidence and unanswered question together so each shortlist row has a clear reason to exist.",
      primaryCtaLabel: "Read the BBDbuy EU sheet guide",
      primaryCtaHref: "/eu-sheet",
      brandTitle: "Group rows by brand only after the fields are complete.",
      brandDescription:
        "Brand pages can help organize a finished shortlist, but they do not replace the source, option and evidence fields attached to each item.",
    },
  },
  "boonbuyfind.net": {
    siteName: "BoonBuy Find",
    wordmark: "BoonBuy",
    logoPath: "/images/agents/boonbuy.png",
    faviconPath: "/images/agents/boonbuy.png",
    themeColor: "#20150d",
    primaryColor: "#f27616",
    primaryHoverColor: "#d85d08",
    accentColor: "#71e3dc",
    seoTitle: "BoonBuy Product Finder | Search and Review Listing Evidence",
    description:
      "Search BoonBuy-linked products by category or keyword, record visible listing evidence and keep source checks separate from platform decisions.",
    heroEyebrow: "Independent BoonBuy discovery guide",
    heroPrimary: "Find the item. Keep the evidence.",
    heroSecondary: "Verify before the handoff.",
    supportingLine:
      "Start with a focused query, save the source details you can see and carry unanswered questions into the next step.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/search-guide",
      "/product-checklist",
      "/platform-guide",
      "/faq",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Turn product discovery into a usable source note.",
      introDescription:
        "Record the exact variant, visible measurements, images and original source instead of treating a result title as a complete product record.",
      primaryCtaLabel: "Read the BoonBuy research guide",
      primaryCtaHref: "/search-guide",
      brandTitle: "Use brand pages to narrow the search, not settle the evidence.",
      brandDescription:
        "A brand filter can reduce the result set, while the product page and current source remain responsible for the details you compare.",
    },
  },
  "boonbuyindex.com": {
    siteName: "BoonBuy Index",
    wordmark: "BoonBuy",
    logoPath: "/images/agents/boonbuy.png",
    faviconPath: "/images/agents/boonbuy.png",
    themeColor: "#061711",
    primaryColor: "#168f5e",
    primaryHoverColor: "#0f7049",
    accentColor: "#6ce0af",
    seoTitle: "BoonBuy Spreadsheet & Product Index | Search Guide",
    description:
      "Search the independent BoonBuy spreadsheet and product index, group duplicate links, and review each source, option and unresolved field before retaining a result.",
    heroEyebrow: "Independent BoonBuy spreadsheet and query index",
    heroPrimary: "Keep the query beside every result.",
    heroSecondary: "Index evidence, not assumptions.",
    supportingLine:
      "Record the search intent, source URL, exact option and unresolved field before a result enters the reviewed index.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/boonbuy-products",
      "/query-method",
      "/source-checklist",
      "/route-boundaries",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Turn repeated search results into a smaller evidence index.",
      introDescription:
        "Keep one representative result per source and option, record why it matches the query and leave incomplete fields visible for the next review.",
      primaryCtaLabel: "Read the BoonBuy index method",
      primaryCtaHref: "/query-method",
      brandTitle: "Use brands as query context, not product proof.",
      brandDescription:
        "Brand pages can narrow the result set, while the current source, exact option and visible product fields determine whether a row is retained.",
    },
  },
  "cnshopperindex.com": {
    siteName: "CNShopper Index",
    wordmark: "CNShopper",
    logoPath: "/images/agents/cnshopper.png",
    faviconPath: "/images/agents/cnshopper-favicon.png",
    themeColor: "#071a39",
    primaryColor: "#f36a0a",
    primaryHoverColor: "#d95500",
    accentColor: "#ffb25f",
    seoTitle: "CNShopper Product Index | Search, Compare and Check the Source",
    description:
      "Browse CNShopper-linked categories, build a focused product shortlist and keep listing evidence separate from current order, warehouse and parcel decisions.",
    heroEyebrow: "Independent CNShopper catalog guide",
    heroPrimary: "Find the product before you open the cart.",
    heroSecondary: "Keep every handoff easy to verify.",
    supportingLine:
      "Move from category to listing, record the exact option and source, then confirm current order and parcel terms outside the catalog.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/cnshopper-products",
      "/category-map",
      "/source-checklist",
      "/order-handoff",
      "/faq",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Browse broadly, then finish with a precise source checklist.",
      introDescription:
        "Choose a category, narrow the listing and preserve the option, source and open questions that still matter when the product leaves the catalog.",
      primaryCtaLabel: "Read the CNShopper category method",
      primaryCtaHref: "/category-map",
      brandTitle: "Use brand pages after the product type is clear.",
      brandDescription:
        "Brand paths can organize comparable listings, while the selected option, source evidence and current external terms remain separate checks.",
    },
  },
  "ydaexpress.net": {
    siteName: "YDA Parcel Guide",
    wordmark: "YDA Parcel Guide",
    logoPath: "/tenants/ydaexpress-net/favicon.svg",
    showLogo: false,
    faviconPath: "/tenants/ydaexpress-net/favicon.svg",
    themeColor: "#082c34",
    primaryColor: "#087f73",
    primaryHoverColor: "#05665d",
    accentColor: "#6bd7c7",
    seoTitle: "YDA Express Parcel Forwarding Guide | Warehouse Checklist",
    description:
      "Use an independent YDA Express parcel forwarding guide to prepare warehouse, consolidation, dimensions, contents, restrictions and tracking questions before choosing a route.",
    heroEyebrow: "Independent YDA Express parcel preparation guide",
    heroPrimary: "Prepare the parcel record before comparing a route.",
    heroSecondary: "Contents. Measurements. Restrictions. Handoff.",
    supportingLine:
      "Build a dated warehouse and consolidation checklist, then confirm current service availability, quotes and restrictions on ydaexpress.com.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/parcel-brief",
      "/warehouse-checklist",
      "/consolidation-planner",
      "/tracking-handoff",
      "/faq",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Turn warehouse facts into a route-ready parcel brief.",
      introDescription:
        "Record what arrived, how items should be combined, the measured parcel inputs and unresolved destination questions without turning estimates into delivery promises.",
      primaryCtaLabel: "Build the parcel brief",
      primaryCtaHref: "/parcel-brief",
      brandTitle: "Use product categories to identify parcel-sensitive contents.",
      brandDescription:
        "Batteries, liquids, fragile goods, branded items and unusual dimensions may require different evidence and current route checks before consolidation.",
    },
  },
  "ydaexpress.org": {
    siteName: "YDA Source Review",
    wordmark: "YDA Source Review",
    logoPath: "/tenants/ydaexpress-org/favicon.svg",
    showLogo: false,
    faviconPath: "/tenants/ydaexpress-org/favicon.svg",
    themeColor: "#221b16",
    primaryColor: "#c96128",
    primaryHoverColor: "#a84c1c",
    accentColor: "#efb06f",
    seoTitle: "YDA Express Service Review | Terms, Quotes and Source Checks",
    description:
      "Use an independent YDA Express service review to separate shopping-agent, warehouse, forwarding, quote and tracking evidence before relying on changing service terms.",
    heroEyebrow: "Independent YDA Express source review",
    heroPrimary: "Match every service claim to a current source.",
    heroSecondary: "Separate published facts from open questions.",
    supportingLine:
      "Review the official service pages, terms, quote inputs and tracking handoff separately; preserve the date and source for every decision.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/service-map",
      "/terms-checklist",
      "/shopping-agent-vs-forwarding",
      "/quote-evidence",
      "/faq",
    ],
    editorial: {
      homeVariant: "archive",
      introTitle: "Keep service evidence attached to the stage it describes.",
      introDescription:
        "Shopping assistance, warehouse handling, parcel forwarding, quotes and carrier events answer different questions and can change on different dates.",
      primaryCtaLabel: "Open the service evidence map",
      primaryCtaHref: "/service-map",
      brandTitle: "Treat marketplace names as workflow context, not endorsements.",
      brandDescription:
        "Published support for marketplace links describes a service entry point; seller claims, product facts and later parcel terms still require separate current evidence.",
    },
  },
  "eastmallbuyindex.com": {
    siteName: "EastMallBuy Index",
    wordmark: "EastMallBuy",
    logoPath: "/images/agents/eastmallbuy.png",
    faviconPath: "/images/agents/eastmallbuy.png",
    themeColor: "#0d2d4a",
    primaryColor: "#137f8f",
    primaryHoverColor: "#0d6572",
    accentColor: "#f4c675",
    seoTitle: "EastMallBuy Product Index | Build a Verified Shortlist",
    description:
      "Search EastMallBuy-linked listings, remove incomplete results and keep a focused shortlist with source status and open questions visible.",
    heroEyebrow: "Independent EastMallBuy shortlist guide",
    heroPrimary: "Keep the listings that answer the next question.",
    heroSecondary: "Drop weak results before route research.",
    supportingLine:
      "Check whether the source is open, the option is identifiable and the evidence is sufficient before a listing reaches the final comparison.",
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
    editorial: {
      homeVariant: "index",
      introTitle: "Use one pass to separate usable results from dead ends.",
      introDescription:
        "Keep complete listings, mark unresolved questions and remove results whose source or selected option cannot support a meaningful comparison.",
      primaryCtaLabel: "Read the EastMallBuy checking guide",
      primaryCtaHref: "/guide",
      brandTitle: "Review brands only inside a clean result set.",
      brandDescription:
        "Brand pages become useful after incomplete listings have been removed and each remaining item has a source, option and reason to stay.",
    },
  },
  "fishgooindex.com": {
    siteName: "Fishgoo Index",
    wordmark: "Fishgoo",
    logoPath: "/images/agents/fishgoo.ico",
    faviconPath: "/images/agents/fishgoo.ico",
    themeColor: "#061326",
    primaryColor: "#3289b8",
    primaryHoverColor: "#246b92",
    accentColor: "#8fdcf1",
    seoTitle: "Fishgoo Product Index | Search by Intent and Compare Evidence",
    description:
      "Search Fishgoo-linked listings by category, exact query or visual intent, then compare only results with enough visible product evidence.",
    heroEyebrow: "Independent Fishgoo product-intent guide",
    heroPrimary: "Choose the search mode before the product.",
    heroSecondary: "Explore broadly. Verify precisely.",
    supportingLine:
      "Use category browsing for discovery, exact queries for known items and image search when visual details carry the intent.",
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
    editorial: {
      homeVariant: "catalog",
      introTitle: "Match the search method to what you already know.",
      introDescription:
        "Start broad when the category is unclear, use exact terms when the item is known and preserve visible listing evidence before comparing a source.",
      primaryCtaLabel: "Read the Fishgoo spreadsheet guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brand pages as a search lens, not a final answer.",
      brandDescription:
        "Brand filters can narrow discovery, while the exact item, selected option, source status and current external terms still require separate verification.",
    },
  },
  "goatedbuyindex.com": {
    siteName: "GoatedBuy Index",
    wordmark: "GoatedBuy",
    logoPath: "/images/agents/goatedbuy.svg",
    faviconPath: "/images/agents/goatedbuy.svg",
    themeColor: "#102219",
    primaryColor: "#b63d4c",
    primaryHoverColor: "#912f3b",
    accentColor: "#f4d38a",
    seoTitle: "GoatedBuy Product Index | Independent Listings & Safety Guide",
    description:
      "Review independent GoatedBuy-linked listings, score visible evidence, remove duplicate results, and keep product research separate from safety and buying-route checks.",
    heroEyebrow: "Independent GoatedBuy shortlist and safety guide",
    heroPrimary: "Make every result earn its place.",
    heroSecondary: "Score relevance before route research.",
    supportingLine:
      "Keep a listing only when the product match, visible details and reason to remain in the shortlist are clear enough to compare.",
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
    editorial: {
      homeVariant: "guide",
      introTitle: "Build a smaller list with stronger reasons to stay.",
      introDescription:
        "Check the product match, record visible details and remove near-duplicates before shipping, service or destination questions enter the comparison.",
      primaryCtaLabel: "Read the GoatedBuy scoring guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brand pages to organize candidates before scoring them.",
      brandDescription:
        "A brand path can reduce noise, but each listing still needs a relevant match, enough visible evidence and a distinct reason to remain in the shortlist.",
    },
  },
  "gtbuyindex.com": {
    siteName: "GTBuy Index",
    wordmark: "GTBuy",
    logoPath: "/images/agents/gtbuy.png",
    faviconPath: "/images/agents/gtbuy.png",
    themeColor: "#071322",
    primaryColor: "#e96f32",
    primaryHoverColor: "#c45522",
    accentColor: "#ffb07d",
    seoTitle: "GTBuy Product Index | Search, Inspect and Record Sources",
    description:
      "Search GTBuy-linked listings, inspect visible product details and preserve the source context needed for a traceable comparison.",
    heroEyebrow: "Independent GTBuy product research index",
    heroPrimary: "Turn a search result into a traceable record.",
    heroSecondary: "Query. Inspect. Keep the source.",
    supportingLine:
      "Use a focused query, review the visible listing fields and record unresolved questions before a product enters your shortlist.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/guide",
      "/categories",
      "/gtbuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Use one compact record for every shortlisted product.",
      introDescription:
        "Keep the query, source link, visible options and missing details together so later comparisons do not lose their original context.",
      primaryCtaLabel: "Read the GTBuy research sequence",
      primaryCtaHref: "/guide",
      brandTitle: "Treat brand pages as filing tools for traceable records.",
      brandDescription:
        "A brand filter can organize results, but the exact product, selected option, source status and unresolved questions still belong in each record.",
    },
  },
  "hipobuyindex.com": {
    siteName: "HipoBuy Index",
    wordmark: "Hipobuy",
    logoPath: "/images/agents/hipobuy.png",
    faviconPath: "/images/agents/hipobuy.png",
    themeColor: "#080f28",
    primaryColor: "#7453cb",
    primaryHoverColor: "#5d3eb2",
    accentColor: "#ec9cff",
    seoTitle: "HipoBuy Product Index | Keep Listing Research Traceable",
    description:
      "Search HipoBuy-linked listings while keeping the marketplace source, visible product fields and unresolved questions connected.",
    heroEyebrow: "Independent HipoBuy source-tracing guide",
    heroPrimary: "Keep the source attached to every decision.",
    heroSecondary: "Trace the listing. Mark what is missing.",
    supportingLine:
      "Preserve the marketplace link, record only visible product facts and label missing option or destination details before comparing a route.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/guide",
      "/categories",
      "/hipobuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Build a source trail that survives every comparison.",
      introDescription:
        "A useful shortlist keeps the original listing, visible fields and open questions together instead of turning incomplete details into assumptions.",
      primaryCtaLabel: "Read the HipoBuy source-tracing guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brand pages without breaking the source trail.",
      brandDescription:
        "Brand filters can organize candidates, while every product still needs its own source link, visible option evidence and clearly marked unknowns.",
    },
  },
  "hoobuyindex.net": {
    siteName: "HooBuy Index",
    wordmark: "HooBuy",
    logoPath: "/images/agents/hoobuy.ico",
    faviconPath: "/images/agents/hoobuy.ico",
    themeColor: "#101722",
    primaryColor: "#ef6c24",
    primaryHoverColor: "#cc5517",
    accentColor: "#ffc86e",
    seoTitle: "HooBuy Product Index | Verify Products Before Comparing Routes",
    description:
      "Search HooBuy-linked listings, verify product and option evidence, then compare buying routes only after the shortlist is stable.",
    heroEyebrow: "Independent HooBuy evidence-first guide",
    heroPrimary: "Stabilize the product shortlist before choosing a route.",
    heroSecondary: "Product evidence first. Route comparison second.",
    supportingLine:
      "Confirm the item, selected option and source status before service, destination or shipping questions enter the comparison.",
    indexing: "ready",
    indexablePaths: [
      "", "/guide", "/categories", "/hoobuy-score", "/search-ideas",
      "/shipping", "/safety", "/faq",
    ],
    editorial: {
      homeVariant: "items",
      introTitle: "Pass every product through the evidence gate.",
      introDescription:
        "Keep listings whose item, option and source can be identified; hold incomplete records outside the route comparison until the missing evidence is resolved.",
      primaryCtaLabel: "Read the HooBuy evidence-first guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brand pages only after the evidence gate.",
      brandDescription:
        "A brand name can group products, but it does not replace an identifiable item, visible option evidence or a working source record.",
    },
  },
  "joyabuyfinds.com": {
    siteName: "JoyaGoo Finds",
    wordmark: "JoyaGoo",
    logoPath: "/images/agents/joyagoo.png",
    faviconPath: "/images/agents/joyagoo-favicon.png",
    themeColor: "#170b2d",
    primaryColor: "#e05a88",
    primaryHoverColor: "#bd3f6c",
    accentColor: "#80ddcf",
    seoTitle: "JoyaGoo Finds | Explore Categories and Verify Product Sources",
    description:
      "Explore JoyaGoo-linked finds by category and visual intent, then preserve the source, exact option and product-specific evidence before keeping a candidate.",
    heroEyebrow: "Independent JoyaGoo discovery guide",
    heroPrimary: "Explore broadly without losing the source.",
    heroSecondary: "Discover first. Verify before keeping.",
    supportingLine:
      "Use categories and visual clues to find candidates, then retain only listings with a traceable source, identifiable option and clear next check.",
    indexing: "ready",
    indexablePaths: [
      "", "/guide", "/categories", "/joyagoo-score", "/search-ideas",
      "/shipping", "/safety", "/faq",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Turn open-ended browsing into a product-specific source note.",
      introDescription:
        "Keep the discovery context, final source, intended option and unresolved evidence together instead of presenting a candidate find as a verified choice.",
      primaryCtaLabel: "Read the JoyaGoo discovery guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brand paths to continue discovery, not settle the decision.",
      brandDescription:
        "Brand and category filters can surface candidates while the current product source remains responsible for option, price and seller details.",
    },
  },
  "joyagooindex.com": {
    siteName: "JoyaGoo Index",
    wordmark: "JoyaGoo",
    logoPath: "/images/agents/joyagoo.png",
    faviconPath: "/images/agents/joyagoo-favicon.png",
    themeColor: "#071529",
    primaryColor: "#3a8ec9",
    primaryHoverColor: "#2b70a2",
    accentColor: "#f0c15b",
    seoTitle: "JoyaGoo Product Index | Track Source, QC and Parcel Stages",
    description:
      "Search JoyaGoo-linked products and keep source, option, order, QC, warehouse and parcel evidence in separate dated stages.",
    heroEyebrow: "Independent JoyaGoo process index",
    heroPrimary: "Track the product through each evidence stage.",
    heroSecondary: "Source. Option. QC. Parcel.",
    supportingLine:
      "Use exact queries for discovery, then keep seller claims, warehouse checks and route records separated as the item moves forward.",
    indexing: "ready",
    indexablePaths: [
      "", "/guide", "/categories", "/joyagoo-score", "/search-ideas",
      "/shipping", "/safety", "/faq",
    ],
    editorial: {
      homeVariant: "archive",
      introTitle: "Build a dated record for every handoff.",
      introDescription:
        "The product source, order state, QC evidence and parcel record can change at different times; preserve each layer without collapsing them into one claim.",
      primaryCtaLabel: "Read the JoyaGoo process guide",
      primaryCtaHref: "/guide",
      brandTitle: "Group products after the evidence stage is clear.",
      brandDescription:
        "Brand pages organize records, but every item still needs its own source, option, QC status and next action.",
    },
  },
  "kameymallindex.com": {
    siteName: "KameyMall Index",
    wordmark: "KameyMall",
    logoPath: "/images/agents/kameymall.png",
    faviconPath: "/images/agents/kameymall.png",
    themeColor: "#1f0d24",
    primaryColor: "#b64177",
    primaryHoverColor: "#91325f",
    accentColor: "#f6c44a",
    seoTitle: "KameyMall Product Index | Category Search and Evidence Reviews",
    description:
      "Move from KameyMall-linked categories to exact product queries, then review the current source, option, QC evidence and parcel inputs.",
    heroEyebrow: "Independent KameyMall category guide",
    heroPrimary: "Start with the category. Finish with the evidence.",
    heroSecondary: "Browse broadly. Review one product precisely.",
    supportingLine:
      "Use category context to learn which fields matter, then switch to a traceable product record before comparing warehouse or shipping decisions.",
    indexing: "ready",
    indexablePaths: [
      "", "/guide", "/categories", "/review", "/search-ideas",
      "/shipping", "/safety", "/faq",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Move from orientation to a product-specific review.",
      introDescription:
        "Categories reveal the relevant measurements, specifications and QC views; the current source and exact option complete the record.",
      primaryCtaLabel: "Read the KameyMall category guide",
      primaryCtaHref: "/guide",
      brandTitle: "Browse brand and category pages as an orientation layer.",
      brandDescription:
        "Use them to learn the catalog, then preserve the exact source and evidence needed for a final shortlist.",
    },
  },
  "yoybuyindex.com": {
    siteName: "YoyBuy Spreadsheet",
    wordmark: "YoyBuy",
    logoPath: "/images/agents/yoybuy.ico",
    faviconPath: "/images/agents/yoybuy.ico",
    themeColor: "#081321",
    primaryColor: "#d8752d",
    primaryHoverColor: "#b85d1d",
    accentColor: "#f0b45d",
    seoTitle: "YoyBuy Spreadsheet Guide | Source, QC and Shipping Checks",
    description:
      "Use a YoyBuy spreadsheet to preserve the current product source, exact option, QC questions and actual parcel inputs before choosing a route.",
    heroEyebrow: "Independent YoyBuy spreadsheet guide",
    heroPrimary: "Read the row before opening the route.",
    heroSecondary: "Source. Option. QC. Packed weight.",
    supportingLine:
      "Turn a candidate link into a dated research row, then reopen the source and verify each product and parcel field at the stage where it becomes available.",
    indexing: "ready",
    indexablePaths: [
      "", "/spreadsheet", "/categories", "/qc-checklist", "/search-ideas",
      "/shipping", "/safety", "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Use the spreadsheet as a handoff record, not a verdict.",
      introDescription:
        "A useful row preserves the current source, requested option, visible evidence, missing answers and later parcel measurements without merging them into one claim.",
      primaryCtaLabel: "Open the YoyBuy spreadsheet method",
      primaryCtaHref: "/spreadsheet",
      brandTitle: "Use categories to define the fields each product needs.",
      brandDescription:
        "Clothing measurements, bag construction and electronics compatibility require different checks before a candidate becomes a reviewed record.",
    },
  },
  "cssbuyindex.com": {
    siteName: "CSSBuy Index",
    wordmark: "CSSBuy",
    logoPath: "/tenants/cssbuy/favicon-48x48.png",
    faviconPath: "/tenants/cssbuy/favicon-48x48.png",
    themeColor: "#010c09",
    primaryColor: "#477b18",
    primaryHoverColor: "#355e11",
    accentColor: "#77c430",
    seoTitle: "CSSBuy Product Index | Search and Review Listings",
    description:
      "Search CSSBuy-linked listings with a precise query. Review visible product fields and keep source, availability and destination checks separate.",
    heroEyebrow: "CSSBuy query index",
    heroPrimary: "Search with a precise product phrase.",
    heroSecondary: "Review the fields before the route.",
    supportingLine:
      "Use a focused query, compare visible listing information and confirm missing details at the original source.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/cssbuy-score",
      "/guide",
      "/forwarding",
      "/safety",
      "/search-ideas",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Make the query do the first round of filtering.",
      introDescription:
        "Begin with a specific product or brand phrase, remove weak matches and keep availability and destination checks outside the catalog price.",
      primaryCtaLabel: "Read the CSSBuy query guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use the CSSBuy-linked brand index as a second filter.",
      brandDescription:
        "Move from a precise query into brand pages when the first result set still needs a narrower comparison.",
    },
  },
  "cssbuycatalog.com": {
    siteName: "CSSBuy Catalog",
    wordmark: "CSSBuy",
    logoPath: "/tenants/cssbuycatalog/favicon-48x48.png",
    faviconPath: "/tenants/cssbuycatalog/favicon-48x48.png",
    themeColor: "#041424",
    primaryColor: "#0b718e",
    primaryHoverColor: "#07586f",
    accentColor: "#f0b05d",
    seoTitle: "CSSBuy Catalog | Browse Product Categories and Listings",
    description:
      "Browse CSSBuy-linked product categories, compare visible listing fields and confirm current details at the original source before choosing a route.",
    heroEyebrow: "CSSBuy category catalog",
    heroPrimary: "Browse by product type.",
    heroSecondary: "Compare the details that matter.",
    supportingLine:
      "Open a category, narrow the visible listings and keep specifications, availability and source checks attached to the product you review.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/spreadsheet",
      "/guide",
      "/forwarding",
      "/usa",
      "/safety",
      "/faq",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Use categories as the first comparison boundary.",
      introDescription:
        "Group similar listings before comparing price, images and product fields, then confirm anything that can change at the original source.",
      primaryCtaLabel: "Read the CSSBuy catalog guide",
      primaryCtaHref: "/guide",
      brandTitle: "Add a brand filter only when it helps.",
      brandDescription:
        "After the product type is clear, use the brand index to narrow the remaining listings without treating a label as proof of a product claim.",
    },
  },
  "cssbuyitems.com": {
    siteName: "CSSBuy Items",
    wordmark: "CSSBuy",
    logoPath: "/tenants/cssbuyitems/favicon-48x48.png",
    faviconPath: "/tenants/cssbuyitems/favicon-48x48.png",
    themeColor: "#102315",
    primaryColor: "#477b18",
    primaryHoverColor: "#355e11",
    accentColor: "#a9e47a",
    seoTitle: "CSSBuy Items | Review Listings and Product Options",
    description:
      "Review CSSBuy-linked item pages, compare visible options and confirm current price, stock and source details before choosing an external route.",
    heroEyebrow: "CSSBuy item review",
    heroPrimary: "Review individual CSSBuy-linked items.",
    heroSecondary: "Inspect the listing before the route.",
    supportingLine:
      "Compare visible options, images and source status before opening an external buying route.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/cssbuy-score",
      "/guide",
      "/safety",
      "/search-ideas",
      "/shipping",
      "/faq",
    ],
    editorial: {
      homeVariant: "items",
      introTitle: "Start with the listing, not the route.",
      introDescription:
        "Check images, options, source availability and missing fields before deciding whether an item is ready for deeper comparison.",
      primaryCtaLabel: "Read the CSSBuy item checklist",
      primaryCtaHref: "/cssbuy-score",
      brandTitle: "Use the brand index after the item type is clear.",
      brandDescription:
        "Keep the item page as the main evidence, then use brand pages only when they help compare similar listings.",
    },
  },
  "kakobuyindex.net": {
    siteName: "Kakobuy Index",
    wordmark: "Kakobuy",
    logoPath: "/tenants/kakobuyindex/official-app-icon.png",
    faviconPath: "/tenants/kakobuyindex/official-app-icon.png",
    themeColor: "#080d1e",
    primaryColor: "#ff334e",
    primaryHoverColor: "#df203c",
    accentColor: "#7d8cff",
    seoTitle: "Kakobuy Spreadsheet Index | Build a Verified Shortlist",
    description:
      "Search Kakobuy-linked listings, remove duplicates and weak matches, and keep a dated shortlist with current source, option and evidence checks.",
    heroEyebrow: "Independent Kakobuy shortlist index",
    heroPrimary: "Search broadly. Keep selectively.",
    heroSecondary: "Every shortlisted link needs a reason.",
    supportingLine:
      "Record the query, remove duplicate or incomplete listings and preserve the current source evidence behind every retained result.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/guide",
      "/kakobuy-score",
      "/safety",
      "/search-ideas",
      "/shipping",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Reduce the catalog to a defensible shortlist.",
      introDescription:
        "Start with a precise query, group duplicate candidates and retain only listings whose source, intended option and visible evidence can be reviewed again.",
      primaryCtaLabel: "Open the Kakobuy shortlist method",
      primaryCtaHref: "/guide",
      brandTitle: "Use brand pages to group candidates, not verify them.",
      brandDescription:
        "Brand labels can organize a result set, but the current source page and item evidence determine whether a listing remains shortlisted.",
    },
  },
  "kakobuyitems.com": {
    siteName: "Kakobuy Items",
    wordmark: "Kakobuy",
    logoPath: "/tenants/kakobuyindex/official-app-icon.png",
    faviconPath: "/tenants/kakobuyindex/official-app-icon.png",
    themeColor: "#071523",
    primaryColor: "#ff4869",
    primaryHoverColor: "#df3154",
    accentColor: "#ffb2c0",
    seoTitle: "Kakobuy Items | Inspect Product Evidence and Options",
    description:
      "Review Kakobuy-linked product pages, compare visible options and confirm current price, availability and source details before choosing an external route.",
    heroEyebrow: "Kakobuy item evidence",
    heroPrimary: "Review the item before the route.",
    heroSecondary: "Keep the evidence attached.",
    supportingLine:
      "Compare visible photos, options and source status before deciding whether a listing is ready for the next step.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/guide",
      "/kakobuy-score",
      "/safety",
      "/search-ideas",
      "/shipping",
      "/faq",
    ],
    editorial: {
      homeVariant: "items",
      introTitle: "Build the comparison around one product page.",
      introDescription:
        "Check the visible product evidence first, record missing fields and only then compare categories, brands or external buying routes.",
      primaryCtaLabel: "Read the Kakobuy item checklist",
      primaryCtaHref: "/guide",
      brandTitle: "Use a brand label as a filter, not a conclusion.",
      brandDescription:
        "Keep photos, options, price and source availability tied to the listing even when a brand page helps group similar results.",
    },
  },
  "litbuyindex.com": {
    siteName: "LitBuy Search Index",
    wordmark: "LitBuy",
    logoPath: "/images/agents/litbuy.png",
    faviconPath: "/images/agents/litbuy.png",
    themeColor: "#11100c",
    primaryColor: "#e97800",
    primaryHoverColor: "#c65f00",
    accentColor: "#ffd400",
    seoTitle: "LitBuy Spreadsheet Search Index | Refresh and Shortlist Links",
    description:
      "Search LitBuy spreadsheet links with focused queries, group repeated results and retain only current sources with a clear option and dated review note.",
    heroEyebrow: "Independent LitBuy query index",
    heroPrimary: "Search the LitBuy spreadsheet with a method.",
    heroSecondary: "Refresh, deduplicate and record.",
    supportingLine:
      "Turn broad product searches into a smaller set of current links with a saved query, intended option and reason for retention.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/codes-coupons",
      "/faq",
      "/guide",
      "/safety",
      "/search-ideas",
      "/shipping",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Build an index that can be checked again.",
      introDescription:
        "Save the exact query, group repeated candidates and keep only links whose current source and intended variation remain understandable.",
      primaryCtaLabel: "Open the LitBuy index method",
      primaryCtaHref: "/guide",
      brandTitle: "Use brands to group the result set after the query is clear.",
      brandDescription:
        "A brand page can organize candidates, while the current source, selected option and evidence note decide whether a link stays in the index.",
    },
  },
  "litbuyitems.com": {
    siteName: "LitBuy Items",
    wordmark: "LitBuy",
    logoPath: "/images/agents/litbuy.png",
    faviconPath: "/images/agents/litbuy.png",
    themeColor: "#16130d",
    primaryColor: "#d97706",
    primaryHoverColor: "#b45309",
    accentColor: "#ffd400",
    seoTitle: "LitBuy Item Evidence | Options, Images and Source Checks",
    description:
      "Inspect one LitBuy-linked item at a time, match visible evidence to the intended option and keep missing fields attached to the current source.",
    heroEyebrow: "Independent LitBuy item file",
    heroPrimary: "Match the evidence to the exact option.",
    heroSecondary: "One item. One source-linked record.",
    supportingLine:
      "Record the selected size, color, model or set beside the images, measurements, visible claims and questions that still need confirmation.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/coupons",
      "/faq",
      "/guide",
      "/invitation-code",
      "/safety",
      "/shipping",
    ],
    editorial: {
      homeVariant: "items",
      introTitle: "Keep the intended variation at the center of the file.",
      introDescription:
        "Start with the exact option, then preserve category-specific measurements, images and contradictions without treating seller wording as verified fact.",
      primaryCtaLabel: "Open the LitBuy item-file guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brands only after the option and evidence are linked.",
      brandDescription:
        "A brand label can group alternatives, but the item file must still identify the current source, selected variation and visible evidence for each result.",
    },
  },
  "litbuyproducts.com": {
    siteName: "LitBuy Product Catalog",
    wordmark: "LitBuy",
    logoPath: "/images/agents/litbuy.png",
    faviconPath: "/images/agents/litbuy.png",
    themeColor: "#0d1520",
    primaryColor: "#f08100",
    primaryHoverColor: "#cf6800",
    accentColor: "#29b6f6",
    seoTitle: "LitBuy Product Catalog | Category Paths and Product Discovery",
    description:
      "Browse LitBuy-linked product categories, define the fields that make listings comparable and move from discovery to a current source check.",
    heroEyebrow: "Independent LitBuy category map",
    heroPrimary: "Choose the category before opening the catalog.",
    heroSecondary: "Compare the fields that matter inside it.",
    supportingLine:
      "Use a category-specific route for discovery, then narrow by measurement, material, model or compatibility before comparing listings.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/coupons",
      "/faq",
      "/guide",
      "/invitation-code",
      "/safety",
      "/shipping",
      "/spreadsheet",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Give each product group a useful comparison boundary.",
      introDescription:
        "Start with the product type, add the fields needed for that category and open only listings that can support the same comparison.",
      primaryCtaLabel: "Open the LitBuy catalog guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brands after the category comparison is defined.",
      brandDescription:
        "Brand pages can narrow a product group, while the current source and category-specific evidence remain attached to every result.",
    },
  },
  "loongbuys.net": {
    siteName: "LoongBuy Research Guide",
    wordmark: "LoongBuy",
    logoPath: "/images/agents/loongbuy.ico",
    faviconPath: "/images/agents/loongbuy.ico",
    themeColor: "#17120e",
    primaryColor: "#f26522",
    primaryHoverColor: "#d94f10",
    accentColor: "#ffba52",
    seoTitle: "LoongBuy Guide | Product Links, QC and Parcel Checks",
    description:
      "Review LoongBuy product links in order: selected option, warehouse QC evidence, measured parcel details and current shipping route before making a decision.",
    heroEyebrow: "Independent LoongBuy evidence route",
    heroPrimary: "Follow the product from link to parcel.",
    heroSecondary: "Keep every handoff checkable.",
    supportingLine:
      "Record the chosen option, received-item evidence, parcel measurements and destination-specific route at the stage where each detail becomes available.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/guide",
      "/reviews",
      "/safety",
      "/faq",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Use the next piece of evidence, not an early estimate.",
      introDescription:
        "A seller page can identify the intended option, warehouse records can show what arrived and parcel measurements can support a current route check. Keep those stages separate.",
      primaryCtaLabel: "Open the LoongBuy evidence guide",
      primaryCtaHref: "/guide",
      brandTitle: "Treat a brand term as a search label.",
      brandDescription:
        "The current product source, visible option, received-item evidence and parcel record remain more useful than a brand label when comparing results.",
    },
  },
  "lovegobuyindex.com": {
    siteName: "LoveGoBuy Product Directory",
    wordmark: "LoveGoBuy",
    logoPath: "/images/agents/lovegobuy.ico",
    faviconPath: "/images/agents/lovegobuy.ico",
    themeColor: "#24131f",
    primaryColor: "#d94678",
    primaryHoverColor: "#b92f61",
    accentColor: "#ffb4ce",
    seoTitle: "LoveGoBuy Product Directory | Categories and Order Checks",
    description:
      "Browse LoveGoBuy-linked product categories, compare visible listing fields and use the current order stage to find the check or service action that belongs next.",
    heroEyebrow: "Independent LoveGoBuy order board",
    heroPrimary: "Sort the product first.",
    heroSecondary: "Then follow the current order stage.",
    supportingLine:
      "Keep catalog discovery, source verification, coupon entry and refund questions in separate records so each page answers one current task.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/faq",
      "/guide",
      "/is-lovegobuy-legit",
      "/lovegobuy-coupon-code",
      "/lovegobuy-spreadsheet",
      "/refund-lovegobuy-order",
    ],
    editorial: {
      homeVariant: "catalog",
      introTitle: "Move from a product group to the responsible next step.",
      introDescription:
        "Use category fields to compare listings, then identify whether the open question belongs to the source, the order record, the warehouse stage or the external service destination.",
      primaryCtaLabel: "Open the LoveGoBuy order guide",
      primaryCtaHref: "/guide",
      brandTitle: "Use brands to narrow a category, not to settle the decision.",
      brandDescription:
        "A brand filter can reduce the result set while the exact option, current source and order-stage evidence remain attached to every retained listing.",
    },
  },
  "mulebuyindex.net": {
    siteName: "MuleBuy Spreadsheet Index",
    wordmark: "MuleBuy",
    logoPath: "/images/agents/mulebuy.ico",
    faviconPath: "/images/agents/mulebuy.ico",
    themeColor: "#161022",
    primaryColor: "#7b2fc7",
    primaryHoverColor: "#6221a5",
    accentColor: "#d6a8ff",
    seoTitle: "MuleBuy Spreadsheet Index | Refresh Product Links and Rows",
    description:
      "Search MuleBuy spreadsheet rows by category and query, reopen the current source and retain only links with a matched variation and dated evidence note.",
    heroEyebrow: "Independent MuleBuy spreadsheet index",
    heroPrimary: "Turn spreadsheet rows into current product leads.",
    heroSecondary: "Query, match, refresh, retain.",
    supportingLine:
      "Keep the search phrase, current source, intended option and reason for retention together so every indexed row can be checked again.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/mulebuy-spreadsheet",
      "/spreadsheet-checklist",
      "/search-ideas",
      "/buyer-safety",
      "/shipping-weight-guide",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Keep only rows that explain why they remain useful.",
      introDescription:
        "Begin with a precise query, reopen the source and retain a row only when the intended variation and visible evidence still match the research goal.",
      primaryCtaLabel: "Open the MuleBuy row-refresh method",
      primaryCtaHref: "/mulebuy-spreadsheet",
      brandTitle: "Use brands after the query and category are defined.",
      brandDescription:
        "A brand page can group candidates, while the source destination, selected variation and dated review decide whether a row remains in the index.",
    },
  },
  "mulebuyitems.com": {
    siteName: "MuleBuy Item Evidence",
    wordmark: "MuleBuy",
    logoPath: "/images/agents/mulebuy.ico",
    faviconPath: "/images/agents/mulebuy.ico",
    themeColor: "#160c26",
    primaryColor: "#7c3aed",
    primaryHoverColor: "#6426c4",
    accentColor: "#c4a1ff",
    seoTitle: "MuleBuy Item Evidence | Options, QC Images and Source Checks",
    description:
      "Inspect one MuleBuy-linked item at a time, match the exact option to visible listing and QC evidence and preserve missing fields before a parcel decision.",
    heroEyebrow: "Independent MuleBuy item evidence",
    heroPrimary: "Inspect the item layer by layer.",
    heroSecondary: "Frame, option, evidence, source.",
    supportingLine:
      "Record the intended variation beside listing images, measurements, received-item evidence and unresolved claims without treating one layer as proof of another.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/categories",
      "/mulebuy-spreadsheet",
      "/spreadsheet-checklist",
      "/search-ideas",
      "/buyer-safety",
      "/shipping-weight-guide",
      "/faq",
    ],
    editorial: {
      homeVariant: "items",
      introTitle: "Keep every item claim attached to its evidence layer.",
      introDescription:
        "Start with the requested option, compare the current listing and received-item record, then leave authenticity, performance or route questions unresolved until the responsible evidence exists.",
      primaryCtaLabel: "Open the MuleBuy item checklist",
      primaryCtaHref: "/spreadsheet-checklist",
      brandTitle: "Use brands only after the item file is clear.",
      brandDescription:
        "A brand filter can locate alternatives, but every item still needs its own current source, selected option and visible evidence record.",
    },
  },
  "oopbuyindex.net": {
    siteName: "Oopbuy Link Review Index",
    wordmark: "Oopbuy",
    logoPath: "/images/agents/oopbuy.png",
    faviconPath: "/images/agents/oopbuy.png",
    themeColor: "#091927",
    primaryColor: "#16a6a1",
    primaryHoverColor: "#0e817e",
    accentColor: "#73efe4",
    seoTitle: "Oopbuy Spreadsheet Guide | Link Score, QC and Shipping Checks",
    description:
      "Review Oopbuy spreadsheet and product links with a visible score for source clarity, exact options, QC evidence, warehouse status and current shipping inputs.",
    heroEyebrow: "Independent Oopbuy link review index",
    heroPrimary: "Score the link before saving the find.",
    heroSecondary: "Source, option, evidence, route.",
    supportingLine:
      "Keep a product lead only when the current source, intended variation, missing evidence and next verification step remain visible together.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/guide",
      "/categories",
      "/oopbuy-score",
      "/search-ideas",
      "/shipping",
      "/safety",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Convert a product lead into a reviewable link record.",
      introDescription:
        "Start with the source and exact option, identify the evidence that is still missing and retain a link only when another reviewer can repeat the same check.",
      primaryCtaLabel: "Open the Oopbuy link score",
      primaryCtaHref: "/oopbuy-score",
      brandTitle: "Use a brand label as a query field, not as product proof.",
      brandDescription:
        "A brand filter may organize candidates, while current source details, option controls and visible evidence decide whether a result stays in the index.",
    },
  },
  "orientdigindex.com": {
    siteName: "OrientDig Evidence Index",
    wordmark: "OrientDig",
    logoPath: "/images/agents/orientdig.png",
    faviconPath: "/images/agents/orientdig.png",
    themeColor: "#111315",
    primaryColor: "#e96b2c",
    primaryHoverColor: "#c85018",
    accentColor: "#ff9c61",
    seoTitle: "OrientDig Spreadsheet Index | Product Score, QC and Category Checks",
    description:
      "Use an OrientDig spreadsheet index as a dated research record: compare product-specific evidence, review QC photos and keep shipping inputs separate from listing claims.",
    heroEyebrow: "Independent OrientDig evidence desk",
    heroPrimary: "Measure the evidence, not the hype.",
    heroSecondary: "Category first. Score second. Source always.",
    supportingLine:
      "Match every retained find to category-specific fields, a current source and a dated evidence note before it enters the public research index.",
    indexing: "ready",
    indexablePaths: [
      "",
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
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Give each category its own evidence threshold.",
      introDescription:
        "A useful shoe record needs different fields from an electronics record. Score only what the current source and visible evidence can support, then leave unknowns open.",
      primaryCtaLabel: "Read the Orient Score method",
      primaryCtaHref: "/orient-score-methodology",
      brandTitle: "Compare within a category before grouping by brand.",
      brandDescription:
        "Brand wording can narrow discovery, but measurements, specifications, source identity and dated QC evidence remain the fields that make a result reviewable.",
    },
  },
  "parcelupindex.com": {
    siteName: "Parcel Up Taobao Order Guide",
    wordmark: "Parcel Up",
    logoPath: "/images/agents/parcelup.png",
    faviconPath: "/images/agents/parcelup.png",
    themeColor: "#15110d",
    primaryColor: "#d85e25",
    primaryHoverColor: "#b84718",
    accentColor: "#ffc166",
    seoTitle: "Parcel Up Guide | Taobao Orders, QC, Warehouse and Shipping",
    description:
      "Follow a Parcel Up Taobao order from the original product source and first payment through warehouse QC, consolidation, second payment and international tracking.",
    heroEyebrow: "Independent Parcel Up order handoff guide",
    heroPrimary: "Keep the Taobao source attached to every parcel step.",
    heroSecondary: "Order, warehouse, consolidate, ship.",
    supportingLine:
      "Preserve the original listing, selected option, payment stage, warehouse evidence and final parcel record so each handoff can be checked independently.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/getting-started",
      "/fees-and-budgeting",
      "/shipping-and-warehouse",
      "/qc-checklist",
      "/product-index-method",
      "/official-sources",
      "/methodology",
      "/about-parcel-up-index",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Separate the product order from the international parcel.",
      introDescription:
        "Use the first payment for the selected product record, the warehouse stage for received-item evidence and the second payment for the measured parcel and current shipping route.",
      primaryCtaLabel: "Start the Parcel Up order guide",
      primaryCtaHref: "/getting-started",
      brandTitle: "Retain the seller and original Taobao source beside the item.",
      brandDescription:
        "A translated title or brand filter is not enough to preserve seller context, exact options, domestic delivery status or the evidence needed at the warehouse handoff.",
    },
  },
  "sugargooindex.net": {
    siteName: "Sugargoo Spreadsheet Evidence Guide",
    wordmark: "Sugargoo",
    logoPath: "/images/agents/sugargoo.png",
    faviconPath: "/images/agents/sugargoo-favicon.png",
    themeColor: "#24120d",
    primaryColor: "#f36b32",
    primaryHoverColor: "#d94e19",
    accentColor: "#ffc266",
    seoTitle: "Sugargoo Spreadsheet Guide | Product, QC and Shipping Checks",
    description:
      "Use a Sugargoo spreadsheet as a product-research lead, then match the exact option, inspect warehouse QC evidence and plan the measured parcel separately.",
    heroEyebrow: "Independent Sugargoo evidence workflow",
    heroPrimary: "Follow the product from source to parcel.",
    heroSecondary: "Search, option, QC, ship.",
    supportingLine:
      "Preserve the current source and intended variation, then keep received-item photos and measured shipping inputs in their own review stages.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/sugargoo-spreadsheet",
      "/categories",
      "/sugargoo-qc-guide",
      "/sugargoo-shipping-guide",
      "/sugargoo-buying-guide",
      "/faq",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Do not let a spreadsheet row skip the warehouse check.",
      introDescription:
        "Use the row to locate a current product source, lock the requested option and review the received item before combining it into an international parcel.",
      primaryCtaLabel: "Open the Sugargoo buying workflow",
      primaryCtaHref: "/sugargoo-buying-guide",
      brandTitle: "Use brands after the option and source are clear.",
      brandDescription:
        "A brand page can narrow discovery, while current source details, the selected variation and category-specific QC evidence decide whether a result remains useful.",
    },
  },
  "superbuydeals.com": {
    siteName: "Superbuy Offer Verification Desk",
    wordmark: "Superbuy",
    logoPath: "/images/agents/superbuy.svg",
    faviconPath: "/images/agents/superbuy.svg",
    themeColor: "#240c0a",
    primaryColor: "#e54c2f",
    primaryHoverColor: "#be321d",
    accentColor: "#ffc24c",
    seoTitle: "Superbuy Deals Guide | Verify Offers, Prices and Conditions",
    description:
      "Check Superbuy-linked deals by source date, eligibility, scope and checkout result, while keeping product price, domestic delivery and international shipping separate.",
    heroEyebrow: "Independent Superbuy offer verification",
    heroPrimary: "A deal needs terms, a source and a date.",
    heroSecondary: "Verify before you publish.",
    supportingLine:
      "Record who can use an offer, what it changes and where it was confirmed; remove expired or unsupported labels instead of carrying them into product pages.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/superbuy-spreadsheet",
      "/categories",
      "/spreadsheet-checklist",
      "/shipping-weight-guide",
      "/faq",
    ],
    editorial: {
      homeVariant: "guide",
      introTitle: "Separate a verified offer from a promotional word.",
      introDescription:
        "Keep the original announcement, review date, account conditions, applicable charge and checkout result together so an old deal can be retired cleanly.",
      primaryCtaLabel: "Open the Superbuy offer checklist",
      primaryCtaHref: "/spreadsheet-checklist",
      brandTitle: "Do not attach platform-wide savings to every brand.",
      brandDescription:
        "A product group can help compare visible prices, but an offer belongs only where its current terms, eligibility and applicable stage are documented.",
    },
  },
  "superbuyindex.com": {
    siteName: "Superbuy Query Index",
    wordmark: "Superbuy",
    logoPath: "/images/agents/superbuy.svg",
    faviconPath: "/images/agents/superbuy.svg",
    themeColor: "#111722",
    primaryColor: "#d93921",
    primaryHoverColor: "#b82a17",
    accentColor: "#f29b38",
    seoTitle: "Superbuy Spreadsheet Index | Search, Shortlist and Source Checks",
    description:
      "Search a Superbuy spreadsheet index by precise query, group duplicate leads and retain only results with a current source, exact option and dated review note.",
    heroEyebrow: "Independent Superbuy query index",
    heroPrimary: "Turn a broad search into a reviewable shortlist.",
    heroSecondary: "Query, deduplicate, retain.",
    supportingLine:
      "Save the exact search phrase, current source, intended option and unresolved field so another reviewer can repeat the same result check.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/superbuy-spreadsheet",
      "/categories",
      "/search-ideas",
      "/spreadsheet-checklist",
      "/shipping-weight-guide",
      "/buyer-safety",
      "/faq",
    ],
    editorial: {
      homeVariant: "index",
      introTitle: "Keep only search results that explain why they remain.",
      introDescription:
        "Refine the query, group repeated destinations and retain a row only when its source, intended option and open question remain visible together.",
      primaryCtaLabel: "Read the Superbuy index method",
      primaryCtaHref: "/superbuy-spreadsheet",
      brandTitle: "Apply a brand filter after defining the comparison.",
      brandDescription:
        "Brand wording can narrow a result set, while the current source, exact variation and product-specific evidence decide whether a row stays indexed.",
    },
  },
  "superbuyitems.com": {
    siteName: "Superbuy Item Evidence Files",
    wordmark: "Superbuy",
    logoPath: "/images/agents/superbuy.svg",
    faviconPath: "/images/agents/superbuy.svg",
    themeColor: "#052e5f",
    primaryColor: "#078be8",
    primaryHoverColor: "#056db7",
    accentColor: "#ff765f",
    seoTitle: "Superbuy Items Guide | Product Links, Options and QC Evidence",
    description:
      "Review Superbuy-linked product pages, compare visible options and confirm current price, availability and source details before choosing an external route.",
    heroEyebrow: "Superbuy item review",
    heroPrimary: "Inspect a Superbuy-linked item in context.",
    heroSecondary: "Compare what the listing actually shows.",
    supportingLine:
      "Keep the product page, visible options and missing fields together before moving to an external route.",
    indexing: "ready",
    indexablePaths: [
      "",
      "/superbuy-items",
      "/superbuy-product-links",
      "/superbuy-qc",
      "/superbuy-shipping",
      "/superbuy-review",
      "/categories",
      "/faq",
    ],
    editorial: {
      homeVariant: "items",
      introTitle: "Keep item evidence ahead of the buying route.",
      introDescription:
        "Review the visible product page first, compare options and missing fields, then use categories or brands only to locate alternatives.",
      primaryCtaLabel: "Open the Superbuy item-file method",
      primaryCtaHref: "/superbuy-items",
      brandTitle: "Let the item page carry the product claims.",
      brandDescription:
        "Use brand pages to group alternatives, while checking images, options, price and source availability on each listing.",
    },
  },
  "itaobuyindex.com": {
    siteName: "iTaoBuy",
    wordmark: "iTaoBuy",
    logoPath: "/images/agents/itaobuy.ico",
    faviconPath: "/images/agents/itaobuy.ico",
    themeColor: "#0b1727",
    primaryColor: "#e96517",
    primaryHoverColor: "#bd4d0f",
    accentColor: "#ffb44a",
    seoTitle: "iTaoBuy Spreadsheet and Product Research | Independent Guide",
    description:
      "Search iTaoBuy-linked products, retain the original listing source and use an independent research guide for safety, promo-code and Reddit checks.",
    heroEyebrow: "Independent iTaoBuy research archive",
    heroPrimary: "Trace every iTaoBuy-linked find back to its source.",
    heroSecondary: "Keep the evidence trail intact.",
    supportingLine:
      "Search the product index, preserve the listing context and separate visible evidence from claims that still need confirmation.",
    indexing: "ready",
    editorial: {
      homeVariant: "archive",
      introTitle: "One archive for six different research questions.",
      introDescription:
        "Keep product discovery, source checks, safety questions, promo terms and community reports in separate records so one claim never stands in for another.",
      primaryCtaLabel: "Open the iTaoBuy research archive",
      primaryCtaHref: "/site-guide",
      brandTitle: "Use brands as archive filters, not proof.",
      brandDescription:
        "A brand can narrow the record set, while the source listing, visible options and current external terms remain the evidence to review.",
    },
  },
  "usfansindex.net": {
    siteName: "USFans",
    wordmark: "USFans",
    logoPath: "/images/agents/usfans.png",
    faviconPath: "/tenants/usfans/favicon.svg",
    themeColor: "#111827",
    primaryColor: "#d84a24",
    primaryHoverColor: "#b83a1b",
    accentColor: "#f4a340",
    seoTitle: "USFans Spreadsheet Research | Independent Product Index",
    description:
      "Use the USFans spreadsheet research workflow to trace a candidate product to its source, record missing fields and verify current terms before choosing a route.",
    heroEyebrow: "Independent USFans source checks",
    heroPrimary: "Build a USFans research record.",
    heroSecondary: "Keep source facts separate from open questions.",
    supportingLine:
      "Start with a candidate listing, preserve its source context and verify price, options and availability on the destination website.",
    indexing: "ready",
    editorial: {
      homeVariant: "index",
      introTitle: "Turn a USFans find into a source-check record.",
      introDescription:
        "Use categories and brands to find candidates, then separate visible listing facts, missing fields and destination checks before comparing routes.",
      primaryCtaLabel: "Open the USFans source-check guide",
      primaryCtaHref: "/usfans-spreadsheet",
      brandTitle: "Use brands to narrow candidates, not certify them.",
      brandDescription:
        "A brand page can narrow the research set. Product identity, condition, price and availability still require source verification.",
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
  const logo = guide.agentKey
    ? getOfficialPlatformLogo(guide.agentKey)?.src
    : undefined;
  const palette = DRAFT_PALETTES[guide.productMode];
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
      ? `Use ${guide.title} on ${guide.domain} to keep source links and unresolved questions together before choosing a buying route.`
      : isCatalog
        ? `Use ${guide.title} to browse first, then open each source to confirm current price, availability and product options.`
        : `Compare ${guide.title} listing details, then confirm current price and service terms on the destination site.`,
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

function applyPlatformIdentity(
  guide: SubsiteGuideDefinition,
  branding: TenantBranding,
): TenantBranding {
  if (!guide.agentKey) return branding;

  const platform = getAgentPlatform(guide.agentKey);
  const officialAsset = getOfficialPlatformLogo(guide.agentKey);
  const logo = officialAsset?.src;
  const favicon = officialAsset?.faviconSrc ?? logo;

  return {
    ...branding,
    wordmark: platform?.name || branding.wordmark,
    logoPath: logo || branding.logoPath,
    faviconPath: favicon || branding.faviconPath,
  };
}

interface TenantRequestHeaders {
  get(name: string): string | null;
}

function firstForwardedHost(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

function normalizeHostname(value: string | null | undefined): string | null {
  const candidate = firstForwardedHost(value || null);
  if (!candidate) return null;

  try {
    const url = candidate.includes("://")
      ? new URL(candidate)
      : new URL(`http://${candidate}`);
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

export function isMainSiteHost(value: string | null | undefined): boolean {
  const host = normalizeHostname(value);
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }

  const mainHost = normalizeHostname(getSiteUrl());
  const previewHost = normalizeHostname(process.env.VERCEL_URL);
  return (
    host === mainHost ||
    host === `www.${mainHost}` ||
    (previewHost !== null && host === previewHost)
  );
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

  const branding = TENANT_BRANDING[guide.domain] || buildDraftBranding(guide);

  return {
    ...guide,
    canonicalOrigin: `https://${guide.domain}`,
    branding: applyPlatformIdentity(guide, branding),
  };
}

export function resolveTenantFromHeaders(
  headers: TenantRequestHeaders,
  localFallbackHost?: string,
): TenantConfig | null {
  const trustedProxyHost =
    process.env.INDEXFINDS_TENANT_PROXY_SECRET &&
    headers.get("x-indexfinds-tenant-secret") ===
      process.env.INDEXFINDS_TENANT_PROXY_SECRET
      ? headers.get("x-indexfinds-tenant-host")
      : null;
  const host =
    trustedProxyHost ||
    firstForwardedHost(headers.get("x-forwarded-host")) ||
    headers.get("host");
  return getTenantConfigByHost(host) || getTenantConfigByHost(localFallbackHost);
}

export function resolveSiteIdentityFromHeaders(
  headers: TenantRequestHeaders,
  localFallbackHost?: string,
): SiteIdentity {
  const tenant = resolveTenantFromHeaders(headers, localFallbackHost);

  return {
    tenant,
    siteUrl: tenant?.canonicalOrigin || getSiteUrl(),
    siteName: tenant?.branding?.siteName || getSiteName(),
  };
}

export function isTenantPathIndexable(
  tenant: TenantConfig,
  pathname: string,
): boolean {
  const branding = tenant.branding;
  if (!branding || !isTenantReleasedForIndexing(tenant)) return false;

  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const configuredPaths = branding.indexablePaths || [
    "",
    branding.editorial.primaryCtaHref,
  ];
  return configuredPaths.some(
    (path) => normalizedPath === `/en${path}`,
  );
}

export function isTenantLocaleIndexable(
  tenant: TenantConfig,
  locale: string,
): boolean {
  return isTenantReleasedForIndexing(tenant) && locale === "en";
}
