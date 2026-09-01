"use client";

import { ArrowRight, FileSearch, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantProvider";

const archiveRecords = [
  {
    number: "01",
    title: "iTaoBuy spreadsheet and categories",
    description:
      "Start with a precise product or category query and keep the marketplace source beside every result.",
    href: "/site-guide#spreadsheet",
  },
  {
    number: "02",
    title: "iTaoBuy guide",
    description:
      "Move from query to source, visible options, unresolved fields and only then an external buying route.",
    href: "/site-guide#workflow",
  },
  {
    number: "03",
    title: "Is iTaoBuy legit or safe?",
    description:
      "Review the current domain, policies, payment flow and verifiable order evidence without promising a risk-free result.",
    href: "/site-guide#safety",
  },
  {
    number: "04",
    title: "iTaoBuy promo code checks",
    description:
      "Confirm the source, date, eligibility, minimum spend and exclusions before treating an offer as current.",
    href: "/site-guide#promo-code",
  },
  {
    number: "05",
    title: "iTaoBuy Reddit research",
    description:
      "Treat community posts as dated reports and compare their route, destination and evidence with current terms.",
    href: "/site-guide#reddit",
  },
  {
    number: "06",
    title: "iTaoBuy FAQ and open questions",
    description:
      "Keep unanswered product, account, parcel and destination questions visible instead of filling them with assumptions.",
    href: "/site-guide#faq",
  },
] as const;

export default function ItaobuyResearchArchive({
  compact = false,
}: {
  compact?: boolean;
}) {
  const tenant = useTenant();
  if (tenant?.domain !== "itaobuyindex.com") return null;

  return (
    <section
      className={cn(
        "border-y border-[#d9dee7] bg-[#f4f1ea] text-[#111827]",
        compact ? "px-4 py-7" : "py-14 lg:py-20",
      )}
      aria-labelledby="itaobuy-archive-title"
    >
      <div
        className={cn(
          "mx-auto grid gap-9",
          compact
            ? "max-w-xl"
            : "container px-4 lg:grid-cols-[minmax(250px,0.58fr)_minmax(0,1.42fr)] lg:gap-16",
        )}
      >
        <div className={cn(!compact && "lg:sticky lg:top-24 lg:self-start")}>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7410d]">
            <FileSearch className="h-4 w-4" />
            iTaoBuy research archive
          </p>
          <h2
            id="itaobuy-archive-title"
            className={cn(
              "mt-5 font-extrabold leading-[1.04] tracking-[-0.045em]",
              compact ? "text-3xl" : "text-4xl sm:text-5xl",
            )}
          >
            One platform. Six questions worth separating.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#5f6672] sm:text-base">
            The archive preserves the difference between a product result, a
            platform claim, a dated offer and a community report. Each record
            has its own evidence standard.
          </p>
          <div className="mt-7 flex items-start gap-3 border-l-2 border-[#e96517] pl-4 text-sm leading-6 text-[#4f5968]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#bd4d0f]" />
            <p>
              This independent directory does not process orders or guarantee
              sellers, products, offers or shipping outcomes.
            </p>
          </div>
        </div>

        <ol className="border-t border-[#bfc7d2]">
          {archiveRecords.map((record) => (
            <li key={record.number}>
              <Link
                href={record.href}
                className="group grid min-h-28 grid-cols-[42px_1fr_auto] items-start gap-4 border-b border-[#bfc7d2] py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e96517] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f1ea] sm:grid-cols-[54px_1fr_auto] sm:gap-6 sm:py-6"
              >
                <span className="font-mono text-xs font-bold tracking-[0.12em] text-[#b7410d]">
                  {record.number}
                </span>
                <span>
                  <strong className="block text-base font-extrabold tracking-[-0.02em] group-hover:text-[#b7410d] sm:text-lg">
                    {record.title}
                  </strong>
                  {!compact && (
                    <span className="mt-2 block max-w-2xl text-sm leading-6 text-[#596174]">
                      {record.description}
                    </span>
                  )}
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 text-[#8c96a5] transition-transform group-hover:translate-x-1 group-hover:text-[#bd4d0f]" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
