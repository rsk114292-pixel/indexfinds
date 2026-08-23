/**
 * 品牌列表页 - 服务端组件
 * URL: /brands
 *
 * SEO 优化：
 * - 动态 generateMetadata 生成 title, description, Open Graph, hreflang
 * - ItemList JSON-LD 结构化数据（品牌轮播 rich result）
 * - 客户端交互逻辑委托给 BrandsPageClient
 */
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BrandsPageClient from './BrandsPageClient';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import { getOgLocale } from '@/lib/seo';
import {
  buildSiteAlternates,
  getRequestSiteIdentity,
} from '@/lib/request-site-identity';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const identity = await getRequestSiteIdentity();
  const { siteUrl, siteName, tenant } = identity;

  const title = t('brandsTitle');
  const description = tenant
    ? `Browse brands represented in the ${siteName} product index and continue into current catalog results.`
    : t('brandsDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/brands`,
      siteName,
      type: 'website',
      locale: getOgLocale(locale),
      images: [
        {
          url: `${siteUrl}/${locale}/share-image`,
          width: 1200,
          height: 630,
          alt: `${siteName} brand directory`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/${locale}/share-image`],
    },
    alternates: buildSiteAlternates(identity, '/brands', locale),
    robots: { index: !tenant, follow: true },
  };
}

async function getBrandsList(): Promise<{ name: string; slug: string }[]> {
  const data = await fetchServerApiJson<{ data?: { name: string; slug: string }[] }>(
    '/brands?status=active&hasProducts=true&limit=0',
    { next: { revalidate: 86400 } },
  );
  return data?.data || [];
}

export default async function BrandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const { siteUrl } = await getRequestSiteIdentity();
  const brands = await getBrandsList();

  const listItems = brands.slice(0, 100).map((brand) => ({
    name: brand.name,
    url: `${siteUrl}/${locale}/brands/${brand.slug}`,
  }));

  return (
    <>
      <ItemListJsonLd name={t('brandsTitle')} items={listItems} />
      <BrandsPageClient />
    </>
  );
}
