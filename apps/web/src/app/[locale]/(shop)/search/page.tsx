/**
 * 搜索结果页 - 服务端组件
 * URL: /search?q=keyword
 *
 * SEO 策略：
 * - noindex, follow：避免大量搜索页被索引造成重复内容
 * - 保留 follow：允许爬虫跟踪商品链接
 * - 客户端交互逻辑委托给 SearchPageClient
 */
import { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import {
  buildServerTrackingHeaders,
  fetchServerApiJson,
} from '@/lib/server-api-fetch';
import type { ApiListResponse, Product } from '@/types';
import type { FacetsData } from '@/components/filters/types';
import { DEFAULT_DESKTOP_PRODUCT_LIMIT } from '@/lib/product-list-layout';
import SearchLoadingShell from './SearchLoadingShell';
import SearchPageClient from './SearchPageClient';

function getSearchParamValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

// 动态 Metadata 生成
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;
  const query = q || '';
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: query
      ? t('searchTitle', { query })
      : t('searchDefaultTitle'),
    description: query
      ? t('searchDescription', { query })
      : t('searchDefaultDescription'),

    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
  };
}

export default function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<SearchLoadingShell />}>
      <SearchPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = getSearchParamValue(resolvedSearchParams.q) ?? '';
  const page = Number(getSearchParamValue(resolvedSearchParams.page) ?? '1') || 1;
  const limit =
    Number(getSearchParamValue(resolvedSearchParams.limit) ?? String(DEFAULT_DESKTOP_PRODUCT_LIMIT)) ||
    DEFAULT_DESKTOP_PRODUCT_LIMIT;
  const brands = getSearchParamValue(resolvedSearchParams.brands);
  const minPrice = getSearchParamValue(resolvedSearchParams.minPrice);
  const maxPrice = getSearchParamValue(resolvedSearchParams.maxPrice);
  const sortBy = getSearchParamValue(resolvedSearchParams.sortBy) ?? 'popular';
  const colors = getSearchParamValue(resolvedSearchParams.colors);
  const genders = getSearchParamValue(resolvedSearchParams.genders);
  const styles = getSearchParamValue(resolvedSearchParams.styles);
  const seasons = getSearchParamValue(resolvedSearchParams.seasons);
  const categories = getSearchParamValue(resolvedSearchParams.categories);

  let initialProductsData: ApiListResponse<Product> | null = null;
  let initialFacetsData: FacetsData | null = null;
  const cookieStore = await cookies();
  const visitId = cookieStore.get('mf_visit')?.value;
  const trackingHeaders = buildServerTrackingHeaders({
    trustedVisitorId: cookieStore.get('mf_vid')?.value,
    sessionId: cookieStore.get('session_id')?.value,
    visitId,
  });

  if (q) {
    const queryParams = new URLSearchParams();
    const searchParamKeys = [
      'page',
      'limit',
      'brands',
      'minPrice',
      'maxPrice',
      'sortBy',
      'colors',
      'genders',
      'styles',
      'seasons',
      'categories',
    ] as const;

    queryParams.set('search', q);

    for (const key of searchParamKeys) {
      const rawValue = resolvedSearchParams[key];
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

      if (value) {
        queryParams.set(key, value);
      }
    }

    [initialProductsData, initialFacetsData] = await Promise.all([
      fetchServerApiJson<ApiListResponse<Product>>(
        `/products?${queryParams.toString()}`,
        { headers: trackingHeaders },
      ),
      fetchServerApiJson<FacetsData>(
        `/products/facets?search=${encodeURIComponent(q)}`,
      ),
    ]);
  }

  return (
    <SearchPageClient
      initialBrands={brands}
      initialCategories={categories}
      initialColors={colors}
      initialFacetsData={initialFacetsData}
      initialGenders={genders}
      initialLimit={limit}
      initialMaxPrice={maxPrice}
      initialMinPrice={minPrice}
      initialPage={page}
      initialProductsData={initialProductsData}
      initialQuery={q}
      initialServerVisitIdAvailable={Boolean(visitId)}
      initialSeasons={seasons}
      initialSortBy={sortBy}
      initialStyles={styles}
      pathname={`/${locale}/search`}
    />
  );
}
