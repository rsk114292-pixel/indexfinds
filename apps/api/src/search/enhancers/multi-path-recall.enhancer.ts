/**
 * 多路召回增强器
 *
 * 作为兜底策略，当其他搜索无结果时使用多路召回
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchEnhancer } from '../orchestrator/search-strategy.interface';
import { SearchContext, SearchResult } from '../orchestrator/search-context';
import { ProductSearchEnhancerService } from '../../products/product-search-enhancer.service';

@Injectable()
export class MultiPathRecallEnhancer implements ISearchEnhancer {
  readonly name = 'MultiPathRecallFallback';
  private readonly logger = new Logger(MultiPathRecallEnhancer.name);

  constructor(
    private readonly searchEnhancerService: ProductSearchEnhancerService,
  ) {}

  /**
   * 判断是否需要多路召回
   */
  shouldEnhance(context: SearchContext): boolean {
    const { request, result, analysis } = context;
    // 无结果且有搜索词，且不是纯意图搜索（纯意图搜索已经走过多路召回策略）
    return (
      (result?.total ?? 0) === 0 &&
      !!request.query &&
      !analysis?.isPureIntentSearch
    );
  }

  /**
   * 执行多路召回
   */
  async enhance(context: SearchContext): Promise<SearchResult | null> {
    const { request, analysis, result } = context;
    const filters = context.getMergedFilters();

    // 使用纠正后的查询（如果有）
    const searchQuery = result?.correctedQuery ?? request.query;

    const recallResult = await this.searchEnhancerService.tryMultiPathRecall(
      searchQuery!,
      analysis?.analyzedQuery ?? null,
      {
        brands: filters.brands,
        category: filters.category,
        colors: filters.colors,
        genders: filters.genders,
        seasons: filters.seasons,
      },
      context.effectiveSortBy,
      context.intentSortApplied,
      request.limit,
      context.skip,
    );

    if (recallResult) {
      this.logger.debug(
        `多路召回增强成功: "${searchQuery}", 结果数=${recallResult.total}`,
      );
      return {
        products: recallResult.products,
        total: recallResult.total,
        semanticEnhanced: true,
        usedFallback: recallResult.usedFallback,
      };
    }

    return null;
  }
}
