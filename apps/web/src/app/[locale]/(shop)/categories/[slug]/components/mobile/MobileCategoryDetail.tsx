'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { Loader2, Search } from 'lucide-react';
import MobileSearchOverlay from '@/components/mobile/MobileSearchOverlay';
import { MobileProductCard } from '@/components/mobile/ui/MobileProductCard';
import { MobileProductGridSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { MobileBackToTop } from '@/components/mobile/ui/MobileBackToTop';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import { Empty } from '@/components/ui/Empty';
import { Link } from '@/i18n/navigation';
import { fetcher } from '@/lib/api';
import { getLocalizedName } from '@/lib/utils';
import { OutboundSource } from '@/lib/search-tracking';
import type { ApiListResponse, Product, ProductListItem, Category } from '@/types';
import dynamic from 'next/dynamic';
import type { ViewMode } from '../../../../products/components/mobile/MobileSortBar';
import { ALL_FILTER_KEYS } from '@/components/filters/constants';
import type { FacetsData } from '@/components/filters/types';
import { countActiveFilters } from '@/lib/filter-utils';
import { computeHotThreshold } from '@/lib/utils';
import { useInfiniteReturnScrollRestoration } from '@/hooks/useInfiniteReturnScrollRestoration';

const MobileSortBar = dynamic(
  () => import('../../../../products/components/mobile/MobileSortBar'),
  {
    ssr: false,
    loading: () => (
      <div className="sticky top-12 z-[15] bg-surface border-b border-border">
        <div className="h-11" />
      </div>
    ),
  },
);
import MobileActiveFilters from '../../../../products/components/mobile/MobileActiveFilters';
import { MobileFilterSheet } from '../../../../products/components/mobile/MobileFilterSheet';

const PAGE_SIZE = 20;

interface MobileCategoryDetailProps {
  slug: string;
  initialCategory: Category | null;
  enabled?: boolean;
  initialProductsData?: ApiListResponse<Product> | null;
  initialFacetsData?: FacetsData | null;
}

/**
 * 移动端分类详情页
 *
 * 复用 MobileProductList 的无限滚动 + 筛选 + 排序模式，
 * 增加 category slug 约束。
 */
export default function MobileCategoryDetail({
  slug,
  initialCategory,
  enabled = true,
  initialProductsData,
  initialFacetsData,
}: MobileCategoryDetailProps) {
  const searchParams = useSearchParams();
  const t = useTranslations('categories');
  const tc = useTranslations('common');
  const tp = useTranslations('products');
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const initialMobilePage = useMemo<ApiListResponse<ProductListItem> | undefined>(
    () =>
      initialProductsData
        ? {
            ...initialProductsData,
            data: initialProductsData.data.slice(0, PAGE_SIZE).map(
              (product) =>
                ({
                  ...product,
                  price: {
                    min: Number(product.priceMin) || 0,
                    max: Number(product.priceMax) || 0,
                    currency: product.currency || 'CNY',
                  },
                }) as ProductListItem,
            ),
          }
        : undefined,
    [initialProductsData],
  );

  /* ─── 筛选参数 ─── */
  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    params.set('category', slug);
    params.set('sortBy', searchParams.get('sortBy') || 'popular');
    ALL_FILTER_KEYS.forEach((key) => {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    });
    return params.toString();
  }, [slug, searchParams]);

  /* ─── 获取 facets ─── */
  const { data: facetsData } = useSWR<FacetsData>(
    enabled || initialFacetsData ? `/products/facets?category=${slug}` : null,
    fetcher,
    {
      fallbackData: initialFacetsData ?? undefined,
      revalidateOnMount: initialFacetsData ? false : undefined,
    },
  );

  /* ─── useSWRInfinite 分页 ─── */
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiListResponse<ProductListItem> | null) => {
      if (!enabled) return null;
      if (previousPageData && previousPageData.data.length === 0) return null;
      return `/products?page=${pageIndex + 1}&limit=${PAGE_SIZE}&${filterQs}`;
    },
    [enabled, filterQs],
  );

  const {
    data: pages,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
  } = useSWRInfinite<ApiListResponse<ProductListItem>>(getKey, fetcher, {
    fallbackData: initialMobilePage ? [initialMobilePage] : undefined,
    revalidateFirstPage: false,
    revalidateOnMount: initialMobilePage ? false : undefined,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  /* ─── 扁平化 + 去重 ─── */
  const products = useMemo(() => {
    if (!pages) return [];
    const seen = new Set<string>();
    const result: ProductListItem[] = [];
    for (const page of pages) {
      for (const product of page.data || []) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        result.push({
          ...product,
          price: {
            min: Number(product.priceMin) || 0,
            max: Number(product.priceMax) || 0,
            currency: product.currency || 'CNY',
          },
        } as ProductListItem);
      }
    }
    return result;
  }, [pages]);

  const total = pages?.[0]?.meta?.total || 0;
  useInfiniteReturnScrollRestoration({
    enabled,
    size,
    setSize,
    isValidating,
    ready: !isLoading && products.length > 0,
  });
  const hotThreshold = useMemo(
    () => computeHotThreshold(products.map((p) => p.popularityScore ?? 0)),
    [products],
  );
  const isEmpty = pages?.[0]?.data?.length === 0;
  const lastPage = pages?.[pages.length - 1];
  const isNoMore = lastPage ? (lastPage.data?.length ?? 0) < PAGE_SIZE : false;
  const isLoadingMore = isValidating && size > 1 && pages && size > pages.length;

  /* ─── IntersectionObserver 触底 ─── */
  useEffect(() => {
    if (!enabled) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating && !isNoMore && !error) {
          setSize((s) => s + 1);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, isValidating, isNoMore, error, setSize]);

  /* ─── facets → brands ─── */
  const brands = (facetsData?.brands || []).map((b) => ({
    label: b.name,
    value: b.slug,
    count: b.count,
  }));

  return (
    <div className="min-h-dvh bg-background">
      {/* 子页面返回顶栏 */}
      <MobileSubPageHeader
        title={initialCategory ? getLocalizedName(initialCategory, locale) : slug}
        scrollHide
        rightAction={
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 transition-all duration-150"
          >
            <Search className="h-5 w-5 text-foreground" />
          </button>
        }
      />

      {/* 分类名称 */}
      <div className="px-4 pt-3 pb-1">
        <h1 className="text-lg font-bold text-foreground">
          {initialCategory ? getLocalizedName(initialCategory, locale) : slug}
        </h1>
      </div>

      {/* 子分类导航 + 热门品牌 */}
      {((initialCategory?.children && initialCategory.children.length > 0) ||
        (facetsData?.brands && facetsData.brands.length > 0)) && (
        <div className="px-4 py-2 space-y-2">
          {initialCategory?.children && initialCategory.children.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {initialCategory.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  prefetch={false}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-700 active:bg-primary/10"
                >
                  {getLocalizedName(child, locale)}
                </Link>
              ))}
            </div>
          )}
          {facetsData?.brands && facetsData.brands.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {facetsData.brands.slice(0, 8).map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  prefetch={false}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-600 active:border-primary"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 排序栏 */}
      <MobileSortBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        filterCount={countActiveFilters(searchParams)}
        onOpenFilter={() => setFilterOpen(true)}
        stickyTop="3rem"
        stickyTopHidden="0px"
      />

      {/* 已选筛选标签 */}
      <MobileActiveFilters />

      {/* 商品数量 */}
      <div className="px-4 py-2">
        <p className="text-xs text-muted">
          {isLoading ? tp('allProducts') : t('productCount', { count: total })}
        </p>
      </div>

      {/* 首次加载骨架屏 */}
      {isLoading && <MobileProductGridSkeleton count={6} />}

      {/* 商品网格 */}
      {products.length > 0 && (
        <div
          className={
            viewMode === 'list'
              ? 'flex flex-col gap-3 px-4'
              : viewMode === 'compact'
                ? 'grid grid-cols-3 gap-2 px-3'
                : 'grid grid-cols-2 gap-3 px-4'
          }
        >
          {products.map((product, index) => (
            <MobileProductCard
              key={`${product.id}-${index}`}
              product={product}
              source={OutboundSource.CATEGORY}
              position={index + 1}
              page={Math.floor(index / PAGE_SIZE) + 1}
              isHot={product.isFeatured || (product.popularityScore ?? 0) >= hotThreshold}
            />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && isEmpty && (
        <Empty title={t('noProducts')} description={t('noProductsDesc')} />
      )}

      {/* 底部状态 */}
      <div className="flex items-center justify-center py-6">
        {(isLoadingMore || isValidating) && !isLoading && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{tc('loading')}</span>
          </div>
        )}
        {isNoMore && products.length > 0 && (
          <p className="text-xs text-muted">{tc('noMore')}</p>
        )}
        {error && !isLoading && (
          <button
            type="button"
            onClick={() => setSize(size)}
            className="text-sm text-primary active:opacity-70"
          >
            {tc('loadFailed')}
          </button>
        )}
      </div>

      {/* 触底哨兵 */}
      <div ref={sentinelRef} className="h-1" />

      {/* 回到顶部 */}
      <MobileBackToTop />

      {/* 筛选 Sheet */}
      <MobileFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={facetsData?.categories || []}
        brands={brands}
        colors={facetsData?.colors || []}
        genders={facetsData?.genders || []}
        styles={facetsData?.styles || []}
        occasions={facetsData?.occasions || []}
        seasons={facetsData?.seasons || []}
        priceRange={facetsData?.priceRange || { min: 0, max: 100000 }}
        totalCount={total}
      />

      {/* 搜索浮层 */}
      <MobileSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
