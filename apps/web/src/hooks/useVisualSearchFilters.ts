'use client';

import { useState, useMemo, useCallback } from 'react';

/**
 * 视觉搜索结果项（含可筛选属性）
 */
export interface VisualSearchProduct {
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  images?: string[];
  price: { min: number; max: number; currency: string };
  similarity: number;
  brand?: { id: string; name: string; slug: string };
  category?: { name: string; slug: string };
  gender?: string;
  colors?: string[];
}

export type VisualSearchSortBy = 'similarity' | 'price_asc' | 'price_desc';

export interface VisualSearchFacets {
  categories: Array<{ label: string; value: string; count: number }>;
  brands: Array<{ label: string; value: string; count: number }>;
  colors: Array<{ value: string; count: number }>;
  genders: Array<{ value: string; count: number }>;
  priceRange: { min: number; max: number };
}

export interface VisualSearchFilterState {
  selectedBrands: string[];
  selectedColors: string[];
  selectedGenders: string[];
  priceRange: [number, number];
  sortBy: VisualSearchSortBy;
}

/**
 * 从视觉搜索的 50 个结果中本地聚合 facets 数据
 */
function aggregateFacets(products: VisualSearchProduct[]): VisualSearchFacets {
  const categoryMap = new Map<string, { label: string; count: number }>();
  const brandMap = new Map<string, { label: string; count: number }>();
  const colorMap = new Map<string, number>();
  const genderMap = new Map<string, number>();
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const p of products) {
    // Categories
    if (p.category) {
      const existing = categoryMap.get(p.category.slug);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(p.category.slug, { label: p.category.name, count: 1 });
      }
    }

    // Brands
    if (p.brand) {
      const existing = brandMap.get(p.brand.slug);
      if (existing) {
        existing.count++;
      } else {
        brandMap.set(p.brand.slug, { label: p.brand.name, count: 1 });
      }
    }

    // Colors
    if (p.colors) {
      for (const color of p.colors) {
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }

    // Genders
    if (p.gender) {
      genderMap.set(p.gender, (genderMap.get(p.gender) || 0) + 1);
    }

    // Price
    if (p.price.min < minPrice) minPrice = p.price.min;
    if (p.price.max > maxPrice) maxPrice = p.price.max;
  }

  return {
    categories: Array.from(categoryMap.entries())
      .map(([slug, { label, count }]) => ({ label, value: slug, count }))
      .sort((a, b) => b.count - a.count),
    brands: Array.from(brandMap.entries())
      .map(([slug, { label, count }]) => ({ label, value: slug, count }))
      .sort((a, b) => b.count - a.count),
    colors: Array.from(colorMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    genders: Array.from(genderMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    priceRange: {
      min: minPrice === Infinity ? 0 : Math.floor(minPrice),
      max: maxPrice === 0 ? 100000 : Math.ceil(maxPrice),
    },
  };
}

/**
 * 客户端筛选 + 排序 hook，用于视觉搜索结果页
 *
 * 不涉及 URL 参数、不发 API 请求，纯本地 state
 */
export function useVisualSearchFilters(allProducts: VisualSearchProduct[]) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [sortBy, setSortBy] = useState<VisualSearchSortBy>('similarity');

  // 从全量数据聚合 facets（不受筛选影响）
  const facets = useMemo(() => aggregateFacets(allProducts), [allProducts]);

  // 实际使用的价格范围
  const effectivePriceRange = priceRange ?? [facets.priceRange.min, facets.priceRange.max];

  // 筛选
  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      // Category filter
      if (selectedCategories.length > 0 && (!p.category || !selectedCategories.includes(p.category.slug))) {
        return false;
      }
      // Brand filter
      if (selectedBrands.length > 0 && (!p.brand || !selectedBrands.includes(p.brand.slug))) {
        return false;
      }
      // Color filter
      if (selectedColors.length > 0) {
        if (!p.colors || !p.colors.some((c) => selectedColors.includes(c))) {
          return false;
        }
      }
      // Gender filter
      if (selectedGenders.length > 0 && (!p.gender || !selectedGenders.includes(p.gender))) {
        return false;
      }
      // Price filter
      if (priceRange) {
        if (p.price.min > priceRange[1] || p.price.max < priceRange[0]) {
          return false;
        }
      }
      return true;
    });
  }, [allProducts, selectedCategories, selectedBrands, selectedColors, selectedGenders, priceRange]);

  // 排序
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'price_asc':
        return arr.sort((a, b) => (a.price.min || 0) - (b.price.min || 0));
      case 'price_desc':
        return arr.sort((a, b) => (b.price.min || 0) - (a.price.min || 0));
      default:
        return arr; // similarity - API 默认顺序
    }
  }, [filtered, sortBy]);

  const filterCount =
    selectedCategories.length + selectedBrands.length + selectedColors.length + selectedGenders.length + (priceRange ? 1 : 0);

  const clearAll = useCallback(() => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedGenders([]);
    setPriceRange(null);
  }, []);

  return {
    products: sorted,
    facets,
    filterCount,
    // State
    selectedCategories,
    selectedBrands,
    selectedColors,
    selectedGenders,
    priceRange: effectivePriceRange as [number, number],
    sortBy,
    // Setters
    setSelectedCategories,
    setSelectedBrands,
    setSelectedColors,
    setSelectedGenders,
    setPriceRange,
    setSortBy,
    clearAll,
  };
}
