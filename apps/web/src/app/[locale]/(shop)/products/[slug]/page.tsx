/**
 * 商品详情页 - 服务端组件
 * URL: /products/[slug]
 *
 * SEO 优化：
 * - 动态 generateMetadata 生成 title, description, Open Graph
 * - 服务端数据获取，支持 ISR 缓存
 * - 客户端交互逻辑委托给 ProductPageClient
 */
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import ProductPageClient from './ProductPageClient';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { getLocalizedName } from '@/lib/utils';
import {
  defaultGoogleBot,
  generateAlternates,
  getOgLocale,
  getProductMetadataKeywords,
} from '@/lib/seo';
import type { Product } from '@/types';
import { getSiteUrl, getSiteName } from '@/lib/site-config';
import { getProductDetailTag } from '@/lib/cache-tags';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

const SITE_URL = getSiteUrl();

// 动态渲染：解决 next-intl getTranslations 在 ISR 页面触发 DYNAMIC_SERVER_USAGE
// 页面仍通过 fetch revalidate: 3600 + Vercel Edge Cache 获得缓存
export const dynamic = 'force-dynamic';

// 服务端获取产品数据
async function getProduct(slug: string): Promise<Product | null> {
  return fetchServerApiJson<Product>(`/products/slug/${slug}`, {
    next: {
      revalidate: 3600,
      tags: [getProductDetailTag(slug)],
    }, // ISR: 1小时（主动 revalidateTag 兜底）
  });
}

// 动态 Metadata 生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const product = await getProduct(slug);

  if (!product) {
    return { title: t('productNotFound') };
  }

  // 构建标题
  const title = product.brand?.name
    ? `${product.brand.name} ${product.title}`
    : product.title;

  // 构建描述（仅在截断时追加省略号）
  const descriptionRaw = product.description
    ? product.description.replace(/<[^>]*>/g, '')
    : '';
  const description = descriptionRaw
    ? (descriptionRaw.length > 155 ? descriptionRaw.slice(0, 155) + '...' : descriptionRaw)
    : t('productFallbackDescription', { title });

  // 价格信息
  const price = product.priceMin
    ? `${product.currency || 'CNY'} ${product.priceMin}`
    : '';

  return {
    title: `${title}${price ? ` - ${price}` : ''}`,
    description,
    keywords: [
      product.brand?.name,
      product.primaryCategory ? getLocalizedName(product.primaryCategory, locale) : undefined,
      ...getProductMetadataKeywords(locale),
      'Weidian',
      'Taobao',
      '1688',
    ].filter(Boolean) as string[],

    // Open Graph — images 由 opengraph-image.tsx 自动生成
    openGraph: {
      title: `${title} | ${getSiteName()}`,
      description,
      type: 'website',
      url: `${SITE_URL}/${locale}/products/${slug}`,
      siteName: getSiteName(),
      locale: getOgLocale(locale),
    },

    // Twitter Card — 自动回退用 og:image
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${getSiteName()}`,
      description,
    },

    // Canonical URL + alternates
    alternates: generateAlternates(`/products/${slug}`, locale),

    // Robots 指令
    robots: {
      index: true,
      follow: true,
      googleBot: defaultGoogleBot,
    },
  };
}

// 页面组件（服务端）
export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'metadata' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // 构建面包屑数据（Home 由 BreadcrumbJsonLd 组件自动添加）
  const breadcrumbItems = [
    ...(product.primaryCategory
      ? [
          {
            name: getLocalizedName(product.primaryCategory, locale),
            url: `/categories/${product.primaryCategory.slug}`,
          },
        ]
      : []),
    { name: product.title },
  ];

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <ProductJsonLd
        locale={locale}
        fallbackDescription={t('productFallbackDescription', { title: product.title })}
        product={{
          slug: product.slug,
          title: product.title,
          description: product.description,
          mainImage: product.mainImage,
          images: product.images,
          brand: product.brand ?? undefined,
          primaryCategory: product.primaryCategory ?? undefined,
          priceMin: product.priceMin ?? undefined,
          priceMax: product.priceMax ?? undefined,
          currency: product.currency,
        }}
      />
      <BreadcrumbJsonLd locale={locale} homeName={tCommon('home')} items={breadcrumbItems} />

      {/* 客户端交互组件 */}
      <ProductPageClient initialProduct={product} slug={slug} />
    </>
  );
}
