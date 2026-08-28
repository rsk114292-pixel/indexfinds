export interface SiteDefinition {
  domain: string;
  title: string;
  agentKey: string | null;
}

const INDEX_RELEASED_DOMAINS = new Set([
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
  "goatedbuyindex.com",
  "gtbuyindex.com",
  "hipobuyindex.com",
  "hoobuyindex.net",
  "itaobuyindex.com",
  "kakobuyindex.net",
  "kakobuyitems.com",
  "litbuyindex.com",
  "litbuyitems.com",
  "litbuyproducts.com",
  "loongbuys.net",
  "lovegobuyindex.com",
  "mulebuyindex.net",
  "mulebuyitems.com",
  "oopbuyindex.net",
  "usfansindex.net",
  "ydaexpress.net",
  "ydaexpress.org",
  "yoybuyindex.com",
]);

export function isSiteReleasedForIndexing(site: SiteDefinition): boolean {
  return INDEX_RELEASED_DOMAINS.has(site.domain);
}

export const SITE_DEFINITIONS = [
  { domain: "acbuyindex.com", title: "ACBuy Spreadsheet", agentKey: "acbuy" },
  {
    domain: "allchinabuyfinder.com",
    title: "AllChinaBuy Finder",
    agentKey: "allchinabuy",
  },
  {
    domain: "allchinabuyindex.com",
    title: "AllChinaBuy Index",
    agentKey: "allchinabuy",
  },
  { domain: "bbdbuyeufinds.com", title: "BBDBuyEU Finds", agentKey: "bbdbuy" },
  { domain: "bbdbuyeus.com", title: "BBDBuyEU US Guide", agentKey: "bbdbuy" },
  {
    domain: "bbdbuyeusheet.com",
    title: "BBDBuyEU Spreadsheet",
    agentKey: "bbdbuy",
  },
  {
    domain: "boonbuyfind.net",
    title: "BoonBuy Find Notes",
    agentKey: "boonbuy",
  },
  { domain: "boonbuyindex.com", title: "BoonBuy Index", agentKey: "boonbuy" },
  {
    domain: "cnshopperindex.com",
    title: "CNShopper Index",
    agentKey: "cnshopper",
  },
  { domain: "cssbuycatalog.com", title: "CSSBuy Catalog", agentKey: "cssbuy" },
  { domain: "cssbuyindex.com", title: "CSSBuy Index", agentKey: "cssbuy" },
  { domain: "cssbuyitems.com", title: "CSSBuy Items", agentKey: "cssbuy" },
  {
    domain: "eastmallbuyindex.com",
    title: "EastMallBuy Index",
    agentKey: "eastmallbuy",
  },
  { domain: "fishgooindex.com", title: "Fishgoo Index", agentKey: "fishgoo" },
  {
    domain: "goatedbuyindex.com",
    title: "GoatedBuy Index",
    agentKey: "goatedbuy",
  },
  { domain: "gtbuyindex.com", title: "GTBuy Index", agentKey: "gtbuy" },
  { domain: "hipobuyindex.com", title: "HipoBuy Index", agentKey: "hipobuy" },
  { domain: "hoobuyindex.net", title: "HooBuy Index", agentKey: "hoobuy" },
  { domain: "itaobuyindex.com", title: "iTaoBuy Index", agentKey: "itaobuy" },
  { domain: "joyabuyfinds.com", title: "JoyaGoo Finds", agentKey: "joyagoo" },
  { domain: "joyagooindex.com", title: "JoyaGoo Index", agentKey: "joyagoo" },
  { domain: "kakobuyindex.net", title: "Kakobuy Index", agentKey: "kakobuy" },
  { domain: "kakobuyitems.com", title: "Kakobuy Items", agentKey: "kakobuy" },
  {
    domain: "kameymallindex.com",
    title: "KameyMall Index",
    agentKey: "kameymall",
  },
  { domain: "litbuyindex.com", title: "LitBuy Index", agentKey: "litbuy" },
  { domain: "litbuyitems.com", title: "LitBuy Items", agentKey: "litbuy" },
  {
    domain: "litbuyproducts.com",
    title: "LitBuy Product Catalog",
    agentKey: "litbuy",
  },
  { domain: "loongbuys.net", title: "LoongBuy Index", agentKey: "loongbuy" },
  {
    domain: "lovegobuyindex.com",
    title: "LoveGoBuy Index",
    agentKey: "lovegobuy",
  },
  { domain: "mulebuyindex.net", title: "MuleBuy Index", agentKey: "mulebuy" },
  { domain: "mulebuyitems.com", title: "MuleBuy Items", agentKey: "mulebuy" },
  { domain: "oopbuyindex.net", title: "OOPBuy Index", agentKey: "oopbuy" },
  {
    domain: "orientdigindex.com",
    title: "OrientDig Product Index",
    agentKey: "orientdig",
  },
  {
    domain: "parcelupindex.com",
    title: "Parcel Up Index",
    agentKey: "parcelup",
  },
  {
    domain: "sugargooindex.net",
    title: "Sugargoo Index",
    agentKey: "sugargoo",
  },
  {
    domain: "superbuydeals.com",
    title: "Superbuy Deals",
    agentKey: "superbuy",
  },
  {
    domain: "superbuyindex.com",
    title: "Superbuy Index",
    agentKey: "superbuy",
  },
  {
    domain: "superbuyitems.com",
    title: "Superbuy Items",
    agentKey: "superbuy",
  },
  { domain: "usfansindex.net", title: "USFans Index", agentKey: "usfans" },
  { domain: "ydaexpress.net", title: "YDA Express", agentKey: null },
  { domain: "ydaexpress.org", title: "YDA Express", agentKey: null },
  { domain: "yoybuyindex.com", title: "YoyBuy Index", agentKey: "yoybuy" },
] as const satisfies readonly SiteDefinition[];

export function normalizeHostname(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

export function getSiteDefinition(value: string): SiteDefinition | undefined {
  const hostname = normalizeHostname(value);
  return SITE_DEFINITIONS.find((site) => site.domain === hostname);
}
