import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileSearch,
  Search,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { FAQPageJsonLd } from "@/components/seo/FAQPageJsonLd";
import {
  isTenantPathIndexable,
  resolveTenantFromHeaders,
} from "@/lib/tenant-config";
import {
  getTenantResearchPage,
  getTenantResearchPaths,
  getTenantResearchProfile,
} from "@/lib/tenant-research-pages";

async function getPageContext(locale: string, slug: string) {
  if (locale !== "en") return null;

  const headersList = await headers();
  const tenant = resolveTenantFromHeaders(
    headersList,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  if (!tenant) return null;

  const page = getTenantResearchPage(tenant.domain, slug);
  const profile = getTenantResearchProfile(tenant.domain);
  return page && profile ? { tenant, page, profile } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; platformSlug: string }>;
}): Promise<Metadata> {
  const { locale, platformSlug } = await params;
  const context = await getPageContext(locale, platformSlug);
  if (!context) return { robots: { index: false, follow: false } };

  const { tenant, page } = context;
  const url = `${tenant.canonicalOrigin}/en/${page.slug}`;
  const canIndex = isTenantPathIndexable(tenant, `/en/${page.slug}`);

  return {
    title: { absolute: page.seoTitle },
    description: page.description,
    alternates: {
      canonical: url,
      languages: { en: url, "x-default": url },
    },
    openGraph: {
      title: page.seoTitle,
      description: page.description,
      url,
      siteName: tenant.branding?.siteName || tenant.title,
      locale: "en_US",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.description,
    },
    robots: { index: canIndex, follow: true },
  };
}

export default async function TenantResearchPage({
  params,
}: {
  params: Promise<{ locale: string; platformSlug: string }>;
}) {
  const { locale, platformSlug } = await params;
  const context = await getPageContext(locale, platformSlug);
  if (!context) notFound();

  const { tenant, page, profile } = context;
  const branding = tenant.branding!;
  const pagePaths = getTenantResearchPaths(tenant.domain);
  const isLedger = profile.variant === "ledger";
  const isFinder = profile.variant === "finder";
  const isEuFinds = profile.variant === "eu-finds";
  const isUsParcel = profile.variant === "us-parcel";
  const isSheet = profile.variant === "sheet";
  const isItemCheck = profile.variant === "item-check";
  const isQueryIndex = profile.variant === "query-index";
  const isCatalogMap = profile.variant === "catalog-map";
  const isShortlist = profile.variant === "shortlist";
  const isItemFile = profile.variant === "item-file";
  const isTrackingRecord = page.slug === "tracking";
  const isEstimatorRecord =
    page.slug === "freight-estimator" ||
    page.slug === "shipping-calculator" ||
    (tenant.domain === "oopbuyindex.net" && page.slug === "shipping") ||
    (tenant.domain === "hoobuyindex.net" && page.slug === "shipping");
  const mainClass = isLedger
    ? "bg-[#f4f0e7] text-[#18212d]"
    : isFinder
      ? "bg-[#fffaf0] text-[#172036]"
      : isEuFinds
        ? "bg-[#eef6fa] text-[#10243a]"
        : isUsParcel
          ? "bg-[#f4f5f7] text-[#111b29]"
          : isSheet
            ? "bg-[#f5f1e8] text-[#251d15]"
            : isItemCheck
              ? "bg-[#f3f7ea] text-[#142410]"
              : isQueryIndex
                ? "bg-[#eef4f1] text-[#071611]"
                : isCatalogMap
                  ? "bg-[#eef6f8] text-[#092338]"
                  : isShortlist
                    ? "bg-[#f1f3f8] text-[#11172b]"
                    : isItemFile
                      ? "bg-[#fff7f3] text-[#24161b]"
      : "bg-[#f5f8f7] text-[#10282a]";
  const heroClass = isLedger
    ? "relative overflow-hidden border-b border-[#b59a67] bg-[#111a29] text-white"
    : isFinder
      ? "border-b border-[#efc995] bg-[#fff1d9] text-[#172036]"
      : isEuFinds
        ? "border-b border-[#a9cadb] bg-[#dcecf5] text-[#10243a]"
        : isUsParcel
          ? "border-b border-[#26384d] bg-[#111b29] text-white"
          : isSheet
            ? "border-b border-[#c9bb99] bg-[#eee6d5] text-[#251d15]"
            : isItemCheck
              ? "border-b border-[#53762d] bg-[#162710] text-white"
              : isQueryIndex
                ? "border-b border-[#246b50] bg-[#061711] text-white"
                : isCatalogMap
                  ? "border-b border-[#8fc3cf] bg-[#d9eef3] text-[#092338]"
                  : isShortlist
                    ? "border-b border-[#323d72] bg-[#080d1e] text-white"
                    : isItemFile
                      ? "border-b border-[#f0b9c4] bg-[#fff0ed] text-[#24161b]"
      : "border-b border-[#cfddda] bg-[#092d35] text-white";
  const eyebrowClass = isLedger
    ? "text-[#f2c66d]"
    : isFinder
      ? "text-[#a83b0b]"
      : isEuFinds
        ? "text-[#195d94]"
        : isUsParcel
          ? "text-[#ffad45]"
          : isSheet
            ? "text-[#76500f]"
            : isItemCheck
              ? "text-[#b8e36d]"
              : isQueryIndex
                ? "text-[#6ce0af]"
                : isCatalogMap
                  ? "text-[#a8470d]"
                  : isShortlist
                    ? "text-[#ff526a]"
                    : isItemFile
                      ? "text-[#c9365b]"
      : "text-[#75d7bd]";
  const primaryButtonClass = isLedger
    ? "bg-[#f2c66d] text-[#172036] hover:bg-[#ffe09b] focus-visible:ring-[#f2c66d] focus-visible:ring-offset-[#111a29]"
    : isFinder
      ? "bg-[#b7410d] text-white hover:bg-[#9f3d0d] focus-visible:ring-[#b7410d] focus-visible:ring-offset-[#fff1d9]"
      : isEuFinds
        ? "bg-[#2376b9] text-white hover:bg-[#195d94] focus-visible:ring-[#2376b9] focus-visible:ring-offset-[#dcecf5]"
        : isUsParcel
          ? "bg-[#9c4e00] text-white hover:bg-[#7f3f00] focus-visible:ring-[#9c4e00] focus-visible:ring-offset-[#111b29]"
          : isSheet
            ? "bg-[#251d15] text-white hover:bg-[#4a3826] focus-visible:ring-[#9b6517] focus-visible:ring-offset-[#eee6d5]"
            : isItemCheck
              ? "bg-[#b8e36d] text-[#142410] hover:bg-[#d5f79b] focus-visible:ring-[#b8e36d] focus-visible:ring-offset-[#162710]"
              : isQueryIndex
                ? "bg-[#35c486] text-[#061711] hover:bg-[#6ce0af] focus-visible:ring-[#35c486] focus-visible:ring-offset-[#061711]"
                : isCatalogMap
                  ? "bg-[#a8470d] text-white hover:bg-[#87390a] focus-visible:ring-[#a8470d] focus-visible:ring-offset-[#d9eef3]"
                  : isShortlist
                    ? "bg-[#c31d39] text-white hover:bg-[#a61630] focus-visible:ring-[#c31d39] focus-visible:ring-offset-[#080d1e]"
                    : isItemFile
                      ? "bg-[#24161b] text-white hover:bg-[#4a2935] focus-visible:ring-[#c9365b] focus-visible:ring-offset-[#fff0ed]"
      : "bg-[#31b38c] text-[#06231f] hover:bg-[#75d7bd] focus-visible:ring-white focus-visible:ring-offset-[#092d35]";
  const isLightHero =
    isFinder || isEuFinds || isSheet || isCatalogMap || isItemFile;
  const secondaryButtonClass = isLightHero
    ? "border-current/20 text-current hover:border-current/45 hover:bg-white/60 focus-visible:ring-current focus-visible:ring-offset-white"
    : "border-white/25 text-white hover:border-white/60 hover:bg-white/8 focus-visible:ring-white focus-visible:ring-offset-[#092d35]";

  return (
    <div className={mainClass}>
      <BreadcrumbJsonLd
        locale="en"
        homeName={branding.siteName}
        baseUrl={tenant.canonicalOrigin}
        items={[{ name: page.title, url: `/${page.slug}` }]}
      />
      {page.questions ? <FAQPageJsonLd items={[...page.questions]} /> : null}
      <section className={heroClass}>
        {isLedger ? (
          <div className="absolute inset-0 bg-gradient-to-r from-[#111a29] via-[#111a29] to-[#1b2738]" />
        ) : null}
        <div
          className={`container relative mx-auto grid min-h-[68dvh] items-center gap-10 px-4 py-14 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] md:py-20 ${
            isLedger ? "lg:grid-cols-[minmax(0,1.25fr)_360px]" : ""
          }`}
        >
          <div>
            <p
              className={`text-sm font-bold uppercase tracking-[0.16em] ${eyebrowClass}`}
            >
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-[3.6rem]">
              {page.title}
            </h1>
            <p
              className={`mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 ${
                isLightHero ? "text-current/70" : "text-white/72"
              }`}
            >
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${primaryButtonClass}`}
              >
                {isLedger
                  ? "Open product research"
                  : isSheet
                    ? "Start a research row"
                    : isUsParcel
                      ? "Search before planning"
                      : "Search products"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={page.sourceUrl || profile.officialUrl}
                rel="nofollow noopener noreferrer"
                target="_blank"
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${secondaryButtonClass}`}
              >
                {page.sourceLabel ||
                  (page.sourceUrl
                    ? profile.officialLabel
                    : `${profile.officialLabel} homepage`)}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {isLedger || isUsParcel ? (
            <aside className="border border-[#f2c66d]/45 bg-[#111a29]/80 p-6 backdrop-blur-sm sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#f2c66d]">
                {isUsParcel ? "US parcel handoff" : "Research record"}
              </p>
              <ol className="mt-6 grid gap-5">
                {(isUsParcel
                  ? ["Source", "Warehouse", "Parcel", "Route"]
                  : ["Source", "Evidence", "Decision"]
                ).map((label, index) => (
                  <li
                    key={label}
                    className="grid grid-cols-[42px_1fr] items-center gap-4 border-t border-white/16 pt-5"
                  >
                    <span className="font-mono text-sm text-[#f2c66d]">
                      0{index + 1}
                    </span>
                    <span className="text-lg font-bold text-white">{label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-sm leading-6 text-white/65">
                {isUsParcel
                  ? "Move forward only when the record for the previous handoff remains attached."
                  : "Preserve what was checked, when it was checked and what remains unresolved."}
              </p>
            </aside>
          ) : isTrackingRecord ? (
            <aside className="overflow-hidden rounded-[22px] border border-white/20 bg-[#0c252d] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
              <div className="border-b border-white/15 px-6 py-5 sm:px-8">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#75d7bd]">
                  Tracking evidence record
                </p>
              </div>
              <ol className="px-6 sm:px-8">
                {[
                  [
                    "01",
                    "Official parcel record",
                    "Open the official tracking or order record and its current details.",
                  ],
                  [
                    "02",
                    "Last confirmed scan",
                    "Save the event wording, location and timestamp together.",
                  ],
                  [
                    "03",
                    "Next source to check",
                    "Use the responsible carrier or official support path when evidence is unclear.",
                  ],
                ].map(([number, label, detail]) => (
                  <li
                    key={number}
                    className="grid grid-cols-[42px_1fr] gap-4 border-b border-white/12 py-5 last:border-b-0"
                  >
                    <span className="font-mono text-sm text-[#75d7bd]">
                      {number}
                    </span>
                    <div>
                      <p className="font-bold text-white">{label}</p>
                      <p className="mt-1 text-sm leading-6 text-white/62">
                        {detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="border-t border-white/15 bg-black/10 px-6 py-5 text-sm leading-6 text-white/68 sm:px-8">
                A tracking event records what was reported. It does not promise
                the next scan or delivery date.
              </p>
            </aside>
          ) : isEstimatorRecord ? (
            <aside className="overflow-hidden rounded-[24px] border border-[#35c486]/45 bg-[#0b2118] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
              <div className="border-b border-white/15 px-6 py-5 sm:px-8">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#6ce0af]">
                  Freight estimate record
                </p>
              </div>
              <dl className="px-6 sm:px-8">
                {[
                  ["Destination", "Record the exact country or region used for the current comparison."],
                  ["Parcel evidence", "Keep the weight, dimensions and contents tied to their source and review date."],
                  ["Current result", "Save the displayed options, currency and unresolved charges without turning them into a quote."],
                ].map(([term, detail]) => (
                  <div
                    key={term}
                    className="grid gap-2 border-b border-white/12 py-5 last:border-b-0"
                  >
                    <dt className="font-bold text-white">{term}</dt>
                    <dd className="text-sm leading-6 text-white/62">{detail}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-white/15 bg-black/10 px-6 py-5 text-sm leading-6 text-white/68 sm:px-8">
                A planning estimate is not the packed-parcel charge. Recheck the
                current source before submission.
              </p>
            </aside>
          ) : isItemCheck ? (
            <aside className="border border-[#b8e36d]/55 bg-[#0f1e0b] p-6 shadow-[12px_12px_0_#2f4b20] sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#b8e36d]">
                  Link review
                </p>
                <span className="rounded-full border border-[#b8e36d]/45 px-3 py-1 font-mono text-xs text-[#b8e36d]">
                  5 fields
                </span>
              </div>
              <ul className="mt-2">
                {["Source opens", "Option clear", "Evidence visible", "Risk marked", "Date saved"].map(
                  (label) => (
                    <li
                      key={label}
                      className="flex items-center gap-3 border-b border-white/10 py-4 text-sm font-bold text-white last:border-b-0"
                    >
                      <Check className="h-4 w-4 text-[#b8e36d]" />
                      {label}
                    </li>
                  ),
                )}
              </ul>
            </aside>
          ) : isQueryIndex ? (
            <aside className="overflow-hidden rounded-[28px] border border-[#35c486]/45 bg-[#0b2118] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
              <div className="p-6 sm:p-8">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6ce0af]">
                  Query record
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/20 px-4 py-3 text-sm text-white/65">
                  <Search className="h-4 w-4 text-[#6ce0af]" />
                  product + useful attribute
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono text-xs text-white/60">
                  <span className="border border-white/12 py-2">QUERY</span>
                  <span className="border border-white/12 py-2">SOURCE</span>
                  <span className="border border-white/12 py-2">CHECK</span>
                </div>
              </div>
            </aside>
          ) : isShortlist ? (
            <aside className="overflow-hidden rounded-[10px] border border-[#5160a7]/55 bg-[#10172e] shadow-[16px_16px_0_#ff334e]">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#ff526a]">
                    Shortlist gate
                  </p>
                  <span className="font-mono text-xs text-white/55">04 checks</span>
                </div>
                <ol className="mt-2">
                  {["Query match", "Duplicate group", "Evidence floor", "Dated reason"].map(
                    (label, index) => (
                      <li
                        key={label}
                        className="grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-white/10 py-4 last:border-b-0"
                      >
                        <span className="font-mono text-xs text-[#7d8cff]">0{index + 1}</span>
                        <span className="text-sm font-bold text-white">{label}</span>
                        <Check className="h-4 w-4 text-[#ff526a]" />
                      </li>
                    ),
                  )}
                </ol>
              </div>
            </aside>
          ) : isItemFile ? (
            <aside className="overflow-hidden rounded-[30px] border border-[#e8aeba] bg-white shadow-[0_24px_70px_rgba(91,36,54,0.16)]">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 border-b border-[#f0d5db] pb-5">
                  <FileSearch className="h-5 w-5 text-[#c9365b]" />
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#7b3045]">
                    Item evidence file
                  </p>
                </div>
                <dl className="mt-5 grid grid-cols-[104px_1fr] gap-x-4 gap-y-4 text-sm">
                  {[
                    ["SOURCE", "Current URL"],
                    ["OPTION", "Exact variation"],
                    ["EVIDENCE", "Visible fields"],
                    ["OPEN", "Unresolved"],
                  ].map(([term, detail]) => (
                    <div key={term} className="contents">
                      <dt className="font-mono text-xs text-[#c9365b]">{term}</dt>
                      <dd className="border-b border-[#f0d5db] pb-3 font-semibold text-[#24161b]">
                        {detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          ) : isSheet ? (
            <aside className="overflow-hidden border border-[#b8aa87] bg-[#fffdf7] shadow-[10px_12px_0_#cdbf9d]">
              <div className="grid grid-cols-[50px_1fr_1fr] border-b border-[#b8aa87] bg-[#251d15] text-xs font-bold uppercase tracking-[0.12em] text-white">
                <span className="border-r border-white/20 p-3">#</span>
                <span className="border-r border-white/20 p-3">Field</span>
                <span className="p-3">Status</span>
              </div>
              {["Source", "Variant", "Evidence", "EU question"].map(
                (label, index) => (
                  <div
                    key={label}
                    className="grid grid-cols-[50px_1fr_1fr] border-b border-[#d9cfb7] text-sm last:border-b-0"
                  >
                    <span className="border-r border-[#d9cfb7] bg-[#eee6d5] p-4 font-mono text-[#745d3f]">
                      {index + 1}
                    </span>
                    <span className="border-r border-[#d9cfb7] p-4 font-bold">
                      {label}
                    </span>
                    <span className="p-4 text-[#745d3f]">
                      {index < 2 ? "Required" : "Check"}
                    </span>
                  </div>
                ),
              )}
            </aside>
          ) : (
            <aside
              className={`flex min-h-[320px] flex-col justify-between overflow-hidden border p-6 sm:min-h-[420px] sm:p-8 ${
                isFinder
                  ? "rotate-1 rounded-[34px] border-[#efc995] bg-white shadow-[0_24px_80px_rgba(94,55,18,0.18)]"
                  : isEuFinds
                    ? "rounded-[52%_48%_42%_58%/40%_46%_54%_60%] border-[#7fb5ce] bg-white shadow-[0_26px_70px_rgba(35,118,185,0.2)]"
                    : isCatalogMap
                      ? "rounded-[12px] border-[#8fc3cf] bg-white shadow-[16px_16px_0_#a9d0d9]"
                  : "rounded-[22px] border-white/15"
              }`}
            >
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] opacity-65">
                  Source-backed research
                </p>
                <p className="mt-5 text-2xl font-extrabold tracking-[-0.03em]">
                  {branding.wordmark}
                </p>
                <dl className="mt-8 border-t border-current/15 text-sm">
                  {[
                    ["Page", page.eyebrow],
                    ["Source", profile.officialLabel],
                    ["Review", "Confirm current details"],
                  ].map(([term, detail]) => (
                    <div
                      key={term}
                      className="grid grid-cols-[88px_1fr] gap-4 border-b border-current/15 py-4"
                    >
                      <dt className="font-mono text-xs uppercase tracking-[0.12em] opacity-55">
                        {term}
                      </dt>
                      <dd className="font-semibold">{detail}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div
                className={`mt-8 border p-4 ${
                  isFinder || isEuFinds || isCatalogMap
                    ? "rounded-[18px] border-current/15 bg-white/70 text-[#172036]"
                    : "rounded-[14px] border-white/20 bg-white/5 text-white"
                }`}
              >
                <p className="text-sm font-semibold leading-5">
                  Independent research. Current product and service terms
                  require confirmation at the source.
                </p>
              </div>
            </aside>
          )}
        </div>
      </section>

      <nav
        aria-label={profile.navLabel}
        className={`border-b ${
          isLedger
            ? "border-[#2b3545] bg-[#18212d]"
            : isFinder
              ? "border-[#efc995] bg-[#172036]"
              : isEuFinds
                ? "border-[#a9cadb] bg-white"
                : isUsParcel
                  ? "border-[#26384d] bg-[#111b29]"
                  : isSheet
                    ? "border-[#c9bb99] bg-[#251d15]"
                    : isItemCheck
                      ? "border-[#3b5b27] bg-[#162710]"
                      : isQueryIndex
                        ? "border-[#246b50] bg-[#0b2118]"
                        : isCatalogMap
                          ? "border-[#8fc3cf] bg-white"
              : "border-[#cfddda] bg-white"
        }`}
      >
        <div className="container mx-auto flex gap-2 overflow-x-auto px-4 py-3">
          {pagePaths.map((path) => {
            const label = path
              .slice(1)
              .split("-")
              .map((word) => word[0].toUpperCase() + word.slice(1))
              .join(" ");
            const active = path === `/${page.slug}`;

            return (
              <Link
                key={path}
                href={path}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                  isLedger
                    ? active
                      ? "border-b-2 border-[#f2c66d] text-[#f2c66d]"
                      : "text-white/65 hover:text-white"
                    : isFinder
                      ? active
                        ? "rounded-full bg-[#b7410d] text-white"
                        : "rounded-full text-white/65 hover:bg-white/10 hover:text-white"
                      : isEuFinds
                        ? active
                          ? "border-b-2 border-[#2376b9] text-[#195d94]"
                          : "text-[#5e7180] hover:text-[#10243a]"
                        : isUsParcel
                          ? active
                            ? "border-l-2 border-[#e98305] bg-white/8 text-[#ffad45]"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                          : isSheet
                            ? active
                              ? "bg-[#f6cd78] text-[#251d15]"
                              : "text-white/65 hover:bg-white/10 hover:text-white"
                            : isItemCheck
                              ? active
                                ? "border-b-2 border-[#b8e36d] text-[#b8e36d]"
                                : "text-white/60 hover:text-white"
                              : isQueryIndex
                                ? active
                                  ? "rounded-full bg-[#35c486] text-[#061711]"
                                  : "rounded-full text-white/60 hover:bg-white/8 hover:text-white"
                                : isCatalogMap
                                  ? active
                                    ? "rounded-full bg-[#a8470d] text-white"
                                    : "rounded-full text-[#526d79] hover:bg-[#e4f1f4] hover:text-[#092338]"
                      : active
                        ? "rounded-full bg-[#d9f2ea] text-[#075c50]"
                        : "rounded-full text-[#526867] hover:bg-[#edf4f2] hover:text-[#10282a]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <section className="container mx-auto px-4 pt-10">
        <dl className="grid gap-5 border border-current/15 bg-white p-5 text-sm md:grid-cols-[minmax(180px,0.6fr)_minmax(160px,0.5fr)_minmax(0,1.9fr)] md:p-6">
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-[#5d706f]">
              Editorial responsibility
            </dt>
            <dd className="mt-2 font-bold">
              {page.editorialOwner || `${branding.siteName} research desk`}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-[#5d706f]">
              {page.reviewedAt ? "Last reviewed" : "Page review date"}
            </dt>
            <dd className="mt-2 font-bold">
              {page.reviewedAt ? (
                <time dateTime={page.reviewedAt}>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(`${page.reviewedAt}T00:00:00Z`))}
                </time>
              ) : (
                "Not recorded for this page"
              )}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-[#5d706f]">
              Review method
            </dt>
            <dd className="mt-2 leading-6 text-[#5d706f]">
              {page.methodNote || profile.boundaryDescription}{" "}
              <a
                href={page.sourceUrl || profile.officialUrl}
                rel="nofollow noopener noreferrer"
                target="_blank"
                className="font-bold text-current underline underline-offset-4"
              >
                {page.sourceUrl ? "Open page source" : "Open platform homepage"}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {page.questions ? (
        <section className="container mx-auto px-4 py-14 lg:py-20">
          <div
            className={`grid gap-10 ${
              isLedger
                ? "lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]"
                : "lg:grid-cols-[minmax(240px,0.55fr)_minmax(0,1.45fr)]"
            }`}
          >
            <div>
              <FileSearch
                className={`h-7 w-7 ${
                  isLedger
                    ? "text-[#78500f]"
                    : isFinder
                      ? "text-[#a83b0b]"
                      : isEuFinds
                        ? "text-[#2376b9]"
                        : isUsParcel
                          ? "text-[#9c4e00]"
                          : isSheet
                            ? "text-[#9b6517]"
                            : isItemCheck
                              ? "text-[#6a922f]"
                              : isQueryIndex
                                ? "text-[#168f5e]"
                                : isCatalogMap
                                  ? "text-[#a8470d]"
                      : "text-[#087c68]"
                }`}
              />
              <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em]">
                Clear research boundaries
              </h2>
              <p className="mt-4 text-base leading-7 text-[#5d706f]">
                Use these answers to identify the next source or service detail
                that still needs checking.
              </p>
            </div>
            <div
              className={`overflow-hidden border bg-white px-5 sm:px-7 ${
                  isLedger
                  ? "border-[#c9b98e]"
                  : isFinder
                    ? "rounded-[28px] border-[#efc995] shadow-[0_18px_50px_rgba(94,55,18,0.09)]"
                    : isEuFinds
                      ? "rounded-[8px_32px_8px_32px] border-[#a9cadb] shadow-[0_18px_50px_rgba(35,118,185,0.08)]"
                      : isUsParcel
                        ? "rounded-none border-[#aab4bf] shadow-[8px_8px_0_#d9dde2]"
                        : isSheet
                          ? "rounded-none border-[#c9bb99] shadow-[8px_8px_0_#ded4be]"
                          : isItemCheck
                            ? "rounded-none border-[#9fbd70] shadow-[8px_8px_0_#d7e5bc]"
                            : isQueryIndex
                              ? "rounded-[28px] border-[#9ccbb7] shadow-[0_18px_50px_rgba(4,71,45,0.09)]"
                              : isCatalogMap
                                ? "rounded-[20px] border-[#a9d0d9] shadow-[10px_10px_0_#dbecef]"
                    : "rounded-[20px] border-[#cfddda]"
              }`}
            >
              {page.questions.map((item) => (
                <details
                  key={item.question}
                  className="group border-b border-[#dce7e4] py-5 last:border-b-0"
                >
                  <summary className="cursor-pointer list-none pr-8 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087c68] focus-visible:ring-offset-2">
                    {item.question}
                  </summary>
                  <p className="max-w-3xl pt-3 text-sm leading-6 text-[#5d706f]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4 py-14 lg:py-20">
          <div
            className={`grid ${
              isLedger
                ? "gap-0"
                : isFinder
                  ? "gap-5 md:grid-cols-2 lg:grid-cols-3"
                  : isEuFinds
                    ? "gap-4 md:grid-cols-2"
                    : isUsParcel
                      ? "gap-0"
                      : isSheet
                        ? "gap-0 border-l border-t border-[#c9bb99] md:grid-cols-2"
                        : isItemCheck
                          ? "gap-4 md:grid-cols-2 lg:grid-cols-3"
                          : isQueryIndex
                            ? "gap-0"
                            : isCatalogMap
                              ? "gap-5 md:grid-cols-2 lg:grid-cols-3"
                  : "gap-x-10 gap-y-0 md:grid-cols-2"
            }`}
          >
            {page.sections.map((section, index) => (
              <article
                key={section.title}
                className={
                  isLedger
                    ? "border-t border-[#c9b98e] py-8 sm:grid sm:grid-cols-[90px_1fr] sm:gap-5"
                    : isFinder
                      ? "rounded-[24px] border border-[#efc995] bg-white p-6 shadow-[0_12px_40px_rgba(94,55,18,0.06)]"
                      : isEuFinds
                        ? "rounded-[10px_34px_10px_34px] border border-[#a9cadb] bg-white p-6 shadow-[0_14px_36px_rgba(35,118,185,0.07)]"
                        : isUsParcel
                          ? "border-t border-[#aab4bf] py-8 sm:grid sm:grid-cols-[90px_1fr] sm:gap-5"
                          : isSheet
                            ? "border-b border-r border-[#c9bb99] bg-white p-6 md:min-h-48"
                            : isItemCheck
                              ? "border border-[#b8ce91] bg-white p-6 shadow-[6px_6px_0_#dde9c8]"
                              : isQueryIndex
                                ? "border-t border-[#a5c7b8] py-8 sm:grid sm:grid-cols-[90px_1fr] sm:gap-5"
                                : isCatalogMap
                                  ? "rounded-[20px] border border-[#a9d0d9] bg-white p-6 shadow-[10px_10px_0_#dbecef]"
                      : "border-t border-[#bcd0cb] py-7 md:min-h-44 md:py-8"
                }
              >
                {isLedger || isUsParcel || isQueryIndex ? (
                  <span
                    className={`mb-4 block font-mono text-sm sm:mb-0 ${
                      isUsParcel
                        ? "text-[#8c4b00]"
                        : isQueryIndex
                          ? "text-[#0c7148]"
                          : "text-[#78500f]"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                ) : null}
                <div className="flex items-start gap-4">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center ${
                      isLedger || isUsParcel || isQueryIndex
                        ? "hidden"
                        : isFinder
                          ? "rounded-full bg-[#fff0df] text-[#a83b0b]"
                          : isEuFinds
                            ? "rounded-[12px_20px] bg-[#dcecf5] text-[#2376b9]"
                            : isSheet
                              ? "rounded-none border border-[#c9bb99] bg-[#eee6d5] text-[#9b6517]"
                              : isItemCheck
                                ? "rounded-none bg-[#e5f1cf] text-[#5d8428]"
                                : isCatalogMap
                                  ? "rounded-full bg-[#e6f2f5] text-[#a8470d]"
                          : "rounded-xl bg-[#d9f2ea] text-[#087c68]"
                    }`}
                  >
                    {index === 0 ? (
                      <Search className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-[-0.03em]">
                      {section.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#5d706f] sm:text-base sm:leading-7">
                      {section.description}
                    </p>
                    {section.points ? (
                      <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#5d706f]">
                        {section.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <aside className="container mx-auto px-4 pb-16 lg:pb-24">
        <div
          className={`grid gap-6 border bg-white p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
            isLedger
              ? "border-[#c9b98e]"
              : isFinder
                ? "rounded-[28px] border-[#efc995]"
                : isEuFinds
                  ? "rounded-[10px_34px_10px_34px] border-[#a9cadb]"
                  : isUsParcel
                    ? "rounded-none border-[#aab4bf]"
                    : isSheet
                      ? "rounded-none border-[#c9bb99]"
                      : isItemCheck
                        ? "rounded-none border-[#9fbd70]"
                        : isQueryIndex
                          ? "rounded-[28px] border-[#9ccbb7]"
                          : isCatalogMap
                            ? "rounded-[20px] border-[#a9d0d9]"
                : "rounded-[22px] border-[#cfddda]"
          }`}
        >
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              {profile.boundaryTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d706f]">
              {profile.boundaryDescription}
            </p>
          </div>
          <Link
            href="/products"
            className={`inline-flex min-h-11 items-center justify-center gap-2 border px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isEuFinds
                ? "rounded-full border-[#8dbbd0] text-[#195d94] hover:bg-[#e7f2f7] focus-visible:ring-[#2376b9]"
                : isUsParcel
                  ? "rounded-none border-[#e98305] text-[#b65e00] hover:bg-[#fff4e5] focus-visible:ring-[#e98305]"
                  : isSheet
                    ? "rounded-none border-[#9b6517] text-[#76501d] hover:bg-[#f8efd9] focus-visible:ring-[#9b6517]"
                    : isItemCheck
                      ? "rounded-none border-[#6a922f] text-[#4a6c1f] hover:bg-[#edf6dc] focus-visible:ring-[#6a922f]"
                      : isQueryIndex
                        ? "rounded-full border-[#168f5e] text-[#0f7049] hover:bg-[#e6f5ee] focus-visible:ring-[#168f5e]"
                        : isCatalogMap
                          ? "rounded-full border-[#d96b19] text-[#b95510] hover:bg-[#fff0e4] focus-visible:ring-[#d96b19]"
                    : "rounded-full border-[#a9bfba] text-[#075c50] hover:border-[#087c68] hover:bg-[#edf4f2] focus-visible:ring-[#087c68]"
            }`}
          >
            Build a shortlist
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
