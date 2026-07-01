/**
 * 多路召回搜索策略
 *
 * 用于纯意图搜索场景，结合语义搜索和多种召回路径
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchStrategy } from '../orchestrator/search-strategy.interface';
import { SearchContext, SearchResult } from '../orchestrator/search-context';
import { ProductSearchEnhancerService } from '../../products/product-search-enhancer.service';

@Injectable()
export class MultiPathRecallStrategy implements ISearchStrategy {
  readonly name = 'MultiPathRecall';
  private readonly logger = new Logger(MultiPathRecallStrategy.name);

  constructor(
    private readonly searchEnhancerService: ProductSearchEnhancerService,
  ) {}

  /**
   * 判断是否适用
   * 适用于纯意图搜索场景
   */
  canHandle(context: SearchContext): boolean {
    // 只有纯意图搜索且有查询词时才使用
    return !!(context.analysis?.isPureIntentSearch && context.request.query);
  }

  /**
   * 执行多路召回搜索
   */
  async execute(context: SearchContext): Promise<SearchResult> {
    const { request, analysis } = context;
    const filters = context.getMergedFilters();

    this.logger.debug(`执行多路召回搜索: "${request.query}"`);

    const recallResult = await this.searchEnhancerService.tryMultiPathRecall(
      request.query!,
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
      return {
        products: recallResult.products,
        total: recallResult.total,
        semanticEnhanced: true,
        usedFallback: recallResult.usedFallback,
      };
    }

    return { products: [], total: 0 };
  }
}
