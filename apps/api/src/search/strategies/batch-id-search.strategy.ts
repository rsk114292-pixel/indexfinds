/**
 * 批量 ID 查询策略
 *
 * 用于通过商品 ID 列表快速查询，跳过其他搜索逻辑
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
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
export class BatchIdSearchStrategy implements ISearchStrategy {
  readonly name = 'BatchIdSearch';
  private readonly logger = new Logger(BatchIdSearchStrategy.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * 判断是否适用
   * 当请求包含 ids 参数时使用
   */
  canHandle(context: SearchContext): boolean {
    return !!context.request.ids;
  }

  /**
   * 执行批量 ID 查询
   */
  async execute(context: SearchContext): Promise<SearchResult> {
    const { request } = context;
    const productIds = request.ids!.split(',').filter(Boolean);

    if (productIds.length === 0) {
      context.markCompleted();
      return { products: [], total: 0 };
    }

    // 构建查询
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .leftJoinAndSelect('product.secondaryCategories', 'secondaryCategories')
      .where('product.id IN (:...ids)', { ids: productIds })
      .andWhere('product.status = :status', { status: 'active' });

    // 排序
    const sortConfig = this.getSortConfig(request.sortBy, request.sortOrder);
    queryBuilder.orderBy(`product.${sortConfig.field}`, sortConfig.order);

    // 分页
    queryBuilder.skip(context.skip).take(request.limit);

    // 执行查询
    const [products, total] = await queryBuilder.getManyAndCount();

    // 标记为完成，跳过后续策略
    context.markCompleted();

    this.logger.debug(
      `批量 ID 查询完成: ${productIds.length} 个 ID, 结果数=${total}`,
    );

    return { products, total };
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
      if (['createdAt', 'price', 'sales', 'views'].includes(sortBy)) {
        return { field: config.field, order: sortOrder as 'ASC' | 'DESC' };
      }
      return config;
    }
    return { field: 'createdAt', order: 'DESC' };
  }
}
