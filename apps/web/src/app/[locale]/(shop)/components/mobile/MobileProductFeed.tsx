'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, ArrowRight } from 'lucide-react';
import useSWRInfinite from 'swr/infinite';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { MobileProductCard } from '@/components/mobile/ui/MobileProductCard';
import { MobileProductGridSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { fetcher } from '@/lib/api';
import { OutboundSource } from '@/lib/search-tracking';
import type { ApiListResponse, ProductListItem } from '@/types';
import { computeHotThreshold } from '@/lib/utils';

const PAGE_SIZE = 20;

/**
 * 移动端首页商品推荐区（双列网格 + 加载更多）
 *
 * 首批展示 20 个热门商品，后续按页加载，避免首页首屏过重。
 *
 * 线框：
 * 📦 为你推荐
 * ┌─────┐ ┌─────┐
 * │ 商品1 │ │ 商品2 │   ← 双列网格
 * └─────┘ └─────┘
 * ┌─────┐ ┌─────┐
 * │ 商品3 │ │ 商品4 │
 * └─────┘ └─────┘
 *    ↑ 无限滚动加载更多
 */
export default function MobileProductFeed() {
  const t = useTranslations('home');
  const tc = useTranslations('common');

  const getKey = (pageIndex: number, previousPageData: ApiListResponse<ProductListItem> | null) => {
    if (previousPageData && previousPageData.data.length === 0) return null;
    return `/products?sortBy=popular&page=${pageIndex + 1}&limit=${PAGE_SIZE}`;
  };

  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite<ApiListResponse<ProductListItem>>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const products = useMemo(() => {
    if (!pages) return [];

    const seen = new Set<string>();
    const flattened: ProductListItem[] = [];

    for (const page of pages) {
      for (const product of page.data ?? []) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        flattened.push(product);
      }
    }

    return flattened;
  }, [pages]);

  const total = pages?.[0]?.meta?.total ?? 0;
  const lastPage = pages?.[pages.length - 1];
  const isNoMore = lastPage ? (lastPage.data?.length ?? 0) < PAGE_SIZE : false;
  const isLoadingMore = isValidating && !isLoading;

  const handleLoadMore = () => {
    if (isLoadingMore || isNoMore) return;
    void setSize(size + 1);
  };

  const hotThreshold = useMemo(
    () => computeHotThreshold(products.map((p) => p.popularityScore ?? 0)),
    [products],
  );

  return (
    <section className="py-4">
      {/* 标题 + 查看全部 */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-semibold text-foreground">
          {t('showcase.popular')}
        </h2>
        <Link
          href="/products"
          className="flex items-center gap-0.5 text-xs text-primary font-medium"
        >
          {total > 0 ? tc('viewAll') : tc('loading')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 商品网格 */}
      {isLoading ? (
        <MobileProductGridSkeleton count={6} />
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-sm">{t('showcase.noProducts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {products.map((product, index) => (
            <MobileProductCard
              key={product.id}
              product={product}
              source={OutboundSource.HOME}
              position={index + 1}
              isHot={product.isFeatured || (product.popularityScore ?? 0) >= hotThreshold}
            />
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {!isLoading && products.length > 0 && (
        <div className="px-4 pt-4">
          {error ? (
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-primary active:opacity-70"
            >
              {tc('loadFailed')}
            </button>
          ) : isNoMore ? (
            <p className="py-2 text-center text-xs text-muted">{tc('noMore')}</p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full justify-center"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tc('loading')}
                </>
              ) : (
                t('showcase.loadMore')
              )}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
