import { Injectable, Logger } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { SearchSpellCorrectionService } from './search-spell-correction.service';
import { SearchRecallEnhancerService } from './search-recall-enhancer.service';
import { SearchSortingBoostService } from './search-sorting-boost.service';
import type { AnalyzedQuery } from '../search/keyword-analysis.service';
import type {
  SpellCorrectionResult,
  MultiPathRecallResult,
  SearchFilters,
} from './dto/search-enhancer.types';

// Re-export types for backward compatibility
export type {
  SearchEnhanceResult,
  SearchEnhanceOptions,
  SearchFilters,
  SpellCorrectionResult,
  MultiPathRecallResult,
} from './dto/search-enhancer.types';

/**
 * ProductSearchEnhancerService - Facade 服务
 *
 * 聚合以下子服务：
 * - SearchSpellCorrectionService: 拼写纠正
 * - SearchRecallEnhancerService: 多路召回和语义增强
 * - SearchSortingBoostService: 排序和加权
 */
@Injectable()
export class ProductSearchEnhancerService {
  private readonly logger = new Logger(ProductSearchEnhancerService.name);

  constructor(
    private readonly spellCorrectionService: SearchSpellCorrectionService,
    private readonly recallEnhancerService: SearchRecallEnhancerService,
    private readonly sortingBoostService: SearchSortingBoostService,
  ) {}

  // ============================================================
  // 拼写纠正 (委托给 SearchSpellCorrectionService)
  // ============================================================

  async trySpellCorrection(
    effectiveSearch: string,
    sortBy: string,
    sortConfig: Record<string, { field: string; order: 'ASC' | 'DESC' }>,
    skip: number,
    limit: number,
  ): Promise<SpellCorrectionResult | null> {
    return this.spellCorrectionService.trySpellCorrection(
      effectiveSearch,
      sortBy,
      sortConfig,
      skip,
      limit,
    );
  }

  // ============================================================
  // 多路召回 (委托给 SearchRecallEnhancerService)
  // ============================================================

  async tryMultiPathRecall(
    searchQuery: string,
    analyzedQuery: AnalyzedQuery | null,
    filters: SearchFilters,
    intentSortBy: string,
    intentSortApplied: boolean,
    limit: number,
    skip: number = 0,
  ): Promise<MultiPathRecallResult | null> {
    return this.recallEnhancerService.tryMultiPathRecall(
      searchQuery,
      analyzedQuery,
      filters,
      intentSortBy,
      intentSortApplied,
      limit,
      skip,
    );
  }

  async trySemanticEnhance(
    currentData: Product[],
    searchQuery: string,
    limit: number,
  ): Promise<Product[]> {
    return this.recallEnhancerService.trySemanticEnhance(
      currentData,
      searchQuery,
      limit,
    );
  }

  // ============================================================
  // 排序和加权 (委托给 SearchSortingBoostService)
  // ============================================================

  applySmartRanking(
    data: Product[],
    searchQuery: string,
    sortBy: string,
    intentSortApplied: boolean,
  ): Product[] {
    return this.sortingBoostService.applySmartRanking(
      data,
      searchQuery,
      sortBy,
      intentSortApplied,
    );
  }

  applyGenderWeightSort(data: Product[], gender: string | null): Product[] {
    return this.sortingBoostService.applyGenderWeightSort(data, gender);
  }

  applyPreferenceBoost(
    products: Product[],
    preferredBrandIds: string[],
    preferredCategoryIds: string[],
    skipReSort: boolean = false,
  ): Product[] {
    return this.sortingBoostService.applyPreferenceBoost(
      products,
      preferredBrandIds,
      preferredCategoryIds,
      skipReSort,
    );
  }

  applyGiftCategoryBoost(products: Product[]): Product[] {
    return this.sortingBoostService.applyGiftCategoryBoost(products);
  }
}
