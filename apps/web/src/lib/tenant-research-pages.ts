export interface TenantResearchSection {
  title: string;
  description: string;
  points?: readonly string[];
}

export interface TenantResearchQuestion {
  question: string;
  answer: string;
}

export interface TenantResearchPage {
  domain: string;
  slug: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly TenantResearchSection[];
  questions?: readonly TenantResearchQuestion[];
  sourceUrl?: string;
  sourceLabel?: string;
}

export interface TenantResearchProfile {
  variant:
    | "source"
    | "ledger"
    | "finder"
    | "eu-finds"
    | "us-parcel"
    | "sheet"
    | "item-check"
    | "query-index"
    | "catalog-map"
    | "shortlist"
    | "item-file";
  officialUrl: string;
  officialLabel: string;
  heroImage: string;
  heroAlt: string;
  navLabel: string;
  boundaryTitle: string;
  boundaryDescription: string;
}

const TENANT_RESEARCH_PROFILES: Record<string, TenantResearchProfile> = {
  "1to1finds.cloud": {
    variant: "ledger",
    officialUrl: "https://www.reddit.com/r/1to1reps/",
    officialLabel: "Review the 1to1Reps community source",
    heroImage: "/tenants/1to1reps/hero-desktop.webp",
    heroAlt: "Footwear source image behind a dated link and image evidence archive",
    navLabel: "1to1 evidence archive",
    boundaryTitle: "An archived page records a past review, not a current product state.",
    boundaryDescription:
      "Links, images, options and seller text can change independently. Preserve the review date and reopen the live destination before using an archived record in a new decision.",
  },
  "1to1finds.com": {
    variant: "finder",
    officialUrl: "https://www.reddit.com/r/1to1reps/",
    officialLabel: "Review the 1to1Reps community source",
    heroImage: "/tenants/1to1reps/hero-desktop.webp",
    heroAlt: "Footwear source image behind an independent product discovery workflow",
    navLabel: "1to1 find review guides",
    boundaryTitle: "A useful find is a candidate source, not a verified outcome.",
    boundaryDescription:
      "Resolve the final destination, identify the exact option and record visible evidence before a find enters a shortlist. Service and transaction decisions remain separate checks.",
  },
  "1to1spreadsheet.com": {
    variant: "sheet",
    officialUrl: "https://www.reddit.com/r/1to1reps/",
    officialLabel: "Review the 1to1Reps community source",
    heroImage: "/tenants/1to1reps/hero-desktop.webp",
    heroAlt: "Footwear source image behind a structured product research ledger",
    navLabel: "1to1 spreadsheet methods",
    boundaryTitle: "A row stays useful only when every claim has a source and date.",
    boundaryDescription:
      "Keep incomplete fields open, distinguish visible evidence from seller language and reopen changing links before relying on a saved row.",
  },
  "itaobuyindex.com": {
    variant: "ledger",
    officialUrl: "https://www.itaobuy.com",
    officialLabel: "Open iTaoBuy",
    heroImage: "/tenants/itaobuy/hero-desktop.webp",
    heroAlt: "iTaoBuy product research archive with category-specific evidence fields",
    navLabel: "iTaoBuy research archive",
    boundaryTitle: "Keep every category record attached to its current source.",
    boundaryDescription:
      "Category labels organize discovery. Exact options, visible evidence, prices, stock, seller details and service terms still require a current source check.",
  },
  "usfansindex.net": {
    variant: "source",
    officialUrl: "https://www.usfans.com",
    officialLabel: "Open USFans",
    heroImage: "/images/agents/usfans.png",
    heroAlt: "USFans category research record",
    navLabel: "USFans source checks",
    boundaryTitle: "A category narrows the candidate set but does not verify an item.",
    boundaryDescription:
      "Reopen the current source for product identity, selected option, visible evidence, price and availability before comparing an external route.",
  },
  "acbuyindex.com": {
    variant: "source",
    officialUrl: "https://acbuy.com",
    officialLabel: "Open ACBuy",
    heroImage: "/tenants/acbuy/hero-desktop.webp",
    heroAlt: "ACBuy product research workspace",
    navLabel: "ACBuy research pages",
    boundaryTitle: "Confirm changing details at the destination.",
    boundaryDescription:
      "Prices, options, fees, service availability, restrictions and delivery terms can change. This page records a research method, not a transaction promise.",
  },
  "allchinabuyindex.com": {
    variant: "ledger",
    officialUrl: "https://www.allchinabuy.com/en/",
    officialLabel: "Open AllChinaBuy",
    heroImage: "/tenants/allchinabuy/hero-desktop.webp",
    heroAlt: "AllChinaBuy research ledger background",
    navLabel: "AllChinaBuy index records",
    boundaryTitle: "Keep the evidence trail attached to the decision.",
    boundaryDescription:
      "Product claims, warehouse records, route availability and destination rules can change at different times. Preserve the source and date for each check.",
  },
  "allchinabuyfinder.com": {
    variant: "finder",
    officialUrl: "https://www.allchinabuy.com/en/",
    officialLabel: "Open AllChinaBuy",
    heroImage: "/tenants/allchinabuyfinder/hero-desktop.webp",
    heroAlt: "AllChinaBuy product finder workspace",
    navLabel: "AllChinaBuy finder tools",
    boundaryTitle: "A useful query narrows the next check.",
    boundaryDescription:
      "Search results are discovery leads, not product verification. Confirm the exact variant, current source details and service terms before acting.",
  },
  "bbdbuyeufinds.com": {
    variant: "eu-finds",
    officialUrl: "https://www.bbdbuy.com/",
    officialLabel: "Open BBDbuy",
    heroImage: "/tenants/bbdbuyeufinds/hero-desktop.webp",
    heroAlt: "BBDbuy EU product discovery route",
    navLabel: "BBDbuy EU discovery routes",
    boundaryTitle: "Keep destination questions outside the product claim.",
    boundaryDescription:
      "Sizing, compatibility, restrictions, estimator inputs and route availability need current evidence from the relevant source. A product find does not answer them by itself.",
  },
  "bbdbuyeus.com": {
    variant: "us-parcel",
    officialUrl: "https://www.bbdbuy.com/",
    officialLabel: "Open BBDbuy",
    heroImage: "/tenants/bbdbuyeus/hero-desktop.webp",
    heroAlt: "BBDbuy US product and parcel planning record",
    navLabel: "BBDbuy US planning records",
    boundaryTitle: "Do not calculate a US parcel from the catalog card.",
    boundaryDescription:
      "Use current warehouse measurements, selected packaging, item restrictions and live route terms. Listing prices and estimated product weights are not delivered costs.",
  },
  "bbdbuyeusheet.com": {
    variant: "sheet",
    officialUrl: "https://www.bbdbuy.com/",
    officialLabel: "Open BBDbuy",
    heroImage: "/tenants/bbdbuyeusheet/hero-desktop.webp",
    heroAlt: "BBDbuy EU product research sheet",
    navLabel: "BBDbuy EU sheet references",
    boundaryTitle: "Leave incomplete fields visible.",
    boundaryDescription:
      "A blank or unresolved field is more useful than an assumption. Reopen the current source before using availability, price, option or service information in a decision.",
  },
  "cssbuyitems.com": {
    variant: "item-check",
    officialUrl: "https://www.cssbuy.com/",
    officialLabel: "Open CSSBuy",
    heroImage: "/tenants/cssbuyitems/hero-desktop.webp",
    heroAlt: "CSSBuy item link review workspace",
    navLabel: "CSSBuy item review pages",
    boundaryTitle: "A link is useful only while its evidence is current.",
    boundaryDescription:
      "Reopen the source before using price, stock, options or seller details. Product, account, forwarding and destination questions require the current source responsible for each fact.",
  },
  "cssbuyindex.com": {
    variant: "query-index",
    officialUrl: "https://www.cssbuy.com/",
    officialLabel: "Open CSSBuy",
    heroImage: "/tenants/cssbuy/hero-desktop.webp",
    heroAlt: "CSSBuy query and evidence index",
    navLabel: "CSSBuy research index",
    boundaryTitle: "Keep the query, source and decision together.",
    boundaryDescription:
      "Search results are candidates. Preserve the exact query and current source, then mark missing product, cost or route evidence before continuing.",
  },
  "cssbuycatalog.com": {
    variant: "catalog-map",
    officialUrl: "https://www.cssbuy.com/",
    officialLabel: "Open CSSBuy",
    heroImage: "/tenants/cssbuycatalog/hero-desktop.webp",
    heroAlt: "CSSBuy category catalog map",
    navLabel: "CSSBuy catalog references",
    boundaryTitle: "Browse broadly, verify narrowly.",
    boundaryDescription:
      "A category helps discovery but does not verify a product, seller, route or destination outcome. Confirm changing details on the current source before acting.",
  },
  "kakobuyindex.net": {
    variant: "shortlist",
    officialUrl: "https://kakobuy.com/",
    officialLabel: "Open Kakobuy",
    heroImage: "/tenants/kakobuyindex/hero-desktop.webp",
    heroAlt: "Kakobuy shortlist research horizon",
    navLabel: "Kakobuy shortlist records",
    boundaryTitle: "A shortlist is a review record, not a product endorsement.",
    boundaryDescription:
      "Reopen every retained source before acting. Price, stock, options, seller details, service terms and routes can change after the shortlist was recorded.",
  },
  "kakobuyitems.com": {
    variant: "item-file",
    officialUrl: "https://kakobuy.com/",
    officialLabel: "Open Kakobuy",
    heroImage: "/tenants/kakobuyitems/hero-desktop.webp",
    heroAlt: "Kakobuy item evidence workspace",
    navLabel: "Kakobuy item evidence files",
    boundaryTitle: "Keep each product claim attached to its current source.",
    boundaryDescription:
      "An item file records visible evidence and open questions. It does not authenticate a product or guarantee seller, price, stock, service or delivery outcomes.",
  },
  "litbuyindex.com": {
    variant: "query-index",
    officialUrl: "https://www.litbuy.com/",
    officialLabel: "Open LitBuy",
    heroImage: "/tenants/litbuyindex/hero-index.svg",
    heroAlt: "LitBuy query index with retained and unresolved research rows",
    navLabel: "LitBuy index records",
    boundaryTitle: "Refresh the source before reusing an indexed result.",
    boundaryDescription:
      "The index preserves a query and review note. Current products, options, prices, seller details, service terms and route availability remain external checks.",
  },
  "litbuyitems.com": {
    variant: "item-file",
    officialUrl: "https://www.litbuy.com/",
    officialLabel: "Open LitBuy",
    heroImage: "/tenants/litbuyitems/hero-jacket.webp",
    heroAlt: "LitBuy item evidence example focused on one outerwear option",
    navLabel: "LitBuy item files",
    boundaryTitle: "An item file documents evidence, not an outcome.",
    boundaryDescription:
      "Match images, measurements and visible claims to the intended variation, then confirm current transaction, warehouse and route details with the responsible source.",
  },
  "litbuyproducts.com": {
    variant: "catalog-map",
    officialUrl: "https://www.litbuy.com/",
    officialLabel: "Open LitBuy",
    heroImage: "/tenants/litbuyproducts/hero-electronics.webp",
    heroAlt: "LitBuy electronics category map with product-specific comparison cues",
    navLabel: "LitBuy catalog routes",
    boundaryTitle: "A category defines the comparison, not the conclusion.",
    boundaryDescription:
      "Use category fields to discover comparable listings, then reopen the current source for the exact product, variation and changing service information.",
  },
  "loongbuys.net": {
    variant: "item-check",
    officialUrl: "https://www.loongbuy.com/",
    officialLabel: "Open LoongBuy",
    heroImage: "/tenants/loongbuys/hero-route.svg",
    heroAlt: "LoongBuy evidence route from source link to parcel decision",
    navLabel: "LoongBuy evidence guides",
    boundaryTitle: "Use the record created at the relevant stage.",
    boundaryDescription:
      "A product page cannot confirm what arrived, and an early weight estimate cannot confirm a parcel route. Recheck the current source, warehouse record and shipping terms separately.",
  },
  "lovegobuyindex.com": {
    variant: "catalog-map",
    officialUrl: "https://lovegobuy.com/pc/",
    officialLabel: "Open LoveGoBuy",
    heroImage: "/tenants/lovegobuy/hero-order-board.svg",
    heroAlt: "LoveGoBuy category and current-order-stage research board",
    navLabel: "LoveGoBuy research pages",
    boundaryTitle: "Match the question to the current order stage.",
    boundaryDescription:
      "Catalog pages support discovery. Product sources, order records, warehouse evidence and service policies answer different questions and can change on different dates.",
  },
  "mulebuyindex.net": {
    variant: "query-index",
    officialUrl: "https://mulebuy.com/help/help-center/",
    officialLabel: "Open MuleBuy Help Center",
    heroImage: "/tenants/mulebuyindex/hero-shoes.webp",
    heroAlt: "Purple shoes representing a MuleBuy category and spreadsheet query",
    navLabel: "MuleBuy index records",
    boundaryTitle: "A spreadsheet row is a research lead, not a current product fact.",
    boundaryDescription:
      "Reopen the source and match the intended variation before retaining a row. Price, availability, seller context, service terms and route details can change independently.",
  },
  "mulebuyitems.com": {
    variant: "item-file",
    officialUrl: "https://mulebuy.com/",
    officialLabel: "Open MuleBuy",
    heroImage: "/tenants/mulebuyitems/hero-outerwear.webp",
    heroAlt: "MuleBuy item evidence review focused on outerwear construction",
    navLabel: "MuleBuy item evidence files",
    boundaryTitle: "An item file preserves visible evidence and open questions.",
    boundaryDescription:
      "Listing and warehouse images do not authenticate a product or guarantee performance, seller, price, service or delivery outcomes. Keep each claim attached to its source and date.",
  },
  "oopbuyindex.net": {
    variant: "query-index",
    officialUrl: "https://oopbuy.com/",
    officialLabel: "Open Oopbuy",
    heroImage: "/tenants/oopbuyindex/hero-score.svg",
    heroAlt: "Oopbuy product link scorecard with source, option, evidence and route checks",
    navLabel: "Oopbuy link review pages",
    boundaryTitle: "A score documents the current review, not the product outcome.",
    boundaryDescription:
      "Reopen the source and current service records before acting. Price, availability, options, seller details, QC evidence and route terms can change independently.",
  },
  "orientdigindex.com": {
    variant: "ledger",
    officialUrl: "https://orientdig.com/",
    officialLabel: "Open OrientDig",
    heroImage: "/tenants/orientdigindex/hero-category.webp",
    heroAlt: "Shoes, bag and hoodie arranged for an OrientDig category evidence comparison",
    navLabel: "OrientDig evidence records",
    boundaryTitle: "Score only evidence that another reviewer can reopen.",
    boundaryDescription:
      "A spreadsheet label, image or old result does not establish current product, service or route facts. Retain the source, date, exact option and unresolved fields.",
  },
  "parcelupindex.com": {
    variant: "source",
    officialUrl: "https://parcelup.com/",
    officialLabel: "Open Parcel Up",
    heroImage: "/tenants/parcelupindex/hero-packages.webp",
    heroAlt: "Parcel boxes surrounding space for a Parcel Up order and shipping record",
    navLabel: "Parcel Up order guides",
    boundaryTitle: "Keep product, warehouse and parcel evidence in separate stages.",
    boundaryDescription:
      "The original listing supports the requested option, the warehouse record supports what arrived and the measured parcel supports the current shipping decision.",
  },
  "sugargooindex.net": {
    variant: "source",
    officialUrl: "https://www.sugargoo.com/",
    officialLabel: "Open Sugargoo",
    heroImage: "/tenants/sugargooindex/hero-shoes.webp",
    heroAlt: "Footwear used as a category-specific Sugargoo product and QC evidence example",
    navLabel: "Sugargoo evidence guides",
    boundaryTitle: "A product source, QC record and parcel estimate answer different questions.",
    boundaryDescription:
      "Reopen the current listing for product facts, use warehouse evidence for the received item and use measured package inputs with current route terms for shipping decisions.",
  },
  "superbuydeals.com": {
    variant: "ledger",
    officialUrl: "https://www.superbuy.com/",
    officialLabel: "Open Superbuy",
    heroImage: "/tenants/superbuydeals/hero-offers.webp",
    heroAlt: "Product category grid behind a Superbuy offer verification ledger",
    navLabel: "Superbuy offer records",
    boundaryTitle: "An offer label is not evidence that the offer still applies.",
    boundaryDescription:
      "Confirm the current source, review date, eligibility, scope, expiry and checkout result. Keep product, domestic delivery, service and international shipping charges separate.",
  },
  "superbuyindex.com": {
    variant: "query-index",
    officialUrl: "https://www.superbuy.com/",
    officialLabel: "Open Superbuy",
    heroImage: "/tenants/superbuyindex/hero-query.webp",
    heroAlt: "Superbuy category sprite organized as a structured query index",
    navLabel: "Superbuy index records",
    boundaryTitle: "An indexed row remains a lead until its current source is reopened.",
    boundaryDescription:
      "Search results can repeat or age. Preserve the query, destination, intended option, review date and unresolved evidence before retaining a row.",
  },
  "superbuyitems.com": {
    variant: "item-file",
    officialUrl: "https://www.superbuy.com/",
    officialLabel: "Open Superbuy",
    heroImage: "/tenants/superbuyitems/hero-categories.webp",
    heroAlt: "Product categories arranged for a Superbuy item evidence review",
    navLabel: "Superbuy item files",
    boundaryTitle: "A product page and warehouse record are separate evidence layers.",
    boundaryDescription:
      "Match the exact option to the current listing, then compare received-item photos and measurements without treating either layer as proof of authenticity or performance.",
  },
  "eastmallbuyindex.com": {
    variant: "shortlist",
    officialUrl: "https://www.eastmallbuy.com/",
    officialLabel: "Open EastMallBuy",
    heroImage: "/tenants/eastmallbuy/hero-desktop.webp",
    heroAlt: "Sunrise landscape behind an EastMallBuy shortlist review",
    navLabel: "EastMallBuy research guides",
    boundaryTitle: "Separate platform service evidence from seller and product claims.",
    boundaryDescription:
      "EastMallBuy publishes help and inspection rules, but a listing, community post or referral mention cannot establish current product quality, offer eligibility, route availability or delivery outcome. Recheck the responsible source.",
  },
  "fishgooindex.com": {
    variant: "query-index",
    officialUrl: "https://www.fishgoo.com/",
    officialLabel: "Open Fishgoo",
    heroImage: "/tenants/fishgoo/hero-desktop.webp",
    heroAlt: "Ocean horizon representing Fishgoo query and source research",
    navLabel: "Fishgoo spreadsheet research guides",
    boundaryTitle: "Use a spreadsheet row as a lead, not a current product promise.",
    boundaryDescription:
      "Reopen the product source, match the intended option and use current warehouse or route records for later stages. Price, stock, seller details, service terms and shipping inputs can change independently.",
  },
  "boonbuyfind.net": {
    variant: "source",
    officialUrl: "https://boonbuy.com/",
    officialLabel: "Open BoonBuy",
    heroImage: "/tenants/boonbuyfind/hero-desktop.webp",
    heroAlt: "BoonBuy product discovery and delivery illustration",
    navLabel: "BoonBuy discovery guides",
    boundaryTitle: "Discovery is not a current product or delivery promise.",
    boundaryDescription:
      "BoonBuy currently describes product search, assisted purchasing, warehouse receiving, QC images, consolidation and shipping. Recheck its current service and the original seller source before acting.",
  },
  "boonbuyindex.com": {
    variant: "query-index",
    officialUrl: "https://boonbuy.com/",
    officialLabel: "Open BoonBuy",
    heroImage: "/tenants/boonbuyindex/hero-index.svg",
    heroAlt: "BoonBuy query index with source, option and review fields",
    navLabel: "BoonBuy index records",
    boundaryTitle: "An indexed result remains a lead until its current source is reopened.",
    boundaryDescription:
      "Search results can repeat, expire or point to different options. Retain the query, current source, intended option, review date and unresolved field without presenting the row as a verified product or service promise.",
  },
  "cnshopperindex.com": {
    variant: "catalog-map",
    officialUrl: "https://cnshopper.com/",
    officialLabel: "Open CNShopper",
    heroImage: "/tenants/cnshopper/hero.jpg",
    heroAlt: "CNShopper category map for a product-to-order research handoff",
    navLabel: "CNShopper catalog research pages",
    boundaryTitle: "A category supports discovery; each later handoff needs its own evidence.",
    boundaryDescription:
      "Reopen the seller source for product facts, use the selected order record for the requested option and use current warehouse or parcel records for later decisions. Do not merge those stages into one catalog claim.",
  },
  "goatedbuyindex.com": {
    variant: "shortlist",
    officialUrl: "https://goatedbuy.com/",
    officialLabel: "Open GoatedBuy",
    heroImage: "/tenants/goatedbuy/hero-desktop.webp",
    heroAlt: "Forest lake representing a focused GoatedBuy shortlist",
    navLabel: "GoatedBuy shortlist guides",
    boundaryTitle: "A score ranks research completeness, not product quality.",
    boundaryDescription:
      "Use relevance, source access, option clarity and evidence date to decide what stays. Do not turn the score into authenticity, seller reliability or delivery claims.",
  },
  "gtbuyindex.com": {
    variant: "query-index",
    officialUrl: "https://www.gtbuy.com/",
    officialLabel: "Open GTBuy",
    heroImage: "/tenants/gtbuy/hero-desktop.webp",
    heroAlt: "Earth horizon representing a GTBuy query and source record",
    navLabel: "GTBuy query records",
    boundaryTitle: "Keep the query and source attached to every retained row.",
    boundaryDescription:
      "A GTBuy-linked result remains a lead until the current source, exact option and product-specific evidence have been checked. Service and route facts require current GTBuy records.",
  },
  "hipobuyindex.com": {
    variant: "item-file",
    officialUrl: "https://hipobuy.com/",
    officialLabel: "Open Hipobuy",
    heroImage: "/tenants/hipobuy/hero-desktop.webp",
    heroAlt: "Violet mountain horizon representing a Hipobuy source trail",
    navLabel: "Hipobuy item evidence files",
    boundaryTitle: "QC images and marketplace listings answer different questions.",
    boundaryDescription:
      "Hipobuy publicly presents search with QC photos. Keep the requested source and option beside received-item images, and do not treat either layer as automatic proof of identity, materials or performance.",
  },
  "hoobuyindex.net": {
    variant: "item-check", officialUrl: "https://hoobuy.com/", officialLabel: "Open HooBuy",
    heroImage: "/tenants/hoobuy/hero-desktop.webp", heroAlt: "Sunrise representing a HooBuy product-to-route evidence gate",
    navLabel: "HooBuy evidence guides", boundaryTitle: "HooBuy links to third-party sellers; the listing is not a HooBuy product guarantee.",
    boundaryDescription: "HooBuy currently states that assisted-purchase products come from third-party platforms and that it cannot determine quality or authenticity. Keep seller, service and parcel evidence separate.",
  },
  "joyabuyfinds.com": {
    variant: "finder", officialUrl: "https://joyagoo.com/", officialLabel: "Open JoyaGoo",
    heroImage: "/tenants/joyabuyfinds/hero-desktop.webp", heroAlt: "Twilight world representing JoyaGoo visual and category discovery",
    navLabel: "JoyaGoo discovery guides", boundaryTitle: "A find is a candidate until its source and option are checked.",
    boundaryDescription: "JoyaGoo publishes link, name and image search plus a later order and warehouse workflow. Keep discovery clues separate from current seller, service and route facts.",
  },
  "joyagooindex.com": {
    variant: "ledger", officialUrl: "https://joyagoo.com/", officialLabel: "Open JoyaGoo",
    heroImage: "/tenants/joyagoo/hero-desktop.webp", heroAlt: "Cosmic horizon representing dated JoyaGoo evidence stages",
    navLabel: "JoyaGoo process records", boundaryTitle: "Source, order, QC and parcel records change at different times.",
    boundaryDescription: "JoyaGoo publishes a staged workflow from search and order to warehouse QC, consolidation and international shipping. Preserve dates and do not turn estimates into final outcomes.",
  },
  "kameymallindex.com": {
    variant: "catalog-map", officialUrl: "https://www.kameymall.com/", officialLabel: "Open KameyMall",
    heroImage: "/tenants/kameymall/hero-desktop.webp", heroAlt: "Colorful world representing KameyMall category orientation",
    navLabel: "KameyMall category guides", boundaryTitle: "Historical QC and catalog fields remain evidence to recheck.",
    boundaryDescription: "KameyMall publishes product search, QC, warehouse and parcel workflows. Reopen current sources and use actual parcel measurements rather than old forum claims or catalog estimates.",
  },
  "ydaexpress.net": {
    variant: "us-parcel",
    officialUrl: "https://www.ydaexpress.com/",
    officialLabel: "Check YDA Express",
    heroImage: "/tenants/ydaexpress-net/hero-parcel.svg",
    heroAlt: "Parcel preparation board with contents, measurements and route questions",
    navLabel: "YDA parcel preparation guides",
    boundaryTitle: "A prepared parcel record does not guarantee a route or delivered result.",
    boundaryDescription:
      "Service availability, restrictions, prices, carrier terms and timing can change. Confirm current transaction details on ydaexpress.com and keep carrier events separate from warehouse estimates.",
  },
  "ydaexpress.org": {
    variant: "ledger",
    officialUrl: "https://www.ydaexpress.com/",
    officialLabel: "Review the official source",
    heroImage: "/tenants/ydaexpress-org/hero-sources.svg",
    heroAlt: "Dated source review ledger for service, terms, quote and tracking evidence",
    navLabel: "YDA service evidence reviews",
    boundaryTitle: "A published page is evidence for its date and scope, not a permanent promise.",
    boundaryDescription:
      "Reopen the official service page, terms and relevant quote or tracking source before relying on a changing detail. This independent archive does not operate YDA Express services.",
  },
  "yoybuyindex.com": {
    variant: "sheet",
    officialUrl: "https://www.yoybuy.com/",
    officialLabel: "Open YoyBuy",
    heroImage: "/tenants/yoybuy/hero-desktop.webp",
    heroAlt: "Warehouse conveyor and parcels representing a YoyBuy research handoff",
    navLabel: "YoyBuy spreadsheet guides",
    boundaryTitle: "A spreadsheet row is a research lead, not a verified product claim.",
    boundaryDescription:
      "YoyBuy publishes marketplace search, assisted purchase, warehouse and forwarding workflows. Keep the third-party seller source, requested option, warehouse evidence and international parcel terms as separate dated records.",
  },
};

const EASTMALLBUY_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "eastmallbuyindex.com",
    slug: "guide",
    seoTitle: "EastMallBuy Guide | From Product Source to Parcel Check",
    description:
      "Use an EastMallBuy research sequence that separates product source, exact option, warehouse inspection evidence, parcel inputs and current route terms.",
    eyebrow: "EastMallBuy checking sequence",
    title: "Move from listing to parcel without collapsing the evidence stages.",
    intro:
      "EastMallBuy publishes purchasing, forwarding, inspection and freight help. Use the current service for those stages and keep seller claims separate.",
    sections: [
      {
        title: "Source and order",
        description:
          "Save the current product page, seller context, intended option and visible product claims before submitting an order.",
      },
      {
        title: "Inspection record",
        description:
          "Compare received quantity, color, size and visible appearance while respecting the published limits of inspection.",
      },
      {
        title: "Parcel and route",
        description:
          "Use measured package data, contents, destination and current route rules instead of a catalog estimate.",
      },
    ],
  },
  {
    domain: "eastmallbuyindex.com",
    slug: "categories",
    seoTitle: "EastMallBuy Spreadsheet Categories | Evidence by Product Type",
    description:
      "Browse EastMallBuy spreadsheet categories with product-specific fields for apparel, footwear, bags, accessories and electronics research.",
    eyebrow: "EastMallBuy category map",
    title: "Change the evidence checklist when the product category changes.",
    intro:
      "A category becomes useful when it identifies the measurements, specifications and close views needed for a meaningful comparison.",
    sections: [
      {
        title: "Apparel and footwear",
        description:
          "Record labeled sizing, garment or foot measurements, materials, construction details and the intended option.",
      },
      {
        title: "Bags and accessories",
        description:
          "Check dimensions, compartments, closures, hardware, straps, finish and included pieces.",
      },
      {
        title: "Electronics and devices",
        description:
          "Confirm model, voltage, plug, interfaces, language, battery, compatibility and route-sensitive contents.",
      },
    ],
  },
  {
    domain: "eastmallbuyindex.com",
    slug: "spreadsheet",
    seoTitle: "EastMallBuy Spreadsheet Guide | Check Links Before Saving Rows",
    description:
      "Review an EastMallBuy spreadsheet row for current source, exact variation, useful product evidence, duplicate control and a dated decision note.",
    eyebrow: "EastMallBuy spreadsheet method",
    title: "Treat every spreadsheet row as a lead that must earn retention.",
    intro:
      "A useful row points to a current source and records enough product-specific evidence to support the next check.",
    sections: [
      {
        title: "Open the destination",
        description:
          "Confirm the final listing, seller context and intended option instead of trusting an old title or thumbnail.",
      },
      {
        title: "Check the evidence floor",
        description:
          "Require useful measurements, specifications, images or option details for the product type.",
      },
      {
        title: "Group or remove",
        description:
          "Group duplicate destinations and remove zero-price, broken, mismatched or unsupported rows from public indexing.",
      },
    ],
  },
  {
    domain: "eastmallbuyindex.com",
    slug: "reddit",
    seoTitle: "EastMallBuy Reddit Research | Read Community Posts as Evidence",
    description:
      "Evaluate EastMallBuy Reddit posts by date, order stage, destination, evidence type and unresolved context instead of treating anecdotes as a verdict.",
    eyebrow: "EastMallBuy community research",
    title: "Use Reddit posts to form questions, not to replace current evidence.",
    intro:
      "Community reports may describe different products, dates, routes and support cases. Preserve that context before comparing them.",
    sections: [
      {
        title: "Record the date and stage",
        description:
          "Separate ordering, inspection, storage, parcel, customs and delivery experiences because each stage has different evidence.",
      },
      {
        title: "Look for reopenable proof",
        description:
          "Prefer posts with visible order records, tracking context, timestamps or clearly described support interactions.",
      },
      {
        title: "Check the current rule",
        description:
          "Use present EastMallBuy help pages for current service terms and treat old posts as dated observations.",
      },
    ],
  },
  {
    domain: "eastmallbuyindex.com",
    slug: "legit",
    seoTitle: "Is EastMallBuy Legit? Independent Evidence Checklist",
    description:
      "Assess EastMallBuy with current site access, published policies, account security, payment records, inspection scope, support channels and parcel evidence.",
    eyebrow: "EastMallBuy service review",
    title: "Replace a yes-or-no legitimacy label with checks you can repeat.",
    intro:
      "A platform-level review cannot verify every seller, product or route. Evaluate the service evidence and the exact transaction evidence separately.",
    sections: [
      {
        title: "Platform evidence",
        description:
          "Review current help, policies, contact paths, account controls and payment records on the live service.",
      },
      {
        title: "Order evidence",
        description:
          "Keep product source, payment, status changes, inspection records and support messages attached to the same order.",
      },
      {
        title: "Parcel evidence",
        description:
          "Use measured contents, submitted route, tracking and destination events for the specific parcel.",
      },
    ],
  },
  {
    domain: "eastmallbuyindex.com",
    slug: "referral-code",
    seoTitle: "EastMallBuy Referral Code Checks | Verify Eligibility and Terms",
    description:
      "Verify an EastMallBuy referral code or promotion by checking its current source, eligibility, scope, expiry, stacking rules and checkout result.",
    eyebrow: "EastMallBuy offer verification",
    title: "Do not publish a referral code until the current terms can be reopened.",
    intro:
      "This page does not claim an active code. It records the checks required before presenting any referral or promotion as current.",
    sections: [
      {
        title: "Find the responsible source",
        description:
          "Use a current EastMallBuy campaign or account page rather than a copied code without provenance.",
      },
      {
        title: "Read eligibility and scope",
        description:
          "Check account status, region, qualifying action, excluded charges, expiry and whether other offers can combine.",
      },
      {
        title: "Record the result",
        description:
          "Save the review date and checkout outcome, then remove expired or unverifiable claims from public pages.",
      },
    ],
  },
  {
    domain: "eastmallbuyindex.com",
    slug: "faq",
    seoTitle: "EastMallBuy FAQ | Spreadsheet, Inspection and Referral Research",
    description:
      "Read independent answers about EastMallBuy spreadsheets, inspection limits, Reddit research, service checks, referral codes and public indexing.",
    eyebrow: "EastMallBuy research questions",
    title: "Keep the source responsible for each EastMallBuy question clear.",
    intro:
      "The product seller, EastMallBuy service, warehouse record, carrier and destination authority answer different parts of the workflow.",
    sections: [],
    questions: [
      {
        question: "Is this the official EastMallBuy site?",
        answer:
          "No. It is an independent research index. Use EastMallBuy for current account, order, inspection, forwarding and freight information.",
      },
      {
        question: "What does warehouse inspection establish?",
        answer:
          "Use it for the visible checks and limits stated in the current EastMallBuy inspection policy, not as proof of every product property.",
      },
      {
        question: "Is a referral code shown here?",
        answer:
          "No active code is claimed. Any future offer must have a current source, terms, review date and verified result before publication.",
      },
    ],
  },
];

const FISHGOO_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "fishgooindex.com",
    slug: "guide",
    seoTitle: "Fishgoo Guide | Spreadsheet, QC and Parcel Research",
    description:
      "Use a Fishgoo spreadsheet guide that separates product discovery, exact option checks, warehouse QC evidence, consolidation and route research.",
    eyebrow: "Fishgoo research workflow",
    title: "Follow the evidence from product link to measured parcel.",
    intro:
      "Fishgoo describes a link-to-warehouse-to-shipping workflow. Keep the record from each stage separate so later evidence does not overwrite the source listing.",
    sections: [
      {
        title: "Product source",
        description:
          "Save the current marketplace page, seller context, exact option, visible price and product-specific claims.",
      },
      {
        title: "Warehouse QC",
        description:
          "Compare received quantity, option and visible condition with the saved product record and note missing views.",
      },
      {
        title: "Consolidation and route",
        description:
          "Use current packed measurements, contents, destination and available service terms for parcel decisions.",
      },
    ],
  },
  {
    domain: "fishgooindex.com",
    slug: "categories",
    seoTitle: "Fishgoo Spreadsheet Categories | Product-Specific Search Fields",
    description:
      "Browse Fishgoo spreadsheet categories with distinct sizing, materials, dimensions, construction, specification and compatibility evidence.",
    eyebrow: "Fishgoo category search map",
    title: "Use category-specific fields to create comparable Fishgoo leads.",
    intro:
      "A generic card is thin evidence. Add the product fields that change selection, inspection or later parcel questions.",
    sections: [
      {
        title: "Clothing and footwear",
        description:
          "Record labeled sizes, measurements, materials, construction details and the exact variation being considered.",
      },
      {
        title: "Bags and accessories",
        description:
          "Record dimensions, compartments, closure, hardware, straps, finish and included pieces.",
      },
      {
        title: "Electronics",
        description:
          "Record model, voltage, plug, interfaces, language, battery, compatibility and route-sensitive contents.",
      },
    ],
  },
  {
    domain: "fishgooindex.com",
    slug: "fishgoo-checklist",
    seoTitle: "Fishgoo Spreadsheet Checklist | Product Link Quality Gate",
    description:
      "Check a Fishgoo spreadsheet link for a working source, exact option, useful visible evidence, duplicate grouping, nonzero price and review date.",
    eyebrow: "Fishgoo row quality gate",
    title: "Do not let an automatically collected Fishgoo row enter search by default.",
    intro:
      "A public row needs a current destination, identifiable product and product-specific value beyond a repeated title and image.",
    sections: [
      {
        title: "Source and option",
        description:
          "Require a working destination and a clear intended color, size, model, set or quantity.",
      },
      {
        title: "Evidence and uniqueness",
        description:
          "Require useful measurements, specifications, close views or comparison notes that are specific to the item.",
      },
      {
        title: "Exclusion rules",
        description:
          "Remove broken images, zero prices, duplicate rows, mismatched links, thin copy and unsupported claims.",
      },
    ],
  },
  {
    domain: "fishgooindex.com",
    slug: "search-ideas",
    seoTitle: "Fishgoo Search Ideas | Spreadsheet and Product Queries",
    description:
      "Build Fishgoo product queries with category, exact item, model, variation, measurement, material, specification and source clues.",
    eyebrow: "Fishgoo query design",
    title: "Choose a broad, exact or visual search according to what you know.",
    intro:
      "Search intent should determine the query. The destination page still supplies the current product and seller evidence.",
    sections: [
      {
        title: "Category exploration",
        description:
          "Start with a product family and add one field that makes the results meaningfully comparable.",
      },
      {
        title: "Known product",
        description:
          "Combine the item type with model, intended variation and one decisive measurement or specification.",
      },
      {
        title: "Visual intent",
        description:
          "Use image search to discover candidates, then verify every retained result on its current source page.",
      },
    ],
  },
  {
    domain: "fishgooindex.com",
    slug: "shipping",
    seoTitle: "Fishgoo Shipping Research | Weight, Consolidation and Route Inputs",
    description:
      "Prepare Fishgoo shipping research with received-item measurements, consolidation choices, packed dimensions, contents, destination and current route terms.",
    eyebrow: "Fishgoo parcel inputs",
    title: "Estimate shipping only after the item becomes a measured parcel.",
    intro:
      "A product price or seller weight cannot establish the final chargeable parcel, eligible route, customs result or delivery date.",
    sections: [
      {
        title: "Received items",
        description:
          "Use warehouse-recorded weight, dimensions, quantity and restriction-relevant contents where available.",
      },
      {
        title: "Packed parcel",
        description:
          "Record consolidation, removed or retained packaging and services that change the finished measurements.",
      },
      {
        title: "Current route",
        description:
          "Confirm calculation, restrictions, tracking and destination rules with the responsible current sources.",
      },
    ],
  },
  {
    domain: "fishgooindex.com",
    slug: "safety",
    seoTitle: "Is Fishgoo Safe and Legit? Independent Research Checklist",
    description:
      "Assess Fishgoo with current platform access, published help, account security, payment records, QC evidence, support paths and parcel documentation.",
    eyebrow: "Fishgoo service evidence",
    title: "Evaluate Fishgoo through repeatable checks, not a single rating.",
    intro:
      "Platform service evidence, seller claims, received-item records and destination outcomes are separate questions with separate sources.",
    sections: [
      {
        title: "Service evidence",
        description:
          "Review current site access, help content, policies, account controls, payment records and support paths.",
      },
      {
        title: "Product and QC evidence",
        description:
          "Keep the original source, intended option and received-item images together without unsupported identity claims.",
      },
      {
        title: "Parcel evidence",
        description:
          "Use submitted contents, route record, tracking and destination events for the exact shipment being assessed.",
      },
    ],
  },
  {
    domain: "fishgooindex.com",
    slug: "faq",
    seoTitle: "Fishgoo FAQ | Spreadsheet, QC, Shipping and Safety Research",
    description:
      "Read independent answers about Fishgoo spreadsheets, product links, QC photo limits, consolidation, shipping inputs, safety and public indexing.",
    eyebrow: "Fishgoo research questions",
    title: "Know which Fishgoo evidence layer answers the current question.",
    intro:
      "The product source, Fishgoo service record, warehouse evidence, parcel record and destination rules can change at different times.",
    sections: [],
    questions: [
      {
        question: "Is this the official Fishgoo site?",
        answer:
          "No. It is an independent product and spreadsheet research index. Use Fishgoo for current accounts, orders, warehouse and shipping services.",
      },
      {
        question: "Can QC images replace the product source?",
        answer:
          "No. Keep both layers: the source records the requested option and QC images record visible aspects of the received item.",
      },
      {
        question: "Why are some collected rows not indexed?",
        answer:
          "Rows stay out when the source, exact option, images, price, uniqueness or product-specific research value has not passed review.",
      },
    ],
  },
];

const ACBUY_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "acbuyindex.com",
    slug: "directory",
    seoTitle: "ACBuy Product Directory | Category Search Routes",
    description:
      "Browse ACBuy-linked product categories and build a focused query with the measurements, materials, model details and source evidence worth checking.",
    eyebrow: "ACBuy category directory",
    title: "Start with the product type, then add one useful constraint.",
    intro:
      "A category is only the starting point. Add the field that makes two listings meaningfully comparable before opening a source.",
    sections: [
      {
        title: "Shoes and sneakers",
        description:
          "Search for size charts, insole length, materials, version wording and close construction photos.",
      },
      {
        title: "Hoodies and shirts",
        description:
          "Compare garment measurements, fabric notes, print placement, tags and care information.",
      },
      {
        title: "Jackets and outerwear",
        description:
          "Review shell and lining materials, closures, insulation, pockets and likely packed volume.",
      },
      {
        title: "Pants and shorts",
        description:
          "Check waist, rise, inseam, leg opening, stretch, fabric, wash and hardware.",
      },
      {
        title: "Bags",
        description:
          "Confirm dimensions, interior layout, hardware, closures, straps and included accessories.",
      },
      {
        title: "Watches",
        description:
          "Compare case dimensions, dial details, clasp, stated movement and packaging without treating claims as verified.",
      },
      {
        title: "Accessories",
        description:
          "Check scale, stated material, finish, closures, packaging and included pieces.",
      },
      {
        title: "Electronics",
        description:
          "Confirm the model, voltage, plug, interface language, compatibility, battery and route restrictions.",
      },
    ],
  },
  {
    domain: "acbuyindex.com",
    slug: "platform-guide",
    seoTitle: "How ACBuy Works | Independent Platform Research Guide",
    description:
      "Understand where product research ends and the ACBuy account, order, warehouse, parcel and shipping workflow begins.",
    eyebrow: "ACBuy workflow guide",
    title: "Keep product discovery separate from the transaction workflow.",
    intro:
      "Use the index to organize product evidence. Confirm account, payment, warehouse, parcel and route terms on the current ACBuy service.",
    sections: [
      {
        title: "Identify the source listing",
        description:
          "Save the product URL, seller context, intended option, visible price and images before continuing.",
      },
      {
        title: "Match the order fields",
        description:
          "Compare color, size, model, material, quantity and set contents with the destination form.",
      },
      {
        title: "Review warehouse evidence",
        description:
          "Use the measurements, photos and notes provided after arrival to check the ordered option.",
      },
      {
        title: "Build the parcel",
        description:
          "Confirm selected items, recorded measurements, restrictions and available services before parcel submission.",
      },
      {
        title: "Confirm the route",
        description:
          "Review current availability, fees, restrictions and destination requirements on the official service.",
      },
    ],
  },
  {
    domain: "acbuyindex.com",
    slug: "category-research",
    seoTitle: "ACBuy Category Research | Product Evidence by Type",
    description:
      "Use product-type research notes for clothing, shoes, bags, watches, accessories and electronics before comparing ACBuy-linked listings.",
    eyebrow: "Product evidence by category",
    title: "Ask for the evidence that fits the product.",
    intro:
      "A thumbnail and headline are not enough. Each category needs its own measurements, detail photos, specifications and restriction checks.",
    sections: [
      {
        title: "Apparel measurements",
        description:
          "Compare chest, shoulder, sleeve, length, waist, rise and inseam against a known item.",
      },
      {
        title: "Footwear measurements",
        description:
          "Use insole or outsole length, width, material and construction details instead of a size label alone.",
      },
      {
        title: "Bag construction",
        description:
          "Record exterior and interior dimensions, compartments, closures, hardware, straps and included pieces.",
      },
      {
        title: "Watch specifications",
        description:
          "Compare case size, thickness, lug width, clasp, dial details and stated movement on like-for-like variants.",
      },
      {
        title: "Accessory contents",
        description:
          "Check material, finish, closure, scale and everything included with the selected option.",
      },
      {
        title: "Electronics compatibility",
        description:
          "Confirm model, plug, voltage, language, network support, battery information and destination compatibility.",
      },
    ],
  },
  {
    domain: "acbuyindex.com",
    slug: "safety-research",
    seoTitle: "ACBuy Safety Research | Product and Shipping Checklist",
    description:
      "Review source links, exact variants, product evidence, restricted-item questions, destination rules and final order fields before continuing.",
    eyebrow: "ACBuy evidence checklist",
    title: "Reduce avoidable uncertainty before an order.",
    intro:
      "This checklist records what can be checked. It cannot guarantee quality, authenticity, warehouse acceptance, customs clearance or delivery.",
    sections: [
      {
        title: "Open the original source",
        description:
          "Record the seller context, product URL, title, images, visible price and update date when available.",
      },
      {
        title: "Lock the exact variant",
        description:
          "Match color, size, model, material, set contents and quantity to the intended product.",
      },
      {
        title: "Request relevant evidence",
        description:
          "Use category-specific measurements and close photos that can test the product claim you care about.",
      },
      {
        title: "Check item restrictions",
        description:
          "Review current rules for batteries, liquids, powders, magnets, sharp items, food and branded goods.",
      },
      {
        title: "Review destination requirements",
        description:
          "Check current route information and relevant local authority guidance for the destination and item.",
      },
      {
        title: "Run the final review",
        description:
          "Match the product URL, variant, quantity, displayed costs and service notes before proceeding.",
      },
    ],
  },
  {
    domain: "acbuyindex.com",
    slug: "faq",
    seoTitle: "ACBuy Index FAQ | Search, Product Evidence and Scope",
    description:
      "Read clear answers about the independent ACBuy product index, source checks, product options, restrictions and external buying links.",
    eyebrow: "ACBuy research questions",
    title: "What the index can answer, and what still needs confirmation.",
    intro:
      "These answers explain the research boundary. Product, service, route and account details can change on the destination website.",
    sections: [],
    questions: [
      {
        question: "Is this the official ACBuy website?",
        answer:
          "No. This is an independent product research directory. Confirm account, order, warehouse and shipping information on acbuy.com.",
      },
      {
        question: "Does this site sell or ship products?",
        answer:
          "No. It organizes listing research and links to external services. Transactions do not take place on this domain.",
      },
      {
        question: "Are product prices and options verified?",
        answer:
          "Not automatically. Open the source and destination pages to confirm the selected variant, current price, availability and included items.",
      },
      {
        question: "Does a listing prove authenticity or quality?",
        answer:
          "No. Images, titles and seller descriptions are evidence to inspect, not independent certification or a product guarantee.",
      },
      {
        question: "How should sizing be checked?",
        answer:
          "Use category-specific measurements and compare them with an item you already own. Do not rely on the size label alone.",
      },
      {
        question: "Where should restricted-item rules be checked?",
        answer:
          "Use current ACBuy help and route information. Restrictions can vary by item, service and destination.",
      },
      {
        question: "Can this site predict customs or delivery outcomes?",
        answer:
          "No. Customs treatment, route availability and delivery depend on current rules, item details and destination conditions.",
      },
    ],
  },
];

const ALLCHINABUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "allchinabuyindex.com",
    slug: "categories",
    seoTitle: "AllChinaBuy Categories | Structured Research Directory",
    description:
      "Browse an AllChinaBuy category research directory and record the measurements, specifications, option details and source evidence relevant to each product type.",
    eyebrow: "AllChinaBuy category ledger",
    title: "Choose the product class, then preserve the right evidence.",
    intro:
      "A category route should reduce uncertainty, not create a copied catalog. Record the fields that will still matter when the listing or selected option changes.",
    sections: [
      {
        title: "Shoes and sneakers",
        description:
          "Record the size system, insole or foot measurement, materials, sole construction and selected option.",
      },
      {
        title: "Hoodies and shirts",
        description:
          "Keep garment measurements, fabric wording, print placement, option label and care details together.",
      },
      {
        title: "Jackets and outerwear",
        description:
          "Review lining, closure, insulation, measurements, season wording and likely packed volume.",
      },
      {
        title: "Pants and shorts",
        description:
          "Note waist method, rise, inseam, cut, stretch, fabric and the exact size selected.",
      },
      {
        title: "Bags",
        description:
          "Confirm dimensions, hardware, interior layout, closures, straps and included accessories.",
      },
      {
        title: "Watches",
        description:
          "Separate visible case and strap details from stated movement, function and material claims.",
      },
      {
        title: "Accessories and jewelry",
        description:
          "Record scale, stated material, finish, closure, selected set and everything shown as included.",
      },
      {
        title: "Electronics",
        description:
          "Check model, voltage, plug, battery, language, compatibility, included parts and route restrictions.",
      },
    ],
  },
  {
    domain: "allchinabuyindex.com",
    slug: "guide",
    seoTitle: "AllChinaBuy Guide | From Source Link to Parcel Plan",
    description:
      "Follow an independent AllChinaBuy research workflow from a traceable source and exact option through warehouse evidence, parcel planning and route confirmation.",
    eyebrow: "AllChinaBuy workflow record",
    title: "Move from a traceable source to a reviewable parcel plan.",
    intro:
      "Keep the purchase decision and shipping decision separate. Each needs its own evidence, open questions and current service checks.",
    sections: [
      {
        title: "Begin with a traceable source",
        description:
          "Save the seller URL, product title, selected option, visible price, images and review date.",
      },
      {
        title: "Record the intended selection",
        description:
          "Keep quantity, size, color, model, material and any instruction that changes what should be purchased.",
      },
      {
        title: "Separate purchase and shipping",
        description:
          "First decide whether the source and option match the intended item. Later decide whether the stored item and current route support shipping it.",
      },
      {
        title: "Use warehouse evidence",
        description:
          "Compare available photos, measured weight, dimensions, visible condition and included pieces with the original record.",
      },
      {
        title: "Recheck before submission",
        description:
          "Confirm current fees, restrictions, destination requirements and service availability on the official platform.",
      },
    ],
  },
  {
    domain: "allchinabuyindex.com",
    slug: "shipping-checklist",
    seoTitle: "AllChinaBuy Shipping Checklist | Parcel Decision Guide",
    description:
      "Use an AllChinaBuy parcel checklist for stored-item evidence, packaging requests, route eligibility, destination details and the final shipping record.",
    eyebrow: "Parcel decision checklist",
    title: "Build the parcel decision from recorded evidence.",
    intro:
      "Review the actual stored item and current route information before submission. A saved listing cannot replace warehouse or carrier records.",
    sections: [
      {
        title: "Match the stored item",
        description:
          "Confirm the source, option, size, color, model, quantity, visible condition and unresolved differences.",
      },
      {
        title: "Use measured records",
        description:
          "Keep warehouse weight and dimensions distinct from seller estimates and earlier assumptions.",
      },
      {
        title: "Define the packaging request",
        description:
          "Write specific requests for removal, retention, protection, reinforcement or consolidation only when they serve a clear purpose.",
      },
      {
        title: "Check route eligibility",
        description:
          "Review the real contents for batteries, liquids, powders, magnets, fragile parts and category restrictions.",
      },
      {
        title: "Review the destination record",
        description:
          "Confirm receiver details, address format, postal code and the current destination rules relevant to the parcel.",
      },
    ],
  },
  {
    domain: "allchinabuyindex.com",
    slug: "research-log",
    seoTitle: "AllChinaBuy Research Log | Listing and Warehouse Records",
    description:
      "Use an AllChinaBuy research log to separate source claims, selected options, warehouse evidence, unresolved questions and parcel decisions.",
    eyebrow: "Evidence and decision log",
    title: "Keep claims, observations and decisions in separate records.",
    intro:
      "A useful log shows what the source stated, what later evidence showed and which uncertainty still needs a current answer.",
    sections: [
      {
        title: "Source record",
        description:
          "Store the seller URL, search phrase, exact option, quantity, stated measurements, materials, functions and included pieces.",
      },
      {
        title: "Review snapshot",
        description:
          "Save the date and the images or notes that support the specific fields you relied on.",
      },
      {
        title: "Warehouse record",
        description:
          "Keep arrival identity, available photos, measured weight, dimensions and visible differences apart from seller claims.",
      },
      {
        title: "Open question",
        description:
          "Write the exact mismatch or missing detail that must be resolved before a return, exchange or shipping decision.",
      },
      {
        title: "Decision record",
        description:
          "Record the reason, supporting evidence, packaging instruction, chosen route and destination check instead of relying on memory.",
      },
    ],
  },
  {
    domain: "allchinabuyindex.com",
    slug: "regions",
    seoTitle: "AllChinaBuy Region Guide | Destination and Route Checks",
    description:
      "Plan an AllChinaBuy parcel by checking the complete destination, actual contents, current route availability, address format and relevant customs sources.",
    eyebrow: "Destination research record",
    title: "Make the destination part of the parcel research.",
    intro:
      "There is no universal route for every item and address. Check the complete destination, actual contents and current official information.",
    sections: [
      {
        title: "Use the complete destination",
        description:
          "Prepare the country or region, postal code, address format and receiver information before comparing routes.",
      },
      {
        title: "Describe the real contents",
        description:
          "Record product category, materials, batteries, liquids, powders, magnets, fragile parts, weight and dimensions.",
      },
      {
        title: "Separate route research",
        description:
          "Check current service availability, item restrictions and carrier conditions on the official platform.",
      },
      {
        title: "Separate customs research",
        description:
          "Use the destination authority for current import rules rather than treating an available route as clearance advice.",
      },
      {
        title: "Recheck at submission",
        description:
          "Confirm that the parcel record, destination and current service information still match before the final action.",
      },
    ],
  },
  {
    domain: "allchinabuyindex.com",
    slug: "faq",
    seoTitle: "AllChinaBuy Index FAQ | Sources, Records and Scope",
    description:
      "Read clear answers about the independent AllChinaBuy Index, source records, warehouse evidence, parcel research and changing platform terms.",
    eyebrow: "AllChinaBuy index questions",
    title: "Know which record answers each research question.",
    intro:
      "The index organizes a method. Current product, account, order, warehouse and shipping details must be checked at their source.",
    sections: [],
    questions: [
      {
        question: "Is this the official AllChinaBuy website?",
        answer:
          "No. This is an independent research index. Use the official AllChinaBuy website for accounts, orders, warehouse services, fees and shipping terms.",
      },
      {
        question: "Does this index copy a live product catalog?",
        answer:
          "No. It provides category, evidence and decision frameworks. Current listings and options need to be checked through live search and source pages.",
      },
      {
        question: "What belongs in a source record?",
        answer:
          "Keep the seller URL, product title, exact option, visible price, images, stated specifications and the date reviewed.",
      },
      {
        question: "What belongs in a warehouse record?",
        answer:
          "Keep the arrival identity, available photos, measured weight and dimensions, visible differences and unresolved questions.",
      },
      {
        question: "Can a route option predict customs clearance?",
        answer:
          "No. Route availability and customs treatment are separate questions. Check current platform information and the destination authority.",
      },
      {
        question: "Are quality or authenticity guaranteed?",
        answer:
          "No. Titles, images, seller descriptions and warehouse records are evidence to examine, not independent certification or a guarantee.",
      },
    ],
  },
];

const ALLCHINABUY_FINDER_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "allchinabuyfinder.com",
    slug: "categories",
    seoTitle: "AllChinaBuy Product Categories | Finder Directory",
    description:
      "Browse AllChinaBuy product categories and identify the measurements, materials, variant details and specifications that can improve each search.",
    eyebrow: "AllChinaBuy category atlas",
    title: "Choose the product family before building the query.",
    intro:
      "A category provides the vocabulary for a useful search. Add the visible or measurable detail that separates likely matches.",
    sections: [
      {
        title: "Footwear",
        description:
          "Try a shoe type plus color, upper material, sole shape, closure or measured fit detail.",
      },
      {
        title: "Tops and layers",
        description:
          "Use the garment type with fit, fabric weight, closure, neckline or a visible construction feature.",
      },
      {
        title: "Outerwear",
        description:
          "Combine jacket or coat type with material, lining, insulation, hood, closure or intended season.",
      },
      {
        title: "Bottoms",
        description:
          "Add cut, rise, length, fabric, wash or closure to pants, denim, shorts or skirt searches.",
      },
      {
        title: "Bags",
        description:
          "Use carry style, material, closure, shape, dimensions or strap type to narrow the result set.",
      },
      {
        title: "Watches",
        description:
          "Add case shape, dial color, strap or bracelet style, approximate size and stated function.",
      },
      {
        title: "Accessories",
        description:
          "Search the object first, then add material, finish, closure, dimensions or included pieces.",
      },
      {
        title: "Electronics",
        description:
          "Use the exact device or accessory type with model, connector, voltage, plug or compatibility requirement.",
      },
    ],
  },
  {
    domain: "allchinabuyfinder.com",
    slug: "finder-guide",
    seoTitle: "How to Find AllChinaBuy Products | Query Guide",
    description:
      "Follow a focused AllChinaBuy product discovery process: name the item, add one meaningful detail, review live results and verify the current source.",
    eyebrow: "Five-step finder route",
    title: "Turn a product idea into a query worth checking.",
    intro:
      "Describe the item plainly, add one detail that changes the result and refine only after reviewing what the current search returns.",
    sections: [
      {
        title: "Name the product family",
        description:
          "Begin with wording a listing is likely to use, such as running shoes, zip hoodie, shoulder bag, watch or charger.",
      },
      {
        title: "Add one distinguishing detail",
        description:
          "Choose a color, material, shape, connector or functional feature instead of several vague adjectives.",
      },
      {
        title: "Open current results",
        description:
          "Use the focused phrase to inspect live listings rather than relying on a copied or cached product list.",
      },
      {
        title: "Read the result carefully",
        description:
          "Review images, variants, measurements, specifications, source links and missing fields before keeping a candidate.",
      },
      {
        title: "Refine only when needed",
        description:
          "Add one stronger detail when results are broad. Remove the least important term when nothing useful appears.",
      },
    ],
  },
  {
    domain: "allchinabuyfinder.com",
    slug: "search-ideas",
    seoTitle: "AllChinaBuy Search Ideas | Product Query Patterns",
    description:
      "Build clearer AllChinaBuy product searches with product nouns, colors, materials, shapes, connectors and practical refinement patterns.",
    eyebrow: "AllChinaBuy query lab",
    title: "Make the query smaller, clearer and easier to refine.",
    intro:
      "Start with what the item is, add one useful attribute and remove wording that does not help identify the product.",
    sections: [
      {
        title: "Item plus color or finish",
        description:
          "Examples include retro runner plus grey, square watch plus black dial or pendant necklace plus silver tone.",
      },
      {
        title: "Item plus material",
        description:
          "Try crossbody bag plus nylon, zip hoodie plus heavyweight cotton or jacket plus wool blend.",
      },
      {
        title: "Item plus shape",
        description:
          "Use a visible silhouette such as cropped jacket, wide-leg pants, rectangular bag or square watch.",
      },
      {
        title: "Item plus function",
        description:
          "Add a concrete feature such as detachable hood, USB-C connector, waterproof shell or adjustable strap.",
      },
      {
        title: "Too many results",
        description:
          "Add the strongest product detail or move through the category page to use more precise vocabulary.",
      },
      {
        title: "No useful results",
        description:
          "Remove the least important detail, try a common synonym and replace mood words with visible traits.",
      },
    ],
  },
  {
    domain: "allchinabuyfinder.com",
    slug: "product-checklist",
    seoTitle: "AllChinaBuy Product Search Checklist | Finder Review",
    description:
      "Review AllChinaBuy search results by checking the exact variant, visible details, measurements, included components, source links and current status.",
    eyebrow: "Result review checklist",
    title: "Check the result, not just the product headline.",
    intro:
      "A concise title can hide option differences. Use the current photos, variant fields, measurements and source record to understand what is shown.",
    sections: [
      {
        title: "Identify the exact variant",
        description:
          "Match color, finish, size, model and set contents to the option selected in the result.",
      },
      {
        title: "Compare title and images",
        description:
          "Check whether the headline, description, option label and photos appear to describe the same version.",
      },
      {
        title: "Use measurements before labels",
        description:
          "For clothing and footwear, record the source measurements and method instead of relying on a size label alone.",
      },
      {
        title: "Check scale and dimensions",
        description:
          "For bags, watches and accessories, confirm the relevant dimensions, closures, finish and included pieces.",
      },
      {
        title: "Confirm compatibility",
        description:
          "For electronics, verify model, connector, voltage, plug, supported systems, language and components.",
      },
      {
        title: "Recheck the current source",
        description:
          "Open the linked source for present availability, options and details. Treat missing information as unknown.",
      },
    ],
  },
  {
    domain: "allchinabuyfinder.com",
    slug: "faq",
    seoTitle: "AllChinaBuy Finder FAQ | Search and Category Help",
    description:
      "Read answers about the independent AllChinaBuy Finder, category routes, query building, result checks and current external source details.",
    eyebrow: "Finder question archive",
    title: "Understand what the finder can narrow and what it cannot verify.",
    intro:
      "The finder helps shape product discovery. It does not replace the current listing, seller, account or service pages.",
    sections: [],
    questions: [
      {
        question: "What does AllChinaBuy Finder do?",
        answer:
          "It helps choose a product category, form a focused query and review the fields that make a search result useful.",
      },
      {
        question: "Is this the official AllChinaBuy website?",
        answer:
          "No. It is an independent discovery guide. Use the official website for accounts, buying services, warehouse information and current policies.",
      },
      {
        question: "Does this site sell or ship products?",
        answer:
          "No. It organizes search methods and links to external pages. It does not accept product transactions.",
      },
      {
        question: "Why start with a category?",
        answer:
          "The category supplies clearer product vocabulary and tells you which measurements, specifications and option details to compare.",
      },
      {
        question: "What should I do when results are too broad?",
        answer:
          "Add one strong attribute such as material, shape, connector or function. Avoid stacking several vague descriptors.",
      },
      {
        question: "Does a result verify quality or authenticity?",
        answer:
          "No. A result is a discovery lead. Review the current source evidence and use appropriate independent checks for the claim involved.",
      },
    ],
  },
];

const BBDBUY_EU_FINDS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "bbdbuyeufinds.com",
    slug: "categories",
    seoTitle: "BBDbuy EU Finds Categories | Product Research Routes",
    description:
      "Choose a BBDbuy-linked product category by the evidence it needs, then add EU sizing, compatibility or destination questions before comparing results.",
    eyebrow: "EU product discovery routes",
    title: "Choose a category by the decision it needs to support.",
    intro:
      "A category is useful when it tells you what to measure, photograph or verify next. Keep regional questions beside the result without turning them into product claims.",
    sections: [
      {
        title: "Wear",
        description:
          "For clothing and footwear, record garment or foot measurements, the source method, materials and the exact selected option.",
      },
      {
        title: "Carry",
        description:
          "For bags, compare exterior and interior dimensions, compartments, hardware, closures, straps and included pieces.",
      },
      {
        title: "Detail",
        description:
          "For watches and accessories, check scale, stated materials, finish, fastening, components and packaging.",
      },
      {
        title: "Compatibility",
        description:
          "For electronics, verify model, connector, voltage, plug, supported systems, language and battery information.",
      },
    ],
  },
  {
    domain: "bbdbuyeufinds.com",
    slug: "eu-finds",
    seoTitle: "BBDbuy EU Finds | Build a Product Research Brief",
    description:
      "Turn a broad BBDbuy EU product idea into a testable brief covering destination, dimensions, material, compatibility and evidence requests.",
    eyebrow: "EU find brief",
    title: "Make the product phrase testable before you search.",
    intro:
      "Start with the intended use and destination, then add only the fields that can separate a useful listing from a dead end.",
    sections: [
      {
        title: "Destination context",
        description:
          "Record the destination country and the local sizing, plug, material or restriction question that may affect the choice.",
      },
      {
        title: "Fit and dimensions",
        description:
          "Name the measurements and measurement method needed to compare the selected product with a known reference.",
      },
      {
        title: "Material and use",
        description:
          "Write the intended use, relevant material claim and detail photo needed to examine that claim.",
      },
      {
        title: "Compatibility",
        description:
          "For technical products, list the exact model, connector, voltage, system or regional standard that needs confirmation.",
      },
      {
        title: "Evidence request",
        description:
          "Ask for the smallest set of photos, measurements or specification fields that can resolve the open question.",
      },
    ],
  },
  {
    domain: "bbdbuyeufinds.com",
    slug: "eu-guide",
    seoTitle: "BBDbuy EU Guide | Regional Product Questions to Verify",
    description:
      "Separate product-source evidence, official BBDbuy service details and EU destination requirements when researching a purchase route.",
    eyebrow: "EU source map",
    title: "Send each question to the source that can answer it.",
    intro:
      "Product pages, the current BBDbuy service and destination authorities cover different facts. Keep those sources separate in the research record.",
    sections: [
      {
        title: "Product source",
        description:
          "Use the current listing for the exact option, visible specifications, seller context and product evidence.",
      },
      {
        title: "Official service",
        description:
          "Use BBDbuy for current account, order, warehouse, estimator, route and service information.",
      },
      {
        title: "Destination guidance",
        description:
          "Use relevant official sources for local import, product-safety, tax or restricted-item questions.",
      },
      {
        title: "Parcel inputs",
        description:
          "Use recorded warehouse weight, dimensions, contents and packaging when comparing current route options.",
      },
    ],
  },
  {
    domain: "bbdbuyeufinds.com",
    slug: "qc-checklist",
    seoTitle: "BBDbuy QC Checklist | Review Product Photo Evidence",
    description:
      "Use a neutral BBDbuy QC photo checklist to match the selected item, review category-specific details and preserve unresolved questions.",
    eyebrow: "Product photo evidence",
    title: "Match the item before judging the finish.",
    intro:
      "QC images can document what is visible at one moment. They do not prove authenticity, hidden construction, long-term quality or delivery outcomes.",
    sections: [
      {
        title: "Identity and option",
        description:
          "Match the product, color, size or model, quantity and included pieces to the order record.",
      },
      {
        title: "Category details",
        description:
          "Use measurements and close views appropriate to shoes, clothing, bags, accessories or electronics.",
      },
      {
        title: "Visible condition",
        description:
          "Describe alignment, surface condition, finish and packaging with neutral language limited to what the image shows.",
      },
      {
        title: "Open questions",
        description:
          "Keep missing angles, unclear measurements and untested functions marked as unresolved rather than inferred.",
      },
    ],
  },
  {
    domain: "bbdbuyeufinds.com",
    slug: "shipping-planner",
    seoTitle: "BBDbuy EU Shipping Planner | Prepare Estimate Inputs",
    description:
      "Prepare destination, parcel contents, measured weight, dimensions, packaging and evidence status before using current BBDbuy shipping tools.",
    eyebrow: "EU parcel input record",
    title: "Compare routes from a stable parcel record.",
    intro:
      "An estimate is a comparison point, not a promise. Recheck the same parcel inputs and the current service terms whenever the record changes.",
    sections: [
      {
        title: "Destination",
        description:
          "Record country, region and postal context without assuming every route serves every address or item.",
      },
      {
        title: "Contents",
        description:
          "List the selected warehouse items, quantity and any battery, liquid, powder, magnetic or branded-goods question.",
      },
      {
        title: "Measured parcel",
        description:
          "Use the recorded weight and dimensions for the intended packaging, not product-page estimates.",
      },
      {
        title: "Comparison record",
        description:
          "Save the input set, date, route name and unresolved restrictions so later estimates remain comparable.",
      },
    ],
  },
  {
    domain: "bbdbuyeufinds.com",
    slug: "faq",
    seoTitle: "BBDbuy EU Finds FAQ | Search, QC and Shipping Sources",
    description:
      "Read answers about BBDbuy EU product discovery, independent research scope, QC evidence, destination questions and shipping inputs.",
    eyebrow: "EU discovery questions",
    title: "Know which answer still needs a live source.",
    intro:
      "This archive explains the research method. Current product, service and destination details require current sources.",
    sections: [],
    questions: [
      {
        question: "Is this the official BBDbuy website?",
        answer:
          "No. It is an independent product-research guide. Use the official BBDbuy website for accounts, orders, warehouse services and current routes.",
      },
      {
        question: "What makes an EU product brief useful?",
        answer:
          "It combines the product type with the measurements, compatibility field, intended use and destination question that must be checked.",
      },
      {
        question: "Do QC photos guarantee product quality?",
        answer:
          "No. They can record visible details in the supplied images. Hidden construction, performance, authenticity and future condition need other evidence.",
      },
      {
        question: "Can this site predict customs or delivery?",
        answer:
          "No. Check current platform terms and relevant destination guidance using the exact item and parcel record.",
      },
      {
        question: "Why keep shipping separate from product search?",
        answer:
          "Reliable route comparisons depend on warehouse measurements, package contents and current service rules that are not available from a search card.",
      },
    ],
  },
];

const BBDBUY_US_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "bbdbuyeus.com",
    slug: "search-guide",
    seoTitle: "BBDbuy Product Search Guide for US Buyers",
    description:
      "Build focused BBDbuy-linked product queries, verify the destination source and preserve the exact option before any US parcel planning begins.",
    eyebrow: "US product search record",
    title: "Use item language before label language.",
    intro:
      "Search for the product type, material, function and measurable feature. Open the destination page before keeping a result.",
    sections: [
      {
        title: "Write one precise query",
        description:
          "Combine the product noun with one or two useful attributes such as material, shape, model, connector or construction.",
      },
      {
        title: "Open the source",
        description:
          "Confirm the destination is the intended listing and review its current title, images, seller context and options.",
      },
      {
        title: "Lock the option",
        description:
          "Record color, size, model, set contents and quantity in terms that can be matched during the order handoff.",
      },
      {
        title: "Defer shipping",
        description:
          "Do not estimate a US parcel until warehouse weight, dimensions, item restrictions and packaging choices are available.",
      },
    ],
  },
  {
    domain: "bbdbuyeus.com",
    slug: "order-workflow",
    seoTitle: "BBDbuy Order Workflow | Independent US Buyer Guide",
    description:
      "Follow a source, option, warehouse and parcel decision sequence when researching how a BBDbuy-linked order may progress for a US buyer.",
    eyebrow: "Order handoff sequence",
    title: "Keep every handoff tied to the exact item.",
    intro:
      "A useful order record preserves the source and selected option before purchase, then adds warehouse evidence before any parcel decision.",
    sections: [
      {
        title: "1. Confirm the source",
        description:
          "Save the current product URL, seller context, intended option, quantity and visible evidence.",
      },
      {
        title: "2. Submit exact instructions",
        description:
          "Match the order fields to the source wording and keep special requests separate from verified product facts.",
      },
      {
        title: "3. Review the arrival",
        description:
          "Compare the warehouse record, measurements and supplied photos with the selected option while the item remains available for review.",
      },
      {
        title: "4. Create the parcel record",
        description:
          "Use selected items, measured weight, dimensions, packaging, restrictions and current route terms.",
      },
    ],
  },
  {
    domain: "bbdbuyeus.com",
    slug: "parcel-checklist",
    seoTitle: "BBDbuy US Parcel Checklist | Before Shipping Submission",
    description:
      "Check selected warehouse items, packaging, measured parcel inputs, restrictions and the current US route before submitting a BBDbuy parcel.",
    eyebrow: "US parcel review",
    title: "Review the parcel that actually exists.",
    intro:
      "Use the current warehouse record instead of catalog assumptions. Recheck every field that changes when items or packaging change.",
    sections: [
      {
        title: "Selected items",
        description:
          "Confirm the intended products, quantities and warehouse identifiers, and remove anything not meant for this parcel.",
      },
      {
        title: "Packaging decision",
        description:
          "Choose protection or package reduction with the item, fragility and available service in mind.",
      },
      {
        title: "Measured inputs",
        description:
          "Use current parcel weight and dimensions and identify any item whose properties may affect route availability.",
      },
      {
        title: "Submission record",
        description:
          "Save the date, input set, selected route, declared contents and unresolved questions for later reference.",
      },
    ],
  },
  {
    domain: "bbdbuyeus.com",
    slug: "us-shipping",
    seoTitle: "BBDbuy US Shipping Guide | Weight, Size and Route Checks",
    description:
      "Compare BBDbuy US route options using measured weight, dimensions, contents, packaging and current service terms instead of listing-card estimates.",
    eyebrow: "US route decision record",
    title: "Compare the route as a whole, not one displayed number.",
    intro:
      "A route decision can involve measured parcel size, contents, restrictions, service scope and destination. All changing values need a current source.",
    sections: [
      {
        title: "Start with package inputs",
        description:
          "Record the measured weight, dimensions, item count, contents and intended packaging for the exact parcel.",
      },
      {
        title: "Check eligibility",
        description:
          "Confirm whether the destination and item properties fit the current route requirements before comparing cost or service details.",
      },
      {
        title: "Separate changing factors",
        description:
          "Keep exchange rates, platform charges, route terms and destination requirements tied to a date and current source.",
      },
      {
        title: "Save the decision",
        description:
          "Preserve the input set and reason for the selected route so a later change can be reviewed rather than guessed.",
      },
    ],
  },
  {
    domain: "bbdbuyeus.com",
    slug: "faq",
    seoTitle: "BBDbuy US FAQ | Search, Warehouse and Parcel Questions",
    description:
      "Read independent answers about BBDbuy product search, order handoffs, warehouse evidence, US parcel inputs and changing route information.",
    eyebrow: "US planning questions",
    title: "Keep product facts and parcel facts in the right stage.",
    intro:
      "These answers describe a research workflow, not current service promises. Check live account and route information on the official service.",
    sections: [],
    questions: [
      {
        question: "Is this BBDbuy's official website?",
        answer:
          "No. This is an independent US product and parcel planning guide. Use BBDbuy for current account, order, warehouse and route services.",
      },
      {
        question: "When should I estimate US shipping?",
        answer:
          "After the selected items have warehouse measurements and you know the intended packaging and any relevant item restrictions.",
      },
      {
        question: "Is the listing price the delivered price?",
        answer:
          "No. A listing price does not establish service charges, packaging, international transport, destination costs or exchange-rate effects.",
      },
      {
        question: "What should the order record contain?",
        answer:
          "Keep the source URL, exact option, quantity, instructions, visible evidence and later warehouse record connected.",
      },
      {
        question: "Can this guide promise route availability?",
        answer:
          "No. Route availability and terms can change by destination, parcel and item. Confirm them on the current official service.",
      },
    ],
  },
];

const BBDBUY_EU_SHEET_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "bbdbuyeusheet.com",
    slug: "categories",
    seoTitle: "BBDbuy EU Sheet Category Directory",
    description:
      "Group BBDbuy-linked products by the measurements, construction, scale or compatibility fields each EU research sheet row needs.",
    eyebrow: "Sheet category directory",
    title: "Group listings by the evidence they need.",
    intro:
      "The directory is a field guide, not a product endorsement. Choose the category that identifies the next evidence column to complete.",
    sections: [
      {
        title: "Wear",
        description:
          "Shoes and apparel rows need the selected size, source measurement method, key dimensions, materials and option evidence.",
      },
      {
        title: "Carry",
        description:
          "Bag rows need dimensions, compartments, closures, straps, hardware and included-piece evidence.",
      },
      {
        title: "Detail",
        description:
          "Watch and accessory rows need scale, finish, fastening, stated material and component details.",
      },
      {
        title: "Compatibility",
        description:
          "Electronics rows need model, connector, plug, voltage, supported system, battery and language fields.",
      },
    ],
  },
  {
    domain: "bbdbuyeusheet.com",
    slug: "eu-sheet",
    seoTitle: "How to Read a BBDbuy EU Product Sheet",
    description:
      "Use a compact BBDbuy EU research sheet with source, selected variant, visible evidence, EU context and unresolved questions kept in separate fields.",
    eyebrow: "EU sheet field guide",
    title: "Give every row a reason to exist.",
    intro:
      "A strong row is short, traceable and honest about missing information. It records evidence without turning seller language into a verified conclusion.",
    sections: [
      {
        title: "Source link",
        description:
          "Keep the original destination and the date reviewed so the current page can be reopened before a decision.",
      },
      {
        title: "Selected variant",
        description:
          "Record the intended color, size, model, material, set contents and quantity using source wording.",
      },
      {
        title: "Visible evidence",
        description:
          "Summarize only the measurements, specifications and image details that can be observed in the current source.",
      },
      {
        title: "EU context",
        description:
          "Add the destination-specific sizing, plug, compatibility or restriction question without inventing an outcome.",
      },
      {
        title: "Open questions",
        description:
          "Leave every missing or conflicting field visible and name the source that may resolve it.",
      },
    ],
  },
  {
    domain: "bbdbuyeusheet.com",
    slug: "checklist",
    seoTitle: "BBDbuy EU Product Research Checklist",
    description:
      "Use a BBDbuy EU product checklist to identify the listing, lock the selected variant, review visible evidence and stop incomplete rows from advancing.",
    eyebrow: "Sheet decision gate",
    title: "Use the checklist as a stop signal.",
    intro:
      "A row should not advance just because it contains text. Require a traceable source, an identifiable option and enough relevant evidence for the next comparison.",
    sections: [
      {
        title: "Identify the listing",
        description:
          "Save the source URL, seller context, product title and review date before adding derived notes.",
      },
      {
        title: "Lock the selected variant",
        description:
          "Confirm color, size, model, material, quantity and included pieces can be identified from the source.",
      },
      {
        title: "Review visible evidence",
        description:
          "Check that the relevant measurements, specifications or detail images support the comparison field.",
      },
      {
        title: "Mark unresolved fields",
        description:
          "Do not publish an answer for a missing source, unclear option, conflicting specification or unverified regional question.",
      },
    ],
  },
  {
    domain: "bbdbuyeusheet.com",
    slug: "faq",
    seoTitle: "BBDbuy EU Sheet FAQ | Product Research Fields",
    description:
      "Read answers about BBDbuy EU product sheet fields, source links, variants, visible evidence, open questions and independent research scope.",
    eyebrow: "Sheet method questions",
    title: "A small field set is easier to verify.",
    intro:
      "The sheet organizes research. It does not sell products, operate BBDbuy services or replace current listing and destination sources.",
    sections: [],
    questions: [
      {
        question: "Is this an official BBDbuy spreadsheet?",
        answer:
          "No. It is an independent research structure for organizing product evidence. It is not a BBDbuy account, order or warehouse tool.",
      },
      {
        question: "What are the minimum useful fields?",
        answer:
          "Keep the source, selected variant, visible evidence, review date and unresolved question. Add category fields only when they support a decision.",
      },
      {
        question: "Should I fill every blank?",
        answer:
          "No. Keep missing information blank or explicitly unresolved until a suitable current source provides an answer.",
      },
      {
        question: "Does a row verify authenticity or quality?",
        answer:
          "No. A row records source evidence and uncertainty. Specific claims require suitable independent evidence beyond the sheet.",
      },
      {
        question: "When should I recheck a row?",
        answer:
          "Reopen the source before using changing information such as availability, price, options, service terms or route details.",
      },
    ],
  },
];

const CSSBUY_ITEMS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "cssbuyitems.com",
    slug: "categories",
    seoTitle: "CSSBuy Item Categories | Current Product Search Fields",
    description:
      "Browse CSSBuy-linked item categories by the product measurements, specifications and source fields that need a current check.",
    eyebrow: "CSSBuy item categories",
    title: "Use the category to choose the next evidence field.",
    intro:
      "A category narrows the vocabulary, but every saved item still needs a working source, an identifiable option and a reason to remain in the shortlist.",
    sections: [
      { title: "Clothing", description: "Record garment measurements, fabric, construction details, selected color and size." },
      { title: "Footwear", description: "Compare insole or outsole measurements, width, materials and the source sizing method." },
      { title: "Bags and accessories", description: "Check dimensions, compartments, hardware, closures, straps, finish and included pieces." },
      { title: "Electronics", description: "Confirm model, connector, voltage, plug, language, battery and supported systems." },
    ],
  },
  {
    domain: "cssbuyitems.com",
    slug: "cssbuy-score",
    seoTitle: "CSSBuy Item Score | Product Link Review Checklist",
    description:
      "Score a CSSBuy-linked product link for listing clarity, photo evidence, measurements, cost inputs and unresolved product risk.",
    eyebrow: "Item evidence score",
    title: "Review the link before you keep it.",
    intro:
      "The score is a completeness check, not a quality, authenticity or shipping claim. Use it to identify weak links and missing evidence.",
    sections: [
      { title: "Listing clarity", description: "The source opens, the product is identifiable and the selected option can be described without guessing." },
      { title: "Photo evidence", description: "Images cover the angles and details relevant to the product claim being compared." },
      { title: "Measurements and fit", description: "The source supplies the category-specific dimensions and explains how they were measured." },
      { title: "Cost inputs", description: "Product price is kept separate from changing account, parcel, route and destination costs." },
      { title: "Product risk", description: "Restricted-item, rights, compatibility and destination questions remain visible until checked." },
    ],
  },
  {
    domain: "cssbuyitems.com",
    slug: "guide",
    seoTitle: "How to Buy From CSSBuy | Independent Item Workflow",
    description:
      "Follow a source, exact variant, inspection, parcel and current-route sequence when researching how to use CSSBuy for an item.",
    eyebrow: "CSSBuy item handoff",
    title: "Keep the exact product attached to every step.",
    intro:
      "This independent workflow separates product research from the current CSSBuy account, purchase, warehouse and forwarding services.",
    sections: [
      { title: "Find a supported listing", description: "Open the current source and preserve the product URL, seller context, images and intended option." },
      { title: "Submit the exact variant", description: "Match color, size, model, material, set contents and quantity to the current order fields." },
      { title: "Review inspection evidence", description: "Compare warehouse measurements, photos and notes with the intended item while questions can still be raised." },
      { title: "Create the parcel", description: "Use selected items, measured weight, dimensions, packaging and restrictions for the parcel record." },
      { title: "Confirm the route", description: "Check current availability and terms on the official service for the exact parcel and destination." },
    ],
  },
  {
    domain: "cssbuyitems.com",
    slug: "safety",
    seoTitle: "Is CSSBuy Safe and Legit? Independent Evidence Checklist",
    description:
      "Research CSSBuy legitimacy and transaction safety with current domain, terms, payment, seller, item, forwarding and destination evidence.",
    eyebrow: "Safety evidence checklist",
    title: "Research the exact transaction, not a general label.",
    intro:
      "Legitimacy, seller reliability, product claims, account security and parcel risk are separate questions that need suitable current evidence.",
    sections: [
      { title: "Verify the service", description: "Check the current domain, company information, account controls and terms on first-party pages." },
      { title: "Review payment and refund terms", description: "Read the rules that apply to the intended payment, order and service before committing funds." },
      { title: "Check the seller and listing", description: "Confirm the source, exact option, visible evidence and unresolved product claims separately from the platform." },
      { title: "Protect the account", description: "Use a unique password, available security controls and a trusted device and network." },
      { title: "Plan parcel risk", description: "Check item restrictions, destination requirements, declared contents and current route eligibility." },
    ],
  },
  {
    domain: "cssbuyitems.com",
    slug: "search-ideas",
    seoTitle: "CSSBuy Item Search Ideas | Build Better Product Queries",
    description:
      "Build CSSBuy item queries from a product type, model, material, function or measurable feature, then verify each destination source.",
    eyebrow: "Item query workshop",
    title: "Build the query in layers.",
    intro:
      "Start with the product noun. Add the smallest attribute that can separate useful results, then remove vague or malformed wording.",
    sections: [
      { title: "Start with the category", description: "Use the product type buyers and sellers are likely to recognize." },
      { title: "Add model or feature", description: "Include an exact model, material, connector, shape, construction or intended function." },
      { title: "Add the source when needed", description: "Use marketplace or seller context only when it materially narrows the intended result." },
      { title: "Remove noisy wording", description: "Drop repeated labels, unsupported claims and fragments that broaden rather than refine the result." },
    ],
  },
  {
    domain: "cssbuyitems.com",
    slug: "shipping",
    seoTitle: "CSSBuy USA Forwarding | Parcel and Shipping Checklist",
    description:
      "Review measured parcel inputs, item restrictions, packaging and current route terms when researching CSSBuy forwarding to the USA.",
    eyebrow: "USA parcel inputs",
    title: "Decide from the measured parcel, not the product card.",
    intro:
      "USA route availability and cost can depend on the exact contents, warehouse record, package size, packaging and current service terms.",
    sections: [
      { title: "Receive and record", description: "Match warehouse items to the intended order and keep the recorded weight, dimensions and inspection evidence." },
      { title: "Consolidate eligible goods", description: "Confirm selected contents and any battery, liquid, magnetic, branded-goods or restricted-item question." },
      { title: "Choose packaging", description: "Select protection or package reduction based on the actual items and available service options." },
      { title: "Compare current routes", description: "Use the same parcel inputs when checking availability and terms on the official service." },
    ],
  },
  {
    domain: "cssbuyitems.com",
    slug: "faq",
    seoTitle: "CSSBuy Items FAQ | Search, Safety and USA Shipping",
    description:
      "Read independent answers about CSSBuy item links, product searches, safety evidence, buying workflow and USA parcel planning.",
    eyebrow: "CSSBuy item questions",
    title: "Separate the product answer from the service answer.",
    intro:
      "This guide organizes research. Current product listings and CSSBuy account, order, warehouse and forwarding terms remain external sources.",
    sections: [],
    questions: [
      { question: "Is this the official CSSBuy website?", answer: "No. It is an independent item-research guide. Use the official CSSBuy website for current accounts, orders, warehouse services and routes." },
      { question: "What is a CSSBuy item link?", answer: "It is a product-source candidate that still needs a current source check, exact option and enough evidence for comparison." },
      { question: "Does the item score verify quality?", answer: "No. It checks research completeness and keeps missing evidence visible. It does not certify authenticity, quality or seller reliability." },
      { question: "Can this site estimate USA shipping?", answer: "No. Use current warehouse measurements, parcel contents, packaging and official route tools for the exact destination." },
      { question: "How do I research safety?", answer: "Check the current service, payment and refund terms, seller and listing evidence, account security, item restrictions and destination requirements separately." },
    ],
  },
];

const CSSBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "cssbuyindex.com",
    slug: "categories",
    seoTitle: "CSSBuy Spreadsheet Categories | Research by Product Type",
    description:
      "Browse CSSBuy-linked categories and use a repeatable field set for current source, option, product evidence and open questions.",
    eyebrow: "CSSBuy research categories",
    title: "Start with a comparable product group.",
    intro:
      "Category browsing is the first filter. A result enters the index only when its source, option and evidence can support a useful comparison.",
    sections: [
      { title: "Apparel and footwear", description: "Compare source measurements, materials, construction and the selected size or color." },
      { title: "Bags and accessories", description: "Record dimensions, compartments, closures, hardware, finish and included pieces." },
      { title: "Watches", description: "Check case dimensions, dial details, clasp, stated movement and the exact selected variation." },
      { title: "Electronics", description: "Confirm model, connector, plug, voltage, supported systems, language and battery information." },
    ],
  },
  {
    domain: "cssbuyindex.com",
    slug: "cssbuy-score",
    seoTitle: "CSSBuy Score | Product Link Quality Checklist",
    description:
      "Review CSSBuy-linked products across listing clarity, photo evidence, measurements, landed-cost inputs and unresolved product risk.",
    eyebrow: "Research quality score",
    title: "Use the score before saving a product record.",
    intro:
      "The checklist scores the evidence available for comparison. It does not rate the product, seller or service as good, safe or authentic.",
    sections: [
      { title: "Clear enough to compare", description: "The source, product identity, selected option and relevant category fields can be recorded without inference." },
      { title: "Missing evidence", description: "Required photos, measurements, specifications or current source details remain explicitly unresolved." },
      { title: "Conflicting evidence", description: "Differences between title, images, options and specifications are recorded before the result advances." },
      { title: "Cost boundaries", description: "Product price remains separate from account, warehouse, packaging, international route and destination costs." },
      { title: "Rights and product risk", description: "Claims, restricted items and destination issues are routed to suitable current sources." },
    ],
  },
  {
    domain: "cssbuyindex.com",
    slug: "guide",
    seoTitle: "How to Use CSSBuy | Independent Product Research Guide",
    description:
      "Research how to buy from CSSBuy by preserving the source, exact option, QC evidence, landed-cost inputs and current official workflow.",
    eyebrow: "CSSBuy research sequence",
    title: "Move from a query to a traceable product record.",
    intro:
      "Product discovery belongs in the index. Account, purchase, warehouse and route actions belong on the current official service.",
    sections: [
      { title: "Find a product link", description: "Use a focused query and open the current source before saving a candidate." },
      { title: "Review before submission", description: "Record the exact variant, quantity, visible specifications and unanswered questions." },
      { title: "Read QC evidence", description: "Compare supplied warehouse photos, measurements and notes with the intended option." },
      { title: "Estimate landed-cost inputs", description: "Keep product cost, recorded parcel data and changing route or destination factors separate." },
      { title: "Follow the current workflow", description: "Use the official CSSBuy interface and current terms for every account or transaction action." },
    ],
  },
  {
    domain: "cssbuyindex.com",
    slug: "forwarding",
    seoTitle: "CSSBuy Warehouse Guide | Address, Receipt and USA Forwarding",
    description:
      "Find the current CSSBuy warehouse address in the official account flow, then separate seller delivery, receipt, parcel preparation and USA forwarding evidence.",
    eyebrow: "Warehouse and USA forwarding stages",
    title: "Use the current account address, then track each delivery stage separately.",
    intro:
      "Avoid turning one displayed estimate into a delivery promise. Record where each input comes from and when it was checked.",
    sections: [
      { title: "Current warehouse address", description: "Copy the address and recipient details shown for the intended warehouse in the current official account flow; do not reuse an undated address from another page or user." },
      { title: "Seller to warehouse", description: "Track the source order separately from international forwarding and preserve the seller and option record." },
      { title: "Warehouse receipt", description: "Use the received-item record, measurements and inspection evidence for the next decision." },
      { title: "Parcel preparation", description: "Confirm selected items, packaging, restrictions and measured parcel data." },
      { title: "International route", description: "Check current eligibility and terms for the exact parcel and US destination." },
      { title: "Customs and last mile", description: "Use current destination guidance and carrier information for factors outside the warehouse service." },
    ],
  },
  {
    domain: "cssbuyindex.com",
    slug: "safety",
    seoTitle: "Is CSSBuy Legit and Safe? Layered Research Checklist",
    description:
      "Check CSSBuy service identity, current terms, payment, seller, listing, product, forwarding and data risks as separate evidence layers.",
    eyebrow: "Layered safety research",
    title: "Do not compress several risks into one verdict.",
    intro:
      "Platform legitimacy does not verify every seller, listing, product claim or route. Match each question to evidence that can answer it.",
    sections: [
      { title: "Domain and account", description: "Verify the current first-party domain, account controls, company information and applicable terms." },
      { title: "Payment and refund", description: "Read the current rules for the intended transaction method and service stage." },
      { title: "Seller and listing", description: "Review seller context, source status, exact option and visible product evidence." },
      { title: "Product and legal risk", description: "Check claims, rights, restrictions, compatibility and destination rules with suitable sources." },
      { title: "Forwarding and data", description: "Review current parcel, route, privacy and information-request terms separately." },
    ],
  },
  {
    domain: "cssbuyindex.com",
    slug: "search-ideas",
    seoTitle: "CSSBuy Spreadsheet Search | Build a Useful Shortlist",
    description:
      "Turn a broad CSSBuy spreadsheet query into a focused shortlist by adding exact product, model, material, function and source fields.",
    eyebrow: "CSSBuy query index",
    title: "Make every query produce a decision, not more noise.",
    intro:
      "Use a broad category for discovery, then add the exact attribute that makes the next result set meaningfully easier to review.",
    sections: [
      { title: "Product discovery", description: "Start with the recognized product type and one relevant material, form or function." },
      { title: "Exact model research", description: "Add model, connector, dimensions or compatibility fields when a known item is intended." },
      { title: "Open comparable listings", description: "Keep only sources whose current options and visible evidence can support the same comparison." },
      { title: "Record the query", description: "Save the phrase, review date, retained sources and unresolved question so the search can be repeated." },
    ],
  },
  {
    domain: "cssbuyindex.com",
    slug: "faq",
    seoTitle: "CSSBuy Index FAQ | Spreadsheet, Safety and USA Forwarding",
    description:
      "Read independent answers about the CSSBuy spreadsheet index, product scores, buying research, safety checks and USA forwarding stages.",
    eyebrow: "CSSBuy index questions",
    title: "Know what the index records and what it cannot prove.",
    intro:
      "The index organizes current source evidence. It does not operate CSSBuy services or verify changing transaction and route terms.",
    sections: [],
    questions: [
      { question: "What is the CSSBuy index?", answer: "It is an independent structure for finding product sources and recording the query, selected option, visible evidence and open questions." },
      { question: "Is this affiliated with CSSBuy?", answer: "No. Use the official CSSBuy website for current accounts, transactions, warehouse services and route tools." },
      { question: "What does the CSSBuy score measure?", answer: "It measures research completeness across listing clarity, images, measurements, cost boundaries and unresolved risk. It is not a product rating." },
      { question: "Does CSSBuy work for every USA parcel?", answer: "Route availability can depend on destination, contents, measured size, packaging, restrictions and current service terms." },
      { question: "Can the index verify legitimacy or safety?", answer: "No single page can resolve every risk. Check the service, payment terms, seller, listing, product claim, route and destination separately." },
    ],
  },
];

const CSSBUY_CATALOG_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "cssbuycatalog.com",
    slug: "categories",
    seoTitle: "CSSBuy Catalog Categories and Product Search Routes",
    description:
      "Browse CSSBuy catalog categories by product type, then compare only listings with current source, option and category-specific evidence.",
    eyebrow: "CSSBuy category map",
    title: "Choose what you want to compare before opening products.",
    intro:
      "A category creates the comparison boundary. Add measurements, materials or specifications that separate similar products within it.",
    sections: [
      { title: "Wear and layers", description: "Use garment and footwear measurements, materials, construction and selected-option evidence." },
      { title: "Carry and organize", description: "Compare dimensions, capacity, compartments, hardware, closures, straps and included pieces." },
      { title: "Detail and collect", description: "Review scale, finish, fastening, stated materials, components and packaging." },
      { title: "Connect and power", description: "Verify model, connector, voltage, plug, supported systems, battery and language." },
    ],
  },
  {
    domain: "cssbuycatalog.com",
    slug: "spreadsheet",
    seoTitle: "CSSBuy Spreadsheet | Find and Refresh Product Links",
    description:
      "Use a CSSBuy spreadsheet as a discovery list, then refresh every old product link, selected option and visible evidence at the current source.",
    eyebrow: "Catalog link refresh",
    title: "Treat every spreadsheet row as a lead, not a live fact.",
    intro:
      "Old links, prices and options can change. Reopen the current catalog and keep only rows whose source and intended variation still exist.",
    sections: [
      { title: "Start with the current catalog", description: "Search by product type and a useful attribute rather than trusting an old row." },
      { title: "Refresh the source", description: "Confirm the destination opens and review the current seller, title, images, options and price." },
      { title: "Lock the option", description: "Record color, size, model, material, set contents and quantity from the current source." },
      { title: "Mark what changed", description: "Keep missing, conflicting or unavailable fields visible instead of carrying old values forward." },
    ],
  },
  {
    domain: "cssbuycatalog.com",
    slug: "guide",
    seoTitle: "How to Buy From CSSBuy | Practical Research Guide",
    description:
      "Research the CSSBuy buying process with a current product source, exact option, warehouse evidence, parcel inputs and current official workflow.",
    eyebrow: "Catalog to handoff",
    title: "Check the record before every handoff.",
    intro:
      "The catalog supports discovery. Use the current official service for account, purchase, warehouse, parcel and route actions.",
    sections: [
      { title: "Before ordering", description: "Confirm the current source, exact variation, quantity, visible product evidence and open questions." },
      { title: "At the warehouse", description: "Compare received-item photos, measurements and notes with the intended order record." },
      { title: "Before shipping", description: "Confirm selected contents, measured weight, dimensions, packaging, restrictions and destination." },
      { title: "At route selection", description: "Review current eligibility and terms for the exact parcel on the official service." },
    ],
  },
  {
    domain: "cssbuycatalog.com",
    slug: "forwarding",
    seoTitle: "CSSBuy Forwarding Service | Ship For Me Research Guide",
    description:
      "Understand the separate product-purchase and forwarding flows, service checks and current parcel inputs involved in CSSBuy Ship For Me research.",
    eyebrow: "Forwarding workflow map",
    title: "Keep forwarding separate from product discovery.",
    intro:
      "A forwarding record begins with an externally purchased item and current warehouse instructions. It does not inherit verified product facts from a catalog card.",
    sections: [
      { title: "External purchase record", description: "Preserve seller, source, order identifier, exact option, quantity and expected contents." },
      { title: "Warehouse instructions", description: "Use the current official address, identification and receipt requirements for the account." },
      { title: "Received-item review", description: "Match the warehouse record and supplied evidence to the external order before parcel creation." },
      { title: "Parcel and route", description: "Use measured inputs, packaging, restrictions and current destination eligibility for forwarding decisions." },
    ],
  },
  {
    domain: "cssbuycatalog.com",
    slug: "usa",
    seoTitle: "Does CSSBuy Work for USA? Current Route Checklist",
    description:
      "Use a current CSSBuy USA route checklist covering exact destination, parcel contents, measured size, packaging, restrictions and service terms.",
    eyebrow: "USA route checklist",
    title: "Confirm the full route for the full parcel.",
    intro:
      "A general USA answer cannot establish eligibility for a specific parcel. Use current official tools with the exact package record.",
    sections: [
      { title: "Destination", description: "Enter the current country, region and postal context required by the official estimator or route tool." },
      { title: "Contents", description: "List every item and mark batteries, liquids, powders, magnets, food, sharp items or branded-goods questions." },
      { title: "Measured package", description: "Use recorded weight and dimensions for the selected items and intended packaging." },
      { title: "Current eligibility", description: "Review route availability and terms on the official service at the time of the decision." },
    ],
  },
  {
    domain: "cssbuycatalog.com",
    slug: "safety",
    seoTitle: "Is CSSBuy Legit and Safe? Independent Catalog Checklist",
    description:
      "Research CSSBuy legitimacy, account and payment terms, sellers, product claims, forwarding and destination risk with current evidence.",
    eyebrow: "Catalog risk checklist",
    title: "Verify the evidence that matches the decision.",
    intro:
      "A general reputation statement cannot replace checks for the current service, transaction, seller, item, route and destination.",
    sections: [
      { title: "Service identity", description: "Confirm the current official domain, company information, account controls and applicable policies." },
      { title: "Transaction terms", description: "Read current payment, purchase, cancellation and refund conditions for the intended action." },
      { title: "Seller and item", description: "Review the source, exact option, visible evidence and product claims separately from the platform." },
      { title: "Forwarding and destination", description: "Check parcel restrictions, route eligibility, declared contents and relevant destination guidance." },
    ],
  },
  {
    domain: "cssbuycatalog.com",
    slug: "faq",
    seoTitle: "CSSBuy Catalog FAQ | Spreadsheet, USA and Forwarding",
    description:
      "Read independent answers about the CSSBuy catalog, spreadsheet links, buying workflow, Ship For Me forwarding, USA routes and safety research.",
    eyebrow: "Catalog questions",
    title: "Use the catalog for discovery and current sources for decisions.",
    intro:
      "These answers define the boundary between independent product research and changing external service details.",
    sections: [],
    questions: [
      { question: "Is this the official CSSBuy catalog?", answer: "No. It is an independent category and product-research guide. Use CSSBuy for current accounts, orders, forwarding and route tools." },
      { question: "What should I do with an old spreadsheet link?", answer: "Reopen the destination, confirm it is still the intended product and record the current option, evidence and review date." },
      { question: "What does Ship For Me mean in this guide?", answer: "It refers to researching a forwarding flow for an item purchased elsewhere. Current instructions and eligibility must come from the official service." },
      { question: "Does CSSBuy work for every USA order?", answer: "Eligibility can depend on the exact item, destination, measured package, packaging, restrictions and current route terms." },
      { question: "Can the catalog prove safety or legitimacy?", answer: "No. Verify service identity, transaction terms, seller and listing evidence, product risk, forwarding and destination factors separately." },
    ],
  },
];

const KAKOBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "kakobuyindex.net",
    slug: "categories",
    seoTitle: "Kakobuy Spreadsheet Categories | Build a Cleaner Shortlist",
    description:
      "Browse Kakobuy-linked categories and define the size, material, model or specification fields required before a listing enters the shortlist.",
    eyebrow: "Category shortlist rules",
    title: "Give every category its own admission rule.",
    intro:
      "A broad category produces candidates. A useful index states which visible fields must be present before those candidates are kept.",
    sections: [
      { title: "Shoes", description: "Require the intended size system, a usable measurement reference, material context and enough images to distinguish the exact option." },
      { title: "Clothing", description: "Retain listings with garment measurements, fabric context, intended color or variation and visible construction details." },
      { title: "Bags and accessories", description: "Record dimensions, closures, hardware, included pieces and the exact option rather than relying on the category label." },
      { title: "Electronics", description: "Keep the model, voltage, plug, language, compatibility, battery and route questions visible before comparison." },
    ],
  },
  {
    domain: "kakobuyindex.net",
    slug: "guide",
    seoTitle: "Kakobuy Spreadsheet Guide | Query, Deduplicate, Shortlist",
    description:
      "Use a repeatable Kakobuy spreadsheet method to define a query, group duplicates, inspect current sources and record why each listing remains shortlisted.",
    eyebrow: "Shortlist method",
    title: "Make the index smaller before making a decision.",
    intro:
      "The goal is not to collect the most links. It is to preserve a small set of current, distinguishable candidates that can be checked again.",
    sections: [
      { title: "Define the query", description: "Write the product type and the one or two attributes that make a result relevant before opening the catalog." },
      { title: "Group likely duplicates", description: "Compare source, seller context, images, option labels and repeated identifiers before counting similar cards as separate choices." },
      { title: "Apply the evidence floor", description: "Remove candidates whose source no longer opens or whose intended option, key measurement or visible evidence cannot be identified." },
      { title: "Save a dated reason", description: "For every retained result, record the source, intended option, review date, useful evidence and unresolved question." },
    ],
  },
  {
    domain: "kakobuyindex.net",
    slug: "kakobuy-score",
    seoTitle: "Kakobuy Score | Independent Shortlist Quality Rubric",
    description:
      "Use an independent Kakobuy shortlist rubric for query match, source availability, option clarity, visible evidence and unresolved risk.",
    eyebrow: "Shortlist quality rubric",
    title: "Score the record, not the reputation.",
    intro:
      "This rubric measures whether a candidate is documented well enough to remain in a comparison. It is not an official platform, seller, authenticity or safety rating.",
    sections: [
      { title: "Query match", description: "The listing matches the product type and essential attributes defined before the search." },
      { title: "Source availability", description: "The current destination opens and still represents the candidate saved in the index." },
      { title: "Option clarity", description: "The intended size, color, model, material, set or quantity can be distinguished from other variations." },
      { title: "Evidence and risk", description: "Useful visible evidence is preserved, while missing measurements, conflicting details and open questions remain explicit." },
    ],
  },
  {
    domain: "kakobuyindex.net",
    slug: "safety",
    seoTitle: "Is Kakobuy Legit and Safe? Independent Research Layers",
    description:
      "Separate current Kakobuy service identity, transaction terms, seller evidence, product risk and route questions instead of relying on one verdict.",
    eyebrow: "Independent risk research",
    title: "Separate the service, seller, item and route questions.",
    intro:
      "A general review cannot answer every layer of a future transaction. Verify the evidence that belongs to the specific decision you are making.",
    sections: [
      { title: "Service identity and account", description: "Use the current official destination, review its policies and protect credentials and recovery information." },
      { title: "Transaction terms", description: "Read the current payment, cancellation, refund, inspection and dispute terms that apply to the intended action." },
      { title: "Seller and product", description: "Treat seller claims, item photos, measurements, specifications and authenticity questions as a separate evidence layer." },
      { title: "Parcel and destination", description: "Check exact contents, restrictions, measured package data and current destination rules before route selection." },
    ],
  },
  {
    domain: "kakobuyindex.net",
    slug: "search-ideas",
    seoTitle: "Kakobuy Search Ideas | Queries That Produce Better Shortlists",
    description:
      "Build focused Kakobuy spreadsheet searches with product, model, variation, measurement and source terms, then document the resulting shortlist.",
    eyebrow: "Query design notebook",
    title: "Write the useful constraint before opening the results.",
    intro:
      "A precise query reduces unrelated results, but it does not verify a listing. Keep the query beside the current source and review outcome.",
    sections: [
      { title: "Known product", description: "Use product type plus exact model, intended variation and a decisive size, material or compatibility field." },
      { title: "Category exploration", description: "Begin with one category, then add only the attribute needed to separate meaningful comparison groups." },
      { title: "Source refinement", description: "Add a marketplace or seller clue only when the current destination confirms that context." },
      { title: "Research questions", description: "Handle safety, shipping, account and service questions in separate research records rather than adding them to a product query." },
    ],
  },
  {
    domain: "kakobuyindex.net",
    slug: "shipping",
    seoTitle: "How Long Does Kakobuy Take to Ship? Planning Record",
    description:
      "Plan Kakobuy shipping research by separating seller transfer, warehouse handling, parcel preparation, route movement, customs and last mile.",
    eyebrow: "Shipping planning record",
    title: "Do not turn several stages into one promised date.",
    intro:
      "A product index cannot establish a delivery time. Record the current stage, parcel inputs and route source behind every estimate.",
    sections: [
      { title: "Seller transfer", description: "Track whether the seller has dispatched the exact option and whether the warehouse has recorded receipt." },
      { title: "Warehouse and parcel", description: "Use received-item evidence, selected contents, measured weight, dimensions and packaging choices." },
      { title: "International route", description: "Review current eligibility and estimate ranges for the exact parcel and destination on the responsible service." },
      { title: "Customs and last mile", description: "Keep destination review and local carrier movement separate from seller and warehouse timing." },
    ],
  },
  {
    domain: "kakobuyindex.net",
    slug: "faq",
    seoTitle: "Kakobuy Spreadsheet Index FAQ | Shortlists and Evidence",
    description:
      "Read independent answers about Kakobuy spreadsheet searches, duplicate control, shortlist evidence, safety research and shipping estimates.",
    eyebrow: "Index questions",
    title: "Know what the index can and cannot establish.",
    intro:
      "These answers keep discovery records separate from changing product, seller, service and route facts.",
    sections: [],
    questions: [
      { question: "Is this an official Kakobuy spreadsheet?", answer: "No. It is an independent index and research method. Use the current Kakobuy service for accounts, orders, warehouse actions and route tools." },
      { question: "Why remove duplicate listings?", answer: "Repeated cards can overstate the number of real choices. Group candidates by current source, seller context, images, option labels and identifiers before comparing them." },
      { question: "What makes a listing shortlist-ready?", answer: "The current source opens, the intended option is identifiable, useful evidence is visible and unresolved questions are recorded rather than guessed." },
      { question: "Does the Kakobuy Score prove safety?", answer: "No. It measures the completeness of this independent shortlist record, not platform, seller, product, authenticity, route or delivery outcomes." },
      { question: "Can the index predict shipping time?", answer: "No. Use current parcel measurements, contents, destination and route information from the service responsible for the shipment." },
    ],
  },
];

const KAKOBUY_ITEMS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "kakobuyitems.com",
    slug: "categories",
    seoTitle: "Kakobuy Item Categories | Evidence Fields by Product Type",
    description:
      "Review Kakobuy-linked item categories using product-specific image, measurement, material, specification and option evidence fields.",
    eyebrow: "Item evidence by category",
    title: "Use a different evidence file for each product type.",
    intro:
      "The same generic checklist cannot explain shoes, garments, bags and electronics equally well. Start with the fields that describe the exact item.",
    sections: [
      { title: "Footwear file", description: "Record the labeled size system, measurement reference, upper and sole context, intended colorway and visible construction details." },
      { title: "Garment file", description: "Record garment measurements, stated fabric, intended variation, print or embroidery placement, closures and care details when shown." },
      { title: "Bag and accessory file", description: "Record dimensions, compartments, closures, hardware, strap details, stated material and included pieces." },
      { title: "Electronics file", description: "Record exact model, voltage, plug, language, interfaces, compatibility, battery information and unresolved route restrictions." },
    ],
  },
  {
    domain: "kakobuyitems.com",
    slug: "guide",
    seoTitle: "Kakobuy Items Guide | Build a Source-Linked Evidence File",
    description:
      "Create a Kakobuy item evidence file with the source URL, intended option, visible claims, measurements, images, contradictions and review date.",
    eyebrow: "Item-file workflow",
    title: "Keep one evidence file for one intended item.",
    intro:
      "An item file should remain understandable after the card, seller page or service view changes. Preserve what was visible and what still needs confirmation.",
    sections: [
      { title: "Identify", description: "Save the current source, seller context, item title and the exact size, color, model, material, set or quantity being researched." },
      { title: "Observe", description: "Record visible measurements, specifications, photos and claims without upgrading them into verified facts." },
      { title: "Reconcile", description: "Compare the title, images, variation labels and specifications; mark every disagreement as unresolved." },
      { title: "Recheck", description: "Add the review date and reopen the source before price, stock, options or product evidence is used later." },
    ],
  },
  {
    domain: "kakobuyitems.com",
    slug: "kakobuy-score",
    seoTitle: "Kakobuy Item Score | Evidence Completeness Checklist",
    description:
      "Check a Kakobuy-linked item file for source identity, option match, image coverage, measurements, contradictions and current review date.",
    eyebrow: "Item-file completeness",
    title: "Measure documentation quality, not product quality.",
    intro:
      "This independent checklist asks whether the item is documented well enough to compare. It does not authenticate the product or rate the seller or platform.",
    sections: [
      { title: "Identity", description: "The current source and intended option are unambiguous enough to reopen and compare." },
      { title: "Coverage", description: "Images and visible fields cover the category-specific details needed for the intended decision." },
      { title: "Consistency", description: "Title, images, measurements, specifications and option labels do not silently describe different items." },
      { title: "Open questions", description: "Missing evidence, uncertain claims, price context and destination questions are listed explicitly." },
    ],
  },
  {
    domain: "kakobuyitems.com",
    slug: "safety",
    seoTitle: "Kakobuy Item Safety Research | Claims, Materials and Use",
    description:
      "Review a Kakobuy-linked item's seller claims, materials, measurements, electrical details, intended use and destination restrictions separately.",
    eyebrow: "Item-specific risk file",
    title: "A platform check does not replace an item check.",
    intro:
      "Product risk depends on the exact item, its claims, materials, construction, intended use and destination. Keep these questions attached to the product file.",
    sections: [
      { title: "Claims and identity", description: "Distinguish visible seller wording from independently verified identity, authenticity, performance or certification." },
      { title: "Materials and construction", description: "Record what is stated and what images show; leave unknown composition or construction details unresolved." },
      { title: "Use and compatibility", description: "Check sizing, fit, voltage, plug, interfaces, batteries, age suitability or other use-specific requirements." },
      { title: "Destination constraints", description: "Review current import, carrier and route restrictions for the exact contents with the responsible sources." },
    ],
  },
  {
    domain: "kakobuyitems.com",
    slug: "search-ideas",
    seoTitle: "Kakobuy Item Search Ideas | Find the Exact Variation",
    description:
      "Build Kakobuy item searches around exact model, variation, size, material, specification and source clues, then verify the destination page.",
    eyebrow: "Exact-item query builder",
    title: "Search for the variation you actually intend to review.",
    intro:
      "The result title is only a lead. Open the current source and confirm that the requested option and evidence belong to the same item file.",
    sections: [
      { title: "Model and variation", description: "Combine the product type with the exact model, color, size, material, set or quantity that matters." },
      { title: "Measurement clue", description: "Use a decisive dimension or compatibility field when it separates similar-looking results." },
      { title: "Source clue", description: "Add marketplace or seller wording only when the current destination confirms that source context." },
      { title: "Evidence query", description: "After discovery, search within the record for the missing measurement, specification, image angle or option detail." },
    ],
  },
  {
    domain: "kakobuyitems.com",
    slug: "shipping",
    seoTitle: "Kakobuy Item Shipping Inputs | Weight, Size and Restrictions",
    description:
      "Prepare item-level Kakobuy shipping research with exact contents, received measurements, packaging questions and potential restrictions.",
    eyebrow: "Item-to-parcel handoff",
    title: "Finish the item record before estimating the parcel.",
    intro:
      "A listing card cannot establish chargeable weight or route eligibility. The parcel decision needs received-item and packaging evidence.",
    sections: [
      { title: "Exact contents", description: "Confirm quantity, set contents, included packaging and any batteries, liquids, powders, magnets or other restricted characteristics." },
      { title: "Received measurements", description: "Use warehouse-recorded weight and dimensions when available instead of treating seller estimates as final parcel data." },
      { title: "Packaging decision", description: "Record which boxes, protective materials or optional packaging remain and how they affect the package." },
      { title: "Current route check", description: "Use the complete parcel and destination record with the current service responsible for route eligibility and terms." },
    ],
  },
  {
    domain: "kakobuyitems.com",
    slug: "faq",
    seoTitle: "Kakobuy Items FAQ | Options, Evidence and Item Files",
    description:
      "Read independent answers about Kakobuy item pages, option matching, QC evidence, measurements, product claims and parcel handoffs.",
    eyebrow: "Item-file questions",
    title: "Keep discovery, evidence and transaction facts separate.",
    intro:
      "These answers explain how to document a specific item without presenting changing seller or service information as verified fact.",
    sections: [],
    questions: [
      { question: "Is KakobuyItems the official Kakobuy item site?", answer: "No. It is an independent product-research interface. Use the current Kakobuy destination for accounts, orders, warehouse actions and service terms." },
      { question: "What belongs in an item file?", answer: "Keep the current source, seller context, exact intended option, visible claims, measurements, specifications, images, contradictions, open questions and review date together." },
      { question: "Do item images prove authenticity or quality?", answer: "No. Images are evidence to inspect, not automatic proof of identity, materials, performance, condition or authenticity." },
      { question: "Why save the exact variation?", answer: "A product page may contain several sizes, colors, models or sets. The file is useful only when its evidence clearly belongs to the intended option." },
      { question: "Can a listing weight be used as the final shipping weight?", answer: "Do not assume so. Use received-item and packaged-parcel measurements with current route information from the responsible service." },
    ],
  },
];

const LITBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "litbuyindex.com",
    slug: "categories",
    seoTitle: "LitBuy Spreadsheet Categories | Query Fields by Product Type",
    description:
      "Search LitBuy spreadsheet categories with product-specific size, material, model and compatibility fields before retaining a result.",
    eyebrow: "Category query rules",
    title: "Define the evidence floor before opening the category.",
    intro:
      "A category is useful when it tells the index which fields separate a usable result from an incomplete one.",
    sections: [
      { title: "Shoes and garments", description: "Add the intended size system, measurements, material and variation before treating similar cards as comparable." },
      { title: "Bags and accessories", description: "Require dimensions, closures, hardware, included pieces and the exact option saved from the current source." },
      { title: "Watches and electronics", description: "Record model, dimensions, interfaces, voltage, plug, language, battery and compatibility fields when relevant." },
      { title: "Sets and mixed listings", description: "State quantity, included pieces and variation boundaries so the index does not merge different bundles." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "codes-coupons",
    seoTitle: "LitBuy Codes and Coupons | Independent Verification Record",
    description:
      "Check a LitBuy code or coupon by recording its source, date, eligibility, expiry, scope and checkout result without publishing an unverified offer.",
    eyebrow: "Offer verification record",
    title: "Publish the conditions, not just the code.",
    intro:
      "A promotion is useful only when its source and current restrictions are clear. Keep changing offer details out of product records.",
    sections: [
      { title: "Source and date", description: "Record where the offer appeared and when the terms were reviewed." },
      { title: "Eligibility", description: "Check account, region, new-user, route, category or payment requirements shown with the offer." },
      { title: "Value and limits", description: "Separate product discounts, service discounts and shipping discounts, including minimum spend and caps." },
      { title: "Checkout confirmation", description: "Treat the current checkout result as the final check and remove expired or conflicting records from the index." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "faq",
    seoTitle: "LitBuy Search Index FAQ | Queries, Links and Refresh Dates",
    description:
      "Read independent answers about LitBuy spreadsheet queries, duplicate results, refresh dates, codes, safety research and shipping timelines.",
    eyebrow: "Index questions",
    title: "Know why a link was retained and when it needs review.",
    intro:
      "These answers define the boundary between a product-search record and changing product, seller, service or delivery facts.",
    sections: [],
    questions: [
      { question: "Is this an official LitBuy spreadsheet?", answer: "No. It is an independent search index. Use the current LitBuy destination for accounts, transactions, warehouse actions and route tools." },
      { question: "Why group duplicate results?", answer: "Repeated cards can describe the same source or variation. Group them by destination, seller context, identifiers, images and option labels before counting choices." },
      { question: "What makes an indexed result usable?", answer: "The current source opens, the intended option is identifiable, useful evidence is visible and the review date and open questions are recorded." },
      { question: "Are listed codes or coupons guaranteed to work?", answer: "No. Verify the current source, eligibility, expiry, scope and checkout result before relying on any offer." },
      { question: "Can the index predict delivery time?", answer: "No. Shipping depends on several stages and current parcel and route information that a product index cannot establish." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "guide",
    seoTitle: "LitBuy Spreadsheet Guide | Query, Group and Refresh",
    description:
      "Use a repeatable LitBuy spreadsheet workflow to write a focused query, group repeated links, retain documented candidates and refresh sources.",
    eyebrow: "LitBuy index method",
    title: "Make every retained result easy to explain and reopen.",
    intro:
      "The index should become smaller as evidence improves. Keep only candidates that still answer the original query.",
    sections: [
      { title: "Write the query", description: "State the product type and decisive variation, measurement, model or compatibility field before browsing." },
      { title: "Group repeated candidates", description: "Compare current source, seller context, identifiers, images and options before treating similar cards as separate." },
      { title: "Retain with a reason", description: "Save the intended option, visible evidence, review date and the question that still needs confirmation." },
      { title: "Refresh before reuse", description: "Reopen the source and update price, availability, options and evidence instead of carrying old values forward." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "safety",
    seoTitle: "Is LitBuy Legit and Safe? Index Research Boundaries",
    description:
      "Research LitBuy service identity, transaction terms, seller evidence, product claims, account controls and route risk as separate questions.",
    eyebrow: "Layered safety research",
    title: "An index can organize checks but cannot replace them.",
    intro:
      "A general legitimacy answer does not verify every seller, item, payment, account or route. Match each question to a current source.",
    sections: [
      { title: "Service and account", description: "Confirm the current first-party destination, company and policy information, account security and recovery controls." },
      { title: "Payment and terms", description: "Read the current purchase, cancellation, refund, inspection and dispute rules for the intended action." },
      { title: "Seller and item", description: "Review source status, exact option, images, measurements and product claims separately from the service." },
      { title: "Parcel and destination", description: "Use exact contents, measured package data, restrictions and current destination guidance for route decisions." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "search-ideas",
    seoTitle: "LitBuy Spreadsheet Search Ideas | Better Query Design",
    description:
      "Create focused LitBuy spreadsheet searches with product, variation, measurement, model, material and compatibility terms, then save the review outcome.",
    eyebrow: "Query design notebook",
    title: "Add the term that changes which results deserve review.",
    intro:
      "A longer query is not automatically better. Use only the attributes that define the intended comparison.",
    sections: [
      { title: "Known item", description: "Combine product type with exact model, selected variation and one decisive specification." },
      { title: "Broad discovery", description: "Begin with a category, then add the measurement, material or function needed to reduce unrelated results." },
      { title: "Source refinement", description: "Use marketplace or seller clues only when the opened destination confirms that context." },
      { title: "Save the outcome", description: "Record the query, retained links, review date and missing field so the search can be repeated consistently." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "shipping",
    seoTitle: "How Long Does LitBuy Take? Timeline Evidence Log",
    description:
      "Research LitBuy delivery timing by recording seller transfer, warehouse handling, parcel preparation, international movement, customs and last mile separately.",
    eyebrow: "Timeline evidence log",
    title: "Record the stage behind every date estimate.",
    intro:
      "A single delivery number hides several independent stages. Use current evidence for the exact order, parcel and destination.",
    sections: [
      { title: "Seller transfer", description: "Record seller dispatch and warehouse receipt as separate events for the intended item." },
      { title: "Warehouse handling", description: "Track intake, inspection decisions, selected contents and parcel preparation without assuming fixed timing." },
      { title: "International route", description: "Use current eligibility and estimate ranges for the measured parcel and exact destination." },
      { title: "Customs and last mile", description: "Keep destination review and local carrier movement separate from seller and warehouse stages." },
    ],
  },
  {
    domain: "litbuyindex.com",
    slug: "freight-estimator",
    seoTitle: "LitBuy Freight Estimator Guide | Record Inputs and Results",
    description:
      "Use the official LitBuy freight estimator as a dated planning source, preserve destination and parcel inputs, and keep estimates separate from packed-parcel charges.",
    eyebrow: "LitBuy estimator evidence",
    title: "Preserve the inputs behind every freight estimate.",
    intro:
      "Save the destination, parcel evidence, displayed result and review time before comparing the estimate with a packed parcel.",
    sections: [
      { title: "Define the comparison", description: "Record the exact destination and the parcel evidence used for this check without borrowing values from an unrelated haul." },
      { title: "Preserve the current result", description: "Keep the displayed options, currency, included fields and unresolved charges with the review time rather than copying a detached number." },
      { title: "Replace planning with measured evidence", description: "When the parcel is packed, compare the current result with measured weight, dimensions, contents and the route options actually offered." },
    ],
    questions: [
      { question: "Where should a LitBuy freight estimate be checked?", answer: "Use the current Freight Estimator linked from the official LitBuy site. This independent guide does not calculate or quote a live shipping amount." },
      { question: "Is an estimator result the final parcel charge?", answer: "No. Treat it as a dated planning result and recheck the packed parcel, current options, included services, currency and unresolved charges before submission." },
      { question: "Can one estimate be reused for another parcel?", answer: "Do not assume so. Destination, contents, measurements, current options and service conditions can differ, so preserve the inputs for each comparison." },
    ],
  },
];

const LITBUY_ITEMS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "litbuyitems.com",
    slug: "categories",
    seoTitle: "LitBuy Item Categories | Evidence Fields for Exact Options",
    description:
      "Review LitBuy-linked items with category-specific measurements, materials, specifications, images and variation fields tied to the exact option.",
    eyebrow: "Item evidence by category",
    title: "Use the fields that describe this product, not every product.",
    intro:
      "A useful item file changes with the category because garments, bags and electronics require different evidence.",
    sections: [
      { title: "Footwear and clothing", description: "Save the size system, item measurements, stated material, intended variation and visible construction details." },
      { title: "Bags and accessories", description: "Record dimensions, compartments, closures, straps, hardware and included pieces for the selected option." },
      { title: "Watches and electronics", description: "Record model, dimensions, interfaces, power details, compatibility and any unresolved battery or route question." },
      { title: "Sets and quantities", description: "Identify every included piece, quantity and variation so evidence is not attached to the wrong bundle." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "coupons",
    seoTitle: "LitBuy Coupons and Item Cost | Keep Discounts Separate",
    description:
      "Keep LitBuy coupon terms separate from item evidence by checking source, eligibility, expiry, scope and the current checkout result.",
    eyebrow: "Offer and item boundary",
    title: "Do not write a temporary discount into the product record.",
    intro:
      "The item file describes the selected product. A coupon belongs in a separate dated offer record with its own conditions.",
    sections: [
      { title: "Identify the offer", description: "Save the current source, date and wording without treating an old shared code as active." },
      { title: "Separate the scope", description: "Distinguish item, service and shipping discounts and record any category or route restrictions." },
      { title: "Check eligibility", description: "Review account, region, minimum spend, payment and new-user conditions shown with the offer." },
      { title: "Confirm at checkout", description: "Use the current checkout result and final total before deciding whether the offer changes the comparison." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "faq",
    seoTitle: "LitBuy Item FAQ | Options, Images and Evidence",
    description:
      "Read independent answers about LitBuy item pages, exact variations, images, measurements, invitation codes, safety checks and parcel inputs.",
    eyebrow: "Item-file questions",
    title: "Keep every answer attached to the intended item.",
    intro:
      "These answers explain how to document a product without turning seller wording or service information into verified item facts.",
    sections: [],
    questions: [
      { question: "Is LitBuyItems an official LitBuy product site?", answer: "No. It is an independent item-research interface. Use the current LitBuy destination for accounts, orders, warehouse actions and service terms." },
      { question: "What belongs in a LitBuy item file?", answer: "Keep the source, seller context, exact intended option, visible claims, images, measurements, specifications, contradictions, questions and review date together." },
      { question: "Do product images verify identity or quality?", answer: "No. Images are evidence to inspect and compare, not automatic proof of materials, performance, condition, identity or authenticity." },
      { question: "Does an invitation code change the item evidence?", answer: "No. Registration context and temporary account offers are separate from the selected product, source and variation evidence." },
      { question: "Can seller weight be used as final shipping weight?", answer: "Do not assume so. Use received-item and packaged-parcel measurements with current route information." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "guide",
    seoTitle: "LitBuy Item Guide | Build a Source-Linked Product File",
    description:
      "Build a LitBuy item file with the current source, intended option, visible claims, measurements, images, contradictions and review date.",
    eyebrow: "Source-linked item workflow",
    title: "Make one file describe one intended variation.",
    intro:
      "A product page may contain several sizes, colors, models or sets. Keep the evidence tied to the option you actually intend to review.",
    sections: [
      { title: "Identify", description: "Save the current source, seller context, title and exact size, color, model, material, set or quantity." },
      { title: "Observe", description: "Record visible images, measurements, specifications and claims without upgrading them into verified facts." },
      { title: "Reconcile", description: "Compare title, option labels, images and specifications, then mark disagreements as unresolved." },
      { title: "Recheck", description: "Add the review date and reopen the source before reusing price, stock, options or product evidence." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "haul-review",
    seoTitle: "LitBuy Haul Review | Link, Option, QC and Parcel Evidence",
    description:
      "Review a LitBuy haul by keeping each current product link, intended option, warehouse QC record, parcel measurement and dated outcome attached to the right item.",
    eyebrow: "Haul evidence review",
    title: "A useful haul review lets every claim be traced to the right item and stage.",
    intro:
      "A haul can show several products and one parcel outcome. Separate those records so an observation about one item or route does not become a claim about every result.",
    sections: [
      { title: "Current product source", description: "Reopen each product link and record the seller context, selected variation and review date before reusing product details." },
      { title: "Requested and received item", description: "Keep the intended option beside the relevant warehouse images, measurements and unresolved differences." },
      { title: "Parcel evidence", description: "Record complete contents, packaging, measured weight and dimensions, route and destination for the reviewed parcel." },
      { title: "Dated outcome", description: "Limit delivery, support and condition observations to the documented order and date instead of presenting them as a permanent platform result." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "invitation-code",
    seoTitle: "LitBuy Invitation Code | Account Context, Not Product Evidence",
    description:
      "Understand where a LitBuy invitation code fits in registration while keeping account offers separate from product, option and source evidence.",
    eyebrow: "Registration context",
    title: "Verify the account field without changing the item record.",
    intro:
      "An invitation link or code may carry registration context. It does not verify a product or guarantee a reward, price or service result.",
    sections: [
      { title: "Open the current destination", description: "Confirm the domain and registration page before entering account or invitation information." },
      { title: "Inspect the field", description: "Check whether the code is optional, prefilled or editable and whether current terms are shown nearby." },
      { title: "Separate offer claims", description: "Record reward wording, eligibility, expiry and source outside the product file." },
      { title: "Confirm the account state", description: "Rely on the current account interface for whether a code or benefit was accepted." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "safety",
    seoTitle: "Is LitBuy Safe for This Item? Product-Level Checks",
    description:
      "Research a LitBuy-linked item's claims, materials, sizing, electrical details, intended use and destination constraints separately from platform questions.",
    eyebrow: "Item-level risk file",
    title: "A service check does not answer the product question.",
    intro:
      "Product risk belongs to the exact item and intended use. Keep those checks inside the source-linked item file.",
    sections: [
      { title: "Claims and identity", description: "Separate seller wording from independently verified identity, authenticity, performance or certification." },
      { title: "Materials and construction", description: "Record what is stated and visible while leaving unknown composition or construction details unresolved." },
      { title: "Use and compatibility", description: "Check fit, sizing, voltage, plug, interfaces, batteries, age suitability or other use-specific requirements." },
      { title: "Destination constraints", description: "Review current import, carrier and route restrictions for the exact contents with responsible sources." },
    ],
  },
  {
    domain: "litbuyitems.com",
    slug: "shipping",
    seoTitle: "LitBuy Item Shipping Inputs | Contents, Weight and Packaging",
    description:
      "Prepare item-level LitBuy shipping research with exact contents, received measurements, packaging choices, restrictions and destination questions.",
    eyebrow: "Item-to-parcel inputs",
    title: "Finish the item record before estimating a parcel.",
    intro:
      "A listing card cannot establish chargeable weight or route eligibility. The parcel needs received-item and packaging evidence.",
    sections: [
      { title: "Exact contents", description: "Confirm quantity, included pieces and any batteries, liquids, powders, magnets or other restricted characteristics." },
      { title: "Received measurements", description: "Use warehouse-recorded weight and dimensions when available instead of treating seller estimates as final." },
      { title: "Packaging choice", description: "Record retained boxes, protective materials and optional packaging that may change the parcel." },
      { title: "Current route check", description: "Use the complete package and destination record with the current service responsible for route eligibility." },
    ],
  },
];

const LITBUY_PRODUCTS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "litbuyproducts.com",
    slug: "coupons",
    seoTitle: "LitBuy Catalog Coupons | Verify Offer Scope at Checkout",
    description:
      "Research LitBuy catalog offers by checking the current source, eligible product groups, account conditions, expiry, limits and checkout result.",
    eyebrow: "Catalog offer scope",
    title: "Check whether the offer applies to this catalog path.",
    intro:
      "An offer may apply to products, services or shipping and may exclude categories or routes. Preserve the current terms with the offer record.",
    sections: [
      { title: "Source and date", description: "Record the current destination and review date rather than copying an undated promotion." },
      { title: "Product scope", description: "Check included and excluded categories, sellers, account types or payment methods." },
      { title: "Value and limits", description: "Record minimum spend, caps, expiry and whether the discount targets product, service or shipping charges." },
      { title: "Current checkout", description: "Use the final total and accepted offer state as the decision point." },
    ],
  },
  {
    domain: "litbuyproducts.com",
    slug: "faq",
    seoTitle: "LitBuy Product Catalog FAQ | Categories, Sources and Boundaries",
    description:
      "Read independent answers about LitBuy product categories, spreadsheet links, source checks, invitation codes, service stages and delivery research.",
    eyebrow: "Catalog questions",
    title: "Use the catalog to discover, then use current sources to decide.",
    intro:
      "These answers keep category navigation separate from product verification and changing transaction or route details.",
    sections: [],
    questions: [
      { question: "Is this the official LitBuy product catalog?", answer: "No. It is an independent category and product-research map. Use the current LitBuy destination for accounts, purchases, forwarding and route tools." },
      { question: "What should a category page define?", answer: "It should identify the measurements, materials, specifications or compatibility fields needed to compare listings in that product group." },
      { question: "Can an old spreadsheet link remain in the catalog?", answer: "Only after the destination is reopened and the current product, option, source evidence and review date are recorded." },
      { question: "Does an invitation code verify the catalog or item?", answer: "No. It belongs to registration context and any current account offer terms." },
      { question: "Can catalog data establish delivery time?", answer: "No. Delivery research needs the current seller, warehouse, parcel, route, customs and last-mile stages." },
    ],
  },
  {
    domain: "litbuyproducts.com",
    slug: "guide",
    seoTitle: "How Does LitBuy Work? Catalog-to-Service Handoff",
    description:
      "Map the independent LitBuy product-discovery path to current purchase, warehouse, inspection, parcel and route checks without mixing their evidence.",
    eyebrow: "Catalog-to-service handoff",
    title: "Carry the right record into each next stage.",
    intro:
      "The catalog supports discovery. Current account, transaction, warehouse and shipping actions take place on the service responsible for them.",
    sections: [
      { title: "Product discovery", description: "Choose a category, define comparison fields and retain a current source with an exact intended option." },
      { title: "Purchase decision", description: "Review current seller, price, quantity, option and applicable transaction terms before ordering." },
      { title: "Warehouse review", description: "Compare received-item evidence and measurements with the intended product record." },
      { title: "Parcel and route", description: "Use selected contents, measured package data, destination and current route information for shipping decisions." },
    ],
  },
  {
    domain: "litbuyproducts.com",
    slug: "invitation-code",
    seoTitle: "LitBuy Invitation Code Guide | Verify Current Registration Offers",
    description:
      "Check where a LitBuy invitation code belongs in the current registration flow, verify any displayed offer terms and keep it separate from product rankings.",
    eyebrow: "LitBuy invitation code check",
    title: "Verify the registration path and current offer terms.",
    intro:
      "An invitation code can be part of an account flow. It does not make a listing more complete, current or suitable for comparison.",
    sections: [
      { title: "Verify the destination", description: "Open the current first-party registration path before entering account information." },
      { title: "Read the current field", description: "Check whether a code is optional or prefilled and whether terms are displayed." },
      { title: "Record offer conditions", description: "Keep reward, eligibility, expiry and source details outside catalog ranking fields." },
      { title: "Return to product evidence", description: "Rank catalog entries by source and category-specific evidence, not account promotion claims." },
    ],
  },
  {
    domain: "litbuyproducts.com",
    slug: "safety",
    seoTitle: "Is LitBuy Legit? Service, Catalog and Seller Layers",
    description:
      "Separate LitBuy service identity and terms from independent catalog structure, seller evidence, product claims, payments and destination risk.",
    eyebrow: "Service and catalog layers",
    title: "Ask which layer the available evidence can answer.",
    intro:
      "A service identity check cannot verify every seller or item, and a product catalog cannot establish current service outcomes.",
    sections: [
      { title: "Service identity", description: "Confirm the current destination, company and policy information, account security and applicable terms." },
      { title: "Catalog boundary", description: "Treat category pages and search results as discovery tools, not transaction or product verification." },
      { title: "Seller and product", description: "Review the current source, intended option, visible evidence and product claims as a separate layer." },
      { title: "Payment and destination", description: "Check current transaction, refund, parcel, restriction and destination information with responsible sources." },
    ],
  },
  {
    domain: "litbuyproducts.com",
    slug: "shipping",
    seoTitle: "LitBuy Delivery Stages | Catalog-to-Parcel Planning",
    description:
      "Plan LitBuy delivery research by separating product selection, seller transfer, warehouse evidence, parcel preparation, routes, customs and last mile.",
    eyebrow: "Catalog-to-parcel timeline",
    title: "Do not attach one delivery promise to every catalog item.",
    intro:
      "Delivery timing begins after the product choice and changes with the seller, received item, selected parcel, route and destination.",
    sections: [
      { title: "Seller transfer", description: "Track dispatch and warehouse receipt for the exact ordered option rather than using a general catalog estimate." },
      { title: "Warehouse evidence", description: "Review received-item records and resolve option or condition questions before parcel creation." },
      { title: "Parcel preparation", description: "Use selected contents, measured weight, dimensions, packaging and restrictions." },
      { title: "Route and destination", description: "Check current eligibility, customs context and last-mile movement for the exact parcel and location." },
    ],
  },
  {
    domain: "litbuyproducts.com",
    slug: "spreadsheet",
    seoTitle: "LitBuy Spreadsheet Catalog | Category Map and Source Refresh",
    description:
      "Use the LitBuy spreadsheet as a category discovery map, then refresh each source, intended option and category-specific evidence before comparison.",
    eyebrow: "Spreadsheet category map",
    title: "Turn old rows into current category leads.",
    intro:
      "A spreadsheet can preserve useful discovery paths, but every product row needs a current destination and comparison-ready evidence.",
    sections: [
      { title: "Choose the product group", description: "Start with a category whose comparison fields are clear rather than browsing every row equally." },
      { title: "Open the current source", description: "Confirm the destination still represents the intended product and seller context." },
      { title: "Match the variation", description: "Record the exact size, color, model, material, set or quantity from the current page." },
      { title: "Refresh the evidence", description: "Update visible measurements, specifications, images and unresolved questions before retaining the row." },
    ],
  },
];

const LOONGBUY_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "loongbuys.net",
    slug: "categories",
    seoTitle: "LoongBuy Product Categories | Build a Checkable Shortlist",
    description:
      "Browse LoongBuy-linked categories using the product-specific measurements, option fields and source evidence needed to compare current listings.",
    eyebrow: "LoongBuy category checklist",
    title: "Let the product type decide what must be checked.",
    intro:
      "Shoes, apparel, electronics and accessories do not share one useful comparison template. Define the evidence for the category before saving a link.",
    sections: [
      { title: "Footwear", description: "Record labeled size, foot or insole measurements, materials, construction views and the exact selected variation." },
      { title: "Apparel", description: "Use garment measurements, fabric wording, color and detail photos instead of relying on a general size label." },
      { title: "Electronics", description: "Check model, voltage, plug, interface, battery, included parts and destination compatibility on the current source." },
      { title: "Accessories", description: "Record dimensions, material claims, closures, included pieces and any item characteristics relevant to route restrictions." },
    ],
  },
  {
    domain: "loongbuys.net",
    slug: "guide",
    seoTitle: "LoongBuy Guide | Source, QC, Weight and Shipping Route",
    description:
      "Follow a LoongBuy-linked product from source selection through warehouse evidence, measured parcel inputs and a current destination route check.",
    eyebrow: "Four-stage evidence route",
    title: "Use the evidence created at each handoff.",
    intro:
      "The source page identifies the requested option, the warehouse record shows what arrived and the parcel record supports the final route decision.",
    sections: [
      { title: "1. Source link", description: "Save the current destination, seller context, selected variation, quantity and unresolved listing fields before ordering." },
      { title: "2. Warehouse record", description: "Match received-item images and notes to the requested option, then resolve visible differences before parcel creation." },
      { title: "3. Measured parcel", description: "Use received weight, dimensions, retained packaging and complete contents rather than an early catalog estimate." },
      { title: "4. Current route", description: "Check eligibility, restrictions, pricing inputs and destination terms with the responsible service at the time of action." },
    ],
  },
  {
    domain: "loongbuys.net",
    slug: "shipping-calculator",
    seoTitle: "LoongBuy Shipping Calculator Guide | Inputs and Final Charge",
    description:
      "Use the official LoongBuy freight query with area, weight, goods restrictions and parcel dimensions, then compare its result with the measured packed parcel.",
    eyebrow: "LoongBuy freight query guide",
    title: "Estimate with official inputs, then verify the packed parcel.",
    intro:
      "LoongBuy's freight query asks for area, weight, mail-limit details and parcel dimensions. Its shopping process says the final charge is reconciled after the shipping company measures the package.",
    sourceUrl: "https://service.loongbuy.com/en/query/freight",
    sourceLabel: "Open the official LoongBuy freight query",
    sections: [
      {
        title: "Match the official fields",
        description:
          "Record the destination area, weight in grams, relevant goods restriction and package length, width and height used for the query.",
        points: [
          "Keep the destination with every saved result",
          "Do not omit battery, liquid, branded-goods or size restrictions",
          "Retain all three dimensions with the weight",
        ],
      },
      {
        title: "Separate item weight from parcel weight",
        description:
          "LoongBuy documents volumetric weight for bulky parcels and notes that packaging can change the final measured package.",
        points: [
          "Label early figures as estimates",
          "Record the packaging state used for comparison",
          "Recheck when items are combined or removed",
        ],
      },
      {
        title: "Reconcile the submitted parcel",
        description:
          "Compare the system or manual quotation with the package size and weight recorded after packing, then retain any adjustment in the account record.",
        points: [
          "Confirm the current route and destination terms",
          "Keep optional packaging services separate",
          "Use the measured parcel record as the later evidence source",
        ],
      },
    ],
  },
  {
    domain: "loongbuys.net",
    slug: "reviews",
    seoTitle: "LoongBuy Reviews | Evaluate Route and Order Evidence",
    description:
      "Evaluate LoongBuy reviews by date, product, destination, parcel details and supporting evidence instead of treating a single experience as a general result.",
    eyebrow: "Review evidence framework",
    title: "A useful review explains what happened and when.",
    intro:
      "An order experience becomes more informative when it identifies the exact product, parcel, route, destination and dated records behind the conclusion.",
    sections: [
      { title: "Date and stage", description: "Identify whether the review concerns purchasing, warehouse handling, parcel submission, customs or final delivery and when it occurred." },
      { title: "Product and parcel", description: "Separate an item-specific observation from a parcel-wide claim and record weight, dimensions or packaging when relevant." },
      { title: "Route and destination", description: "Keep the carrier path and destination visible because route availability and outcomes can differ by location and time." },
      { title: "Supporting record", description: "Prefer reviews that retain order status, QC photos, parcel measurements, tracking events or dated support responses." },
    ],
  },
  {
    domain: "loongbuys.net",
    slug: "safety",
    seoTitle: "Is LoongBuy Legit? Current Checks Before Using the Service",
    description:
      "Use current LoongBuy domain, policy, payment, warehouse and support evidence to evaluate the next action without turning a dated check into a permanent verdict.",
    eyebrow: "Current-service verification",
    title: "Recheck the service evidence that can change.",
    intro:
      "A domain response or old review answers only part of the question. Confirm the current destination, account controls, terms and responsible support channel before acting.",
    sections: [
      { title: "Destination and identity", description: "Open the current official destination directly and verify that login, policy and support links stay within the expected service context." },
      { title: "Payment and account", description: "Review the current payment flow, refund path, account security controls and transaction records before committing funds." },
      { title: "Warehouse and parcel", description: "Understand how received-item evidence, storage, parcel changes and disputes are recorded for the exact order." },
      { title: "Rules and support", description: "Read current restrictions, route terms and support escalation steps rather than relying on copied claims or undated screenshots." },
    ],
  },
  {
    domain: "loongbuys.net",
    slug: "faq",
    seoTitle: "LoongBuy FAQ | Product Links, QC, Reviews and Shipping",
    description:
      "Read independent answers about LoongBuy product links, warehouse QC evidence, review context, parcel measurements and current route checks.",
    eyebrow: "LoongBuy evidence questions",
    title: "Keep product, warehouse and parcel answers separate.",
    intro:
      "Each stage produces different evidence. Use the source responsible for the question instead of asking one page to prove the whole journey.",
    sections: [
      { title: "Can a listing confirm the received item?", description: "No. Preserve the requested option on the source page, then compare it with the warehouse record created after receipt." },
      { title: "Is seller weight the shipping weight?", description: "Not necessarily. Parcel decisions should use the received contents, selected packaging and measured parcel record when available." },
      { title: "Does one review prove every route?", description: "No. A review describes a dated experience involving a particular product, parcel, carrier path and destination." },
      { title: "Where should changing terms be checked?", description: "Open the current official destination and the responsible service record before payment, parcel submission or a support request." },
    ],
  },
];

const LOVEGOBUY_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "lovegobuyindex.com",
    slug: "categories",
    seoTitle: "LoveGoBuy Product Categories | Compare Listing Fields",
    description:
      "Browse LoveGoBuy-linked categories with a comparison boundary for size, material, model, compatibility and current source evidence.",
    eyebrow: "LoveGoBuy category map",
    title: "Choose the product group before comparing results.",
    intro:
      "A useful directory groups listings by the fields that make them comparable, then leaves source verification and order-stage questions visible.",
    sections: [
      { title: "Wearables", description: "Compare labeled size with measurements, materials, color, construction views and the exact selected variation." },
      { title: "Bags and accessories", description: "Record dimensions, closures, included pieces, material wording and detail photos from the current source." },
      { title: "Electronics", description: "Match model, specification, voltage, plug, interface, battery and destination compatibility before shortlisting." },
      { title: "Home and other items", description: "Define dimensions, quantity, materials, intended use and any restriction-relevant characteristics for that product type." },
    ],
  },
  {
    domain: "lovegobuyindex.com",
    slug: "faq",
    seoTitle: "LoveGoBuy FAQ | Directory, Order Stage and Service Questions",
    description:
      "Read independent answers about LoveGoBuy-linked products, source checks, coupons, warehouse records, refunds and external service actions.",
    eyebrow: "LoveGoBuy task questions",
    title: "Identify which record can answer the question.",
    intro:
      "Catalog discovery, seller evidence, order status, warehouse records and service policies belong to different stages and should not be merged into one claim.",
    sections: [
      { title: "Does the directory sell products?", description: "No. It organizes discovery and research paths. Transactions and changing service details belong to the external destination." },
      { title: "Does a coupon label prove current eligibility?", description: "No. Verify the code, scope, account requirements, deadline and result in the current service flow before relying on it." },
      { title: "Can a catalog page answer a refund question?", description: "No. Use the current order status, transaction record and applicable service policy for the exact request." },
      { title: "What should be saved?", description: "Keep the source URL, selected option, date, order stage and the evidence or policy used for the next decision." },
    ],
  },
  {
    domain: "lovegobuyindex.com",
    slug: "guide",
    seoTitle: "LoveGoBuy Guide | From Product Discovery to Order Action",
    description:
      "Use a LoveGoBuy product directory without mixing discovery, source verification, order status, warehouse evidence and service-policy decisions.",
    eyebrow: "Product-to-order workflow",
    title: "Move one stage at a time and preserve the evidence.",
    intro:
      "The next useful action depends on whether you are still comparing a listing, reviewing an order, checking warehouse evidence or requesting service support.",
    sections: [
      { title: "Discover", description: "Choose a category and define the exact option, measurement or specification needed to compare current product sources." },
      { title: "Verify", description: "Open the destination page, confirm the intended variation and mark missing or conflicting listing information." },
      { title: "Follow status", description: "Use the current order and warehouse records for purchasing, receipt, QC and parcel-stage questions." },
      { title: "Request action", description: "Use the applicable current policy and responsible support channel for coupon, cancellation, return or refund questions." },
    ],
  },
  {
    domain: "lovegobuyindex.com",
    slug: "is-lovegobuy-legit",
    seoTitle: "Is LoveGoBuy Legit? A Current Evidence Checklist",
    description:
      "Evaluate LoveGoBuy using current domain, policy, payment, order, warehouse and support evidence without presenting a temporary check as a permanent guarantee.",
    eyebrow: "Current platform check",
    title: "Check what is true now, then keep the date.",
    intro:
      "A service can change. Use current first-party destinations and the records tied to the exact account, order and parcel before deciding on the next action.",
    sections: [
      { title: "Domain and account", description: "Confirm the current destination, login context, account security controls and support links before entering credentials." },
      { title: "Terms and payment", description: "Review current payment methods, fees, refund terms and transaction records rather than copied promotional wording." },
      { title: "Order and warehouse", description: "Understand how purchasing, received-item evidence, storage, parcel changes and disputes are documented." },
      { title: "Route and support", description: "Check current restrictions, destination route terms and escalation channels for the exact order or parcel." },
    ],
  },
  {
    domain: "lovegobuyindex.com",
    slug: "lovegobuy-coupon-code",
    seoTitle: "LoveGoBuy Coupon Code | Verify Scope, Date and Application",
    description:
      "Check a LoveGoBuy coupon code by source, account eligibility, applicable charge, deadline and visible application result before treating it as savings.",
    eyebrow: "Coupon verification record",
    title: "A code matters only when the current flow accepts it.",
    intro:
      "Promotional wording can outlive the offer. Record where the code came from, what it applies to and the result shown in the current account flow.",
    sections: [
      { title: "Source and date", description: "Keep the original destination, publication date, stated deadline and any country or account restrictions." },
      { title: "Eligible charge", description: "Identify whether the code concerns product payment, a service fee, parcel shipping or another specific charge." },
      { title: "Account conditions", description: "Check new-user, invitation, membership, minimum-spend or other current eligibility requirements." },
      { title: "Application result", description: "Confirm the discount appears in the correct step before payment and retain the visible result for the transaction record." },
    ],
  },
  {
    domain: "lovegobuyindex.com",
    slug: "lovegobuy-spreadsheet",
    seoTitle: "LoveGoBuy Spreadsheet | Refresh Product Rows Before Use",
    description:
      "Use a LoveGoBuy spreadsheet as a discovery map, then refresh the product source, intended variation, visible fields and review date before retaining a row.",
    eyebrow: "Spreadsheet refresh method",
    title: "Turn inherited rows into current research leads.",
    intro:
      "A spreadsheet can preserve useful search paths, but it cannot guarantee that a listing, option, price or seller context still matches the original row.",
    sections: [
      { title: "Preserve the query", description: "Record the category and search phrase that explain why the row belongs in the directory." },
      { title: "Open the current source", description: "Confirm that the destination resolves and still represents the intended product and seller context." },
      { title: "Match the exact option", description: "Save the selected size, color, model, material, quantity or set beside the row." },
      { title: "Date the review", description: "Update visible evidence and unresolved questions, then retain or remove the row with a clear reason." },
    ],
  },
  {
    domain: "lovegobuyindex.com",
    slug: "refund-lovegobuy-order",
    seoTitle: "Refund a LoveGoBuy Order | Status and Evidence Checklist",
    description:
      "Prepare a LoveGoBuy refund or cancellation request by identifying the current order stage, responsible party, policy and supporting transaction evidence.",
    eyebrow: "Refund request preparation",
    title: "Start with the current order status, not a generic answer.",
    intro:
      "The available action can differ before purchase, after seller dispatch, at warehouse receipt or after parcel submission. Use the record for the exact stage.",
    sections: [
      { title: "Identify the stage", description: "Record whether the request concerns an unpaid order, purchasing, seller dispatch, warehouse receipt, parcel submission or delivery." },
      { title: "Identify responsibility", description: "Separate seller-side cancellation or return questions from platform, warehouse, carrier or payment-provider issues." },
      { title: "Collect evidence", description: "Keep order number, timestamps, selected option, payment record, status history, item images and prior support responses together." },
      { title: "Check current policy", description: "Read the applicable terms, deadlines, fees and return conditions before submitting the request through the responsible channel." },
    ],
  },
];

const MULEBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "mulebuyindex.net",
    slug: "categories",
    seoTitle: "MuleBuy Spreadsheet Categories | Build Better Product Queries",
    description:
      "Browse MuleBuy spreadsheet categories and define the size, material, model, compatibility or source field that makes current rows comparable.",
    eyebrow: "MuleBuy query categories",
    title: "Use the category to choose the next search field.",
    intro:
      "A category reduces noise only when it identifies the evidence needed to separate similar product rows.",
    sections: [
      { title: "Shoes", description: "Add labeled size, foot or insole measurements, material and construction views to the product query." },
      { title: "Clothing", description: "Use garment measurements, fabric wording, cut, color and the exact variation instead of a broad size term." },
      { title: "Bags and accessories", description: "Compare dimensions, closures, included pieces, material claims and restriction-relevant characteristics." },
      { title: "Electronics", description: "Match model, plug, voltage, interface, battery, included parts and destination compatibility on the current source." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "mulebuy-spreadsheet",
    seoTitle: "MuleBuy Spreadsheet Guide | Refresh Links and Product Rows",
    description:
      "Use a MuleBuy spreadsheet as a query index, then refresh each source, intended variation, visible evidence and review date before retaining the row.",
    eyebrow: "MuleBuy row refresh",
    title: "Make every retained row explain itself.",
    intro:
      "A spreadsheet can preserve product discovery paths, but each row needs a current source and a clear reason to remain in the index.",
    sections: [
      { title: "Save the query", description: "Record the category, search phrase and decisive field that produced the candidate." },
      { title: "Open the source", description: "Confirm the destination resolves and still represents the intended product and seller context." },
      { title: "Match the option", description: "Keep the exact size, color, model, material, set or quantity beside the source URL." },
      { title: "Date the decision", description: "Record visible evidence, open questions and the reason to retain, revise or remove the row." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "spreadsheet-checklist",
    seoTitle: "MuleBuy Spreadsheet Checklist | Score Row Completeness",
    description:
      "Review MuleBuy spreadsheet rows for query clarity, active source, option match, visible evidence and a dated retention decision.",
    eyebrow: "MuleBuy row gate",
    title: "A useful score exposes what is still missing.",
    intro:
      "Do not turn the score into a quality claim. Use it to decide whether a row is complete enough for further research.",
    sections: [
      { title: "Query clarity", description: "The row states the product group and the field that makes this candidate relevant." },
      { title: "Source status", description: "The current destination resolves and the seller or marketplace context is still understandable." },
      { title: "Variation match", description: "The recorded option can be located on the current source without guessing from the title image." },
      { title: "Evidence and date", description: "Visible fields, conflicts, open questions and the most recent review date are preserved." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "search-ideas",
    seoTitle: "MuleBuy Spreadsheet Search Ideas | Query by Product Evidence",
    description:
      "Build MuleBuy product searches around exact variation, measurement, material, model and source clues instead of repeating broad category keywords.",
    eyebrow: "MuleBuy query builder",
    title: "Search for the missing comparison field.",
    intro:
      "The strongest query identifies the product type and one detail that changes whether two rows belong in the same shortlist.",
    sections: [
      { title: "Product plus variation", description: "Combine the category with exact size, color, model, material, set or quantity." },
      { title: "Product plus measurement", description: "Add the decisive dimension, capacity or compatibility field when it separates similar results." },
      { title: "Product plus construction", description: "Search for stitching, closure, lining, sole, connector or another category-specific detail." },
      { title: "Product plus source clue", description: "Use marketplace or seller wording only when the current destination confirms that context." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "order-status-guide",
    seoTitle: "MuleBuy Order Pending Guide | Check Status Before Acting",
    description:
      "Understand MuleBuy Order Pending, Pending Payment and confirmation states, preserve the current order record and use the action shown for that exact stage.",
    eyebrow: "MuleBuy order-status evidence",
    title: "Identify the exact pending state before taking the next action.",
    intro:
      "MuleBuy uses different pending labels for purchase, payment and confirmation stages. Read the current order record first so one status is not mistaken for another.",
    sections: [
      {
        title: "Order Pending",
        description:
          "Confirm the order number, submission time, product source and selected option. Use only the current action displayed in the MuleBuy order center and retain any cancellation or refund record.",
      },
      {
        title: "Pending Payment",
        description:
          "Check whether payment was completed, which amount and payment reference belong to the order, and whether a current countdown or retry instruction is displayed.",
      },
      {
        title: "Pending for Confirmation",
        description:
          "Review the product details or buyer response requested in the current record before assuming the seller, warehouse or carrier is responsible for the delay.",
      },
      {
        title: "Later order and parcel stages",
        description:
          "Keep purchasing, seller dispatch, warehouse receipt, storage, parcel payment and tracking events separate, because each stage has a different responsible record and next action.",
      },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "buyer-safety",
    seoTitle: "Is MuleBuy Legit? Current Checks for Spreadsheet Users",
    description:
      "Evaluate MuleBuy with current domain, policy, payment, warehouse and support evidence before using an indexed product row or external service route.",
    eyebrow: "Current MuleBuy checks",
    title: "Separate platform checks from product-row checks.",
    intro:
      "An active product link does not establish current service conditions, and a current platform page does not verify a seller listing.",
    sections: [
      { title: "Domain and account", description: "Confirm the current destination, login context, account controls and support links before entering credentials." },
      { title: "Terms and payment", description: "Read current payment, refund, fee and dispute information instead of copied or undated claims." },
      { title: "Order and warehouse", description: "Understand how purchasing, received-item evidence, storage and parcel changes are recorded." },
      { title: "Product source", description: "Reopen the seller page and keep product identity, option, price and availability separate from platform service evidence." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "shipping-weight-guide",
    seoTitle: "MuleBuy Shipping Weight Guide | Replace Estimates with Parcel Data",
    description:
      "Use received weight, dimensions, packaging, complete contents and destination-specific route terms when moving from a MuleBuy row to parcel research.",
    eyebrow: "Row-to-parcel handoff",
    title: "Do not turn a spreadsheet estimate into delivered cost.",
    intro:
      "A product row supports discovery. The parcel decision needs measurements and restrictions recorded after the actual contents and packaging are known.",
    sections: [
      { title: "Received contents", description: "Confirm quantity, included pieces, packaging and any batteries, liquids, magnets or other restricted characteristics." },
      { title: "Measured parcel", description: "Use recorded weight and dimensions when available instead of treating seller estimates as chargeable data." },
      { title: "Packaging choice", description: "Record retained boxes, protective materials and optional packing changes that affect the final package." },
      { title: "Current route", description: "Check eligibility, pricing inputs and destination terms with the responsible service for the exact parcel." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "tracking",
    seoTitle: "MuleBuy Tracking Guide | Read Parcel Events and Handoffs",
    description:
      "Track a shipped MuleBuy parcel from its account record, preserve the tracking number and dated carrier events, and separate update delays from verified delivery evidence.",
    eyebrow: "MuleBuy parcel tracking",
    title: "Follow the parcel record across every carrier handoff.",
    intro:
      "Open the shipped parcel record, then keep its tracking number, last confirmed event and review time together.",
    sections: [
      { title: "Start in the parcel record", description: "Use the current MuleBuy account, open the Parcel section and review the tracking details attached to the shipped parcel." },
      { title: "Cross-check the responsible carrier", description: "Use the tracking number with the current logistics route source when a carrier handoff needs separate confirmation." },
      { title: "Treat quiet periods as unresolved", description: "International events can publish with a delay. Preserve the last confirmed scan and use the responsible support path instead of inventing a location or delivery date." },
    ],
    questions: [
      { question: "Where should a shipped MuleBuy parcel be tracked?", answer: "Open the Parcel section in the current MuleBuy account and review its tracking details. The tracking number can also be checked with the responsible logistics route source." },
      { question: "Does a pause in tracking prove that the parcel is lost?", answer: "No. Carrier handoffs and international movements can publish later. Keep the last confirmed event and ask the responsible service for current evidence when needed." },
      { question: "Can a tracking event guarantee the delivery date?", answer: "No. It records the latest available event. Customs, carrier transfers, destination processing and local delivery still require later evidence." },
    ],
  },
  {
    domain: "mulebuyindex.net",
    slug: "faq",
    seoTitle: "MuleBuy Spreadsheet FAQ | Rows, QC and Parcel Evidence",
    description:
      "Read independent answers about MuleBuy spreadsheet rows, source refreshes, QC evidence, safety checks and shipping-weight research.",
    eyebrow: "MuleBuy index questions",
    title: "Keep discovery rows separate from transaction facts.",
    intro:
      "A row can guide the next search, but current product, warehouse, parcel and service questions need their own records.",
    sections: [
      { title: "Is every spreadsheet row current?", description: "No. Reopen the source, match the intended option and date the review before retaining it." },
      { title: "Does a row verify product quality?", description: "No. It can record visible listing evidence and open questions, not authenticate or guarantee the item." },
      { title: "Can row weight predict shipping cost?", description: "Not reliably. Use actual contents, packaging, measurements, route and destination terms." },
      { title: "What belongs in the index?", description: "Only rows with a useful query, active source, matched variation, visible evidence and a reason for retention." },
    ],
  },
];

const MULEBUY_ITEMS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "mulebuyitems.com",
    slug: "categories",
    seoTitle: "MuleBuy Item Categories | Evidence Fields by Product Type",
    description:
      "Inspect MuleBuy-linked items using category-specific option, measurement, material, construction and compatibility evidence.",
    eyebrow: "MuleBuy item categories",
    title: "Give each product type its own evidence fields.",
    intro:
      "An item file is useful when the requested variation and the fields needed for that category stay attached to the source.",
    sections: [
      { title: "Footwear file", description: "Keep labeled size, foot or insole measurements, materials, construction images and requested variation together." },
      { title: "Apparel file", description: "Record garment measurements, fabric wording, color, cut and the images relevant to the exact option." },
      { title: "Accessory file", description: "Use dimensions, closures, included pieces, material claims and detail views instead of a broad category label." },
      { title: "Electronics file", description: "Match model, voltage, plug, interface, battery, included parts and destination compatibility." },
    ],
  },
  {
    domain: "mulebuyitems.com",
    slug: "mulebuy-spreadsheet",
    seoTitle: "MuleBuy Item Spreadsheet | Convert a Row into an Evidence File",
    description:
      "Turn a MuleBuy spreadsheet row into an item-level record containing the current source, exact option, visible listing fields and unresolved questions.",
    eyebrow: "Row-to-item conversion",
    title: "Use the row to open the file, not finish it.",
    intro:
      "The spreadsheet supplies a discovery lead. The item file begins only after the current destination and intended variation are matched.",
    sections: [
      { title: "Identify the intended item", description: "Save the category, source URL and exact size, color, model, material, set or quantity." },
      { title: "Capture listing evidence", description: "Record visible measurements, specifications, images and seller wording without upgrading claims into facts." },
      { title: "Add received-item evidence", description: "When available, compare warehouse images and notes with the requested variation and preserve differences." },
      { title: "Keep open questions", description: "Leave identity, performance, missing measurements and route constraints unresolved until relevant evidence exists." },
    ],
  },
  {
    domain: "mulebuyitems.com",
    slug: "spreadsheet-checklist",
    seoTitle: "MuleBuy Item Checklist | Option and QC Evidence Gate",
    description:
      "Check a MuleBuy-linked item for source identity, exact option, category fields, listing images, QC evidence and unresolved contradictions.",
    eyebrow: "MuleBuy item gate",
    title: "Do not move forward while the item file contradicts itself.",
    intro:
      "The checklist exposes missing or conflicting evidence. It does not score authenticity, quality or seller reliability.",
    sections: [
      { title: "Source identity", description: "The current destination and seller context are recorded and still resolve." },
      { title: "Option identity", description: "The requested size, color, model, material, quantity or set is visible on the source." },
      { title: "Category evidence", description: "The file contains the measurements, specifications and views needed for that product type." },
      { title: "Conflict log", description: "Differences between title, options, images, warehouse notes and received-item evidence remain visible." },
    ],
  },
  {
    domain: "mulebuyitems.com",
    slug: "search-ideas",
    seoTitle: "MuleBuy Item Search Ideas | Find the Exact Product Variation",
    description:
      "Build MuleBuy item searches around exact model, variation, measurement, material, specification and missing evidence fields.",
    eyebrow: "Exact-item search plan",
    title: "Search for the option you intend to inspect.",
    intro:
      "A broad result title is only a lead. The current source must show that the variation and evidence belong to the same item.",
    sections: [
      { title: "Variation query", description: "Combine the product type with exact size, color, model, material, set or quantity." },
      { title: "Measurement query", description: "Add the decisive dimension or compatibility field that separates similar options." },
      { title: "Construction query", description: "Search for the view or detail needed to examine stitching, closure, sole, lining or connector." },
      { title: "Missing-field query", description: "Use the open question itself to search for a measurement, specification, image angle or option note." },
    ],
  },
  {
    domain: "mulebuyitems.com",
    slug: "buyer-safety",
    seoTitle: "MuleBuy Item Safety | Claims, Compatibility and Route Questions",
    description:
      "Review MuleBuy-linked item claims, materials, intended use, compatibility and destination constraints without treating seller wording as verified fact.",
    eyebrow: "Product-level safety file",
    title: "Attach each risk question to the exact item.",
    intro:
      "Safety and suitability depend on the product, selected variation, contents, intended use and destination rather than the platform name alone.",
    sections: [
      { title: "Claims and identity", description: "Separate visible seller wording from independently verified identity, certification, authenticity or performance." },
      { title: "Materials and construction", description: "Record stated composition and visible construction while leaving unknown details unresolved." },
      { title: "Use and compatibility", description: "Check size, fit, voltage, plug, interface, battery, age suitability or other use-specific requirements." },
      { title: "Destination constraints", description: "Review current import, carrier and route restrictions for the complete contents with the responsible sources." },
    ],
  },
  {
    domain: "mulebuyitems.com",
    slug: "shipping-weight-guide",
    seoTitle: "MuleBuy Item Shipping Inputs | Contents, Weight and Packaging",
    description:
      "Prepare a MuleBuy item for parcel research using exact contents, received measurements, packaging decisions and potential route restrictions.",
    eyebrow: "Item-to-parcel record",
    title: "Complete the item file before estimating the parcel.",
    intro:
      "A listing image and seller estimate cannot establish chargeable weight or route eligibility for the final package.",
    sections: [
      { title: "Exact contents", description: "Confirm quantity, included pieces, batteries, liquids, magnets and other characteristics that affect the parcel record." },
      { title: "Received measurements", description: "Use warehouse-recorded weight and dimensions when available instead of treating seller estimates as final." },
      { title: "Packaging decision", description: "Record retained boxes, protective materials and optional changes that affect dimensions or weight." },
      { title: "Route check", description: "Use the complete parcel and destination record with the current service responsible for eligibility and terms." },
    ],
  },
  {
    domain: "mulebuyitems.com",
    slug: "faq",
    seoTitle: "MuleBuy Items FAQ | Options, QC Evidence and Parcel Handoff",
    description:
      "Read independent answers about MuleBuy item pages, exact variations, listing evidence, QC images, product claims and parcel inputs.",
    eyebrow: "MuleBuy item questions",
    title: "Keep the option, evidence and open question together.",
    intro:
      "An item file documents what can be observed and what still needs confirmation. It does not guarantee a product or outcome.",
    sections: [
      { title: "Can the title identify the exact option?", description: "Not by itself. Match the selected variation to the current option controls, images and specifications." },
      { title: "Do QC images prove authenticity?", description: "No. They can document visible condition and differences but do not authenticate or guarantee the item." },
      { title: "Should missing fields be guessed?", description: "No. Keep them visible as open questions and seek the relevant current source or support record." },
      { title: "When is the item ready for parcel research?", description: "After exact contents, received measurements, packaging questions and restriction-relevant characteristics are recorded." },
    ],
  },
];

const OOPBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "oopbuyindex.net", slug: "guide",
    seoTitle: "Oopbuy Guide | Product Link, Warehouse and Parcel Evidence",
    description: "Follow an Oopbuy-linked product from the current source and selected option through warehouse evidence and measured parcel inputs.",
    eyebrow: "Oopbuy evidence route", title: "Use the record created at each Oopbuy stage.",
    intro: "Product, warehouse and parcel records answer different questions. Keep them connected without treating one as proof of another.",
    sections: [
      { title: "Source record", description: "Save the current URL, seller context, exact option, quantity and unresolved listing fields." },
      { title: "Warehouse record", description: "Match received-item images, notes and measurements to the option that was requested." },
      { title: "Parcel record", description: "Use complete contents, final packaging and measured dimensions for a current route check." },
    ],
  },
  {
    domain: "oopbuyindex.net", slug: "categories",
    seoTitle: "Oopbuy Spreadsheet Categories | Build Product-Specific Checks",
    description: "Browse Oopbuy spreadsheet categories with the measurements, specifications and source fields needed for comparable product research.",
    eyebrow: "Oopbuy category framework", title: "Change the checklist when the product category changes.",
    intro: "A generic spreadsheet row hides the fields that make shoes, apparel, bags and electronics meaningfully different.",
    sections: [
      { title: "Wearables", description: "Record labeled size, product measurements, materials, construction views and the exact color or variation." },
      { title: "Bags and accessories", description: "Check dimensions, closures, materials, included pieces and restriction-relevant characteristics." },
      { title: "Electronics", description: "Confirm model, voltage, plug, interface, battery, included parts and destination compatibility." },
    ],
  },
  {
    domain: "oopbuyindex.net", slug: "oopbuy-score",
    seoTitle: "Oopbuy Score | Product Link Quality and Evidence Method",
    description: "Apply a transparent Oopbuy link score to source clarity, exact options, visible evidence, review date and the next unresolved check.",
    eyebrow: "Oopbuy link score", title: "Score whether the link can be reviewed again.",
    intro: "The score rewards traceability and completeness. It does not rate authenticity, seller quality or a future delivery outcome.",
    sections: [
      { title: "Source and option", description: "Award credit only when the current destination and exact intended variation are identifiable." },
      { title: "Evidence and date", description: "Record what is visible, what is missing and when the source was last reopened." },
      { title: "Next check", description: "A useful record states the responsible source and evidence needed before the next decision." },
    ],
  },
  {
    domain: "oopbuyindex.net", slug: "search-ideas",
    seoTitle: "Oopbuy Search Ideas | Build Precise Spreadsheet Queries",
    description: "Turn broad Oopbuy spreadsheet searches into precise product queries using category, measurable attributes, intended option and source evidence.",
    eyebrow: "Oopbuy query builder", title: "Use one constraint that changes the comparison.",
    intro: "A focused query reduces repeated results and makes it clear why one link belongs on the shortlist.",
    sections: [
      { title: "Category plus measurement", description: "Combine the product type with fit, dimensions, capacity or another comparable numeric field." },
      { title: "Model plus compatibility", description: "For technical products, add the exact model, connection, voltage or destination requirement." },
      { title: "Material plus construction", description: "Use visible composition wording and construction details instead of subjective quality language." },
    ],
  },
  {
    domain: "oopbuyindex.net", slug: "shipping",
    seoTitle: "Oopbuy Shipping Prices Guide | Two Costs and Parcel Evidence",
    description: "Separate Oopbuy seller-to-warehouse shipping from the later international parcel price, then verify estimated weight and dimensions against warehouse evidence.",
    eyebrow: "Oopbuy shipping price record", title: "Keep the two shipping costs in separate records.",
    intro: "Oopbuy product pages separate the seller-to-warehouse cost from the later international shipping estimate. Early item weight and dimensions are planning inputs, not a final packed-parcel price.",
    sections: [
      { title: "Seller to Oopbuy warehouse", description: "Record the domestic shipping amount shown for the exact product source and option. Keep it outside the later international parcel comparison.", points: ["Retain the current product source", "Match the selected option and quantity", "Date the domestic amount"] },
      { title: "Early international estimate", description: "Use the listed estimated weight and dimensions only as provisional inputs while the item has not yet been received and packed.", points: ["Label estimated fields clearly", "Keep all dimensions with the weight", "Do not present the result as a live quote"] },
      { title: "Warehouse to delivery address", description: "After warehouse receipt, compare the actual contents, retained packaging and measured parcel with current destination routes before submission.", points: ["Confirm restricted-item characteristics", "Use the packed-parcel record", "Retain the selected route and current terms"] },
    ],
  },
  {
    domain: "oopbuyindex.net", slug: "safety",
    seoTitle: "Is Oopbuy Legit and Safe? Current Service Verification Checklist",
    description: "Evaluate current Oopbuy service evidence using the active domain, account controls, policies, payment records, support channels and order-stage boundaries.",
    eyebrow: "Current Oopbuy service check", title: "Replace a permanent verdict with dated, repeatable checks.",
    intro: "A site response or old review is only one observation. Recheck the evidence relevant to the action you plan to take.",
    sections: [
      { title: "Domain and account", description: "Verify the current destination, connection security, account recovery and transaction controls." },
      { title: "Policies and payment", description: "Read current fees, refund terms, payment records and the responsibility assigned at each stage." },
      { title: "Support and order trail", description: "Retain dated order status, warehouse evidence, parcel events and support responses." },
    ],
  },
  {
    domain: "oopbuyindex.net", slug: "faq",
    seoTitle: "Oopbuy FAQ | Spreadsheet Links, QC Evidence and Shipping",
    description: "Read independent answers about Oopbuy spreadsheet links, product options, QC images, warehouse records, parcel weight and changing service facts.",
    eyebrow: "Oopbuy research questions", title: "Keep every answer attached to its source and date.",
    intro: "The strongest answer explains what can be checked now, what remains unknown and where the next evidence must come from.",
    sections: [
      { title: "Is a spreadsheet row a current product?", description: "No. It is a research lead until its source, option, price and availability are reopened." },
      { title: "Do QC photos prove authenticity?", description: "No. They can document visible condition or differences but do not authenticate a product." },
      { title: "Does listed weight equal parcel weight?", description: "No. Use the received item, final contents, packaging and measured parcel record." },
    ],
  },
];

const ORIENTDIG_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "orientdigindex.com", slug: "orientdig-spreadsheet",
    seoTitle: "OrientDig Spreadsheet | Build a Dated Product Evidence Index",
    description: "Use an OrientDig spreadsheet as a dated research index that preserves the query, current source, exact option, evidence score and unresolved fields.",
    eyebrow: "OrientDig spreadsheet method", title: "Treat every row as a claim that needs a source.",
    intro: "A row enters the index only after another reviewer can reopen the product source and understand why it was retained.",
    sections: [
      { title: "Query context", description: "Keep the category, search phrase and intended use beside the result." },
      { title: "Source and variation", description: "Match the current destination and exact option before recording product fields." },
      { title: "Review state", description: "Add the date, evidence score, missing facts and next check without guessing." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "categories",
    seoTitle: "OrientDig Spreadsheet Categories | Evidence Fields by Product Type",
    description: "Browse OrientDig categories with separate comparison fields for footwear, apparel, bags and electronics instead of reusing one generic template.",
    eyebrow: "OrientDig category map", title: "Let the product type define the evidence.",
    intro: "Category-specific fields reduce thin pages because each record explains the measurements, specifications or construction details that matter.",
    sections: [
      { title: "Footwear", description: "Use labeled size, foot or insole measurements, materials, construction and the exact selected option." },
      { title: "Apparel and bags", description: "Record garment or bag dimensions, material wording, closures, hardware and visible detail views." },
      { title: "Electronics", description: "Check model, power, interfaces, battery, included parts and destination compatibility." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "orientdig-qc-photos-guide",
    seoTitle: "OrientDig QC Photos Guide | Match Received Evidence to the Order",
    description: "Review OrientDig QC photos against the requested option, visible condition, measurements and unresolved product claims before parcel submission.",
    eyebrow: "OrientDig QC review", title: "Compare what arrived with what was requested.",
    intro: "QC images are useful received-item evidence when they are tied to the order record and exact variation.",
    sections: [
      { title: "Identity of the option", description: "Match color, size, model, quantity and included pieces to the requested selection." },
      { title: "Visible condition", description: "Record observable differences, damage, marks, construction and packaging without overstating conclusions." },
      { title: "Missing views", description: "Request or record the angles, labels or measurements needed for the remaining decision." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "orientdig-shoes-spreadsheet",
    seoTitle: "OrientDig Shoes Spreadsheet | Size, Construction and QC Checks",
    description: "Review OrientDig shoe links with size-chart context, foot or insole measurements, materials, construction views and matched QC evidence.",
    eyebrow: "OrientDig footwear evidence", title: "Build the shoe record around fit and construction.",
    intro: "A model name and labeled size do not replace measurements or evidence for the selected variation.",
    sections: [
      { title: "Fit evidence", description: "Retain the size system, chart source, foot or insole measurement and intended fit context." },
      { title: "Construction evidence", description: "Compare outsole, stitching, panels, heel, toe and material wording using current images." },
      { title: "Received-item match", description: "Connect QC views and measurements to the exact size and color ordered." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "orientdig-hoodies-spreadsheet",
    seoTitle: "OrientDig Hoodies Spreadsheet | Measurements, Fabric and QC Guide",
    description: "Compare OrientDig hoodie links using garment measurements, fabric wording, construction, color and received-item evidence for the selected option.",
    eyebrow: "OrientDig hoodie evidence", title: "Use garment measurements instead of a size label alone.",
    intro: "The useful record connects the intended fit to a current chart and the exact item received.",
    sections: [
      { title: "Garment dimensions", description: "Record chest, length, shoulder and sleeve using the current measurement method." },
      { title: "Fabric and build", description: "Preserve composition claims, weight wording, seams, cuffs, hood and visible construction." },
      { title: "Option match", description: "Check selected color and size against order details and warehouse evidence." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "orientdig-bags-spreadsheet",
    seoTitle: "OrientDig Bags Spreadsheet | Dimensions, Closures and QC Evidence",
    description: "Evaluate OrientDig bag links with dimensions, material claims, closures, hardware, included pieces and warehouse evidence for the chosen option.",
    eyebrow: "OrientDig bag evidence", title: "Measure the bag and account for every component.",
    intro: "A bag title cannot establish capacity, materials or the condition of the exact item received.",
    sections: [
      { title: "Dimensions and capacity", description: "Record external dimensions, strap range, compartments and relevant device or use fit." },
      { title: "Materials and hardware", description: "Keep stated material wording separate from visible construction, closures and hardware details." },
      { title: "Included contents", description: "Confirm straps, pouches, packaging and other pieces in the received-item record." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "orientdig-electronics-spreadsheet",
    seoTitle: "OrientDig Electronics Spreadsheet | Model and Compatibility Checks",
    description: "Research OrientDig electronics links with exact model, voltage, plug, interface, battery, included accessories and destination compatibility fields.",
    eyebrow: "OrientDig electronics evidence", title: "Compatibility belongs in the product record.",
    intro: "A similar image or translated title cannot confirm the model, specification or suitability for the destination.",
    sections: [
      { title: "Exact specification", description: "Record model identifiers, version, capacity, power and connection standards from the current source." },
      { title: "Destination compatibility", description: "Check voltage, plug, network, language, region and other use requirements." },
      { title: "Contents and route", description: "List battery characteristics and included parts relevant to completeness or restrictions." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "search-ideas",
    seoTitle: "OrientDig Search Ideas | Category and Evidence Query Builder",
    description: "Create precise OrientDig spreadsheet queries by combining product category with measurements, specifications, material wording or compatibility needs.",
    eyebrow: "OrientDig query design", title: "Search for the field that changes the decision.",
    intro: "The query should explain which comparable evidence you expect to find, not just repeat a broad product name.",
    sections: [
      { title: "Fit query", description: "Combine product type with a measurement system, intended fit or dimension requirement." },
      { title: "Specification query", description: "Add model, interface, voltage, capacity or another compatibility field." },
      { title: "Construction query", description: "Use material and build details that can be observed or checked on the source." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "spreadsheet-checklist",
    seoTitle: "OrientDig Spreadsheet Checklist | Source, Option and Evidence Review",
    description: "Check an OrientDig spreadsheet row for source identity, exact option, category-specific fields, evidence date, missing facts and a repeatable next step.",
    eyebrow: "OrientDig row checklist", title: "Reject rows that cannot explain their evidence.",
    intro: "Completeness means visible source boundaries and unresolved fields, not a confident claim about everything.",
    sections: [
      { title: "Before saving", description: "Match the query, current source and intended option, then identify the required category fields." },
      { title: "Before publishing", description: "Remove duplicates and records with missing sources, zero prices, broken images or unsupported claims." },
      { title: "After publishing", description: "Store the review date and recheck changing fields before the record is reused." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "orient-score-methodology",
    seoTitle: "Orient Score Methodology | Transparent Product Evidence Weights",
    description: "Understand how Orient Score weights traceable source, exact variation, category fields, visible evidence, review date and unresolved risks.",
    eyebrow: "Orient Score methodology", title: "A transparent score should show both evidence and limits.",
    intro: "The score ranks review completeness. It does not rate authenticity, seller reliability or future product performance.",
    sections: [
      { title: "Traceability", description: "Give the greatest weight to a current source and exact option another reviewer can reopen." },
      { title: "Category evidence", description: "Weight measurements, specifications and relevant views according to the product type." },
      { title: "Freshness and unknowns", description: "Record the review date and keep unsupported or missing fields visible as deductions." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "shipping-weight-guide",
    seoTitle: "OrientDig Shipping Weight Guide | Measured Parcel Inputs",
    description: "Move from OrientDig product evidence to parcel research using received weight, dimensions, packaging, complete contents and current route terms.",
    eyebrow: "OrientDig parcel evidence", title: "Do not turn a listing estimate into a shipping promise.",
    intro: "The final parcel record is created after receiving, measuring and packaging the complete contents.",
    sections: [
      { title: "Received measurements", description: "Use warehouse-recorded weight and dimensions instead of an early seller estimate." },
      { title: "Packaging and contents", description: "Record retained boxes, consolidation choices and restriction-relevant characteristics." },
      { title: "Current route", description: "Verify destination eligibility, calculation inputs and terms with the responsible service." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "buyer-safety",
    seoTitle: "Is OrientDig Legit and Safe? Dated Service Evidence Checklist",
    description: "Review current OrientDig domain, account, policy, payment, warehouse, support and order evidence without relying on an undated permanent verdict.",
    eyebrow: "OrientDig service verification", title: "Recheck the evidence relevant to the next action.",
    intro: "Current service controls and dated order records are more useful than a single old review or domain response.",
    sections: [
      { title: "Account and payment", description: "Verify the active domain, recovery controls, payment records, fees and refund terms." },
      { title: "Warehouse and support", description: "Retain received-item records, parcel events and dated support responses." },
      { title: "Scope of the conclusion", description: "State which stage and date the evidence covers instead of generalizing one order." },
    ],
  },
  {
    domain: "orientdigindex.com", slug: "faq",
    seoTitle: "OrientDig FAQ | Spreadsheet, QC, Score and Shipping Evidence",
    description: "Read independent answers about OrientDig spreadsheet records, Orient Score, QC photos, category checks, warehouse weight and changing service facts.",
    eyebrow: "OrientDig evidence questions", title: "Answer with the current source, date and limit.",
    intro: "A useful FAQ separates observable evidence from claims that still require another source.",
    sections: [
      { title: "Does a high Orient Score prove quality?", description: "No. It indicates review completeness and traceability, not authenticity or product performance." },
      { title: "Can QC images settle every claim?", description: "No. They document visible received-item evidence but have limits and may require more views." },
      { title: "Are shipping figures permanent?", description: "No. Use measured parcel inputs and current destination-specific terms at decision time." },
    ],
  },
];

const PARCELUP_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "parcelupindex.com", slug: "getting-started",
    seoTitle: "Parcel Up Getting Started | Taobao Product and First Payment Guide",
    description: "Start a Parcel Up Taobao order by preserving the original source, seller, selected option, quantity, first-payment record and unresolved product questions.",
    eyebrow: "Parcel Up first-payment stage", title: "Create the product record before paying for the item.",
    intro: "The first stage should identify exactly what is being requested and preserve the original marketplace context.",
    sections: [
      { title: "Original Taobao source", description: "Retain the current listing URL, seller context, translated notes and source-language fields." },
      { title: "Selected option", description: "Match color, size, model, quantity and any buyer note to the controls on the current listing." },
      { title: "First payment record", description: "Keep the product amount, domestic delivery inputs, stated service costs and transaction reference separated." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "fees-and-budgeting",
    seoTitle: "Parcel Up Shipping Cost | First and Second Payment Budgeting",
    description: "Separate Parcel Up product payment from warehouse and international parcel costs using current fee terms, measured weight, dimensions and destination route inputs.",
    eyebrow: "Parcel Up two-payment budget", title: "Budget the product and parcel as two evidence stages.",
    intro: "The first payment concerns the purchase request. The second depends on the received and measured parcel.",
    sections: [
      { title: "Product-stage amount", description: "Record item price, quantity, domestic delivery and current service charges without mixing in estimated international shipping." },
      { title: "Warehouse-stage inputs", description: "Use received weight, dimensions, packaging and consolidation choices for the parcel calculation." },
      { title: "Route-stage amount", description: "Confirm the current destination route, calculation method, surcharges and payment terms before submission." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "shipping-and-warehouse",
    seoTitle: "Parcel Up Warehouse and Shipping | Consolidation and Tracking Guide",
    description: "Follow Parcel Up warehouse receipt, QC, storage, consolidation, measured parcel, second payment and international tracking as separate records.",
    eyebrow: "Parcel Up warehouse handoff", title: "Build the parcel only after every item record is complete.",
    intro: "Consolidation should preserve seller-level and item-level evidence so differences remain traceable after multiple orders are combined.",
    sections: [
      { title: "Warehouse receipt", description: "Match each received item to its order, seller and exact option before consolidation." },
      { title: "Parcel preparation", description: "Record included items, removed or retained packaging, weight, dimensions and restriction-relevant contents." },
      { title: "Shipment trail", description: "Keep route, second-payment reference, dispatch event and tracking updates with their dates." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "tracking",
    seoTitle: "Parcel Up Tracking Guide | Use the Carrier and Tracking Number",
    description: "Track a Parcel Up shipment from the official tracking or shipped-order record, preserve the shipping service, tracking number and dated events, and separate update gaps from delivery claims.",
    eyebrow: "Parcel Up courier tracking", title: "Track each carrier handoff from the official record.",
    intro: "Save the shipping service, tracking number, last confirmed event and review time together before drawing a conclusion.",
    sections: [
      { title: "Open an official tracking source", description: "Use Parcel Up's current tracking page with the selected shipping service and order tracking number, or open the tracking link attached to the shipped order." },
      { title: "Separate origin and destination events", description: "Preserve the event wording, country, location and timestamp because destination-country data can appear later than origin-country scans." },
      { title: "Escalate missing evidence", description: "When the number, service or event trail remains unclear, use the current official support path instead of inventing a parcel location or delivery date." },
    ],
    questions: [
      { question: "Where should a Parcel Up shipment be tracked?", answer: "Use the official Parcel Up delivery tracking page with the shipping service and tracking number, or follow the tracking link from the shipped-order record." },
      { question: "Why can destination tracking appear later?", answer: "Carrier systems and country handoffs can publish events at different times. Preserve the last confirmed origin or destination event and review the official record again." },
      { question: "Does a tracking event guarantee the delivery date?", answer: "No. It records the latest available event. Customs, carrier transfers, destination processing and local delivery still require later evidence." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "qc-checklist",
    seoTitle: "Parcel Up QC Photos | Taobao Warehouse Quality Check Guide",
    description: "Review Parcel Up QC photos against the original Taobao listing, selected option, visible condition, measurements, packaging and missing views.",
    eyebrow: "Parcel Up warehouse QC", title: "Compare the received item with the preserved source.",
    intro: "The original listing and order record give QC photos the context needed to identify differences.",
    sections: [
      { title: "Option match", description: "Check size, color, model, quantity and included pieces against the order record." },
      { title: "Visible condition", description: "Record observable marks, damage, construction, labels and packaging without making unsupported claims." },
      { title: "Decision evidence", description: "Request or note missing angles and measurements before accepting, returning or consolidating the item." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "product-index-method",
    seoTitle: "Parcel Up Spreadsheet Method | Preserve Taobao Source Evidence",
    description: "Build a Parcel Up product index that stores original Taobao source, seller, exact option, review date and missing fields instead of copying thin product rows.",
    eyebrow: "Parcel Up source index", title: "Index the evidence trail, not a detached product card.",
    intro: "A translated title and image become useful only when the original marketplace context remains available for review.",
    sections: [
      { title: "Source identity", description: "Store the original URL, seller context and source language beside any translation or summary." },
      { title: "Option identity", description: "Preserve the exact selected variation and product-specific comparison fields." },
      { title: "Publication threshold", description: "Exclude duplicates, missing sources, zero-price rows, broken images and unsupported claims from the public index." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "official-sources",
    seoTitle: "Parcel Up Sources | Verify Domain, Taobao Listing and Order Records",
    description: "Use the current Parcel Up domain, original Taobao or Tmall listing, account order, warehouse record and carrier event as separate evidence sources.",
    eyebrow: "Parcel Up source map", title: "Ask which source is responsible for the fact.",
    intro: "No single page confirms product, service, warehouse and delivery facts at every stage.",
    sections: [
      { title: "Marketplace source", description: "Use the original seller listing for product wording, options and seller context at the review date." },
      { title: "Parcel Up record", description: "Use current account, order, warehouse and support records for actions handled by the service." },
      { title: "Route and destination source", description: "Use current carrier and destination rules for tracking, restrictions and import questions." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "methodology",
    seoTitle: "Parcel Up Index Methodology | Source, Date and Handoff Controls",
    description: "Understand the Parcel Up Index publication method for source retention, option matching, duplicate removal, dated review and stage-specific evidence.",
    eyebrow: "Parcel Up publication method", title: "Publish only records that survive a handoff review.",
    intro: "The method prevents automatically collected products from entering the public index before their source and useful evidence are verified.",
    sections: [
      { title: "Verify", description: "Reopen the current source, match the exact option and identify the responsible service stage." },
      { title: "Differentiate", description: "Add item-specific or workflow-specific evidence that is not a repeated product feed description." },
      { title: "Control indexing", description: "Keep unverified, duplicate, thin, zero-price or broken records out of the sitemap and public index." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "about-parcel-up-index",
    seoTitle: "About Parcel Up Index | Independent Taobao Order Research Guide",
    description: "Learn how Parcel Up Index documents Taobao product sources, two-payment stages, warehouse evidence, consolidation and parcel tracking without acting as the service.",
    eyebrow: "About this Parcel Up guide", title: "An independent record of product-to-parcel handoffs.",
    intro: "This site organizes research methods and source boundaries. Transactions, accounts and current service actions remain with their responsible destinations.",
    sections: [
      { title: "Purpose", description: "Preserve the evidence needed to follow a product from original marketplace source to international parcel." },
      { title: "Independence", description: "The guide does not operate Parcel Up, sell products, hold accounts or make transaction decisions." },
      { title: "Update boundary", description: "Changing prices, availability, policies, routes and order facts must be confirmed at the current source." },
    ],
  },
];

const SUGARGOO_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "sugargooindex.net", slug: "sugargoo-spreadsheet",
    seoTitle: "Sugargoo Spreadsheet | Refresh Product Links and Options",
    description: "Use a Sugargoo spreadsheet to discover products, then reopen each source, match the exact option and exclude duplicate, unavailable or unsupported rows.",
    eyebrow: "Sugargoo source refresh", title: "Turn a spreadsheet row into a current product record.",
    intro: "A row is useful only while its destination, intended variation and review note can still be checked.",
    sections: [
      { title: "Reopen the source", description: "Confirm that the current destination loads and still describes the intended product." },
      { title: "Match the option", description: "Record color, size, model, material, set and quantity from the current controls." },
      { title: "Control publication", description: "Keep zero-price, broken, duplicate, thin or unsupported rows outside the public index." },
    ],
  },
  {
    domain: "sugargooindex.net", slug: "categories",
    seoTitle: "Sugargoo Product Categories | Evidence Checks by Item Type",
    description: "Browse Sugargoo-linked categories with product-specific measurement, material, specification, option and QC evidence requirements.",
    eyebrow: "Sugargoo category checks", title: "Give every product type its own evidence threshold.",
    intro: "Shoes, garments, bags and electronics need different fields before two listings can be compared responsibly.",
    sections: [
      { title: "Wearable products", description: "Use labeled sizing, measurements, stated materials, construction views and the exact variation." },
      { title: "Bags and accessories", description: "Check dimensions, compartments, closures, hardware, straps and included pieces." },
      { title: "Electronics", description: "Record model, voltage, plug, interfaces, language, battery and compatibility information." },
    ],
  },
  {
    domain: "sugargooindex.net", slug: "sugargoo-qc-guide",
    seoTitle: "Sugargoo QC Guide | Review Warehouse Photos Before Shipping",
    description: "Compare Sugargoo warehouse QC photos with the ordered source, exact option, visible condition, measurements and missing decision-critical views.",
    eyebrow: "Sugargoo warehouse evidence", title: "Read QC photos against the order record.",
    intro: "Warehouse images document what arrived visibly; they do not automatically settle identity, material or performance claims.",
    sections: [
      { title: "Option match", description: "Compare color, size, model, quantity and included pieces with the saved order fields." },
      { title: "Visible condition", description: "Record observable construction, marks, damage, labels and packaging without guessing beyond the image." },
      { title: "Missing evidence", description: "Request or record absent angles, measurements or functional checks before a parcel decision." },
    ],
  },
  {
    domain: "sugargooindex.net", slug: "sugargoo-shipping-guide",
    seoTitle: "Sugargoo Shipping Guide | Weight, Consolidation and Route Inputs",
    description: "Plan Sugargoo shipping with received weight, package dimensions, consolidation choices, restricted contents and current destination-specific routes.",
    eyebrow: "Sugargoo parcel planning", title: "Estimate the measured parcel, not the catalog card.",
    intro: "International cost and route eligibility depend on the finished parcel and current terms, not only the product price.",
    sections: [
      { title: "Received inputs", description: "Use warehouse-recorded item weight, dimensions, quantity and restriction-relevant contents." },
      { title: "Packing decision", description: "Record consolidation, retained packaging and protective services that change parcel size or weight." },
      { title: "Current route", description: "Confirm eligibility, charging method, surcharges and destination rules at submission time." },
    ],
  },
  {
    domain: "sugargooindex.net", slug: "sugargoo-buying-guide",
    seoTitle: "How Sugargoo Works | Product, Warehouse and Parcel Workflow",
    description: "Follow a Sugargoo-linked product from current source and option selection through purchase, warehouse QC, consolidation, route choice and tracking.",
    eyebrow: "Sugargoo workflow map", title: "Keep each handoff attached to its evidence.",
    intro: "The product source, order record, warehouse record and parcel record support different decisions in the workflow.",
    sections: [
      { title: "Select and submit", description: "Preserve the source, seller context, intended option, quantity and product-stage amount." },
      { title: "Receive and inspect", description: "Match the warehouse record and photos to the exact ordered item before consolidation." },
      { title: "Build and track", description: "Use measured parcel inputs, current route terms and dated carrier events for the final stage." },
    ],
  },
  {
    domain: "sugargooindex.net", slug: "tracking",
    seoTitle: "Sugargoo Tracking Guide | Record Parcel Scans and Handoffs",
    description: "Track a Sugargoo parcel from the official account record, preserve the tracking number and dated scans, and separate delayed updates from verified delivery events.",
    eyebrow: "Sugargoo parcel tracking", title: "Track each handoff with dated evidence.",
    intro: "Open the official parcel record, then preserve the tracking number, last scan, handoff and review time together.",
    sections: [
      { title: "Start with the official parcel record", description: "Open the current Sugargoo account, locate the shipped parcel and use its Check Logistics view rather than relying on an old screenshot or copied number." },
      { title: "Preserve each handoff", description: "Record the tracking number, route or carrier, scan wording, location and timestamp so accepted, export, transit, customs and destination events remain distinguishable." },
      { title: "Investigate a quiet timeline", description: "Compare the last confirmed scan with the route's current information pattern, then use the official support path when the evidence is missing or unclear instead of inventing a location or delivery date." },
    ],
    questions: [
      { question: "Where should a Sugargoo parcel be tracked?", answer: "Use the current parcel record inside the official Sugargoo account and open its logistics details. This independent page does not access accounts or live carrier data." },
      { question: "Does a pause in tracking prove the parcel is lost?", answer: "No. A quiet timeline can occur between scans or carrier handoffs. Preserve the last confirmed event and ask the responsible service for current evidence when the gap needs investigation." },
      { question: "Can a tracking status predict the delivery date?", answer: "No. It records the latest available event, while customs, carrier transfers, destination processing and local delivery still depend on later evidence." },
    ],
  },
  {
    domain: "sugargooindex.net", slug: "faq",
    seoTitle: "Sugargoo Spreadsheet FAQ | Links, QC and Shipping Evidence",
    description: "Read independent answers about Sugargoo spreadsheet rows, product links, warehouse QC photos, parcel inputs and changing service information.",
    eyebrow: "Sugargoo evidence questions", title: "Know which source can answer each question.",
    intro: "Discovery, received-item evidence and shipping decisions should not be collapsed into one product claim.",
    sections: [],
    questions: [
      { question: "Is this an official Sugargoo spreadsheet?", answer: "No. It is an independent product-research method. Use Sugargoo for current accounts, orders, warehouse actions and service terms." },
      { question: "Do QC photos prove product authenticity?", answer: "No. They provide visible received-item evidence with limits; identity and performance claims require appropriate evidence." },
      { question: "Can a spreadsheet price predict delivered cost?", answer: "No. Product-stage amounts, domestic delivery, service costs and the measured international parcel are separate inputs." },
    ],
  },
];

const SUPERBUY_DEALS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "superbuydeals.com", slug: "superbuy-spreadsheet",
    seoTitle: "Superbuy Deal Archive | Source Dates, Terms and Status",
    description: "Build a Superbuy deal archive that preserves the original source, review date, eligibility, scope, expiry and current checkout status.",
    eyebrow: "Superbuy offer archive", title: "Archive the terms that made an offer real.",
    intro: "A promotional label without its conditions cannot be reviewed later and should not remain attached to products.",
    sections: [
      { title: "Source record", description: "Keep the official announcement or current destination and the date it was reviewed." },
      { title: "Eligibility record", description: "Document account, region, product, route, payment or minimum-spend conditions." },
      { title: "Status record", description: "Mark confirmed, limited, expired or unresolved according to current evidence." },
    ],
  },
  {
    domain: "superbuydeals.com", slug: "categories",
    seoTitle: "Superbuy Price Categories | Compare Like Charges and Products",
    description: "Compare Superbuy-linked prices within product categories while separating item price, domestic delivery, service costs and international parcel charges.",
    eyebrow: "Price comparison boundaries", title: "Compare the same cost layer inside the same category.",
    intro: "A lower product card is not automatically a lower delivered total, and a shipping offer is not a product discount.",
    sections: [
      { title: "Product layer", description: "Compare the same option, quantity and seller context before interpreting visible price differences." },
      { title: "Service layer", description: "Identify which handling or value-added service a promotion actually changes." },
      { title: "Parcel layer", description: "Use measured weight, dimensions, destination and current route terms for shipping comparisons." },
    ],
  },
  {
    domain: "superbuydeals.com", slug: "spreadsheet-checklist",
    seoTitle: "Superbuy Coupon and Deal Checklist | Verify Before Publishing",
    description: "Check a Superbuy coupon or deal for source, eligibility, covered charge, minimum spend, cap, expiry and checkout result before publication.",
    eyebrow: "Offer publication gate", title: "Require enough evidence to remove the offer later.",
    intro: "A reliable record explains both when an offer applies and when it no longer should be shown.",
    sections: [
      { title: "Who and where", description: "Record account status, region, platform, currency and payment conditions." },
      { title: "What changes", description: "State the covered product, service or route charge, discount method, minimum and cap." },
      { title: "When it ends", description: "Record expiry, usage limits, current checkout result and the next review date." },
    ],
  },
  {
    domain: "superbuydeals.com", slug: "shipping-weight-guide",
    seoTitle: "Superbuy Shipping Calculator Guide | Inputs and Final Cost",
    description: "Prepare destination, warehouse, weight, dimensions and item category for Superbuy's official shipping calculator, then reconcile the estimate with the packed parcel.",
    eyebrow: "Superbuy shipping calculator record", title: "Use the official fields, then keep the final parcel bill.",
    intro: "Superbuy's official calculator asks for destination, warehouse, weight, parcel dimensions and item category. The result is a planning record, while the packed parcel and logistics bill determine the final shipping cost.",
    sourceUrl: "https://login.superbuy.com/en/page/query/freight/",
    sourceLabel: "Open the official Superbuy calculator",
    sections: [
      { title: "Match the calculator fields", description: "Record the exact destination, warehouse, weight in grams, length, width, height and item category used for the current estimate.", points: ["Keep units with every measurement", "Retain the item category and destination", "Date the result before comparing it"] },
      { title: "Compare chargeable weight", description: "The official calculator explains that bulky parcels can be charged by volumetric weight. Packaging changes can therefore alter the result even when item weight is unchanged.", points: ["Keep actual and volumetric weight separate", "Recheck after consolidation and packaging", "Confirm the current route limit"] },
      { title: "Reconcile the final cost", description: "Superbuy's fee guidance says the initial international charge uses estimated weight, route and destination, then the logistics bill is reconciled after shipment.", points: ["Retain the packed parcel record", "Record refunds or added balance separately", "Verify any promotion against the selected route"] },
    ],
  },
  {
    domain: "superbuydeals.com", slug: "faq",
    seoTitle: "Superbuy Deals FAQ | Coupons, Prices and Expired Offers",
    description: "Read independent answers about Superbuy deal sources, coupon conditions, price layers, shipping promotions and expired-offer removal.",
    eyebrow: "Superbuy deal questions", title: "Treat every promotional claim as time-sensitive.",
    intro: "These answers define what must be checked before an offer enters or remains in the public archive.",
    sections: [],
    questions: [
      { question: "Are all offers on this site active?", answer: "No offer should be assumed active without a current source, applicable conditions and a recent confirmation result." },
      { question: "Does a coupon reduce international shipping?", answer: "Only when its current terms explicitly cover an eligible route or parcel charge." },
      { question: "Why keep expired offers?", answer: "A clearly marked archive can preserve history, but expired offers must not appear as current savings or product facts." },
    ],
  },
];

const SUPERBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "superbuyindex.com", slug: "superbuy-spreadsheet",
    seoTitle: "Superbuy Spreadsheet Index | Query, Deduplicate and Refresh",
    description: "Use a Superbuy spreadsheet index to record exact queries, group duplicate destinations, reopen current sources and retain dated product leads.",
    eyebrow: "Superbuy row-refresh method", title: "Keep the query and reason for retention beside each row.",
    intro: "An indexed result should remain repeatable after titles, prices, options or source pages change.",
    sections: [
      { title: "Record the query", description: "Save the exact search phrase and intended comparison instead of only the result title." },
      { title: "Group duplicates", description: "Compare destination, seller context, identifiers, images and options before counting separate choices." },
      { title: "Refresh the row", description: "Reopen the source, match the intended option and mark every missing or changed field." },
    ],
  },
  {
    domain: "superbuyindex.com", slug: "categories",
    seoTitle: "Superbuy Index Categories | Product-Specific Search Fields",
    description: "Browse Superbuy index categories with distinct measurement, material, specification, option and source fields for comparable results.",
    eyebrow: "Superbuy category query map", title: "Define comparable fields before searching a category.",
    intro: "Category-specific constraints reduce weak matches and make the retained rows more useful than a repeated product feed.",
    sections: [
      { title: "Apparel and footwear", description: "Add labeled sizing, measurements, intended variation, material and construction evidence." },
      { title: "Bags and accessories", description: "Use dimensions, compartments, closure, hardware, strap and included-piece fields." },
      { title: "Electronics", description: "Use exact model, voltage, plug, interfaces, language, battery and compatibility fields." },
    ],
  },
  {
    domain: "superbuyindex.com", slug: "search-ideas",
    seoTitle: "Superbuy Search Ideas | Queries for Reviewable Product Leads",
    description: "Build Superbuy product queries with item type, exact model, variation, measurement, material, specification and source clues.",
    eyebrow: "Superbuy query design", title: "Add the constraint that changes the next decision.",
    intro: "A precise phrase narrows discovery, while the destination page remains responsible for current product facts.",
    sections: [
      { title: "Known item", description: "Combine product type with model, variation and one decisive specification or measurement." },
      { title: "Category exploration", description: "Begin broad, then add only the field needed to create meaningful comparison groups." },
      { title: "Source refinement", description: "Use seller or marketplace clues only when the current destination confirms that context." },
    ],
  },
  {
    domain: "superbuyindex.com", slug: "spreadsheet-checklist",
    seoTitle: "Superbuy Spreadsheet Checklist | Public Index Quality Gate",
    description: "Check Superbuy index rows for a working source, exact option, useful evidence, duplicate control, nonzero price and a current review date.",
    eyebrow: "Superbuy index publication gate", title: "Do not publish an automatically collected row by default.",
    intro: "Only verified, differentiated and useful records belong in the sitemap and public search index.",
    sections: [
      { title: "Source and option", description: "Require a working destination and an identifiable intended variation." },
      { title: "Evidence and value", description: "Require product-specific fields that help a reader compare or decide the next check." },
      { title: "Exclusion rules", description: "Remove broken images, zero prices, duplicates, thin copy and unsupported product claims." },
    ],
  },
  {
    domain: "superbuyindex.com", slug: "shipping-weight-guide",
    seoTitle: "Superbuy Shipping Research | Parcel Weight and Route Boundaries",
    description: "Prepare Superbuy shipping research using received item data, packed parcel measurements, contents, destination and current route terms.",
    eyebrow: "Superbuy parcel inputs", title: "Keep shipping estimates outside the product row.",
    intro: "A product index cannot establish chargeable weight, route eligibility, customs outcomes or delivery timing.",
    sections: [
      { title: "Warehouse data", description: "Use received item weight, dimensions and restriction-relevant contents when available." },
      { title: "Packed parcel", description: "Record consolidation, retained packaging and services that change chargeable measurements." },
      { title: "Current destination", description: "Confirm route, calculation, restrictions and local rules with current responsible sources." },
    ],
  },
  {
    domain: "superbuyindex.com", slug: "buyer-safety",
    seoTitle: "Superbuy Product Research Safety | Separate Platform and Item Claims",
    description: "Review Superbuy service terms, seller evidence, product claims, exact item risks, parcel contents and destination restrictions separately.",
    eyebrow: "Superbuy research boundaries", title: "A platform page cannot verify every product claim.",
    intro: "Service, seller, item, route and destination questions need the current evidence source responsible for each fact.",
    sections: [
      { title: "Service evidence", description: "Use current official terms for accounts, payments, inspections, storage, refunds and route tools." },
      { title: "Item evidence", description: "Keep seller claims, measurements, materials, specifications and authenticity questions distinct." },
      { title: "Destination evidence", description: "Check exact contents against current carrier, customs and local requirements." },
    ],
  },
  {
    domain: "superbuyindex.com", slug: "faq",
    seoTitle: "Superbuy Index FAQ | Spreadsheet Queries and Source Refresh",
    description: "Read independent answers about Superbuy spreadsheet queries, duplicate rows, refresh dates, public indexing, safety and shipping boundaries.",
    eyebrow: "Superbuy index questions", title: "Know why a row is indexed and when it should leave.",
    intro: "The index records a repeatable research path, not a guarantee about a seller, item, service or delivery result.",
    sections: [],
    questions: [
      { question: "Is this the official Superbuy site?", answer: "No. It is an independent search index. Use Superbuy for current accounts, orders, warehouse services and route tools." },
      { question: "Why group duplicate rows?", answer: "Repeated cards can describe the same destination or variation and falsely increase the apparent number of choices." },
      { question: "Which rows enter Google?", answer: "Only reviewed pages and records that pass source, option, evidence, duplicate and quality checks should be indexable." },
    ],
  },
];

const SUPERBUY_ITEMS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "superbuyitems.com", slug: "superbuy-items",
    seoTitle: "Superbuy Items Guide | Build a Product Evidence File",
    description: "Build a Superbuy item file with the current source, exact option, visible claims, measurements, images, contradictions and review date.",
    eyebrow: "Superbuy item-file method", title: "Keep one evidence record for one intended variation.",
    intro: "A product page may contain many options; the file is useful only when every observation belongs to the item being considered.",
    sections: [
      { title: "Identify", description: "Save the source, seller context, title and exact color, size, model, set or quantity." },
      { title: "Observe", description: "Record visible measurements, specifications, images and claims without upgrading them into facts." },
      { title: "Reconcile", description: "Mark conflicts between title, images, options and specifications as unresolved." },
    ],
  },
  {
    domain: "superbuyitems.com", slug: "superbuy-product-links",
    seoTitle: "Superbuy Product Links | Destination and Option Verification",
    description: "Check a Superbuy-linked product URL for current destination, seller context, exact variation, visible price, images and unresolved fields.",
    eyebrow: "Superbuy link review", title: "A working URL is the start of the item check.",
    intro: "Redirects, moved listings and changed variations can make an old link describe a different item than the saved row.",
    sections: [
      { title: "Destination", description: "Open the final page and record the current marketplace and seller context." },
      { title: "Variation", description: "Confirm that the intended color, size, model, quantity and set remain selectable." },
      { title: "Change note", description: "Record changed, missing or conflicting fields and retire links that no longer support the item file." },
    ],
  },
  {
    domain: "superbuyitems.com", slug: "superbuy-qc",
    seoTitle: "Superbuy QC Photos | Received-Item Evidence Checklist",
    description: "Review Superbuy warehouse QC photos against the saved product link, exact option, visible condition, measurements and missing views.",
    eyebrow: "Superbuy received-item review", title: "Compare what arrived with what was ordered.",
    intro: "QC images are a new evidence layer and should not be silently merged with seller photos or unsupported claims.",
    sections: [
      { title: "Match", description: "Check the received color, size, model, quantity and included pieces against the order record." },
      { title: "Inspect", description: "Record visible construction, condition, labels and packaging while noting the limits of each view." },
      { title: "Resolve", description: "Request or document missing measurements, angles or checks before accepting the item for a parcel." },
    ],
  },
  {
    domain: "superbuyitems.com", slug: "superbuy-shipping",
    seoTitle: "Superbuy Item Shipping Inputs | From Warehouse Record to Parcel",
    description: "Prepare a Superbuy item for parcel planning with received weight, dimensions, quantity, packaging, restricted contents and destination questions.",
    eyebrow: "Superbuy item-to-parcel handoff", title: "Pass a complete Superbuy item file into parcel planning.",
    intro: "Seller estimates and product-card data cannot establish the finished parcel or its current eligible route.",
    sections: [
      { title: "Received item", description: "Use warehouse-recorded measurements and note batteries, liquids, powders, magnets or other restrictions." },
      { title: "Packaging", description: "Record what will remain, be removed or be added before consolidation." },
      { title: "Parcel handoff", description: "Pass complete item contents and measurements into the current route check." },
    ],
  },
  {
    domain: "superbuyitems.com", slug: "superbuy-review",
    seoTitle: "Superbuy Item Review Method | Claims, Evidence and Unknowns",
    description: "Write a Superbuy-linked item review that separates seller claims, listing observations, warehouse evidence and unresolved product questions.",
    eyebrow: "Superbuy evidence-led review", title: "Explain what the evidence shows and where it stops.",
    intro: "A useful review adds product-specific comparison value without inventing authenticity, quality or performance conclusions.",
    sections: [
      { title: "Seller claim", description: "Quote or summarize only what the current source states and identify it as source wording." },
      { title: "Visible observation", description: "Describe images, measurements, specifications and received condition without unsupported inference." },
      { title: "Open question", description: "Keep missing identity, material, performance or compatibility evidence explicit." },
    ],
  },
  {
    domain: "superbuyitems.com", slug: "categories",
    seoTitle: "Superbuy Item Categories | Evidence Fields for Each Product Type",
    description: "Organize Superbuy item files by category-specific sizing, materials, dimensions, construction, specifications and compatibility evidence.",
    eyebrow: "Superbuy item categories", title: "Change the checklist when the product changes.",
    intro: "A generic product template creates thin pages; a useful item file records the fields that matter for its product type.",
    sections: [
      { title: "Footwear and apparel", description: "Record labeled sizes, measurements, materials, construction and the intended variation." },
      { title: "Bags and accessories", description: "Record dimensions, compartments, closures, hardware, straps and included pieces." },
      { title: "Electronics", description: "Record model, voltage, plug, interfaces, language, battery, compatibility and route-sensitive contents." },
    ],
  },
  {
    domain: "superbuyitems.com", slug: "faq",
    seoTitle: "Superbuy Items FAQ | Product Links, Options and QC Evidence",
    description: "Read independent answers about Superbuy product links, exact options, warehouse QC evidence, item reviews and parcel handoffs.",
    eyebrow: "Superbuy item-file questions", title: "Keep the exact product and evidence layer clear.",
    intro: "These answers explain how to document an item without presenting seller or service information as guaranteed fact.",
    sections: [],
    questions: [
      { question: "Do item images prove authenticity?", answer: "No. Images are evidence to inspect and compare, not automatic proof of identity, materials, performance or authenticity." },
      { question: "Why record the exact option?", answer: "Different sizes, colors, models or sets can have different evidence and prices on the same product page." },
      { question: "Can listing weight be used for shipping?", answer: "Treat it as preliminary only. Use received and packed measurements with current route terms for parcel decisions." },
    ],
  },
];

const BOONBUY_FIND_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "boonbuyfind.net", slug: "categories",
    seoTitle: "BoonBuy Product Categories | Build a Source-Ready Search",
    description: "Browse BoonBuy product categories and identify the measurements, specifications, option fields and source evidence needed before saving a find.",
    eyebrow: "BoonBuy category research", title: "Let the product type decide which evidence belongs in the record.",
    intro: "A useful category narrows both the search and the proof needed to compare two listings.",
    sections: [
      { title: "Wearables", description: "For clothing and footwear, record labeled size, measurements, materials, construction and the intended variation." },
      { title: "Bags and accessories", description: "Record dimensions, compartments, hardware, closures, straps, finish and included pieces." },
      { title: "Electronics and special contents", description: "Record model, voltage, plug, interfaces, compatibility, battery details and route-sensitive contents." },
    ],
  },
  {
    domain: "boonbuyfind.net", slug: "search-guide",
    seoTitle: "How to Search BoonBuy Products | Query and Source Guide",
    description: "Use a BoonBuy search query that combines product type, one meaningful constraint and a source check without turning result titles into verified facts.",
    eyebrow: "BoonBuy search method", title: "Start with one decision the search result must help you make.",
    intro: "Short queries discover broadly; product-specific constraints make the result set useful enough to review.",
    sections: [
      { title: "Name the product", description: "Begin with a plain category or model term rather than a string of unsupported quality claims." },
      { title: "Add one constraint", description: "Add a size, material, dimension, feature or compatibility field that separates meaningful candidates." },
      { title: "Open the source", description: "Confirm the final destination, seller context, intended option and visible fields before retaining the result." },
    ],
  },
  {
    domain: "boonbuyfind.net", slug: "product-checklist",
    seoTitle: "BoonBuy Product Checklist | Option, Evidence and Unknowns",
    description: "Review a BoonBuy-linked product with the current source, exact option, category-specific evidence, duplicate check and unresolved questions.",
    eyebrow: "BoonBuy listing checklist", title: "A find becomes useful when another person can reproduce the check.",
    intro: "Preserve what the current page shows, what you intend to select and what the listing still cannot answer.",
    sections: [
      { title: "Source and option", description: "Save the current URL, seller context, color, size, model, set, quantity and review date." },
      { title: "Visible evidence", description: "Record only the measurements, specifications and images the current source actually provides." },
      { title: "Retention decision", description: "Remove duplicates and weak links; keep a dated reason and open question for every retained item." },
    ],
  },
  {
    domain: "boonbuyfind.net", slug: "platform-guide",
    seoTitle: "How BoonBuy Works | Independent Research Handoff Guide",
    description: "Separate BoonBuy product discovery from assisted purchase, warehouse receiving, QC, consolidation, parcel estimation, dispatch and tracking decisions.",
    eyebrow: "BoonBuy workflow boundary", title: "Carry the product record forward without mixing the service stages.",
    intro: "BoonBuy currently describes a multi-stage buying and parcel workflow. Verify each changing stage on the current service.",
    sections: [
      { title: "Product handoff", description: "Match the source, exact option, quantity and seller notes to the submitted order fields." },
      { title: "Warehouse handoff", description: "Compare received quantity, option and visible QC evidence with the saved product record." },
      { title: "Parcel handoff", description: "Use measured contents, selected packaging, destination and current route terms for the shipment decision." },
    ],
  },
  {
    domain: "boonbuyfind.net", slug: "faq",
    seoTitle: "BoonBuy Find FAQ | Search, QC, Sources and Shipping Scope",
    description: "Read independent answers about BoonBuy product search, source links, QC evidence, platform workflow and the public indexing quality gate.",
    eyebrow: "BoonBuy research questions", title: "Know when the discovery record ends and a current service check begins.",
    intro: "These answers explain how this research index handles evidence without making transaction promises.", sections: [],
    questions: [
      { question: "Is this the official BoonBuy website?", answer: "No. This is an independent discovery guide. Use boonbuy.com for current accounts, orders, warehouse, parcel and shipping services." },
      { question: "Does a product result verify quality or authenticity?", answer: "No. A result is a lead; review the current source, exact option and relevant evidence without unsupported conclusions." },
      { question: "Why are some collected products not indexed?", answer: "Automatic rows remain out of search until their source, uniqueness, option clarity and product-specific value pass review." },
    ],
  },
];

const BOONBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "boonbuyindex.com", slug: "boonbuy-products",
    seoTitle: "BoonBuy Products | Build a Reviewed Product Index",
    description: "Review BoonBuy-linked products by query intent, final source, exact option and visible evidence before retaining one representative result.",
    eyebrow: "BoonBuy product index", title: "Keep one useful record for each source and intended option.",
    intro: "A reviewed index reduces repeated results and explains why each remaining product still deserves a current source check.",
    sections: [
      { title: "Group repeated results", description: "Compare destination URL, seller context, image set and option structure before treating similar titles as separate products." },
      { title: "Match the intended option", description: "Record the size, color, model, set, quantity or compatibility field that makes the retained row relevant." },
      { title: "Keep a dated reason", description: "Save the review date, visible evidence and unresolved question so the row can be rechecked without relying on an old title." },
    ],
  },
  {
    domain: "boonbuyindex.com", slug: "query-method",
    seoTitle: "BoonBuy Search Method | Query, Source and Evidence Fields",
    description: "Use a BoonBuy product query with one meaningful constraint, then retain the source and evidence fields needed to reproduce the search decision.",
    eyebrow: "BoonBuy query method", title: "Write the question first, then judge whether a result answers it.",
    intro: "A precise query creates a smaller comparison set and makes generic, duplicate or unsupported rows easier to remove.",
    sections: [
      { title: "State the product intent", description: "Begin with the product type and intended use rather than seller adjectives or unsupported quality terms." },
      { title: "Add one separating field", description: "Use a measurement, material, model, feature or compatibility requirement that changes the decision." },
      { title: "Record the outcome", description: "Mark whether the source opened, the intended option was identifiable and enough product-specific evidence was visible." },
    ],
  },
  {
    domain: "boonbuyindex.com", slug: "source-checklist",
    seoTitle: "BoonBuy Source Checklist | Review Product Links Before Retaining",
    description: "Check a BoonBuy-linked result for source continuity, seller context, option clarity, visible specifications, duplicate status and review date.",
    eyebrow: "BoonBuy source review", title: "A row enters the index only when another reviewer can reopen the evidence.",
    intro: "Keep visible facts and unresolved fields separate so missing information is not replaced by assumptions.",
    sections: [
      { title: "Source continuity", description: "Open the final destination and confirm that it still represents the product and seller context recorded in the result." },
      { title: "Option and evidence", description: "Match the intended variation and record only the dimensions, specifications and images the current source shows." },
      { title: "Index decision", description: "Remove dead, repeated or generic rows; retain the date, reason and next open question for the useful candidates." },
    ],
  },
  {
    domain: "boonbuyindex.com", slug: "route-boundaries",
    seoTitle: "BoonBuy Route Boundaries | Separate Product and Service Research",
    description: "Separate BoonBuy product-index evidence from assisted purchase, warehouse, QC, parcel and shipping records that change at later stages.",
    eyebrow: "BoonBuy evidence boundaries", title: "Use the record created at the stage responsible for the fact.",
    intro: "A product source describes the requested item; later service and parcel decisions need current records from their own stage.",
    sections: [
      { title: "Product stage", description: "Use the current seller source for the intended option, visible product fields, price context and seller information." },
      { title: "Warehouse stage", description: "Use the received order and QC record for quantity, visible condition, measurements and option matching." },
      { title: "Parcel stage", description: "Use measured contents, packaging choice, destination and current route terms for shipping research." },
    ],
  },
  {
    domain: "boonbuyindex.com", slug: "faq",
    seoTitle: "BoonBuy Index FAQ | Products, Duplicates and Google Review Gate",
    description: "Read independent answers about BoonBuy product links, duplicate grouping, source checks, service boundaries and the reviewed Google indexing gate.",
    eyebrow: "BoonBuy index questions", title: "Know why a collected result can remain outside the public index.",
    intro: "These answers describe the review standard without turning a search row into a product, seller or delivery guarantee.", sections: [],
    questions: [
      { question: "Is this the official BoonBuy website?", answer: "No. This is an independent product research index. Use boonbuy.com for current account, order, warehouse, parcel and shipping services." },
      { question: "Why are similar results grouped?", answer: "Repeated titles can lead to the same source or option structure. Grouping reduces duplicate pages and keeps the clearest current record." },
      { question: "When can a collected page be indexed?", answer: "Only after source access, uniqueness, option clarity and distinct product-specific value pass review. Automatic or incomplete rows remain noindex." },
    ],
  },
];

const CNSHOPPER_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "cnshopperindex.com", slug: "cnshopper-products",
    seoTitle: "CNShopper Products | Browse Categories and Preserve Source Context",
    description: "Browse CNShopper-linked products by category while preserving the exact seller source, intended option and product-specific fields needed for review.",
    eyebrow: "CNShopper product directory", title: "Move from a broad category to one reproducible product record.",
    intro: "Category browsing supports discovery, but a retained product still needs a current source, exact variation and visible evidence.",
    sections: [
      { title: "Choose the product family", description: "Use the category to define the measurements, specifications or compatibility fields that matter for comparison." },
      { title: "Narrow the result", description: "Add the model, size, material, use case or feature that separates a useful candidate from generic catalog matches." },
      { title: "Preserve the source", description: "Keep the destination URL, seller context, intended variation, review date and unresolved product question together." },
    ],
  },
  {
    domain: "cnshopperindex.com", slug: "category-map",
    seoTitle: "CNShopper Category Map | Plan Product-Specific Comparisons",
    description: "Use a CNShopper category map to choose product-specific comparison fields for apparel, footwear, bags, accessories and electronics.",
    eyebrow: "CNShopper category method", title: "Let the category decide which fields belong in the comparison.",
    intro: "Different product families require different evidence, so a single generic checklist cannot make every catalog page useful.",
    sections: [
      { title: "Apparel and footwear", description: "Record labeled size, measurements, material or construction details and the exact color or variation selected." },
      { title: "Bags and accessories", description: "Record dimensions, compartments, closures, hardware, strap details, finish and included pieces." },
      { title: "Electronics and special contents", description: "Record model, voltage, plug, interfaces, compatibility, battery information and route-sensitive contents." },
    ],
  },
  {
    domain: "cnshopperindex.com", slug: "source-checklist",
    seoTitle: "CNShopper Source Checklist | Product Link and Option Review",
    description: "Review a CNShopper-linked product for final source, seller context, exact option, visible specifications, image relevance and unresolved fields.",
    eyebrow: "CNShopper source checklist", title: "Keep missing fields visible instead of completing them with seller language.",
    intro: "A useful catalog record distinguishes current evidence, requested choices and questions that require another source.",
    sections: [
      { title: "Open the final source", description: "Confirm the destination still represents the recorded product and identify the seller or marketplace context responsible for the listing." },
      { title: "Match the requested choice", description: "Record size, color, model, set, quantity and any compatibility field before comparing price or images." },
      { title: "Mark the evidence limit", description: "State which specifications are visible, which remain unresolved and when the source was last reviewed." },
    ],
  },
  {
    domain: "cnshopperindex.com", slug: "order-handoff",
    seoTitle: "CNShopper Order Handoff | Product, Warehouse and Parcel Records",
    description: "Carry a CNShopper product record into ordering, warehouse review and parcel planning without treating catalog fields as later-stage evidence.",
    eyebrow: "CNShopper workflow handoff", title: "Attach the right evidence to each step after product discovery.",
    intro: "Product, order, warehouse and parcel records answer different questions and may change on different dates.",
    sections: [
      { title: "Product to order", description: "Match the saved source, intended option, quantity and seller notes to the fields submitted for purchase." },
      { title: "Order to warehouse", description: "Compare received quantity, selected variation and visible inspection evidence with the saved product record." },
      { title: "Warehouse to parcel", description: "Use measured contents, packaging choice, destination and current route terms rather than catalog assumptions." },
    ],
  },
  {
    domain: "cnshopperindex.com", slug: "faq",
    seoTitle: "CNShopper Index FAQ | Categories, Sources and Indexing Review",
    description: "Read independent answers about CNShopper categories, product sources, option review, order handoffs and the public search indexing threshold.",
    eyebrow: "CNShopper research questions", title: "Know what the catalog can answer and when another record is required.",
    intro: "These answers keep product discovery separate from changing seller, service and parcel information.", sections: [],
    questions: [
      { question: "Is this the official CNShopper website?", answer: "No. This is an independent product research directory. Use cnshopper.com for current account, order, warehouse and service information." },
      { question: "Does a category page verify a product?", answer: "No. It organizes discovery and comparison fields. The current seller source and exact selected option still require review." },
      { question: "Why are automatic product pages not all indexed?", answer: "Collected, duplicate, incomplete or generic pages stay noindex until a reviewer confirms the source and adds distinct product-specific value." },
    ],
  },
];

const GOATEDBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "goatedbuyindex.com", slug: "guide",
    seoTitle: "GoatedBuy Guide | Build and Recheck a Product Shortlist",
    description: "Build a GoatedBuy-linked shortlist by matching the product intent, opening the current source, identifying the option and retaining a dated reason.",
    eyebrow: "GoatedBuy shortlist method", title: "Reduce the result set before service or route research begins.",
    intro: "A small list with clear retention reasons is easier to recheck than a long feed of similar titles.",
    sections: [
      { title: "Define the match", description: "Write the category, intended use and one product-specific constraint before judging results." },
      { title: "Group near-duplicates", description: "Compare final destination, seller context, images and option structure before keeping repeated candidates." },
      { title: "Retain with a reason", description: "Keep the source, intended option, review date and next unresolved check together." },
    ],
  },
  {
    domain: "goatedbuyindex.com", slug: "categories",
    seoTitle: "GoatedBuy Spreadsheet Categories | Product Evidence Map",
    description: "Organize GoatedBuy spreadsheet candidates by category-specific sizing, measurements, construction, specifications and compatibility evidence.",
    eyebrow: "GoatedBuy category evidence", title: "A category should change the questions asked of the listing.",
    intro: "Generic product pages add little value; category-specific fields make two candidates meaningfully comparable.",
    sections: [
      { title: "Apparel and footwear", description: "Compare labeled sizing, body or foot measurements, materials, construction and intended variation." },
      { title: "Bags and accessories", description: "Compare dimensions, compartments, closures, hardware, straps, finish and included pieces." },
      { title: "Electronics", description: "Compare model, plug, voltage, interfaces, language, battery and destination compatibility." },
    ],
  },
  {
    domain: "goatedbuyindex.com", slug: "goatedbuy-score",
    seoTitle: "GoatedBuy Score | Rank Listing Evidence, Not Product Quality",
    description: "Use a GoatedBuy Score based on query relevance, live source access, option clarity, evidence completeness and review date.",
    eyebrow: "GoatedBuy evidence score", title: "Score whether a candidate can be reviewed, not whether it is good.",
    intro: "The score is a research triage tool and does not certify identity, quality, seller reliability or delivery outcomes.",
    sections: [
      { title: "Relevance", description: "Check whether the result matches the intended product type and constraint rather than title keywords alone." },
      { title: "Traceability", description: "Require a working final source, identifiable option and review date." },
      { title: "Evidence gap", description: "Lower or hold a score when measurements, specifications, images or variant details are missing." },
    ],
  },
  {
    domain: "goatedbuyindex.com", slug: "search-ideas",
    seoTitle: "GoatedBuy Search Ideas | Queries That Reduce Duplicate Results",
    description: "Build GoatedBuy searches from product type, meaningful constraint, option wording and source clues to reduce duplicate and vague results.",
    eyebrow: "GoatedBuy query planning", title: "Use the query to expose differences worth checking.",
    intro: "A useful query narrows evidence, not just the number of matching words.",
    sections: [
      { title: "Known product", description: "Combine model or category with a measurable feature, material, size system or compatibility need." },
      { title: "Visual discovery", description: "Describe silhouette, construction, color placement or hardware before adding brand wording." },
      { title: "Refine from results", description: "Use repeated missing fields and duplicate patterns to choose the next query." },
    ],
  },
  {
    domain: "goatedbuyindex.com", slug: "shipping",
    seoTitle: "GoatedBuy Shipping Research | Parcel Inputs and Route Checks",
    description: "Research a GoatedBuy parcel with received contents, measured weight and dimensions, packaging choice, destination and current route terms.",
    eyebrow: "GoatedBuy parcel research", title: "Do not calculate the shipment from a product card.",
    intro: "Catalog values support discovery; route decisions need current parcel measurements and service records.",
    sections: [
      { title: "Use received contents", description: "Confirm the exact items and quantities that will enter the parcel." },
      { title: "Use measured inputs", description: "Record actual weight, dimensions and selected packaging after consolidation." },
      { title: "Recheck the route", description: "Confirm current availability, restrictions, fees and destination requirements on the responsible service." },
    ],
  },
  {
    domain: "goatedbuyindex.com", slug: "safety",
    seoTitle: "Is GoatedBuy Safe and Legit? Independent Evidence Checklist",
    description: "Assess GoatedBuy using current access, account controls, payment records, policies, support paths, warehouse evidence and parcel documentation.",
    eyebrow: "GoatedBuy service research", title: "Use dated evidence layers instead of a permanent yes-or-no verdict.",
    intro: "Platform operations, sellers, products and individual parcels require different evidence.",
    sections: [
      { title: "Platform layer", description: "Check current site access, policies, account security, payment records and support paths." },
      { title: "Product layer", description: "Keep seller claims, exact option and received-item evidence separate." },
      { title: "Parcel layer", description: "Use the submitted contents, route record, tracking and destination events for the exact shipment." },
    ],
  },
  {
    domain: "goatedbuyindex.com", slug: "faq",
    seoTitle: "GoatedBuy FAQ | Spreadsheet, Score, Shipping and Safety",
    description: "Read independent answers about the GoatedBuy spreadsheet, evidence score, product sources, shipping inputs and indexing quality gate.",
    eyebrow: "GoatedBuy research questions", title: "Keep shortlist value separate from transaction claims.",
    intro: "These answers explain what the index records and what must be confirmed elsewhere.", sections: [],
    questions: [
      { question: "Is the GoatedBuy Score a product rating?", answer: "No. It measures research completeness and traceability, not authenticity, quality or seller performance." },
      { question: "Is this the official GoatedBuy site?", answer: "No. Use goatedbuy.com for current account, order and service information." },
      { question: "Can automatically collected rows enter Google?", answer: "No. They remain noindex until a person verifies the source, duplicate status, option and distinct research value." },
    ],
  },
];

const GTBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "gtbuyindex.com", slug: "guide",
    seoTitle: "GTBuy Guide | Query, Inspect and Preserve the Product Source",
    description: "Use a GTBuy research sequence that records the exact query, final source, intended option, visible evidence and unresolved product questions.",
    eyebrow: "GTBuy traceable query", title: "Turn each retained result into a record another person can reopen.",
    intro: "The query explains why the result appeared; the source and option explain what it actually represents.",
    sections: [
      { title: "Save the query", description: "Record the exact search terms and intent rather than relying on a later recollection." },
      { title: "Inspect the destination", description: "Confirm the final URL, seller context, option structure and visible product fields." },
      { title: "Record the unknown", description: "Keep missing measurements, specifications and evidence explicit before comparison." },
    ],
  },
  {
    domain: "gtbuyindex.com", slug: "categories",
    seoTitle: "GTBuy Spreadsheet Categories | Field-Level Product Research",
    description: "Browse GTBuy spreadsheet categories with field-level checks for apparel, footwear, bags, accessories and electronics.",
    eyebrow: "GTBuy category fields", title: "Index the fields that matter for the product type.",
    intro: "The same generic title cannot support every category; the research record must change with the item.",
    sections: [
      { title: "Sizing categories", description: "Record labeled size, measurement method, actual dimensions, materials and construction." },
      { title: "Structure categories", description: "Record dimensions, compartments, closures, hardware, straps and included pieces." },
      { title: "Compatibility categories", description: "Record model, plug, voltage, interface, language, battery and destination compatibility." },
    ],
  },
  {
    domain: "gtbuyindex.com", slug: "gtbuy-score",
    seoTitle: "GTBuy Source Score | Audit Query-to-Listing Traceability",
    description: "Use a GTBuy Source Score to audit query match, final destination, selected option, evidence fields, freshness and unresolved questions.",
    eyebrow: "GTBuy source audit", title: "Score the continuity from query to source, not the product itself.",
    intro: "A high traceability score means the research can be reproduced; it does not guarantee a seller, service or outcome.",
    sections: [
      { title: "Query continuity", description: "Check that the retained item answers the original product intent rather than a keyword coincidence." },
      { title: "Source continuity", description: "Require a working destination, seller context and identifiable intended option." },
      { title: "Record continuity", description: "Require a review date, evidence fields and explicit unknowns before publication." },
    ],
  },
  {
    domain: "gtbuyindex.com", slug: "search-ideas",
    seoTitle: "GTBuy Search Ideas | Build Queries from Verifiable Fields",
    description: "Create GTBuy searches from product category, measurement, material, model, compatibility and option fields that can be checked on a source.",
    eyebrow: "GTBuy search design", title: "Search for fields you can later verify.",
    intro: "Queries built from evidence fields produce records that are easier to compare and refresh.",
    sections: [
      { title: "Measurement queries", description: "Use dimensions, size system or model-specific fit fields for apparel, footwear and bags." },
      { title: "Construction queries", description: "Use material, closure, hardware, sole, lining or component wording when it changes the comparison." },
      { title: "Compatibility queries", description: "Use exact model, interface, plug, voltage, language or battery requirements for devices." },
    ],
  },
  {
    domain: "gtbuyindex.com", slug: "shipping",
    seoTitle: "GTBuy Shipping Estimate Guide | Weight, Dimensions and Routes",
    description: "Estimate GTBuy shipping with received contents, measured parcel weight and dimensions, packaging choices and current destination route terms.",
    eyebrow: "GTBuy shipping estimate inputs", title: "Replace listing guesses with measured parcel inputs.",
    intro: "The item record identifies what was requested; the warehouse and parcel record identify what is being shipped.",
    sections: [
      { title: "Match contents", description: "Reconcile the retained product option and quantity with received warehouse records." },
      { title: "Measure the parcel", description: "Use actual weight, dimensions and packaging after the selected items are consolidated." },
      { title: "Confirm the route", description: "Check current restrictions, availability, fees and destination requirements on GTBuy." },
    ],
  },
  {
    domain: "gtbuyindex.com", slug: "safety",
    seoTitle: "GTBuy Safety Research | Account, Source and Parcel Evidence",
    description: "Review GTBuy with current site access, account controls, payment records, product sources, support paths and parcel-specific documentation.",
    eyebrow: "GTBuy evidence layers", title: "Assess the exact action and date instead of assigning one permanent label.",
    intro: "Account security, seller claims, product evidence and parcel outcomes belong to separate records.",
    sections: [
      { title: "Account evidence", description: "Review the current domain, login controls, payment records, policies and support routes." },
      { title: "Source evidence", description: "Preserve the final marketplace destination, intended option and review date." },
      { title: "Shipment evidence", description: "Use the exact parcel contents, route, tracking events and destination records." },
    ],
  },
  {
    domain: "gtbuyindex.com", slug: "faq",
    seoTitle: "GTBuy Index FAQ | Queries, Sources, Scores and Shipping",
    description: "Read independent answers about GTBuy spreadsheet queries, source scoring, exact options, parcel inputs and public indexing review.",
    eyebrow: "GTBuy research questions", title: "Keep every answer attached to the evidence layer that supports it.",
    intro: "This index preserves product research; GTBuy remains responsible for its current service information.", sections: [],
    questions: [
      { question: "What does the GTBuy Source Score mean?", answer: "It measures whether the query, source, option and dated evidence remain traceable. It is not a product or seller rating." },
      { question: "Does this site operate GTBuy accounts or orders?", answer: "No. Use gtbuy.com for current accounts, transactions, warehouse and shipping services." },
      { question: "Are all product rows indexable?", answer: "No. Unreviewed, duplicate, incomplete, stale or low-value rows remain noindex and outside the sitemap." },
    ],
  },
];

const HIPOBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "hipobuyindex.com", slug: "guide",
    seoTitle: "Hipobuy Guide | Connect Product Sources with QC Evidence",
    description: "Use a Hipobuy item file that connects the requested source and exact option with received-item QC images, measurements and unresolved questions.",
    eyebrow: "Hipobuy item evidence", title: "Keep requested-product evidence beside received-item evidence.",
    intro: "Marketplace pages describe the intended item; QC records can show visible aspects of the received item. Neither replaces the other.",
    sections: [
      { title: "Requested layer", description: "Save the source, seller context, intended option, quantity and visible product claims." },
      { title: "Received layer", description: "Compare labeled option, quantity, visible condition, measurements and requested photo angles." },
      { title: "Decision layer", description: "Record discrepancies, missing views and the next action without unsupported identity or quality claims." },
    ],
  },
  {
    domain: "hipobuyindex.com", slug: "categories",
    seoTitle: "Hipobuy Spreadsheet Categories | QC Evidence by Product Type",
    description: "Organize Hipobuy spreadsheet items by category-specific product fields and QC views for apparel, footwear, bags, accessories and electronics.",
    eyebrow: "Hipobuy QC category map", title: "Request evidence that can answer a product-specific question.",
    intro: "A generic image set cannot test every kind of product claim.",
    sections: [
      { title: "Apparel and footwear", description: "Match labeled size, measurements, materials, construction, color and the intended variation." },
      { title: "Bags and accessories", description: "Check dimensions, compartments, closures, hardware, straps, finish and included pieces." },
      { title: "Electronics", description: "Check model, plug, voltage, interfaces, language, battery, compatibility and route-sensitive contents." },
    ],
  },
  {
    domain: "hipobuyindex.com", slug: "hipobuy-score",
    seoTitle: "Hipobuy Evidence Score | Source-to-QC Completeness Check",
    description: "Use a Hipobuy Evidence Score based on source access, exact-option match, QC coverage, measurement relevance, freshness and open questions.",
    eyebrow: "Hipobuy evidence score", title: "Measure whether the source-to-QC comparison is complete.",
    intro: "The score does not authenticate a product or guarantee materials, performance, seller conduct or delivery.",
    sections: [
      { title: "Source match", description: "Require a current destination and clearly identified size, color, model, set and quantity." },
      { title: "QC coverage", description: "Require the views and measurements that address the product-specific comparison." },
      { title: "Open evidence", description: "Lower or hold the score while discrepancies or missing views remain unresolved." },
    ],
  },
  {
    domain: "hipobuyindex.com", slug: "search-ideas",
    seoTitle: "Hipobuy Search Ideas | Queries Designed for Later QC Checks",
    description: "Build Hipobuy searches from product type, exact variation and visible evidence fields that can later be compared with QC records.",
    eyebrow: "Hipobuy QC-ready queries", title: "Search with the later warehouse check in mind.",
    intro: "The strongest query identifies both the intended option and the evidence needed after receipt.",
    sections: [
      { title: "Variation terms", description: "Include the model, color, size, material, set or quantity that must survive the handoff." },
      { title: "Evidence terms", description: "Add a measurement, construction detail, specification or compatibility field that can be checked." },
      { title: "Duplicate control", description: "Group repeated destinations and near-identical listings before selecting a source record." },
    ],
  },
  {
    domain: "hipobuyindex.com", slug: "shipping",
    seoTitle: "Hipobuy Shipping Research | QC Record to Parcel Route",
    description: "Research Hipobuy shipping with confirmed received items, measured parcel inputs, packaging decisions, restrictions and current route terms.",
    eyebrow: "Hipobuy parcel evidence", title: "Use QC to confirm contents, then use parcel evidence for the route.",
    intro: "Product and QC images do not establish final shipping weight, dimensions, availability or delivered cost.",
    sections: [
      { title: "Confirm contents", description: "Reconcile product options, quantities and visible received condition before parcel submission." },
      { title: "Measure after packing", description: "Use actual weight, dimensions and selected packaging for estimates and route review." },
      { title: "Verify current terms", description: "Check current route availability, restrictions, fees and destination requirements on Hipobuy." },
    ],
  },
  {
    domain: "hipobuyindex.com", slug: "safety",
    seoTitle: "Is Hipobuy Safe and Legit? Source, QC and Account Checklist",
    description: "Assess Hipobuy using current access, account controls, payment records, source continuity, QC evidence, support paths and parcel documentation.",
    eyebrow: "Hipobuy service research", title: "Review platform, product and parcel evidence separately.",
    intro: "A current account or parcel record is stronger than an undated reputation claim.",
    sections: [
      { title: "Platform record", description: "Review the current domain, account security, payment record, policies and support channels." },
      { title: "Product record", description: "Keep the original source, exact requested option and QC comparison together." },
      { title: "Parcel record", description: "Use submitted contents, selected route, tracking events and destination outcomes for the exact shipment." },
    ],
  },
  {
    domain: "hipobuyindex.com", slug: "faq",
    seoTitle: "Hipobuy FAQ | Spreadsheet, QC Photos, Scores and Shipping",
    description: "Read independent answers about Hipobuy spreadsheet rows, QC photo limits, evidence scoring, shipping inputs and indexing review.",
    eyebrow: "Hipobuy research questions", title: "Understand what QC evidence can show and where it stops.",
    intro: "These answers separate visible evidence from claims that still require the responsible source.", sections: [],
    questions: [
      { question: "Do Hipobuy QC photos prove authenticity?", answer: "No. They can document visible received-item details, but do not automatically prove identity, materials or performance." },
      { question: "Is this the official Hipobuy site?", answer: "No. Use hipobuy.com for current account, order, warehouse and shipping information." },
      { question: "Why are some collected products excluded from Google?", answer: "Rows remain noindex when source continuity, exact option, duplicate control or product-specific research value is insufficient." },
    ],
  },
];

const HOOBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  { domain: "hoobuyindex.net", slug: "guide", seoTitle: "HooBuy Guide | Verify the Product Before the Buying Route", description: "Use a HooBuy evidence gate that checks the third-party source, exact option and visible product fields before assisted purchase or route comparison.", eyebrow: "HooBuy product evidence gate", title: "Stabilize the product record before choosing a service path.", intro: "HooBuy states that assisted-purchase products come from third-party sellers. Keep their claims separate from HooBuy service records.", sections: [
    { title: "Third-party source", description: "Save the final marketplace page, seller context, intended option, quantity and review date." },
    { title: "Product evidence", description: "Record visible measurements, specifications and images without presenting them as independent certification." },
    { title: "Service handoff", description: "Match the saved option to current HooBuy order fields, warehouse evidence and later parcel records." },
  ] },
  { domain: "hoobuyindex.net", slug: "categories", seoTitle: "HooBuy Spreadsheet Categories | Product Evidence by Type", description: "Browse HooBuy spreadsheet categories with different measurement, construction, specification and compatibility fields for each product type.", eyebrow: "HooBuy category checks", title: "Change the evidence gate when the product category changes.", intro: "A generic listing template does not provide enough value for every item.", sections: [
    { title: "Apparel and footwear", description: "Record labeled size, actual measurements, materials, construction and intended variation." },
    { title: "Bags and accessories", description: "Record dimensions, compartments, closures, hardware, straps and included pieces." },
    { title: "Electronics", description: "Record model, plug, voltage, interfaces, language, battery, compatibility and route-sensitive contents." },
  ] },
  { domain: "hoobuyindex.net", slug: "hoobuy-score", seoTitle: "HooBuy Evidence Gate Score | Source and Option Readiness", description: "Use a HooBuy evidence score for source access, exact-option clarity, category-specific fields, duplicate control and review freshness.", eyebrow: "HooBuy readiness score", title: "Score whether a listing is ready for a service decision.", intro: "The score measures research readiness, not product identity, quality, seller conduct or delivery performance.", sections: [
    { title: "Source readiness", description: "Require a current destination, seller context and dated review." },
    { title: "Option readiness", description: "Require an identifiable color, size, model, set, quantity and relevant evidence." },
    { title: "Decision readiness", description: "Hold duplicates, dead sources and unresolved product-specific questions outside route comparison." },
  ] },
  { domain: "hoobuyindex.net", slug: "search-ideas", seoTitle: "HooBuy Search Ideas | Queries for Third-Party Product Sources", description: "Build HooBuy searches from product type, meaningful constraint, exact option and evidence fields that can be confirmed on a third-party source.", eyebrow: "HooBuy query planning", title: "Search for a product field you can verify later.", intro: "A useful query narrows both candidates and the evidence needed to retain one.", sections: [
    { title: "Fit and size", description: "Use a size system, measurement, silhouette or model-specific fit constraint." },
    { title: "Construction", description: "Use material, closure, sole, lining, hardware or component wording when relevant." },
    { title: "Compatibility", description: "Use exact model, interface, plug, voltage, language or battery requirements." },
  ] },
  { domain: "hoobuyindex.net", slug: "shipping", seoTitle: "HooBuy Shipping Calculator Guide | Inputs and Estimate Limits", description: "Prepare destination, weight, category and parcel dimensions for the official HooBuy shipping calculator, then compare the estimate with warehouse evidence.", eyebrow: "HooBuy shipping estimate guide", title: "Prepare the evidence before opening the shipping calculator.", intro: "HooBuy's official estimator asks for destination, weight, item category and parcel dimensions. Its result is a planning estimate, not the packed-parcel charge.", sourceUrl: "https://hoobuy.com/estimation", sourceLabel: "Open the official HooBuy estimator", sections: [
    { title: "Enter comparable inputs", description: "Use the same destination, parcel weight, item category, length, width and height whenever you compare an estimate.", points: ["Record the unit used for each field", "Keep the destination and item category with the result", "Date the estimate so an older result is not presented as current"] },
    { title: "Check chargeable weight", description: "HooBuy explains that routes can use actual or volumetric weight. Bulky packaging can therefore change the result even when item weight stays the same.", points: ["Separate item weight from packed-parcel weight", "Retain the dimensions used by the estimator", "Recheck after consolidation or packaging changes"] },
    { title: "Reconcile after warehousing", description: "HooBuy's published guidance says route prices can vary by goods category and that value-added services are calculated separately. Use the warehouse record before submission.", points: ["Confirm current route eligibility and restrictions", "Compare the estimate with the warehouse parcel record", "Keep optional service fees outside the base estimate"] },
  ], questions: [
    { question: "Does this page calculate a HooBuy shipping price?", answer: "No. It prepares and records the inputs for HooBuy's official estimator so this independent guide does not invent a live rate." },
    { question: "Why can a HooBuy shipping estimate change?", answer: "Destination, item category, actual weight, parcel dimensions, packaging and optional services can change the available routes or displayed amount." },
    { question: "Is the estimator result the final parcel charge?", answer: "Not necessarily. Compare it with the current warehouse measurements, route terms and selected services before submitting a parcel." },
  ] },
  { domain: "hoobuyindex.net", slug: "safety", seoTitle: "Is HooBuy Safe and Legit? Third-Party Product Checklist", description: "Assess HooBuy using current domain access, account controls, payments, third-party source records, policies, support paths and parcel documentation.", eyebrow: "HooBuy service evidence", title: "Assess platform, seller and parcel evidence as separate layers.", intro: "One undated label cannot describe every product, transaction or shipment.", sections: [
    { title: "Platform layer", description: "Review current site access, account security, payment records, help content and support channels." },
    { title: "Seller layer", description: "Preserve the third-party destination, product option and visible seller claims." },
    { title: "Parcel layer", description: "Use exact contents, selected route, tracking events and destination records." },
  ] },
  { domain: "hoobuyindex.net", slug: "faq", seoTitle: "HooBuy Index FAQ | Sources, Evidence, Shipping and Safety", description: "Read independent answers about HooBuy third-party product sources, evidence scores, exact options, parcel inputs and public indexing review.", eyebrow: "HooBuy research questions", title: "Know which source is responsible for each claim.", intro: "This index records product research; HooBuy and third-party sellers remain separate sources.", sections: [], questions: [
    { question: "Does HooBuy sell the indexed products?", answer: "HooBuy states that assisted-purchase products are retrieved from third-party platforms and are not directly sold by HooBuy." },
    { question: "Does the HooBuy Score prove quality?", answer: "No. It measures whether the source, option and evidence record are ready to review." },
    { question: "Can automatic product rows enter Google?", answer: "No. Unreviewed, duplicate, incomplete or low-value rows remain noindex and outside the sitemap." },
  ] },
];

const JOYABUY_FINDS_PAGES: readonly TenantResearchPage[] = [
  { domain: "joyabuyfinds.com", slug: "guide", seoTitle: "JoyaGoo Finds Guide | Discover, Open and Verify Sources", description: "Use a JoyaGoo discovery workflow that starts with category, name or image search and ends with a traceable product source and exact option.", eyebrow: "JoyaGoo discovery flow", title: "Explore widely, then reduce each find to a source record.", intro: "JoyaGoo publishes link, name and image search routes. Their results remain candidates until the current destination is checked.", sections: [
    { title: "Choose the discovery mode", description: "Use category browsing for orientation, exact terms for known products and images for visual intent." },
    { title: "Open the destination", description: "Confirm final URL, seller context, intended variation and visible product fields." },
    { title: "Keep or retire", description: "Retain a dated reason and next question, or retire weak, redirected and duplicate sources." },
  ] },
  { domain: "joyabuyfinds.com", slug: "categories", seoTitle: "JoyaGoo Finds Categories | Visual and Field-Based Discovery", description: "Explore JoyaGoo finds by product category while recording the measurements, construction, specifications and QC views needed for later verification.", eyebrow: "JoyaGoo discovery categories", title: "Let the category shape both the query and later evidence check.", intro: "Discovery becomes useful when it identifies what must be verified next.", sections: [
    { title: "Wearables", description: "Use style and fit cues for discovery, then require size, measurements, material and construction fields." },
    { title: "Bags and accessories", description: "Use shape and hardware cues, then require dimensions, closures, compartments and included pieces." },
    { title: "Devices", description: "Use model and visual cues, then require interface, voltage, plug, language, battery and compatibility fields." },
  ] },
  { domain: "joyabuyfinds.com", slug: "joyagoo-score", seoTitle: "JoyaGoo Find Score | Rank Discovery Leads by Evidence", description: "Use a JoyaGoo Find Score for intent match, source access, option clarity, useful evidence and duplicate distance without rating product quality.", eyebrow: "JoyaGoo discovery score", title: "Rank which find deserves the next check.", intro: "The score triages discovery leads; it does not certify a product, seller or service outcome.", sections: [
    { title: "Intent match", description: "Check whether the result answers the category, visual or exact-product intent that started the search." },
    { title: "Source clarity", description: "Require a current destination and identifiable intended option." },
    { title: "Distinct value", description: "Remove near-duplicates and retain only candidates with a product-specific reason to stay." },
  ] },
  { domain: "joyabuyfinds.com", slug: "search-ideas", seoTitle: "JoyaGoo Search Ideas | Category, Name and Image Discovery", description: "Choose JoyaGoo category, product-name or image searches based on what is known, then add one verifiable constraint before reviewing results.", eyebrow: "JoyaGoo search modes", title: "Match the search mode to the information already available.", intro: "Different discovery inputs solve different questions and should not be merged into one generic query.", sections: [
    { title: "Category first", description: "Use broad browsing when the product family is known but the vocabulary is not." },
    { title: "Name first", description: "Use model, product type and one meaningful constraint when the item is known." },
    { title: "Image first", description: "Use visual search for silhouette or detail discovery, then verify text fields on the final source." },
  ] },
  { domain: "joyabuyfinds.com", slug: "shipping", seoTitle: "JoyaGoo Finds Shipping Handoff | From Candidate to Parcel", description: "Move a JoyaGoo find into shipping research only after source, option and received-item evidence are stable, then use measured parcel inputs.", eyebrow: "JoyaGoo find-to-parcel boundary", title: "Do not let a discovery card answer a parcel question.", intro: "JoyaGoo separates product payment, warehouse receipt, parcel submission and international shipping.", sections: [
    { title: "Confirm the candidate", description: "Lock the current source, intended option and quantity before order submission." },
    { title: "Review warehouse evidence", description: "Compare received-item QC records with the saved product evidence." },
    { title: "Build the route record", description: "Use measured contents, packaging, destination and current route terms." },
  ] },
  { domain: "joyabuyfinds.com", slug: "safety", seoTitle: "JoyaGoo Finds Safety | Discovery Link and Service Checklist", description: "Check JoyaGoo discovery links, final destinations, account records, third-party seller context, QC evidence and parcel documentation separately.", eyebrow: "JoyaGoo discovery safety", title: "Inspect where the find ends before relying on what it shows.", intro: "A familiar image or title cannot make a redirected or stale source current.", sections: [
    { title: "Resolve the destination", description: "Confirm the final host, seller context and product identity before entering credentials or order data." },
    { title: "Compare the listing", description: "Check intended option, visible fields and review date against the saved find." },
    { title: "Retire weak links", description: "Remove dead, redirected, mismatched and insufficient sources from public results." },
  ] },
  { domain: "joyabuyfinds.com", slug: "faq", seoTitle: "JoyaGoo Finds FAQ | Search Modes, Sources and QC Handoffs", description: "Read independent answers about JoyaGoo category, name and image search, source verification, QC boundaries and indexing review.", eyebrow: "JoyaGoo discovery questions", title: "Separate a useful find from a verified transaction record.", intro: "These answers explain discovery without presenting current product or service claims as fixed facts.", sections: [], questions: [
    { question: "Is this the official JoyaGoo site?", answer: "No. Use joyagoo.com for current accounts, orders, warehouse and shipping services." },
    { question: "Does an image search result verify a product?", answer: "No. Open the current destination and match the exact option and text evidence." },
    { question: "Why are some finds excluded from Google?", answer: "Candidates remain noindex until source, option, uniqueness and distinct research value pass review." },
  ] },
];

const JOYAGOO_INDEX_PAGES: readonly TenantResearchPage[] = [
  { domain: "joyagooindex.com", slug: "guide", seoTitle: "JoyaGoo Guide | Product, Order, QC and Parcel Stages", description: "Follow a JoyaGoo evidence sequence from current product source and selected option through order status, warehouse QC, parcel submission and tracking.", eyebrow: "JoyaGoo staged workflow", title: "Record each handoff without rewriting earlier evidence.", intro: "JoyaGoo publishes distinct search, purchase, warehouse and parcel stages. Keep their dates and responsibilities separate.", sections: [
    { title: "Source and order", description: "Save the product destination, seller context, exact option and submitted order fields." },
    { title: "Warehouse and QC", description: "Record arrival status, received quantity, visible inspection evidence and unresolved discrepancies." },
    { title: "Parcel and tracking", description: "Record selected contents, measured package inputs, route, payment and shipment events." },
  ] },
  { domain: "joyagooindex.com", slug: "categories", seoTitle: "JoyaGoo Spreadsheet Categories | Evidence Across Order Stages", description: "Organize JoyaGoo spreadsheet items by category-specific product fields while preserving source, QC and parcel stages for every record.", eyebrow: "JoyaGoo staged categories", title: "The product category determines what must survive each handoff.", intro: "Useful records preserve category-specific fields from selection through warehouse review.", sections: [
    { title: "Sizing records", description: "Carry labeled size, intended measurements and received-item measurements across the stages." },
    { title: "Construction records", description: "Carry materials, closures, hardware, compartments and requested detail views." },
    { title: "Compatibility records", description: "Carry exact model, plug, voltage, interfaces, language, battery and restriction questions." },
  ] },
  { domain: "joyagooindex.com", slug: "joyagoo-score", seoTitle: "JoyaGoo Stage Score | Evidence Continuity from Source to Parcel", description: "Use a JoyaGoo Stage Score to check whether source, option, order state, QC record, parcel inputs and review dates remain connected.", eyebrow: "JoyaGoo continuity score", title: "Measure evidence continuity, not product quality.", intro: "A stage score shows whether the process record can be audited; it does not guarantee seller, service or shipment outcomes.", sections: [
    { title: "Source continuity", description: "Require a current destination and exact requested option." },
    { title: "Warehouse continuity", description: "Require an identifiable arrival and QC record linked to the request." },
    { title: "Parcel continuity", description: "Require measured contents, packaging, route and dated tracking records." },
  ] },
  { domain: "joyagooindex.com", slug: "search-ideas", seoTitle: "JoyaGoo Spreadsheet Search Ideas | Queries for Traceable Records", description: "Build JoyaGoo spreadsheet queries from product type, exact option and evidence fields that can survive order and warehouse handoffs.", eyebrow: "JoyaGoo traceable queries", title: "Search for fields that remain meaningful at the warehouse.", intro: "A traceable query makes the intended option and later comparison explicit.", sections: [
    { title: "Option terms", description: "Include model, color, size, material, set and quantity when they define the request." },
    { title: "Evidence terms", description: "Include a measurement, specification or construction field that can later be checked." },
    { title: "Refresh terms", description: "Record the exact query and date so changed results can be detected." },
  ] },
  { domain: "joyagooindex.com", slug: "shipping", seoTitle: "JoyaGoo Shipping Guide | Two Payments and Measured Parcel Inputs", description: "Research JoyaGoo shipping by separating product and domestic costs from later international parcel payment, measured inputs and current route terms.", eyebrow: "JoyaGoo parcel stages", title: "Keep product payment and international parcel payment separate.", intro: "JoyaGoo documents distinct product, warehouse and international shipping stages; estimates can differ from actual packed measurements.", sections: [
    { title: "First stage", description: "Record product, domestic delivery and seller-side order information." },
    { title: "Warehouse stage", description: "Confirm received items, QC evidence, consolidation choices and actual package inputs." },
    { title: "International stage", description: "Record current route, international payment, tracking and destination events." },
  ] },
  { domain: "joyagooindex.com", slug: "safety", seoTitle: "Is JoyaGoo Safe and Legit? Dated Workflow Evidence", description: "Assess JoyaGoo with current access, account records, third-party product sources, QC evidence, support paths, parcel records and destination events.", eyebrow: "JoyaGoo process evidence", title: "Assess the exact stage and date instead of one permanent label.", intro: "JoyaGoo notes third-party seller and logistics risks; keep those responsibilities visible in the record.", sections: [
    { title: "Account and order", description: "Review current access, payment records, submitted fields, policies and support routes." },
    { title: "Product and QC", description: "Separate third-party seller claims from received-item warehouse observations." },
    { title: "Parcel and destination", description: "Use exact contents, selected route, tracking, customs and delivery events." },
  ] },
  { domain: "joyagooindex.com", slug: "faq", seoTitle: "JoyaGoo Index FAQ | Orders, QC, Storage and Shipping Stages", description: "Read independent answers about JoyaGoo spreadsheet records, order stages, QC limits, consolidation, parcel estimates and indexing review.", eyebrow: "JoyaGoo process questions", title: "Use the current stage record to answer the current question.", intro: "This index explains evidence continuity without turning changing service terms into permanent promises.", sections: [], questions: [
    { question: "Why separate product and shipping payments?", answer: "The product order and later international parcel use different inputs, stages and records." },
    { question: "Can QC images prove every product claim?", answer: "No. JoyaGoo notes limits to visual inspection; keep source claims and visible warehouse observations separate." },
    { question: "Do all collected items enter the sitemap?", answer: "No. Only reviewed pages with traceable stages, distinct value and current sources are indexable." },
  ] },
];

const KAMEYMALL_INDEX_PAGES: readonly TenantResearchPage[] = [
  { domain: "kameymallindex.com", slug: "guide", seoTitle: "KameyMall Guide | From Category Search to Product Evidence", description: "Use KameyMall categories for orientation, then switch to an exact source, option, QC and parcel record before making a comparison.", eyebrow: "KameyMall category-to-item method", title: "Browse to learn the fields, then review one item precisely.", intro: "KameyMall publishes product search, historical QC and warehouse workflows. Use each as a separate evidence layer.", sections: [
    { title: "Category orientation", description: "Identify the measurements, specifications and close views that matter for the product type." },
    { title: "Product selection", description: "Save the current source, seller context, exact option, quantity and visible fields." },
    { title: "Warehouse handoff", description: "Compare received-item evidence and parcel measurements with the saved request." },
  ] },
  { domain: "kameymallindex.com", slug: "categories", seoTitle: "KameyMall Spreadsheet Categories | Research Fields by Product", description: "Browse KameyMall spreadsheet categories with product-specific size, construction, dimension, specification and compatibility checks.", eyebrow: "KameyMall category map", title: "Use category context to avoid generic product pages.", intro: "A distinct page should answer the evidence questions specific to its product type.", sections: [
    { title: "Clothing and footwear", description: "Record labeled size, actual measurements, materials, construction and intended variation." },
    { title: "Homewares and bags", description: "Record dimensions, materials, compartments, closures, hardware and included pieces." },
    { title: "Electronics", description: "Record model, voltage, plug, interface, language, battery, compatibility and restrictions." },
  ] },
  { domain: "kameymallindex.com", slug: "review", seoTitle: "KameyMall Product Review | Current Source and QC Evidence", description: "Write a KameyMall product review that separates seller claims, historical QC, current received-item images, measurements and unresolved questions.", eyebrow: "KameyMall evidence review", title: "Use historical QC as context, not as the current received item.", intro: "Older images may reveal useful views, but the current source, selected option and received-item record still need their own checks.", sections: [
    { title: "Current source", description: "Record final destination, seller context, exact option and review date." },
    { title: "Historical context", description: "Identify what older QC images show and whether they match the same product and option." },
    { title: "Current evidence", description: "Use current received-item images and measurements for the actual order record." },
  ] },
  { domain: "kameymallindex.com", slug: "search-ideas", seoTitle: "KameyMall Search Ideas | Move from Category to Exact Query", description: "Refine KameyMall searches from broad category and visual clues to exact product, option and evidence-field queries.", eyebrow: "KameyMall query progression", title: "Use each search to learn the next more precise term.", intro: "Category browsing creates vocabulary; exact queries create traceable product records.", sections: [
    { title: "Orient", description: "Use category and product-family terms to identify common fields and option language." },
    { title: "Refine", description: "Add model, measurement, material, construction or compatibility requirements." },
    { title: "Verify", description: "Open the final source and confirm seller context, intended option and current evidence." },
  ] },
  { domain: "kameymallindex.com", slug: "shipping", seoTitle: "KameyMall Shipping Research | QC, Packaging and Actual Weight", description: "Research KameyMall shipping with confirmed contents, current QC records, packaging choices, actual parcel weight and dimensions, and current routes.", eyebrow: "KameyMall parcel research", title: "Replace product and historical estimates with actual parcel inputs.", intro: "KameyMall publishes preview and parcel workflows; use current packed measurements for route decisions.", sections: [
    { title: "Confirm contents", description: "Match selected items and quantities with current warehouse evidence." },
    { title: "Choose packaging", description: "Record removal, reinforcement, insurance and other choices before final measurement." },
    { title: "Check current route", description: "Use actual package inputs and current destination terms on KameyMall." },
  ] },
  { domain: "kameymallindex.com", slug: "safety", seoTitle: "Is KameyMall Safe and Legit? Source and QC Checklist", description: "Assess KameyMall using current site access, account and payment records, product sources, historical and current QC, support paths and parcel records.", eyebrow: "KameyMall evidence checklist", title: "Use current records and label historical evidence clearly.", intro: "Forum posts, seller claims, historical QC and current order evidence have different dates and responsibilities.", sections: [
    { title: "Platform evidence", description: "Review current access, account controls, payment records, policies and support paths." },
    { title: "Product evidence", description: "Separate seller claims, historical QC context and current received-item evidence." },
    { title: "Parcel evidence", description: "Use exact contents, current route, tracking and destination events." },
  ] },
  { domain: "kameymallindex.com", slug: "faq", seoTitle: "KameyMall Index FAQ | Search, Historical QC and Shipping", description: "Read independent answers about KameyMall spreadsheet categories, historical QC, exact options, parcel previews, shipping inputs and indexing gates.", eyebrow: "KameyMall research questions", title: "Know whether the evidence is current, historical or still missing.", intro: "These answers explain the research boundary without repeating promotional claims as facts.", sections: [], questions: [
    { question: "Can historical QC replace current QC?", answer: "No. It can provide context, but the current source, exact option and received-item record require their own review." },
    { question: "Is this the official KameyMall site?", answer: "No. Use kameymall.com for current account, order, warehouse and shipping services." },
    { question: "Why are some products noindex?", answer: "Automatic, duplicate, stale, incomplete or generic rows stay outside Google until they add reviewed product-specific value." },
  ] },
];

const ONE_TO_ONE_SPREADSHEET_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "1to1spreadsheet.com",
    slug: "categories",
    seoTitle: "1to1 Spreadsheet Categories | Product-Specific Evidence Fields",
    description:
      "Organize 1to1 spreadsheet rows by product type while keeping category-specific measurements, materials, specifications, options and visible evidence fields.",
    eyebrow: "Spreadsheet category field map",
    title: "Change the row fields when the product category changes.",
    intro:
      "Categories organize the research record. Each product type still needs its own current source, exact option and visible evidence checks.",
    sections: [
      { title: "Clothing and footwear", description: "Record size system, measurements, material wording, color and the exact selected option before comparing candidates." },
      { title: "Bags and accessories", description: "Keep dimensions, visible hardware, compartments, included pieces and option identifiers in separate fields." },
      { title: "Electronics", description: "Capture model, voltage, plug, interface, compatibility and any stated restriction without turning specifications into a performance claim." },
    ],
  },
  {
    domain: "1to1spreadsheet.com",
    slug: "spreadsheet-method",
    seoTitle: "1to1 Spreadsheet Method | Build Traceable Product Rows",
    description:
      "Build a 1to1 product research row from a precise query, resolved source, exact option, visible evidence, review date and one open question.",
    eyebrow: "Spreadsheet research method",
    title: "Make each row small enough to verify and useful enough to reopen.",
    intro:
      "A compact record prevents product clues, seller language and later service decisions from blending into one unsupported conclusion.",
    sections: [
      { title: "Start with the query", description: "Save the exact phrase, identifier or image clue that produced the candidate so another reviewer can repeat the search." },
      { title: "Resolve the source", description: "Record the final destination after redirects together with the page date and the selected option shown during review." },
      { title: "End with one open field", description: "State the next unanswered product, image or handoff question instead of filling the cell with an assumption." },
    ],
  },
  {
    domain: "1to1spreadsheet.com",
    slug: "source-fields",
    seoTitle: "1to1 Spreadsheet Source Fields | URL, Option and Review Date",
    description:
      "Choose the minimum 1to1 spreadsheet fields needed to trace a product candidate back to its final URL, exact option and review date.",
    eyebrow: "Source field design",
    title: "Keep fields that survive a changed title or image.",
    intro:
      "A useful source row identifies where the page resolved and which option was reviewed without copying every changing claim into the sheet.",
    sections: [
      { title: "Identity fields", description: "Keep the final domain, item identifier when visible, selected option and review timestamp as separate values." },
      { title: "Evidence fields", description: "Summarize visible image coverage, shown measurements and unresolved inconsistencies without rating hidden qualities." },
      { title: "Change fields", description: "Record redirects, removed pages or changed options as dated events rather than silently replacing the prior row." },
    ],
  },
  {
    domain: "1to1spreadsheet.com",
    slug: "qc-record",
    seoTitle: "1to1 Spreadsheet QC Record | Visible Image Review Fields",
    description:
      "Record visible QC image coverage in a 1to1 spreadsheet without turning photographs into claims about materials, authenticity or durability.",
    eyebrow: "Visible QC record",
    title: "Describe what the image set shows and what it cannot answer.",
    intro:
      "Image review becomes auditable when coverage, consistency and missing views are recorded separately from product or seller claims.",
    sections: [
      { title: "Coverage", description: "List the available angles, labels, measurements and close views, then note any view needed for the next comparison." },
      { title: "Consistency", description: "Check that colors, identifiers and visible details refer to the same option across the image set." },
      { title: "Limits", description: "Keep material composition, long-term wear and seller reliability outside the visible-image field unless supported elsewhere." },
    ],
  },
  {
    domain: "1to1spreadsheet.com",
    slug: "handoff-checklist",
    seoTitle: "1to1 Spreadsheet Handoff Checklist | From Row to External Review",
    description:
      "Use a 1to1 spreadsheet handoff checklist to carry the source, option, evidence and unresolved question into a separately chosen service review.",
    eyebrow: "Research handoff checklist",
    title: "Move the evidence forward without assigning a route inside the row.",
    intro:
      "The spreadsheet organizes product research; account, payment, warehouse, shipping and support terms belong to the current external service source.",
    sections: [
      { title: "Complete the product row", description: "Confirm that the source resolves, the option is identifiable and the image notes match the reviewed candidate." },
      { title: "Name the service question", description: "Write the exact account, purchase, inspection or parcel question that the next service must answer." },
      { title: "Preserve the boundary", description: "Do not convert catalog prices, estimated weights or community comments into final transaction terms." },
    ],
  },
  {
    domain: "1to1spreadsheet.com",
    slug: "faq",
    seoTitle: "1to1 Spreadsheet FAQ | Sources, QC Rows and Research Limits",
    description:
      "Read independent answers about 1to1 spreadsheet source fields, visible QC notes, review dates and external service handoffs.",
    eyebrow: "Spreadsheet research questions",
    title: "Keep the sheet useful without making it responsible for the transaction.",
    intro:
      "These answers explain the evidence boundary for a compact product research ledger.",
    sections: [],
    questions: [
      { question: "Is 1to1spreadsheet.com a store or buying agent?", answer: "No. It is an independent product research ledger and does not sell products, accept payments or operate a purchasing service." },
      { question: "Does a completed row verify a product?", answer: "No. It records the reviewed source, option and visible evidence for a date while leaving unresolved fields open." },
      { question: "Why save the final URL?", answer: "Short links and redirects can hide the current destination. The final URL makes later source review easier to repeat." },
    ],
  },
];

const ONE_TO_ONE_FINDS_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "1to1finds.com",
    slug: "categories",
    seoTitle: "1to1 Finds Categories | Refine Product Discovery by Type",
    description:
      "Browse 1to1 finds categories with product-specific search terms, option fields, measurements, specifications and visible evidence questions.",
    eyebrow: "Product discovery categories",
    title: "Let the product type define the search and the next check.",
    intro:
      "A useful category narrows discovery while making the evidence needed for a reviewable candidate explicit.",
    sections: [
      { title: "Apparel and footwear", description: "Combine product type with size system, measurements, construction, color and the exact option shown at the source." },
      { title: "Bags and accessories", description: "Search with dimensions, visible hardware, closure, compartments and identifiers that can be checked on the final page." },
      { title: "Electronics", description: "Use model, interface, voltage, plug and compatibility language, then retain the source that exposes those fields clearly." },
    ],
  },
  {
    domain: "1to1finds.com",
    slug: "finds-method",
    seoTitle: "1to1 Finds Method | From Product Clue to Reviewable Source",
    description:
      "Turn a 1to1 product clue into a focused query, resolved source, exact option and next evidence question before retaining the find.",
    eyebrow: "Product discovery method",
    title: "Use discovery to create a better source question.",
    intro:
      "A model nickname, partial identifier or image clue is a starting point. The retained find should end at a source that another reviewer can reopen.",
    sections: [
      { title: "Decode the clue", description: "Separate product type, model term, color detail and any item identifier before building the first query." },
      { title: "Reduce the candidates", description: "Remove results whose final destination, option or visible images do not match the original research intent." },
      { title: "Retain one reason", description: "Keep a candidate only when you can state which source field or image question it helps answer next." },
    ],
  },
  {
    domain: "1to1finds.com",
    slug: "search-vocabulary",
    seoTitle: "1to1 Finds Search Vocabulary | Build More Precise Queries",
    description:
      "Build 1to1 finds queries from product type, model language, visible detail, exact option and source identifier instead of broad promotional terms.",
    eyebrow: "Search vocabulary",
    title: "Choose words that narrow both the product and the later check.",
    intro:
      "Precise vocabulary reduces unrelated results and makes it clearer which visible field should confirm a match.",
    sections: [
      { title: "Product structure", description: "Start with the category and model family, then add the construction, color or size clue visible in the source material." },
      { title: "Option language", description: "Use the exact option label when known and keep seller shorthand separate from the normalized research term." },
      { title: "Identifier language", description: "Add item IDs or final domains only when they can be copied accurately and reviewed at the destination." },
    ],
  },
  {
    domain: "1to1finds.com",
    slug: "source-check",
    seoTitle: "1to1 Finds Source Check | Resolve Links Before Shortlisting",
    description:
      "Check where a 1to1 find resolves, whether the page remains accessible and whether its option and visible evidence match the saved query.",
    eyebrow: "Source resolution check",
    title: "Inspect the destination before trusting the find card.",
    intro:
      "A title or preview image can survive after the destination changes, so the final page must answer the current research question itself.",
    sections: [
      { title: "Follow redirects", description: "Record the final domain and page path, then note login walls, removed items or redirects to a generic catalog." },
      { title: "Match the option", description: "Compare the saved query with the option name, visible color, size or identifier on the destination page." },
      { title: "Date the result", description: "Add the review time because accessibility, price text, images and available options can change independently." },
    ],
  },
  {
    domain: "1to1finds.com",
    slug: "qc-questions",
    seoTitle: "1to1 Finds QC Questions | Review Visible Product Images",
    description:
      "Create focused QC questions for a 1to1 find using missing angles, inconsistent identifiers, option matching and visible measurement evidence.",
    eyebrow: "QC question builder",
    title: "Ask an image question that can produce a clear visible answer.",
    intro:
      "A focused question is more useful than a general quality label because it identifies the exact view or measurement still needed.",
    sections: [
      { title: "Coverage question", description: "Ask for the missing angle, label, measurement or close view required to compare the selected option." },
      { title: "Consistency question", description: "Identify any color, identifier or detail that appears inconsistent across the available image set." },
      { title: "Boundary question", description: "Keep hidden materials, long-term wear, service reliability and delivery outcomes outside a photo-only conclusion." },
    ],
  },
  {
    domain: "1to1finds.com",
    slug: "faq",
    seoTitle: "1to1 Finds FAQ | Discovery, Sources and QC Questions",
    description:
      "Read independent answers about 1to1 product discovery, final source links, option matching, visible QC questions and shortlist limits.",
    eyebrow: "Find review questions",
    title: "Know when a find is ready for the next check.",
    intro:
      "These answers separate product discovery from verification and later transaction decisions.",
    sections: [],
    questions: [
      { question: "Is 1to1finds.com a seller or agent?", answer: "No. It is an independent discovery and source-review guide and does not sell products or provide purchasing services." },
      { question: "Does a matching image confirm the exact product?", answer: "No. It can support a visual comparison, but the current source, selected option and other evidence still need review." },
      { question: "When should a find enter the shortlist?", answer: "Keep it when the final source resolves, the option can be identified and the find answers a specific next research question." },
    ],
  },
];

const ONE_TO_ONE_FINDS_CLOUD_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "1to1finds.cloud",
    slug: "categories",
    seoTitle: "1to1 Finds Cloud Categories | Organize Dated Product Evidence",
    description:
      "Organize a dated 1to1 finds archive by product category while preserving category-specific measurements, specifications, options and image evidence.",
    eyebrow: "Archived category evidence",
    title: "Archive different evidence fields for different product types.",
    intro:
      "The category makes an archived record easier to retrieve, while the source, option, images and review date remain responsible for the evidence.",
    sections: [
      { title: "Wearable products", description: "Archive size system, measurements, material wording, color, selected option and the image views available on the review date." },
      { title: "Carry goods", description: "Preserve dimensions, visible hardware, closure, compartments, included pieces and any unresolved construction question." },
      { title: "Electronics", description: "Save model, voltage, plug, interface and compatibility fields together with the dated source that displayed them." },
    ],
  },
  {
    domain: "1to1finds.cloud",
    slug: "evidence-cloud",
    seoTitle: "1to1 Finds Evidence Cloud | Build a Dated Product Archive",
    description:
      "Build a dated 1to1 finds archive that keeps final links, option identity, visible image evidence and unresolved questions in one record.",
    eyebrow: "Dated evidence archive",
    title: "Archive the review context, not just the product preview.",
    intro:
      "A durable record explains which destination, option and image set were reviewed, even after the live page changes.",
    sections: [
      { title: "Anchor the record", description: "Save the final URL, page identifier, selected option and review timestamp before adding interpretation." },
      { title: "Attach visible evidence", description: "Describe the image set, shown measurements and missing views without copying unsupported seller claims." },
      { title: "Mark the next refresh", description: "State which link, option or evidence field must be reopened before the record supports another decision." },
    ],
  },
  {
    domain: "1to1finds.cloud",
    slug: "link-ledger",
    seoTitle: "1to1 Finds Link Ledger | Track Redirects and Source Changes",
    description:
      "Track 1to1 finds redirects, final domains, removed pages, generic fallbacks and option changes as dated source events.",
    eyebrow: "Link change ledger",
    title: "Treat every destination change as a new evidence event.",
    intro:
      "Replacing an old URL without a note hides the reason a prior review no longer matches the live source.",
    sections: [
      { title: "Record the path", description: "Keep the submitted link, final destination and date so redirect behavior can be compared later." },
      { title: "Classify the result", description: "Distinguish an accessible item page, login wall, removed page, generic catalog or unrelated destination." },
      { title: "Preserve the prior state", description: "Add a dated update instead of overwriting the earlier destination and making the archive impossible to audit." },
    ],
  },
  {
    domain: "1to1finds.cloud",
    slug: "image-review",
    seoTitle: "1to1 Finds Image Review Archive | Coverage and Consistency",
    description:
      "Archive 1to1 finds image coverage, visible identifiers, measurements, inconsistencies and missing views without rating hidden product qualities.",
    eyebrow: "Image evidence archive",
    title: "Preserve what the reviewed image set could and could not show.",
    intro:
      "An image archive remains useful when its coverage and limits are explicit rather than summarized as a permanent quality judgment.",
    sections: [
      { title: "Coverage snapshot", description: "List the angles, labels, measurements and detail views available on the recorded review date." },
      { title: "Consistency snapshot", description: "Note whether colors, identifiers and visible construction details align across the image set." },
      { title: "Missing-evidence snapshot", description: "Identify the view or field that would be required before the next comparison can proceed." },
    ],
  },
  {
    domain: "1to1finds.cloud",
    slug: "decision-handoff",
    seoTitle: "1to1 Finds Decision Handoff | Refresh Archived Evidence First",
    description:
      "Refresh a 1to1 finds archive before handing a product candidate to an external account, purchase, warehouse or parcel workflow.",
    eyebrow: "Archive-to-decision handoff",
    title: "Reopen the live source before an archived record affects a new action.",
    intro:
      "The archive explains prior research. Current availability, options, service terms and transaction records belong to the live sources used today.",
    sections: [
      { title: "Refresh the product source", description: "Confirm that the destination, option and visible evidence still match the archived candidate." },
      { title: "Name the next system", description: "Identify the external service responsible for the account, purchase, warehouse, shipping or support question." },
      { title: "Keep records separate", description: "Do not merge an archived product observation with a later fee, parcel estimate, tracking event or delivery outcome." },
    ],
  },
  {
    domain: "1to1finds.cloud",
    slug: "faq",
    seoTitle: "1to1 Finds Cloud FAQ | Archived Links, Images and Refreshes",
    description:
      "Read independent answers about archived 1to1 links, dated image reviews, source changes, refresh checks and external decision handoffs.",
    eyebrow: "Evidence archive questions",
    title: "Use the archive as history, then verify the present.",
    intro:
      "These answers explain why dated evidence must be refreshed before a new product or service decision.",
    sections: [],
    questions: [
      { question: "Does 1to1finds.cloud store products or orders?", answer: "No. It is an independent research archive and does not sell products, accept payments, hold inventory or operate order services." },
      { question: "Is an archived link still current?", answer: "Not automatically. Reopen the destination and compare its option, images and date before relying on the archived record." },
      { question: "Why keep old source events?", answer: "A dated history shows when redirects, removals or option changes occurred and prevents a later page from rewriting the earlier review." },
    ],
  },
];

const YDA_PARCEL_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "ydaexpress.net",
    slug: "parcel-brief",
    seoTitle: "YDA Express Parcel Brief | Contents, Size and Destination",
    description:
      "Prepare a YDA Express parcel forwarding brief with destination, contents, quantity, warehouse measurements, packaging choice, restrictions and unresolved questions.",
    eyebrow: "Parcel preparation record",
    title: "Write the parcel facts before opening a shipping comparison.",
    intro:
      "A useful brief separates received-item evidence from planned packaging and current route terms, so estimates are not mistaken for final shipment facts.",
    sections: [
      { title: "Identify the contents", description: "List each item, quantity, visible condition and any batteries, liquids, fragile parts, branded goods or other route-sensitive characteristics." },
      { title: "Record measured inputs", description: "Use current warehouse weight and dimensions when available; mark seller estimates and unmeasured fields as provisional." },
      { title: "State the destination question", description: "Add destination, delivery priority and the exact restriction, quote or carrier question that still requires a current answer." },
    ],
  },
  {
    domain: "ydaexpress.net",
    slug: "warehouse-checklist",
    seoTitle: "YDA Express Warehouse Checklist | Receiving and Parcel Evidence",
    description:
      "Use a YDA Express warehouse checklist to separate seller-source details, received quantity, visible inspection evidence, measurements and packing requests.",
    eyebrow: "Warehouse evidence checklist",
    title: "Confirm what arrived before deciding how it should leave.",
    intro:
      "The seller listing describes the requested item; the warehouse record describes what was received and visible at a later stage.",
    sections: [
      { title: "Match the received item", description: "Compare quantity, selected option and visible identifiers with the saved seller source without treating photographs as proof of hidden qualities." },
      { title: "Separate observation from request", description: "Record visible condition and measurements separately from requests for removal, reinforcement, repacking or special handling." },
      { title: "Preserve open questions", description: "Keep unclear option matches, missing measurements and route-sensitive contents visible for support or policy confirmation." },
    ],
  },
  {
    domain: "ydaexpress.net",
    slug: "consolidation-planner",
    seoTitle: "YDA Express Consolidation Planner | Packaging and Parcel Inputs",
    description:
      "Plan YDA Express warehouse consolidation by item compatibility, packaging requests, fragile contents, measured inputs and the destination route question.",
    eyebrow: "Consolidation planning",
    title: "Combine items only after their handling needs are visible.",
    intro:
      "Consolidation can change dimensions, protection and route suitability, so the plan should preserve both item-level needs and later parcel measurements.",
    sections: [
      { title: "Group compatible contents", description: "Identify items that can share packaging and isolate fragile, compressible, liquid, battery-powered or shape-sensitive contents for review." },
      { title: "Describe the packing request", description: "State what may be removed, folded, reinforced or retained instead of assuming a warehouse will infer the preferred method." },
      { title: "Recheck after packing", description: "Use the resulting parcel weight, dimensions and contents; do not use the pre-consolidation estimate for the next route comparison." },
    ],
  },
  {
    domain: "ydaexpress.net",
    slug: "tracking-handoff",
    seoTitle: "YDA Express Tracking Handoff | Warehouse to Carrier Record",
    description:
      "Keep YDA Express warehouse dispatch, carrier acceptance, tracking events, customs updates and final delivery evidence as separate dated stages.",
    eyebrow: "Tracking handoff record",
    title: "A tracking number starts a new evidence stage.",
    intro:
      "Warehouse dispatch and carrier tracking are related but not identical records; preserve the time and source for each event.",
    sections: [
      { title: "Save the dispatch record", description: "Record parcel identifier, selected route, packed measurements and the warehouse dispatch timestamp." },
      { title: "Confirm carrier acceptance", description: "Treat label creation and physical carrier acceptance as different events when the tracking source distinguishes them." },
      { title: "Escalate with a timeline", description: "When an event appears delayed or inconsistent, provide the parcel identifier, last dated scan and source rather than an unsupported delivery conclusion." },
    ],
  },
  {
    domain: "ydaexpress.net",
    slug: "faq",
    seoTitle: "YDA Express Parcel Guide FAQ | Warehouse and Forwarding Checks",
    description:
      "Read independent answers about YDA Express parcel forwarding research, warehouse evidence, consolidation, route estimates, tracking and Google indexing review.",
    eyebrow: "Parcel preparation questions",
    title: "Know where preparation ends and current service confirmation begins.",
    intro:
      "These answers explain the independent parcel-research method without making carrier, price or delivery promises.",
    sections: [],
    questions: [
      { question: "Is ydaexpress.net the official YDA Express website?", answer: "No. This is an independent parcel preparation guide. Use ydaexpress.com for current accounts, service availability, quotes, restrictions and tracking tools." },
      { question: "Does a warehouse estimate determine the final shipping price?", answer: "No. Packaging, measured dimensions, route rules and current service terms can change the usable quote inputs." },
      { question: "Why are automatic parcel or product pages excluded from Google?", answer: "Unreviewed, duplicate, incomplete or generic pages stay noindex until they provide distinct evidence-led value and pass editorial review." },
    ],
  },
];

const YDA_SOURCE_REVIEW_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "ydaexpress.org",
    slug: "service-map",
    seoTitle: "YDA Express Service Map | Shopping, Warehouse and Forwarding",
    description:
      "Map YDA Express shopping assistance, warehouse receiving, consolidation, parcel forwarding and tracking into separate evidence stages.",
    eyebrow: "Service evidence map",
    title: "Assign each claim to the service stage that can support it.",
    intro:
      "The official site describes shopping-agent and parcel-forwarding functions, but product, warehouse, parcel and carrier facts come from different records.",
    sections: [
      { title: "Shopping assistance", description: "Use the seller source and submitted order fields for the requested product, option, quantity and price context." },
      { title: "Warehouse handling", description: "Use receiving, inspection, storage, consolidation and measured parcel records for later physical-handling questions." },
      { title: "Forwarding and tracking", description: "Use the current quote inputs, selected route and carrier events for shipment research rather than the original product listing." },
    ],
  },
  {
    domain: "ydaexpress.org",
    slug: "terms-checklist",
    seoTitle: "YDA Express Terms Checklist | Date, Scope and Restrictions",
    description:
      "Review YDA Express terms by source URL, date, service scope, user responsibility, prohibited contents, fees, changes and unresolved destination questions.",
    eyebrow: "Terms review checklist",
    title: "Read the operative scope instead of extracting one attractive sentence.",
    intro:
      "A terms page can define responsibilities and limits while current prices, route availability and carrier restrictions live elsewhere.",
    sections: [
      { title: "Preserve the source and date", description: "Save the official URL and review date so later changes can be distinguished from the evidence used in the decision." },
      { title: "Match the applicable service", description: "Separate shopping, warehouse, forwarding, payment, refund, customs and carrier provisions instead of applying one clause to every stage." },
      { title: "Mark the unresolved detail", description: "Use current support or route documentation for questions the general terms do not answer for the exact parcel and destination." },
    ],
  },
  {
    domain: "ydaexpress.org",
    slug: "shopping-agent-vs-forwarding",
    seoTitle: "YDA Express Shopping Agent vs Parcel Forwarding | Evidence Guide",
    description:
      "Compare YDA Express shopping-agent and parcel-forwarding research by who purchases, which address receives, what warehouse evidence exists and where route terms begin.",
    eyebrow: "Service-scope comparison",
    title: "Determine which workflow you are researching before comparing details.",
    intro:
      "Shopping assistance and forwarding may share a warehouse but begin with different purchase responsibilities and source records.",
    sections: [
      { title: "Who places the purchase", description: "Record whether an assisted order is submitted through the service or an external purchase is sent to a provided warehouse address." },
      { title: "Which records follow", description: "Keep order confirmation, domestic delivery, warehouse receiving, inspection and parcel records attached to the relevant workflow." },
      { title: "Where the workflows converge", description: "Consolidation, measured parcel inputs, route selection and tracking require current shipment evidence regardless of the purchase path." },
    ],
  },
  {
    domain: "ydaexpress.org",
    slug: "quote-evidence",
    seoTitle: "YDA Express Shipping Quote Evidence | Inputs and Limitations",
    description:
      "Review a YDA Express shipping quote using destination, packed weight, dimensions, contents, route, currency, date and exclusions without presenting it as a guaranteed total.",
    eyebrow: "Quote evidence review",
    title: "A quote is reproducible only when its inputs and date are preserved.",
    intro:
      "The same parcel can produce different results when dimensions, contents, destination, service, packaging or current rules change.",
    sections: [
      { title: "Record every input", description: "Save destination, weight, dimensions, contents, selected route, currency and quote timestamp instead of retaining only the displayed amount." },
      { title: "Separate included and excluded costs", description: "Check whether handling, packaging, insurance, customs, remote-area or destination charges are outside the displayed estimate." },
      { title: "Reopen before payment", description: "Use current official quote and checkout information for the transaction; the archive shows a method, not a live price promise." },
    ],
  },
  {
    domain: "ydaexpress.org",
    slug: "faq",
    seoTitle: "YDA Express Service Review FAQ | Official Sources and Terms",
    description:
      "Read independent answers about YDA Express official sources, shopping assistance, forwarding, terms, quotes, tracking and the editorial indexing gate.",
    eyebrow: "Source review questions",
    title: "Know what this archive can verify and what must be reopened.",
    intro:
      "These answers define the independent research boundary and the evidence needed before a page may enter Google.",
    sections: [],
    questions: [
      { question: "Is ydaexpress.org operated by YDA Express?", answer: "No. It is an independent source-review archive. The official service website used for current checks is ydaexpress.com." },
      { question: "Does this archive confirm a current price or route?", answer: "No. It records which inputs and sources to review. Current availability, prices, restrictions and carrier terms must be reopened on the official service or relevant carrier source." },
      { question: "What pages are allowed into Google?", answer: "Only distinct, reviewed English pages with a clear purpose, current source boundary and original evidence-led value. Collected, duplicate or incomplete pages remain noindex." },
    ],
  },
];

const YOYBUY_INDEX_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "yoybuyindex.com",
    slug: "spreadsheet",
    seoTitle: "YoyBuy Spreadsheet Guide | Build a Source-First Product Row",
    description: "Build a YoyBuy spreadsheet row with the current source, seller context, exact option, review date, QC questions and unresolved fields.",
    eyebrow: "YoyBuy spreadsheet method",
    title: "Make every row reopenable before making it comparable.",
    intro: "A title and image are not enough. Preserve the destination, intended option, known fields and missing answers so another researcher can repeat the check.",
    sections: [
      { title: "Preserve the source", description: "Save the final marketplace URL, seller context, visible title and review date before the listing changes." },
      { title: "Record the intended option", description: "Keep size, color, model, quantity and other requested attributes beside the source instead of relying on a thumbnail." },
      { title: "Label open questions", description: "Mark missing measurements, compatibility, materials, packaging and restrictions as unknown until a current source answers them." },
    ],
  },
  {
    domain: "yoybuyindex.com",
    slug: "categories",
    seoTitle: "YoyBuy Spreadsheet Categories | Product-Specific Research Fields",
    description: "Organize YoyBuy spreadsheet categories with distinct measurement, construction, specification, compatibility and restriction fields.",
    eyebrow: "YoyBuy category field map",
    title: "Let the product type decide which evidence belongs in the row.",
    intro: "Generic descriptions create generic pages. Category-specific fields make each product record useful and easier to review.",
    sections: [
      { title: "Clothing and footwear", description: "Record labeled size, actual measurements, materials, construction and the requested variation." },
      { title: "Bags and homewares", description: "Record dimensions, materials, closures, hardware, compartments and included pieces." },
      { title: "Electronics", description: "Record model, voltage, plug, interface, language, battery, compatibility and destination restrictions." },
    ],
  },
  {
    domain: "yoybuyindex.com",
    slug: "qc-checklist",
    seoTitle: "YoyBuy QC Checklist | Compare Request, Source and Received Item",
    description: "Use a YoyBuy QC checklist to compare the saved source and requested option with visible received-item evidence without overstating what photos prove.",
    eyebrow: "YoyBuy QC comparison",
    title: "Ask whether the received item matches the saved request.",
    intro: "QC images can document visible condition, labels, measurements and included pieces. They do not automatically verify every seller claim.",
    sections: [
      { title: "Requested record", description: "Keep the source URL, selected option, quantity and any seller-confirmed fields available for comparison." },
      { title: "Visible warehouse evidence", description: "Check the views supplied, visible condition, labels, color, measurements, accessories and packaging." },
      { title: "Unresolved claims", description: "Leave identity, internal materials, performance and other non-visible claims unresolved unless stronger evidence supports them." },
    ],
  },
  {
    domain: "yoybuyindex.com",
    slug: "search-ideas",
    seoTitle: "YoyBuy Search Ideas | Refine Taobao and 1688 Product Queries",
    description: "Refine YoyBuy search ideas from broad Taobao or 1688 product terms to model, material, measurement, option and compatibility constraints.",
    eyebrow: "YoyBuy query progression",
    title: "Use each query to remove ambiguity from the next source check.",
    intro: "Search is discovery, not verification. Move from a broad product family to a source and option that can be reviewed directly.",
    sections: [
      { title: "Start with the product family", description: "Use the marketplace, category and common product name to learn the available vocabulary." },
      { title: "Add one useful constraint", description: "Refine with a model, measurement, material, construction detail, color or compatibility requirement." },
      { title: "Finish at the source", description: "Open the final listing and confirm seller context, exact option, visible fields and current availability." },
    ],
  },
  {
    domain: "yoybuyindex.com",
    slug: "shipping",
    seoTitle: "YoyBuy Shipping Research | Actual Weight, Packaging and Routes",
    description: "Research YoyBuy shipping with confirmed warehouse contents, packaging choices, actual packed weight and dimensions, and current destination route terms.",
    eyebrow: "YoyBuy parcel research",
    title: "Replace listing estimates with the final parcel record.",
    intro: "Product payment, domestic delivery, warehouse handling and international shipping use different inputs and should remain separate in the research record.",
    sections: [
      { title: "Confirm warehouse contents", description: "Match received items, quantities and current QC evidence with the saved order request." },
      { title: "Record packaging choices", description: "Note removals, reinforcement, consolidation and other decisions before final measurement." },
      { title: "Check current destination terms", description: "Use actual packed weight and dimensions with the routes, restrictions and fees shown for the destination at that time." },
    ],
  },
  {
    domain: "yoybuyindex.com",
    slug: "safety",
    seoTitle: "Is YoyBuy Safe and Legit? A Current Evidence Checklist",
    description: "Assess YoyBuy with current domain access, account and payment records, third-party product sources, warehouse evidence, support paths and parcel events.",
    eyebrow: "YoyBuy evidence checklist",
    title: "Review the current transaction path instead of relying on one label.",
    intro: "The seller, assisted-purchase service, warehouse and carrier have different responsibilities. Keep the supporting records for each stage.",
    sections: [
      { title: "Platform and account", description: "Confirm the current domain, account controls, payment record, policies and support route." },
      { title: "Product and warehouse", description: "Separate third-party seller claims, the requested option and visible received-item evidence." },
      { title: "Parcel and destination", description: "Record the exact contents, selected route, tracking, customs and delivery events for the shipment." },
    ],
  },
  {
    domain: "yoybuyindex.com",
    slug: "faq",
    seoTitle: "YoyBuy Spreadsheet FAQ | Sources, QC and Shipping Records",
    description: "Read independent answers about YoyBuy spreadsheet rows, marketplace sources, exact options, QC limits, actual parcel inputs and indexing review.",
    eyebrow: "YoyBuy research questions",
    title: "Keep every answer attached to its evidence stage.",
    intro: "These answers explain how the independent index is reviewed without turning changing service terms into permanent promises.",
    sections: [],
    questions: [
      { question: "Is this the official YoyBuy website?", answer: "No. Use yoybuy.com for current accounts, orders, warehouse services and shipping terms." },
      { question: "Does a spreadsheet row verify a product?", answer: "No. It preserves a candidate source and the fields that still need current product-specific review." },
      { question: "Why are collected product pages excluded from Google?", answer: "Automatic, duplicate, incomplete or generic pages stay noindex until they receive distinct reviewed value and traceable evidence." },
    ],
  },
];

const TENANT_CATEGORY_FRONT_PAGES: readonly TenantResearchPage[] = [
  {
    domain: "acbuyindex.com", slug: "categories", seoTitle: "ACBuy Index Categories | Product Research Fields by Type", description: "Browse ACBuy-linked categories with product-specific measurements, option fields, specifications and source evidence for a focused shortlist.", eyebrow: "ACBuy category front", title: "Change the evidence checklist when the product type changes.", intro: "The shared catalog supplies candidates while this category front defines the fields that make each result reviewable.", sections: [
      { title: "Apparel and footwear", description: "Compare size systems, measurements, materials, colors and the exact option shown on the current source." },
      { title: "Bags and accessories", description: "Record dimensions, visible hardware, closures, compartments and included pieces before shortlisting." },
      { title: "Electronics", description: "Check model, voltage, plug, interface and compatibility fields without assuming performance from a category label." },
    ],
  },
  {
    domain: "bbdbuyeus.com", slug: "categories", seoTitle: "BBDbuy US Categories | Product Evidence Before Parcel Planning", description: "Browse BBDbuy-linked categories and separate product-specific evidence from later warehouse measurements, US route rules and parcel costs.", eyebrow: "US product category front", title: "Choose the product fields before planning the US parcel.", intro: "A category can organize the shortlist, but warehouse dimensions and route terms belong to later records.", sections: [
      { title: "Clothing and shoes", description: "Preserve sizing, measurements, material wording and the selected option before any parcel estimate." },
      { title: "Bags and accessories", description: "Compare dimensions, visible hardware and included pieces while keeping packaging assumptions open." },
      { title: "Electronics", description: "Record model, plug, voltage and compatibility, then check restrictions against the current route separately." },
    ],
  },
  {
    domain: "boonbuyindex.com", slug: "categories", seoTitle: "BoonBuy Index Categories | Query and Source Fields by Product", description: "Organize BoonBuy-linked results by product category while retaining the query, final source, exact option and unresolved evidence field.", eyebrow: "BoonBuy category index", title: "Use the category to structure the row, not replace the source.", intro: "Every category needs a different comparison field set even though candidates come from the same shared catalog.", sections: [
      { title: "Wearable products", description: "Index size system, measurements, material wording, color and option identity beside the source URL." },
      { title: "Carry goods", description: "Keep dimensions, closure, visible hardware, compartments and included pieces as separate fields." },
      { title: "Electronics", description: "Retain model, interface, voltage, plug and compatibility language with the dated source." },
    ],
  },
  {
    domain: "cnshopperindex.com", slug: "categories", seoTitle: "CNShopper Index Categories | Category-Led Source Checks", description: "Browse CNShopper-linked categories with product-specific comparison fields before handing a selected source to an order or parcel workflow.", eyebrow: "CNShopper category front", title: "Let the category define the source check before the handoff.", intro: "The category front narrows candidates while the exact listing and option remain responsible for product evidence.", sections: [
      { title: "Apparel and footwear", description: "Check sizing, measurements, construction, color and option labels on the resolved listing." },
      { title: "Bags and accessories", description: "Compare dimensions, visible hardware, closure, compartments and included pieces at the source." },
      { title: "Electronics", description: "Match model, voltage, plug, interface and compatibility before beginning an order handoff." },
    ],
  },
  {
    domain: "litbuyproducts.com", slug: "categories", seoTitle: "LitBuy Product Categories | Comparable Fields for Each Group", description: "Browse LitBuy-linked categories using different measurement, material, dimension, specification and compatibility fields for each product group.", eyebrow: "LitBuy category front", title: "Define a comparable field set before opening the product group.", intro: "A category improves discovery only when it tells the reviewer which current source fields must be compared.", sections: [
      { title: "Clothing and footwear", description: "Compare size systems, measurements, material wording, construction and exact variations." },
      { title: "Bags and accessories", description: "Use dimensions, closure, visible hardware, compartments and included pieces as the comparison boundary." },
      { title: "Electronics", description: "Check model, interface, voltage, plug and compatibility on each current source." },
    ],
  },
  {
    domain: "parcelupindex.com", slug: "categories", seoTitle: "Parcel Up Categories | Product Evidence Before the Taobao Order", description: "Browse Parcel Up product categories while preserving category-specific source fields before the first payment, warehouse QC and parcel stages.", eyebrow: "Parcel Up category front", title: "Start the order record with the fields the product type requires.", intro: "The product category belongs to the source record; warehouse evidence and the measured parcel are later stages.", sections: [
      { title: "Apparel and shoes", description: "Save size system, measurements, material wording, color and the selected Taobao option before ordering." },
      { title: "Bags and accessories", description: "Record dimensions, visible hardware, closure, compartments and included pieces at the source stage." },
      { title: "Electronics", description: "Keep model, voltage, plug, interface and compatibility fields separate from later route restrictions." },
    ],
  },
  {
    domain: "itaobuyindex.com", slug: "categories", seoTitle: "iTaoBuy Categories | Source-Linked Product Research Archive", description: "Organize iTaoBuy-linked product records by category while preserving exact options, source URLs, measurements, specifications and open evidence fields.", eyebrow: "iTaoBuy category archive", title: "Give every product type its own source-linked evidence fields.", intro: "The category organizes the archive while each current listing remains responsible for the product facts recorded inside it.", sections: [
      { title: "Wearable products", description: "Archive size system, measurements, materials, color, selected option and the source review date." },
      { title: "Carry goods", description: "Preserve dimensions, visible hardware, closure, compartments and unresolved construction questions." },
      { title: "Electronics", description: "Record model, voltage, plug, interface and compatibility beside the current source." },
    ],
  },
  {
    domain: "usfansindex.net", slug: "categories", seoTitle: "USFans Categories | Product-Specific Source Check Fields", description: "Browse USFans-linked categories with product-specific measurements, option details, specifications and visible evidence fields before route comparison.", eyebrow: "USFans category source checks", title: "Use the category to decide which source facts must be checked.", intro: "Shared catalog candidates remain useful only when the exact option and category-specific evidence can be reopened at the source.", sections: [
      { title: "Clothing and footwear", description: "Check size system, measurements, material wording, color and exact option before retaining the candidate." },
      { title: "Bags and accessories", description: "Compare dimensions, visible hardware, closures, compartments and included pieces on the current page." },
      { title: "Electronics", description: "Verify model, voltage, plug, interface and compatibility fields before comparing an external route." },
    ],
  },
];

const TENANT_RESEARCH_PAGES = [
  ...ONE_TO_ONE_FINDS_CLOUD_PAGES,
  ...ONE_TO_ONE_FINDS_PAGES,
  ...ONE_TO_ONE_SPREADSHEET_PAGES,
  ...ACBUY_PAGES,
  ...ALLCHINABUY_INDEX_PAGES,
  ...ALLCHINABUY_FINDER_PAGES,
  ...BBDBUY_EU_FINDS_PAGES,
  ...BBDBUY_US_PAGES,
  ...BBDBUY_EU_SHEET_PAGES,
  ...CSSBUY_ITEMS_PAGES,
  ...CSSBUY_INDEX_PAGES,
  ...CSSBUY_CATALOG_PAGES,
  ...KAKOBUY_INDEX_PAGES,
  ...KAKOBUY_ITEMS_PAGES,
  ...LITBUY_INDEX_PAGES,
  ...LITBUY_ITEMS_PAGES,
  ...LITBUY_PRODUCTS_PAGES,
  ...LOONGBUY_PAGES,
  ...LOVEGOBUY_PAGES,
  ...MULEBUY_INDEX_PAGES,
  ...MULEBUY_ITEMS_PAGES,
  ...OOPBUY_INDEX_PAGES,
  ...ORIENTDIG_INDEX_PAGES,
  ...PARCELUP_INDEX_PAGES,
  ...SUGARGOO_INDEX_PAGES,
  ...SUPERBUY_DEALS_PAGES,
  ...SUPERBUY_INDEX_PAGES,
  ...SUPERBUY_ITEMS_PAGES,
  ...EASTMALLBUY_PAGES,
  ...FISHGOO_PAGES,
  ...BOONBUY_FIND_PAGES,
  ...BOONBUY_INDEX_PAGES,
  ...CNSHOPPER_INDEX_PAGES,
  ...GOATEDBUY_INDEX_PAGES,
  ...GTBUY_INDEX_PAGES,
  ...HIPOBUY_INDEX_PAGES,
  ...HOOBUY_INDEX_PAGES,
  ...JOYABUY_FINDS_PAGES,
  ...JOYAGOO_INDEX_PAGES,
  ...KAMEYMALL_INDEX_PAGES,
  ...YDA_PARCEL_PAGES,
  ...YDA_SOURCE_REVIEW_PAGES,
  ...YOYBUY_INDEX_PAGES,
  ...TENANT_CATEGORY_FRONT_PAGES,
];

export function getTenantResearchPage(
  domain: string,
  slug: string,
): TenantResearchPage | null {
  return (
    TENANT_RESEARCH_PAGES.find(
      (page) => page.domain === domain && page.slug === slug,
    ) || null
  );
}

export function getTenantResearchPaths(domain: string): string[] {
  return TENANT_RESEARCH_PAGES.filter((page) => page.domain === domain).map(
    (page) => `/${page.slug}`,
  );
}

export function getAllTenantResearchPages(): readonly TenantResearchPage[] {
  return TENANT_RESEARCH_PAGES;
}

export function getTenantResearchProfile(
  domain: string,
): TenantResearchProfile | null {
  return TENANT_RESEARCH_PROFILES[domain] || null;
}
