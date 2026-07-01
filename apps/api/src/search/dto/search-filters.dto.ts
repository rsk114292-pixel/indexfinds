/**
 * 搜索过滤器类型定义
 * 替代 Record<string, any> 以增强类型安全
 */

/**
 * 搜索过滤器接口
 */
export interface SearchFilters {
  /** 品牌 slug，逗号分隔 */
  brands?: string;
  /** 分类 slug */
  category?: string;
  /** 性别，逗号分隔 (男,女,中性) */
  genders?: string;
  /** 颜色，逗号分隔 */
  colors?: string;
  /** 季节，逗号分隔 (春,夏,秋,冬) */
  seasons?: string;
  /** 风格，逗号分隔 */
  styles?: string;
  /** 场合，逗号分隔 */
  occasions?: string;
  /** 最低价格 */
  priceMin?: number;
  /** 最高价格 */
  priceMax?: number;
  /** 排序字段 */
  sortBy?: SortField;
  /** 排序方向 */
  sortOrder?: SortOrder;
}

/**
 * 排序字段枚举
 */
export type SortField =
  | 'createdAt'
  | 'price'
  | 'viewCount'
  | 'salesCount'
  | 'relevance';

/**
 * 排序方向
 */
export type SortOrder = 'ASC' | 'DESC';

/**
 * 解析后的过滤器（数组形式）
 */
export interface ParsedFilters {
  brands: string[];
  category: string | null;
  genders: string[];
  colors: string[];
  seasons: string[];
  styles: string[];
  occasions: string[];
  priceMin: number | null;
  priceMax: number | null;
  sortBy: SortField;
  sortOrder: SortOrder;
}

/**
 * 解析搜索过滤器
 */
export function parseFilters(filters: SearchFilters): ParsedFilters {
  return {
    brands:
      filters.brands
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    category: filters.category?.trim() || null,
    genders:
      filters.genders
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    colors:
      filters.colors
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    seasons:
      filters.seasons
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    styles:
      filters.styles
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    occasions:
      filters.occasions
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null,
    sortBy: filters.sortBy ?? 'relevance',
    sortOrder: filters.sortOrder ?? 'DESC',
  };
}

/**
 * 检查过滤器是否为空
 */
export function isEmptyFilters(filters: SearchFilters): boolean {
  return (
    !filters.brands &&
    !filters.category &&
    !filters.genders &&
    !filters.colors &&
    !filters.seasons &&
    !filters.styles &&
    !filters.occasions &&
    filters.priceMin === undefined &&
    filters.priceMax === undefined
  );
}
