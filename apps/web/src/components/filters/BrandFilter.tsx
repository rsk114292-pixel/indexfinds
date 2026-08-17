'use client';

import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DEFAULT_SHOW_COUNT } from './constants';

interface BrandItem {
  label: string;
  value: string;
  count: number;
}

interface BrandFilterProps {
  brands: BrandItem[];
  selectedBrands: string[];
  onChange: (brands: string[]) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  showCount?: number;
}

export function BrandFilter({
  brands,
  selectedBrands,
  onChange,
  expanded = false,
  onToggleExpand,
  showCount = DEFAULT_SHOW_COUNT,
}: BrandFilterProps) {
  const t = useTranslations('filter');
  const [searchText, setSearchText] = useState('');

  // 过滤品牌
  const filteredBrands = useMemo(() => {
    if (!searchText) return brands;
    const lowerSearch = searchText.toLowerCase();
    return brands.filter((b) => b.label.toLowerCase().includes(lowerSearch));
  }, [brands, searchText]);

  // 显示的品牌
  const showAllResults = expanded || Boolean(searchText);
  const displayBrands = showAllResults
    ? filteredBrands
    : filteredBrands.slice(0, showCount);
  const hasMore = filteredBrands.length > showCount;

  const handleCheckboxChange = (value: string) => {
    if (selectedBrands.includes(value)) {
      onChange(selectedBrands.filter((v) => v !== value));
    } else {
      onChange([...selectedBrands, value]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 搜索框 */}
      {brands.length > showCount && (
        <div className="relative">
          <Search className="absolute left-2.5 rtl:right-2.5 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchBrands')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label={t('searchBrands')}
            className="h-[44px] w-full pl-8 pr-8 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors duration-200"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              aria-label="Clear search"
              className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors duration-200"
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* 品牌列表 — 两列网格 */}
      <div
        className={`grid grid-cols-2 gap-x-2 gap-y-1 ${
          showAllResults
            ? 'max-h-72 overflow-y-auto overscroll-contain pr-1'
            : ''
        }`}
      >
        {displayBrands.map((brand) => (
          <label
            key={brand.value}
            className="flex items-center gap-1.5 min-h-[36px] cursor-pointer transition-colors duration-200 hover:bg-gray-50 rounded px-1 -mx-1"
          >
            <input
              type="checkbox"
              checked={selectedBrands.includes(brand.value)}
              onChange={() => handleCheckboxChange(brand.value)}
              aria-label={`Filter by brand ${brand.label}`}
              className="w-3.5 h-3.5 rounded border-border text-primary accent-primary cursor-pointer shrink-0"
            />
            <span className="text-sm truncate">{brand.label}</span>
            <span className="text-gray-400 text-xs shrink-0">({brand.count})</span>
          </label>
        ))}
      </div>

      {/* 显示更多 */}
      {hasMore && !searchText && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Show less brands' : 'Show more brands'}
          className="flex items-center gap-1 text-primary text-sm cursor-pointer min-h-[44px] self-start transition-colors duration-200 hover:text-primary/80"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {expanded ? t('showLess') : t('showMoreCount', { count: filteredBrands.length - showCount })}
        </button>
      )}

      {/* 无结果 */}
      {searchText && filteredBrands.length === 0 && (
        <div className="text-gray-400 text-sm">{t('noBrandsFound')}</div>
      )}
    </div>
  );
}
