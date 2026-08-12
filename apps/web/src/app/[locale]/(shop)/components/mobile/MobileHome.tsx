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
        <section className="relative overflow-hidden bg-secondary px-4 pb-5 pt-4 text-white">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-brand-indigo/20 blur-3xl" />
          <div className="relative">
            <h1 className="max-w-[350px] text-[30px] font-extrabold leading-[1.06] tracking-[-0.04em]">
              <span className="block">{t("hero.headlinePrimary")}</span>
              <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t("hero.headlineSecondary")}
              </span>
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
              {t("hero.descLine1")}
            </p>
            <div className="mt-4">
              <SearchBox size="large" mobileCompact />
            </div>

            <HotSearches
              limit={3}
              source="general"
              initialSearches={initialHotSearches}
              className="mt-2 [&_h2]:mb-1.5 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-white/55 [&_a]:border [&_a]:border-white/[0.06] [&_a]:bg-white/[0.05] [&_a]:px-2.5 [&_a]:py-1 [&_a]:text-[11px] [&_a]:text-white/75"
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
