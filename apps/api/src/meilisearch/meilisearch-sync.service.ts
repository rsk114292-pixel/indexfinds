import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource } from 'typeorm';
import type { RecordAny } from 'meilisearch';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { MeilisearchService } from './meilisearch.service';
import { MeilisearchIndexService } from './meilisearch-index.service';
import {
  MEILI_SYNC_BATCH_SIZE,
  MEILI_TASK_WAIT_OPTIONS,
} from './meilisearch.constants';
import { ProductStatus } from '../products/product-status';

export interface MeilisearchProduct {
  id: string;
  title: string;
  originalTitle: string;
  description: string;
  brandName: string;
  aiBrandName: string;
  categoryName: string;
  status: string;
  brandSlug: string;
  allCategorySlugs: string[];
  colors: string[];
  styles: string[];
  genders: string[];
  occasions: string[];
  seasons: string[];
  priceMin: number;
  priceMax: number;
  isFeatured: boolean;
  featuredSort: number;
  hasVariants: boolean;
  createdAt: number;
  viewCount: number;
  salesCount: number;
  ctr: number;
  popularityScore: number;
  slug: string;
  mainImage: string;
  images: string[];
  currency: string;
  brand: { id: string; name: string; slug: string } | null;
  primaryCategory: { id: string; name: string; slug: string } | null;
  hasEmbedding: boolean;
}

@Injectable()
export class MeilisearchSyncService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchSyncService.name);
  private lastSyncTime: Date = new Date(0);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly meilisearchService: MeilisearchService,
    private readonly indexService: MeilisearchIndexService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // 确保索引存在且配置（sortableAttributes 等）最新
    try {
      await this.indexService.ensureIndex();
    } catch (error) {
      this.logger.warn(`Failed to ensure MeiliSearch index: ${error.message}`);
    }

    // 从 DB 加载最近更新时间，避免重启后全量补偿同步
    try {
      const result = await this.productRepository
        .createQueryBuilder('product')
        .select('MAX(product.updatedAt)', 'maxUpdatedAt')
        .getRawOne();
      if (result?.maxUpdatedAt) {
        this.lastSyncTime = new Date(result.maxUpdatedAt);
        this.logger.log(
          `Compensation sync initialized: lastSyncTime=${this.lastSyncTime.toISOString()}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to initialize lastSyncTime from DB, using epoch: ${error.message}`,
      );
    }
  }

  /**
   * Full sync: rebuild entire index using swap-indexes for zero downtime.
   */
  async fullSync(): Promise<{ total: number; synced: number }> {
    this.logger.log('Starting full sync...');

    const tmpUid = await this.indexService.createTempIndex();
    const client = this.meilisearchService.getClient();
    const tmpIndex = client.index(tmpUid);

    let offset = 0;
    let synced = 0;

    while (true) {
      const products = await this.loadProductBatch(
        offset,
        MEILI_SYNC_BATCH_SIZE,
      );
      if (products.length === 0) break;

      const documents = await this.transformBatch(products);
      if (documents.length > 0) {
        await tmpIndex
          .addDocuments(documents as unknown as RecordAny[])
          .waitTask(MEILI_TASK_WAIT_OPTIONS);
        synced += documents.length;
      }

      offset += MEILI_SYNC_BATCH_SIZE;
      this.logger.log(`Full sync progress: ${synced} documents indexed`);
    }

    await this.indexService.swapAndCleanup(tmpUid);
    this.lastSyncTime = new Date();

    this.logger.log(`Full sync completed: ${synced} documents`);
    return { total: synced, synced };
  }

  /**
   * Sync a single product by ID (for create/update events).
   */
  async syncProduct(productId: string): Promise<void> {
    const product = await this.loadProductWithRelations(productId);
    if (!product) {
      this.logger.warn(`Product ${productId} not found, skipping sync`);
      return;
    }

    if (product.status !== ProductStatus.ACTIVE) {
      await this.removeProduct(productId);
      return;
    }

    const doc = await this.transformProduct(product);
    await this.meilisearchService.updateDocuments([
      doc as unknown as RecordAny,
    ]);
  }

  /**
   * Remove a product from the index (for delete events).
   */
  async removeProduct(productId: string): Promise<void> {
    await this.meilisearchService.deleteDocument(productId);
  }

  /**
   * Sync all products belonging to a brand (when brand info changes).
   */
  async syncProductsByBrand(brandId: string): Promise<void> {
    const products = await this.productRepository.find({
      where: { brandId },
      select: ['id'],
    });

    for (const { id } of products) {
      await this.syncProduct(id);
    }

    this.logger.log(
      `Brand ${brandId} change: synced ${products.length} products`,
    );
  }

  /**
   * Sync all products belonging to a category (when category info changes).
   */
  async syncProductsByCategory(categoryId: string): Promise<void> {
    // Products with this as primary category
    const primary = await this.productRepository.find({
      where: { primaryCategoryId: categoryId },
      select: ['id'],
    });

    // Products with this as secondary category
    const secondary = await this.productRepository
      .createQueryBuilder('p')
      .select('p.id')
      .innerJoin('p.secondaryCategories', 'sc', 'sc.id = :catId', {
        catId: categoryId,
      })
      .getMany();

    const allIds = new Set([
      ...primary.map((p) => p.id),
      ...secondary.map((p) => p.id),
    ]);

    for (const id of allIds) {
      await this.syncProduct(id);
    }

    this.logger.log(
      `Category ${categoryId} change: synced ${allIds.size} products`,
    );
  }

  /**
   * Compensation: sync products modified since last sync (runs every 5 minutes).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncModifiedSince(): Promise<void> {
    const since = this.lastSyncTime;
    // 先查询再推进游标，避免竞态：查询期间被修改的商品不会被漏掉
    const syncStartTime = new Date();

    const products = await this.productRepository.find({
      where: { updatedAt: MoreThanOrEqual(since) },
      select: ['id'],
    });

    if (products.length === 0) {
      this.lastSyncTime = syncStartTime;
      return;
    }

    for (const { id } of products) {
      try {
        await this.syncProduct(id);
      } catch (error) {
        this.logger.error(
          `Compensation sync failed for ${id}: ${error.message}`,
        );
      }
    }

    // 同步完成后才推进游标
    this.lastSyncTime = syncStartTime;
    this.logger.log(
      `Compensation sync: ${products.length} products since ${since.toISOString()}`,
    );
  }

  // ===== Internal helpers =====

  private async loadProductBatch(
    offset: number,
    limit: number,
  ): Promise<Product[]> {
    return this.productRepository.find({
      where: { status: ProductStatus.ACTIVE },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
      order: { createdAt: 'ASC' },
      skip: offset,
      take: limit,
    });
  }

  private async loadProductWithRelations(
    productId: string,
  ): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id: productId },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });
  }

  private async transformBatch(
    products: Product[],
  ): Promise<MeilisearchProduct[]> {
    const docs: MeilisearchProduct[] = [];
    for (const product of products) {
      try {
        docs.push(await this.transformProduct(product));
      } catch (error) {
        this.logger.error(
          `Transform failed for product ${product.id}: ${error.message}`,
        );
      }
    }
    return docs;
  }

  async transformProduct(product: Product): Promise<MeilisearchProduct> {
    // Compute allCategorySlugs: primary + secondary + all ancestors
    const allCategorySlugs = await this.computeAllCategorySlugs(product);

    // Read attributes from product_attribute_values join table
    const attributes = await this.loadProductAttributes(product.id);

    // Check if product has embedding
    const embeddingResult = await this.dataSource.query(
      `SELECT 1 FROM product_image_embeddings WHERE product_id = $1 AND embedding IS NOT NULL LIMIT 1`,
      [product.id],
    );
    const hasEmbedding = embeddingResult.length > 0;

    return {
      id: product.id,
      title: product.title || '',
      originalTitle: product.originalTitle || '',
      description: this.stripHtml(product.description || ''),
      brandName: product.brand?.name || '',
      aiBrandName: product.aiBrandName || '',
      categoryName: product.primaryCategory?.name || '',
      status: product.status,
      brandSlug: product.brand?.slug || '',
      allCategorySlugs,
      colors: attributes.colors,
      styles: attributes.styles,
      genders:
        attributes.genders.length > 0
          ? attributes.genders
          : product.aiAttributes?.gender
            ? [product.aiAttributes.gender]
            : [],
      occasions: attributes.occasions,
      seasons: attributes.seasons,
      priceMin: Number(product.priceMin) || 0,
      priceMax: Number(product.priceMax) || 0,
      isFeatured: product.isFeatured,
      featuredSort: product.featuredSort || 0,
      hasVariants: product.hasVariants,
      createdAt: product.createdAt ? new Date(product.createdAt).getTime() : 0,
      viewCount: product.viewCount || 0,
      salesCount: product.salesCount || 0,
      ctr: Number(product.ctr) || 0,
      popularityScore: Number(product.popularityScore) || 0,
      slug: product.slug,
      mainImage: product.mainImage || '',
      images: Array.isArray(product.images) ? product.images : [],
      currency: product.currency || 'CNY',
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
          }
        : null,
      primaryCategory: product.primaryCategory
        ? {
            id: product.primaryCategory.id,
            name: product.primaryCategory.name,
            slug: product.primaryCategory.slug,
          }
        : null,
      hasEmbedding,
    };
  }

  private async computeAllCategorySlugs(product: Product): Promise<string[]> {
    const slugs = new Set<string>();

    // Gather all category IDs (primary + secondary)
    const categories: Category[] = [];
    if (product.primaryCategory) categories.push(product.primaryCategory);
    if (product.secondaryCategories)
      categories.push(...product.secondaryCategories);

    for (const cat of categories) {
      slugs.add(cat.slug);
      // Get ancestors using TreeRepository
      try {
        const ancestors = await this.categoryRepository.manager
          .getTreeRepository(Category)
          .findAncestors(cat);
        for (const ancestor of ancestors) {
          slugs.add(ancestor.slug);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get ancestors for category ${cat.id}: ${error.message}`,
        );
      }
    }

    return [...slugs];
  }

  private async loadProductAttributes(productId: string): Promise<{
    colors: string[];
    styles: string[];
    genders: string[];
    occasions: string[];
    seasons: string[];
  }> {
    const rows: Array<{ value: string; attr_name: string }> =
      await this.productRepository.manager.query(
        `SELECT av.value, a.name AS attr_name
         FROM product_attribute_values pav
         JOIN attribute_values av ON av.id = pav.attribute_value_id
         JOIN attributes a ON a.id = av.attribute_id
         WHERE pav.product_id = $1`,
        [productId],
      );

    const result = {
      colors: [] as string[],
      styles: [] as string[],
      genders: [] as string[],
      occasions: [] as string[],
      seasons: [] as string[],
    };

    // DB stores singular names (color, style, etc.), map to plural keys
    const nameToKey: Record<string, keyof typeof result> = {
      color: 'colors',
      style: 'styles',
      gender: 'genders',
      occasion: 'occasions',
      season: 'seasons',
    };

    for (const row of rows) {
      const key = nameToKey[row.attr_name];
      if (key) {
        result[key].push(row.value);
      }
    }

    return result;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
