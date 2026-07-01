/**
 * 语义补充增强器
 *
 * 当搜索有结果但不足时，使用语义搜索补充更多结果
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchEnhancer } from '../orchestrator/search-strategy.interface';
import { SearchContext, SearchResult } from '../orchestrator/search-context';
import { ProductSearchEnhancerService } from '../../products/product-search-enhancer.service';

@Injectable()
export class SemanticSupplementEnhancer implements ISearchEnhancer {
  readonly name = 'SemanticSupplement';
  readonly configKey = 'enableSemanticEnhance' as const;
  private readonly logger = new Logger(SemanticSupplementEnhancer.name);

  constructor(
    private readonly searchEnhancerService: ProductSearchEnhancerService,
  ) {}

  /**
   * 判断是否需要语义补充
   */
  shouldEnhance(context: SearchContext): boolean {
    const { request, result } = context;
    // 有结果但少于 limit 且有搜索词
    return (
      (result?.total ?? 0) > 0 &&
      (result?.products?.length ?? 0) < request.limit &&
      !!request.query
    );
  }

  /**
   * 执行语义补充
   */
  async enhance(context: SearchContext): Promise<SearchResult | null> {
    const { request, result } = context;

    if (!result) return null;

    const searchQuery = result.correctedQuery ?? request.query;
    const enhancedProducts =
      await this.searchEnhancerService.trySemanticEnhance(
        result.products,
        searchQuery!,
        request.limit,
      );

    if (enhancedProducts.length > result.products.length) {
      this.logger.debug(
        `语义补充成功: 从 ${result.products.length} 增加到 ${enhancedProducts.length}`,
      );
      return {
        ...result,
        products: enhancedProducts,
        semanticEnhanced: true,
      };
    }

    return null;
  }
}
