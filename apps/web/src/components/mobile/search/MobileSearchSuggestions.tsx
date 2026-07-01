'use client';

import { Search } from 'lucide-react';
import Image from 'next/image';
import { getImageReferrerPolicy, getImageVariant } from '@/lib/image-utils';
import { useCategoryLabelResolver } from '@/hooks/useCategoryLabelResolver';
import type { SearchSuggestions } from '@/lib/search';

interface MobileSearchSuggestionsProps {
  suggestions: SearchSuggestions | null;
  loading: boolean;
  hasMinInput: boolean;
  locale: string;
  onSelectBrand: (slug: string, name?: string) => void;
  onSelectCategory: (slug: string) => void;
  onSelectProduct: (slug: string) => void;
  labels: {
    searching: string;
    brands: string;
    categories: string;
    products: string;
    noResults: string;
    productCount: (count: number) => string;
  };
}

export function MobileSearchSuggestions({
  suggestions,
  loading,
  hasMinInput,
  locale,
  onSelectBrand,
  onSelectCategory,
  onSelectProduct,
  labels,
}: MobileSearchSuggestionsProps) {
  const { getCategoryLabel } = useCategoryLabelResolver();
  const hasSuggestions =
    suggestions &&
    (suggestions.brands.length > 0 ||
      suggestions.categories.length > 0 ||
      suggestions.products.length > 0);

  return (
    <div className="px-4 py-2">
      {loading && !hasSuggestions && (
        <div className="flex items-center justify-center py-8">
          <span className="text-sm text-muted">{labels.searching}</span>
        </div>
      )}

      {hasSuggestions && (
        <div className="space-y-4">
          {/* Brand suggestions */}
          {suggestions!.brands.length > 0 && (
            <section>
              <h4 className="text-xs font-medium text-muted mb-2">{labels.brands}</h4>
              <div className="flex flex-wrap gap-2">
                {suggestions!.brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => onSelectBrand(brand.slug, brand.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-gray-100 text-foreground font-medium active:bg-gray-200 transition-colors"
                  >
                    {brand.name}
                    {brand.productCount !== undefined && (
                      <span className="text-xs text-muted">{brand.productCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Category suggestions */}
          {suggestions!.categories.length > 0 && (
            <section>
              <h4 className="text-xs font-medium text-muted mb-2">{labels.categories}</h4>
              {suggestions!.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(category.slug)}
                  className="flex items-center justify-between w-full px-2 py-2.5 rounded-lg active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted" />
                    <span className="text-sm font-medium text-foreground">
                      {getCategoryLabel(
                        category.slug,
                        locale === 'zh'
                          ? category.chineseName || category.name
                          : category.name,
                      )}
                    </span>
                    {locale !== 'zh' && category.chineseName && (
                      <span className="text-xs text-muted">{category.chineseName}</span>
                    )}
                  </div>
                  {category.productCount !== undefined && (
                    <span className="text-xs text-muted">
                      {labels.productCount(category.productCount)}
                    </span>
                  )}
                </button>
              ))}
            </section>
          )}

          {/* Product suggestions */}
          {suggestions!.products.length > 0 && (
            <section>
              <h4 className="text-xs font-medium text-muted mb-2">{labels.products}</h4>
              {suggestions!.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product.slug)}
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-lg active:bg-gray-50 transition-colors"
                >
                  {product.images?.[0] && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <Image
                        src={getImageVariant(product.images[0], 80)}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                        referrerPolicy={getImageReferrerPolicy(getImageVariant(product.images[0], 80))}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left rtl:text-right">
                    <p className="text-sm font-medium text-foreground truncate">{product.title}</p>
                    {product.chineseTitle && (
                      <p className="text-xs text-muted truncate">{product.chineseTitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </section>
          )}
        </div>
      )}

      {!loading && !hasSuggestions && hasMinInput && (
        <div className="flex flex-col items-center py-12">
          <Search className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-muted">{labels.noResults}</p>
        </div>
      )}
    </div>
  );
}
