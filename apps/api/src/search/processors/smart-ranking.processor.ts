/**
 * 智能排序后处理器
 *
 * 对搜索结果进行智能排序，包括：
 * - 基础智能排序
 * - 用户偏好加权
 * - 礼物品类优先
 * - 性别匹配权重
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchPostProcessor } from '../orchestrator/search-strategy.interface';
import { SearchContext } from '../orchestrator/search-context';
import { ProductSearchEnhancerService } from '../../products/product-search-enhancer.service';

@Injectable()
export class SmartRankingProcessor implements ISearchPostProcessor {
  readonly name = 'SmartRanking';
  private readonly logger = new Logger(SmartRankingProcessor.name);

  constructor(
    private readonly searchEnhancerService: ProductSearchEnhancerService,
  ) {}

  /**
   * 判断是否需要智能排序
   */
  shouldProcess(context: SearchContext): boolean {
    return (context.result?.total ?? 0) > 0;
  }

  /**
   * 执行智能排序
   */
  process(context: SearchContext): void {
    const { request, result, analysis } = context;

    if (!result || result.products.length === 0) return;

    const searchQuery = result.correctedQuery ?? request.query ?? '';
    let rankedProducts = result.products;

    // 1. 基础智能排序
    rankedProducts = this.searchEnhancerService.applySmartRanking(
      rankedProducts,
      searchQuery,
      request.sortBy,
      context.intentSortApplied,
    );

    // 2. 用户偏好加权
    const genderFilter = this.extractGenderFilter(request, analysis);
    const hasGenderSort = !!genderFilter;

    if (request.preferredBrands || request.preferredCategories) {
      const brandIds = request.preferredBrands
        ? request.preferredBrands.split(',').filter(Boolean)
        : [];
      const categoryIds = request.preferredCategories
        ? request.preferredCategories.split(',').filter(Boolean)
        : [];

      rankedProducts = this.searchEnhancerService.applyPreferenceBoost(
        rankedProducts,
        brandIds,
        categoryIds,
        context.intentSortApplied || hasGenderSort,
      );
    }

    // 3. 礼物品类优先（当检测到 gift 意图时）
    const isGiftIntent =
      analysis?.analyzedQuery?.intent?.purposeIntent === 'gift';
    if (isGiftIntent && !context.intentSortApplied) {
      rankedProducts =
        this.searchEnhancerService.applyGiftCategoryBoost(rankedProducts);
    }

    // 4. 性别匹配权重排序（最后执行）
    if (hasGenderSort) {
      rankedProducts = this.searchEnhancerService.applyGenderWeightSort(
        rankedProducts,
        genderFilter,
      );
    }

    result.products = rankedProducts;
    this.logger.debug(`智能排序完成，处理了 ${rankedProducts.length} 条结果`);
  }

  /**
   * 提取性别过滤条件
   */
  private extractGenderFilter(
    request: { gender?: string; filters: Record<string, any> },
    analysis: { analyzedFilters?: Record<string, string> } | null,
  ): string | null {
    if (request.gender) return request.gender;

    if (request.filters.genders) {
      return request.filters.genders.split(',')[0];
    }

    if (analysis?.analyzedFilters?.genders) {
      return analysis.analyzedFilters.genders.split(',')[0];
    }

    return null;
  }
}
