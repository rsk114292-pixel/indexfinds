import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { QueryProductDto } from './dto/query-product.dto';
import { ProductFilterBuilderService } from './product-filter-builder.service';

export interface CategoryFacetItem {
  id: string;
  name: string;
  slug: string;
  level: number;
  count: number;
  children?: CategoryFacetItem[];
  translations?: Record<string, { name?: string; description?: string }> | null;
}

export interface FacetResult {
  categories: CategoryFacetItem[];
  brands: Array<{ id: string; name: string; slug: string; count: number }>;
  priceRange: { min: number; max: number };
  colors: Array<{ value: string; count: number }>;
  sizes: Array<{ value: string; count: number }>;
  genders: Array<{ value: string; count: number }>;
  styles: Array<{ value: string; count: number }>;
  occasions: Array<{ value: string; count: number }>;
  seasons: Array<{ value: string; count: number }>;
}

/**
 * 商品 Facet 聚合服务
 * 职责：获取筛选器的聚合数据（品牌数量、价格区间、属性统计等）
 */
@Injectable()
export class ProductFacetService {
  private readonly logger = new Logger(ProductFacetService.name);
  private static readonly MAX_BRAND_FACETS = 5000;
  private readonly FACET_CACHE_TTL = 60 * 1000; // 1分钟
  private readonly MAX_FACET_CACHE_ENTRIES = 100;
  private readonly facetCache = new Map<
    string,
    { expiresAt: number; result: FacetResult }
  >();
  private readonly pendingFacetLoads = new Map<string, Promise<FacetResult>>();

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly filterBuilderService: ProductFilterBuilderService,
  ) {}

  /**
   * 获取筛选器 facets（品牌、价格区间、属性等聚合数据）
   * 优化：使用 SQL 聚合而不是内存聚合，避免 N+1 问题
   */
  async getFacets(query: QueryProductDto): Promise<FacetResult> {
    const cacheKey = this.getFacetCacheKey(query);
    const cached = this.facetCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    const pending = this.pendingFacetLoads.get(cacheKey);
    if (pending) {
      return pending;
    }

    const loadPromise = this.loadFacets(query)
      .then((result) => {
        if (this.facetCache.size >= this.MAX_FACET_CACHE_ENTRIES) {
          this.facetCache.clear();
        }
        this.facetCache.set(cacheKey, {
          expiresAt: Date.now() + this.FACET_CACHE_TTL,
          result,
        });
        return result;
      })
      .finally(() => {
        this.pendingFacetLoads.delete(cacheKey);
      });

    this.pendingFacetLoads.set(cacheKey, loadPromise);
    return loadPromise;
  }

  private getFacetCacheKey(query: QueryProductDto): string {
    return JSON.stringify(
      Object.entries(query ?? {})
        .filter(([, value]) => {
          if (value === undefined || value === null) return false;
          return String(value).trim().length > 0;
        })
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  private async loadFacets(query: QueryProductDto): Promise<FacetResult> {
    const { category } = query;

    // 获取分类 ID 列表（如果指定了分类）
    let categoryIds: string[] | null = null;
    if (category) {
      categoryIds = await this.filterBuilderService.getCategoryIds(category);
      if (!categoryIds) {
        // 分类不存在，返回空结果
        return this.getEmptyFacetResult();
      }
    }

    // 获取品牌 ID 列表（如果指定了品牌筛选）
    const brandSlugs = query.brands
      ? query.brands.split(',').map((b) => b.trim().toLowerCase())
      : null;

    // 并行执行聚合查询
    const [categories, brands, priceRange, attributeAggregations] =
      await Promise.all([
        this.aggregateCategories(categoryIds, brandSlugs),
        this.aggregateBrands(categoryIds),
        this.aggregatePriceRange(categoryIds),
        this.aggregateAttributes(categoryIds),
      ]);

    return {
      categories,
      brands,
      priceRange,
      ...attributeAggregations,
    };
  }

  /**
   * 分类聚合 — 返回树形结构，每个节点含产品数量
   * categoryIds: 限制在某个分类范围内（如果已选了分类页）
   * brandSlugs: 限制在某些品牌内（如品牌页）
   */
  async aggregateCategories(
    categoryIds: string[] | null,
    brandSlugs: string[] | null,
  ): Promise<CategoryFacetItem[]> {
    try {
      // 1. SQL 聚合每个 primaryCategory 的产品数量
      const params: any[] = ['active'];
      let conditions = '';

      if (categoryIds && categoryIds.length > 0) {
        const placeholders = categoryIds.map((_, i) => `$${i + 2}`);
        conditions += ` AND p."primaryCategoryId" IN (${placeholders.join(', ')})`;
        params.push(...categoryIds);
      }

      if (brandSlugs && brandSlugs.length > 0) {
        const offset = params.length + 1;
        const placeholders = brandSlugs.map((_, i) => `$${offset + i}`);
        conditions += ` AND b.slug IN (${placeholders.join(', ')})`;
        params.push(...brandSlugs);
      }

      const rows: Array<{ categoryId: string; count: string }> =
        await this.productRepository.manager.query(
          `SELECT p."primaryCategoryId" AS "categoryId", COUNT(p.id) AS count
           FROM products p
           ${brandSlugs ? 'LEFT JOIN brands b ON b.id = p."brandId"' : ''}
           WHERE p.status = $1
             AND p."primaryCategoryId" IS NOT NULL
             ${conditions}
           GROUP BY p."primaryCategoryId"
           ORDER BY count DESC`,
          params,
        );

      if (rows.length === 0) return [];

      // 2. 构建 categoryId → count 映射
      const countMap = new Map<string, number>();
      const categoryIdSet = new Set<string>();
      for (const row of rows) {
        countMap.set(row.categoryId, parseInt(row.count, 10));
        categoryIdSet.add(row.categoryId);
      }

      // 3. 获取完整分类树
      const treeRepo =
        this.categoryRepository.manager.getTreeRepository(Category);
      const fullTree = await treeRepo.findTrees();

      // 4. 递归构建带 count 的树（只保留有产品的分支）
      const buildTree = (nodes: Category[]): CategoryFacetItem[] => {
        const result: CategoryFacetItem[] = [];
        for (const node of nodes) {
          const children = node.children ? buildTree(node.children) : [];
          const selfCount = countMap.get(node.id) || 0;
          const childrenCount = children.reduce((sum, c) => sum + c.count, 0);
          const totalCount = selfCount + childrenCount;

          if (totalCount > 0) {
            result.push({
              id: node.id,
              name: node.name,
              slug: node.slug,
              level: node.level,
              count: totalCount,
              translations: node.translations,
              ...(children.length > 0 ? { children } : {}),
            });
          }
        }
        // 按 count 降序排列
        return result.sort((a, b) => b.count - a.count);
      };

      return buildTree(fullTree);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to aggregate category facets: ${message}`);
      return [];
    }
  }

  /**
   * 品牌聚合（基于品牌关联）
   */
  private async aggregateBrands(
    categoryIds: string[] | null,
  ): Promise<Array<{ id: string; name: string; slug: string; count: number }>> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.brand', 'brand')
      .select('brand.id', 'id')
      .addSelect('brand.name', 'name')
      .addSelect('brand.slug', 'slug')
      .addSelect('COUNT(product.id)', 'count')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.brandId IS NOT NULL')
      .groupBy('brand.id')
      .addGroupBy('brand.name')
      .addGroupBy('brand.slug')
      .orderBy('count', 'DESC')
      .limit(ProductFacetService.MAX_BRAND_FACETS);

    if (categoryIds) {
      queryBuilder.andWhere('product.primaryCategoryId IN (:...categoryIds)', {
        categoryIds,
      });
    }

    const brandsRaw = await queryBuilder.getRawMany();
    return brandsRaw.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * 价格范围聚合（SQL 聚合）
   */
  private async aggregatePriceRange(
    categoryIds: string[] | null,
  ): Promise<{ min: number; max: number }> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .select('MIN(product.priceMin)', 'minPrice')
      .addSelect('MAX(product.priceMax)', 'maxPrice')
      .where('product.status = :status', { status: 'active' });

    if (categoryIds) {
      queryBuilder.andWhere('product.primaryCategoryId IN (:...categoryIds)', {
        categoryIds,
      });
    }

    const result = await queryBuilder.getRawOne();
    return {
      min: parseFloat(result?.minPrice) || 0,
      max: parseFloat(result?.maxPrice) || 0,
    };
  }

  /**
   * AI 属性聚合 - SQL-based against normalized product_attribute_values table
   * (gender, colors, styles, occasions, seasons use normalized tables;
   *  sizes remain in-memory from aiAttributes JSON since they are not normalized)
   */
  private async aggregateAttributes(categoryIds: string[] | null): Promise<{
    colors: Array<{ value: string; count: number }>;
    sizes: Array<{ value: string; count: number }>;
    genders: Array<{ value: string; count: number }>;
    styles: Array<{ value: string; count: number }>;
    occasions: Array<{ value: string; count: number }>;
    seasons: Array<{ value: string; count: number }>;
  }> {
    // Run normalized SQL facets and sizes in-memory aggregation in parallel
    const [genders, colors, styles, occasions, seasons, sizes] =
      await Promise.all([
        this.aggregateAttributeFacet('gender', categoryIds),
        this.aggregateAttributeFacet('color', categoryIds, 20),
        this.aggregateAttributeFacet('style', categoryIds, 20),
        this.aggregateAttributeFacet('occasion', categoryIds, 20),
        this.aggregateAttributeFacet('season', categoryIds),
        this.aggregateSizesFromJson(categoryIds),
      ]);

    return { colors, sizes, genders, styles, occasions, seasons };
  }

  /**
   * SQL-based facet aggregation for a single attribute dimension.
   * Queries the normalized product_attribute_values + attribute_values + attributes tables.
   */
  private async aggregateAttributeFacet(
    attributeName: string,
    categoryIds: string[] | null,
    limit?: number,
  ): Promise<Array<{ value: string; count: number }>> {
    try {
      const params: any[] = ['active', attributeName];
      let categoryCondition = '';

      if (categoryIds && categoryIds.length > 0) {
        // Build numbered placeholders for category IDs: $3, $4, $5, ...
        const placeholders = categoryIds.map((_, i) => `$${i + 3}`);
        categoryCondition = `AND p."primaryCategoryId" IN (${placeholders.join(', ')})`;
        params.push(...categoryIds);
      }

      const limitClause = limit ? `LIMIT ${limit}` : '';

      const rows = await this.productRepository.manager.query(
        `SELECT av.value, COUNT(DISTINCT pav.product_id) as count
         FROM product_attribute_values pav
         JOIN attribute_values av ON av.id = pav.attribute_value_id
         JOIN attributes a ON a.id = av.attribute_id
         JOIN products p ON p.id = pav.product_id
         WHERE p.status = $1
           AND a.name = $2
           ${categoryCondition}
         GROUP BY av.value
         ORDER BY count DESC
         ${limitClause}`,
        params,
      );

      return rows.map((row: any) => ({
        value: row.value,
        count: parseInt(row.count, 10),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to aggregate ${attributeName} facets via SQL, returning empty: ${message}`,
      );
      return [];
    }
  }

  /**
   * Sizes aggregation remains in-memory from aiAttributes JSON
   * (sizes are not part of the normalized attribute system)
   */
  private async aggregateSizesFromJson(
    categoryIds: string[] | null,
  ): Promise<Array<{ value: string; count: number }>> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .select('product.aiAttributes')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.aiAttributes IS NOT NULL')
      .limit(1000);

    if (categoryIds) {
      queryBuilder.andWhere('product.primaryCategoryId IN (:...categoryIds)', {
        categoryIds,
      });
    }

    const productsWithAttrs = await queryBuilder.getMany();
    const sizeMap = new Map<string, number>();

    for (const product of productsWithAttrs) {
      if (
        product.aiAttributes?.sizes &&
        Array.isArray(product.aiAttributes.sizes)
      ) {
        for (const size of product.aiAttributes.sizes) {
          sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
        }
      }
    }

    return this.mapToSortedArray(sizeMap, 20);
  }

  /**
   * 将 Map 转换为排序数组
   */
  private mapToSortedArray(
    map: Map<string, number>,
    limit?: number,
  ): Array<{ value: string; count: number }> {
    const array = Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return limit ? array.slice(0, limit) : array;
  }

  /**
   * 返回空的 Facet 结果
   */
  private getEmptyFacetResult(): FacetResult {
    return {
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 0 },
      colors: [],
      sizes: [],
      genders: [],
      styles: [],
      occasions: [],
      seasons: [],
    };
  }
}
