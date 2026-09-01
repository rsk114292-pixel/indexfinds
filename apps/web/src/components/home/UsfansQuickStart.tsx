"use client";

import { ArrowRight, Info, LayoutGrid, Search, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantProvider";

interface TenantDirectoryLink {
  href: string;
  title: string;
  description: string;
  icon: typeof Search;
}

const TENANT_DIRECTORY_LINKS: Record<string, readonly TenantDirectoryLink[]> = {
  "bbdbuyeusheet.com": [
    { href: "/eu-sheet", title: "Create the EU evidence row", description: "Keep source, option, review date and EU-specific product questions in one comparable record.", icon: LayoutGrid },
    { href: "/checklist", title: "Mark incomplete listing fields", description: "Flag missing dimensions, materials, plugs or sizing instead of filling the gaps with assumptions.", icon: Search },
    { href: "/categories", title: "Apply category-specific checks", description: "Use different evidence columns for garments, footwear, electronics and parcel-sensitive items.", icon: Scale },
  ],
  "boonbuyfind.net": [
    { href: "/search-guide", title: "Form a source-finding query", description: "Combine the product type with one useful option, material or model detail before collecting candidates.", icon: Search },
    { href: "/product-checklist", title: "Preserve each candidate source", description: "Record the exact listing, intended variation and unresolved seller details before saving a find.", icon: LayoutGrid },
    { href: "/platform-guide", title: "Keep route terms outside the find", description: "Treat current fees, availability and service rules as a separate destination-site verification.", icon: Scale },
  ],
  "boonbuyindex.com": [
    { href: "/query-method", title: "Define the index query", description: "Write the phrase, exclusions and comparison fields that determine whether a result belongs in the set.", icon: Search },
    { href: "/source-checklist", title: "Audit source continuity", description: "Check that the product record still leads to the expected seller, option and current listing context.", icon: LayoutGrid },
    { href: "/route-boundaries", title: "Separate product and route evidence", description: "Do not infer payment, warehouse or delivery outcomes from an indexed listing row.", icon: Scale },
  ],
  "cnshopperindex.com": [
    { href: "/category-map", title: "Map the CNShopper category fields", description: "Choose the attributes that make products in this category genuinely comparable before searching.", icon: LayoutGrid },
    { href: "/source-checklist", title: "Review the marketplace source", description: "Keep seller identity, exact option and dated source status beside each shortlist entry.", icon: Search },
    { href: "/order-handoff", title: "Document the external handoff", description: "Treat order, payment and warehouse events as later records rather than catalog facts.", icon: Scale },
  ],
  "cssbuycatalog.com": [
    { href: "/spreadsheet", title: "Build a CSSBuy catalog row", description: "Capture source, option, visible price and review date without certifying missing product facts.", icon: LayoutGrid },
    { href: "/forwarding", title: "Separate forwarding requirements", description: "Keep warehouse and parcel questions apart from the product discovery stage.", icon: Scale },
    { href: "/usa", title: "Add US destination checks", description: "Review compatibility, restrictions and measured parcel inputs for the intended destination.", icon: Search },
  ],
  "cssbuyindex.com": [
    { href: "/search-ideas", title: "Design a CSSBuy index query", description: "Use exact product language and exclusions to produce a smaller, reviewable candidate set.", icon: Search },
    { href: "/cssbuy-score", title: "Score visible source evidence", description: "Weight option clarity, source continuity and dated fields while leaving unknowns visible.", icon: Scale },
    { href: "/forwarding", title: "Keep forwarding as a later stage", description: "Wait for warehouse and parcel evidence before comparing international routes.", icon: LayoutGrid },
  ],
  "cssbuyitems.com": [
    { href: "/guide", title: "Open the CSSBuy item record", description: "Begin with the product link, requested variation and the fields visible on the current source.", icon: LayoutGrid },
    { href: "/cssbuy-score", title: "Evaluate item evidence", description: "Score completeness and recency without turning the result into an authenticity or seller claim.", icon: Search },
    { href: "/shipping", title: "Add measured parcel facts later", description: "Use packed weight and dimensions only after the warehouse record provides them.", icon: Scale },
  ],
  "goatedbuyindex.com": [
    { href: "/search-ideas", title: "Write a GoatedBuy search brief", description: "State the product, intended option and exclusion terms before opening the candidate index.", icon: Search },
    { href: "/goatedbuy-score", title: "Score the candidate trail", description: "Compare source clarity, option detail and review date while preserving open questions.", icon: Scale },
    { href: "/shipping", title: "Reserve shipping for measured data", description: "Do not use the listing price or product estimate as a substitute for parcel evidence.", icon: LayoutGrid },
  ],
  "gtbuyindex.com": [
    { href: "/guide", title: "Define the GTBuy research row", description: "Keep query, source, selected option and unresolved fields in a repeatable record.", icon: LayoutGrid },
    { href: "/gtbuy-score", title: "Rate record completeness", description: "Use the score to expose weak evidence, not to certify the seller or product outcome.", icon: Scale },
    { href: "/safety", title: "Track handoff risks", description: "Verify current payment, seller and destination terms at the external source before acting.", icon: Search },
  ],
  "hipobuyindex.com": [
    { href: "/search-ideas", title: "Create a HipoBuy query set", description: "Separate broad discovery language from the exact phrase used to verify a source listing.", icon: Search },
    { href: "/hipobuy-score", title: "Review source evidence depth", description: "Compare option clarity, image context and missing fields without inventing a confidence claim.", icon: Scale },
    { href: "/shipping", title: "Wait for parcel-stage facts", description: "Keep packed dimensions, measured weight and route rules outside the listing record.", icon: LayoutGrid },
  ],
  "hoobuyindex.net": [
    { href: "/guide", title: "Preserve the Hoobuy source trail", description: "Record the listing URL, intended option and review date before continuing to another stage.", icon: LayoutGrid },
    { href: "/hoobuy-score", title: "Expose missing evidence", description: "Use the score to surface incomplete source fields rather than imply product verification.", icon: Search },
    { href: "/safety", title: "Check the live route boundary", description: "Confirm current seller, payment and destination terms separately from the indexed product.", icon: Scale },
  ],
  "itaobuyindex.com": [
    { href: "/site-guide", title: "Read the iTaoBuy archive method", description: "Preserve a dated source record and separate visible evidence from claims that need confirmation.", icon: Search },
    { href: "/products", title: "Search the linked product archive", description: "Use product, brand and category terms to locate a source trail without asserting current stock.", icon: LayoutGrid },
    { href: "/agents", title: "Keep destination routes distinct", description: "Review an external route only after the product source and intended option are clear.", icon: Scale },
  ],
  "kakobuyindex.net": [
    { href: "/search-ideas", title: "Design a Kakobuy index query", description: "Write the product phrase, category cues and exclusions that define a useful candidate set.", icon: Search },
    { href: "/kakobuy-score", title: "Score source completeness", description: "Compare visible fields and review dates while keeping seller and product claims unverified.", icon: Scale },
    { href: "/safety", title: "Record unresolved route checks", description: "Keep current payment, availability and destination questions separate from the index row.", icon: LayoutGrid },
  ],
  "kakobuyitems.com": [
    { href: "/categories", title: "Choose item-specific evidence", description: "Define the option, material, measurements or model fields needed for this category.", icon: LayoutGrid },
    { href: "/kakobuy-score", title: "Review the individual item record", description: "Use dated source details to expose incomplete options without certifying the item.", icon: Search },
    { href: "/shipping", title: "Add warehouse measurements later", description: "Keep actual packed weight and dimensions out of the source-listing estimate.", icon: Scale },
  ],
  "litbuyindex.com": [
    { href: "/search-ideas", title: "Form a LitBuy index query", description: "Use one precise product phrase and the comparison fields that matter for the intended item.", icon: Search },
    { href: "/guide", title: "Preserve the listing evidence", description: "Record the live source, option and review date before treating a result as a candidate.", icon: LayoutGrid },
    { href: "/shipping", title: "Separate parcel-stage research", description: "Wait for warehouse measurements before comparing a shipping route or final cost.", icon: Scale },
  ],
  "litbuyitems.com": [
    { href: "/guide", title: "Define the LitBuy item file", description: "Keep exact source, requested variation and unresolved product details together.", icon: LayoutGrid },
    { href: "/safety", title: "Review source and seller unknowns", description: "Do not convert a linked item into a claim about stock, authenticity or future condition.", icon: Search },
    { href: "/shipping", title: "Use measured parcel evidence", description: "Compare routes only after packed weight and dimensions are available.", icon: Scale },
  ],
  "litbuyproducts.com": [
    { href: "/spreadsheet", title: "Compare LitBuy product rows", description: "Normalize source, option and date fields so duplicates and missing evidence remain visible.", icon: LayoutGrid },
    { href: "/guide", title: "Verify the product source", description: "Return to the current listing before relying on price, variation or seller details.", icon: Search },
    { href: "/shipping", title: "Keep product and parcel costs apart", description: "Do not mix the displayed item price with later warehouse and route inputs.", icon: Scale },
  ],
  "loongbuys.net": [
    { href: "/guide", title: "Start a LoongBuy source record", description: "Capture the current listing, selected option and fields that still need verification.", icon: LayoutGrid },
    { href: "/reviews", title: "Use historical examples carefully", description: "Treat older review or QC evidence as context, never as proof of a new order outcome.", icon: Search },
    { href: "/safety", title: "Keep route questions explicit", description: "Check current seller, payment and destination terms at the source before a handoff.", icon: Scale },
  ],
  "lovegobuyindex.com": [
    { href: "/lovegobuy-spreadsheet", title: "Build the LoveGoBuy source sheet", description: "Record product URL, intended option, review date and unanswered listing questions.", icon: LayoutGrid },
    { href: "/is-lovegobuy-legit", title: "Separate public evidence from claims", description: "Review dated business and platform signals without turning them into a guarantee.", icon: Search },
    { href: "/refund-lovegobuy-order", title: "Check current policy wording", description: "Use the live destination terms for refund eligibility rather than an archived summary.", icon: Scale },
  ],
  "mulebuyindex.net": [
    { href: "/search-ideas", title: "Write a MuleBuy search plan", description: "Define product terms, exclusions and category fields before collecting index candidates.", icon: Search },
    { href: "/mulebuy-spreadsheet", title: "Deduplicate the source rows", description: "Keep distinct options and dates while merging records that resolve to the same listing.", icon: LayoutGrid },
    { href: "/buyer-safety", title: "Retain unresolved buying questions", description: "Do not let ranking or popularity replace current seller, payment and source checks.", icon: Scale },
  ],
  "mulebuyitems.com": [
    { href: "/categories", title: "Define MuleBuy item fields", description: "Choose category-specific option, measurement and material evidence before comparison.", icon: LayoutGrid },
    { href: "/spreadsheet-checklist", title: "Audit the requested variation", description: "Keep the selected option and missing source fields visible in the item record.", icon: Search },
    { href: "/shipping-weight-guide", title: "Replace estimates with measurements", description: "Use packed weight and dimensions only when warehouse evidence provides them.", icon: Scale },
  ],
  "oopbuyindex.net": [
    { href: "/guide", title: "Define the Oopbuy index record", description: "Preserve query, source, intended option and review date as separate comparable fields.", icon: LayoutGrid },
    { href: "/oopbuy-score", title: "Score evidence, not outcomes", description: "Use completeness and source continuity without certifying a seller or product condition.", icon: Search },
    { href: "/shipping", title: "Add parcel facts after packing", description: "Keep route cost research dependent on actual weight, dimensions and current restrictions.", icon: Scale },
  ],
  "ydaexpress.net": [
    { href: "/parcel-brief", title: "Create the parcel brief", description: "List the item count, declared handling needs and evidence required before consolidation.", icon: LayoutGrid },
    { href: "/warehouse-checklist", title: "Verify the warehouse handoff", description: "Record received-item status and unresolved discrepancies before a parcel is combined.", icon: Search },
    { href: "/consolidation-planner", title: "Plan from measured inputs", description: "Use actual weights and dimensions while keeping route quotations separately dated.", icon: Scale },
  ],
  "ydaexpress.org": [
    { href: "/service-map", title: "Map the forwarding stages", description: "Separate seller purchase, warehouse receipt, consolidation and carrier handoff records.", icon: LayoutGrid },
    { href: "/terms-checklist", title: "Check current service terms", description: "Verify prohibited items, fees and claim windows at the dated official source.", icon: Search },
    { href: "/quote-evidence", title: "Preserve quote assumptions", description: "Keep currency, weight, dimensions, route and expiry beside every forwarding estimate.", icon: Scale },
  ],
};

const TENANT_SECONDARY_CTAS: Record<string, { href: string; label: string }> = {
  "bbdbuyeusheet.com": { href: "/checklist", label: "Review the EU sheet fields" },
  "boonbuyfind.net": { href: "/product-checklist", label: "Test a discovery candidate" },
  "boonbuyindex.com": { href: "/source-checklist", label: "Audit the source record" },
  "cnshopperindex.com": { href: "/order-handoff", label: "Review the external handoff" },
  "cssbuycatalog.com": { href: "/forwarding", label: "Separate forwarding inputs" },
  "cssbuyindex.com": { href: "/cssbuy-score", label: "Open the CSSBuy evidence score" },
  "cssbuyitems.com": { href: "/shipping", label: "Review parcel-stage fields" },
  "goatedbuyindex.com": { href: "/goatedbuy-score", label: "Open the GoatedBuy score" },
  "gtbuyindex.com": { href: "/gtbuy-score", label: "Review GTBuy record depth" },
  "hipobuyindex.com": { href: "/hipobuy-score", label: "Review HipoBuy source depth" },
  "hoobuyindex.net": { href: "/hoobuy-score", label: "Expose missing Hoobuy fields" },
  "itaobuyindex.com": { href: "/site-guide", label: "Read the archive method" },
  "kakobuyindex.net": { href: "/kakobuy-score", label: "Review the Kakobuy score" },
  "kakobuyitems.com": { href: "/shipping", label: "Open warehouse measurement notes" },
  "litbuyindex.com": { href: "/search-ideas", label: "Design the LitBuy query" },
  "litbuyitems.com": { href: "/safety", label: "Review item unknowns" },
  "litbuyproducts.com": { href: "/spreadsheet", label: "Compare product rows" },
  "loongbuys.net": { href: "/reviews", label: "Read historical evidence carefully" },
  "lovegobuyindex.com": { href: "/is-lovegobuy-legit", label: "Review dated platform evidence" },
  "mulebuyindex.net": { href: "/mulebuy-spreadsheet", label: "Open the source sheet" },
  "mulebuyitems.com": { href: "/spreadsheet-checklist", label: "Audit the requested option" },
  "oopbuyindex.net": { href: "/oopbuy-score", label: "Review the Oopbuy score" },
  "ydaexpress.net": { href: "/warehouse-checklist", label: "Check the warehouse handoff" },
  "ydaexpress.org": { href: "/terms-checklist", label: "Verify current forwarding terms" },
};

const TENANT_BOUNDARY_NOTES: Record<string, string> = {
  "bbdbuyeusheet.com": "A sheet row organizes visible evidence; it does not confirm EU compatibility, stock, authenticity or destination eligibility.",
  "boonbuyfind.net": "A discovered source is only a candidate. Recheck the exact option, seller record, availability and current route terms.",
  "boonbuyindex.com": "An index entry cannot prove later payment, warehouse or delivery outcomes; preserve those stages as separate records.",
  "cnshopperindex.com": "Category and source fields support comparison, not a claim about seller reliability, stock or future order condition.",
  "cssbuycatalog.com": "A catalog price excludes later warehouse measurements, forwarding choices and destination-specific charges.",
  "cssbuyindex.com": "A CSSBuy score exposes evidence gaps; it does not authenticate a brand, seller or future received item.",
  "cssbuyitems.com": "A linked item remains unverified until its exact option, source status and received-item evidence are checked.",
  "goatedbuyindex.com": "A ranking or score organizes candidates only; verify the live source, option and seller before any external handoff.",
  "gtbuyindex.com": "Record completeness is not a guarantee of product authenticity, stock, seller performance or delivery outcome.",
  "hipobuyindex.com": "Image or text relevance does not confirm the exact item; preserve source, option and review date before comparison.",
  "hoobuyindex.net": "Historical or indexed evidence cannot establish current availability, route terms or the condition of a later order.",
  "itaobuyindex.com": "This is an independent research archive. Dated source evidence may become stale and must be rechecked at the live destination.",
  "kakobuyindex.net": "A candidate score is not proof of authenticity, seller reliability, stock or future product condition.",
  "kakobuyitems.com": "An item record cannot supply warehouse measurements or received condition before those later records exist.",
  "litbuyindex.com": "Search relevance and coupon references do not establish current eligibility, price, stock or a successful route outcome.",
  "litbuyitems.com": "Keep the listed option separate from the item eventually received; verify each stage with dated evidence.",
  "litbuyproducts.com": "A normalized product row supports comparison but cannot verify the seller, authenticity or final landed cost.",
  "loongbuys.net": "Older reviews and QC examples are historical context, not proof of a current listing or order outcome.",
  "lovegobuyindex.com": "Business, policy and promotion evidence changes over time; use the dated official source rather than an archived claim.",
  "mulebuyindex.net": "A spreadsheet rank cannot replace live seller, option, price and source verification.",
  "mulebuyitems.com": "Displayed item data does not prove received condition or future parcel weight; keep those stages separate.",
  "oopbuyindex.net": "An Oopbuy score records visible evidence only and does not certify authenticity, seller reliability or delivery.",
  "ydaexpress.net": "A parcel plan is provisional until the warehouse provides measured weight, dimensions and received-item status.",
  "ydaexpress.org": "Forwarding quotes and terms are time-sensitive; preserve the dated inputs and verify the current official source.",
};

export default function UsfansQuickStart({ compact = false }: { compact?: boolean }) {
  const tenant = useTenant();
  const editorial = tenant?.branding?.editorial;
  if (!editorial) return null;

  const directoryLinks =
    TENANT_DIRECTORY_LINKS[tenant.domain] ??
    (tenant.domain === "usfansindex.net"
      ? ([
          {
            href: "/usfans-spreadsheet",
            title: "Define the source record",
            description:
              "Keep the listing URL, exact option and review date together.",
            icon: Search,
          },
          {
            href: "/categories",
            title: "Set category-specific checks",
            description:
              "Use different evidence fields for clothing, shoes and electronics.",
            icon: LayoutGrid,
          },
          {
            href: "/brands",
            title: "Group candidates without certifying them",
            description:
              "Use brand pages to narrow the set, then verify each source separately.",
            icon: Scale,
          },
        ] as const)
      : tenant.domain === "yoybuyindex.com"
        ? ([
            {
              href: "/spreadsheet",
              title: "Build the research row",
              description:
                "Record source, requested option, visible evidence and open questions.",
              icon: Search,
            },
            {
              href: "/qc-checklist",
              title: "Prepare the QC handoff",
              description:
                "List the photos and measurements that must be checked later.",
              icon: LayoutGrid,
            },
            {
              href: "/shipping",
              title: "Add parcel facts when measured",
              description:
                "Keep packed weight and dimensions separate from listing claims.",
              icon: Scale,
            },
          ] as const)
        : tenant.domain === "eastmallbuyindex.com"
          ? ([
              {
                href: "/spreadsheet",
                title: "Score the shortlist",
                description:
                  "Keep comparable listing facts together before deciding what remains useful.",
                icon: Scale,
              },
              {
                href: "/legit",
                title: "Separate platform evidence",
                description:
                  "Distinguish visible business records from claims that still need confirmation.",
                icon: Search,
              },
              {
                href: "/referral-code",
                title: "Verify campaign terms",
                description:
                  "Check the live destination and eligibility instead of treating old offers as current.",
                icon: LayoutGrid,
              },
            ] as const)
          : tenant.domain === "fishgooindex.com"
            ? ([
                {
                  href: "/search-ideas",
                  title: "Choose the query mode",
                  description:
                    "Use exploratory terms, exact listing phrases or image cues for different jobs.",
                  icon: Search,
                },
                {
                  href: "/fishgoo-checklist",
                  title: "Inspect visible evidence",
                  description:
                    "Record source fields and open questions before a discovery result becomes a candidate.",
                  icon: LayoutGrid,
                },
                {
                  href: "/shipping",
                  title: "Separate parcel inputs",
                  description:
                    "Keep measured weight and dimensions apart from listing estimates.",
                  icon: Scale,
                },
              ] as const)
            : tenant.domain === "kameymallindex.com"
              ? ([
                  {
                    href: "/categories",
                    title: "Map category fields",
                    description:
                      "Start with the measurements, materials and option details that matter for the item type.",
                    icon: LayoutGrid,
                  },
                  {
                    href: "/review",
                    title: "Compare historical and current QC",
                    description:
                      "Use older examples as context while keeping the present order review separate.",
                    icon: Search,
                  },
                  {
                    href: "/shipping",
                    title: "Use actual parcel measurements",
                    description:
                      "Wait for packed dimensions and weight before evaluating a shipping route.",
                    icon: Scale,
                  },
                ] as const)
              : tenant.domain === "joyabuyfinds.com"
                ? ([
                    {
                      href: "/search-ideas",
                      title: "Begin with discovery cues",
                      description:
                        "Use a category, style phrase or image clue to form a candidate set without treating it as verified.",
                      icon: Search,
                    },
                    {
                      href: "/joyagoo-score",
                      title: "Score the candidate source",
                      description:
                        "Keep the listing, intended option and missing product details together before saving a find.",
                      icon: Scale,
                    },
                    {
                      href: "/safety",
                      title: "Separate the unknowns",
                      description:
                        "Record unresolved seller, payment and destination questions instead of filling them with assumptions.",
                      icon: LayoutGrid,
                    },
                  ] as const)
                : tenant.domain === "joyagooindex.com"
                  ? ([
                      {
                        href: "/joyagoo-score",
                        title: "Create the stage record",
                        description:
                          "Keep source, option, order state and warehouse evidence as separate dated fields.",
                        icon: LayoutGrid,
                      },
                      {
                        href: "/shipping",
                        title: "Add measured parcel facts",
                        description:
                          "Use packed weight and dimensions only when the warehouse record makes them available.",
                        icon: Scale,
                      },
                      {
                        href: "/safety",
                        title: "Keep handoff risks visible",
                        description:
                          "Review what changed between listing, order, QC and parcel stages before an external handoff.",
                        icon: Search,
                      },
                    ] as const)
                  : tenant.domain === "orientdigindex.com"
                    ? ([
                        {
                          href: "/orientdig-spreadsheet",
                          title: "Define the category evidence",
                          description:
                            "Record the fields that make a shoe, garment, bag or device comparable.",
                          icon: LayoutGrid,
                        },
                        {
                          href: "/orient-score-methodology",
                          title: "Apply the Orient Score",
                          description:
                            "Weight source clarity, option detail and dated evidence without hiding unknowns.",
                          icon: Scale,
                        },
                        {
                          href: "/orientdig-qc-photos-guide",
                          title: "Read QC photos as dated evidence",
                          description:
                            "Check whether each image supports the category fields claimed by the record.",
                          icon: Search,
                        },
                      ] as const)
                    : tenant.domain === "parcelupindex.com"
                      ? ([
                          {
                            href: "/getting-started",
                            title: "Preserve the Taobao order source",
                            description:
                              "Keep seller, listing, exact option and first-payment status in one record.",
                            icon: Search,
                          },
                          {
                            href: "/shipping-and-warehouse",
                            title: "Document the warehouse handoff",
                            description:
                              "Attach received-item evidence before consolidation creates a new parcel stage.",
                            icon: LayoutGrid,
                          },
                          {
                            href: "/fees-and-budgeting",
                            title: "Separate product and parcel costs",
                            description:
                              "Do not mix the first payment with measured international shipping inputs.",
                            icon: Scale,
                          },
                        ] as const)
                      : tenant.domain === "sugargooindex.net"
                        ? ([
                            {
                              href: "/sugargoo-spreadsheet",
                              title: "Refresh the listing and option",
                              description:
                                "Confirm that the source, selected variation and visible price are still current.",
                              icon: Search,
                            },
                            {
                              href: "/sugargoo-qc-guide",
                              title: "Compare the received-item QC",
                              description:
                                "Use warehouse photos to test the requested option, measurements and condition.",
                              icon: LayoutGrid,
                            },
                            {
                              href: "/sugargoo-shipping-guide",
                              title: "Plan from the measured parcel",
                              description:
                                "Evaluate shipping only after packed weight and dimensions are available.",
                              icon: Scale,
                            },
                          ] as const)
                        : tenant.domain === "superbuydeals.com"
                          ? ([
                              {
                                href: "/spreadsheet-checklist",
                                title: "Capture the original offer terms",
                                description:
                                  "Save the source, review date, eligibility wording and visible checkout condition together.",
                                icon: Search,
                              },
                              {
                                href: "/superbuy-spreadsheet",
                                title: "Separate offer and product evidence",
                                description:
                                  "Keep the promotional claim apart from the exact item, option and seller record.",
                                icon: LayoutGrid,
                              },
                              {
                                href: "/shipping-weight-guide",
                                title: "Keep shipping outside the deal label",
                                description:
                                  "Treat measured parcel inputs and route charges as a later, independent cost stage.",
                                icon: Scale,
                              },
                            ] as const)
                          : tenant.domain === "superbuyindex.com"
                            ? ([
                                {
                                  href: "/search-ideas",
                                  title: "Write a repeatable query",
                                  description:
                                    "Record the product terms, constraints and exclusions that define the search.",
                                  icon: Search,
                                },
                                {
                                  href: "/superbuy-spreadsheet",
                                  title: "Deduplicate source destinations",
                                  description:
                                    "Merge rows that resolve to the same listing while preserving distinct options and review dates.",
                                  icon: Scale,
                                },
                                {
                                  href: "/spreadsheet-checklist",
                                  title: "Retain rows with open questions",
                                  description:
                                    "Keep missing source, option and seller facts visible instead of treating a ranking as verification.",
                                  icon: LayoutGrid,
                                },
                              ] as const)
                            : tenant.domain === "superbuyitems.com"
                              ? ([
                                  {
                                    href: "/superbuy-items",
                                    title: "Open the item evidence file",
                                    description:
                                      "Start with the product link, requested option and dated listing fields.",
                                    icon: LayoutGrid,
                                  },
                                  {
                                    href: "/superbuy-qc",
                                    title: "Compare received-item QC",
                                    description:
                                      "Match warehouse photos and measurements to the option that was actually requested.",
                                    icon: Search,
                                  },
                                  {
                                    href: "/superbuy-shipping",
                                    title: "Wait for the measured parcel",
                                    description:
                                      "Evaluate shipping only after packed weight and dimensions replace listing estimates.",
                                    icon: Scale,
                                  },
                                ] as const)
                              : tenant.domain === "acbuyindex.com"
                                ? ([
                                    {
                                      href: "/directory",
                                      title: "Start with a listing shortlist",
                                      description:
                                        "Reduce broad ACBuy search results to sources with comparable options and current listing fields.",
                                      icon: Search,
                                    },
                                    {
                                      href: "/category-research",
                                      title: "Choose category evidence",
                                      description:
                                        "Define the measurements, materials or compatibility details needed for this product type.",
                                      icon: LayoutGrid,
                                    },
                                    {
                                      href: "/safety-research",
                                      title: "Record unresolved route questions",
                                      description:
                                        "Keep seller, payment and destination checks open until the live source answers them.",
                                      icon: Scale,
                                    },
                                  ] as const)
                                : tenant.domain === "allchinabuyfinder.com"
                                  ? ([
                                      {
                                        href: "/categories",
                                        title: "Pick the product family",
                                        description:
                                          "Use category boundaries to decide which materials, sizes and option words belong in the query.",
                                        icon: LayoutGrid,
                                      },
                                      {
                                        href: "/search-ideas",
                                        title: "Turn the idea into search language",
                                        description:
                                          "Combine a product noun with one differentiating feature before reviewing individual sources.",
                                        icon: Search,
                                      },
                                      {
                                        href: "/product-checklist",
                                        title: "Test each discovery candidate",
                                        description:
                                          "Compare image relevance, option detail and source continuity before saving a result.",
                                        icon: Scale,
                                      },
                                    ] as const)
                                  : tenant.domain === "allchinabuyindex.com"
                                    ? ([
                                        {
                                          href: "/guide",
                                          title: "Define the index question",
                                          description:
                                            "Write the exact product phrase and the fields that must remain comparable across results.",
                                          icon: Search,
                                        },
                                        {
                                          href: "/research-log",
                                          title: "Keep a dated comparison log",
                                          description:
                                            "Preserve source changes, missing options and the reason a listing stayed in or left the index.",
                                          icon: LayoutGrid,
                                        },
                                        {
                                          href: "/regions",
                                          title: "Separate destination constraints",
                                          description:
                                            "Treat region rules and route availability as later checks rather than product attributes.",
                                          icon: Scale,
                                        },
                                      ] as const)
                                    : tenant.domain === "bbdbuyeufinds.com"
                                      ? ([
                                          {
                                            href: "/eu-finds",
                                            title: "Create an EU product brief",
                                            description:
                                              "Write down sizing, plug, material and use-case requirements before browsing BBDbuy-linked finds.",
                                            icon: Search,
                                          },
                                          {
                                            href: "/qc-checklist",
                                            title: "Prepare region-aware QC fields",
                                            description:
                                              "Request the labels, dimensions and compatibility evidence needed for the intended EU destination.",
                                            icon: LayoutGrid,
                                          },
                                          {
                                            href: "/shipping-planner",
                                            title: "Plan only from parcel evidence",
                                            description:
                                              "Keep VAT, route restrictions and measured parcel inputs separate from the displayed item price.",
                                            icon: Scale,
                                          },
                                        ] as const)
                                      : tenant.domain === "bbdbuyeus.com"
                                        ? ([
                                            {
                                              href: "/search-guide",
                                              title: "Build the US-bound shortlist",
                                              description:
                                                "Compare product evidence first without treating a listing price as the final delivered cost.",
                                              icon: Search,
                                            },
                                            {
                                              href: "/order-workflow",
                                              title: "Track the order-to-warehouse handoff",
                                              description:
                                                "Keep the requested option, seller record and received-item evidence in separate stages.",
                                              icon: LayoutGrid,
                                            },
                                            {
                                              href: "/parcel-checklist",
                                              title: "Evaluate the measured US parcel",
                                              description:
                                                "Use actual packed weight, dimensions and current route restrictions for shipping research.",
                                              icon: Scale,
                                            },
                                          ] as const)
        : ([
            {
              href: "/categories",
              title: "Browse by category",
              description: "Move from broad product groups to focused results.",
              icon: LayoutGrid,
            },
            {
              href: "/brands",
              title: "Explore the brand index",
              description: "Open current brand pages with visible product counts.",
              icon: Search,
            },
            {
              href: "/agents/compare",
              title: "Compare buying routes",
              description: "Review the available agents before leaving the index.",
              icon: Scale,
            },
          ] as const));

  const secondaryCta =
    TENANT_SECONDARY_CTAS[tenant.domain] ??
    (tenant.domain === "usfansindex.net"
      ? { href: "/categories", label: "Review product check fields" }
      : tenant.domain === "yoybuyindex.com"
        ? { href: "/qc-checklist", label: "Open the QC checklist" }
        : tenant.domain === "eastmallbuyindex.com"
          ? { href: "/spreadsheet", label: "Open the shortlist worksheet" }
          : tenant.domain === "fishgooindex.com"
            ? { href: "/fishgoo-checklist", label: "Open the evidence checklist" }
            : tenant.domain === "kameymallindex.com"
              ? { href: "/review", label: "Compare the QC record" }
              : tenant.domain === "joyabuyfinds.com"
                ? { href: "/joyagoo-score", label: "Open the candidate score" }
                : tenant.domain === "joyagooindex.com"
                  ? { href: "/joyagoo-score", label: "Open the stage worksheet" }
                  : tenant.domain === "orientdigindex.com"
                    ? { href: "/orient-score-methodology", label: "Review the scoring weights" }
                    : tenant.domain === "parcelupindex.com"
                      ? { href: "/shipping-and-warehouse", label: "Review the warehouse handoff" }
                      : tenant.domain === "sugargooindex.net"
                        ? { href: "/sugargoo-qc-guide", label: "Open the QC evidence guide" }
                        : tenant.domain === "superbuydeals.com"
                          ? { href: "/spreadsheet-checklist", label: "Open the offer capture checklist" }
                          : tenant.domain === "superbuyindex.com"
                            ? { href: "/search-ideas", label: "Open the query design guide" }
                            : tenant.domain === "superbuyitems.com"
                              ? { href: "/superbuy-qc", label: "Review the item QC fields" }
                              : tenant.domain === "acbuyindex.com"
                                ? { href: "/category-research", label: "Set the category evidence" }
                                : tenant.domain === "allchinabuyfinder.com"
                                  ? { href: "/search-ideas", label: "Build a discovery query" }
                                  : tenant.domain === "allchinabuyindex.com"
                                    ? { href: "/research-log", label: "Open the comparison log" }
                                    : tenant.domain === "bbdbuyeufinds.com"
                                      ? { href: "/qc-checklist", label: "Prepare the EU QC fields" }
                                      : tenant.domain === "bbdbuyeus.com"
                                        ? { href: "/parcel-checklist", label: "Review US parcel inputs" }
        : { href: "/products", label: "Browse all products" });

  const boundaryNote =
    TENANT_BOUNDARY_NOTES[tenant.domain] ??
    (tenant.domain === "eastmallbuyindex.com"
      ? "A saved listing or referral link does not prove current price, availability or a platform outcome. Recheck the live source."
      : tenant.domain === "fishgooindex.com"
        ? "Broad discovery results and image matches are candidates, not confirmations. Verify the exact listing and option at the source."
        : tenant.domain === "kameymallindex.com"
          ? "Historical QC examples describe earlier records; they do not prove the condition or measurements of a current received item."
          : tenant.domain === "joyabuyfinds.com"
            ? "A visually relevant find is still only a candidate. Recheck the exact source, option, price and seller details before keeping it."
            : tenant.domain === "joyagooindex.com"
              ? "Evidence from one stage does not prove a later outcome. Keep listing, order, QC and parcel records dated and separate."
              : tenant.domain === "orientdigindex.com"
                ? "An Orient Score organizes visible evidence; it does not authenticate a brand, seller or future product condition."
                : tenant.domain === "parcelupindex.com"
                  ? "A listing price covers neither later parcel measurements nor current route fees. Recheck each payment stage independently."
                  : tenant.domain === "sugargooindex.net"
                    ? "A spreadsheet row is a research lead, not proof of stock, option accuracy, received condition or final shipping cost."
                    : tenant.domain === "superbuydeals.com"
                      ? "An offer label does not prove current eligibility, exact product coverage or the final checkout result. Recheck the dated source."
                      : tenant.domain === "superbuyindex.com"
                        ? "A rank, brand or category match organizes candidates; it does not verify the current option, price, seller or source page."
                      : tenant.domain === "superbuyitems.com"
                        ? "A linked item is a research record, not proof of authenticity, availability, received condition or future parcel cost."
                        : tenant.domain === "acbuyindex.com"
                          ? "An ACBuy search match is only a shortlist candidate. Recheck the exact source, selected option, seller record and current route terms."
                          : tenant.domain === "allchinabuyfinder.com"
                            ? "A discovery phrase improves recall, not certainty. Confirm image relevance, option wording and the live source before keeping a find."
                            : tenant.domain === "allchinabuyindex.com"
                              ? "An index row preserves comparable fields; it does not confirm stock, seller reliability, authenticity or destination availability."
                              : tenant.domain === "bbdbuyeufinds.com"
                                ? "EU sizing, plug standards, VAT treatment and import restrictions vary. Keep each destination check outside the product claim."
                                : tenant.domain === "bbdbuyeus.com"
                                  ? "A US-bound parcel estimate needs measured weight, dimensions and current route rules; the catalog price cannot supply those facts."
          : "Some outbound buying links may be referral links. Confirm current price, availability and service terms on the destination site.");

  return (
    <section
      className={cn(
        "container mx-auto px-4",
        compact ? "py-5" : "py-10 md:py-14",
      )}
      aria-labelledby="tenant-quick-start-title"
    >
      <div
        className={cn(
          "overflow-hidden rounded-[28px] border border-[#dbe3ee] bg-[#f4f7fb]",
          compact ? "p-5" : "p-6 sm:p-8 lg:p-10",
        )}
      >
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-10">
          <div className="flex flex-col justify-center">
            <h2
              id="tenant-quick-start-title"
              className={cn(
                "max-w-2xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#111827]",
                compact ? "text-2xl" : "text-3xl sm:text-4xl lg:text-5xl",
              )}
            >
              {editorial.introTitle}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#596174] sm:text-base sm:leading-7">
              {editorial.introDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={editorial.primaryCtaHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {editorial.primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryCta.href}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cbd5e1] bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {secondaryCta.label}
              </Link>
            </div>
            <p className="mt-5 flex max-w-xl items-start gap-2 text-xs leading-5 text-[#667085]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{boundaryNote}</span>
            </p>
          </div>

          <nav
            aria-label={`${tenant.title} catalog shortcuts`}
            className="border-t border-[#d7e0ea] pt-2 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
          >
            {directoryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-[#d7e0ea] py-4 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-[#dbe3ee]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[#111827] group-hover:text-primary">
                      {item.title}
                    </span>
                    {!compact && (
                      <span className="mt-1 block text-xs leading-5 text-[#596174]">
                        {item.description}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#7a8699] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
