export type SubsiteProductMode =
  | "agent-feed"
  | "direct-products"
  | "guide-only";

export interface SubsiteGuideDefinition {
  domain: string;
  title: string;
  agentKey: string | null;
  catalogPath: string | null;
  productMode: SubsiteProductMode;
}

/**
 * IndexFinds-owned guide/catalog sites that feed visitors into the main
 * product catalog. xiangshoe.net is intentionally excluded because it is an
 * independent project.
 */
export const SUBSITE_GUIDES: SubsiteGuideDefinition[] = [
  {
    domain: "acbuyindex.com",
    title: "ACBuy Index",
    agentKey: "acbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "allchinabuyfinder.com",
    title: "AllChinaBuy Finder",
    agentKey: "allchinabuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "allchinabuyindex.com",
    title: "AllChinaBuy Index",
    agentKey: "allchinabuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "bbdbuyeufinds.com",
    title: "BBDbuy EU Finds",
    agentKey: "bbdbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "bbdbuyeus.com",
    title: "BBDbuy US Guide",
    agentKey: "bbdbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "bbdbuyeusheet.com",
    title: "BBDbuy EU Sheet",
    agentKey: "bbdbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "boonbuyfind.net",
    title: "BoonBuy Find",
    agentKey: "boonbuy",
    catalogPath: "/product-index-method/",
    productMode: "guide-only",
  },
  {
    domain: "boonbuyindex.com",
    title: "BoonBuy Index",
    agentKey: "boonbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "cnshopperindex.com",
    title: "CNShopper Index",
    agentKey: "cnshopper",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "cssbuycatalog.com",
    title: "CSSBuy Catalog",
    agentKey: "cssbuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "cssbuyindex.com",
    title: "CSSBuy Index",
    agentKey: "cssbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "cssbuyitems.com",
    title: "CSSBuy Items",
    agentKey: "cssbuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "eastmallbuyindex.com",
    title: "EastMallBuy Index",
    agentKey: "eastmallbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "fishgooindex.com",
    title: "Fishgoo Index",
    agentKey: "fishgoo",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "goatedbuyindex.com",
    title: "GoatedBuy Index",
    agentKey: "goatedbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "gtbuyindex.com",
    title: "GTBuy Index",
    agentKey: "gtbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "hipobuyindex.com",
    title: "HipoBuy Index",
    agentKey: "hipobuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "hoobuyindex.net",
    title: "HooBuy Index",
    agentKey: "hoobuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "itaobuyindex.com",
    title: "iTaoBuy Index",
    agentKey: "itaobuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "joyabuyfinds.com",
    title: "JoyaGoo Finds",
    agentKey: "joyagoo",
    catalogPath: "/joyagoo-spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "joyagooindex.com",
    title: "JoyaGoo Index",
    agentKey: "joyagoo",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "kakobuyindex.net",
    title: "Kakobuy Index",
    agentKey: "kakobuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "kakobuyitems.com",
    title: "Kakobuy Items",
    agentKey: "kakobuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "kameymallindex.com",
    title: "KameyMall Index",
    agentKey: "kameymall",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "litbuyindex.com",
    title: "LitBuy Index",
    agentKey: "litbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "litbuyitems.com",
    title: "LitBuy Items",
    agentKey: "litbuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "litbuyproducts.com",
    title: "LitBuy Product Catalog",
    agentKey: "litbuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "loongbuys.net",
    title: "LoongBuy Index",
    agentKey: "loongbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "lovegobuyindex.com",
    title: "LoveGoBuy Index",
    agentKey: "lovegobuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "mulebuyindex.net",
    title: "MuleBuy Index",
    agentKey: "mulebuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "mulebuyitems.com",
    title: "MuleBuy Items",
    agentKey: "mulebuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "oopbuyindex.net",
    title: "OOPBuy Index",
    agentKey: "oopbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "orientdigindex.com",
    title: "OrientDig Product Index",
    agentKey: "orientdig",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "parcelupindex.com",
    title: "Parcel Up Index",
    agentKey: "parcelup",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "sugargooindex.net",
    title: "Sugargoo Index",
    agentKey: "sugargoo",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "superbuydeals.com",
    title: "Superbuy Deals",
    agentKey: "superbuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "superbuyindex.com",
    title: "Superbuy Index",
    agentKey: "superbuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "superbuyitems.com",
    title: "Superbuy Items",
    agentKey: "superbuy",
    catalogPath: "/",
    productMode: "direct-products",
  },
  {
    domain: "usfansindex.net",
    title: "USFans Index",
    agentKey: "usfans",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
  {
    domain: "ydaexpress.net",
    title: "YDA Express",
    agentKey: null,
    catalogPath: "/",
    productMode: "guide-only",
  },
  {
    domain: "ydaexpress.org",
    title: "YDA Express",
    agentKey: null,
    catalogPath: "/",
    productMode: "guide-only",
  },
  {
    domain: "yoybuyindex.com",
    title: "YoyBuy Index",
    agentKey: "yoybuy",
    catalogPath: "/spreadsheet/",
    productMode: "agent-feed",
  },
];

function normalizeHostname(value: string): string {
  const hostname = value
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");

  return hostname.endsWith(".localhost")
    ? hostname.slice(0, -".localhost".length)
    : hostname;
}

function hostnameFromValue(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    return normalizeHostname(new URL(candidate).hostname);
  } catch {
    return null;
  }
}

export function getSubsiteCatalogUrl(guide: SubsiteGuideDefinition): string {
  return `https://${guide.domain}${guide.catalogPath || "/"}`;
}

export function getSubsiteGuideByDomain(
  value: string | null | undefined,
): SubsiteGuideDefinition | undefined {
  const hostname = hostnameFromValue(value);
  if (!hostname) return undefined;
  return SUBSITE_GUIDES.find(
    (guide) => normalizeHostname(guide.domain) === hostname,
  );
}

export function getSubsiteGuidesForAgent(
  agentKey: string,
): SubsiteGuideDefinition[] {
  const normalizedKey = agentKey.trim().toLowerCase();
  return SUBSITE_GUIDES.filter((guide) => guide.agentKey === normalizedKey);
}

export function resolveSubsiteAgentKey(options: {
  explicitAgent?: string | null;
  utmSource?: string | null;
  referrer?: string | null;
}): string | null {
  const explicitAgent = options.explicitAgent?.trim().toLowerCase();
  if (explicitAgent) return explicitAgent;

  return (
    getSubsiteGuideByDomain(options.utmSource)?.agentKey ||
    getSubsiteGuideByDomain(options.referrer)?.agentKey ||
    null
  );
}
