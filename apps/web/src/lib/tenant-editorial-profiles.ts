export interface TenantEditorialProfile {
  heroTitle: string;
  heroAccent: string;
  summary: string;
  audience: string;
  researchFocus: string;
  guideTitle: string;
}

/**
 * Domain-specific editorial seeds for local tenant builds.
 *
 * These entries deliberately describe research workflows, not platform
 * quality, authorization, stock, shipping, or authenticity. Draft tenants
 * stay noindex until their copy and source evidence pass editorial review.
 */
export const TENANT_EDITORIAL_PROFILES = {
  "1to1reps.com": {
    heroTitle: "Organize listing research before choosing a seller.",
    heroAccent: "Compare the evidence you can actually see.",
    summary:
      "Use a source-led research guide to collect listing details, note missing information and build a smaller comparison set.",
    audience:
      "Researchers comparing marketplace listings without a preferred buying agent.",
    researchFocus:
      "Source links, visible listing fields and unresolved questions that still need seller confirmation.",
    guideTitle: "A source-first marketplace listing research guide",
  },
  "acbuyindex.com": {
    heroTitle: "Scan ACBuy-linked listings with a spreadsheet-first workflow.",
    heroAccent: "Search broadly, then reduce the list.",
    summary:
      "Use queries, brands and categories to turn a large ACBuy-linked catalog into a reviewable shortlist.",
    audience:
      "Shoppers who know a product type or brand and want a faster first pass through ACBuy-linked listings.",
    researchFocus:
      "Query refinement, source availability and the product fields worth checking before opening an external route.",
    guideTitle: "How to use the ACBuy spreadsheet index",
  },
  "allchinabuyfinder.com": {
    heroTitle: "Find AllChinaBuy-linked products by category first.",
    heroAccent: "Use the catalog as a discovery map.",
    summary:
      "Start from a product family, compare visible listing details and open only the results that match your research goal.",
    audience:
      "Browsers who do not yet have an exact product name or marketplace link.",
    researchFocus:
      "Category discovery, brand clusters and listing details that help separate relevant results from noise.",
    guideTitle: "An AllChinaBuy category discovery method",
  },
  "allchinabuyindex.com": {
    heroTitle: "Search an AllChinaBuy-linked product index before leaving the catalog.",
    heroAccent: "Keep your comparison in one place.",
    summary:
      "Search by product, brand or category, then review source status and available options before continuing.",
    audience:
      "Researchers arriving with a product phrase, brand name or known category.",
    researchFocus:
      "Search intent, comparable listing fields and the external details that still require confirmation.",
    guideTitle: "How to search the AllChinaBuy product index",
  },
  "bbdbuyeufinds.com": {
    heroTitle: "Explore BBDBuyEU-linked finds with a European research lens.",
    heroAccent: "Shortlist products before checking final terms.",
    summary:
      "Browse current listings, compare visible product details and keep destination fees and availability separate from catalog prices.",
    audience:
      "European shoppers researching products before confirming destination-specific terms.",
    researchFocus:
      "Listing discovery, displayed currency context and the fees or availability that must be checked off-site.",
    guideTitle: "A BBDBuyEU product discovery guide for Europe",
  },
  "bbdbuyeus.com": {
    heroTitle: "Review BBDBuyEU-linked listings with US shoppers in mind.",
    heroAccent: "Separate product research from final landed cost.",
    summary:
      "Build a product shortlist first, then confirm destination fees, service terms and availability on the external site.",
    audience:
      "US shoppers comparing marketplace listings before estimating the complete buying route.",
    researchFocus:
      "Product-level evidence, destination checks and the difference between a listing price and a final purchase cost.",
    guideTitle: "A US-focused BBDBuyEU listing research guide",
  },
  "bbdbuyeusheet.com": {
    heroTitle: "Turn the BBDBuyEU catalog into a focused shortlist.",
    heroAccent: "Use a sheet-like research sequence.",
    summary:
      "Search, filter and review BBDBuyEU-linked listings without treating incomplete fields as confirmed product facts.",
    audience:
      "Researchers who prefer a repeatable spreadsheet-style pass through a large catalog.",
    researchFocus:
      "Consistent filtering, missing-field checks and source verification before an item enters a shortlist.",
    guideTitle: "How to review the BBDBuyEU spreadsheet catalog",
  },
  "boonbuyfind.net": {
    heroTitle: "Keep BoonBuy product research focused on source details.",
    heroAccent: "Record what is known and what is missing.",
    summary:
      "Use research notes to compare listings, preserve source context and identify questions for the destination seller.",
    audience:
      "Researchers who need a careful comparison record rather than a broad shopping feed.",
    researchFocus:
      "Source continuity, visible options and unresolved listing fields that should not be guessed.",
    guideTitle: "A BoonBuy source-note research method",
  },
  "boonbuyindex.com": {
    heroTitle: "Search BoonBuy-linked listings before comparing routes.",
    heroAccent: "Make the product shortlist first.",
    summary:
      "Narrow the catalog by query, category and brand, then check the product page before opening a buying route.",
    audience:
      "Shoppers who want product discovery and route comparison to remain separate decisions.",
    researchFocus:
      "Search relevance, visible product options and the external terms that affect the final route.",
    guideTitle: "How to use the BoonBuy product index",
  },
  "cnshopperindex.com": {
    heroTitle: "Move from a broad CNShopper catalog to a product shortlist.",
    heroAccent: "Use category context before comparing routes.",
    summary:
      "Browse product groups, inspect listing evidence and keep a clear path back to the original source.",
    audience:
      "Browsers exploring Chinese marketplace listings through category and brand paths.",
    researchFocus:
      "Category structure, source visibility and the listing details that support a meaningful comparison.",
    guideTitle: "A CNShopper catalog research workflow",
  },
  "cssbuycatalog.com": {
    heroTitle: "Browse CSSBuy-linked listings from category to product.",
    heroAccent: "Let the catalog narrow the search.",
    summary:
      "Use category groups and brand pages to find relevant listings before reviewing each product source.",
    audience:
      "Exploratory shoppers who prefer browsing over exact-keyword search.",
    researchFocus:
      "Category navigation, product grouping and the source fields needed before comparing buying routes.",
    guideTitle: "How to browse the CSSBuy-linked catalog",
  },
  "cssbuyindex.com": {
    heroTitle: "Search CSSBuy-linked listings with a query-first index.",
    heroAccent: "Refine the phrase before the product list.",
    summary:
      "Start with an exact product or brand phrase, reduce irrelevant results and review visible listing details.",
    audience:
      "Researchers who already know what they want to search for.",
    researchFocus:
      "Query precision, comparable product fields and destination checks that remain outside the index.",
    guideTitle: "A query-first CSSBuy index workflow",
  },
  "cssbuyitems.com": {
    heroTitle: "Review individual CSSBuy-linked items with more context.",
    heroAccent: "Inspect the listing before the route.",
    summary:
      "Open item pages, compare visible options and confirm missing price, stock or material information at the source.",
    audience:
      "Shoppers comparing specific item pages rather than browsing a broad spreadsheet.",
    researchFocus:
      "Item images, options, source status and fields that require destination confirmation.",
    guideTitle: "How to review CSSBuy-linked item pages",
  },
  "eastmallbuyindex.com": {
    heroTitle: "Build an EastMallBuy-linked shortlist with fewer dead ends.",
    heroAccent: "Check source status as you search.",
    summary:
      "Use search and category paths together, then remove listings that lack enough information for the next research step.",
    audience:
      "Researchers who want to avoid carrying incomplete listings into a final comparison.",
    researchFocus:
      "Source availability, minimum listing completeness and a clean shortlist for route review.",
    guideTitle: "An EastMallBuy shortlist-building method",
  },
  "fishgooindex.com": {
    heroTitle: "Search Fishgoo-linked listings by product intent.",
    heroAccent: "Keep broad discovery and exact matches separate.",
    summary:
      "Choose a category-led or query-led path, then compare only listings with enough visible product context.",
    audience:
      "Shoppers moving between open-ended discovery and exact product research.",
    researchFocus:
      "Search intent, result relevance and listing evidence that supports a useful comparison.",
    guideTitle: "A Fishgoo product-intent search guide",
  },
  "goatedbuyindex.com": {
    heroTitle: "Build a focused GoatedBuy-linked product shortlist.",
    heroAccent: "Reduce the catalog before comparing agents.",
    summary:
      "Search the product index, group relevant results and review visible source details before leaving the site.",
    audience:
      "Researchers who want a compact shortlist instead of a long unfiltered result set.",
    researchFocus:
      "Result relevance, duplicate avoidance and product fields that remain consistent across shortlisted listings.",
    guideTitle: "How to build a GoatedBuy product shortlist",
  },
  "gtbuyindex.com": {
    heroTitle: "Use a compact GTBuy-linked product index.",
    heroAccent: "Find, inspect and record the source.",
    summary:
      "Move from a focused query to product details, then save the source context needed for later comparison.",
    audience:
      "Researchers who value a short, repeatable product-review sequence.",
    researchFocus:
      "Focused search terms, source traceability and missing details that require external confirmation.",
    guideTitle: "A compact GTBuy index research sequence",
  },
  "hipobuyindex.com": {
    heroTitle: "Research HipoBuy-linked listings without losing source context.",
    heroAccent: "Keep every comparison traceable.",
    summary:
      "Search listings, preserve the source link and separate visible catalog facts from unverified destination details.",
    audience:
      "Shoppers who need to trace every shortlisted item back to its marketplace listing.",
    researchFocus:
      "Source continuity, visible listing evidence and clear labels for fields that are not independently verified.",
    guideTitle: "A traceable HipoBuy listing research guide",
  },
  "hoobuyindex.net": {
    heroTitle: "Compare HooBuy-linked listings before choosing a route.",
    heroAccent: "Product evidence comes first.",
    summary:
      "Narrow the index, inspect listing details and compare buying routes only after the product shortlist is stable.",
    audience:
      "Shoppers who want product comparison and agent comparison handled in a deliberate order.",
    researchFocus:
      "Shortlist quality, visible product options and external service terms that should be checked separately.",
    guideTitle: "A product-first HooBuy comparison workflow",
  },
  "itaobuyindex.com": {
    heroTitle: "Trace iTaoBuy-linked listings from search to source.",
    heroAccent: "Use the index as a research archive.",
    summary:
      "Search products, retain source context and revisit the original listing when a field is missing or changes.",
    audience:
      "Researchers who need a stable trail between index results and marketplace sources.",
    researchFocus:
      "Source traceability, update awareness and objective listing fields rather than generated sales copy.",
    guideTitle: "An iTaoBuy source-trace research archive",
  },
  "joyabuyfinds.com": {
    heroTitle: "Explore JoyaGoo-linked finds through brand and category paths.",
    heroAccent: "Discover first, verify second.",
    summary:
      "Use browsing paths to surface candidate products, then open the source details before keeping a find.",
    audience:
      "Exploratory shoppers who begin with a style, brand or product family.",
    researchFocus:
      "Discovery context, source inspection and a clear distinction between a candidate find and a verified choice.",
    guideTitle: "A JoyaGoo finds discovery workflow",
  },
  "joyagooindex.com": {
    heroTitle: "Search a JoyaGoo-linked index with clearer checkpoints.",
    heroAccent: "Refine, inspect and compare.",
    summary:
      "Use exact queries and filters, then review source status and visible options before comparing buying routes.",
    audience:
      "Researchers arriving with a known product phrase or brand.",
    researchFocus:
      "Query refinement, listing completeness and the checkpoints required before an external handoff.",
    guideTitle: "How to search the JoyaGoo product index",
  },
  "kakobuyindex.net": {
    heroTitle: "Search Kakobuy-linked listings with a shortlist in mind.",
    heroAccent: "Use the index to reduce, not just collect.",
    summary:
      "Filter the catalog, remove weak matches and keep only listings with enough source context for review.",
    audience:
      "Shoppers who want a smaller, more defensible set of Kakobuy-linked results.",
    researchFocus:
      "Match quality, duplicate control and minimum listing evidence for a useful shortlist.",
    guideTitle: "A shortlist-driven Kakobuy index method",
  },
  "kakobuyitems.com": {
    heroTitle: "Inspect Kakobuy-linked items one page at a time.",
    heroAccent: "Make item details the center of the review.",
    summary:
      "Compare images, options and source status on individual item pages before opening an external service.",
    audience:
      "Researchers comparing a small number of specific products.",
    researchFocus:
      "Item-level evidence, option visibility and missing fields that should be confirmed at the destination.",
    guideTitle: "How to inspect Kakobuy-linked item pages",
  },
  "kameymallindex.com": {
    heroTitle: "Navigate KameyMall-linked listings with category context.",
    heroAccent: "Start broad, then make the search specific.",
    summary:
      "Use category paths to understand the catalog, then switch to exact product searches for final comparison.",
    audience:
      "Browsers who need orientation before they know the right product phrase.",
    researchFocus:
      "Category context, query progression and source details that support a final shortlist.",
    guideTitle: "A category-to-query KameyMall research guide",
  },
  "litbuyindex.com": {
    heroTitle: "Search LitBuy-linked listings through a compact index.",
    heroAccent: "Use filters to keep the result set useful.",
    summary:
      "Combine product queries with brand and category filters, then review the remaining listing evidence.",
    audience:
      "Researchers who want a structured search path through LitBuy-linked products.",
    researchFocus:
      "Filter combinations, result relevance and source fields that help explain why an item remains shortlisted.",
    guideTitle: "How to use the LitBuy product index",
  },
  "litbuyitems.com": {
    heroTitle: "Review LitBuy-linked items with source details visible.",
    heroAccent: "Check the page before the handoff.",
    summary:
      "Open individual products, compare visible options and identify information that still needs destination confirmation.",
    audience:
      "Shoppers researching specific LitBuy-linked items.",
    researchFocus:
      "Item options, image context, source availability and unverified fields that should remain clearly labeled.",
    guideTitle: "A LitBuy item-page review checklist",
  },
  "litbuyproducts.com": {
    heroTitle: "Explore the LitBuy-linked product catalog by intent.",
    heroAccent: "Choose discovery or exact search.",
    summary:
      "Use categories for discovery, brands for comparison and exact queries when you already know the target product.",
    audience:
      "Browsers who move between product discovery and known-item research.",
    researchFocus:
      "Choosing the right catalog entry point and preserving source context through each research path.",
    guideTitle: "A LitBuy product-catalog navigation guide",
  },
  "loongbuys.net": {
    heroTitle: "Create a LoongBuy-linked shortlist from searchable listings.",
    heroAccent: "Compare fewer products with better context.",
    summary:
      "Search, filter and retain only listings that show enough information for a meaningful next step.",
    audience:
      "Researchers who want to reduce a broad catalog to a manageable comparison set.",
    researchFocus:
      "Listing completeness, shortlist discipline and source checks before route selection.",
    guideTitle: "A LoongBuy shortlist research workflow",
  },
  "lovegobuyindex.com": {
    heroTitle: "Research LoveGoBuy-linked listings with clear source checks.",
    heroAccent: "Treat missing details as questions, not facts.",
    summary:
      "Use the index to find candidates, then confirm price, options, materials and availability at the source when needed.",
    audience:
      "Shoppers who want incomplete marketplace fields clearly separated from visible listing information.",
    researchFocus:
      "Missing-data awareness, source confirmation and objective comparison notes.",
    guideTitle: "A source-check guide for LoveGoBuy-linked listings",
  },
  "mulebuyindex.net": {
    heroTitle: "Search MuleBuy-linked listings with repeatable filters.",
    heroAccent: "Use the same checks across every result.",
    summary:
      "Apply a consistent search and review sequence so shortlisted products can be compared on the same visible fields.",
    audience:
      "Researchers who prefer a repeatable catalog-screening method.",
    researchFocus:
      "Consistent filters, comparable listing fields and transparent notes for missing information.",
    guideTitle: "A repeatable MuleBuy index screening method",
  },
  "mulebuyitems.com": {
    heroTitle: "Compare MuleBuy-linked item pages on visible evidence.",
    heroAccent: "Keep each item review specific.",
    summary:
      "Inspect product images, options and source status, then record what still requires external confirmation.",
    audience:
      "Shoppers comparing a focused set of MuleBuy-linked items.",
    researchFocus:
      "Item-specific evidence, option differences and source fields that should not be inferred.",
    guideTitle: "How to compare MuleBuy-linked item pages",
  },
  "oopbuyindex.net": {
    heroTitle: "Use an OOPBuy-linked index to compare listing context.",
    heroAccent: "Search the product before the service.",
    summary:
      "Build a product comparison first, then review available buying routes without mixing service claims into listing facts.",
    audience:
      "Researchers who want product evidence and external service terms kept separate.",
    researchFocus:
      "Listing context, product comparison and a clear boundary between catalog data and destination services.",
    guideTitle: "A product-first OOPBuy index guide",
  },
  "orientdigindex.com": {
    heroTitle: "Browse OrientDig-linked products through an editorial catalog.",
    heroAccent: "Use product groups to make sense of the index.",
    summary:
      "Move through category collections, inspect source details and switch to exact search when the target becomes clear.",
    audience:
      "Exploratory shoppers who benefit from a curated catalog path before exact search.",
    researchFocus:
      "Category relationships, source context and the transition from browsing to a focused product query.",
    guideTitle: "An OrientDig editorial catalog guide",
  },
  "parcelupindex.com": {
    heroTitle: "Prepare Parcel Up-linked product research before route planning.",
    heroAccent: "Keep product facts and delivery questions separate.",
    summary:
      "Compare listings first, then confirm destination fees, availability and delivery terms outside the catalog.",
    audience:
      "Shoppers who need a clean product shortlist before considering the complete route.",
    researchFocus:
      "Product evidence, source status and a deliberate separation between listing prices and destination costs.",
    guideTitle: "A Parcel Up product-research preparation guide",
  },
  "sugargooindex.net": {
    heroTitle: "Search Sugargoo-linked listings with product evidence in view.",
    heroAccent: "Use the index to support a careful comparison.",
    summary:
      "Narrow results, inspect available product details and confirm uncertain fields on the destination listing.",
    audience:
      "Researchers comparing Sugargoo-linked products across brands or categories.",
    researchFocus:
      "Comparable listing fields, source confirmation and clear handling of unavailable product information.",
    guideTitle: "How to research Sugargoo-linked listings",
  },
  "superbuydeals.com": {
    heroTitle: "Research Superbuy-linked listings without assuming a deal label.",
    heroAccent: "Compare current evidence, not promotional wording.",
    summary:
      "Review visible product prices and source details, then confirm whether any offer still applies at the destination.",
    audience:
      "Value-focused shoppers who want promotional labels checked against current source information.",
    researchFocus:
      "Displayed price context, source freshness and destination confirmation before treating a listing as an offer.",
    guideTitle: "A source-check method for Superbuy-linked deals",
  },
  "superbuyindex.com": {
    heroTitle: "Search Superbuy-linked listings through a structured index.",
    heroAccent: "Move from query to shortlist with clear checks.",
    summary:
      "Use search, brand and category filters, then inspect source details before comparing external routes.",
    audience:
      "Researchers arriving with a known product type, brand or search phrase.",
    researchFocus:
      "Search refinement, shortlist quality and source fields that support comparison.",
    guideTitle: "How to use the Superbuy product index",
  },
  "superbuyitems.com": {
    heroTitle: "Inspect Superbuy-linked item pages before continuing.",
    heroAccent: "Use product-level detail as the checkpoint.",
    summary:
      "Compare visible images, options and source status on each item page, then confirm uncertain fields externally.",
    audience:
      "Shoppers comparing specific Superbuy-linked products rather than a broad catalog.",
    researchFocus:
      "Item-page evidence, option comparison and missing information that requires destination confirmation.",
    guideTitle: "A Superbuy-linked item inspection guide",
  },
  "yoybuyindex.com": {
    heroTitle: "Search YoyBuy-linked listings with a clear review sequence.",
    heroAccent: "Find the product, inspect the source, compare the route.",
    summary:
      "Use the index in a consistent order so product details and external service terms do not become mixed.",
    audience:
      "Researchers who want a simple sequence for moving from discovery to an external buying route.",
    researchFocus:
      "Search relevance, source inspection and separation of product data from destination service terms.",
    guideTitle: "A YoyBuy index review sequence",
  },
} as const satisfies Record<string, TenantEditorialProfile>;

export function getTenantEditorialProfile(
  domain: string,
): TenantEditorialProfile | undefined {
  return TENANT_EDITORIAL_PROFILES[
    domain as keyof typeof TENANT_EDITORIAL_PROFILES
  ];
}
