/**
 * 分类列表页
 * URL: /categories
 *
 * CSS 双 div 分发（模式 A — Client Component）：
 * - PC 端：hidden lg:block → 原有大卡片 + 趋势商品
 * - 移动端：lg:hidden → MobileCategoryList（左右分栏式）
 */
'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Empty } from '@/components/ui/Empty';
import { fetcher } from '@/lib/api';
import { getImageReferrerPolicy, getProductCardThumbnail } from '@/lib/image-utils';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { formatPriceRange, convertPrice, cn, getLocalizedName } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import type { Category, ApiListResponse } from '@/types';
import MobileCategoryList from './components/mobile/MobileCategoryList';

/* ─── Types ─── */

type CategoriesResponse = Category[] | { data: Category[] };

function normalizeCategories(data: CategoriesResponse | undefined): Category[] | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as { data?: unknown }).data)) return (data as { data: Category[] }).data;
  return undefined;
}

/* ─── Category ordering: first 2 become large cards ─── */

const CATEGORY_PRIORITY = ['clothing', 'shoes', 'bags', 'accessories', 'electronics'];

function sortByPriority(categories: Category[]): Category[] {
  const m = new Map(CATEGORY_PRIORITY.map((slug, i) => [slug, i]));
  return [...categories].sort((a, b) => (m.get(a.slug) ?? 999) - (m.get(b.slug) ?? 999));
}

/* ─── CategoryCard ─── */

function CategoryCard({ category, isLarge }: { category: Category; isLarge: boolean }) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const router = useRouter();

  const { data: productsData } = useSWR<ApiListResponse<{ mainImage: string }>>(
    `/products?category=${category.slug}&limit=1&sortBy=popular`,
    fetcher,
  );

  const coverImage = productsData?.data?.[0]?.mainImage;
  const totalCount = productsData?.meta?.total || 0;
  const children = category.children || [];

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/categories/${category.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/categories/${category.slug}`)}
      className={cn(
        'group relative overflow-hidden rounded-xl cursor-pointer',
        'transition-all duration-200 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary',
        isLarge ? 'col-span-2 lg:col-span-2 xl:col-span-3' : 'col-span-1 lg:col-span-1 xl:col-span-2',
      )}
    >
      {/* Cover image area */}
      <div
        className={cn(
          'relative w-full overflow-hidden bg-gray-100',
          isLarge ? 'h-52 sm:h-64 lg:h-72' : 'h-40 sm:h-48 lg:h-56',
        )}
      >
        {coverImage ? (
          <Image
            src={getProductCardThumbnail(coverImage)}
            alt={getLocalizedName(category, locale)}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes={isLarge ? '(max-width:1024px) 100vw, 50vw' : '(max-width:640px) 50vw, 33vw'}
            loading="lazy"
            referrerPolicy={getImageReferrerPolicy(getProductCardThumbnail(coverImage))}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 to-secondary/90" />
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

        {/* Text content */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3
                className={cn(
                  'font-bold text-white drop-shadow-sm',
                  isLarge ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl',
                )}
              >
                {getLocalizedName(category, locale)}
              </h3>
              {totalCount > 0 && (
                <p className="text-sm text-white/80 mt-0.5">
                  {t('itemCount', { count: totalCount.toLocaleString() })}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>

          {/* Subcategories */}
          {children.length > 0 && (
            <div
              className={cn(
                'flex flex-wrap gap-1.5 transition-all duration-300 overflow-hidden',
                isLarge
                  ? 'mt-3 max-h-20 opacity-100'
                  : 'mt-2 max-h-16 sm:max-h-0 sm:opacity-0 sm:group-hover:max-h-20 sm:group-hover:opacity-100',
              )}
            >
              {children.slice(0, isLarge ? 6 : 4).map((child) => (
                <span
                  key={child.id}
                  role="link"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/categories/${child.slug}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      router.push(`/categories/${child.slug}`);
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/40 transition-colors cursor-pointer"
                >
                  {getLocalizedName(child, locale)}
                </span>
              ))}
              {children.length > (isLarge ? 6 : 4) && (
                <span className="px-2.5 py-1 text-xs text-white/50">
                  {t('moreCount', { count: children.length - (isLarge ? 6 : 4) })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Trending product mini-card ─── */

interface TrendingProduct {
  id: string;
  slug: string;
  title: string;
  mainImage: string;
  price?: { min?: number; max?: number; currency?: string };
  priceMin?: number;
  priceMax?: number;
  currency?: string;
}

function TrendingProductCard({ product }: { product: TrendingProduct }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const returnTo = useMemo(() => buildReturnTo(pathname, searchParams), [pathname, searchParams]);
  const priceMin = product.price?.min ?? product.priceMin ?? 0;
  const priceMax = product.price?.max ?? product.priceMax ?? 0;
  const srcCurrency = product.price?.currency ?? product.currency ?? 'CNY';
  const cMin = convertPrice(priceMin, srcCurrency, displayCurrency, rates);
  const cMax = convertPrice(priceMax, srcCurrency, displayCurrency, rates);

  return (
    <Link
      href={withReturnTo(`/products/${product.slug}`, returnTo)}
      prefetch={false}
      onClick={() => saveReturnScroll(returnTo)}
      className="flex-shrink-0 w-36 sm:w-44 group"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={getProductCardThumbnail(product.mainImage)}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="180px"
          loading="lazy"
          referrerPolicy={getImageReferrerPolicy(getProductCardThumbnail(product.mainImage))}
        />
      </div>
      <h4 className="mt-2 text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
        {product.title}
      </h4>
      <p className="text-sm font-semibold text-accent mt-0.5">
        {formatPriceRange(cMin, cMax, displayCurrency)}
      </p>
    </Link>
  );
}

/* ─── Skeleton loaders ─── */

function CategoryCardSkeleton({ isLarge }: { isLarge: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-gray-200 animate-pulse',
        isLarge ? 'col-span-2 lg:col-span-2 xl:col-span-3 h-52 sm:h-64 lg:h-72' : 'col-span-1 lg:col-span-1 xl:col-span-2 h-40 sm:h-48 lg:h-56',
      )}
    />
  );
}

function TrendingSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden mt-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36 sm:w-44">
          <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
          <div className="mt-2 h-3 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="mt-1 h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ─── */

export default function CategoriesPageClient() {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const { data, error } = useSWR<CategoriesResponse>('/categories', fetcher);
  const rawCategories = useMemo(() => normalizeCategories(data), [data]);

  const { data: trendingData, isLoading: trendingLoading } = useSWR<ApiListResponse<TrendingProduct>>(
    '/products?sortBy=popular&limit=12',
    fetcher,
  );
  const trendingProducts = trendingData?.data || [];

  const sorted = rawCategories ? sortByPriority(rawCategories) : [];
  const large = sorted.slice(0, 2);
  const small = sorted.slice(2, 5);

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        {/* Error state */}
        {error ? (
          <div className="container mx-auto px-4 py-8">
            <Alert type="error" title={t('errorLoading')} description={error.message} />
          </div>
        ) : !data ? (
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-5 w-72 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <CategoryCardSkeleton isLarge />
              <CategoryCardSkeleton isLarge />
              <CategoryCardSkeleton isLarge={false} />
              <CategoryCardSkeleton isLarge={false} />
              <CategoryCardSkeleton isLarge={false} />
            </div>
            <TrendingSkeleton />
          </div>
        ) : !rawCategories || rawCategories.length === 0 ? (
          <div className="container mx-auto px-4 py-8">
            <Empty title={t('noCategories')} />
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-muted mt-1">{t('subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {large.map((cat) => (
                <CategoryCard key={cat.id} category={cat} isLarge />
              ))}
              {small.map((cat) => (
                <CategoryCard key={cat.id} category={cat} isLarge={false} />
              ))}
            </div>

            {trendingLoading && <TrendingSkeleton />}

            {!trendingLoading && trendingProducts.length > 0 && (
              <section className="mt-12">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">{t('trendingNow')}</h2>
                  </div>
                  <Link
                    href="/search?sortBy=popular"
                    className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
                  >
                    {tCommon('viewAll')}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                  {trendingProducts.map((product) => (
                    <TrendingProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileCategoryList />
      </div>
    </>
  );
}
