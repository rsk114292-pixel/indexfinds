"use client";

import { ArrowRight, Info, LayoutGrid, Search, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantProvider";

export default function UsfansQuickStart({ compact = false }: { compact?: boolean }) {
  const tenant = useTenant();
  const editorial = tenant?.branding?.editorial;
  if (!editorial) return null;

  const directoryLinks = [
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
  ] as const;

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
          "overflow-hidden rounded-[28px] border border-[#eadfd3] bg-[#f7f4ef]",
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
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cfc5b9] bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Browse all products
              </Link>
            </div>
            <p className="mt-5 flex max-w-xl items-start gap-2 text-xs leading-5 text-[#766d64]">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                Some outbound buying links may be referral links. Confirm current
                price, availability and service terms on the destination site.
              </span>
            </p>
          </div>

          <nav
            aria-label={`${tenant.title} catalog shortcuts`}
            className="border-t border-[#ddd3c8] pt-2 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
          >
            {directoryLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-[#ddd3c8] py-4 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-[#e2d9ce]">
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
                  <ArrowRight className="h-4 w-4 text-[#8a7f73] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
}
