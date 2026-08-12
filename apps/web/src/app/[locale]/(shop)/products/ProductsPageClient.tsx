/**
 * 商品列表页
 * URL: /products
 * 显示所有商品，支持筛选、排序和视图切换
 *
 * CSS 双 div 分发（模式 A — Client Component）：
 * - PC 端：hidden lg:block → 原有 FilterSidebar + 商品网格 + 分页
 * - 移动端：lg:hidden → MobileProductList（sticky 排序栏 + 筛选 Sheet + 无限滚动）
 * - 两套 SSR 都输出 HTML，CSS 即时隐藏不可见的一套，零闪烁
 */
"use client";

import { useMemo, Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { Share2 } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Empty } from "@/components/ui/Empty";
import { Alert } from "@/components/ui/Alert";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { fetcher } from "@/lib/api";
import type { ApiListResponse, Product } from "@/types";
import { computeHotThreshold } from "@/lib/utils";
import MobileProductList from "./components/mobile/MobileProductList";
import { useLgUp } from "@/hooks/useLgUp";
import type { FacetsData } from "@/components/filters/types";
import { usePathname } from "@/i18n/navigation";
import { buildReturnTo } from "@/lib/return-to";
import { useReturnScrollRestoration } from "@/hooks/useReturnScrollRestoration";
import LazyShareModal from "@/components/share/LazyShareModal";
import {
  DEFAULT_DESKTOP_PRODUCT_LIMIT,
  DESKTOP_PRODUCT_GRID_CLASS,
  DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS,
  DESKTOP_PRODUCT_SIDEBAR_CLASS,
  DESKTOP_PRODUCT_SKELETON_COUNT,
} from "@/lib/product-list-layout";
interface ProductsPageClientProps {
  initialProductsData?: ApiListResponse<Product> | null;
  initialFacetsData?: FacetsData | null;
}

/**
 * Phase 4.6 性能优化：
 * PC 端专用组件使用 dynamic import，移动端不加载这些 JS 模块
 */
const FilterSidebar = dynamic(() =>
  import("@/components/filters").then((m) => ({ default: m.FilterSidebar })),
);
const ActiveFilters = dynamic(() => import("@/components/ActiveFilters"));
const ProductCard = dynamic(() => import("@/components/ProductCard"));
const Pagination = dynamic(() => import("@/components/Pagination"));
const SortSelect = dynamic(() => import("@/components/SortSelect"));

// 页面加载状态
function PageLoading() {
  return (
    <div
      className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} flex justify-center py-8`}
    >
      <Spinner size="lg" />
    </div>
  );
}

// 主内容组件（使用 useSearchParams）
function ProductsContent({
  initialProductsData,
  initialFacetsData,
}: ProductsPageClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const tShare = useTranslations("share");
  const lgUp = useLgUp();
  const enabledDesktop = lgUp === true;
  const enabledMobile = lgUp === false;
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // 获取查询参数
  const page = Number(searchParams.get("page")) || 1;
  const limit =
    Number(searchParams.get("limit")) || DEFAULT_DESKTOP_PRODUCT_LIMIT;
  const brands = searchParams.get("brands");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sortBy = searchParams.get("sortBy") || "popular";
  const colors = searchParams.get("colors");
  const genders = searchParams.get("genders");
  const styles = searchParams.get("styles");
  const occasions = searchParams.get("occasions");
  const seasons = searchParams.get("seasons");
  const categories = searchParams.get("categories");

  // 构建 API 查询参数
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  queryParams.set("sortBy", sortBy);
  if (brands) queryParams.set("brands", brands);
  if (minPrice) queryParams.set("minPrice", minPrice);
  if (maxPrice) queryParams.set("maxPrice", maxPrice);
  if (colors) queryParams.set("colors", colors);
  if (genders) queryParams.set("genders", genders);
  if (styles) queryParams.set("styles", styles);
  if (occasions) queryParams.set("occasions", occasions);
  if (seasons) queryParams.set("seasons", seasons);
  if (categories) queryParams.set("categories", categories);

  // 获取商品列表
  const productsKey =
    enabledDesktop || initialProductsData
      ? `/products?${queryParams.toString()}`
      : null;
  const {
    data: productsData,
    error: productsError,
    isLoading,
  } = useSWR<ApiListResponse<Product>>(productsKey, fetcher, {
    fallbackData: initialProductsData ?? undefined,
    revalidateOnMount: initialProductsData ? false : undefined,
  });

  // 获取筛选器 facets（PC 和移动端共享）
  const facetsKey =
    enabledDesktop || enabledMobile || initialFacetsData
      ? "/products/facets"
      : null;
  const { data: facetsData } = useSWR<FacetsData>(facetsKey, fetcher, {
    fallbackData: initialFacetsData ?? undefined,
    revalidateOnMount: initialFacetsData ? false : undefined,
  });

  // 转换 API 数据格式（必须在所有 early return 之前，保证 hooks 顺序一致）
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
  const returnTo = useMemo(
    () => buildReturnTo(pathname, searchParams),
    [pathname, searchParams],
  );
  useReturnScrollRestoration(enabledDesktop && !isLoading);

  // Hot badge 阈值：取当前页 popularityScore 前 20%
  const hotThreshold = useMemo(
    () => computeHotThreshold(products.map((p) => p.popularityScore ?? 0)),
    [products],
  );

  if (productsError) {
    return (
      <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-8`}>
        <Alert
          type="error"
          title={t("errorLoading")}
          description={productsError.message}
        />
      </div>
    );
  }

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("allProducts")}
            </h1>
            <p className="text-muted" aria-live="polite">
              {isLoading ? tc("loading") : t("productCount", { count: total })}
            </p>
          </div>

          {/* 主内容区 */}
          <div className="flex gap-6">
            {/* 左侧筛选器（桌面端） */}
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
                enabled={enabledDesktop}
              />
            </div>

            {/* 右侧商品列表 */}
            <div className="flex-1">
              {/* 工具栏 */}
              <div className="flex items-center mb-4">
                <ActiveFilters className="flex-1" />
                <div className="ml-auto rtl:mr-auto rtl:ml-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-foreground transition-colors duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{tShare("title")}</span>
                  </button>
                  <SortSelect />
                </div>
              </div>

              {/* 商品列表 */}
              {isLoading ? (
                <div className={DESKTOP_PRODUCT_GRID_CLASS}>
                  {Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map(
                    (_, i) => (
                      <SkeletonCard key={i} />
                    ),
                  )}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className={DESKTOP_PRODUCT_GRID_CLASS}>
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isHot={
                          product.isFeatured ||
                          (product.popularityScore ?? 0) >= hotThreshold
                        }
                        returnTo={returnTo}
                      />
                    ))}
                  </div>

                  {/* 分页器 */}
                  {total > limit && (
                    <Pagination current={page} total={total} pageSize={limit} />
                  )}
                </>
              ) : (
                <Empty
                  title={t("noProducts")}
                  description={t("noProductsDesc")}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileProductList facetsData={facetsData} enabled={enabledMobile} />
      </div>

      {shareModalOpen ? (
        <LazyShareModal
          open
          onClose={() => setShareModalOpen(false)}
          title={t("allProducts")}
          url={typeof window !== "undefined" ? window.location.href : ""}
          campaign="referral_page_share"
        />
      ) : null}
    </>
  );
}

// 导出页面组件（用 Suspense 包裹）
export default function ProductsPageClient({
  initialProductsData,
  initialFacetsData,
}: ProductsPageClientProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProductsContent
        initialFacetsData={initialFacetsData}
        initialProductsData={initialProductsData}
      />
    </Suspense>
  );
}
