// Main component
export { FilterSidebar } from './FilterSidebar';

// Sub-components
export { CategoryFilter } from './CategoryFilter';
export { BrandFilter } from './BrandFilter';
export { ColorFilter } from './ColorFilter';
export { PriceRangeFilter } from './PriceRangeFilter';
export { CheckboxFilter } from './CheckboxFilter';
export { TagFilter } from './TagFilter';

// Hooks
export { useFilterState } from './hooks/useFilterState';

// Types
export type {
  FilterSidebarProps,
  FilterState,
  FilterActions,
  FacetItem,
  CategoryFacetItem,
  FacetsData,
  BaseFilterProps,
} from './types';

// Constants
export { COLOR_MAP, getColorStyle, DEFAULT_SHOW_COUNT } from './constants';
