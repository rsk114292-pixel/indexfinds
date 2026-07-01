'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Camera, RefreshCw } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { getImageReferrerPolicy } from '@/lib/image-utils';
import {
  useVisualSearchFilters,
  type VisualSearchSortBy,
} from '@/hooks/useVisualSearchFilters';
import MobileVisualSearchResults from './MobileVisualSearchResults';
import {
  mapVisualSearchResults,
  type VisualSearchResultItem,
  type VisualSearchSourceProduct,
} from '../visualSearchShared';

interface MobileProductBasedVisualSearchProps {
  productId: string;
}

export default function MobileProductBasedVisualSearch({
  productId,
}: MobileProductBasedVisualSearchProps) {
  const t = useTranslations('visualSearch');
  const ts = useTranslations('sort');

  const { data, isLoading, mutate } = useSWR<{
    sourceProduct: VisualSearchSourceProduct | null;
    results: VisualSearchResultItem[];
    total: number;
  }>(
    `/visual-search/by-product/${productId}?limit=50&minSimilarity=25`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  const allProducts = useMemo(
    () => mapVisualSearchResults(data?.results || []),
    [data?.results],
  );
  const sourceProduct = data?.sourceProduct ?? null;
  const filters = useVisualSearchFilters(allProducts);

  const sortOptions: { value: VisualSearchSortBy; label: string }[] = [
    { value: 'similarity', label: t('sortBySimilarity') },
    { value: 'price_asc', label: ts('priceAsc') },
    { value: 'price_desc', label: ts('priceDesc') },
  ];

  const sourcePanel = (
    <div className="bg-background">
      <div
        data-testid="visual-search-source-panel"
        className="mx-4 mt-2 rounded-xl bg-gray-50 px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {sourceProduct?.mainImage ? (
            <img
              src={sourceProduct.mainImage}
              alt={sourceProduct.title}
              className="h-16 w-16 shrink-0 rounded-lg border object-cover"
              referrerPolicy={getImageReferrerPolicy(sourceProduct.mainImage)}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-white text-gray-300">
              <Camera className="h-6 w-6" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <span className="text-sm text-muted">{t('searching')}</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground">
                {t('resultsCount', { count: allProducts.length })}
                {filters.filterCount > 0 && (
                  <span className="ml-1 text-muted">({filters.products.length})</span>
                )}
              </p>
            )}

            <p className="mt-1 line-clamp-2 text-xs text-muted">
              {sourceProduct?.title || t('title')}
            </p>

            {!isLoading && (
              <button
                type="button"
                onClick={() => void mutate()}
                className="mt-1.5 flex items-center gap-0.5 text-xs font-medium text-primary active:opacity-70"
              >
                <RefreshCw className="h-3 w-3" />
                {t('reSearch')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MobileVisualSearchResults
      loading={isLoading}
      hasSource
      totalCount={allProducts.length}
      filters={filters}
      sortOptions={sortOptions}
      sourcePanel={sourcePanel}
    />
  );
}
