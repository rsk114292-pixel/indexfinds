'use client';

import { API_BASE_URL } from '@/lib/constants';

import { useState, useEffect, useCallback, useRef, useMemo, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, RefreshCw } from 'lucide-react';
import {
  useVisualSearchFilters,
  type VisualSearchSortBy,
} from '@/hooks/useVisualSearchFilters';
import MobileVisualSearchResults from './MobileVisualSearchResults';
import {
  mapVisualSearchResults,
  type VisualSearchResultItem,
} from '../visualSearchShared';

export default function MobileVisualSearch() {
  const t = useTranslations('visualSearch');
  const ts = useTranslations('sort');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [searchImage, setSearchImage] = useState<string | null>(null);
  const [results, setResults] = useState<VisualSearchResultItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedImage = sessionStorage.getItem('visualSearchImage');
    const savedResults = sessionStorage.getItem('visualSearchResults');
    if (savedImage && savedResults) {
      setSearchImage(savedImage);
      try {
        setResults(JSON.parse(savedResults));
      } catch {
        // Ignore invalid cached data and keep page usable.
      }
    }
    setInitialized(true);
  }, []);

  const performSearch = useCallback(async (imageDataUrl: string) => {
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('image', blob, 'search-image.jpg');

      const searchResponse = await fetch(
        `${API_BASE_URL}/visual-search/search?limit=50&minSimilarity=25`,
        { method: 'POST', body: formData },
      );

      if (!searchResponse.ok) {
        throw new Error('Search failed');
      }

      const data = await searchResponse.json();
      const nextResults = data.results || [];
      setResults(nextResults);
      sessionStorage.setItem('visualSearchImage', imageDataUrl);
      sessionStorage.setItem('visualSearchResults', JSON.stringify(nextResults));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      event.target.value = '';

      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const imageDataUrl = loadEvent.target?.result as string;
        setSearchImage(imageDataUrl);
        performSearch(imageDataUrl);
      };
      reader.readAsDataURL(file);
    },
    [performSearch],
  );

  const allProducts = useMemo(() => mapVisualSearchResults(results), [results]);
  const filters = useVisualSearchFilters(allProducts);

  const sortOptions: { value: VisualSearchSortBy; label: string }[] = [
    { value: 'similarity', label: t('sortBySimilarity') },
    { value: 'price_asc', label: ts('priceAsc') },
    { value: 'price_desc', label: ts('priceDesc') },
  ];

  if (!initialized) {
    return (
      <div className="px-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  const sourcePanel = searchImage ? (
    <div className="bg-background">
      <div
        data-testid="visual-search-source-panel"
        className="mx-4 mt-2 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3"
      >
        <img
          src={searchImage}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg border object-cover"
        />
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="text-sm text-muted">{t('searching')}</span>
            </div>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {t('resultsCount', { count: results.length })}
              {filters.filterCount > 0 && (
                <span className="ml-1 text-muted">({filters.products.length})</span>
              )}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-primary active:opacity-70"
            >
              {t('changeImage')}
            </button>
            {!loading && (
              <button
                type="button"
                onClick={() => performSearch(searchImage)}
                className="flex items-center gap-0.5 text-xs font-medium text-primary active:opacity-70"
              >
                <RefreshCw className="h-3 w-3" />
                {t('reSearch')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      <MobileVisualSearchResults
        loading={loading}
        hasSource={!!searchImage}
        totalCount={allProducts.length}
        filters={filters}
        sortOptions={sortOptions}
        sourcePanel={sourcePanel}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-16">
            <Camera className="h-12 w-12 text-gray-200" />
            <p className="text-sm text-muted">{t('noResults')}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white active:opacity-80"
            >
              {t('changeImage')}
            </button>
          </div>
        }
        initialState={
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('description')}</p>
            <p className="px-8 text-center text-xs text-muted">{t('uploadToSearch')}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white active:opacity-80"
            >
              {t('selectImage')}
            </button>
          </div>
        }
      />
    </>
  );
}
