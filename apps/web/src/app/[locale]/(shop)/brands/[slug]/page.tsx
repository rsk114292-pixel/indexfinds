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
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import type { Brand } from '@/types';
import { getSiteName } from '@/lib/site-config';
import {
  buildSiteAlternates,
  getRequestSiteIdentity,
} from '@/lib/request-site-identity';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

// Brand responses include a request-host-specific canonical and robots policy.
// Keep them dynamic so a static RSC payload is never reused across tenants.
export const dynamic = 'force-dynamic';

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
    const identity = await getRequestSiteIdentity();
    const { siteUrl, siteName, tenant } = identity;
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
        siteName,
      });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${siteUrl}/${locale}/brands/${slug}`,
        siteName,
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
      alternates: buildSiteAlternates(identity, `/brands/${slug}`, locale),
      robots: {
        index: !tenant,
        follow: true,
        googleBot: tenant
          ? { index: false, follow: true }
          : defaultGoogleBot,
      },
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
  const { siteUrl } = await getRequestSiteIdentity();

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
      <BreadcrumbJsonLd
        locale={locale}
        baseUrl={siteUrl}
        homeName={tCommon('home')}
        items={breadcrumbItems}
      />
      <BrandPageClient slug={slug} initialBrand={brand} />
    </>
  );
}
