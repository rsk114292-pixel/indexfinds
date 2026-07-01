/**
 * 搜索上下文
 *
 * 封装搜索请求的所有相关信息，在搜索流水线中传递
 */

import { Product } from '../../products/entities/product.entity';
import { AnalyzedQuery } from '../keyword-analysis.service';
import { SearchFilters } from '../dto/search-filters.dto';

/**
 * 搜索请求参数
 */
export interface SearchRequest {
  /** 搜索关键词 */
  query?: string;
  /** 分类 slug */
  category?: string;
  /** 页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 排序字段 */
  sortBy: string;
  /** 排序方向 */
  sortOrder: 'ASC' | 'DESC';
  /** 性别筛选 */
  gender?: string;
  /** 偏好品牌 IDs */
  preferredBrands?: string;
  /** 偏好分类 IDs */
  preferredCategories?: string;
  /** 批量 ID 查询 */
  ids?: string;
  /** 其他筛选条件 */
  filters: SearchFilters;
}

/**
 * 搜索分析结果
 */
export interface SearchAnalysis {
  /** 分析后的查询 */
  analyzedQuery: AnalyzedQuery | null;
  /** 有效分类 */
  effectiveCategory?: string;
  /** 从分析中提取的筛选条件 */
  analyzedFilters: Record<string, string>;
  /** 意图排序字段 */
  intentSortBy: string;
  /** 是否应用了意图排序 */
  intentSortApplied: boolean;
  /** 搜索关键词列表 */
  searchKeywords: string[];
  /** 是否为纯意图搜索 */
  isPureIntentSearch: boolean;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 商品列表 */
  products: Product[];
  /** 总数 */
  total: number;
  /** 是否使用了语义增强 */
  semanticEnhanced?: boolean;
  /** 是否使用了兜底策略 */
  usedFallback?: boolean;
  /** 是否进行了拼写纠正 */
  spellCorrected?: boolean;
  /** 纠正后的查询 */
  correctedQuery?: string;
}

/**
 * 搜索上下文
 * 在搜索流水线的各个阶段之间传递状态
 */
export class SearchContext {
  /** 原始请求 */
  readonly request: SearchRequest;

  /** 分析结果 */
  analysis: SearchAnalysis | null = null;

  /** 当前搜索结果 */
  result: SearchResult | null = null;

  /** 是否完成（用于快速路径跳过后续步骤） */
  completed = false;

  /** 搜索日志 ID */
  searchLogId?: string;

  /** 计算属性 */
  get effectiveQuery(): string | undefined {
    return this.request.query;
  }

  get skip(): number {
    return (this.request.page - 1) * this.request.limit;
  }

  get effectiveSortBy(): string {
    return this.analysis?.intentSortBy ?? this.request.sortBy;
  }

  get intentSortApplied(): boolean {
    return this.analysis?.intentSortApplied ?? false;
  }

  constructor(request: SearchRequest) {
    this.request = request;
  }

  /**
   * 设置分析结果
   */
  setAnalysis(analysis: SearchAnalysis): void {
    this.analysis = analysis;
  }

  /**
   * 设置搜索结果
   */
  setResult(result: SearchResult): void {
    this.result = result;
  }

  /**
   * 标记为完成
   */
  markCompleted(): void {
    this.completed = true;
  }

  /**
   * 是否有搜索结果
   */
  hasResults(): boolean {
    return (this.result?.total ?? 0) > 0;
  }

  /**
   * 是否需要更多结果
   */
  needsMoreResults(): boolean {
    if (!this.result) return true;
    // 如果已经是最后一页，不需要更多结果
    if (this.result.total <= this.skip + this.result.products.length)
      return false;
    return this.result.products.length < this.request.limit;
  }

  /**
   * 获取合并后的筛选条件
   */
  getMergedFilters(): SearchFilters {
    const { filters, gender } = this.request;
    const analyzedFilters = this.analysis?.analyzedFilters ?? {};

    return {
      ...filters,
      brands: filters.brands || analyzedFilters.brands,
      colors: filters.colors || analyzedFilters.colors,
      genders: filters.genders || gender || analyzedFilters.genders,
      seasons: filters.seasons || analyzedFilters.seasons,
      category: this.analysis?.effectiveCategory,
    };
  }
}
