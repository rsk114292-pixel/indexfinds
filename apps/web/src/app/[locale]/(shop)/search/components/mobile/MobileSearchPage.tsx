'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Loader2, Search } from 'lucide-react';
import { MobileProductCard } from '@/components/mobile/ui/MobileProductCard';
import { MobileProductGridSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { Empty } from '@/components/ui/Empty';
import { fetcher } from '@/lib/api';
import { recordImpressions, OutboundSource } from '@/lib/search-tracking';
import { trackGA4Event } from '@/lib/ga-events';
import { getSearchPreferenceParams } from '@/lib/browsing-history';
import type { ApiListResponse, ProductListItem } from '@/types';
import { MobileBackToTop } from '@/components/mobile/ui/MobileBackToTop';
import MobileSearchResultsHeader from '@/components/mobile/MobileSearchResultsHeader';
import MobileSearchSortBar from './MobileSearchSortBar';
import { MobileSearchFilterSheet } from './MobileSearchFilterSheet';
import { ALL_FILTER_KEYS } from '@/components/filters/constants';
import type { FacetsData } from '@/components/filters/types';
import { countActiveFilters } from '@/lib/filter-utils';
import { computeHotThreshold } from '@/lib/utils';
import { useInfiniteReturnScrollRestoration } from '@/hooks/useInfiniteReturnScrollRestoration';
import { buildAuthRedirectPath } from '@/lib/auth-redirect';
import { usePathname } from 'next/navigation';
import { SearchProductRequestPrompt } from '../SearchProductRequestPrompt';

const PAGE_SIZE = 16; // D3 决策：移动端独立 limit=16
const SEARCH_REQUEST_THRESHOLD = 50;

/**
 * 移动端搜索结果页
 *
 * 特点：
 * - 独立 SWR 请求，limit=16（与桌面端 24 解耦）
 * - 无限滚动 + IntersectionObserver
 * - 搜索栏已集成到全局 MobileHeader
 * - sticky 排序栏 + 筛选 Sheet
 */
export default function MobileSearchPage({ enabled = true }: { enabled?: boolean }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations('search');
  const tc = useTranslations('common');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const impressionRecordedRef = useRef<Set<string>>(new Set());

  const q = searchParams.get('q') || '';
  const [filterOpen, setFilterOpen] = useState(false);

  // User preference params (from localStorage)
  const [preferenceParams, setPreferenceParams] = useState<{
    preferredBrands?: string;
    preferredCategories?: string;
  }>({});

  useEffect(() => {
    if (!enabled) return;
    const prefs = getSearchPreferenceParams();
    setPreferenceParams(prefs);
  }, [enabled]);

  // Build filter query string
  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    params.set('limit', String(PAGE_SIZE));

    const sortBy = searchParams.get('sortBy') || 'popular';
    params.set('sortBy', sortBy);

    ALL_FILTER_KEYS.forEach((key) => {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    });

    // Personalization
    if (preferenceParams.preferredBrands) {
      params.set('preferredBrands', preferenceParams.preferredBrands);
    }
    if (preferenceParams.preferredCategories) {
      params.set('preferredCategories', preferenceParams.preferredCategories);
    }

    return params.toString();
  }, [searchParams, q, preferenceParams]);

  // SWR Infinite for products
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiListResponse<ProductListItem> | null) => {
      if (!enabled) return null;
      if (!q) return null;
      if (previousPageData && previousPageData.data.length === 0) return null;
      return `/products?page=${pageIndex + 1}&${filterQs}`;
    },
    [enabled, filterQs, q],
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

  // Facets for filter sheet
  const { data: facetsData } = useSWR<FacetsData>(
    enabled && q ? `/products/facets?search=${encodeURIComponent(q)}` : null,
    fetcher,
  );

  // Flatten products + dedup
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
            min: parseFloat(String(product.priceMin ?? 0)) || 0,
            max: parseFloat(String(product.priceMax ?? 0)) || 0,
            currency: product.currency || 'CNY',
          },
        });
      }
    }
    return result;
  }, [pages]);

  // Extract meta from first page
  const firstPageMeta = pages?.[0]?.meta;
  const total = firstPageMeta?.total || 0;
  const searchLogId = firstPageMeta?.searchLogId;
  const usedFallback = firstPageMeta?.usedFallback === true;
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
  const locale = pathname?.split('/')[1] || 'en';
  const redirectPath = useMemo(
    () => buildAuthRedirectPath(pathname || '/search', searchParams),
    [pathname, searchParams],
  );
  const requestFiltersSnapshot = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  // Pagination state
  const isEmpty = pages?.[0]?.data?.length === 0;
  const lastPage = pages?.[pages.length - 1];
  const isNoMore = lastPage ? (lastPage.data?.length ?? 0) < PAGE_SIZE : false;
  const isLoadingMore = isValidating && size > 1 && pages && size > pages.length;
  const shouldShowSearchRequestPrompt =
    !isLoading && (usedFallback || total <= SEARCH_REQUEST_THRESHOLD);

  // Record search impressions (GA4 + internal)
  useEffect(() => {
    if (!enabled) return;
    if (!searchLogId || !pages) return;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNum = i + 1;
      const impressionKey = `${searchLogId}-${pageNum}`;
      if (impressionRecordedRef.current.has(impressionKey)) continue;
      if (!page.data?.length) continue;

      const impressions = page.data.map((product, index: number) => ({
        productId: product.id,
        position: i * PAGE_SIZE + index + 1,
      }));

      recordImpressions(searchLogId, impressions, pageNum);
      impressionRecordedRef.current.add(impressionKey);
    }

    // GA4 for the first page
    if (!impressionRecordedRef.current.has(`ga4-${searchLogId}`)) {
      trackGA4Event('view_search_results', {
        search_term: q,
        page: 1,
        results_count: total,
      });
      impressionRecordedRef.current.add(`ga4-${searchLogId}`);
    }
  }, [enabled, searchLogId, pages, q, total]);

  // IntersectionObserver for infinite scroll
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

  // Active filter count
  const filterCount = useMemo(() => countActiveFilters(searchParams), [searchParams]);

  // Facets for filter sheet
  const brands = (facetsData?.brands || []).map((b) => ({
    label: b.name,
    value: b.slug,
    count: b.count,
  }));

  // No search query: show empty state with search prompt
  if (!q) {
    return (
      <div className="min-h-dvh bg-background">
        <MobileSearchResultsHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Search className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-base font-medium text-foreground mb-1">
            {t('enterKeyword')}
          </p>
          <p className="text-sm text-muted text-center">
            {t('enterKeywordDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* 搜索结果页专用 Header */}
      <MobileSearchResultsHeader query={q} />

      {/* Sort bar + filter */}
      {!usedFallback && (
        <MobileSearchSortBar filterCount={filterCount} onOpenFilter={() => setFilterOpen(true)} />
      )}

      {/* Search result header */}
      <div className="px-4 py-2">
        {usedFallback ? (
          <p className="text-sm text-muted">{t('popularProducts')}</p>
        ) : (
          <p className="text-xs text-muted" aria-live="polite">
            {isLoading ? tc('loading') : t('productsFound', { count: total })}
          </p>
        )}
      </div>

      {shouldShowSearchRequestPrompt && (
        <div className="px-4">
          <SearchProductRequestPrompt
            query={q}
            locale={locale}
            searchLogId={searchLogId}
            filtersSnapshot={requestFiltersSnapshot}
            redirectPath={redirectPath}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <MobileProductGridSkeleton count={6} />}

      {/* Product grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4">
          {products.map((product, index) => (
            <MobileProductCard
              key={product.id}
              product={product}
              searchLogId={searchLogId}
              searchQuery={q}
              position={index + 1}
              page={Math.floor(index / PAGE_SIZE) + 1}
              source={OutboundSource.SEARCH}
              isHot={product.isFeatured || (product.popularityScore ?? 0) >= hotThreshold}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <Empty
          title={t('noProductsFor', { query: q })}
          description={t('noProductsForDesc')}
        />
      )}

      {/* Bottom loading state */}
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

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />

      {/* Back to top */}
      <MobileBackToTop />

      {/* Filter Sheet */}
      <MobileSearchFilterSheet
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
    </div>
  );
}
