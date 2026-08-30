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
  const isCenteredLitbuyHero =
    tenant?.domain === "litbuyindex.com" ||
    tenant?.domain === "litbuyitems.com" ||
    tenant?.domain === "litbuyproducts.com";
  const isTenantHomepage = Boolean(branding);

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
          className="relative flex min-h-[calc(100svh-112px)] items-center overflow-hidden px-4 py-8 text-white"
          style={{
            background: isTenantHomepage
              ? "radial-gradient(ellipse at 50% 72%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 52%), linear-gradient(150deg, #07090d 0%, #0c1017 58%, #11151c 100%)"
              : "radial-gradient(ellipse at 12% 86%, rgba(37, 99, 235, 0.28) 0%, transparent 44%), radial-gradient(ellipse at 88% 10%, rgba(126, 52, 176, 0.32) 0%, transparent 45%), linear-gradient(150deg, #030712 0%, #080d28 50%, #1b0d32 100%)",
          }}
        >
          {!isTenantHomepage ? (
            <>
              <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#7C3AED]/25 blur-3xl" />
              <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#2563EB]/25 blur-3xl" />
              <StarField compact />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#080b20]/45" />
            </>
          ) : null}
          <div
            className={`relative w-full py-2 ${
              isTenantHomepage ? "text-center" : ""
            }`}
          >
            {branding && tenant?.domain !== "itaobuyindex.com" ? (
              <div
                className={`mb-4 flex items-center gap-2.5 text-xs font-bold text-white/78 ${
                  isTenantHomepage ? "justify-center" : ""
                }`}
              >
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
            <h1
              className={`max-w-[360px] text-[clamp(2.15rem,10vw,2.65rem)] font-extrabold leading-[1.02] tracking-[-0.05em] ${
                isTenantHomepage ? "mx-auto" : ""
              }`}
            >
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
            <p
              className={`mt-5 max-w-sm text-sm leading-6 text-white/72 ${
                isTenantHomepage ? "mx-auto" : ""
              }`}
            >
              {branding?.supportingLine ||
                `${t("hero.descLine1")} ${t("hero.descLine2")}`}
            </p>
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
                    : isCenteredLitbuyHero
                      ? "yellow"
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

        {tenant?.domain === "goatedbuyindex.com" ? (
          <>
            <UsfansQuickStart compact />
            <MobileCategoryScroll initialData={initialCategories} />
          </>
        ) : tenant?.domain === "gtbuyindex.com" ? (
          <>
            <UsfansQuickStart compact />
            <MobileBrandScroll />
          </>
        ) : tenant?.domain === "hipobuyindex.com" ? (
          <>
            <MobileBrandScroll />
            <MobileCategoryScroll initialData={initialCategories} />
          </>
        ) : tenant?.domain === "hoobuyindex.net" ? (
          <>
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : tenant?.domain === "superbuydeals.com" ? (
          <>
            <UsfansQuickStart compact />
            <MobileCategoryScroll initialData={initialCategories} />
          </>
        ) : tenant?.domain === "superbuyindex.com" ? (
          <>
            <MobileCategoryScroll initialData={initialCategories} />
            <UsfansQuickStart compact />
          </>
        ) : tenant?.domain === "superbuyitems.com" ? (
          <>
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
            <UsfansQuickStart compact />
            <MobileBrandScroll />
          </>
        ) : homeVariant === "archive" ? (
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
        ) : tenant?.domain === "usfansindex.net" ? (
          <>
            <UsfansQuickStart compact />
            <MobileBrandScroll />
            <MobileCategoryScroll initialData={initialCategories} />
          </>
        ) : tenant?.domain === "yoybuyindex.com" ? (
          <>
            <MobileCategoryScroll initialData={initialCategories} />
            <UsfansQuickStart compact />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : tenant?.domain === "eastmallbuyindex.com" ? (
          <>
            <UsfansQuickStart compact />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : tenant?.domain === "fishgooindex.com" ? (
          <>
            <MobileCategoryScroll initialData={initialCategories} />
            <MobileBrandScroll />
            <UsfansQuickStart compact />
          </>
        ) : tenant?.domain === "kameymallindex.com" ? (
          <>
            <MobileBrandScroll />
            <UsfansQuickStart compact />
            <MobileCategoryScroll initialData={initialCategories} />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : tenant?.domain === "joyabuyfinds.com" ? (
          <>
            <MobileCategoryScroll initialData={initialCategories} />
            <UsfansQuickStart compact />
            <MobileBrandScroll />
          </>
        ) : tenant?.domain === "joyagooindex.com" ? (
          <>
            <UsfansQuickStart compact />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : tenant?.domain === "orientdigindex.com" ? (
          <>
            <UsfansQuickStart compact />
            <MobileCategoryScroll initialData={initialCategories} />
          </>
        ) : tenant?.domain === "parcelupindex.com" ? (
          <>
            <UsfansQuickStart compact />
            <div className="h-2 bg-gray-50" />
            <MobileProductFeed />
          </>
        ) : tenant?.domain === "sugargooindex.net" ? (
          <>
            <MobileCategoryScroll initialData={initialCategories} />
            <UsfansQuickStart compact />
            <MobileBrandScroll />
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
