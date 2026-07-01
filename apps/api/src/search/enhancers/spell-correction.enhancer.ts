/**
 * 拼写纠正增强器
 *
 * 当搜索无结果时尝试进行拼写纠正
 */

import { Injectable, Logger } from '@nestjs/common';
import { ISearchEnhancer } from '../orchestrator/search-strategy.interface';
import { SearchContext, SearchResult } from '../orchestrator/search-context';
import { ProductSearchEnhancerService } from '../../products/product-search-enhancer.service';

// 排序配置映射
const SORT_CONFIG: Record<string, { field: string; order: 'ASC' | 'DESC' }> = {
  relevance: { field: 'createdAt', order: 'DESC' },
  newest: { field: 'createdAt', order: 'DESC' },
  price_asc: { field: 'priceMin', order: 'ASC' },
  price_desc: { field: 'priceMin', order: 'DESC' },
  popular: { field: 'popularityScore', order: 'DESC' },
  createdAt: { field: 'createdAt', order: 'DESC' },
  price: { field: 'priceMin', order: 'ASC' },
  sales: { field: 'salesCount', order: 'DESC' },
  views: { field: 'viewCount', order: 'DESC' },
};

@Injectable()
export class SpellCorrectionEnhancer implements ISearchEnhancer {
  readonly name = 'SpellCorrection';
  readonly configKey = 'enableSpellCorrection' as const;
  private readonly logger = new Logger(SpellCorrectionEnhancer.name);

  constructor(
    private readonly searchEnhancerService: ProductSearchEnhancerService,
  ) {}

  /**
   * 判断是否需要拼写纠正
   */
  shouldEnhance(context: SearchContext): boolean {
    const { request, result } = context;
    // 无结果且有搜索词且长度 >= 2
    return (
      (result?.total ?? 0) === 0 && !!request.query && request.query.length >= 2
    );
  }

  /**
   * 执行拼写纠正
   */
  async enhance(context: SearchContext): Promise<SearchResult | null> {
    const { request } = context;

    const correctionResult =
      await this.searchEnhancerService.trySpellCorrection(
        request.query!,
        request.sortBy,
        SORT_CONFIG,
        context.skip,
        request.limit,
      );

    if (correctionResult && correctionResult.total > 0) {
      this.logger.debug(
        `拼写纠正成功: "${request.query}" -> "${correctionResult.correctedQuery}"`,
      );
      return {
        products: correctionResult.data,
        total: correctionResult.total,
        spellCorrected: true,
        correctedQuery: correctionResult.correctedQuery,
      };
    }

    return null;
  }
}
