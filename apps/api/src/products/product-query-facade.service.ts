import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductStatus } from './product-status';

/**
 * 商品查询门面服务
 *
 * 设计目的：
 * - 解决跨模块 Repository 注入问题
 * - Search 模块不再直接注入 Product Repository
 * - 通过此 Facade 访问商品数据，遵循模块边界
 *
 * 使用方式：
 * - Products 模块导出此服务
 * - Search 模块导入 ProductsModule 并注入此服务
 */
@Injectable()
export class ProductQueryFacadeService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * 获取活跃商品用于 BM25 统计
   * 用于 BM25RankingService 构建文档统计
   */
  async findActiveProductsForStats(): Promise<
    Array<{
      id: string;
      title: string;
      description: string | null;
      brand: { name: string } | null;
      primaryCategory: { name: string } | null;
    }>
  > {
    return this.productRepository
      .createQueryBuilder('p')
      .leftJoin('p.brand', 'brand')
      .leftJoin('p.primaryCategory', 'category')
      .select([
        'p.id',
        'p.title',
        'p.description',
        'brand.name',
        'category.name',
      ])
      .where('p.status = :status', { status: 'active' })
      .getMany();
  }

  /**
   * 按 ID 查询单个商品（含关联）
   * 用于 SemanticSearchService
   */
  async findProductById(
    productId: string,
    relations: string[] = ['brand', 'primaryCategory'],
  ): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id: productId },
      relations,
    });
  }

  /**
   * 按 ID 查询商品图片
   * 用于 VisualSearchService
   */
  async findProductImages(
    productId: string,
  ): Promise<{ id: string; mainImage: string; images: string[] } | null> {
    return this.productRepository.findOne({
      where: { id: productId },
      select: ['id', 'mainImage', 'images'],
    });
  }

  /**
   * 按 IDs 批量查询商品
   * 用于 OutboundTrackingService
   */
  async findProductsByIds(
    productIds: string[],
    select?: (keyof Product)[],
  ): Promise<Product[]> {
    if (!productIds.length) return [];

    const query = this.productRepository
      .createQueryBuilder('p')
      .whereInIds(productIds);

    if (select?.length) {
      query.select(select.map((field) => `p.${field}`));
    }

    return query.getMany();
  }

  /**
   * 创建商品查询构建器
   * 用于 MultiPathRecallService 等需要复杂查询的场景
   *
   * 注意：返回 QueryBuilder 是为了保持灵活性
   * 调用方可以继续添加条件、排序等
   */
  createProductQueryBuilder(
    alias: string = 'product',
  ): SelectQueryBuilder<Product> {
    return this.productRepository.createQueryBuilder(alias);
  }

  /**
   * 按状态查询商品数量
   * 用于统计和分析
   */
  async countByStatus(status: ProductStatus): Promise<number> {
    return this.productRepository.count({
      where: { status },
    });
  }

  /**
   * 查询活跃商品 IDs
   * 用于批量操作
   */
  async findActiveProductIds(limit?: number): Promise<string[]> {
    const query = this.productRepository
      .createQueryBuilder('p')
      .select('p.id')
      .where('p.status = :status', { status: 'active' });

    if (limit) {
      query.limit(limit);
    }

    const products = await query.getMany();
    return products.map((p) => p.id);
  }

  /**
   * 检查商品是否存在
   */
  async exists(productId: string): Promise<boolean> {
    const count = await this.productRepository.count({
      where: { id: productId },
    });
    return count > 0;
  }

  /**
   * 获取商品的基本信息（用于搜索结果展示）
   */
  async findProductBasicInfo(productIds: string[]): Promise<
    Array<{
      id: string;
      title: string;
      slug: string;
      mainImage: string;
      priceMin: number;
      priceMax: number;
      status: string;
    }>
  > {
    if (!productIds.length) return [];

    return this.productRepository
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.title',
        'p.slug',
        'p.mainImage',
        'p.priceMin',
        'p.priceMax',
        'p.status',
      ])
      .whereInIds(productIds)
      .getMany();
  }
}
