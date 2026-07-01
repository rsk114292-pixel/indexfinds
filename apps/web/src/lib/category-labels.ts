import { getLocalizedName } from '@/lib/utils';
import type { Category } from '@/types';

export type CategoriesResponse = Category[] | { data: Category[] };

export function normalizeCategoriesResponse(
  data: CategoriesResponse | undefined,
): Category[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: Category[] }).data;
  }
  return [];
}

export function buildCategorySlugMap(
  categories: Category[],
): Map<string, Category> {
  return new Map(categories.map((category) => [category.slug, category]));
}

export function resolveLocalizedCategoryLabel(params: {
  slug: string;
  locale: string;
  categoriesBySlug: Map<string, Category>;
  fallbackLabel?: string | null;
}): string {
  const category = params.categoriesBySlug.get(params.slug);
  if (category) {
    return getLocalizedName(category, params.locale);
  }

  return params.fallbackLabel?.trim() || params.slug;
}
