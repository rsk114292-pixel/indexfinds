'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { Loader2, Search } from 'lucide-react';
import MobileSearchOverlay from '@/components/mobile/MobileSearchOverlay';
import { MobileProductCard } from '@/components/mobile/ui/MobileProductCard';
import { MobileProductGridSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { MobileBackToTop } from '@/components/mobile/ui/MobileBackToTop';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import { Empty } from '@/components/ui/Empty';
import { Tag } from '@/components/ui/Tag';
import { Link } from '@/i18n/navigation';
import { fetcher } from '@/lib/api';
import { getLocalizedName } from '@/lib/utils';
import { useLocale } from 'next-intl';
import type { Brand, ApiListResponse, ProductListItem, Category } from '@/types';
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

interface MobileBrandDetailProps {
  slug: string;
  brand: Brand | null;
  enabled?: boolean;
}

/**
 * 移动端品牌详情页
 *
 * 复用 MobileProductList 的无限滚动 + 筛选 + 排序模式，
 * 增加 brand slug 约束。
 */
export default function MobileBrandDetail({
  slug,
  brand,
  enabled = true,
}: MobileBrandDetailProps) {
  const searchParams = useSearchParams();
  const t = useTranslations('brands');
  const tc = useTranslations('common');
  const tp = useTranslations('products');
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  /* ─── 筛选参数 ─── */
  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    if (brand?.slug) params.set('brands', brand.slug);
    params.set('sortBy', searchParams.get('sortBy') || 'popular');
    ALL_FILTER_KEYS.filter((k) => k !== 'brands').forEach((key) => {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    });
    return params.toString();
  }, [brand?.slug, searchParams]);

  /* ─── 获取 facets ─── */
  const { data: facetsData } = useSWR<FacetsData>(
    enabled && brand?.slug ? `/products/facets?brands=${brand.slug}` : null,
    fetcher,
  );

  /* ─── 获取品牌所属分类 ─── */
  const { data: brandCategories } = useSWR<
    Array<Category & { productCount: number }>
  >(
    enabled && slug ? `/brands/slug/${slug}/categories` : null,
    fetcher,
  );

  /* ─── 获取相关品牌 ─── */
  const { data: relatedBrands } = useSWR<Brand[]>(
    enabled && slug ? `/brands/slug/${slug}/related?limit=8` : null,
    fetcher,
  );

  /* ─── useSWRInfinite 分页 ─── */
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiListResponse<ProductListItem> | null) => {
      if (!enabled || !brand?.slug) return null;
      if (previousPageData && previousPageData.data.length === 0) return null;
      return `/products?page=${pageIndex + 1}&limit=${PAGE_SIZE}&${filterQs}`;
    },
    [enabled, brand?.slug, filterQs],
  );

  const {
    data: pages,
    error,
    size,
    setSize,
    isLoading,
    isValidating,
  } = useSWRInfinite<ApiListResponse<ProductListItem>>(getKey, fetcher, {
    revalidateFirstPage: false,
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

  return (
    <div className="min-h-dvh bg-background">
      {/* 子页面返回顶栏 */}
      <MobileSubPageHeader
        title={brand?.name || slug}
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

      {/* 品牌头部 */}
      {brand && (
        <div className="px-4 pt-3 pb-3 flex items-center gap-3">
          {brand.logoUrl ? (
            <div className="w-12 h-12 relative flex-shrink-0 rounded-xl overflow-hidden bg-white border border-border">
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                fill
                className="object-contain p-0.5"
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-gray-400">
                {brand.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground truncate">
                {brand.name}
              </h1>
              {(brand.tier === 1 || brand.tier === 2) && (
                <Tag color="accent" size="sm">{t('popular')}</Tag>
              )}
            </div>
            {brand.description && (
              <p className="text-xs text-muted line-clamp-1 mt-0.5">
                {brand.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 分类标签 + 相关品牌 */}
      {((brandCategories && brandCategories.length > 0) ||
        (relatedBrands && relatedBrands.length > 0)) && (
        <div className="px-4 py-2 space-y-2">
          {brandCategories && brandCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {brandCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  prefetch={false}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-700 active:bg-primary/10"
                >
                  {getLocalizedName(cat, locale)}
                </Link>
              ))}
            </div>
          )}
          {relatedBrands && relatedBrands.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {relatedBrands.map((rb) => (
                <Link
                  key={rb.id}
                  href={`/brands/${rb.slug}`}
                  prefetch={false}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-600 active:border-primary"
                >
                  {rb.name}
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
        filterCount={countActiveFilters(searchParams, ['brands'])}
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
        brands={[]}
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
