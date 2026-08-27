"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import MobileCategoryScroll from "./MobileCategoryScroll";
import MobileBrandScroll from "./MobileBrandScroll";
import MobileProductFeed from "./MobileProductFeed";
import MobilePullRefresh from "@/components/mobile/MobilePullRefresh";
import HomeRewardsBanner from "@/components/rewards/HomeRewardsBanner";
import { useTranslations } from "next-intl";
import type { Category } from "@/types";
import SearchBox from "@/components/SearchBox";
import HotSearches from "@/components/HotSearches";
import StarField from "@/components/home/StarField";
import { useTenant } from "@/components/TenantProvider";
import UsfansQuickStart from "@/components/home/UsfansQuickStart";
import ItaobuyResearchArchive from "@/components/home/ItaobuyResearchArchive";
import { getTenantHeroVisual } from "@/lib/tenant-hero";

type CategoriesResponse = Category[] | { data: Category[] };

interface HotSearchItem {
  keyword: string;
  count: number;
}

/**
 * 移动端首页主组件
 *
 * 线框（Section 6.1）：
 * ┌───────────────────────┐
 * │ ↓ 下拉刷新              │
 * ├───────────────────────┤
 * │ 热门分类 [横向滚动]      │
 * ├───────────────────────┤
 * │ 精选品牌 [横向滚动]      │
 * ├───────────────────────┤
 * │ 为你推荐                │
 * │ ┌─────┐ ┌─────┐      │
 * │ │ 商品 │ │ 商品 │      │ ← 双列瀑布流
 * │ └─────┘ └─────┘      │
 * │    ↑ 无限滚动加载更多    │
 * └───────────────────────┘
 */
export default function MobileHome({
  initialCategories,
  initialHotSearches,
}: {
  initialCategories?: CategoriesResponse;
  initialHotSearches?: HotSearchItem[];
}) {
  const { mutate } = useSWRConfig();
  const t = useTranslations("home");
  const tenant = useTenant();
  const branding = tenant?.branding;
  const homeVariant = branding?.editorial.homeVariant;
  const tenantHero = getTenantHeroVisual(tenant?.domain);

  const handleRefresh = useCallback(async () => {
    // 重新验证所有首页 SWR 数据（分类、品牌、商品推荐）
    await mutate(
      (key) =>
        typeof key === "string" &&
        (key.startsWith("/products") ||
          key.startsWith("/categories") ||
          key.startsWith("/brands")),
      undefined,
      { revalidate: true },
    );
  }, [mutate]);

  return (
    <MobilePullRefresh onRefresh={handleRefresh}>
      <div className="pb-4">
        <section
          className={`relative flex min-h-[calc(100svh-112px)] items-center overflow-hidden px-4 py-8 text-white ${
            tenantHero ? "bg-[#0b2d3a]" : ""
          }`}
          style={{
            background: tenantHero
              ? undefined
              : "radial-gradient(ellipse at 12% 86%, rgba(37, 99, 235, 0.28) 0%, transparent 44%), radial-gradient(ellipse at 88% 10%, rgba(126, 52, 176, 0.32) 0%, transparent 45%), linear-gradient(150deg, #030712 0%, #080d28 50%, #1b0d32 100%)",
            backgroundColor: tenantHero?.backgroundColor,
          }}
        >
          {tenantHero ? (
            <>
              <img
                src={tenantHero.mobilePath}
                alt={tenantHero.alt}
                className="absolute inset-0 h-full w-full object-cover object-center"
                style={{ objectPosition: tenantHero.mobileObjectPosition }}
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: tenantHero.mobileOverlay }}
              />
            </>
          ) : (
            <>
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#7C3AED]/25 blur-3xl" />
              <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#2563EB]/25 blur-3xl" />
              <StarField compact />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#080b20]/45" />
            </>
          )}
          <div className="relative w-full py-2">
            {tenantHero &&
            branding &&
            tenant?.domain !== "itaobuyindex.com" ? (
              <div className="mb-4 flex items-center gap-2.5 text-xs font-bold text-white/78">
                {!tenant?.domain.startsWith("ydaexpress.") && (
                  <img
                    src={branding.logoPath}
                    alt={`${branding.siteName} icon`}
                    className="h-9 w-9 rounded-xl bg-white object-contain p-1.5 shadow-lg"
                  />
                )}
                <span>{branding.heroEyebrow}</span>
              </div>
            ) : null}
            <h1 className="max-w-[360px] text-[clamp(2.15rem,10vw,2.65rem)] font-extrabold leading-[1.02] tracking-[-0.05em]">
              <span className="block">
                {branding?.heroPrimary || t("hero.headlinePrimary")}
              </span>{" "}
              <span
                className={`mt-1 block ${
                  tenantHero
                    ? ""
                    : "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                }`}
                style={tenantHero ? { color: tenantHero.accentColor } : undefined}
              >
                {branding?.heroSecondary || t("hero.headlineSecondary")}
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/72">
              {branding?.supportingLine ||
                `${t("hero.descLine1")} ${t("hero.descLine2")}`}
            </p>
            {tenant?.domain === "bbdbuyeusheet.com" ? (
              <div className="mt-5 grid grid-cols-4 overflow-hidden border border-[#f6cd78]/30 bg-[#251d15]/28 text-[8px] font-semibold uppercase tracking-[0.025em] text-white/76 backdrop-blur-sm">
                <span className="px-1.5 py-3">Source</span>
                <span className="border-l border-[#f6cd78]/20 px-1.5 py-3 text-center">Variant</span>
                <span className="border-x border-[#f6cd78]/20 px-1.5 py-3 text-center">Evidence</span>
                <span className="px-1.5 py-3 text-right">Open</span>
              </div>
            ) : tenant?.domain === "bbdbuyeufinds.com" ? (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-l-2 border-[#8fdcf4] pl-3 text-[9px] font-semibold uppercase tracking-[0.055em] text-white/76">
                <span>Category map</span>
                <span>EU context</span>
                <span>Source check</span>
              </div>
            ) : tenant?.domain === "bbdbuyeus.com" ? (
              <div className="mt-5 grid grid-cols-3 border-y border-[#ffbd73]/38 py-3 text-[9px] font-semibold uppercase tracking-[0.035em] text-white/76">
                <span>01 Product</span>
                <span className="text-center">02 Warehouse</span>
                <span className="text-right">03 US route</span>
              </div>
            ) : tenant?.domain === "boonbuyfind.net" ? (
              <div className="mt-5 flex items-center gap-2 border-l-2 border-[#71e3dc] pl-3 text-[9px] font-semibold uppercase tracking-[0.04em] text-white/76">
                <span><b className="mr-1 text-[#71e3dc]">01</b>Find</span>
                <span className="h-px flex-1 bg-white/18" />
                <span><b className="mr-1 text-[#71e3dc]">02</b>Note</span>
                <span className="h-px flex-1 bg-white/18" />
                <span><b className="mr-1 text-[#71e3dc]">03</b>Verify</span>
              </div>
            ) : tenant?.domain === "cnshopperindex.com" ? (
              <div className="mt-5 grid grid-cols-4 border-y border-[#ffb25f]/38 py-3 text-[8px] font-semibold uppercase tracking-[0.025em] text-white/78">
                <span>Category</span>
                <span className="text-center">Listing</span>
                <span className="text-center">Option</span>
                <span className="text-right">Source</span>
              </div>
            ) : tenant?.domain === "eastmallbuyindex.com" ? (
              <div className="mt-5 grid grid-cols-3 overflow-hidden border border-[#f4c675]/30 bg-[#0d2d4a]/24 text-[9px] font-semibold uppercase tracking-[0.04em] text-white/78 backdrop-blur-sm">
                <span className="px-2 py-3">Keep</span>
                <span className="border-x border-[#f4c675]/20 px-2 py-3 text-center">Question</span>
                <span className="px-2 py-3 text-right">Drop</span>
              </div>
            ) : tenant?.domain === "fishgooindex.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-2 text-[8px] font-semibold uppercase tracking-[0.025em] text-white/78">
                <span className="border-t border-[#8fdcf1]/55 bg-[#061326]/24 px-2 py-3 backdrop-blur-sm">Explore</span>
                <span className="border-t border-[#8fdcf1]/55 bg-[#061326]/24 px-2 py-3 text-center backdrop-blur-sm">Exact query</span>
                <span className="border-t border-[#8fdcf1]/55 bg-[#061326]/24 px-2 py-3 text-right backdrop-blur-sm">Image match</span>
              </div>
            ) : tenant?.domain === "goatedbuyindex.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[#f4d38a]/28 bg-[#f4d38a]/18 text-left backdrop-blur-sm">
                <span className="bg-[#102219]/72 px-2 py-2.5"><b className="block text-[8px] font-bold uppercase tracking-[0.05em] text-[#f4d38a]">Match · 01</b><small className="mt-1 block text-[8px] font-medium text-white/76">Correct intent</small></span>
                <span className="bg-[#102219]/72 px-2 py-2.5"><b className="block text-[8px] font-bold uppercase tracking-[0.05em] text-[#f4d38a]">Proof · 02</b><small className="mt-1 block text-[8px] font-medium text-white/76">Visible details</small></span>
                <span className="bg-[#102219]/72 px-2 py-2.5"><b className="block text-[8px] font-bold uppercase tracking-[0.05em] text-[#f4d38a]">Distinct · 03</b><small className="mt-1 block text-[8px] font-medium text-white/76">Not duplicate</small></span>
              </div>
            ) : tenant?.domain === "gtbuyindex.com" ? (
              <div className="mt-5 grid grid-cols-[auto_1fr] overflow-hidden border-y border-[#ffb07d]/42 text-left text-[8px] backdrop-blur-sm">
                <span className="border-r border-[#ffb07d]/24 px-2 py-3 font-bold uppercase tracking-[0.05em] text-[#ffb07d]">Log</span>
                <span className="grid grid-cols-3 px-2 py-3 font-semibold uppercase tracking-[0.025em] text-white/76"><b>Query</b><b className="text-center">Inspect</b><b className="text-right">Record</b></span>
              </div>
            ) : tenant?.domain === "hipobuyindex.com" ? (
              <div className="mt-5 flex items-center gap-1.5 text-[8px] font-semibold text-white/78">
                <span className="rounded-full border border-[#ec9cff]/50 bg-[#080f28]/45 px-2 py-2 text-center backdrop-blur-sm">Source</span>
                <span className="h-px flex-1 bg-[#b7a7ff]/45" />
                <span className="rounded-full border border-[#b7a7ff]/45 bg-[#080f28]/45 px-2 py-2 text-center backdrop-blur-sm">Snapshot</span>
                <span className="h-px flex-1 bg-[#b7a7ff]/45" />
                <span className="rounded-full border border-[#ec9cff]/50 bg-[#080f28]/45 px-2 py-2 text-center backdrop-blur-sm">Questions</span>
              </div>
            ) : tenant?.domain === "hoobuyindex.net" ? (
              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-[#ffc86e]/34 bg-[#101722]/42 text-[8px] font-semibold text-white/78 backdrop-blur-sm">
                <span className="border-r border-white/14 px-2 py-2.5 text-center"><b className="block text-[#ffc86e]">01</b>Item</span>
                <span className="border-r border-white/14 px-2 py-2.5 text-center"><b className="block text-[#ffc86e]">02</b>Option</span>
                <span className="px-2 py-2.5 text-center"><b className="block text-[#ffc86e]">03</b>Source</span>
              </div>
            ) : tenant?.domain === "itaobuyindex.com" ? (
              <div className="mt-5 grid grid-cols-3 border-y border-[#ffb44a]/40 py-3 text-[8px] font-semibold uppercase tracking-[0.03em] text-white/78">
                <span>Search record</span>
                <span className="text-center">Source record</span>
                <span className="text-right">Open question</span>
              </div>
            ) : tenant?.domain === "allchinabuyindex.com" ? (
              <div className="mt-5 grid grid-cols-3 border-y border-white/18 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/72">
                <span>01 Search</span>
                <span className="text-center">02 Compare</span>
                <span className="text-right">03 Confirm</span>
              </div>
            ) : tenant?.domain === "allchinabuyfinder.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-[9px] font-semibold uppercase tracking-[0.05em] text-white/74">
                <span>Category first</span>
                <span className="text-center">Add detail</span>
                <span className="text-right">Verify source</span>
              </div>
            ) : tenant?.domain === "cssbuycatalog.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-2 border-b border-[#7de5f3]/45 pb-3 text-[9px] font-semibold uppercase tracking-[0.05em] text-white/74">
                <span>Choose category</span>
                <span className="text-center">Compare fields</span>
                <span className="text-right">Open source</span>
              </div>
            ) : tenant?.domain === "cssbuyindex.com" ? (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-l-2 border-[#a9e47a] pl-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-white/72">
                <span>Query phrase</span>
                <span>Listing fields</span>
                <span>Source check</span>
              </div>
            ) : tenant?.domain === "cssbuyitems.com" ? (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-l-2 border-[#c8f3a6] pl-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-white/72">
                <span>Item page</span>
                <span>Options</span>
                <span>Source status</span>
              </div>
            ) : tenant?.domain === "kakobuyitems.com" ? (
              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-[#ffb2c0]/30 bg-[#071523]/30 text-[9px] font-semibold uppercase tracking-[0.04em] text-white/76 backdrop-blur-sm">
                <span className="px-2 py-3">Evidence</span>
                <span className="border-x border-[#ffb2c0]/20 px-2 py-3 text-center">Options</span>
                <span className="px-2 py-3 text-right">Source</span>
              </div>
            ) : tenant?.domain === "litbuyitems.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-2 border-y border-[#ffd400]/45 py-3 text-[9px] font-semibold uppercase tracking-[0.05em] text-white/74">
                <span>Listing</span>
                <span className="text-center">Options</span>
                <span className="text-right">Destination</span>
              </div>
            ) : tenant?.domain === "litbuyproducts.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#ffd400]/55 pt-3 text-[9px] font-semibold uppercase tracking-[0.05em] text-white/74">
                <span>Browse category</span>
                <span className="text-center">Compare options</span>
                <span className="text-right">Check source</span>
              </div>
            ) : tenant?.domain === "mulebuyitems.com" ? (
              <div className="mt-5 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.04em] text-white/76">
                <span className="flex items-center gap-1.5"><b className="flex h-5 w-5 items-center justify-center rounded-full border border-[#c4a1ff]/55 text-[8px] text-[#dcc7ff]">1</b>Frame</span>
                <span className="h-px flex-1 bg-[#c4a1ff]/28" />
                <span className="flex items-center gap-1.5"><b className="flex h-5 w-5 items-center justify-center rounded-full border border-[#c4a1ff]/55 text-[8px] text-[#dcc7ff]">2</b>Options</span>
                <span className="h-px flex-1 bg-[#c4a1ff]/28" />
                <span className="flex items-center gap-1.5"><b className="flex h-5 w-5 items-center justify-center rounded-full border border-[#c4a1ff]/55 text-[8px] text-[#dcc7ff]">3</b>Source</span>
              </div>
            ) : tenant?.domain === "superbuyitems.com" ? (
              <div className="mt-5 grid grid-cols-3 gap-2 border-b-2 border-[#ff765f]/70 pb-3 text-[9px] font-semibold uppercase tracking-[0.04em] text-white/76">
                <span>01 Product</span>
                <span className="text-center">02 Options</span>
                <span className="text-right">03 Route</span>
              </div>
            ) : tenant?.domain === "ydaexpress.net" ? (
              <div className="mt-5 grid grid-cols-4 border-y border-[#58dfcc]/40 py-3 text-[8px] font-semibold uppercase tracking-[0.025em] text-white/78">
                <span>Contents</span>
                <span className="text-center">Size</span>
                <span className="text-center">Rules</span>
                <span className="text-right">Handoff</span>
              </div>
            ) : tenant?.domain === "ydaexpress.org" ? (
              <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border border-[#ef934f]/34 bg-[#ef934f]/18 text-[8px] font-semibold uppercase tracking-[0.025em] text-white/78">
                <span className="bg-[#211711]/78 px-2 py-3">Claim</span>
                <span className="bg-[#211711]/78 px-2 py-3 text-center">Source</span>
                <span className="bg-[#211711]/78 px-2 py-3 text-right">Open</span>
              </div>
            ) : null}
            <div className="mt-6">
              <SearchBox
                size="large"
                mobileCompact
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
                    : tenant?.domain === "kakobuyitems.com"
                      ? "rose"
                    : tenant?.domain === "litbuyproducts.com" ||
                        tenant?.domain === "litbuyitems.com"
                      ? "amber"
                    : tenant?.domain === "superbuyitems.com"
                      ? "blue"
                    : tenant?.domain === "mulebuyitems.com"
                      ? "violet"
                    : tenant?.domain === "ydaexpress.org"
                      ? "amber"
                    : tenantHero
                      ? "emerald"
                      : "default"
                }
              />
            </div>

            <HotSearches
              limit={3}
              source="general"
              initialSearches={initialHotSearches}
              className="mt-5 [&_h2]:mb-2 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-white/55 [&_a]:border [&_a]:border-white/[0.06] [&_a]:bg-white/[0.05] [&_a]:px-2.5 [&_a]:py-1.5 [&_a]:text-[11px] [&_a]:text-white/75"
            />
          </div>
        </section>

        {homeVariant === "archive" ? (
          <>
            <ItaobuyResearchArchive compact />
            <MobileCategoryScroll initialData={initialCategories} />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
            <MobileBrandScroll />
          </>
        ) : homeVariant === "items" ? (
          <>
            <UsfansQuickStart compact />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : (
          <>
            {homeVariant === "catalog" && (
              <MobileCategoryScroll initialData={initialCategories} />
            )}

            {homeVariant && <UsfansQuickStart compact />}

            {homeVariant === "guide" && <MobileBrandScroll />}

            {homeVariant !== "catalog" && (
              <MobileCategoryScroll initialData={initialCategories} />
            )}

            {homeVariant !== "guide" && <MobileBrandScroll />}

            {!homeVariant && (
              <section className="px-4 pb-3 pt-1">
                <HomeRewardsBanner />
              </section>
            )}

            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        )}
      </div>
    </MobilePullRefresh>
  );
}
