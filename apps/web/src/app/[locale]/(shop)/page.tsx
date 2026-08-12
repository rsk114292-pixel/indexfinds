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

const SITE_URL = getSiteUrl();

interface HotSearchItem {
  keyword: string;
  count: number;
}

interface PublicStats {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
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

  return {
    title: {
      absolute: homeSeo.title,
    },
    description: homeSeo.description,
    keywords: [...HOME_KEYWORDS],
    openGraph: {
      title: homeSeo.ogTitle,
      description: homeSeo.ogDescription,
      url: `${SITE_URL}/${locale}`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: homeSeo.ogTitle,
      description: homeSeo.ogDescription,
    },
    alternates: generateAlternates('', locale),
    robots: {
      index: true,
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

  const [
    initialHotSearches,
    initialFeaturedBrands,
    initialCategories,
    initialNewestProducts,
    initialStats,
  ] = await Promise.all([
    fetchHomeData<HotSearchItem[]>('/products/hot-searches?limit=6', 300),
    fetchHomeData<ApiListResponse<Brand>>(
      '/brands?status=active&isFeatured=true&limit=12',
      60,
    ),
    fetchHomeData<Category[] | { data: Category[] }>('/categories/home', 60),
    fetchHomeData<ApiListResponse<ProductListItem>>(
      `/products?sortBy=newest&limit=${HOME_SHOWCASE_LIMIT}`,
      30,
    ),
    fetchHomeData<PublicStats>('/public/stats', 60),
  ]);

  return (
    <HomePageClient
      initialViewport={initialViewport}
      initialHotSearches={initialHotSearches ?? undefined}
      initialFeaturedBrands={initialFeaturedBrands ?? undefined}
      initialCategories={initialCategories ?? undefined}
      initialNewestProducts={initialNewestProducts ?? undefined}
      initialStats={initialStats ?? undefined}
    />
  );
}
