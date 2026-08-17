"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import useSWRInfinite from "swr/infinite";
import { Loader2 } from "lucide-react";
import { MobileProductCard } from "@/components/mobile/ui/MobileProductCard";
import { MobileProductGridSkeleton } from "@/components/mobile/ui/MobileSkeleton";
import { Empty } from "@/components/ui/Empty";
import { fetcher } from "@/lib/api";
import { OutboundSource } from "@/lib/search-tracking";
import type { ApiListResponse, Product, ProductListItem } from "@/types";
import { MobileBackToTop } from "@/components/mobile/ui/MobileBackToTop";
import dynamic from "next/dynamic";
import type { ViewMode } from "./MobileSortBar";
import { ALL_FILTER_KEYS } from "@/components/filters/constants";
import type { FacetsData } from "@/components/filters/types";
import { countActiveFilters } from "@/lib/filter-utils";
import { computeHotThreshold } from "@/lib/utils";
import { usePathname } from "@/i18n/navigation";
import { buildReturnTo } from "@/lib/return-to";
import { useInfiniteReturnScrollRestoration } from "@/hooks/useInfiniteReturnScrollRestoration";
import LazyShareModal from "@/components/share/LazyShareModal";

const MobileSortBar = dynamic(() => import("./MobileSortBar"), {
  ssr: false,
  loading: () => (
    <div className="sticky top-[6.5rem] z-[15] bg-surface border-b border-border">
      <div className="h-11" />
    </div>
  ),
});
import MobileActiveFilters from "./MobileActiveFilters";
import { MobileFilterSheet } from "./MobileFilterSheet";

const PAGE_SIZE = 20;

interface MobileProductListProps {
  facetsData?: FacetsData;
  enabled?: boolean;
  initialProductsData?: ApiListResponse<Product>;
}

/**
 * 移动端商品列表页主组件
 *
 * 使用 useSWRInfinite 管理分页，IntersectionObserver 触底加载。
 * 避免 ahooks useInfiniteScroll 的并发重复请求问题。
 */
export default function MobileProductList({
  facetsData,
  enabled = true,
  initialProductsData,
}: MobileProductListProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const initialMobilePage = useMemo<ApiListResponse<ProductListItem> | undefined>(
    () =>
      initialProductsData
        ? {
            ...initialProductsData,
            data: initialProductsData.data.map((product) => ({
              ...product,
              price: product.price ?? {
                min: Number(product.priceMin) || 0,
                max: Number(product.priceMax) || 0,
                currency: product.currency || "CNY",
              },
            })),
          }
        : undefined,
    [initialProductsData],
  );

  // 稳定的筛选参数字符串（用于 SWR key）
  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    const sortBy = searchParams.get("sortBy") || "popular";
    params.set("sortBy", sortBy);

    ALL_FILTER_KEYS.forEach((key) => {
      const val = searchParams.get(key);
      if (val) params.set(key, val);
    });
    return params.toString();
  }, [searchParams]);

  // SWR Infinite：每页独立 key，无并发冲突
  const getKey = useCallback(
    (
      pageIndex: number,
      previousPageData: ApiListResponse<ProductListItem> | null,
    ) => {
      if (!enabled) return null;
      // 上一页无数据 → 停止
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

  // 扁平化所有页面的商品 + 格式转换 + 去重
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
            currency: product.currency || "CNY",
          },
        } as ProductListItem);
      }
    }
    return result;
  }, [pages]);

  // 从第一页获取总数
  const total = pages?.[0]?.meta?.total || 0;
  const returnTo = useMemo(
    () => buildReturnTo(pathname, searchParams),
    [pathname, searchParams],
  );
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

  // 判断是否还有更多
  const isEmpty = pages?.[0]?.data?.length === 0;
  const lastPage = pages?.[pages.length - 1];
  const isNoMore = lastPage ? (lastPage.data?.length ?? 0) < PAGE_SIZE : false;
  const isLoadingMore =
    isValidating && size > 1 && pages && size > pages.length;

  // IntersectionObserver 触底加载
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
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, isValidating, isNoMore, error, setSize]);

  // 筛选面板 facets 数据
  const brands = (facetsData?.brands || []).map((b) => ({
    label: b.name,
    value: b.slug,
    count: b.count,
  }));

  return (
    <div className="min-h-dvh bg-background">
      {/* 排序栏 — sticky 吸顶 */}
      <MobileSortBar
        viewMode={viewMode}
        onViewChange={setViewMode}
        filterCount={countActiveFilters(searchParams)}
        onOpenFilter={() => setFilterOpen(true)}
        onOpenShare={() => setShareModalOpen(true)}
      />

      {/* 已选筛选标签 */}
      <MobileActiveFilters />

      {/* 商品数量 */}
      <div className="px-4 py-3">
        <h1 className="text-lg font-bold text-foreground">
          {t("allProducts")}
        </h1>
        <p className="text-xs text-muted" aria-live="polite">
          {isLoading ? tc("loading") : t("productCount", { count: total })}
        </p>
      </div>

      {/* 首次加载骨架屏 */}
      {isLoading && <MobileProductGridSkeleton count={6} />}

      {/* 商品网格 */}
      {products.length > 0 && (
        <div
          className={
            viewMode === "list"
              ? "flex flex-col gap-3 px-4"
              : viewMode === "compact"
                ? "grid grid-cols-3 md:grid-cols-4 gap-2 px-3"
                : "grid grid-cols-2 md:grid-cols-3 gap-3 px-4"
          }
        >
          {products.map((product, index) => (
            <MobileProductCard
              key={`${product.id}-${index}`}
              product={product}
              source={OutboundSource.DIRECT}
              position={index + 1}
              page={Math.floor(index / PAGE_SIZE) + 1}
              isHot={
                product.isFeatured ||
                (product.popularityScore ?? 0) >= hotThreshold
              }
              returnTo={returnTo}
              imagePriority={index < (viewMode === "compact" ? 6 : 4)}
              headingLevel={2}
            />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && isEmpty && (
        <Empty title={t("noProducts")} description={t("noProductsDesc")} />
      )}

      {/* 底部状态 */}
      <div className="flex items-center justify-center py-6">
        {(isLoadingMore || isValidating) && !isLoading && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{tc("loading")}</span>
          </div>
        )}
        {isNoMore && products.length > 0 && (
          <p className="text-xs text-muted">{tc("noMore")}</p>
        )}
        {error && !isLoading && (
          <button
            type="button"
            onClick={() => setSize(size)}
            className="text-sm text-primary active:opacity-70"
          >
            {tc("loadFailed")}
          </button>
        )}
      </div>

      {/* 触底检测哨兵 */}
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

      {shareModalOpen ? (
        <LazyShareModal
          open
          onClose={() => setShareModalOpen(false)}
          title={t("allProducts")}
          url={typeof window !== "undefined" ? window.location.href : ""}
          campaign="referral_page_share"
        />
      ) : null}
    </div>
  );
}
