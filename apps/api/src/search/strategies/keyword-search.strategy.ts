/**
 * 关键词搜索策略
 *
 * 使用 TypeORM QueryBuilder 进行关键词匹配搜索
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { ProductFilterBuilderService } from '../../products/product-filter-builder.service';
import { ISearchStrategy } from '../orchestrator/search-strategy.interface';
import { SearchContext, SearchResult } from '../orchestrator/search-context';

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
export class KeywordSearchStrategy implements ISearchStrategy {
  readonly name = 'KeywordSearch';
  private readonly logger = new Logger(KeywordSearchStrategy.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly filterBuilderService: ProductFilterBuilderService,
  ) {}

  /**
   * 判断是否适用
   * 关键词搜索适用于非纯意图搜索的场景
   */
  canHandle(context: SearchContext): boolean {
    // 纯意图搜索不适合关键词搜索
    if (context.analysis?.isPureIntentSearch) {
      return false;
    }
    return true;
  }

  /**
   * 执行关键词搜索
   */
  async execute(context: SearchContext): Promise<SearchResult> {
    const { request, analysis } = context;

    // 构建查询
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .leftJoinAndSelect('product.secondaryCategories', 'secondaryCategories');

    // 应用所有筛选条件
    await this.filterBuilderService.applyAllFilters(
      queryBuilder,
      {
        ...request.filters,
        gender: request.gender,
      },
      {
        effectiveCategory: analysis?.effectiveCategory,
        analyzedFilters: analysis?.analyzedFilters,
      },
    );

    // 应用文本搜索
    const searchKeywords = analysis?.searchKeywords ?? [];
    if (searchKeywords.length > 0) {
      this.filterBuilderService.applyTextSearchFilter(
        queryBuilder,
        searchKeywords,
      );
    }

    // 排序
    const sortConfig = this.getSortConfig(
      context.effectiveSortBy,
      request.sortOrder,
    );
    queryBuilder.orderBy(`product.${sortConfig.field}`, sortConfig.order);

    // 分页
    queryBuilder.skip(context.skip).take(request.limit);

    // 执行查询
    const [products, total] = await queryBuilder.getManyAndCount();

    this.logger.debug(
      `关键词搜索完成: query="${request.query}", 结果数=${total}`,
    );

    return {
      products,
      total,
    };
  }

  /**
   * 获取排序配置
   */
  private getSortConfig(
    sortBy: string,
    sortOrder: string,
  ): { field: string; order: 'ASC' | 'DESC' } {
    const config = SORT_CONFIG[sortBy];
    if (config) {
      // 对于旧版兼容的排序方式，使用传入的 sortOrder
      if (['createdAt', 'price', 'sales', 'views'].includes(sortBy)) {
        return { field: config.field, order: sortOrder as 'ASC' | 'DESC' };
      }
      return config;
    }
    return { field: 'createdAt', order: 'DESC' };
  }
}
