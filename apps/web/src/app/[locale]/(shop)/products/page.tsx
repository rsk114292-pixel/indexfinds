import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getOgLocale, defaultGoogleBot } from '@/lib/seo';
import {
  buildSiteAlternates,
  getRequestSiteIdentity,
} from '@/lib/request-site-identity';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import type { ApiListResponse, Product } from '@/types';
import type { FacetsData } from '@/components/filters/types';
import { DEFAULT_DESKTOP_PRODUCT_LIMIT } from '@/lib/product-list-layout';
import { buildProductFacetsPath } from '@/lib/product-facets';
import ProductsPageClient from './ProductsPageClient';

function getSearchParamValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;
  const title = t('productsTitle');
  const description = tenant
    ? `Browse products in ${siteName} and compare visible listing details before choosing a buying route.`
    : t('productsDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/products`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
      images: [
        {
          url: `${siteUrl}/${locale}/share-image`,
          width: 1200,
          height: 630,
          alt: `${siteName} product discovery`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/${locale}/share-image`],
    },
    alternates: buildSiteAlternates(identity, '/products', locale),
    robots: {
      index: !tenant,
      follow: true,
      googleBot: tenant
        ? { index: false, follow: true }
        : defaultGoogleBot,
    },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
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
  const occasions = getSearchParamValue(resolvedSearchParams.occasions);
  const seasons = getSearchParamValue(resolvedSearchParams.seasons);
  const categories = getSearchParamValue(resolvedSearchParams.categories);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));
  queryParams.set('sortBy', sortBy);
  if (brands) queryParams.set('brands', brands);
  if (minPrice) queryParams.set('minPrice', minPrice);
  if (maxPrice) queryParams.set('maxPrice', maxPrice);
  if (colors) queryParams.set('colors', colors);
  if (genders) queryParams.set('genders', genders);
  if (styles) queryParams.set('styles', styles);
  if (occasions) queryParams.set('occasions', occasions);
  if (seasons) queryParams.set('seasons', seasons);
  if (categories) queryParams.set('categories', categories);

  const [initialProductsData, initialFacetsData] = await Promise.all([
    fetchServerApiJson<ApiListResponse<Product>>(`/products?${queryParams.toString()}`),
    fetchServerApiJson<FacetsData>(buildProductFacetsPath(categories)),
  ]);

  return (
    <ProductsPageClient
      initialFacetsData={initialFacetsData}
      initialProductsData={initialProductsData}
    />
  );
}
