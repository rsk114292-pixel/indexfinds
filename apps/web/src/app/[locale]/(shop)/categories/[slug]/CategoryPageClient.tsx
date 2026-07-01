'use client';

/**
 * 分类页客户端组件
 * 处理所有交互逻辑：筛选、排序、分页、视图切换
 *
 * CSS 双 div 分发（模式 B — Server Component page.tsx 不动）：
 * - PC 端：hidden lg:block → 原有 FilterSidebar + 商品网格 + 分页
 * - 移动端：lg:hidden → MobileCategoryDetail（无限滚动 + 筛选 Sheet）
 */
import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Breadcrumb from '@/components/Breadcrumb';
import { FilterSidebar, type FacetsData } from '@/components/filters';
import ActiveFilters from '@/components/ActiveFilters';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import SortSelect from '@/components/SortSelect';
import { Empty } from '@/components/ui/Empty';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Link } from '@/i18n/navigation';
import { fetcher } from '@/lib/api';
import { getLocalizedName, computeHotThreshold } from '@/lib/utils';
import { OutboundSource } from '@/lib/search-tracking';
import { useLgUp } from '@/hooks/useLgUp';
import { useReturnScrollRestoration } from '@/hooks/useReturnScrollRestoration';
import type { ApiListResponse, Product, Category } from '@/types';
import {
  DEFAULT_DESKTOP_PRODUCT_LIMIT,
  DESKTOP_PRODUCT_GRID_CLASS,
  DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS,
  DESKTOP_PRODUCT_SIDEBAR_CLASS,
  DESKTOP_PRODUCT_SKELETON_COUNT,
} from '@/lib/product-list-layout';
import MobileCategoryDetail from './components/mobile/MobileCategoryDetail';

interface CategoryPageClientProps {
  slug: string;
  initialCategory: Category | null;
}

export default function CategoryPageClient({ slug, initialCategory }: CategoryPageClientProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const lgUp = useLgUp();
  const enabledDesktop = lgUp === true;
  const enabledMobile = lgUp === false;

  // 获取查询参数
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || DEFAULT_DESKTOP_PRODUCT_LIMIT;
  const brands = searchParams.get('brands');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sortBy = searchParams.get('sortBy') || 'popular';
  const colors = searchParams.get('colors');
  const genders = searchParams.get('genders');
  const styles = searchParams.get('styles');
  const seasons = searchParams.get('seasons');
  const categories = searchParams.get('categories');

  // 构建 API 查询参数
  const queryParams = new URLSearchParams();
  queryParams.set('category', slug);
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));
  if (brands) queryParams.set('brands', brands);
  if (minPrice) queryParams.set('minPrice', minPrice);
  if (maxPrice) queryParams.set('maxPrice', maxPrice);
  if (sortBy) queryParams.set('sortBy', sortBy);
  if (colors) queryParams.set('colors', colors);
  if (genders) queryParams.set('genders', genders);
  if (styles) queryParams.set('styles', styles);
  if (seasons) queryParams.set('seasons', seasons);
  if (categories) queryParams.set('categories', categories);

  // 获取商品列表（仅桌面端）
  const { data: productsData, isLoading } = useSWR<ApiListResponse<Product>>(
    enabledDesktop ? `/products?${queryParams.toString()}` : null,
    fetcher
  );

  // 获取筛选器 facets（仅桌面端）
  const { data: facetsData } = useSWR<FacetsData>(
    enabledDesktop ? `/products/facets?category=${slug}` : null,
    fetcher
  );

  // 转换 API 数据格式
  const products = (productsData?.data || []).map((product) => ({
    ...product,
    secondImage: product.images?.[1],
    popularityScore: product.popularityScore ?? 0,
    price: {
      min: Number(product.priceMin) || 0,
      max: Number(product.priceMax) || 0,
      currency: product.currency || 'CNY',
    },
  }));
  const total = productsData?.meta?.total || 0;
  useReturnScrollRestoration(enabledDesktop && !!productsData);

  // Hot badge 阈值：取当前页 popularityScore 前 20%
  const hotThreshold = useMemo(
    () => computeHotThreshold(products.map((p) => p.popularityScore ?? 0)),
    [products],
  );

  // 构建面包屑
  const breadcrumbItems = initialCategory
    ? [{ name: getLocalizedName(initialCategory, locale), slug: initialCategory.slug }]
    : [];

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
          {/* 面包屑 */}
          <Breadcrumb items={breadcrumbItems} className="mb-4" />

          {/* 分类标题 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {initialCategory ? getLocalizedName(initialCategory, locale) : slug}
            </h2>
            <p className="text-muted">
              {isLoading ? tCommon('loading') : t('productCount', { count: total })}
            </p>
          </div>

          {/* 子分类导航 */}
          {initialCategory?.children && initialCategory.children.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {initialCategory.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    prefetch={false}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {getLocalizedName(child, locale)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 热门品牌 */}
          {facetsData?.brands && facetsData.brands.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {facetsData.brands.slice(0, 10).map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    prefetch={false}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    {brand.name}
                    <span className="ml-1.5 text-xs text-gray-400">({brand.count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 主内容区 */}
          <div className="flex gap-6">
            {/* 左侧筛选器 */}
            <div className={DESKTOP_PRODUCT_SIDEBAR_CLASS}>
              <FilterSidebar
                categories={facetsData?.categories || []}
                brands={(facetsData?.brands || []).map(b => ({
                  label: b.name,
                  value: b.slug,
                  count: b.count
                }))}
                colors={facetsData?.colors || []}
                genders={facetsData?.genders || []}
                styles={facetsData?.styles || []}
                seasons={facetsData?.seasons || []}
                priceRange={facetsData?.priceRange || { min: 0, max: 100000 }}
              />
            </div>

            {/* 右侧商品列表 */}
            <div className="flex-1">
              {/* 工具栏 */}
              <div className="flex items-center mb-4">
                <ActiveFilters className="flex-1" />
                <div className="ml-auto rtl:mr-auto rtl:ml-0">
                  <SortSelect />
                </div>
              </div>

              {/* 商品列表 */}
              {isLoading ? (
                <div className={DESKTOP_PRODUCT_GRID_CLASS}>
                  {Array.from({ length: DESKTOP_PRODUCT_SKELETON_COUNT }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className={DESKTOP_PRODUCT_GRID_CLASS}>
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} source={OutboundSource.CATEGORY} isHot={product.isFeatured || (product.popularityScore ?? 0) >= hotThreshold} />
                    ))}
                  </div>

                  {/* 分页器 */}
                  {total > limit && (
                    <Pagination current={page} total={total} pageSize={limit} />
                  )}
                </>
              ) : (
                <Empty
                  title={t('noProducts')}
                  description={t('noProductsDesc')}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileCategoryDetail
          slug={slug}
          initialCategory={initialCategory}
          enabled={enabledMobile}
        />
      </div>
    </>
  );
}
