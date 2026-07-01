import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Brand } from './entities/brand.entity';
import { Product } from '../products/entities/product.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrandReviewService } from './brand-review.service';
import { BrandMatchService } from './brand-match.service';
import { BrandEvents, BrandUpdatedEvent } from '../shared/events/brand.events';
import { validateUrlForSSRF } from '../common/utils/url-validator';

/**
 * BrandsService
 * 品牌服务主入口（Facade）
 *
 * 职责：
 * - CRUD 操作
 * - 基础查询
 * - 委托审核流程给 BrandReviewService
 * - 委托匹配/合并给 BrandMatchService
 */
@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly reviewService: BrandReviewService,
    private readonly matchService: BrandMatchService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ========== 缓存失效 ==========

  /**
   * 清除 Redis 中品牌相关缓存
   */
  async clearBrandCache(): Promise<void> {
    try {
      const keyvStore = (this.cacheManager as any).stores?.[0];
      if (keyvStore?.client?.scanIterator) {
        const client = keyvStore.client;
        const keysToDelete: string[] = [];
        for await (const key of client.scanIterator({
          MATCH: '*brands*',
          COUNT: 100,
        })) {
          keysToDelete.push(key);
        }
        if (keysToDelete.length > 0) {
          await client.unlink(keysToDelete);
          this.logger.log(
            `Cleared ${keysToDelete.length} brand cache entries (Redis SCAN)`,
          );
        }
        return;
      }

      const internalStore = keyvStore?.store;
      if (internalStore instanceof Map) {
        const keysToDelete: string[] = [];
        for (const key of internalStore.keys()) {
          if (typeof key === 'string' && key.includes('/brands')) {
            keysToDelete.push(key);
          }
        }
        for (const key of keysToDelete) {
          internalStore.delete(key);
        }
        if (keysToDelete.length > 0) {
          this.logger.log(`Cleared ${keysToDelete.length} brand cache entries`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to clear brand cache:', error);
    }
  }

  private async attachAggregateProductCounts(
    brands: Brand[],
  ): Promise<Brand[]> {
    if (brands.length === 0) {
      return brands;
    }

    const brandIds = brands.map((brand) => brand.id);
    const rows: Array<{ id: string; productCount: string | number }> =
      await this.brandRepository.query(
        `
          WITH RECURSIVE brand_tree AS (
            SELECT
              b.id AS root_id,
              b.id AS brand_id
            FROM brands b
            WHERE b.id = ANY($1::uuid[])

            UNION ALL

            SELECT
              bt.root_id,
              child.id AS brand_id
            FROM brand_tree bt
            JOIN brands child ON child."parentId" = bt.brand_id
            WHERE child.status = 'active'
              AND child."isIndependent" = false
          )
          SELECT
            bt.root_id AS id,
            COUNT(DISTINCT p.id)::int AS "productCount"
          FROM brand_tree bt
          LEFT JOIN products p
            ON p."brandId" = bt.brand_id
           AND p.status = 'active'
          GROUP BY bt.root_id
        `,
        [brandIds],
      );

    const countMap = new Map(
      rows.map((row) => [row.id, Number(row.productCount) || 0]),
    );

    return brands.map((brand) => ({
      ...brand,
      productCount: countMap.get(brand.id) ?? brand.productCount ?? 0,
    }));
  }

  // ========== CRUD 操作 ==========

  /**
   * 创建品牌
   */
  async create(createBrandDto: CreateBrandDto): Promise<Brand> {
    // 自动生成 slug（如果未提供）
    if (!createBrandDto.slug) {
      createBrandDto.slug = this.matchService.generateSlug(createBrandDto.name);
    }
    const canonicalKey =
      this.matchService.generateCanonicalKey(createBrandDto.name) || null;

    // 自动生成别名（如果未提供）
    if (!createBrandDto.aliases || createBrandDto.aliases.length === 0) {
      createBrandDto.aliases = this.matchService.generateAliases(
        createBrandDto.name,
      );
    }

    // 手动创建的品牌默认为 active 状态
    if (!createBrandDto.status) {
      createBrandDto.status = 'active';
    }

    // 检查名称是否重复
    const existingByName = await this.brandRepository.findOne({
      where: { name: createBrandDto.name },
    });
    if (existingByName) {
      throw new ConflictException('品牌名称已存在');
    }

    // 检查 slug 是否重复
    const existingBySlug = await this.brandRepository.findOne({
      where: { slug: createBrandDto.slug },
    });
    if (existingBySlug) {
      createBrandDto.slug = `${createBrandDto.slug}-${Date.now().toString(36)}`;
    }

    const brand: Brand = this.brandRepository.create({
      ...createBrandDto,
      canonicalKey,
    });
    const saved = await this.brandRepository.save(brand);
    await this.clearBrandCache();
    return saved;
  }

  /**
   * 更新品牌
   */
  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);

    // 循环层级检测：设置 parentId 时，遍历祖先链确保不会形成环
    if (updateBrandDto.parentId && updateBrandDto.parentId !== brand.parentId) {
      if (updateBrandDto.parentId === id) {
        throw new BadRequestException('品牌不能将自身设为父品牌');
      }
      let currentId = updateBrandDto.parentId;
      for (let depth = 0; depth < 10; depth++) {
        const ancestor = await this.brandRepository.findOne({
          where: { id: currentId },
          select: ['id', 'parentId'],
        });
        if (!ancestor) break;
        if (ancestor.parentId === id) {
          throw new BadRequestException(
            '设置此父品牌会形成循环层级关系，操作已阻止',
          );
        }
        if (!ancestor.parentId) break;
        currentId = ancestor.parentId;
      }
    }

    if (updateBrandDto.name || updateBrandDto.slug) {
      const existingBrand = await this.brandRepository.findOne({
        where: [{ name: updateBrandDto.name }, { slug: updateBrandDto.slug }],
      });

      if (existingBrand && existingBrand.id !== id) {
        throw new ConflictException('品牌名称或 slug 已存在');
      }
    }

    Object.assign(brand, updateBrandDto);

    if (updateBrandDto.name) {
      brand.canonicalKey =
        this.matchService.generateCanonicalKey(updateBrandDto.name) || null;
    }

    const saved = await this.brandRepository.save(brand);
    await this.clearBrandCache();
    this.eventEmitter.emit(BrandEvents.UPDATED, {
      brandId: saved.id,
      changes: updateBrandDto,
      updatedAt: new Date(),
    } as BrandUpdatedEvent);
    return saved;
  }

  /**
   * 删除品牌（软删除：标记为 inactive）
   * 关联产品保持不动，inactive 品牌的商品在前端查询时已被过滤
   * 如需重新激活，findOrCreateByName() 会自动恢复 inactive 品牌
   */
  async remove(id: string): Promise<{ deletedBrand: string; status: string }> {
    const brand = await this.findOne(id);

    brand.status = 'inactive';
    await this.brandRepository.save(brand);
    await this.clearBrandCache();
    this.logger.log(`品牌 "${brand.name}" 已标记为 inactive（软删除）`);

    return { deletedBrand: brand.name, status: 'inactive' };
  }

  // ========== 基础查询 ==========

  /**
   * 查询品牌列表（支持筛选和搜索，包含商品数量）
   */
  async findAll(query: QueryBrandDto): Promise<{
    data: Brand[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qb = this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .leftJoinAndSelect('brand.parent', 'parent');

    // Tier 筛选
    if (query.tier) {
      qb.andWhere('brand.tier = :tier', { tier: query.tier });
    }

    // 状态过滤
    if (query.status) {
      qb.andWhere('brand.status = :status', { status: query.status });
    } else if (!query.includePending) {
      qb.andWhere('brand.status = :defaultStatus', {
        defaultStatus: 'active',
      });
    }

    // 父品牌筛选
    if (query.parentId) {
      qb.andWhere('brand.parentId = :parentId', { parentId: query.parentId });
    }

    // 独立展示筛选
    if (query.isIndependent !== undefined) {
      qb.andWhere('brand.isIndependent = :isIndependent', {
        isIndependent: query.isIndependent,
      });
    }

    // 精选品牌筛选
    if (query.isFeatured !== undefined) {
      qb.andWhere('brand.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured,
      });
    }

    // 只返回有产品的品牌
    if (query.hasProducts) {
      qb.innerJoin('brand.products', 'product_check')
        .groupBy('brand.id')
        .addGroupBy('parent.id');
    }

    // 加载子品牌关联
    if (query.includeChildren) {
      qb.leftJoinAndSelect('brand.children', 'children');
    }

    // 搜索过滤
    if (query.q && query.search && query.q !== query.search) {
      throw new BadRequestException('q and search cannot be different');
    }

    const effectiveSearch = query.q ?? query.search;
    if (effectiveSearch) {
      const searchLower = effectiveSearch.toLowerCase();
      qb.andWhere(
        '(LOWER(brand.name) LIKE :search OR LOWER(brand.aliases) LIKE :search)',
        { search: `%${searchLower}%` },
      );
    }

    // 排序
    if (query.isFeatured) {
      qb.orderBy('brand.featuredSort', 'ASC').addOrderBy('brand.name', 'ASC');
    } else {
      qb.addSelect(
        '(CASE WHEN brand.tier = 1 THEN 1 WHEN brand.tier = 2 THEN 2 ELSE 3 END)',
        'tier_order',
      )
        .orderBy('tier_order', 'ASC')
        .addOrderBy('brand.name', 'ASC');
    }

    const total = await qb.getCount();
    const limit = query.limit ?? 10;

    // limit=0 表示不分页，返回全部
    if (limit > 0) {
      const page = query.page || 1;
      const skip = (page - 1) * limit;
      qb.skip(skip).take(limit);
    }

    let brands = await qb.getMany();
    brands = await this.attachAggregateProductCounts(brands);

    // 如果请求包含精选产品，批量获取每个品牌的前4个有图产品
    if (query.includeFeaturedProducts && brands.length > 0) {
      const brandIds = brands.map((b) => b.id);

      // 使用子查询为每个品牌取前4个有主图的热门产品（按点击量倒序）
      const productsRaw = await this.productRepository
        .createQueryBuilder('p')
        .select([
          'p.id',
          'p.title',
          'p.slug',
          'p.mainImage',
          'p.priceMin',
          'p.priceMax',
          'p.currency',
          'p.brandId',
        ])
        .where('p.brandId IN (:...brandIds)', { brandIds })
        .andWhere('p.mainImage IS NOT NULL')
        .orderBy('p.brandId', 'ASC')
        .addOrderBy('p.clickCount', 'DESC')
        .addOrderBy('p.viewCount', 'DESC')
        .getMany();

      // 按品牌分组，每个品牌最多取4个
      const brandProductsMap = new Map<
        string,
        Array<{
          id: string;
          title: string;
          slug: string;
          mainImage: string;
          priceMin: number;
          priceMax: number;
          currency: string;
        }>
      >();

      for (const product of productsRaw) {
        const list = brandProductsMap.get(product.brandId) || [];
        if (list.length < 4) {
          list.push({
            id: product.id,
            title: product.title,
            slug: product.slug,
            mainImage: product.mainImage,
            priceMin: product.priceMin,
            priceMax: product.priceMax,
            currency: product.currency,
          });
          brandProductsMap.set(product.brandId, list);
        }
      }

      // 将精选产品附加到品牌数据上
      for (const brand of brands) {
        (brand as any).featuredProducts = brandProductsMap.get(brand.id) || [];
      }
    }

    // 为 merged 品牌附加合并目标品牌名称
    const mergedBrands = brands.filter(
      (b) => b.status === 'merged' && b.mergedIntoId,
    );
    if (mergedBrands.length > 0) {
      const targetIds = [...new Set(mergedBrands.map((b) => b.mergedIntoId))];
      const targets = await this.brandRepository.findBy({ id: In(targetIds) });
      const targetMap = new Map(targets.map((t) => [t.id, t.name]));
      for (const brand of mergedBrands) {
        (brand as any).mergedIntoName =
          targetMap.get(brand.mergedIntoId) || null;
      }
    }

    const page = query.page || 1;
    return {
      data: brands,
      meta: {
        total,
        page: limit > 0 ? page : 1,
        limit: limit > 0 ? limit : total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
    };
  }

  /**
   * 查询单个品牌（包含商品数量）
   */
  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .where('brand.id = :id', { id })
      .getOne();

    if (!brand) {
      throw new NotFoundException(`Brand ID ${id} not found`);
    }
    return brand;
  }

  /**
   * 根据 slug 查询品牌
   */
  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .where('brand.slug = :slug', { slug })
      .getOne();

    if (!brand) {
      throw new NotFoundException(`Brand slug "${slug}" not found`);
    }
    return brand;
  }

  /**
   * 获取品牌的子品牌列表
   */
  async findChildren(parentId: string): Promise<Brand[]> {
    return this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .where('brand.parentId = :parentId', { parentId })
      .orderBy(
        'CASE WHEN brand.tier = 1 THEN 1 WHEN brand.tier = 2 THEN 2 ELSE 3 END',
        'ASC',
      )
      .addOrderBy('brand.name', 'ASC')
      .getMany();
  }

  /**
   * 获取品牌及其子品牌
   */
  async findOneWithChildren(id: string): Promise<Brand> {
    const brand = await this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .leftJoinAndSelect('brand.children', 'children')
      .leftJoinAndSelect('brand.parent', 'parent')
      .where('brand.id = :id', { id })
      .getOne();

    if (!brand) {
      throw new NotFoundException(`Brand ID ${id} not found`);
    }
    return brand;
  }

  /**
   * 获取顶级品牌
   */
  async findTopLevel(): Promise<Brand[]> {
    return this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .where('brand.parentId IS NULL')
      .andWhere('brand.status = :status', { status: 'active' })
      .orderBy(
        'CASE WHEN brand.tier = 1 THEN 1 WHEN brand.tier = 2 THEN 2 ELSE 3 END',
        'ASC',
      )
      .addOrderBy('brand.name', 'ASC')
      .getMany();
  }

  /**
   * 获取品牌按分类分组
   * 基于商品的主分类动态计算
   */
  async findByCategory(): Promise<
    Array<{
      category: { id: string; name: string; slug: string };
      brands: Brand[];
    }>
  > {
    // 查询每个品牌及其商品的主分类
    const result = await this.brandRepository
      .createQueryBuilder('brand')
      .select([
        'brand.id',
        'brand.name',
        'brand.slug',
        'brand.logoUrl',
        'brand.tier',
        'category.id',
        'category.name',
        'category.slug',
      ])
      .innerJoin('brand.products', 'product')
      .innerJoin('product.primaryCategory', 'category')
      .where('brand.status = :status', { status: 'active' })
      .groupBy(
        'brand.id, brand.name, brand.slug, brand.logoUrl, brand.tier, category.id, category.name, category.slug',
      )
      .getRawMany();

    // 按分类分组
    const categoryMap = new Map<
      string,
      {
        category: { id: string; name: string; slug: string };
        brandsMap: Map<string, Brand>;
      }
    >();

    for (const row of result) {
      const categoryId = row.category_id;
      const categoryName = row.category_name;
      const categorySlug = row.category_slug;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          category: { id: categoryId, name: categoryName, slug: categorySlug },
          brandsMap: new Map(),
        });
      }

      const brandId = row.brand_id;
      if (!categoryMap.get(categoryId)!.brandsMap.has(brandId)) {
        categoryMap.get(categoryId)!.brandsMap.set(brandId, {
          id: brandId,
          name: row.brand_name,
          slug: row.brand_slug,
          logoUrl: row.brand_logoUrl,
          tier: row.brand_tier,
        } as Brand);
      }
    }

    // 转换为数组并排序
    const categories = Array.from(categoryMap.values()).map((item) => ({
      category: item.category,
      brands: Array.from(item.brandsMap.values()).sort((a, b) => {
        // 先按 tier 排序，再按名称排序
        const tierA = a.tier || 99;
        const tierB = b.tier || 99;
        if (tierA !== tierB) return tierA - tierB;
        return a.name.localeCompare(b.name);
      }),
    }));

    // 按分类名称排序
    categories.sort((a, b) => a.category.name.localeCompare(b.category.name));

    return categories;
  }

  /**
   * 获取品牌下商品所属的分类列表（按商品数降序）
   */
  async findCategoriesByBrandSlug(slug: string): Promise<
    Array<{
      id: string;
      name: string;
      nameEn: string;
      slug: string;
      translations: Record<string, unknown> | null;
      productCount: number;
    }>
  > {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select([
        'category.id AS id',
        'category.name AS name',
        'category."nameEn" AS "nameEn"',
        'category.slug AS slug',
        'category.translations AS translations',
        'COUNT(product.id) AS "productCount"',
      ])
      .innerJoin('product.primaryCategory', 'category')
      .innerJoin('product.brand', 'brand')
      .where('brand.slug = :slug', { slug })
      .andWhere('product.status = :status', { status: 'active' })
      .andWhere('brand.status = :brandStatus', { brandStatus: 'active' })
      .groupBy(
        'category.id, category.name, category."nameEn", category.slug, category.translations',
      )
      .orderBy('"productCount"', 'DESC')
      .getRawMany();

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      nameEn: row.nameEn,
      slug: row.slug,
      translations: row.translations,
      productCount: parseInt(row.productCount, 10),
    }));
  }

  /**
   * 获取同分类下的相关品牌（排除自身，按商品数降序）
   */
  async findRelatedBrands(slug: string, limit: number = 8): Promise<Brand[]> {
    const brand = await this.findBySlug(slug);

    // 找到该品牌商品最多的分类
    const topCategory = await this.productRepository
      .createQueryBuilder('product')
      .select('product.primaryCategoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('product.brandId = :brandId', { brandId: brand.id })
      .andWhere('product.status = :status', { status: 'active' })
      .andWhere('product.primaryCategoryId IS NOT NULL')
      .groupBy('product.primaryCategoryId')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    if (!topCategory) return [];

    // 找到该分类下的其他热门品牌
    return this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .innerJoin('brand.products', 'product')
      .where('product.primaryCategoryId = :categoryId', {
        categoryId: topCategory.categoryId,
      })
      .andWhere('brand.slug != :slug', { slug })
      .andWhere('brand.status = :brandStatus', { brandStatus: 'active' })
      .andWhere('product.status = :productStatus', { productStatus: 'active' })
      .groupBy('brand.id')
      .orderBy('COUNT(product.id)', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * 获取所有活跃品牌的 slugs（用于 Sitemap 生成）
   */
  async getAllSlugs(): Promise<{ slugs: string[] }> {
    const brands = await this.brandRepository.find({
      where: { status: 'active' },
      select: ['slug'],
      order: { name: 'ASC' },
    });
    return { slugs: brands.map((b) => b.slug) };
  }

  /**
   * 搜索品牌（用于搜索建议功能）
   */
  async search(
    query: string,
    limit: number = 5,
    includePending: boolean = false,
  ): Promise<Brand[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const qb = this.brandRepository
      .createQueryBuilder('brand')
      .loadRelationCountAndMap(
        'brand.productCount',
        'brand.products',
        'activeProducts',
        (sqb) =>
          sqb.andWhere('activeProducts.status = :productStatus', {
            productStatus: 'active',
          }),
      )
      .where('LOWER(brand.name) LIKE LOWER(:query)', { query: `%${query}%` });

    if (!includePending) {
      qb.andWhere('brand.status IN (:...statuses)', {
        statuses: ['active', 'merged', 'rejected'],
      });
    }

    qb.orderBy(
      'CASE WHEN brand.tier = 1 THEN 1 WHEN brand.tier = 2 THEN 2 ELSE 3 END',
      'ASC',
    ).addOrderBy('brand.name', 'ASC');

    const brands = await qb.take(limit * 3).getMany();

    const queryLower = query.toLowerCase();
    const matchedBrands = brands.filter((brand) => {
      const nameMatch = brand.name.toLowerCase().includes(queryLower);
      const aliasMatch = brand.aliases?.some((alias) =>
        alias.toLowerCase().includes(queryLower),
      );
      return (nameMatch || aliasMatch) && (brand as any).productCount > 0;
    });

    return matchedBrands.slice(0, limit);
  }

  // ========== 委托方法 ==========

  /**
   * 获取待审核品牌列表 (委托给 BrandReviewService)
   */
  async findPending(): Promise<Brand[]> {
    return this.reviewService.findPending();
  }

  /**
   * 批准品牌 (委托给 BrandReviewService)
   */
  async approve(id: string, reviewedBy?: string): Promise<Brand> {
    return this.reviewService.approve(id, reviewedBy);
  }

  /**
   * 拒绝品牌 (委托给 BrandReviewService)
   */
  async reject(
    id: string,
    reviewedBy?: string,
    reason?: string,
  ): Promise<Brand> {
    return this.reviewService.reject(id, reviewedBy, reason);
  }

  /**
   * 合并品牌 (委托给 BrandMatchService)
   */
  async merge(sourceId: string, targetId: string): Promise<Brand> {
    return this.matchService.merge(sourceId, targetId);
  }

  /**
   * 根据名称或别名查找品牌 (委托给 BrandMatchService)
   */
  async findByNameOrAlias(name: string): Promise<Brand | null> {
    return this.matchService.findByNameOrAlias(name);
  }

  /**
   * 通过品牌名匹配已有品牌 (委托给 BrandMatchService)
   * 兼容保留原方法名：未命中时不会自动创建正式品牌，而是进入候选池
   */
  async findOrCreateByName(
    name: string,
    aiConfidence?: number,
  ): Promise<Brand | null> {
    const brand = await this.matchService.findOrCreateByName(
      name,
      aiConfidence,
    );

    // 历史自动创建品牌仍可在首次命中时补抓 Logo
    if (
      brand &&
      !brand.logoUrl &&
      brand.metadata?.aiSource === 'auto-created'
    ) {
      try {
        const { logoUrl } = await this.fetchBrandLogo(brand.name);
        if (logoUrl) {
          await this.brandRepository.update(brand.id, { logoUrl });
          brand.logoUrl = logoUrl;
        }
      } catch {
        // Logo 获取失败不影响品牌创建
      }
    }

    return brand;
  }

  /**
   * 获取所有品牌的简单列表 (委托给 BrandMatchService)
   */
  async findAllSimple(): Promise<Array<{ name: string; aliases?: string[] }>> {
    return this.matchService.findAllSimple();
  }

  /**
   * 获取 AI 品牌闭集候选（仅标准品牌，不含别名）
   */
  async findActivePromptBrands(): Promise<
    Array<{ id: string; name: string; slug: string }>
  > {
    return this.brandRepository.find({
      where: {
        status: 'active',
        governanceStatus: 'approved',
      },
      select: ['id', 'name', 'slug'],
      order: { name: 'ASC' },
    });
  }

  /**
   * 通过 ID 查找活跃且已批准的品牌
   */
  async findActiveApprovedBrandById(id: string): Promise<Brand | null> {
    if (!id?.trim()) {
      return null;
    }

    return this.brandRepository.findOne({
      where: {
        id,
        status: 'active',
        governanceStatus: 'approved',
      },
    });
  }

  /**
   * 通过标准品牌名精确查找活跃且已批准的品牌
   */
  async findActiveApprovedBrandByExactName(
    name: string,
  ): Promise<Brand | null> {
    const normalizedName = name?.trim().toLowerCase();
    if (!normalizedName) {
      return null;
    }

    return this.brandRepository
      .createQueryBuilder('brand')
      .where('LOWER(brand.name) = :name', { name: normalizedName })
      .andWhere('brand.status = :status', { status: 'active' })
      .andWhere('brand.governanceStatus = :governanceStatus', {
        governanceStatus: 'approved',
      })
      .getOne();
  }

  /**
   * 获取 Design 兜底品牌
   */
  async findDesignFallbackBrand(): Promise<Brand | null> {
    return this.brandRepository.findOne({
      where: {
        slug: 'design',
        status: 'active',
        governanceStatus: 'approved',
      },
    });
  }

  /**
   * 生成别名 (委托给 BrandMatchService)
   */
  generateAliases(name: string): string[] {
    return this.matchService.generateAliases(name);
  }

  /**
   * 获取品牌 Logo
   * 策略优先级：
   * 1. 品牌官网抓取（og:image / apple-touch-icon / favicon）
   * 2. Wikipedia API（搜索品牌页面的 logo 图片）
   */
  async fetchBrandLogo(
    brandName: string,
  ): Promise<{ logoUrl: string | null; source: string }> {
    if (!brandName) {
      return { logoUrl: null, source: 'none' };
    }

    const nameLower = brandName.toLowerCase().trim();

    // 知名品牌域名映射
    const brandDomainMap: Record<string, string> = {
      nike: 'nike.com',
      adidas: 'adidas.com',
      jordan: 'nike.com',
      'new balance': 'newbalance.com',
      puma: 'puma.com',
      reebok: 'reebok.com',
      converse: 'converse.com',
      vans: 'vans.com',
      'under armour': 'underarmour.com',
      asics: 'asics.com',
      gucci: 'gucci.com',
      'louis vuitton': 'louisvuitton.com',
      lv: 'louisvuitton.com',
      chanel: 'chanel.com',
      prada: 'prada.com',
      hermes: 'hermes.com',
      dior: 'dior.com',
      burberry: 'burberry.com',
      balenciaga: 'balenciaga.com',
      'bottega veneta': 'bottegaveneta.com',
      fendi: 'fendi.com',
      versace: 'versace.com',
      givenchy: 'givenchy.com',
      valentino: 'valentino.com',
      'saint laurent': 'ysl.com',
      ysl: 'ysl.com',
      celine: 'celine.com',
      loewe: 'loewe.com',
      'alexander mcqueen': 'alexandermcqueen.com',
      'off-white': 'off---white.com',
      bape: 'bape.com',
      'a bathing ape': 'bape.com',
      zara: 'zara.com',
      'h&m': 'hm.com',
      uniqlo: 'uniqlo.com',
      gap: 'gap.com',
      'ralph lauren': 'ralphlauren.com',
      'calvin klein': 'calvinklein.com',
      'tommy hilfiger': 'tommy.com',
      'michael kors': 'michaelkors.com',
      coach: 'coach.com',
      'kate spade': 'katespade.com',
      supreme: 'supremenewyork.com',
      stussy: 'stussy.com',
      'the north face': 'thenorthface.com',
      patagonia: 'patagonia.com',
      carhartt: 'carhartt.com',
    };

    // 策略1: Wikipedia API（最可靠，大多数知名品牌都有 logo）
    try {
      const wikiResult = await this.fetchLogoFromWikipedia(
        brandName,
        nameLower,
      );
      if (wikiResult) {
        return wikiResult;
      }
    } catch (err) {
      this.logger.debug(`Wikipedia 获取失败: ${err?.message || err}`);
    }

    // 策略2: 品牌官网抓取（Wikipedia 无结果时回退，超时缩短到 5 秒）
    const knownDomain = brandDomainMap[nameLower];
    const candidateDomains = knownDomain
      ? [knownDomain]
      : [
          `${nameLower.replace(/[^a-z0-9]/g, '')}.com`,
          `${nameLower.replace(/\s+/g, '-')}.com`,
        ];

    for (const domain of candidateDomains) {
      try {
        const { data: html } = await axios.get(`https://${domain}`, {
          timeout: 5000,
          maxRedirects: 3,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          responseType: 'text',
        });

        if (typeof html === 'string') {
          const logoSrcUrl = this.parseBestLogoUrl(html, domain);
          if (logoSrcUrl) {
            const localUrl = await this.downloadAndSaveLogo(
              logoSrcUrl,
              nameLower,
            );
            if (localUrl) {
              return { logoUrl: localUrl, source: domain };
            }
          }
        }
      } catch (err) {
        this.logger.debug(`官网抓取失败 ${domain}: ${err?.message || err}`);
      }
    }

    return { logoUrl: null, source: 'not_found' };
  }

  /**
   * 从 Wikipedia 获取品牌 Logo
   * 通过 MediaWiki API 搜索品牌页面，筛选含 "logo" 的图片文件
   */
  private async fetchLogoFromWikipedia(
    brandName: string,
    brandSlug: string,
  ): Promise<{ logoUrl: string; source: string } | null> {
    const wikiApi = 'https://en.wikipedia.org/w/api.php';

    // Wikipedia 页面标题映射（部分品牌的 Wiki 页面标题与品牌名不同）
    const wikiTitleMap: Record<string, string> = {
      nike: 'Nike,_Inc.',
      lv: 'Louis_Vuitton',
      'h&m': 'H%26M',
      ysl: 'Yves_Saint_Laurent_(brand)',
      'saint laurent': 'Yves_Saint_Laurent_(brand)',
      gap: 'Gap_Inc.',
      'the north face': 'The_North_Face',
    };

    const nameLower = brandName.toLowerCase().trim();
    const wikiTitle = wikiTitleMap[nameLower] || brandName.replace(/\s+/g, '_');

    // Step 1: 获取页面所有图片
    const imagesRes = await axios.get(wikiApi, {
      params: {
        action: 'query',
        titles: wikiTitle,
        prop: 'images',
        format: 'json',
        imlimit: 50,
      },
      timeout: 8000,
    });

    const pages = imagesRes.data?.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // 页面不存在

    const images: Array<{ title: string }> = pages[pageId].images || [];

    // Step 2: 筛选含 "logo" 的图片（排除通用图标如 Commons-logo）
    const logoImages = images.filter((img) => {
      const t = img.title.toLowerCase();
      return (
        (t.includes('logo') || t.includes('monogram')) &&
        !t.includes('commons-logo') &&
        !t.includes('wikidata-logo') &&
        !t.includes('wikiquote') &&
        (t.endsWith('.svg') || t.endsWith('.png') || t.endsWith('.jpg'))
      );
    });

    if (logoImages.length === 0) return null;

    // Step 3: 获取最佳 logo 的缩略图 URL（优先 svg，其次 png）
    const preferred =
      logoImages.find((img) => img.title.toLowerCase().endsWith('.svg')) ||
      logoImages[0];

    const infoRes = await axios.get(wikiApi, {
      params: {
        action: 'query',
        titles: preferred.title,
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: 500,
        format: 'json',
      },
      timeout: 8000,
    });

    const infoPages = infoRes.data?.query?.pages;
    if (!infoPages) return null;

    const infoPageId = Object.keys(infoPages)[0];
    const imageInfo = infoPages[infoPageId]?.imageinfo?.[0];
    const thumbUrl = imageInfo?.thumburl || imageInfo?.url;
    if (!thumbUrl) return null;

    // Step 4: 下载并保存
    const localUrl = await this.downloadAndSaveLogo(thumbUrl, brandSlug);
    if (localUrl) {
      return { logoUrl: localUrl, source: 'wikipedia' };
    }

    return null;
  }

  /**
   * 从 HTML 中解析最佳 Logo 图片 URL
   * 优先级：og:image > apple-touch-icon > 最大 favicon
   */
  private parseBestLogoUrl(html: string, domain: string): string | null {
    const baseUrl = `https://${domain}`;

    const toAbsolute = (href: string): string => {
      if (!href) return '';
      if (href.startsWith('http')) return href;
      if (href.startsWith('//')) return `https:${href}`;
      if (href.startsWith('/')) return `${baseUrl}${href}`;
      return `${baseUrl}/${href}`;
    };

    // 1. og:image - 通常是高质量品牌图片
    const ogMatch =
      html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      );
    if (ogMatch?.[1]) {
      return toAbsolute(ogMatch[1]);
    }

    // 2. apple-touch-icon (通常 180x180)
    const appleIconMatch = html.match(
      /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    );
    if (appleIconMatch?.[1]) {
      return toAbsolute(appleIconMatch[1]);
    }

    // 3. 最大尺寸的 favicon
    const iconRegex = /<link[^>]*rel=["']icon["'][^>]*>/gi;
    let bestIcon: { url: string; size: number } | null = null;
    let iconMatch: RegExpExecArray | null;

    while ((iconMatch = iconRegex.exec(html)) !== null) {
      const tag = iconMatch[0];
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      const sizesMatch = tag.match(/sizes=["'](\d+)x\d+["']/i);

      if (hrefMatch?.[1]) {
        const size = sizesMatch ? parseInt(sizesMatch[1], 10) : 16;
        if (!bestIcon || size > bestIcon.size) {
          bestIcon = { url: toAbsolute(hrefMatch[1]), size };
        }
      }
    }

    if (bestIcon && bestIcon.size >= 64) {
      return bestIcon.url;
    }

    return null;
  }

  /**
   * 下载远程图片并保存到本地 uploads 目录
   */
  private async downloadAndSaveLogo(
    imageUrl: string,
    brandSlug: string,
  ): Promise<string | null> {
    try {
      // SSRF 防护：验证 URL 不指向私有/保留 IP
      await validateUrlForSSRF(imageUrl);

      const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
      const response = await axios.get(imageUrl, {
        timeout: 10000,
        responseType: 'arraybuffer',
        maxRedirects: 5,
        maxContentLength: MAX_LOGO_SIZE,
        maxBodyLength: MAX_LOGO_SIZE,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'image/*',
        },
      });

      const buffer = Buffer.from(response.data);

      // 验证是有效图片（检查 magic bytes）
      if (buffer.length < 100) return null;
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8;
      const isWebP =
        buffer.slice(0, 4).toString() === 'RIFF' &&
        buffer.slice(8, 12).toString() === 'WEBP';
      if (!isPNG && !isJPEG && !isWebP) return null;

      const ext = isPNG ? '.png' : isJPEG ? '.jpg' : '.webp';
      const filename = `brand-${brandSlug}-${Date.now()}${ext}`;

      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.writeFile(path.join(uploadDir, filename), buffer);

      const apiUrl =
        this.configService.get<string>('API_URL') || 'http://localhost:4101';
      return `${apiUrl}/uploads/${filename}`;
    } catch (err) {
      this.logger.debug(`下载 Logo 失败: ${imageUrl} - ${err?.message || err}`);
      return null;
    }
  }

  // ========== Logo 批量补全 ==========

  /**
   * 为所有缺少 Logo 的活跃品牌批量获取 Logo
   */
  async backfillLogos(): Promise<{
    total: number;
    updated: number;
    failed: number;
    results: Array<{ name: string; status: string; logoUrl?: string }>;
  }> {
    const brands = await this.brandRepository.find({
      where: { status: 'active', logoUrl: IsNull() },
      select: ['id', 'name'],
    });

    if (brands.length === 0) {
      return { total: 0, updated: 0, failed: 0, results: [] };
    }

    this.logger.log(`开始为 ${brands.length} 个品牌获取 Logo`);

    let updated = 0;
    let failed = 0;
    const results: Array<{ name: string; status: string; logoUrl?: string }> =
      [];

    // 每批 5 个并发，避免对外部 API 造成过大压力
    const CONCURRENCY = 5;
    for (let i = 0; i < brands.length; i += CONCURRENCY) {
      const batch = brands.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (brand) => {
          try {
            const { logoUrl } = await this.fetchBrandLogo(brand.name);
            if (logoUrl) {
              await this.brandRepository.update(brand.id, { logoUrl });
              updated++;
              results.push({ name: brand.name, status: 'ok', logoUrl });
              this.logger.log(`✓ ${brand.name} → ${logoUrl}`);
            } else {
              failed++;
              results.push({ name: brand.name, status: 'not_found' });
              this.logger.warn(`✗ ${brand.name} → Logo 未找到`);
            }
          } catch {
            failed++;
            results.push({ name: brand.name, status: 'error' });
          }
        }),
      );
    }

    this.logger.log(`Logo 补全完成: ${updated} 成功, ${failed} 失败`);
    return { total: brands.length, updated, failed, results };
  }

  // ========== 品牌补建 ==========

  /**
   * 扫描历史遗留的 aiBrandName/brandId 脱钩商品，尝试补绑正式品牌
   * 该入口主要处理旧数据，未命中的品牌仍按兼容逻辑进入候选池
   */
  async backfillBrands(): Promise<{
    scannedProducts: number;
    uniqueBrands: number;
    createdBrands: number;
    linkedProducts: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 查找所有有 aiBrandName 但没有 brandId 的产品
    const products = await this.productRepository.find({
      where: {
        aiBrandName: Not(IsNull()),
        brandId: IsNull(),
      },
      select: ['id', 'aiBrandName'],
    });

    if (products.length === 0) {
      this.logger.log('没有需要回填品牌的历史遗留产品');
      return {
        scannedProducts: 0,
        uniqueBrands: 0,
        createdBrands: 0,
        linkedProducts: 0,
        errors: [],
      };
    }

    // 按品牌名分组
    const brandGroups = new Map<string, string[]>();
    for (const product of products) {
      const brandName = product.aiBrandName.trim();
      if (!brandName) continue;
      const ids = brandGroups.get(brandName) || [];
      ids.push(product.id);
      brandGroups.set(brandName, ids);
    }

    this.logger.log(
      `发现 ${products.length} 个产品缺少品牌关联，涉及 ${brandGroups.size} 个不同品牌`,
    );

    let createdBrands = 0;
    let linkedProducts = 0;

    for (const [brandName, productIds] of brandGroups) {
      try {
        const brand = await this.matchService.findOrCreateByName(brandName);
        if (!brand) {
          errors.push(`品牌创建返回 null: ${brandName}`);
          continue;
        }

        // 检查是否是新创建的（通过 metadata.aiSource 判断）
        if (
          brand.metadata?.aiSource === 'auto-created' &&
          brand.createdAt.getTime() > Date.now() - 5000
        ) {
          createdBrands++;
        }

        // 批量更新产品的 brandId
        await this.productRepository.update(productIds, { brandId: brand.id });
        linkedProducts += productIds.length;

        this.logger.log(
          `品牌 "${brandName}" (${brand.id}) 关联了 ${productIds.length} 个产品`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`品牌 "${brandName}" 处理失败: ${message}`);
        this.logger.error(`品牌补建失败: ${brandName}`, message);
      }
    }

    const result = {
      scannedProducts: products.length,
      uniqueBrands: brandGroups.size,
      createdBrands,
      linkedProducts,
      errors,
    };

    this.logger.log(`品牌补建完成: ${JSON.stringify(result)}`);
    return result;
  }
}
