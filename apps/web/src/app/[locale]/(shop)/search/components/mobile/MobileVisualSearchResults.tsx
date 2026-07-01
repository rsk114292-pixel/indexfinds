'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, SlidersHorizontal } from 'lucide-react';
import { MobileProductCard } from '@/components/mobile/ui/MobileProductCard';
import { MobileProductGridSkeleton } from '@/components/mobile/ui/MobileSkeleton';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import MobileSearchResultsHeader from '@/components/mobile/MobileSearchResultsHeader';
import {
  AccordionSection,
  ExpandableChipList,
} from '@/app/[locale]/(shop)/products/components/mobile/MobileFilterComponents';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import {
  useVisualSearchFilters,
  type VisualSearchSortBy,
} from '@/hooks/useVisualSearchFilters';
import { useCategoryLabelResolver } from '@/hooks/useCategoryLabelResolver';

function getSimilarityBadgeColor(similarity: number): string {
  if (similarity >= 90) return 'bg-emerald-500/80';
  if (similarity >= 70) return 'bg-amber-500/80';
  return 'bg-black/60';
}

interface MobileVisualSearchResultsProps {
  loading: boolean;
  hasSource: boolean;
  totalCount: number;
  filters: ReturnType<typeof useVisualSearchFilters>;
  sortOptions: { value: VisualSearchSortBy; label: string }[];
  sourcePanel?: ReactNode;
  initialState?: ReactNode;
  emptyState?: ReactNode;
}

export default function MobileVisualSearchResults({
  loading,
  hasSource,
  totalCount,
  filters,
  sortOptions,
  sourcePanel,
  initialState,
  emptyState,
}: MobileVisualSearchResultsProps) {
  const t = useTranslations('visualSearch');
  const tf = useTranslations('filter');
  const { headerVisible } = useScrollDirection();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const hasFilteredResults =
    filters.products.length > 0 || (totalCount > 0 && filters.filterCount > 0);

  return (
    <div className="min-h-[calc(100dvh-theme(spacing.12)-theme(spacing.14))]">
      <MobileSearchResultsHeader />

      {sourcePanel}

      <div className="px-4 pb-4 pt-3">
        {loading ? (
          <MobileProductGridSkeleton count={6} />
        ) : hasFilteredResults ? (
          <>
            {totalCount > 1 && (
              <div
                data-testid="mobile-visual-search-sort-bar"
                className={`sticky z-20 -mx-4 flex items-center gap-2 bg-background px-4 pb-3 pt-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-[top] duration-300 ${
                  headerVisible ? 'top-12' : 'top-0'
                }`}
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => filters.setSortBy(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      filters.sortBy === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-foreground active:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  data-testid="mobile-visual-search-filter-button"
                  className={`ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filters.filterCount > 0
                      ? 'bg-foreground text-white'
                      : 'bg-gray-100 text-foreground active:bg-gray-200'
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  {tf('filters')}
                  {filters.filterCount > 0 && (
                    <span className="rounded-full bg-white/20 px-1 text-[10px] text-white">
                      {filters.filterCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {filters.products.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-sm text-muted">{t('noFilterResults')}</p>
                <button
                  type="button"
                  onClick={filters.clearAll}
                  className="text-sm font-medium text-primary active:opacity-70"
                >
                  {t('clearFilters')}
                </button>
              </div>
            ) : (
              <div
                data-testid="mobile-visual-search-grid"
                className="grid grid-cols-2 gap-3"
              >
                {filters.products.map((product) => (
                  <div key={product.id} className="relative">
                    <span
                      className={`absolute left-1.5 top-1.5 z-[1] rounded px-1.5 py-0.5 text-[10px] text-white rtl:left-auto rtl:right-1.5 ${getSimilarityBadgeColor(product.similarity)}`}
                    >
                      {Math.round(product.similarity)}%
                    </span>
                    <MobileProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : hasSource ? (
          emptyState ?? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Camera className="h-12 w-12 text-gray-200" />
              <p className="text-sm text-muted">{t('noResults')}</p>
            </div>
          )
        ) : (
          initialState
        )}
      </div>

      <MobileVisualFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
      />
    </div>
  );
}

export function MobileVisualFilterSheet({
  open,
  onClose,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  filters: ReturnType<typeof useVisualSearchFilters>;
}) {
  const tf = useTranslations('filter');
  const { getCategoryLabel } = useCategoryLabelResolver();
  const [minPriceVal, setMinPriceVal] = useState('');
  const [maxPriceVal, setMaxPriceVal] = useState('');

  useEffect(() => {
    if (open) {
      const [min, max] = filters.priceRange;
      const { min: facetMin, max: facetMax } = filters.facets.priceRange;
      setMinPriceVal(min > facetMin ? String(min) : '');
      setMaxPriceVal(max < facetMax ? String(max) : '');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPriceRange = useCallback(() => {
    const min = minPriceVal ? Number(minPriceVal) : null;
    const max = maxPriceVal ? Number(maxPriceVal) : null;

    if (min !== null || max !== null) {
      filters.setPriceRange([
        min ?? filters.facets.priceRange.min,
        max ?? filters.facets.priceRange.max,
      ]);
      return;
    }

    filters.setPriceRange(null);
  }, [filters, maxPriceVal, minPriceVal]);

  const toggleValue = useCallback(
    (value: string, selected: string[], setter: (values: string[]) => void) => {
      const nextValues = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      setter(nextValues);
    },
    [],
  );

  const sections = useMemo(() => {
    const items: Array<{
      key: string;
      title: string;
      count: number;
      render: () => ReactNode;
    }> = [];

    if (filters.facets.categories.length > 0) {
      items.push({
        key: 'categories',
        title: tf('category'),
        count: filters.selectedCategories.length,
        render: () => (
          <ExpandableChipList
            items={filters.facets.categories.map((category) => ({
              value: category.value,
              label: getCategoryLabel(category.value, category.label),
              count: category.count,
            }))}
            selectedValues={filters.selectedCategories}
            onToggle={(value) =>
              toggleValue(value, filters.selectedCategories, filters.setSelectedCategories)
            }
            limit={10}
          />
        ),
      });
    }

    if (filters.facets.brands.length > 0) {
      items.push({
        key: 'brands',
        title: tf('brands'),
        count: filters.selectedBrands.length,
        render: () => (
          <ExpandableChipList
            items={filters.facets.brands.map((brand) => ({
              value: brand.value,
              label: brand.label,
              count: brand.count,
            }))}
            selectedValues={filters.selectedBrands}
            onToggle={(value) =>
              toggleValue(value, filters.selectedBrands, filters.setSelectedBrands)
            }
            limit={10}
          />
        ),
      });
    }

    if (filters.facets.colors.length > 0) {
      items.push({
        key: 'colors',
        title: tf('colors'),
        count: filters.selectedColors.length,
        render: () => (
          <ExpandableChipList
            items={filters.facets.colors}
            selectedValues={filters.selectedColors}
            onToggle={(value) =>
              toggleValue(value, filters.selectedColors, filters.setSelectedColors)
            }
            useColorSwatch
          />
        ),
      });
    }

    if (filters.facets.genders.length > 0) {
      items.push({
        key: 'genders',
        title: tf('gender'),
        count: filters.selectedGenders.length,
        render: () => (
          <ExpandableChipList
            items={filters.facets.genders}
            selectedValues={filters.selectedGenders}
            onToggle={(value) =>
              toggleValue(value, filters.selectedGenders, filters.setSelectedGenders)
            }
          />
        ),
      });
    }

    return items;
  }, [
    filters.facets,
    getCategoryLabel,
    filters.selectedBrands,
    filters.selectedCategories,
    filters.selectedColors,
    filters.selectedGenders,
    filters.setSelectedBrands,
    filters.setSelectedCategories,
    filters.setSelectedColors,
    filters.setSelectedGenders,
    tf,
    toggleValue,
  ]);

  return (
    <MobileSheet open={open} onClose={onClose} title={tf('filters')}>
      <div className="pb-2">
        {sections.map((section) => (
          <AccordionSection
            key={section.key}
            title={section.title}
            selectedCount={section.count}
            defaultOpen={section.count > 0 || section.key === sections[0]?.key}
          >
            {section.render()}
          </AccordionSection>
        ))}

        <AccordionSection
          title={tf('priceRange')}
          selectedCount={minPriceVal || maxPriceVal ? 1 : 0}
          defaultOpen={!!(minPriceVal || maxPriceVal)}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 rtl:left-auto rtl:right-3">
                ¥
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(filters.facets.priceRange.min)}
                value={minPriceVal}
                onChange={(event) => setMinPriceVal(event.target.value)}
                onBlur={applyPriceRange}
                aria-label={tf('minPrice')}
                className="min-h-[44px] w-full rounded-lg border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 rtl:pl-3 rtl:pr-7"
              />
            </div>
            <span className="text-sm text-gray-400">&ndash;</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 rtl:left-auto rtl:right-3">
                ¥
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(filters.facets.priceRange.max)}
                value={maxPriceVal}
                onChange={(event) => setMaxPriceVal(event.target.value)}
                onBlur={applyPriceRange}
                aria-label={tf('maxPrice')}
                className="min-h-[44px] w-full rounded-lg border border-gray-200 py-2.5 pl-7 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 rtl:pl-3 rtl:pr-7"
              />
            </div>
          </div>
        </AccordionSection>
      </div>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-surface px-4 pb-2 pt-3">
        <button
          type="button"
          onClick={() => {
            filters.clearAll();
            setMinPriceVal('');
            setMaxPriceVal('');
          }}
          className={`min-h-[44px] flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors duration-150 ${
            filters.filterCount > 0
              ? 'border-gray-300 text-foreground active:bg-gray-50'
              : 'border-gray-200 text-gray-400'
          }`}
          disabled={filters.filterCount === 0}
        >
          {tf('clearAll')}
        </button>
        <button
          type="button"
          onClick={() => {
            applyPriceRange();
            onClose();
          }}
          className="min-h-[44px] flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white active:opacity-80"
        >
          {tf('apply')}
        </button>
      </div>
    </MobileSheet>
  );
}
