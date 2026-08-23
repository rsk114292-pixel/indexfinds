/**
 * Product JSON-LD 结构化数据组件
 * 用于生成 Google Rich Snippets（价格、库存、评分等）
 *
 * 效果示例：
 * Nike Air Max 90 - ¥299 - IndexFinds
 * ★★★★☆ (4.5) · In Stock · 128 reviews
 */
import { getLocalizedName } from '@/lib/utils';
import { getSiteUrl, getSiteName } from '@/lib/site-config';

interface ProductJsonLdProps {
  product: {
    slug: string;
    title: string;
    description?: string;
    mainImage?: string;
    images?: string[];
    brand?: { name: string; slug?: string };
    primaryCategory?: {
      name: string;
      slug?: string;
      nameEn?: string;
      translations?: Record<string, { name?: string; description?: string }> | null;
    };
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    sku?: string;
    // 预留评分扩展点（后期评价功能启用）
    rating?: number;
    reviewCount?: number;
  };
  locale?: string;
  fallbackDescription?: string;
  baseUrl?: string;
  siteName?: string;
}

export function ProductJsonLd({
  product,
  locale,
  fallbackDescription,
  baseUrl = getSiteUrl(),
  siteName = getSiteName(),
}: ProductJsonLdProps) {
  const resolvedLocale = locale || 'en';
  const localizedCategoryName = product.primaryCategory
    ? getLocalizedName(product.primaryCategory, resolvedLocale)
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description:
      product.description?.replace(/<[^>]*>/g, '').slice(0, 500) ||
      fallbackDescription ||
      `Shop ${product.title} from ${siteName}`,
    image: product.images?.length
      ? product.images
      : product.mainImage
        ? [product.mainImage]
        : [],
    sku: product.sku || product.slug,
    url: `${baseUrl}/${resolvedLocale}/products/${product.slug}`,

    // 品牌信息
    ...(product.brand?.name && {
      brand: {
        '@type': 'Brand',
        name: product.brand.name,
      },
    }),

    // 分类信息
    ...(localizedCategoryName && {
      category: localizedCategoryName,
    }),

    // 价格信息（仅在有有效价格时输出，避免 lowPrice=0 导致 Google 结构化数据报错）
    ...(product.priceMin && product.priceMin > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        url: `${baseUrl}/${resolvedLocale}/products/${product.slug}`,
        priceCurrency: product.currency || 'CNY',
        lowPrice: product.priceMin,
        highPrice: product.priceMax || product.priceMin,
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: siteName,
        },
      },
    }),

    // 评分信息（预留扩展点，有数据才输出）
    ...(product.rating &&
      product.reviewCount && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default ProductJsonLd;
