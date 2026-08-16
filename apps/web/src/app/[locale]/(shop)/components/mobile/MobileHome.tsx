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
  stats?: {
    totalProducts: number;
    totalBrands: number;
  };
}) {
  const { mutate } = useSWRConfig();
  const t = useTranslations("home");

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
            background:
              "radial-gradient(ellipse at 12% 86%, rgba(37, 99, 235, 0.28) 0%, transparent 44%), radial-gradient(ellipse at 88% 10%, rgba(126, 52, 176, 0.32) 0%, transparent 45%), linear-gradient(150deg, #030712 0%, #080d28 50%, #1b0d32 100%)",
          }}
        >
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#7C3AED]/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#2563EB]/25 blur-3xl" />
          <StarField compact />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#080b20]/45" />
          <div className="relative w-full py-2">
            <h1 className="max-w-[360px] text-[clamp(2.15rem,10vw,2.65rem)] font-extrabold leading-[1.02] tracking-[-0.05em]">
              <span className="block">{t("hero.headlinePrimary")}</span>
              <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t("hero.headlineSecondary")}
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/72">
              {t("hero.descLine1")} {t("hero.descLine2")}
            </p>
            <div className="mt-6">
              <SearchBox size="large" mobileCompact />
            </div>

            <HotSearches
              limit={3}
              source="general"
              initialSearches={initialHotSearches}
              className="mt-5 [&_h2]:mb-2 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-white/55 [&_a]:border [&_a]:border-white/[0.06] [&_a]:bg-white/[0.05] [&_a]:px-2.5 [&_a]:py-1.5 [&_a]:text-[11px] [&_a]:text-white/75"
            />
          </div>
        </section>

        {/* 分类横滑 */}
        <MobileCategoryScroll initialData={initialCategories} />

        {/* 品牌横滑 */}
        <MobileBrandScroll />

        <section className="px-4 pb-3 pt-1">
          <HomeRewardsBanner />
        </section>

        {/* 分割线 */}
        <div className="h-2 bg-gray-50" />

        {/* 商品推荐 */}
        <MobileProductFeed />
      </div>
    </MobilePullRefresh>
  );
}
