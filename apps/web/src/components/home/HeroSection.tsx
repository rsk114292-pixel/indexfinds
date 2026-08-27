"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Camera, Crown, ShieldCheck } from "lucide-react";
import SearchBox from "@/components/SearchBox";
import PlatformSelector from "@/components/PlatformSelector";
import HotSearches from "@/components/HotSearches";
import { FadeIn } from "@/components/ui/FadeIn";
import { useHeaderStore } from "@/stores/useHeaderStore";
import StarField from "@/components/home/StarField";
import { useTenant } from "@/components/TenantProvider";
import { getTenantHeroVisual } from "@/lib/tenant-hero";

interface HotSearchItem {
  keyword: string;
  count: number;
}

interface HeroSectionProps {
  initialHotSearches?: HotSearchItem[];
}

export default function HeroSection({
  initialHotSearches,
}: HeroSectionProps) {
  const t = useTranslations("home");
  const tenant = useTenant();
  const branding = tenant?.branding;
  const tenantHero = getTenantHeroVisual(tenant?.domain);
  const searchRef = useRef<HTMLDivElement>(null);
  const setHeroSearchVisible = useHeaderStore((s) => s.setHeroSearchVisible);

  const capabilityItems = [
    { icon: Sparkles, label: t("hero.featureAI") },
    { icon: Camera, label: t("hero.featureVisualSearch") },
    { icon: Crown, label: t("hero.compareAgents") },
  ];

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      setHeroSearchVisible(false);
    };
  }, [setHeroSearchVisible]);

  if (tenantHero && branding) {
    return (
      <section
        className="relative z-10 min-h-[calc(100svh-64px)] overflow-hidden text-white"
        style={{ backgroundColor: tenantHero.backgroundColor }}
      >
        <picture className="absolute inset-0">
          <source
            media="(max-width: 767px)"
            srcSet={tenantHero.mobilePath}
          />
          <img
            src={tenantHero.desktopPath}
            alt={tenantHero.alt}
            className="h-full w-full object-cover"
            style={{ objectPosition: tenantHero.desktopObjectPosition }}
          />
        </picture>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: tenantHero.desktopOverlay }}
        />

        <div
          className={`container relative mx-auto grid min-h-[calc(100svh-64px)] items-end px-4 pb-10 pt-20 md:items-center md:py-16 ${
            tenant?.domain === "boonbuyfind.net" ? "md:justify-items-end" : ""
          }`}
        >
          <div
            className={`max-w-[760px] ${
              tenant?.domain === "boonbuyfind.net" ? "md:w-[680px]" : ""
            }`}
          >
            {tenant?.domain !== "itaobuyindex.com" && (
              <div className="mb-5 flex items-center gap-3 text-sm font-bold text-white/78">
                <img
                  src={branding.logoPath}
                  alt={`${branding.siteName} icon`}
                  className="h-10 w-10 rounded-xl bg-white object-contain p-1.5 shadow-[0_10px_28px_rgba(4,31,43,0.22)]"
                />
                <span>{branding.heroEyebrow}</span>
              </div>
            )}
            <h1 className="max-w-[720px] text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-5xl lg:text-[64px]">
              <span className="block">{branding.heroPrimary}</span>
              <span
                className="mt-1 block"
                style={{ color: tenantHero.accentColor }}
              >
                {branding.heroSecondary}
              </span>
            </h1>
            <p className="mt-5 max-w-[590px] text-base leading-7 text-white/76 sm:text-lg">
              {branding.supportingLine}
            </p>
            {tenant?.domain === "bbdbuyeusheet.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 overflow-hidden border border-[#f6cd78]/30 bg-[#251d15]/28 text-[11px] font-semibold uppercase tracking-[0.075em] text-white/76 backdrop-blur-sm">
                <span className="px-3 py-3">Source</span>
                <span className="border-l border-[#f6cd78]/20 px-3 py-3 text-center">Variant</span>
                <span className="border-x border-[#f6cd78]/20 px-3 py-3 text-center">Evidence</span>
                <span className="px-3 py-3 text-right">Open</span>
              </div>
            ) : tenant?.domain === "bbdbuyeufinds.com" ? (
              <div className="mt-7 flex max-w-[660px] flex-wrap gap-x-7 gap-y-2 border-l-2 border-[#8fdcf4] pl-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/76">
                <span>Category map</span>
                <span>EU context</span>
                <span>Source check</span>
              </div>
            ) : tenant?.domain === "bbdbuyeus.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 border-y border-[#ffbd73]/38 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-white/76">
                <span>01 Product research</span>
                <span className="text-center">02 Warehouse facts</span>
                <span className="text-right">03 US route</span>
              </div>
            ) : tenant?.domain === "boonbuyfind.net" ? (
              <div className="mt-7 flex max-w-[660px] items-center gap-3 border-l-2 border-[#71e3dc] pl-4 text-xs font-semibold uppercase tracking-[0.09em] text-white/78">
                <span><b className="mr-1.5 text-[#71e3dc]">01</b>Find</span>
                <span className="h-px flex-1 bg-white/18" />
                <span><b className="mr-1.5 text-[#71e3dc]">02</b>Note</span>
                <span className="h-px flex-1 bg-white/18" />
                <span><b className="mr-1.5 text-[#71e3dc]">03</b>Verify</span>
              </div>
            ) : tenant?.domain === "cnshopperindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 border-y border-[#ffb25f]/38 py-4 text-[11px] font-semibold uppercase tracking-[0.075em] text-white/78">
                <span>01 Category</span>
                <span className="text-center">02 Listing</span>
                <span className="text-center">03 Option</span>
                <span className="text-right">04 Source</span>
              </div>
            ) : tenant?.domain === "eastmallbuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 overflow-hidden border border-[#f4c675]/30 bg-[#0d2d4a]/24 text-xs font-semibold uppercase tracking-[0.09em] text-white/78 backdrop-blur-sm">
                <span className="px-4 py-3">Keep</span>
                <span className="border-x border-[#f4c675]/20 px-4 py-3 text-center">Question</span>
                <span className="px-4 py-3 text-right">Drop</span>
              </div>
            ) : tenant?.domain === "fishgooindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-white/78">
                <span className="border-t border-[#8fdcf1]/55 bg-[#061326]/24 px-4 py-3 backdrop-blur-sm">Explore</span>
                <span className="border-t border-[#8fdcf1]/55 bg-[#061326]/24 px-4 py-3 text-center backdrop-blur-sm">Exact query</span>
                <span className="border-t border-[#8fdcf1]/55 bg-[#061326]/24 px-4 py-3 text-right backdrop-blur-sm">Image match</span>
              </div>
            ) : tenant?.domain === "goatedbuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#f4d38a]/28 bg-[#f4d38a]/18 text-left backdrop-blur-sm">
                <span className="bg-[#102219]/72 px-4 py-3"><b className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#f4d38a]">Match · 01</b><small className="mt-1 block text-xs font-medium text-white/76">Correct intent</small></span>
                <span className="bg-[#102219]/72 px-4 py-3"><b className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#f4d38a]">Proof · 02</b><small className="mt-1 block text-xs font-medium text-white/76">Visible details</small></span>
                <span className="bg-[#102219]/72 px-4 py-3"><b className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#f4d38a]">Distinct · 03</b><small className="mt-1 block text-xs font-medium text-white/76">Not a duplicate</small></span>
              </div>
            ) : tenant?.domain === "gtbuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-[auto_1fr] overflow-hidden border-y border-[#ffb07d]/42 text-left text-xs backdrop-blur-sm">
                <span className="border-r border-[#ffb07d]/24 px-4 py-3 font-bold uppercase tracking-[0.13em] text-[#ffb07d]">Research log</span>
                <span className="grid grid-cols-3 px-4 py-3 font-semibold uppercase tracking-[0.08em] text-white/76"><b>Query</b><b className="text-center">Inspect</b><b className="text-right">Record</b></span>
              </div>
            ) : tenant?.domain === "hipobuyindex.com" ? (
              <div className="mt-7 flex max-w-[660px] items-center gap-3 text-xs font-semibold text-white/78">
                <span className="rounded-full border border-[#ec9cff]/50 bg-[#080f28]/45 px-4 py-2 backdrop-blur-sm">Marketplace source</span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#ec9cff]/60 to-[#8fdcf1]/50" />
                <span className="rounded-full border border-[#b7a7ff]/45 bg-[#080f28]/45 px-4 py-2 backdrop-blur-sm">Listing snapshot</span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#8fdcf1]/50 to-[#ec9cff]/60" />
                <span className="rounded-full border border-[#ec9cff]/50 bg-[#080f28]/45 px-4 py-2 backdrop-blur-sm">Open questions</span>
              </div>
            ) : tenant?.domain === "hoobuyindex.net" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-[auto_repeat(3,1fr)] overflow-hidden rounded-xl border border-[#ffc86e]/34 bg-[#101722]/42 text-xs font-semibold text-white/78 backdrop-blur-sm">
                <span className="bg-[#ffc86e] px-4 py-3 font-extrabold uppercase tracking-[0.12em] text-[#2c1a0d]">Evidence gate</span>
                <span className="border-r border-white/14 px-4 py-3 text-center">Item identified</span>
                <span className="border-r border-white/14 px-4 py-3 text-center">Option visible</span>
                <span className="px-4 py-3 text-center">Source active</span>
              </div>
            ) : tenant?.domain === "itaobuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-[auto_1fr] border-y border-[#ffb44a]/40 text-xs text-white/78 backdrop-blur-sm">
                <span className="border-r border-[#ffb44a]/24 px-4 py-3 font-extrabold uppercase tracking-[0.13em] text-[#ffb44a]">
                  Archive trail
                </span>
                <span className="grid grid-cols-3 px-4 py-3 font-semibold uppercase tracking-[0.08em]">
                  <b>Search record</b>
                  <b className="text-center">Source record</b>
                  <b className="text-right">Open question</b>
                </span>
              </div>
            ) : tenant?.domain === "allchinabuyindex.com" ? (
              <div className="mt-7 grid max-w-[640px] grid-cols-3 border-y border-white/18 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/72">
                <span>01 Search</span>
                <span className="text-center">02 Compare</span>
                <span className="text-right">03 Confirm</span>
              </div>
            ) : tenant?.domain === "allchinabuyfinder.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-t border-white/20 pt-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/74">
                <span>Category first</span>
                <span className="text-center">Add one detail</span>
                <span className="text-right">Verify source</span>
              </div>
            ) : tenant?.domain === "cssbuycatalog.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-b border-[#7de5f3]/45 pb-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/74">
                <span>Choose category</span>
                <span className="text-center">Compare fields</span>
                <span className="text-right">Open source</span>
              </div>
            ) : tenant?.domain === "cssbuyindex.com" ? (
              <div className="mt-7 flex max-w-[660px] flex-wrap gap-x-7 gap-y-2 border-l-2 border-[#a9e47a] pl-4 text-xs font-semibold uppercase tracking-[0.11em] text-white/72">
                <span>Query phrase</span>
                <span>Listing fields</span>
                <span>Source check</span>
              </div>
            ) : tenant?.domain === "cssbuyitems.com" ? (
              <div className="mt-7 flex max-w-[660px] items-center gap-6 border-l-2 border-[#c8f3a6] pl-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/74">
                <span>Item page</span>
                <span>Options</span>
                <span>Source status</span>
              </div>
            ) : tenant?.domain === "kakobuyindex.net" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 overflow-hidden border-y border-[#ff526a]/38 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/76">
                <span>01 Query</span>
                <span className="text-center">02 Deduplicate</span>
                <span className="text-center">03 Retain</span>
                <span className="text-right">04 Recheck</span>
              </div>
            ) : tenant?.domain === "kakobuyitems.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 overflow-hidden rounded-xl border border-[#ffb2c0]/30 bg-[#071523]/30 text-xs font-semibold uppercase tracking-[0.09em] text-white/76 backdrop-blur-sm">
                <span className="px-4 py-3">Product evidence</span>
                <span className="border-x border-[#ffb2c0]/20 px-4 py-3 text-center">Option match</span>
                <span className="px-4 py-3 text-right">Source check</span>
              </div>
            ) : tenant?.domain === "litbuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 overflow-hidden border-y border-[#ffd400]/42 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/76">
                <span>01 Query</span>
                <span className="text-center">02 Group</span>
                <span className="text-center">03 Retain</span>
                <span className="text-right">04 Refresh</span>
              </div>
            ) : tenant?.domain === "litbuyitems.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-y border-[#ffd400]/45 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/74">
                <span>Listing</span>
                <span className="text-center">Visible options</span>
                <span className="text-right">Destination check</span>
              </div>
            ) : tenant?.domain === "litbuyproducts.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-t border-[#ffd400]/55 pt-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/74">
                <span>Map category</span>
                <span className="text-center">Set fields</span>
                <span className="text-right">Open source</span>
              </div>
            ) : tenant?.domain === "loongbuys.net" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 border-y border-[#ffba52]/42 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/76">
                <span>01 Link</span>
                <span className="text-center">02 QC</span>
                <span className="text-center">03 Weight</span>
                <span className="text-right">04 Route</span>
              </div>
            ) : tenant?.domain === "lovegobuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-l-2 border-[#ffb4ce]/75 pl-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/76">
                <span>Product group</span>
                <span className="text-center">Current stage</span>
                <span className="text-right">Next action</span>
              </div>
            ) : tenant?.domain === "mulebuyindex.net" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 border-y border-[#d6a8ff]/40 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/76">
                <span>01 Query</span>
                <span className="text-center">02 Match</span>
                <span className="text-center">03 Refresh</span>
                <span className="text-right">04 Retain</span>
              </div>
            ) : tenant?.domain === "mulebuyitems.com" ? (
              <div className="mt-7 flex max-w-[660px] items-center gap-3 text-xs font-semibold uppercase tracking-[0.09em] text-white/78">
                <span className="flex items-center gap-2"><b className="flex h-6 w-6 items-center justify-center rounded-full border border-[#c4a1ff]/55 text-[10px] text-[#dcc7ff]">1</b>Frame</span>
                <span className="h-px flex-1 bg-[#c4a1ff]/28" />
                <span className="flex items-center gap-2"><b className="flex h-6 w-6 items-center justify-center rounded-full border border-[#c4a1ff]/55 text-[10px] text-[#dcc7ff]">2</b>Options</span>
                <span className="h-px flex-1 bg-[#c4a1ff]/28" />
                <span className="flex items-center gap-2"><b className="flex h-6 w-6 items-center justify-center rounded-full border border-[#c4a1ff]/55 text-[10px] text-[#dcc7ff]">3</b>Source</span>
              </div>
            ) : tenant?.domain === "oopbuyindex.net" ? (
              <div className="mt-7 flex max-w-[660px] flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.085em] text-white/78">
                <span className="border border-[#73efe4]/42 bg-[#082b33]/48 px-3 py-2">Source · pass</span>
                <span className="border border-[#73efe4]/42 bg-[#082b33]/48 px-3 py-2">Option · pass</span>
                <span className="border border-[#ffcb6b]/50 bg-[#2d2614]/42 px-3 py-2">Evidence · review</span>
                <span className="border border-white/24 bg-white/5 px-3 py-2">Route · open</span>
              </div>
            ) : tenant?.domain === "orientdigindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-px overflow-hidden border border-[#ff9c61]/38 bg-[#ff9c61]/24 text-[11px] font-semibold uppercase tracking-[0.085em] text-white/78">
                <span className="bg-[#16191b]/80 px-3 py-3">Category fields</span>
                <span className="bg-[#16191b]/80 px-3 py-3 text-center">Evidence score</span>
                <span className="bg-[#16191b]/80 px-3 py-3 text-right">Source date</span>
              </div>
            ) : tenant?.domain === "parcelupindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 border-b border-t border-[#ffc166]/44 py-3 text-[11px] font-semibold uppercase tracking-[0.085em] text-white/78">
                <span>01 Order</span>
                <span className="text-center">02 Warehouse</span>
                <span className="text-center">03 Consolidate</span>
                <span className="text-right">04 Ship</span>
              </div>
            ) : tenant?.domain === "sugargooindex.net" ? (
              <div className="mt-7 flex max-w-[660px] items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/78">
                <span className="border border-[#ffc266]/48 bg-[#3a190f]/52 px-3 py-2">Source</span>
                <span className="h-px flex-1 bg-[#ffc266]/30" />
                <span className="border border-[#ffc266]/48 bg-[#3a190f]/52 px-3 py-2">Option</span>
                <span className="h-px flex-1 bg-[#ffc266]/30" />
                <span className="border border-[#ffc266]/48 bg-[#3a190f]/52 px-3 py-2">QC</span>
                <span className="h-px flex-1 bg-[#ffc266]/30" />
                <span className="border border-[#ffc266]/48 bg-[#3a190f]/52 px-3 py-2">Parcel</span>
              </div>
            ) : tenant?.domain === "superbuydeals.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-4 gap-px overflow-hidden border border-[#ffc24c]/36 bg-[#ffc24c]/22 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78">
                <span className="bg-[#2a100d]/82 px-3 py-3">Source</span>
                <span className="bg-[#2a100d]/82 px-3 py-3 text-center">Eligible</span>
                <span className="bg-[#2a100d]/82 px-3 py-3 text-center">Scope</span>
                <span className="bg-[#2a100d]/82 px-3 py-3 text-right">Status</span>
              </div>
            ) : tenant?.domain === "superbuyindex.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-y border-[#f29b38]/42 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/78">
                <span>01 Query</span>
                <span className="text-center">02 Group duplicates</span>
                <span className="text-right">03 Retain evidence</span>
              </div>
            ) : tenant?.domain === "superbuyitems.com" ? (
              <div className="mt-7 grid max-w-[660px] grid-cols-3 gap-5 border-b-2 border-[#ff765f]/70 pb-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/76">
                <span>01 Product page</span>
                <span className="text-center">02 Option check</span>
                <span className="text-right">03 Route</span>
              </div>
            ) : null}
            <div
              ref={searchRef}
              className={`w-full max-w-[760px] ${
                tenant?.domain === "bbdbuyeusheet.com" ||
                tenant?.domain === "bbdbuyeufinds.com" ||
                 tenant?.domain === "bbdbuyeus.com" ||
                 tenant?.domain === "boonbuyfind.net" ||
                 tenant?.domain === "cnshopperindex.com" ||
                 tenant?.domain === "eastmallbuyindex.com" ||
                 tenant?.domain === "fishgooindex.com" ||
                 tenant?.domain === "goatedbuyindex.com" ||
                 tenant?.domain === "gtbuyindex.com" ||
                 tenant?.domain === "hipobuyindex.com" ||
                 tenant?.domain === "hoobuyindex.net" ||
                  tenant?.domain === "itaobuyindex.com" ||
                tenant?.domain === "allchinabuyindex.com" ||
                tenant?.domain === "allchinabuyfinder.com" ||
                tenant?.domain === "cssbuycatalog.com" ||
                tenant?.domain === "cssbuyindex.com" ||
                tenant?.domain === "cssbuyitems.com" ||
                tenant?.domain === "kakobuyindex.net" ||
                tenant?.domain === "kakobuyitems.com" ||
                tenant?.domain === "litbuyindex.com" ||
                tenant?.domain === "litbuyitems.com" ||
                tenant?.domain === "litbuyproducts.com" ||
                tenant?.domain === "loongbuys.net" ||
                tenant?.domain === "lovegobuyindex.com" ||
                tenant?.domain === "mulebuyindex.net" ||
                tenant?.domain === "mulebuyitems.com" ||
                tenant?.domain === "oopbuyindex.net" ||
                tenant?.domain === "orientdigindex.com" ||
                tenant?.domain === "parcelupindex.com" ||
                tenant?.domain === "sugargooindex.net" ||
                tenant?.domain === "superbuydeals.com" ||
                tenant?.domain === "superbuyindex.com" ||
                tenant?.domain === "superbuyitems.com"
                  ? "mt-6"
                  : "mt-8"
              }`}
            >
              <SearchBox
                size="large"
                theme={
                  tenant?.domain === "bbdbuyeusheet.com"
                    ? "amber"
                    : tenant?.domain === "bbdbuyeufinds.com"
                    ? "cyan"
                    : tenant?.domain === "bbdbuyeus.com"
                    ? "amber"
                     : tenant?.domain === "boonbuyfind.net"
                     ? "amber"
                     : tenant?.domain === "cnshopperindex.com"
                     ? "amber"
                     : tenant?.domain === "eastmallbuyindex.com"
                     ? "amber"
                     : tenant?.domain === "fishgooindex.com"
                     ? "cyan"
                     : tenant?.domain === "goatedbuyindex.com"
                     ? "rose"
                     : tenant?.domain === "gtbuyindex.com"
                     ? "amber"
                     : tenant?.domain === "hipobuyindex.com"
                     ? "violet"
                     : tenant?.domain === "hoobuyindex.net"
                     ? "amber"
                     : tenant?.domain === "itaobuyindex.com"
                     ? "amber"
                      : tenant?.domain === "cssbuyindex.com"
                    ? "lime"
                    : tenant?.domain === "cssbuyitems.com"
                      ? "lime"
                    : tenant?.domain === "cssbuycatalog.com"
                      ? "cyan"
                      : tenant?.domain === "kakobuyindex.net" ||
                          tenant?.domain === "kakobuyitems.com"
                        ? "rose"
                      : tenant?.domain === "litbuyproducts.com"
                        ? "cyan"
                      : tenant?.domain === "litbuyindex.com" ||
                          tenant?.domain === "litbuyitems.com"
                        ? "amber"
                        : tenant?.domain === "loongbuys.net"
                          ? "amber"
                        : tenant?.domain === "lovegobuyindex.com"
                          ? "rose"
                        : tenant?.domain === "mulebuyindex.net"
                          ? "violet"
                        : tenant?.domain === "mulebuyitems.com"
                          ? "violet"
                        : tenant?.domain === "oopbuyindex.net"
                          ? "cyan"
                        : tenant?.domain === "orientdigindex.com"
                          ? "amber"
                        : tenant?.domain === "parcelupindex.com"
                          ? "amber"
                        : tenant?.domain === "sugargooindex.net"
                          ? "amber"
                        : tenant?.domain === "superbuydeals.com"
                          ? "rose"
                        : tenant?.domain === "superbuyindex.com"
                          ? "amber"
                        : tenant?.domain === "superbuyitems.com"
                          ? "blue"
                      : "emerald"
                }
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="home-hero-shell relative z-10 flex min-h-[calc(100svh-64px)] flex-col justify-center overflow-visible"
      style={{
        background:
          "radial-gradient(ellipse at 16% 84%, rgba(37, 99, 235, 0.26) 0%, transparent 42%), radial-gradient(ellipse at 84% 12%, rgba(126, 52, 176, 0.3) 0%, transparent 43%), linear-gradient(145deg, #030712 0%, #080d28 48%, #1b0d32 100%)",
      }}
    >
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary orb - top right */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] animate-[drift_12s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)",
          }}
        />
        {/* Accent orb - bottom left */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-[drift_10s_ease-in-out_infinite_reverse]"
          style={{
            background: "radial-gradient(circle, #2563EB 0%, transparent 70%)",
          }}
        />
        {/* Subtle secondary orb - center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-10 blur-[140px] animate-[drift_14s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
          }}
        />
        <StarField />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#080b20]/45"
      />

      {/* Main Content */}
      <div className="home-hero-content relative z-10 container mx-auto px-4 py-10 sm:py-12 md:py-14 lg:py-16">
        <FadeIn direction="down" duration={0.45}>
          <div className="home-hero-eyebrow mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/75 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {branding?.heroEyebrow || t("hero.eyebrow")}
            </span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn direction="down" duration={0.6}>
          <h1 className="home-hero-headline mx-auto mb-5 max-w-[1280px] text-center text-4xl font-bold leading-[1.03] tracking-[-0.05em] sm:text-5xl md:text-6xl lg:text-[68px] xl:text-[78px]">
              <span className="text-white">
                {branding?.heroPrimary || t("hero.headlinePrimary")}
              </span>
              <br />
              {" "}
              <span
                className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              style={{
                backgroundSize: "200% auto",
                animation: "shimmer 4s linear infinite",
              }}
            >
              {branding?.heroSecondary || t("hero.headlineSecondary")}
            </span>
          </h1>
        </FadeIn>

        <FadeIn direction="up" duration={0.5} delay={0.15}>
          <p className="home-hero-description mx-auto mb-8 max-w-3xl text-center text-sm leading-relaxed text-white/72 sm:text-base md:text-lg">
            {branding ? (
              branding.supportingLine
            ) : (
              <>
                {t("hero.descLine1")}
                <br className="hidden md:block" /> {t("hero.descLine2")}
              </>
            )}
          </p>
        </FadeIn>

        {/* Search */}
        <FadeIn direction="up" duration={0.5} delay={0.25}>
          <div
            ref={searchRef}
            className="relative mx-auto mb-4 w-full max-w-[1080px]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[940px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 blur-[88px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(129,140,248,0.18) 0%, rgba(255,122,78,0.18) 38%, transparent 74%)",
              }}
            />
            <SearchBox size="large" />
          </div>
        </FadeIn>

        <FadeIn direction="up" duration={0.35} delay={0.3}>
          <div className="home-hero-capabilities mx-auto mb-4 flex max-w-[960px] flex-wrap justify-center gap-2">
            {capabilityItems.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-primary/90" />
                  {item.label}
                </span>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn direction="up" duration={0.35} delay={0.34}>
          <div className="home-hero-agent mx-auto mb-5 flex max-w-[960px] items-center justify-center gap-3">
            <span className="hidden text-xs font-medium text-white/45 sm:inline">
              {t("hero.agentPrompt")}
            </span>
            <PlatformSelector variant="hero" />
          </div>
        </FadeIn>

        {/* Hot Searches */}
        <FadeIn direction="up" duration={0.4} delay={0.4}>
          <HotSearches
            limit={6}
            source="general"
            initialSearches={initialHotSearches}
            className="mx-auto max-w-[960px] [&>div]:justify-center [&_h2]:mb-2 [&_h2]:justify-center [&_h2]:text-xs [&_h2]:font-medium [&_h2]:text-white/50 [&_a]:px-3 [&_a]:py-1.5 [&_a]:text-xs [&_a]:bg-white/[0.05] [&_a]:text-white/72 [&_a]:backdrop-blur-sm [&_a:hover]:bg-white/[0.1] [&_a]:border [&_a]:border-white/[0.05]"
          />
        </FadeIn>
      </div>
    </section>
  );
}
