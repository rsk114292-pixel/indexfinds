import type { VisualSearchProduct } from '@/hooks/useVisualSearchFilters';

export interface VisualSearchResultItem {
  product: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    images: string[];
    priceMin: number;
    priceMax: number;
    currency?: string;
    brand?: { id: string; name: string; slug: string };
    category?: { name: string; slug: string };
    gender?: string;
    colors?: string[];
  };
  similarity: number;
  matchedImage?: string;
}

export interface VisualSearchSourceProduct {
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  images: string[];
}

export function mapVisualSearchResults(
  results: VisualSearchResultItem[],
): VisualSearchProduct[] {
  return results.map((result) => ({
    id: result.product.id,
    title: result.product.title,
    slug: result.product.slug,
    mainImage:
      result.matchedImage || result.product.mainImage || result.product.images?.[0],
    images: result.product.images,
    price: {
      min: result.product.priceMin,
      max: result.product.priceMax,
      currency: result.product.currency || 'CNY',
    },
    similarity: result.similarity,
    brand: result.product.brand,
    category: result.product.category,
    gender: result.product.gender,
    colors: result.product.colors,
  }));
}
