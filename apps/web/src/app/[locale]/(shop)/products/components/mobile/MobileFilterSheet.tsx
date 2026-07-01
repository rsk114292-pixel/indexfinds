'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { MobileSheet } from '@/components/mobile/ui/MobileSheet';
import { AccordionSection, ExpandableChipList, MobileCategoryFilter, type FacetItem } from './MobileFilterComponents';
import type { CategoryFacetItem } from '@/components/filters/types';
import { fetcher } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  categories?: CategoryFacetItem[];
  brands?: Array<{ label: string; value: string; count: number }>;
  colors?: FacetItem[];
  genders?: FacetItem[];
  styles?: FacetItem[];
  occasions?: FacetItem[];
  seasons?: FacetItem[];
  priceRange?: { min: number; max: number };
  /** Total product count (shown on apply button) */
  totalCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Helper: apply filter selections to URLSearchParams                 */
/* ------------------------------------------------------------------ */

interface FilterSelections {
  selectedCategories: string[];
  selectedBrands: string[];
  selectedColors: string[];
  selectedGenders: string[];
  selectedStyles: string[];
  selectedOccasions: string[];
  selectedSeasons: string[];
  minPriceVal: string;
  maxPriceVal: string;
}

function applyFiltersToParams(params: URLSearchParams, filters: FilterSelections) {
  const setOrDel = (key: string, values: string[]) => {
    if (values.length > 0) params.set(key, values.join(','));
    else params.delete(key);
  };
  setOrDel('categories', filters.selectedCategories);
  setOrDel('brands', filters.selectedBrands);
  setOrDel('colors', filters.selectedColors);
  setOrDel('genders', filters.selectedGenders);
  setOrDel('styles', filters.selectedStyles);
  setOrDel('occasions', filters.selectedOccasions);
  setOrDel('seasons', filters.selectedSeasons);
  if (filters.minPriceVal) params.set('minPrice', filters.minPriceVal);
  else params.delete('minPrice');
  if (filters.maxPriceVal) params.set('maxPrice', filters.maxPriceVal);
  else params.delete('maxPrice');
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function MobileFilterSheet({
  open,
  onClose,
  categories = [],
  brands = [],
  colors = [],
  genders = [],
  styles = [],
  occasions = [],
  seasons = [],
  priceRange = { min: 0, max: 100000 },
  totalCount,
}: MobileFilterSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('filter');

  // Internal filter state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [minPriceVal, setMinPriceVal] = useState('');
  const [maxPriceVal, setMaxPriceVal] = useState('');
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);

  // Sync from URL only when sheet OPENS (closed→open transition)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedCategories(searchParams.get('categories')?.split(',').filter(Boolean) || []);
      setSelectedBrands(searchParams.get('brands')?.split(',').filter(Boolean) || []);
      setSelectedColors(searchParams.get('colors')?.split(',').filter(Boolean) || []);
      setSelectedGenders(searchParams.get('genders')?.split(',').filter(Boolean) || []);
      setSelectedStyles(searchParams.get('styles')?.split(',').filter(Boolean) || []);
      setSelectedOccasions(searchParams.get('occasions')?.split(',').filter(Boolean) || []);
      setSelectedSeasons(searchParams.get('seasons')?.split(',').filter(Boolean) || []);
      setMinPriceVal(searchParams.get('minPrice') || '');
      setMaxPriceVal(searchParams.get('maxPrice') || '');
    }
    prevOpenRef.current = open;
  }, [open, searchParams]);

  // Total active filter count（材质已隐藏，不计入）
  const filterCount = useMemo(() =>
    selectedCategories.length +
    selectedBrands.length +
    selectedColors.length +
    selectedGenders.length +
    selectedStyles.length +
    selectedOccasions.length +
    selectedSeasons.length +
    (minPriceVal ? 1 : 0) +
    (maxPriceVal ? 1 : 0),
    [selectedCategories, selectedBrands, selectedColors, selectedGenders,
     selectedStyles, selectedOccasions, selectedSeasons, minPriceVal, maxPriceVal],
  );

  // Toggle helper — only updates local state, URL is pushed on apply
  const toggleValue = (value: string, selected: string[], setter: (v: string[]) => void) => {
    const newValues = selected.includes(value)
      ? selected.filter((x) => x !== value)
      : [...selected, value];
    setter(newValues);
  };

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    applyFiltersToParams(params, {
      selectedCategories, selectedBrands, selectedColors, selectedGenders,
      selectedStyles, selectedOccasions, selectedSeasons,
      minPriceVal, maxPriceVal,
    });
    params.set('page', '1');
    params.set('limit', '1');
    return `/products?${params.toString()}`;
  }, [
    searchParams,
    selectedCategories,
    selectedBrands,
    selectedColors,
    selectedGenders,
    selectedStyles,
    selectedOccasions,
    selectedSeasons,
    minPriceVal,
    maxPriceVal,
  ]);

  useEffect(() => {
    if (!open) return;
    setPreviewTotal(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetcher<{ meta?: { total?: number } }>(previewUrl);
        const total = res?.meta?.total;
        setPreviewTotal(Number.isFinite(total) ? (total as number) : null);
      } catch {
        setPreviewTotal(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [open, previewUrl]);

  // Apply: close sheet first, then push filters to URL after sheet animation
  const handleApply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    applyFiltersToParams(params, {
      selectedCategories, selectedBrands, selectedColors, selectedGenders,
      selectedStyles, selectedOccasions, selectedSeasons,
      minPriceVal, maxPriceVal,
    });
    params.delete('page');
    const url = `${pathname}?${params.toString()}`;
    onClose();
    // Defer navigation to avoid conflicting with sheet close re-render
    setTimeout(() => router.replace(url, { scroll: false }), 50);
  }, [searchParams, router, pathname, onClose, selectedCategories, selectedBrands, selectedColors, selectedGenders, selectedStyles, selectedOccasions, selectedSeasons, minPriceVal, maxPriceVal]);

  const handleClear = useCallback(() => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedGenders([]);
    setSelectedStyles([]);
    setSelectedOccasions([]);
    setSelectedSeasons([]);
    setMinPriceVal('');
    setMaxPriceVal('');
  }, []);

  // Build sections array — only show sections that have data
  const sections = useMemo(() => {
    const s: Array<{
      key: string;
      title: string;
      count: number;
      defaultOpen: boolean;
      render: () => React.ReactNode;
    }> = [];

    if (categories.length > 0) {
      s.push({
        key: 'categories',
        title: t('category'),
        count: selectedCategories.length,
        defaultOpen: true,
        render: () => (
          <MobileCategoryFilter
            categories={categories}
            selectedValues={selectedCategories}
            onChange={setSelectedCategories}
          />
        ),
      });
    }

    if (brands.length > 0) {
      s.push({
        key: 'brands',
        title: t('brands'),
        count: selectedBrands.length,
        defaultOpen: true,
        render: () => (
          <ExpandableChipList
            items={brands.map((b) => ({ value: b.value, label: b.label, count: b.count }))}
            selectedValues={selectedBrands}
            onToggle={(v) => toggleValue(v, selectedBrands, setSelectedBrands)}
            limit={10}
          />
        ),
      });
    }

    if (colors.length > 0) {
      s.push({
        key: 'colors',
        title: t('colors'),
        count: selectedColors.length,
        defaultOpen: false,
        render: () => (
          <ExpandableChipList
            items={colors}
            selectedValues={selectedColors}
            onToggle={(v) => toggleValue(v, selectedColors, setSelectedColors)}
            useColorSwatch
          />
        ),
      });
    }

    if (genders.length > 0) {
      s.push({
        key: 'genders',
        title: t('gender'),
        count: selectedGenders.length,
        defaultOpen: false,
        render: () => (
          <ExpandableChipList
            items={genders}
            selectedValues={selectedGenders}
            onToggle={(v) => toggleValue(v, selectedGenders, setSelectedGenders)}
          />
        ),
      });
    }

    if (styles.length > 0) {
      s.push({
        key: 'styles',
        title: t('styles'),
        count: selectedStyles.length,
        defaultOpen: false,
        render: () => (
          <ExpandableChipList
            items={styles}
            selectedValues={selectedStyles}
            onToggle={(v) => toggleValue(v, selectedStyles, setSelectedStyles)}
          />
        ),
      });
    }

    if (occasions.length > 0) {
      s.push({
        key: 'occasions',
        title: t('occasions'),
        count: selectedOccasions.length,
        defaultOpen: false,
        render: () => (
          <ExpandableChipList
            items={occasions}
            selectedValues={selectedOccasions}
            onToggle={(v) => toggleValue(v, selectedOccasions, setSelectedOccasions)}
          />
        ),
      });
    }

    if (seasons.length > 0) {
      s.push({
        key: 'seasons',
        title: t('seasons'),
        count: selectedSeasons.length,
        defaultOpen: false,
        render: () => (
          <ExpandableChipList
            items={seasons}
            selectedValues={selectedSeasons}
            onToggle={(v) => toggleValue(v, selectedSeasons, setSelectedSeasons)}
          />
        ),
      });
    }

    return s;
   
  }, [
    categories, brands, colors, genders, styles, occasions, seasons,
    selectedCategories, selectedBrands, selectedColors, selectedGenders,
    selectedStyles, selectedOccasions, selectedSeasons, t,
  ]);

  // Derive first section with data to default-open
  const firstKey = sections[0]?.key;

  // Price is applied together with other filters via handleApply

  // Button label: "Show X Results" or "Show Results"
  const showLabel = totalCount != null
    ? t('viewItems', { count: previewTotal ?? totalCount })
    : t('showResults');

  return (
    <MobileSheet open={open} onClose={onClose} title={t('filters')}>
      {/* Accordion content */}
      <div className="pb-2">
        {sections.map((section) => (
          <AccordionSection
            key={section.key}
            title={section.title}
            selectedCount={section.count}
            defaultOpen={section.key === firstKey || section.count > 0}
          >
            {section.render()}
          </AccordionSection>
        ))}

        {/* Price range — always visible, not in accordion */}
        <AccordionSection
          title={t('priceRange')}
          selectedCount={minPriceVal || maxPriceVal ? 1 : 0}
          defaultOpen={!!(minPriceVal || maxPriceVal)}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ¥
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(priceRange.min)}
                value={minPriceVal}
                onChange={(e) => setMinPriceVal(e.target.value)}
                onBlur={undefined}
                aria-label={t('minPrice')}
                className="w-full pl-7 pr-3 rtl:pl-3 rtl:pr-7 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px]"
              />
            </div>
            <span className="text-gray-400 text-sm">&ndash;</span>
            <div className="flex-1 relative">
              <span className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ¥
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(priceRange.max)}
                value={maxPriceVal}
                onChange={(e) => setMaxPriceVal(e.target.value)}
                onBlur={undefined}
                aria-label={t('maxPrice')}
                className="w-full pl-7 pr-3 rtl:pl-3 rtl:pr-7 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px]"
              />
            </div>
          </div>
        </AccordionSection>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 flex gap-3 pt-3 pb-2 bg-surface border-t border-border -mx-4 px-4">
        <button
          type="button"
          onClick={handleClear}
          className={`flex-1 border font-medium py-2.5 rounded-lg text-sm transition-colors duration-150 min-h-[44px] ${
            filterCount > 0
              ? 'border-gray-300 text-foreground active:bg-gray-50'
              : 'border-gray-200 text-gray-400'
          }`}
          disabled={filterCount === 0}
        >
          {t('clearAll')}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 bg-foreground text-white font-medium py-2.5 rounded-lg text-sm active:opacity-90 transition-colors duration-150 min-h-[44px]"
        >
          {showLabel}
        </button>
      </div>
    </MobileSheet>
  );
}
