/**
 * 前台首页 - 服务端组件
 * URL: /
 *
 * SEO 优化：
 * - 动态 generateMetadata，支持多语言 SEO
 * - 客户端交互逻辑委托给 HomePageClient
 */
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import HomePageClient from './HomePageClient';
import { HOME_SHOWCASE_LIMIT } from '@/lib/home-showcase';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { getHomeSeoCopy, HOME_KEYWORDS } from '@/lib/home-seo';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import type { ApiListResponse, Brand, Category, ProductListItem } from '@/types';
import {
  isTenantLocaleIndexable,
  resolveTenantFromHeaders,
} from '@/lib/tenant-config';

const SITE_URL = getSiteUrl();

interface HotSearchItem {
  keyword: string;
  count: number;
}

async function fetchHomeData<T>(path: string, revalidate = 60): Promise<T | null> {
  return fetchServerApiJson<T>(path, {
    next: { revalidate },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const homeSeo = getHomeSeoCopy(locale);
  const headersList = await headers();
  const localTenantHost = process.env.INDEXFINDS_LOCAL_TENANT_HOST;
  const tenant = resolveTenantFromHeaders(headersList, localTenantHost);
  const branding = tenant?.branding;
  const siteUrl = tenant?.canonicalOrigin || SITE_URL;
  const tenantHomeUrl = `${siteUrl}/en`;
  const tenantCanIndex = tenant
    ? isTenantLocaleIndexable(tenant, locale)
    : false;

  return {
    title: {
      absolute: branding?.seoTitle || homeSeo.title,
    },
    description: branding?.description || homeSeo.description,
    keywords: branding ? undefined : [...HOME_KEYWORDS],
    openGraph: {
      title: branding?.seoTitle || homeSeo.ogTitle,
      description: branding?.description || homeSeo.ogDescription,
      url: tenant ? tenantHomeUrl : `${siteUrl}/${locale}`,
      siteName: branding?.siteName || getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: branding?.seoTitle || homeSeo.ogTitle,
      description: branding?.description || homeSeo.ogDescription,
    },
    alternates: tenant
      ? {
          canonical: tenantHomeUrl,
          languages: { en: tenantHomeUrl, 'x-default': tenantHomeUrl },
        }
      : generateAlternates('', locale, siteUrl),
    robots: {
      index: tenant ? tenantCanIndex : true,
      follow: true,
    },
  };
}

export default async function HomePage() {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const initialViewport = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)
    ? 'mobile'
    : 'desktop';
  const tenant = resolveTenantFromHeaders(
    headersList,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  const showcaseLimit = tenant ? 12 : HOME_SHOWCASE_LIMIT;

  const [
    initialHotSearches,
    initialFeaturedBrands,
    initialCategories,
    initialNewestProducts,
  ] = await Promise.all([
    fetchHomeData<HotSearchItem[]>('/products/hot-searches?limit=6', 300),
    fetchHomeData<ApiListResponse<Brand>>(
      '/brands?status=active&isFeatured=true&limit=12',
      60,
    ),
    fetchHomeData<Category[] | { data: Category[] }>('/categories/home', 60),
    fetchHomeData<ApiListResponse<ProductListItem>>(
      `/products?sortBy=newest&limit=${showcaseLimit}`,
      30,
    ),
  ]);

  return (
    <HomePageClient
      initialViewport={initialViewport}
      initialHotSearches={initialHotSearches ?? undefined}
      initialFeaturedBrands={initialFeaturedBrands ?? undefined}
      initialCategories={initialCategories ?? undefined}
      initialNewestProducts={initialNewestProducts ?? undefined}
    />
  );
}
