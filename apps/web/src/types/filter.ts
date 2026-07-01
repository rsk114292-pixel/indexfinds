/**
 * 筛选器相关类型
 */
import type { Product } from './product';

export type SortBy = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'popular';

export interface FilterParams {
  // 关键词搜索
  q?: string;

  // 维度筛选（前端传数组，API 接收逗号分隔字符串）
  categories?: string[];
  brands?: string[];
  series?: string[];
  genders?: string[];
  colors?: string[];
  styles?: string[];
  occasions?: string[];
  seasons?: string[];

  // 价格筛选
  minPrice?: number;
  maxPrice?: number;

  // 排序与分页
  sortBy?: SortBy;
  page?: number;
  limit?: number;

  // 其他
  locale?: string;
}

export interface FacetValue {
  label: string;
  value: string;
  count: number;
  group?: string;
  isSelected?: boolean;
}

export interface Facets {
  categories: FacetValue[];
  brands: FacetValue[];
  series: FacetValue[];
  genders: FacetValue[];
  colors: FacetValue[];
  styles: FacetValue[];
  occasions: FacetValue[];
  seasons: FacetValue[];
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface FilterResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: Facets;
  appliedFilters: FilterParams;
}
