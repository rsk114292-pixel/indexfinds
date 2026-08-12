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

  const title = t('categoriesTitle');
  const description = t('categoriesDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/categories`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
      images: [
        {
          url: `${SITE_URL}/${locale}/share-image`,
          width: 1200,
          height: 630,
          alt: `${getSiteName()} category directory`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/${locale}/share-image`],
    },
    alternates: generateAlternates('/categories', locale),
    robots: { index: true, follow: true },
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
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const categories = await getCategoriesList();

  const listItems = categories.map((cat) => ({
    name: cat.name,
    url: `${SITE_URL}/${locale}/categories/${cat.slug}`,
  }));

  return (
    <>
      <ItemListJsonLd name={t('categoriesTitle')} items={listItems} />
      <CategoriesPageClient />
    </>
  );
}
