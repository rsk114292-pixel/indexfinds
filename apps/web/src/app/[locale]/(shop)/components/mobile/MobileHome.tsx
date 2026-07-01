'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import MobileCategoryScroll from './MobileCategoryScroll';
import MobileBrandScroll from './MobileBrandScroll';
import MobileProductFeed from './MobileProductFeed';
import MobilePullRefresh from '@/components/mobile/MobilePullRefresh';
import HomeRewardsBanner from '@/components/rewards/HomeRewardsBanner';
import type { Category } from '@/types';

type CategoriesResponse = Category[] | { data: Category[] };

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
}: {
  initialCategories?: CategoriesResponse;
}) {
  const { mutate } = useSWRConfig();

  const handleRefresh = useCallback(async () => {
    // 重新验证所有首页 SWR 数据（分类、品牌、商品推荐）
    await mutate(
      (key) => typeof key === 'string' && (
        key.startsWith('/products') ||
        key.startsWith('/categories') ||
        key.startsWith('/brands')
      ),
      undefined,
      { revalidate: true },
    );
  }, [mutate]);

  return (
    <MobilePullRefresh onRefresh={handleRefresh}>
      <div className="pb-4">
        <section className="px-4 pt-3 pb-2">
          <HomeRewardsBanner />
        </section>

        {/* 分类横滑 */}
        <MobileCategoryScroll initialData={initialCategories} />

        {/* 品牌横滑 */}
        <MobileBrandScroll />

        {/* 分割线 */}
        <div className="h-2 bg-gray-50" />

        {/* 商品推荐 */}
        <MobileProductFeed />
      </div>
    </MobilePullRefresh>
  );
}
