'use client';

/**
 * 品牌详情页 - 客户端组件
 * 从 page.tsx 迁移，接收服务端预取的品牌数据
 *
 * CSS 双 div 分发（模式 A — Client Component）：
 * - PC 端：hidden lg:block → 原有品牌头部 + FilterSidebar + 商品网格 + 分页
 * - 移动端：lg:hidden → MobileBrandDetail（无限滚动 + 筛选 Sheet）
 */
import { useMemo, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { Home, ChevronRight } from 'lucide-react';
import { FilterSidebar, type FacetsData } from '@/components/filters';
import ActiveFilters from '@/components/ActiveFilters';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import SortSelect from '@/components/SortSelect';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Empty } from '@/components/ui/Empty';
import { Tag } from '@/components/ui/Tag';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { fetcher } from '@/lib/api';
import { getLocalizedName, computeHotThreshold } from '@/lib/utils';
import { useLgUp } from '@/hooks/useLgUp';
import { useReturnScrollRestoration } from '@/hooks/useReturnScrollRestoration';
import { useLocale } from 'next-intl';
import type { Brand, ApiListResponse, Product, Category } from '@/types';
import {
  DEFAULT_DESKTOP_PRODUCT_LIMIT,
  DESKTOP_PRODUCT_GRID_CLASS,
  DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS,
  DESKTOP_PRODUCT_SIDEBAR_CLASS,
  DESKTOP_PRODUCT_SKELETON_COUNT,
} from '@/lib/product-list-layout';
import MobileBrandDetail from './components/mobile/MobileBrandDetail';

// 页面加载状态
function PageLoading() {
  return (
    <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} flex justify-center py-8`}>
      <Spinner size="lg" />
    </div>
  );
}

interface BrandPageClientProps {
  slug: string;
  initialBrand: Brand | null;
}

// 主内容组件
function BrandContent({ slug, initialBrand }: BrandPageClientProps) {
  const t = useTranslations('brands');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const lgUp = useLgUp();
  const enabledDesktop = lgUp === true;
  const enabledMobile = lgUp === false;

  // 获取品牌信息（使用服务端数据作为初始值）
  const { data: brand, error: brandError } = useSWR<Brand>(
    slug ? `/brands/slug/${slug}` : null,
    fetcher,
    { fallbackData: initialBrand ?? undefined }
  );

  // 获取查询参数（仅桌面端使用）
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || DEFAULT_DESKTOP_PRODUCT_LIMIT;
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const sortBy = searchParams.get('sortBy') || 'popular';
  const colors = searchParams.get('colors');
  const genders = searchParams.get('genders');
  const styles = searchParams.get('styles');
  const seasons = searchParams.get('seasons');
  const categories = searchParams.get('categories');

  // 构建 API 查询参数（仅桌面端）
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));
  queryParams.set('sortBy', sortBy);
  if (brand?.slug) queryParams.set('brands', brand.slug);
  if (minPrice) queryParams.set('minPrice', minPrice);
  if (maxPrice) queryParams.set('maxPrice', maxPrice);
  if (colors) queryParams.set('colors', colors);
  if (genders) queryParams.set('genders', genders);
  if (styles) queryParams.set('styles', styles);
  if (seasons) queryParams.set('seasons', seasons);
  if (categories) queryParams.set('categories', categories);

  // 获取商品列表（仅桌面端）
  const {
    data: productsData,
    isLoading,
  } = useSWR<ApiListResponse<Product>>(
    enabledDesktop && brand?.slug ? `/products?${queryParams.toString()}` : null,
    fetcher
  );

  // 获取品牌所属分类（仅桌面端）
  const { data: brandCategories } = useSWR<
    Array<Category & { productCount: number }>
  >(
    enabledDesktop && slug ? `/brands/slug/${slug}/categories` : null,
    fetcher
  );

  // 获取相关品牌（仅桌面端）
  const { data: relatedBrands } = useSWR<Brand[]>(
    enabledDesktop && slug ? `/brands/slug/${slug}/related?limit=8` : null,
    fetcher
  );

  // 获取筛选器 facets（仅桌面端）
  const { data: facetsData } = useSWR<FacetsData>(
    enabledDesktop && brand?.slug ? `/products/facets?brands=${brand.slug}` : null,
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

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        {brandError ? (
          <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-8`}>
            <Alert
              type="error"
              title={t('notFound')}
              description={t('notFoundDesc')}
            />
          </div>
        ) : !brand ? (
          <PageLoading />
        ) : (
          <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
            {/* 面包屑导航 */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-1 text-sm">
                <li>
                  <Link href="/" prefetch={false} aria-label={tCommon('home')} className="inline-flex h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted hover:text-foreground transition-colors cursor-pointer">
                    <Home className="w-4 h-4" />
                  </Link>
                </li>
                <li className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <Link href="/brands" prefetch={false} className="px-1 text-muted hover:text-foreground transition-colors cursor-pointer">{t('title')}</Link>
                </li>
                <li className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <span className="text-foreground font-medium px-1">{brand.name}</span>
                </li>
              </ol>
            </nav>

            {/* 品牌头部 */}
            <div className="mb-8 flex items-start gap-6">
              {brand.logoUrl ? (
                <div className="w-20 h-20 relative flex-shrink-0">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold text-gray-400">
                    {brand.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {brand.name}
                  </h2>
                  {(brand.tier === 1 || brand.tier === 2) && (
                    <Tag color="accent" size="md">{t('popular')}</Tag>
                  )}
                </div>
                {brand.description && (
                  <p className="text-muted mb-2">{brand.description}</p>
                )}
                <p className="text-muted text-sm">
                  {isLoading ? tCommon('loading') : t('productCount', { count: total })}
                </p>
              </div>
            </div>

            {/* 浏览分类 */}
            {brandCategories && brandCategories.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {brandCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      prefetch={false}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {getLocalizedName(cat, locale)}
                      <span className="ml-1.5 text-xs text-gray-400">({cat.productCount})</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 相关品牌 */}
            {relatedBrands && relatedBrands.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {relatedBrands.map((rb) => (
                    <Link
                      key={rb.id}
                      href={`/brands/${rb.slug}`}
                      prefetch={false}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors"
                    >
                      {rb.name}
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
                  brands={[]}
                  colors={facetsData?.colors || []}
                  genders={facetsData?.genders || []}
                  styles={facetsData?.styles || []}
                  occasions={facetsData?.occasions || []}
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
                        <ProductCard key={product.id} product={product} isHot={product.isFeatured || (product.popularityScore ?? 0) >= hotThreshold} />
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
        )}
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileBrandDetail
          slug={slug}
          brand={brand ?? null}
          enabled={enabledMobile}
        />
      </div>
    </>
  );
}

// 导出客户端组件（用 Suspense 包裹）
export default function BrandPageClient({ slug, initialBrand }: BrandPageClientProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <BrandContent slug={slug} initialBrand={initialBrand} />
    </Suspense>
  );
}
