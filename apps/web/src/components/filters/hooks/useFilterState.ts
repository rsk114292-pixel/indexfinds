'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';

function serializeParams(params: URLSearchParams): string {
  return Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}
interface UseFilterStateOptions {
  priceRange: { min: number; max: number };
  onFilterChange?: (filters: Record<string, string | string[] | number | [number, number]>) => void;
  enabled?: boolean;
}

export function useFilterState({ priceRange, onFilterChange, enabled = true }: UseFilterStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 从 URL 参数初始化状态
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const param = searchParams.get('categories');
    return param ? param.split(',') : [];
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const param = searchParams.get('brands');
    return param ? param.split(',') : [];
  });

  const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number]>(() => {
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    return [
      minPrice ? Number(minPrice) : priceRange.min,
      maxPrice ? Number(maxPrice) : priceRange.max,
    ];
  });

  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    const param = searchParams.get('colors');
    return param ? param.split(',') : [];
  });

  const [selectedGenders, setSelectedGenders] = useState<string[]>(() => {
    const param = searchParams.get('genders');
    return param ? param.split(',') : [];
  });

  const [selectedStyles, setSelectedStyles] = useState<string[]>(() => {
    const param = searchParams.get('styles');
    return param ? param.split(',') : [];
  });

  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(() => {
    const param = searchParams.get('occasions');
    return param ? param.split(',') : [];
  });

  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(() => {
    const param = searchParams.get('seasons');
    return param ? param.split(',') : [];
  });

  // "查看更多"展开状态
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // 当 priceRange prop 变化时更新状态
  useEffect(() => {
    if (!enabled) return;
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (!minPrice && !maxPrice) {
      setSelectedPriceRange(prev =>
        prev[0] === priceRange.min && prev[1] === priceRange.max
          ? prev
          : [priceRange.min, priceRange.max],
      );
    }
  }, [enabled, priceRange, searchParams]);

  // Sync state FROM URL — handles external URL changes (e.g. ActiveFilters removing a tag)
  useEffect(() => {
    if (!enabled) return;
    const fromUrl = (key: string) =>
      searchParams.get(key)?.split(',').filter(Boolean) || [];
    const syncArray = (
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      key: string,
    ) => {
      const url = fromUrl(key);
      setter(prev =>
        prev.length === url.length && prev.every((v, i) => v === url[i])
          ? prev
          : url,
      );
    };
    syncArray(setSelectedCategories, 'categories');
    syncArray(setSelectedBrands, 'brands');
    syncArray(setSelectedColors, 'colors');
    syncArray(setSelectedGenders, 'genders');
    syncArray(setSelectedStyles, 'styles');
    syncArray(setSelectedOccasions, 'occasions');
    syncArray(setSelectedSeasons, 'seasons');

    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    const urlMin = minP ? Number(minP) : priceRange.min;
    const urlMax = maxP ? Number(maxP) : priceRange.max;
    setSelectedPriceRange(prev =>
      prev[0] === urlMin && prev[1] === urlMax ? prev : [urlMin, urlMax],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-apply: skip first render, debounce price
  const mountedRef = useRef(false);
  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const applyFilters = useCallback(() => {
    if (!enabled) return;
    const params = new URLSearchParams(searchParams.toString());

    // 更新分类筛选
    if (selectedCategories.length > 0) {
      params.set('categories', selectedCategories.join(','));
    } else {
      params.delete('categories');
    }

    // 更新品牌筛选
    if (selectedBrands.length > 0) {
      params.set('brands', selectedBrands.join(','));
    } else {
      params.delete('brands');
    }

    // 更新价格区间
    if (selectedPriceRange[0] !== priceRange.min) {
      params.set('minPrice', String(selectedPriceRange[0]));
    } else {
      params.delete('minPrice');
    }

    if (selectedPriceRange[1] !== priceRange.max) {
      params.set('maxPrice', String(selectedPriceRange[1]));
    } else {
      params.delete('maxPrice');
    }

    // 更新颜色筛选
    if (selectedColors.length > 0) {
      params.set('colors', selectedColors.join(','));
    } else {
      params.delete('colors');
    }

    // 更新性别筛选
    if (selectedGenders.length > 0) {
      params.set('genders', selectedGenders.join(','));
    } else {
      params.delete('genders');
    }

    // 更新风格筛选
    if (selectedStyles.length > 0) {
      params.set('styles', selectedStyles.join(','));
    } else {
      params.delete('styles');
    }

    // 更新场合筛选
    if (selectedOccasions.length > 0) {
      params.set('occasions', selectedOccasions.join(','));
    } else {
      params.delete('occasions');
    }

    // 更新季节筛选
    if (selectedSeasons.length > 0) {
      params.set('seasons', selectedSeasons.join(','));
    } else {
      params.delete('seasons');
    }

    const currentWithoutPage = new URLSearchParams(searchParams.toString());
    currentWithoutPage.delete('page');
    const nextWithoutPage = new URLSearchParams(params.toString());
    nextWithoutPage.delete('page');

    // 筛选条件未变化时不触发 URL 更新，避免回到列表后被意外重置到第一页。
    if (serializeParams(currentWithoutPage) === serializeParams(nextWithoutPage)) {
      return;
    }

    // 筛选条件变化时才重置到第一页
    params.set('page', '1');

    // 更新 URL
    router.push(`${pathname}?${params.toString()}`);

    // 向后兼容
    if (onFilterChange) {
      onFilterChange({
        brands: selectedBrands,
        minPrice: selectedPriceRange[0],
        maxPrice: selectedPriceRange[1],
      });
    }
  }, [
    enabled,
    router,
    pathname,
    searchParams,
    selectedCategories,
    selectedBrands,
    selectedPriceRange,
    selectedColors,
    selectedGenders,
    selectedStyles,
    selectedOccasions,
    selectedSeasons,
    priceRange,
    onFilterChange,
  ]);

  const clearAll = useCallback(() => {
    if (!enabled) return;
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRange([priceRange.min, priceRange.max]);
    setSelectedColors([]);
    setSelectedGenders([]);
    setSelectedStyles([]);
    setSelectedOccasions([]);
    setSelectedSeasons([]);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('categories');
    params.delete('brands');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('colors');
    params.delete('genders');
    params.delete('styles');
    params.delete('occasions');
    params.delete('seasons');
    params.set('page', '1');

    router.push(`${pathname}?${params.toString()}`);

    if (onFilterChange) {
      onFilterChange({});
    }
  }, [enabled, router, pathname, searchParams, priceRange, onFilterChange]);

  // Auto-apply: 非价格筛选立即触发
  useEffect(() => {
    if (!enabled) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedCategories, selectedBrands, selectedColors, selectedGenders, selectedStyles, selectedOccasions, selectedSeasons]);

  // Auto-apply: 价格筛选 debounce 300ms
  useEffect(() => {
    if (!enabled) return;
    if (!mountedRef.current) return;
    clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => applyFilters(), 300);
    return () => clearTimeout(priceTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedPriceRange]);

  // 计算价格是否有变化
  const priceChanged =
    selectedPriceRange[0] !== priceRange.min ||
    selectedPriceRange[1] !== priceRange.max;

  return {
    // State
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
    // Setters
    setSelectedCategories,
    setSelectedBrands,
    setSelectedColors,
    setSelectedGenders,
    setSelectedStyles,
    setSelectedOccasions,
    setSelectedSeasons,
    setSelectedPriceRange,
    toggleExpand,
    // Actions
    applyFilters,
    clearAll,
  };
}
