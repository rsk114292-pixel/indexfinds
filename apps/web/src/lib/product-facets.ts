/**
 * Keep facet counts scoped to the category currently shown on the product page.
 * Other filters are intentionally omitted so users can still select alternative
 * brands, colors, and attributes within that category.
 */
export function buildProductFacetsPath(categories?: string | null): string {
  const params = new URLSearchParams();
  const normalizedCategories = categories?.trim();

  if (normalizedCategories) {
    params.set('categories', normalizedCategories);
  }

  const query = params.toString();
  return query ? `/products/facets?${query}` : '/products/facets';
}
