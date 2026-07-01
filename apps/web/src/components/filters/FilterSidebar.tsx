'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { useFilterState } from './hooks/useFilterState';
import { CategoryFilter } from './CategoryFilter';
import { BrandFilter } from './BrandFilter';
import { ColorFilter } from './ColorFilter';
import { PriceRangeFilter } from './PriceRangeFilter';
import { CheckboxFilter } from './CheckboxFilter';
import { TagFilter } from './TagFilter';
import { useTranslations } from 'next-intl';
import type { FilterSidebarProps } from './types';

export function FilterSidebar({
  categories = [],
  brands = [],
  colors = [],
  genders = [],
  styles = [],
  occasions = [],
  seasons = [],
  priceRange = { min: 0, max: 10000 },
  onFilterChange,
  className = '',
  enabled = true,
}: FilterSidebarProps) {
  const t = useTranslations('filter');
  const {
    selectedCategories,
    selectedBrands,
    selectedColors,
    selectedGenders,
    selectedStyles,
    selectedOccasions,
    selectedSeasons,
    selectedPriceRange,
    expandedSections,
    priceChanged,
    setSelectedCategories,
    setSelectedBrands,
    setSelectedColors,
    setSelectedGenders,
    setSelectedStyles,
    setSelectedOccasions,
    setSelectedSeasons,
    setSelectedPriceRange,
    toggleExpand,
    clearAll,
  } = useFilterState({ priceRange, onFilterChange, enabled });

  // Default open panels
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    price: true,
    colors: false,
    genders: false,
    styles: false,
    occasions: false,
    seasons: false,
  });

  const togglePanel = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 计算已选筛选数量
  const getSelectedCount = (key: string): number => {
    switch (key) {
      case 'categories':
        return selectedCategories.length;
      case 'brands':
        return selectedBrands.length;
      case 'colors':
        return selectedColors.length;
      case 'genders':
        return selectedGenders.length;
      case 'styles':
        return selectedStyles.length;
      case 'occasions':
        return selectedOccasions.length;
      case 'seasons':
        return selectedSeasons.length;
      case 'price':
        return priceChanged ? 1 : 0;
      default:
        return 0;
    }
  };

  // 总选中数量
  const totalSelected =
    selectedCategories.length +
    selectedBrands.length +
    selectedColors.length +
    selectedGenders.length +
    selectedStyles.length +
    selectedOccasions.length +
    selectedSeasons.length +
    (priceChanged ? 1 : 0);

  // 构建折叠面板项
  const collapseItems = [
    // 分类筛选（最高优先级）
    categories.length > 0 && {
      key: 'categories',
      label: t('category'),
      children: (
        <CategoryFilter
          categories={categories}
          selectedValues={selectedCategories}
          onChange={setSelectedCategories}
        />
      ),
    },
    // 品牌筛选
    brands.length > 0 && {
      key: 'brands',
      label: t('brands'),
      children: (
        <BrandFilter
          brands={brands}
          selectedBrands={selectedBrands}
          onChange={setSelectedBrands}
          expanded={expandedSections['brands']}
          onToggleExpand={() => toggleExpand('brands')}
        />
      ),
    },
    // 价格区间
    {
      key: 'price',
      label: t('priceRange'),
      children: (
        <PriceRangeFilter
          min={priceRange.min}
          max={priceRange.max}
          value={selectedPriceRange}
          onChange={setSelectedPriceRange}
        />
      ),
    },
    // 颜色筛选
    colors.length > 0 && {
      key: 'colors',
      label: t('colors'),
      children: (
        <ColorFilter
          colors={colors}
          selectedColors={selectedColors}
          onChange={setSelectedColors}
          expanded={expandedSections['colors']}
          onToggleExpand={() => toggleExpand('colors')}
        />
      ),
    },
    // 性别筛选
    genders.length > 0 && {
      key: 'genders',
      label: t('gender'),
      children: (
        <TagFilter
          items={genders}
          selectedValues={selectedGenders}
          onChange={setSelectedGenders}
        />
      ),
    },
    // 风格筛选
    styles.length > 0 && {
      key: 'styles',
      label: t('styles'),
      children: (
        <CheckboxFilter
          items={styles}
          selectedValues={selectedStyles}
          onChange={setSelectedStyles}
          expanded={expandedSections['styles']}
          onToggleExpand={() => toggleExpand('styles')}
        />
      ),
    },
    // 场合筛选
    occasions.length > 0 && {
      key: 'occasions',
      label: t('occasions'),
      children: (
        <TagFilter
          items={occasions}
          selectedValues={selectedOccasions}
          onChange={setSelectedOccasions}
        />
      ),
    },
    // 季节筛选
    seasons.length > 0 && {
      key: 'seasons',
      label: t('seasons'),
      children: (
        <TagFilter
          items={seasons}
          selectedValues={selectedSeasons}
          onChange={setSelectedSeasons}
        />
      ),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; children: React.ReactNode }>;

  return (
    <div className={`bg-white rounded-lg border border-border shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3.5 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          <span className="font-medium">{t('filters')}</span>
          {totalSelected > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-primary text-white rounded-full">
              {totalSelected}
            </span>
          )}
        </div>
        {totalSelected > 0 && (
          <button
            type="button"
            onClick={clearAll}
            aria-label={t('clearAllFilters')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200 min-h-[44px] min-w-[44px] justify-center"
          >
            <X className="h-3.5 w-3.5" />
            {t('clearAll')}
          </button>
        )}
      </div>

      {/* Filter Panels */}
      <div className="divide-y divide-border/70">
        {collapseItems.map((item) => {
          const count = getSelectedCount(item.key);
          const isOpen = openPanels[item.key] ?? false;

          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => togglePanel(item.key)}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? t('collapse') : t('expand')} ${item.label} ${t('filterSuffix')}`}
                className="flex min-h-[44px] w-full items-center justify-between px-3.5 py-3 text-left transition-colors duration-200 hover:bg-gray-50 rtl:text-right cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {item.label}
                  </span>
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-primary text-white rounded-full">
                      {count}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5">
                  {item.children}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
