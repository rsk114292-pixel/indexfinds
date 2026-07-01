/**
 * 筛选组件类型定义
 */

export interface FacetItem {
  label?: string;
  value: string;
  count: number;
}

export interface CategoryFacetItem {
  id: string;
  name: string;
  slug: string;
  level: number;
  count: number;
  children?: CategoryFacetItem[];
  translations?: Record<string, { name?: string; description?: string }> | null;
}

export interface FacetsData {
  categories: CategoryFacetItem[];
  brands: Array<{ id: string; name: string; slug: string; count: number }>;
  priceRange: { min: number; max: number };
  colors: Array<{ value: string; count: number }>;
  genders: Array<{ value: string; count: number }>;
  styles: Array<{ value: string; count: number }>;
  occasions: Array<{ value: string; count: number }>;
  seasons: Array<{ value: string; count: number }>;
}

export interface FilterSidebarProps {
  categories?: CategoryFacetItem[];
  brands?: Array<{ label: string; value: string; count: number }>;
  colors?: FacetItem[];
  genders?: FacetItem[];
  styles?: FacetItem[];
  occasions?: FacetItem[];
  seasons?: FacetItem[];
  priceRange?: { min: number; max: number };
  onFilterChange?: (filters: Record<string, string | string[] | number | [number, number]>) => void;
  className?: string;
  enabled?: boolean;
}

export interface FilterState {
  selectedCategories: string[];
  selectedBrands: string[];
  selectedColors: string[];
  selectedGenders: string[];
  selectedStyles: string[];
  selectedOccasions: string[];
  selectedSeasons: string[];
  selectedPriceRange: [number, number];
}

export interface FilterActions {
  setSelectedBrands: (brands: string[]) => void;
  setSelectedColors: (colors: string[]) => void;
  setSelectedGenders: (genders: string[]) => void;
  setSelectedStyles: (styles: string[]) => void;
  setSelectedOccasions: (occasions: string[]) => void;
  setSelectedSeasons: (seasons: string[]) => void;
  setSelectedPriceRange: (range: [number, number]) => void;
  clearAll: () => void;
  applyFilters: () => void;
}

export interface BaseFilterProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
  defaultShowCount?: number;
}
