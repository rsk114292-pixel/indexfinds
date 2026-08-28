"use client";

import { ArrowRight, Info, LayoutGrid, Search, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantProvider";

export default function UsfansQuickStart({ compact = false }: { compact?: boolean }) {
  const tenant = useTenant();
  const editorial = tenant?.branding?.editorial;
  if (!editorial) return null;

  const directoryLinks =
    tenant.domain === "usfansindex.net"
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
          ] as const);

  const secondaryCta =
    tenant.domain === "usfansindex.net"
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
        : { href: "/products", label: "Browse all products" };

  const boundaryNote =
    tenant.domain === "eastmallbuyindex.com"
      ? "A saved listing or referral link does not prove current price, availability or a platform outcome. Recheck the live source."
      : tenant.domain === "fishgooindex.com"
        ? "Broad discovery results and image matches are candidates, not confirmations. Verify the exact listing and option at the source."
        : tenant.domain === "kameymallindex.com"
          ? "Historical QC examples describe earlier records; they do not prove the condition or measurements of a current received item."
          : tenant.domain === "joyabuyfinds.com"
            ? "A visually relevant find is still only a candidate. Recheck the exact source, option, price and seller details before keeping it."
            : tenant.domain === "joyagooindex.com"
              ? "Evidence from one stage does not prove a later outcome. Keep listing, order, QC and parcel records dated and separate."
          : "Some outbound buying links may be referral links. Confirm current price, availability and service terms on the destination site.";

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
                      <span className="mt-1 block text-xs leading-5 text-[#6b7280]">
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
