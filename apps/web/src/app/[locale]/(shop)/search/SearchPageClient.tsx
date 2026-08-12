"use client";

/**
 * 搜索结果页 - 客户端组件
 *
 * CSS 双 div 分发（模式 B）：
 * - PC 端：hidden lg:block → 原有筛选器 + 商品网格 + 分页
 * - 移动端：lg:hidden → MobileSearchPage（独立 SWR 请求 limit=16，无限滚动）
 * - 两套 SSR 都输出 HTML，CSS 即时隐藏不可见的一套，零闪烁
 *
 * D3 决策：移动端独立 SWR 请求（limit=16），与桌面端（limit=60）解耦。
 * 搜索页交互模式不同（无限滚动 vs 翻页），分开请求更合理。
 */

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import useSWR from "swr";
import { Empty } from "@/components/ui/Empty";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { fetcher } from "@/lib/api";
import { recordImpressions, OutboundSource } from "@/lib/search-tracking";
import { trackGA4Event } from "@/lib/ga-events";
import { getSearchPreferenceParams } from "@/lib/browsing-history";
import { computeHotThreshold } from "@/lib/utils";
import type { ApiListResponse, Product } from "@/types";
import type { FacetsData } from "@/components/filters/types";
import { useLgUp } from "@/hooks/useLgUp";
import { useReturnScrollRestoration } from "@/hooks/useReturnScrollRestoration";
import {
  DEFAULT_DESKTOP_PRODUCT_LIMIT,
  DESKTOP_PRODUCT_GRID_CLASS,
  DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS,
  DESKTOP_PRODUCT_SIDEBAR_CLASS,
  DESKTOP_PRODUCT_SKELETON_COUNT,
} from "@/lib/product-list-layout";
const SEARCH_REQUEST_THRESHOLD = 50;

const ActiveFilters = dynamic(() => import("@/components/ActiveFilters"));
const FilterDrawer = dynamic(() => import("@/components/FilterDrawer"));
const FilterSidebar = dynamic(() =>
  import("@/components/filters").then((module) => ({
    default: module.FilterSidebar,
  })),
);
const Pagination = dynamic(() => import("@/components/Pagination"));
const ProductCard = dynamic(() => import("@/components/ProductCard"));
const SortSelect = dynamic(() => import("@/components/SortSelect"));
const MobileSearchPage = dynamic(
  () => import("./components/mobile/MobileSearchPage"),
);
const SearchQuickFilters = dynamic(
  () => import("@/components/search/SearchQuickFilters"),
);

const SearchProductRequestPrompt = dynamic(
  () =>
    import("./components/SearchProductRequestPrompt").then((module) => ({
      default: module.SearchProductRequestPrompt,
    })),
  { ssr: false },
);

interface SearchPageClientProps {
  initialBrands?: string | null;
  initialCategories?: string | null;
  initialColors?: string | null;
  initialProductsData?: ApiListResponse<Product> | null;
  initialFacetsData?: FacetsData | null;
  initialGenders?: string | null;
  initialLimit: number;
  initialMaxPrice?: string | null;
  initialMinPrice?: string | null;
  initialPage: number;
  initialQuery: string;
  initialServerVisitIdAvailable: boolean;
  initialSeasons?: string | null;
  initialSortBy: string;
  initialStyles?: string | null;
  pathname: string;
}

export default function SearchPageClient({
  initialBrands = null,
  initialCategories = null,
  initialColors = null,
  initialProductsData = null,
  initialFacetsData = null,
  initialGenders = null,
  initialLimit,
  initialMaxPrice = null,
  initialMinPrice = null,
  initialPage,
  initialQuery,
  initialServerVisitIdAvailable,
  initialSeasons = null,
  initialSortBy,
  initialStyles = null,
  pathname,
}: SearchPageClientProps) {
  const lgUp = useLgUp();
  const enabledDesktop = lgUp === true;
  const enabledMobile = lgUp === false;

  return (
    <>
      <div className="hidden lg:block">
        <Suspense fallback={<DesktopSearchFallback />}>
          <DesktopSearchContent
            enabled={enabledDesktop}
            initialBrands={initialBrands}
            initialCategories={initialCategories}
            initialColors={initialColors}
            initialFacetsData={initialFacetsData}
            initialGenders={initialGenders}
            initialLimit={initialLimit}
            initialMaxPrice={initialMaxPrice}
            initialMinPrice={initialMinPrice}
            initialPage={initialPage}
            initialProductsData={initialProductsData}
            initialQuery={initialQuery}
            initialServerVisitIdAvailable={initialServerVisitIdAvailable}
            initialSeasons={initialSeasons}
            initialSortBy={initialSortBy}
            initialStyles={initialStyles}
            pathname={pathname}
          />
        </Suspense>
      </div>

      <div className="lg:hidden">
        <Suspense fallback={<MobileSearchFallback />}>
          <MobileSearchPage enabled={enabledMobile} />
        </Suspense>
      </div>
    </>
  );
}

function DesktopSearchFallback() {
  return (
    <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
      <div className="mb-6 space-y-3">
        <div className="h-8 w-56 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="flex gap-6">
        <div className="w-52 xl:w-56 flex-shrink-0 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="flex-1">
          <DesktopToolbarFallback />
          <div className={DESKTOP_PRODUCT_GRID_CLASS}>
            {Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map(
              (_, i) => (
                <SkeletonCard key={i} />
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopToolbarFallback() {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="h-9 w-48 rounded bg-gray-200 animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="h-9 w-28 rounded bg-gray-200 animate-pulse" />
        <div className="h-9 w-24 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

function MobileSearchFallback() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-10 h-12 border-b border-border bg-surface" />
      <div className="px-4 py-3">
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function DesktopSearchContent({
  enabled,
  initialBrands,
  initialCategories,
  initialColors,
  initialProductsData,
  initialFacetsData,
  initialGenders,
  initialLimit,
  initialMaxPrice,
  initialMinPrice,
  initialPage,
  initialQuery,
  initialServerVisitIdAvailable,
  initialSeasons,
  initialSortBy,
  initialStyles,
  pathname,
}: {
  enabled: boolean;
  initialBrands: string | null;
  initialCategories: string | null;
  initialColors: string | null;
  initialProductsData: ApiListResponse<Product> | null;
  initialFacetsData: FacetsData | null;
  initialGenders: string | null;
  initialLimit: number;
  initialMaxPrice: string | null;
  initialMinPrice: string | null;
  initialPage: number;
  initialQuery: string;
  initialServerVisitIdAvailable: boolean;
  initialSeasons: string | null;
  initialSortBy: string;
  initialStyles: string | null;
  pathname: string;
}) {
  const t = useTranslations("search");
  const [preferenceParams, setPreferenceParams] = useState<{
    preferredBrands?: string;
    preferredCategories?: string;
  }>({});

  useEffect(() => {
    if (!enabled) return;
    const prefs = getSearchPreferenceParams();
    setPreferenceParams(prefs);
  }, [enabled]);

  const q = initialQuery;
  const page = initialPage;
  const limit = initialLimit;
  const brands = initialBrands;
  const minPrice = initialMinPrice;
  const maxPrice = initialMaxPrice;
  const sortBy = initialSortBy;
  const colors = initialColors;
  const genders = initialGenders;
  const styles = initialStyles;
  const seasons = initialSeasons;
  const categories = initialCategories;
  const returnTo = useMemo(() => {
    const params = new URLSearchParams();

    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    if (limit !== DEFAULT_DESKTOP_PRODUCT_LIMIT)
      params.set("limit", String(limit));
    if (brands) params.set("brands", brands);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sortBy && sortBy !== "popular") params.set("sortBy", sortBy);
    if (colors) params.set("colors", colors);
    if (genders) params.set("genders", genders);
    if (styles) params.set("styles", styles);
    if (seasons) params.set("seasons", seasons);
    if (categories) params.set("categories", categories);

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [
    brands,
    categories,
    colors,
    genders,
    limit,
    maxPrice,
    minPrice,
    page,
    pathname,
    q,
    seasons,
    sortBy,
    styles,
  ]);

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("search", q);
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (brands) queryParams.set("brands", brands);
  if (minPrice) queryParams.set("minPrice", minPrice);
  if (maxPrice) queryParams.set("maxPrice", maxPrice);
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (colors) queryParams.set("colors", colors);
  if (genders) queryParams.set("genders", genders);
  if (styles) queryParams.set("styles", styles);
  if (seasons) queryParams.set("seasons", seasons);
  if (categories) queryParams.set("categories", categories);
  if (preferenceParams.preferredBrands) {
    queryParams.set("preferredBrands", preferenceParams.preferredBrands);
  }
  if (preferenceParams.preferredCategories) {
    queryParams.set(
      "preferredCategories",
      preferenceParams.preferredCategories,
    );
  }

  const { data: productsData, error: productsError } = useSWR<
    ApiListResponse<Product>
  >(q ? `/products?${queryParams.toString()}` : null, fetcher, {
    fallbackData: initialProductsData ?? undefined,
    revalidateOnMount: initialProductsData
      ? !initialServerVisitIdAvailable
      : undefined,
  });

  const searchLogId = productsData?.meta?.searchLogId;
  const impressionRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!searchLogId || !productsData?.data?.length) return;

    const impressionKey = `${searchLogId}-${page}`;
    if (impressionRecordedRef.current === impressionKey) return;

    const impressions = productsData.data.map((product, index: number) => ({
      productId: product.id,
      position: (page - 1) * limit + index + 1,
    }));

    recordImpressions(searchLogId, impressions, page);
    impressionRecordedRef.current = impressionKey;

    trackGA4Event("view_search_results", {
      search_term: q,
      page,
      results_count: productsData.meta?.total || 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, searchLogId, productsData?.data, page, limit]);

  const { data: facetsData } = useSWR<FacetsData>(
    q ? `/products/facets?search=${encodeURIComponent(q)}` : null,
    fetcher,
    {
      fallbackData: initialFacetsData ?? undefined,
      revalidateOnMount: initialFacetsData ? false : undefined,
    },
  );

  const products = useMemo(
    () =>
      (productsData?.data || []).map((product) => ({
        ...product,
        secondImage: product.images?.[1],
        popularityScore: product.popularityScore ?? 0,
        price: {
          min: Number(product.priceMin) || 0,
          max: Number(product.priceMax) || 0,
          currency: product.currency || "CNY",
        },
      })),
    [productsData?.data],
  );
  const total = productsData?.meta?.total || 0;
  const usedFallback = productsData?.meta?.usedFallback === true;
  const shouldShowSearchRequestPrompt =
    usedFallback || total <= SEARCH_REQUEST_THRESHOLD;
  const locale = pathname.split("/")[1] || "en";
  const requestFiltersSnapshot = useMemo(() => {
    const snapshot: Record<string, string> = {
      q,
      page: String(page),
      limit: String(limit),
    };

    if (brands) snapshot.brands = brands;
    if (minPrice) snapshot.minPrice = minPrice;
    if (maxPrice) snapshot.maxPrice = maxPrice;
    if (sortBy) snapshot.sortBy = sortBy;
    if (colors) snapshot.colors = colors;
    if (genders) snapshot.genders = genders;
    if (styles) snapshot.styles = styles;
    if (seasons) snapshot.seasons = seasons;
    if (categories) snapshot.categories = categories;

    return snapshot;
  }, [
    brands,
    categories,
    colors,
    genders,
    limit,
    maxPrice,
    minPrice,
    page,
    q,
    seasons,
    sortBy,
    styles,
  ]);
  useReturnScrollRestoration(enabled && !!productsData, returnTo);

  const hotThreshold = useMemo(
    () => computeHotThreshold(products.map((p) => p.popularityScore ?? 0)),
    [products],
  );

  if (!q) {
    return (
      <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-16`}>
        <Empty
          icon={<Search className="w-16 h-16" />}
          title={t("enterKeyword")}
          description={t("enterKeywordDesc")}
        />
      </div>
    );
  }

  if (productsError) {
    return (
      <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-8`}>
        <Alert
          type="error"
          title={t("searchError")}
          description={productsError.message}
        />
      </div>
    );
  }

  if (!productsData) {
    return (
      <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-6">
          <div className="w-52 xl:w-56 flex-shrink-0 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className={DESKTOP_PRODUCT_GRID_CLASS}>
              {Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map(
                (_, i) => (
                  <SkeletonCard key={i} />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
      <div className="mb-6" aria-live="polite">
        {usedFallback ? (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t("noResultsFor", { query: q })}
            </h2>
            <p className="text-muted">{t("noResultsForDesc")}</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t("resultsFor", { query: q })}
            </h2>
            <p className="text-muted">{t("productsFound", { count: total })}</p>
          </>
        )}
      </div>

      <div className="flex gap-6">
        {!usedFallback && (
          <div className={DESKTOP_PRODUCT_SIDEBAR_CLASS}>
            <FilterSidebar
              categories={facetsData?.categories || []}
              brands={(facetsData?.brands || []).map((b) => ({
                label: b.name,
                value: b.slug,
                count: b.count,
              }))}
              colors={facetsData?.colors || []}
              genders={facetsData?.genders || []}
              styles={facetsData?.styles || []}
              occasions={facetsData?.occasions || []}
              seasons={facetsData?.seasons || []}
              priceRange={facetsData?.priceRange || { min: 0, max: 100000 }}
            />
          </div>
        )}

        <div className="flex-1">
          {!usedFallback && (
            <Suspense fallback={<DesktopToolbarFallback />}>
              <div className="mb-4 space-y-3">
                <SearchQuickFilters
                  categories={facetsData?.categories || []}
                  brands={facetsData?.brands || []}
                />
                <div className="flex items-center rounded-xl border border-border/70 bg-white px-3 py-2 shadow-sm">
                  <ActiveFilters className="flex-1" />
                  <div className="ml-auto rtl:mr-auto rtl:ml-0">
                    <SortSelect />
                  </div>
                </div>
              </div>
            </Suspense>
          )}

          {usedFallback && products.length > 0 && (
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-muted text-base">{t("popularProducts")}</p>
            </div>
          )}

          {shouldShowSearchRequestPrompt && (
            <SearchProductRequestPrompt
              query={q}
              locale={locale}
              searchLogId={searchLogId}
              filtersSnapshot={requestFiltersSnapshot}
              redirectPath={returnTo}
            />
          )}

          {products.length > 0 ? (
            <>
              <div className={DESKTOP_PRODUCT_GRID_CLASS}>
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    returnTo={returnTo}
                    searchLogId={searchLogId}
                    searchQuery={q}
                    position={(page - 1) * limit + index + 1}
                    page={page}
                    source={OutboundSource.SEARCH}
                    isHot={
                      product.isFeatured ||
                      (product.popularityScore ?? 0) >= hotThreshold
                    }
                  />
                ))}
              </div>

              {total > limit && (
                <Suspense fallback={null}>
                  <Pagination current={page} total={total} pageSize={limit} />
                </Suspense>
              )}
            </>
          ) : (
            <Empty
              title={t("noProductsFor", { query: q })}
              description={t("noProductsForDesc")}
            />
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <FilterDrawer
          brands={(facetsData?.brands || []).map((b) => ({
            label: b.name,
            value: b.slug,
            count: b.count,
          }))}
          colors={facetsData?.colors || []}
          genders={facetsData?.genders || []}
          styles={facetsData?.styles || []}
          occasions={facetsData?.occasions || []}
          seasons={facetsData?.seasons || []}
          priceRange={facetsData?.priceRange || { min: 0, max: 100000 }}
        />
      </Suspense>
    </div>
  );
}
