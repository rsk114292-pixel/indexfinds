/**
 * 分类列表页 - 服务端组件
 * URL: /categories
 *
 * SEO 优化：
 * - 动态 generateMetadata 生成 title, description, Open Graph, hreflang
 * - ItemList JSON-LD 结构化数据（分类轮播 rich result）
 * - 客户端交互逻辑委托给 CategoriesPageClient
 */
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import CategoriesPageClient from './CategoriesPageClient';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import { getOgLocale } from '@/lib/seo';
import {
  buildSiteAlternates,
  getRequestSiteIdentity,
} from '@/lib/request-site-identity';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import { getTenantResearchPage } from '@/lib/tenant-research-pages';
import TenantResearchPage, {
  generateMetadata as generateTenantResearchMetadata,
} from '../[platformSlug]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;

  if (tenant && getTenantResearchPage(tenant.domain, 'categories')) {
    return generateTenantResearchMetadata({
      params: Promise.resolve({ locale, platformSlug: 'categories' }),
    });
  }

  const title = t('categoriesTitle');
  const description = tenant
    ? `Browse product categories in the ${siteName} index and narrow the catalog before comparing listings.`
    : t('categoriesDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/categories`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
      images: [
        {
          url: `${siteUrl}/${locale}/share-image`,
          width: 1200,
          height: 630,
          alt: `${siteName} category directory`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/${locale}/share-image`],
    },
    alternates: buildSiteAlternates(identity, '/categories', locale),
    robots: { index: !tenant, follow: true },
  };
}

async function getCategoriesList(): Promise<{ name: string; slug: string }[]> {
  const data = await fetchServerApiJson<{ name: string; slug: string }[] | { data?: { name: string; slug: string }[] }>(
    '/categories',
    {
      next: { revalidate: 86400 },
    },
  );
  if (!data) return [];
  return Array.isArray(data) ? data : data.data || [];
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const identity = await getRequestSiteIdentity();

  if (
    identity.tenant &&
    getTenantResearchPage(identity.tenant.domain, 'categories')
  ) {
    return TenantResearchPage({
      params: Promise.resolve({ locale, platformSlug: 'categories' }),
    });
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });
  const { siteUrl } = identity;
  const categories = await getCategoriesList();

  const listItems = categories.map((cat) => ({
    name: cat.name,
    url: `${siteUrl}/${locale}/categories/${cat.slug}`,
  }));

  return (
    <>
      <ItemListJsonLd name={t('categoriesTitle')} items={listItems} />
      <CategoriesPageClient />
    </>
  );
}
