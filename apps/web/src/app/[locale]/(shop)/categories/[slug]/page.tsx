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
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import CategoryPageClient from './CategoryPageClient';
import { BreadcrumbJsonLd } from '@/components/seo';
import { getLocalizedName } from '@/lib/utils';
import { defaultGoogleBot, getOgLocale } from '@/lib/seo';
import type { ApiListResponse, Category, Product } from '@/types';
import type { FacetsData } from '@/components/filters/types';
import { getSiteName } from '@/lib/site-config';
import {
  buildSiteAlternates,
  getRequestSiteIdentity,
} from '@/lib/request-site-identity';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import {
  DEFAULT_DESKTOP_PRODUCT_LIMIT,
  DESKTOP_PRODUCT_GRID_CLASS,
} from '@/lib/product-list-layout';

// Category responses depend on the request host so each branded tenant keeps
// its own canonical, robots policy and data context. Do not let Next reuse a
// statically generated RSC payload across domains.
export const dynamic = 'force-dynamic';

function isCategory(value: Category | { data?: Category }): value is Category {
  return (
    typeof (value as Partial<Category>).slug === 'string' &&
    typeof (value as Partial<Category>).name === 'string'
  );
}

// 服务端获取分类数据
async function getCategory(slug: string): Promise<Category | null> {
  const data = await fetchServerApiJson<Category | { data?: Category }>(
    `/categories/slug/${slug}`,
    {
      next: { revalidate: 300 },
      retryCount: 1,
      throwOnError: true,
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
    const identity = await getRequestSiteIdentity();
    const { siteUrl, siteName, tenant } = identity;
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
      siteName,
    });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${siteUrl}/${locale}/categories/${slug}`,
        siteName,
        type: 'website',
        locale: getOgLocale(locale),
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
      alternates: buildSiteAlternates(
        identity,
        `/categories/${slug}`,
        locale,
      ),
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
    <div className="container mx-auto flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
      <Spinner size="lg" />
    </div>
  );
}

function NoScriptProductFallback({
  locale,
  category,
  products,
}: {
  locale: string;
  category: Category;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <noscript>
      <section className="container mx-auto px-4 py-8">
        <h2 className="mb-6 text-2xl font-semibold text-foreground">
          {getLocalizedName(category, locale)}
        </h2>
        <div className={DESKTOP_PRODUCT_GRID_CLASS}>
          {products.map((product) => (
            <a
              key={product.id}
              href={`/${locale}/products/${product.slug}`}
              className="overflow-hidden rounded-xl border border-border bg-surface text-foreground"
            >
              <div className="relative aspect-square bg-muted">
                {product.mainImage ? (
                  <Image
                    src={product.mainImage}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <span className="block p-3 text-sm font-medium">
                {product.title}
              </span>
            </a>
          ))}
        </div>
      </section>
    </noscript>
  );
}

interface CategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { locale, slug } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const { siteUrl } = await getRequestSiteIdentity();
  const category = await getCategory(slug);
  if (!category) {
    notFound();
  }

  if (category.slug !== slug) {
    permanentRedirect(`/${locale}/categories/${category.slug}`);
  }

  const productQuery = new URLSearchParams({
    category: category.slug,
    page: '1',
    limit: String(DEFAULT_DESKTOP_PRODUCT_LIMIT),
    sortBy: 'popular',
  });

  const [initialProductsData, initialFacetsData] = await Promise.all([
    fetchServerApiJson<ApiListResponse<Product>>(
      `/products?${productQuery.toString()}`,
    ),
    fetchServerApiJson<FacetsData>(
      `/products/facets?category=${encodeURIComponent(category.slug)}`,
    ),
  ]);

  // 构建面包屑数据（Home 由 BreadcrumbJsonLd 组件自动添加）
  const breadcrumbItems = [
    { name: getLocalizedName(category, locale) },
  ];

  return (
    <>
      <h1 className="sr-only">{getLocalizedName(category, locale)}</h1>
      {/* JSON-LD 结构化数据 */}
      <BreadcrumbJsonLd
        locale={locale}
        baseUrl={siteUrl}
        homeName={tCommon('home')}
        items={breadcrumbItems}
      />

      <NoScriptProductFallback
        locale={locale}
        category={category}
        products={initialProductsData?.data || []}
      />

      <Suspense fallback={<PageLoading />}>
        <CategoryPageClient
          slug={category.slug}
          initialCategory={category}
          initialProductsData={initialProductsData}
          initialFacetsData={initialFacetsData}
        />
      </Suspense>
    </>
  );
}
