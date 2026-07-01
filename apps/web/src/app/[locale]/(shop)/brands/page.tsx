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
import { generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const title = t('brandsTitle');
  const description = t('brandsDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/brands`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: { card: 'summary', title, description },
    alternates: generateAlternates('/brands', locale),
    robots: { index: true, follow: true },
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
  const brands = await getBrandsList();

  const listItems = brands.slice(0, 100).map((brand) => ({
    name: brand.name,
    url: `${SITE_URL}/${locale}/brands/${brand.slug}`,
  }));

  return (
    <>
      <ItemListJsonLd name={t('brandsTitle')} items={listItems} />
      <BrandsPageClient />
    </>
  );
}
