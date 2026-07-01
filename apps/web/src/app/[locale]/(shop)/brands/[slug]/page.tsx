/**
 * 品牌详情页 - 服务端组件
 * URL: /brands/[slug]
 *
 * SEO 优化：
 * - 动态 generateMetadata 生成 title, description, Open Graph, hreflang
 * - 服务端数据获取，支持 ISR 缓存
 * - 客户端交互逻辑委托给 BrandPageClient
 */
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import BrandPageClient from './BrandPageClient';
import { BreadcrumbJsonLd } from '@/components/seo';
import { defaultGoogleBot, generateAlternates, getOgLocale } from '@/lib/seo';
import type { Brand } from '@/types';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { locales } from '@/i18n/config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

const SITE_URL = getSiteUrl();

// 构建时预生成所有品牌 × 所有 locale 的静态页面
export async function generateStaticParams() {
  const data = await fetchServerApiJson<{ slugs?: string[] }>('/brands/slugs');

  if (!data?.slugs?.length) {
    return [];
  }

  return locales.flatMap((locale) =>
    data.slugs!.map((slug) => ({ locale, slug })),
  );
}

// 服务端获取品牌数据
async function getBrand(slug: string): Promise<Brand | null> {
  return fetchServerApiJson<Brand>(`/brands/slug/${slug}`, {
    next: { revalidate: 86400 }, // ISR: 24小时
  });
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
    const brand = await getBrand(slug);

    if (!brand) {
      return {
        title: t('brandNotFound'),
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

    const title = t('brandTitle', { name: brand.name });
    const description = brand.description
      || t('brandFallbackDescription', {
        name: brand.name,
        siteName: getSiteName(),
      });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/${locale}/brands/${slug}`,
        siteName: getSiteName(),
        type: 'website',
        locale: getOgLocale(locale),
        ...(brand.logoUrl && {
          images: [{ url: brand.logoUrl, width: 200, height: 200, alt: brand.name }],
        }),
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      alternates: generateAlternates(`/brands/${slug}`, locale),
      robots: { index: true, follow: true, googleBot: defaultGoogleBot },
    };
  } catch {
    return {
      title: getSiteName(),
      robots: { index: true, follow: true, googleBot: defaultGoogleBot },
    };
  }
}

interface BrandPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { locale, slug } = await params;
  const brand = await getBrand(slug);

  if (!brand) {
    notFound();
  }

  // 已合并品牌：301 重定向到目标品牌
  if (brand?.status === 'merged' && brand.mergedIntoId) {
    const targetBrand = await fetchServerApiJson<Brand>(`/brands/${brand.mergedIntoId}`);
    const targetSlug = targetBrand?.slug || null;
    if (targetSlug) {
      redirect(`/${locale}/brands/${targetSlug}`);
    }
  }

  const [tBrands, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'brands' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);

  // 构建面包屑数据（Home 由 BreadcrumbJsonLd 组件自动添加）
  const breadcrumbItems = [
    { name: tBrands('title') || 'Brands', url: '/brands' },
    ...(brand ? [{ name: brand.name }] : []),
  ];

  return (
    <>
      <BreadcrumbJsonLd locale={locale} homeName={tCommon('home')} items={breadcrumbItems} />
      <BrandPageClient slug={slug} initialBrand={brand} />
    </>
  );
}
