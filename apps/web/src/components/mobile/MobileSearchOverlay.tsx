'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useDebounce } from '@/hooks/useDebounce';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { fetchSearchSuggestions, type SearchSuggestions } from '@/lib/search';
import { API_BASE_URL } from '@/lib/constants';
import type { VisualSearchResult } from '@/types';
import {
  getSearchHistory as loadSearchHistory,
  saveSearchHistory,
  removeSearchHistoryItem,
  clearSearchHistory,
} from '@/lib/search-history';
import { useSearchParams } from 'next/navigation';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { usePersonalizedHotSearches } from '@/hooks/usePersonalizedHotSearches';

import { MobileSearchInput } from './search/MobileSearchInput';
import { MobileSearchHistory } from './search/MobileSearchHistory';
import { MobileHotSearches } from './search/MobileHotSearches';
import { MobileSearchSuggestions } from './search/MobileSearchSuggestions';
import { MobilePhotoSearch, type VisualSortBy } from './search/MobilePhotoSearch';

interface MobileSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  autoTriggerPhoto?: boolean;
}

export default function MobileSearchOverlay({
  open,
  onClose,
  initialQuery = '',
  autoTriggerPhoto = false,
}: MobileSearchOverlayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('search');
  const tv = useTranslations('visualSearch');
  const locale = useLocale();
  const returnTo = useMemo(() => buildReturnTo(pathname, searchParams), [pathname, searchParams]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchValue, setSearchValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // 搜图状态
  const [photoMode, setPhotoMode] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResults, setPhotoResults] = useState<VisualSearchResult[]>([]);
  const [photoImage, setPhotoImage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSortBy, setPhotoSortBy] = useState<VisualSortBy>('similarity');

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  useBodyScrollLock(open);

  const { items: hotSearches } = usePersonalizedHotSearches({
    enabled: open,
    limit: 10,
  });

  const debouncedValue = useDebounce(searchValue, 300);
  const trimmedSearchValue = searchValue.trim();

  // Load search history on open（按用户隔离）
  useEffect(() => {
    if (open) {
      setSearchHistory(loadSearchHistory());
    }
  }, [open]);

  // Auto focus input when overlay opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 2) {
      setSuggestions(null);
      return;
    }

    const controller = new AbortController();
    setLoadingSuggestions(true);

    fetchSearchSuggestions(debouncedValue, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSuggestions(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSuggestions(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      });

    return () => controller.abort();
  }, [debouncedValue]);

  const saveToHistory = useCallback((query: string) => {
    const updated = saveSearchHistory(query);
    setSearchHistory(updated);
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    const updated = removeSearchHistoryItem(query);
    setSearchHistory(updated);
  }, []);

  const clearAllHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      saveToHistory(trimmed);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      onClose();
      setSearchValue('');
      setSuggestions(null);
    },
    [router, onClose, saveToHistory],
  );

  const handleSuggestionSelect = useCallback(
    (type: 'brand' | 'category' | 'product', slug: string, name?: string) => {
      switch (type) {
        case 'brand':
          saveToHistory(name || slug);
          router.push(`/search?q=${encodeURIComponent(slug)}&brands=${slug}`);
          break;
        case 'category':
          router.push(`/categories/${slug}`);
          break;
        case 'product':
          saveReturnScroll(returnTo);
          router.push(withReturnTo(`/products/${slug}`, returnTo));
          break;
      }
      onClose();
      setSearchValue('');
      setSuggestions(null);
    },
    [router, onClose, returnTo, saveToHistory],
  );

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePhotoSearch = useCallback(() => {
    setPhotoMode(true);
    setTimeout(() => triggerFilePicker(), 100);
  }, [triggerFilePicker]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setPhotoMode(true);
    setPhotoLoading(true);
    setPhotoResults([]);
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageDataUrl = ev.target?.result as string;
      setPhotoImage(imageDataUrl);

      try {
        const [meta, base64] = imageDataUrl.split(',');
        const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const formData = new FormData();
        formData.append('image', blob, 'search-image.jpg');

        const searchResp = await fetch(
          `${API_BASE_URL}/visual-search/search?limit=50&minSimilarity=25`,
          { method: 'POST', body: formData },
        );

        if (!searchResp.ok) throw new Error('Search failed');
        const data = await searchResp.json();
        const results = data.results || [];
        setPhotoResults(results);

        try {
          sessionStorage.setItem('visualSearchImage', imageDataUrl);
          sessionStorage.setItem('visualSearchResults', JSON.stringify(results));
        } catch {
          // quota exceeded — ignore, search results are already in state
        }
      } catch {
        setPhotoResults([]);
        setPhotoError(tv('searchFailedGeneric'));
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [tv]);

  useEffect(() => {
    if (open && autoTriggerPhoto) {
      setPhotoMode(true);
      const timer = setTimeout(() => triggerFilePicker(), 200);
      return () => clearTimeout(timer);
    }
  }, [open, autoTriggerPhoto, triggerFilePicker]);

  const handleClose = useCallback(() => {
    onClose();
    setSearchValue('');
    setSuggestions(null);
    setPhotoMode(false);
    setPhotoLoading(false);
    setPhotoResults([]);
    setPhotoError(null);
    setPhotoImage(null);
  }, [onClose]);

  const handleClear = useCallback(() => {
    setSearchValue('');
    setSuggestions(null);
    inputRef.current?.focus();
  }, []);

  const showDefaultContent = !searchValue || searchValue.length < 2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 bg-surface flex flex-col pt-[env(safe-area-inset-top)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <MobileSearchInput
            ref={inputRef}
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
            onClose={handleClose}
            onClear={handleClear}
            placeholder={t('placeholder')}
            cancelLabel={t('cancel')}
          />

          {/* 隐藏的文件选择器 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Content area */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {!photoMode && trimmedSearchValue && (
              <div className="px-4 pt-3">
                <button
                  type="button"
                  onClick={() => handleSearch(trimmedSearchValue)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.99] active:opacity-95"
                >
                  <Search className="h-4 w-4" />
                  <span>{t('searchFor', { query: trimmedSearchValue })}</span>
                </button>
              </div>
            )}

            {photoMode ? (
              <MobilePhotoSearch
                loading={photoLoading}
                error={photoError}
                results={photoResults}
                previewImage={photoImage}
                onRetry={triggerFilePicker}
                onSelectProduct={(slug) => {
                  saveReturnScroll(returnTo);
                  router.push(withReturnTo(`/products/${slug}`, returnTo));
                  handleClose();
                }}
                sortBy={photoSortBy}
                onSortChange={setPhotoSortBy}
                labels={{
                  searching: tv('searching'),
                  changeImage: tv('changeImage'),
                  resultsCount: tv('resultsCount', { count: photoResults.length }),
                  noResults: tv('noResults'),
                  description: tv('description'),
                  selectImage: tv('selectImage'),
                  sortSimilarity: tv('sortBySimilarity'),
                  sortPriceAsc: tv('sortByPriceAsc'),
                  sortPriceDesc: tv('sortByPriceDesc'),
                }}
              />
            ) : showDefaultContent ? (
              <div className="px-4 py-3 space-y-5">
                <MobileSearchHistory
                  history={searchHistory}
                  onSearch={handleSearch}
                  onRemove={removeFromHistory}
                  onClearAll={clearAllHistory}
                  recentLabel={t('recentSearches')}
                  clearLabel={t('clearHistory')}
                />

                <MobileHotSearches
                  items={hotSearches || []}
                  onSearch={handleSearch}
                  label={t('hotSearches')}
                />

                {/* Photo search entry */}
                <section>
                  <button
                    type="button"
                    onClick={handlePhotoSearch}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Camera className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <p className="text-sm font-medium text-foreground">{t('photoSearch')}</p>
                      <p className="text-xs text-muted">{t('photoSearchDesc')}</p>
                    </div>
                  </button>
                </section>
              </div>
            ) : (
              <MobileSearchSuggestions
                suggestions={suggestions}
                loading={loadingSuggestions}
                hasMinInput={debouncedValue.length >= 2}
                locale={locale}
                onSelectBrand={(slug, name) => handleSuggestionSelect('brand', slug, name)}
                onSelectCategory={(slug) => handleSuggestionSelect('category', slug)}
                onSelectProduct={(slug) => handleSuggestionSelect('product', slug)}
                labels={{
                  searching: t('searching'),
                  brands: t('brands'),
                  categories: t('categories'),
                  products: t('products'),
                  noResults: t('noResults'),
                  productCount: (count: number) => t('productCount', { count }),
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
