/**
 * 分类页 - 服务端组件
 * URL: /categories/[slug]
 *
 * SEO 优化：
 * - 动态 generateMetadata 生成 title, description, Open Graph
 * - 服务端数据获取，支持 ISR 缓存
 * - 客户端交互逻辑委托给 CategoryPageClient
 */
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import CategoryPageClient from './CategoryPageClient';
import { BreadcrumbJsonLd } from '@/components/seo';
import { getLocalizedName } from '@/lib/utils';
import { generateAlternates, defaultGoogleBot, getOgLocale } from '@/lib/seo';
import type { Category } from '@/types';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { locales } from '@/i18n/config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

const SITE_URL = getSiteUrl();

function isCategory(value: Category | { data?: Category }): value is Category {
  return (
    typeof (value as Partial<Category>).slug === 'string' &&
    typeof (value as Partial<Category>).name === 'string'
  );
}

// 构建时预生成所有分类 × 所有 locale 的静态页面
export async function generateStaticParams() {
  const data = await fetchServerApiJson<{ slugs?: string[] }>('/categories/slugs');

  if (!data?.slugs?.length) {
    return [];
  }

  return locales.flatMap((locale) =>
    data.slugs!.map((slug) => ({ locale, slug })),
  );
}

// 服务端获取分类数据
async function getCategory(slug: string): Promise<Category | null> {
  const data = await fetchServerApiJson<Category | { data?: Category }>(
    `/categories/slug/${slug}`,
    {
      next: { revalidate: 86400 }, // ISR: 24小时
    },
  );
  if (!data) return null;
  if ('data' in data) {
    return data.data ?? null;
  }
  return isCategory(data) ? data : null;
}

// 动态 Metadata 生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  try {
    const { locale, slug } = await params;
    const t = await getTranslations({ locale, namespace: 'metadata' });
    const category = await getCategory(slug);

    if (!category) {
      return {
        title: t('categoryNotFound'),
        robots: {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
      };
    }

    const localName = getLocalizedName(category, locale);
    const title = t('categoryTitle', { name: localName });
    const description = t('categoryDescription', {
      name: localName,
      siteName: getSiteName(),
    });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/${locale}/categories/${slug}`,
        siteName: getSiteName(),
        type: 'website',
        locale: getOgLocale(locale),
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      alternates: generateAlternates(`/categories/${slug}`, locale),
      robots: {
        index: true,
        follow: true,
        googleBot: defaultGoogleBot,
      },
    };
  } catch {
    return {
      title: getSiteName(),
      robots: {
        index: true,
        follow: true,
        googleBot: defaultGoogleBot,
      },
    };
  }
}

// 页面加载状态
function PageLoading() {
  return (
    <div className="container mx-auto px-4 py-8 flex justify-center">
      <Spinner size="lg" />
    </div>
  );
}

interface CategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const category = await getCategory(slug);
  if (!category) {
    notFound();
  }

  // 构建面包屑数据（Home 由 BreadcrumbJsonLd 组件自动添加）
  const breadcrumbItems = [
    { name: getLocalizedName(category, locale) },
  ];

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <BreadcrumbJsonLd locale={locale} homeName={tCommon('home')} items={breadcrumbItems} />

      <Suspense fallback={<PageLoading />}>
        <CategoryPageClient slug={slug} initialCategory={category} />
      </Suspense>
    </>
  );
}
