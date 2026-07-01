import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductStatus } from './product-status';
import { QueryProductDto } from './dto/query-product.dto';
import { GenderFilterBuilder } from '../search/utils/gender-filter.builder';
import { AttributeExistsFilter } from '../search/utils/attribute-filter.utils';
import { escapeIlike } from '../search/utils/query-validator';

/**
 * 商品筛选条件构建服务
 * 职责：将 QueryProductDto 转换为 TypeORM 查询条件
 */
@Injectable()
export class ProductFilterBuilderService {
  private readonly logger = new Logger(ProductFilterBuilderService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * 应用分类筛选（包括子分类）
   */
  async applyCategoryFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    categorySlug: string,
  ): Promise<boolean> {
    const categoryEntity = await this.categoryRepository.findOne({
      where: { slug: categorySlug },
    });

    if (!categoryEntity) {
      // 分类不存在，返回空结果
      queryBuilder.andWhere('1 = 0');
      return false;
    }

    // 使用 TreeRepository 获取该分类的所有后代分类
    const treeRepo =
      this.categoryRepository.manager.getTreeRepository(Category);
    const descendants = await treeRepo.findDescendants(categoryEntity);
    const categoryIds = [
      categoryEntity.id,
      ...descendants.map((c: Category) => c.id),
    ];

    // 查询主分类或副分类属于这些分类的产品
    queryBuilder.andWhere(
      '(product.primaryCategoryId IN (:...categoryIds) OR secondaryCategories.id IN (:...categoryIds))',
      { categoryIds },
    );

    return true;
  }

  /**
   * 获取分类 ID 列表（用于 Facet 聚合）
   */
  async getCategoryIds(categorySlug: string): Promise<string[] | null> {
    const categoryEntity = await this.categoryRepository.findOne({
      where: { slug: categorySlug },
    });

    if (!categoryEntity) {
      return null;
    }

    const treeRepo =
      this.categoryRepository.manager.getTreeRepository(Category);
    const descendants = await treeRepo.findDescendants(categoryEntity);
    return [categoryEntity.id, ...descendants.map((c: Category) => c.id)];
  }

  /**
   * 应用多选分类筛选（逗号分隔 slug，含子分类）
   */
  async applyMultiCategoryFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    categorySlugs: string,
  ): Promise<void> {
    const slugs = categorySlugs.split(',').map((s) => s.trim().toLowerCase());
    const allCategoryIds: string[] = [];

    const treeRepo =
      this.categoryRepository.manager.getTreeRepository(Category);

    for (const slug of slugs) {
      const entity = await this.categoryRepository.findOne({
        where: { slug },
      });
      if (entity) {
        const descendants = await treeRepo.findDescendants(entity);
        allCategoryIds.push(
          entity.id,
          ...descendants.map((c: Category) => c.id),
        );
      }
    }

    if (allCategoryIds.length === 0) {
      queryBuilder.andWhere('1 = 0');
      return;
    }

    // 去重
    const uniqueIds = [...new Set(allCategoryIds)];
    queryBuilder.andWhere(
      '(product.primaryCategoryId IN (:...multiCatIds) OR secondaryCategories.id IN (:...multiCatIds))',
      { multiCatIds: uniqueIds },
    );
  }

  /**
   * 获取多个分类 slug 对应的所有 ID（含子孙分类）
   */
  async getMultiCategoryIds(categorySlugs: string): Promise<string[]> {
    const slugs = categorySlugs.split(',').map((s) => s.trim().toLowerCase());
    const allIds: string[] = [];

    const treeRepo =
      this.categoryRepository.manager.getTreeRepository(Category);

    for (const slug of slugs) {
      const entity = await this.categoryRepository.findOne({
        where: { slug },
      });
      if (entity) {
        const descendants = await treeRepo.findDescendants(entity);
        allIds.push(entity.id, ...descendants.map((c: Category) => c.id));
      }
    }

    return [...new Set(allIds)];
  }

  /**
   * 应用品牌筛选
   */
  applyBrandFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    brandFilter: string,
  ): void {
    const escapedFilter = escapeIlike(brandFilter);
    queryBuilder.andWhere(
      '(brand.slug = :brandSlug OR brand.name ILIKE :brandName OR LOWER(brand.aliases) LIKE :brandAlias)',
      {
        brandSlug: brandFilter.toLowerCase(),
        brandName: `%${escapedFilter}%`,
        brandAlias: `%${escapeIlike(brandFilter.toLowerCase())}%`,
      },
    );
  }

  /**
   * 应用多选品牌筛选
   */
  applyMultiBrandFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    brands: string,
  ): void {
    const brandSlugs = brands.split(',').map((b) => b.trim().toLowerCase());
    queryBuilder.andWhere('brand.slug IN (:...brandSlugs)', { brandSlugs });
  }

  /**
   * 应用价格范围筛选
   */
  applyPriceFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    minPrice?: number,
    maxPrice?: number,
  ): void {
    // 区间重叠检测：商品价格区间 [priceMin, priceMax] 与用户筛选区间 [minPrice, maxPrice] 有交集即匹配
    // 确保多 SKU 商品只要有任意 SKU 在用户预算范围内就会展示
    if (minPrice !== undefined && maxPrice !== undefined) {
      queryBuilder.andWhere(
        'product.priceMin <= :maxPrice AND product.priceMax >= :minPrice',
        { minPrice, maxPrice },
      );
    } else if (minPrice !== undefined) {
      queryBuilder.andWhere('product.priceMax >= :minPrice', { minPrice });
    } else if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.priceMin <= :maxPrice', { maxPrice });
    }
  }

  /**
   * 应用状态筛选
   */
  applyStatusFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    status?: ProductStatus | 'all',
  ): void {
    if (status === 'all') {
      // 不过滤状态，返回所有产品（admin 后台用）
      return;
    } else if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    } else {
      // 默认只显示 active 状态的商品（前端公开访问）
      // pending_review, rejected, draft, inactive, split 等状态不应在前端显示
      queryBuilder.andWhere('product.status = :activeStatus', {
        activeStatus: ProductStatus.ACTIVE,
      });
    }
  }

  /**
   * 应用精选商品筛选
   */
  applyFeaturedFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    isFeatured: boolean,
  ): void {
    queryBuilder.andWhere('product.isFeatured = :isFeatured', { isFeatured });
  }

  /**
   * 应用 AI 属性筛选 - 单选颜色
   */
  applyColorFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    color: string,
  ): void {
    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'color',
      color,
      'singleColor',
    );
  }

  /**
   * 应用 AI 属性筛选 - 多选颜色
   */
  applyMultiColorFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    colors: string,
  ): void {
    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'color',
      colors,
      'filterColor',
    );
  }

  /**
   * 应用 AI 属性筛选 - 单选风格
   */
  applyStyleFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    style: string,
  ): void {
    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'style',
      style,
      'singleStyle',
    );
  }

  /**
   * 应用 AI 属性筛选 - 多选风格
   */
  applyMultiStyleFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    styles: string,
  ): void {
    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'style',
      styles,
      'filterStyle',
    );
  }

  /**
   * 应用 AI 属性筛选 - 单选性别
   * 使用 GenderFilterBuilder 统一处理性别过滤逻辑
   */
  applyGenderFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    gender: string,
  ): void {
    GenderFilterBuilder.applyToQueryBuilder(
      queryBuilder,
      gender,
      'filterGender',
    );
  }

  /**
   * 应用 AI 属性筛选 - 多选性别
   * 使用 GenderFilterBuilder 统一处理性别过滤逻辑
   */
  applyMultiGenderFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    genders: string,
  ): void {
    GenderFilterBuilder.applyToQueryBuilder(
      queryBuilder,
      genders,
      'filterGender',
    );
  }

  /**
   * 应用 AI 属性筛选 - 多选场景
   */
  applyMultiOccasionFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    occasions: string,
  ): void {
    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'occasion',
      occasions,
      'filterOcc',
    );
  }

  /**
   * 应用 AI 属性筛选 - 多选季节
   */
  applyMultiSeasonFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    seasons: string,
  ): void {
    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'season',
      seasons,
      'filterSea',
    );
  }

  /**
   * 应用文本搜索条件
   */
  applyTextSearchFilter(
    queryBuilder: SelectQueryBuilder<Product>,
    searchKeywords: string[],
  ): void {
    if (searchKeywords.length === 0) return;

    // 每个同义词/关键词用 OR 条件搜索
    const searchConditions = searchKeywords
      .map(
        (_, i) =>
          `(product.title ILIKE :search${i} OR product.originalTitle ILIKE :search${i})`,
      )
      .join(' OR ');
    const searchParams = Object.fromEntries(
      searchKeywords.map((term, i) => [`search${i}`, `%${escapeIlike(term)}%`]),
    );
    queryBuilder.andWhere(`(${searchConditions})`, searchParams);
  }

  /**
   * 批量应用所有筛选条件
   */
  async applyAllFilters(
    queryBuilder: SelectQueryBuilder<Product>,
    query: QueryProductDto,
    options: {
      effectiveCategory?: string;
      effectiveBrands?: string;
      analyzedFilters?: {
        brands?: string;
        colors?: string;
        genders?: string;
        styles?: string;
        occasions?: string;
        seasons?: string;
      };
    } = {},
  ): Promise<void> {
    const {
      brand,
      minPrice,
      maxPrice,
      color,
      style,
      gender,
      aiBrandName,
      ...filters
    } = query;

    const { effectiveCategory, analyzedFilters = {} } = options;

    // 合并分析结果到筛选条件
    const mergedFilters = {
      ...filters,
      brands: filters.brands || analyzedFilters.brands,
      colors: filters.colors || analyzedFilters.colors,
      genders: filters.genders || analyzedFilters.genders,
      styles: filters.styles || analyzedFilters.styles,
      occasions: filters.occasions || analyzedFilters.occasions,
      seasons: filters.seasons || analyzedFilters.seasons,
    };

    // 分类筛选
    if (effectiveCategory) {
      await this.applyCategoryFilter(queryBuilder, effectiveCategory);
    }

    // 多选分类筛选
    if (mergedFilters.categories) {
      await this.applyMultiCategoryFilter(
        queryBuilder,
        mergedFilters.categories,
      );
    }

    // 品牌筛选
    const brandFilter = aiBrandName || brand;
    if (brandFilter) {
      this.applyBrandFilter(queryBuilder, brandFilter);
    }

    // 多选品牌筛选
    if (mergedFilters.brands) {
      this.applyMultiBrandFilter(queryBuilder, mergedFilters.brands);
    }

    // 分类 ID 筛选
    if (mergedFilters.primaryCategoryId) {
      queryBuilder.andWhere('product.primaryCategoryId = :primaryCategoryId', {
        primaryCategoryId: mergedFilters.primaryCategoryId,
      });
    }

    if (mergedFilters.secondaryCategoryId) {
      queryBuilder.andWhere('secondaryCategories.id = :secondaryCategoryId', {
        secondaryCategoryId: mergedFilters.secondaryCategoryId,
      });
    }

    // 状态筛选
    this.applyStatusFilter(queryBuilder, mergedFilters.status);

    // 精选筛选
    if (mergedFilters.isFeatured !== undefined) {
      this.applyFeaturedFilter(queryBuilder, mergedFilters.isFeatured);
    }

    // 价格筛选
    this.applyPriceFilter(queryBuilder, minPrice, maxPrice);

    // AI 属性筛选 - 颜色
    if (color) {
      this.applyColorFilter(queryBuilder, color);
    }
    if (mergedFilters.colors) {
      this.applyMultiColorFilter(queryBuilder, mergedFilters.colors);
    }

    // AI 属性筛选 - 风格
    if (style) {
      this.applyStyleFilter(queryBuilder, style);
    }
    if (mergedFilters.styles) {
      this.applyMultiStyleFilter(queryBuilder, mergedFilters.styles);
    }

    // AI 属性筛选 - 性别
    if (gender) {
      this.logger.debug(`应用单选性别过滤: gender=${gender}`);
      this.applyGenderFilter(queryBuilder, gender);
    }
    if (mergedFilters.genders) {
      this.logger.debug(`应用多选性别过滤: genders=${mergedFilters.genders}`);
      this.applyMultiGenderFilter(queryBuilder, mergedFilters.genders);
    }

    // AI 属性筛选 - 场景
    if (mergedFilters.occasions) {
      this.applyMultiOccasionFilter(queryBuilder, mergedFilters.occasions);
    }

    // AI 属性筛选 - 季节
    if (mergedFilters.seasons) {
      this.applyMultiSeasonFilter(queryBuilder, mergedFilters.seasons);
    }

    // 死链筛选
    if (mergedFilters.deadLink === 'suspected') {
      queryBuilder.andWhere('product.weidianDeadLinkAttempts = 1');
    } else if (mergedFilters.deadLink === 'confirmed') {
      queryBuilder.andWhere('product.weidianDeadLinkAttempts >= 2');
    }
  }
}
