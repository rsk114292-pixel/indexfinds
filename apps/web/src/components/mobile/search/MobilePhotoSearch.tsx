'use client';

import Image from 'next/image';
import { Camera } from 'lucide-react';
import type { VisualSearchResult } from '@/types';
import { formatPriceRange, convertPrice } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { getImageReferrerPolicy, getProductCardThumbnail } from '@/lib/image-utils';

/** 相似度 badge 颜色分级 */
function getSimilarityBadgeColor(similarity: number): string {
  if (similarity >= 90) return 'bg-emerald-500/80';
  if (similarity >= 70) return 'bg-amber-500/80';
  return 'bg-black/60';
}

export type VisualSortBy = 'similarity' | 'price_asc' | 'price_desc';

interface MobilePhotoSearchProps {
  loading: boolean;
  error: string | null;
  results: VisualSearchResult[];
  previewImage: string | null;
  onRetry: () => void;
  onSelectProduct: (slug: string) => void;
  sortBy?: VisualSortBy;
  onSortChange?: (sort: VisualSortBy) => void;
  labels: {
    searching: string;
    changeImage: string;
    resultsCount: string;
    noResults: string;
    description: string;
    selectImage: string;
    sortSimilarity?: string;
    sortPriceAsc?: string;
    sortPriceDesc?: string;
  };
}

function sortResults(results: VisualSearchResult[], sortBy: VisualSortBy): VisualSearchResult[] {
  if (sortBy === 'similarity') return results; // API already returns by similarity desc
  const sorted = [...results];
  if (sortBy === 'price_asc') sorted.sort((a, b) => (a.product.priceMin || 0) - (b.product.priceMin || 0));
  if (sortBy === 'price_desc') sorted.sort((a, b) => (b.product.priceMin || 0) - (a.product.priceMin || 0));
  return sorted;
}

export function MobilePhotoSearch({
  loading,
  error,
  results,
  previewImage,
  onRetry,
  onSelectProduct,
  sortBy = 'similarity',
  onSortChange,
  labels,
}: MobilePhotoSearchProps) {
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const sortedResults = sortResults(results, sortBy);

  return (
    <div className="px-4 py-3">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted">{labels.searching}</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Camera className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-primary font-medium mt-1"
          >
            {labels.changeImage}
          </button>
        </div>
      ) : results.length > 0 ? (
        <>
          {/* 搜索图片预览 + 结果数 */}
          <div className="flex items-center gap-3 mb-4">
            {previewImage && (
               
              <img
                src={previewImage}
                alt=""
                className="w-14 h-14 rounded-lg object-cover border"
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{labels.resultsCount}</p>
              <button
                type="button"
                onClick={onRetry}
                className="text-xs text-primary mt-0.5"
              >
                {labels.changeImage}
              </button>
            </div>
          </div>
          {/* 排序 chips */}
          {onSortChange && results.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              {([
                { value: 'similarity' as const, label: labels.sortSimilarity || 'Similarity' },
                { value: 'price_asc' as const, label: labels.sortPriceAsc || 'Price ↑' },
                { value: 'price_desc' as const, label: labels.sortPriceDesc || 'Price ↓' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSortChange(option.value); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sortBy === option.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-foreground active:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {/* 结果网格 */}
          <div className="grid grid-cols-2 gap-3">
            {sortedResults.map((result) => {
              const priceMin = result.product.priceMin;
              const priceMax = result.product.priceMax;
              const sourceCurrency = result.product.currency || 'CNY';
              const hasPriceData = priceMin > 0 || priceMax > 0;
              const convertedMin = convertPrice(priceMin, sourceCurrency, displayCurrency, rates);
              const convertedMax = convertPrice(priceMax, sourceCurrency, displayCurrency, rates);
              const isConverted = displayCurrency !== sourceCurrency;
              const priceText = hasPriceData
                ? (isConverted ? '≈ ' : '') + formatPriceRange(convertedMin, convertedMax, displayCurrency)
                : null;

              return (
                <div
                  key={result.product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectProduct(result.product.slug)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelectProduct(result.product.slug); }}
                  className="text-left rtl:text-right rounded-xl bg-surface shadow-sm overflow-hidden active:scale-[0.98] transition-transform duration-150 cursor-pointer"
                >
                  {/* 图片区域 */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <Image
                      src={getProductCardThumbnail(
                        result.matchedImage ||
                        result.product.mainImage ||
                        result.product.images?.[0] ||
                        ''
                      )}
                      alt={result.product.title}
                      fill
                      className="object-cover"
                      sizes="45vw"
                      referrerPolicy={getImageReferrerPolicy(
                        getProductCardThumbnail(
                          result.matchedImage ||
                          result.product.mainImage ||
                          result.product.images?.[0] ||
                          ''
                        )
                      )}
                    />
                    {/* 相似度 badge — 左上角 */}
                    <span className={`absolute top-1.5 left-1.5 rtl:right-1.5 rtl:left-auto ${getSimilarityBadgeColor(result.similarity)} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                      {Math.round(result.similarity)}%
                    </span>
                  </div>
                  {/* 信息区域 */}
                  <div className="px-2.5 py-2">
                    <p className="text-xs text-foreground line-clamp-2 leading-tight">
                      {result.product.title}
                    </p>
                    {priceText && (
                      <span className="text-sm font-bold text-accent mt-1 block truncate">
                        {priceText}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : previewImage ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Camera className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-muted">{labels.noResults}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-primary font-medium mt-1"
          >
            {labels.changeImage}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 gap-3">
          <Camera className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-muted">{labels.description}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg active:opacity-80"
          >
            {labels.selectImage}
          </button>
        </div>
      )}
    </div>
  );
}
