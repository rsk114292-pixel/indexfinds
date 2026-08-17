import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import {
  ImportFromWeidianDto,
  ImportFromWeidianResultDto,
} from './dto/import-from-weidian.dto';
import { BrandsService } from '../brands/brands.service';
import { BrandGovernanceService } from '../brands/brand-governance.service';
import { CategoriesService } from '../categories/categories.service';
import { generateUniqueProductSlug } from '../utils/slug';
import { ProductStatus, ProductStatusAction } from './product-status';
import { ProductStatusService } from './product-status.service';
import { ProductSkuService } from './product-sku.service';
import { ProductImportService } from './product-import.service';
import { ProductQueryService } from './product-query.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateFromBatchItemInput } from '../batch/types/batch-data.types';
import {
  ProductEvents,
  ProductDeletedEvent,
} from '../shared/events/product.events';
import { PointsEvents } from '../points/points.events';
import type { EarnPointsRequestEvent } from '../points/points.events';
import { AttributesService } from '../attributes/attributes.service';
import { AttributeValidatorService } from '../attributes/attribute-validator.service';
import { correctBrandByTitle } from '../brands/brand-correction';
import {
  ProductQcMedia,
  ProductQcMediaType,
} from './entities/product-qc-media.entity';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';
import {
  ProductInteractionEvent,
  ProductInteractionEventType,
} from './entities/product-interaction-event.entity';
import type { BatchTargetScope } from './dto/status-action.dto';
import { assertProductPublicationQuality } from './product-publication-quality';

type ProductInteractionAbuseBucket = {
  expiresAt: number;
  eventCount: number;
  productIds: Set<string>;
};

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'driverError' in error &&
    (error as { driverError?: { code?: string } }).driverError?.code === '23503'
  );
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly productInteractionAbuseWindowMs = 60 * 1000;
  private readonly maxInteractionProductsPerVisitorWindow = 18;
  private readonly maxInteractionEventsPerIpWindow = 120;
  private readonly productInteractionAbuseByVisitor = new Map<
    string,
    ProductInteractionAbuseBucket
  >();
  private readonly productInteractionAbuseByIp = new Map<
    string,
    ProductInteractionAbuseBucket
  >();

  private async resolveBatchTargetIds(
    ids: string[],
    scope: BatchTargetScope = 'selected',
  ): Promise<string[]> {
    const uniqueIds: string[] = [];
    const seen = new Set<string>();

    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    if (scope !== 'group' || uniqueIds.length === 0) {
      return uniqueIds;
    }

    const selectedProducts = await this.productRepository.find({
      where: { id: In(uniqueIds) },
      select: { id: true, productGroupId: true },
    });

    const groupIds = [
      ...new Set(
        selectedProducts
          .map((product) => product.productGroupId)
          .filter((groupId): groupId is string => Boolean(groupId)),
      ),
    ];

    if (groupIds.length === 0) {
      return uniqueIds;
    }

    const groupedProducts = await this.productRepository.find({
      where: { productGroupId: In(groupIds) },
      select: { id: true },
    });

    for (const product of groupedProducts) {
      if (!seen.has(product.id)) {
        seen.add(product.id);
        uniqueIds.push(product.id);
      }
    }

    return uniqueIds;
  }

  private async syncStatusMutation(
    product: Pick<Product, 'id' | 'slug' | 'status'>,
  ) {
    await this.clearProductListCache();
    this.eventEmitter.emit(ProductEvents.UPDATED, {
      productId: product.id,
      changes: { status: product.status },
      updatedAt: new Date(),
    });
    await this.productQueryService.invalidateProductDetailCacheBySlug(
      product.slug,
    );
    await this.triggerFrontendRevalidate(product.slug);
  }

  private normalizeQcMedia(
    qcMedia?: Array<
      Pick<
        ProductQcMedia,
        'type' | 'url' | 'posterUrl' | 'mimeType' | 'duration' | 'sortOrder'
      >
    >,
  ):
    | Array<
        Pick<
          ProductQcMedia,
          'type' | 'url' | 'posterUrl' | 'mimeType' | 'duration' | 'sortOrder'
        >
      >
    | undefined {
    if (!qcMedia) return undefined;

    return qcMedia
      .filter((media) => typeof media?.url === 'string' && media.url.trim())
      .map((media, index) => ({
        type:
          media.type === ProductQcMediaType.VIDEO
            ? ProductQcMediaType.VIDEO
            : ProductQcMediaType.IMAGE,
        url: media.url.trim(),
        posterUrl:
          typeof media.posterUrl === 'string' && media.posterUrl.trim()
            ? media.posterUrl.trim()
            : null,
        mimeType:
          typeof media.mimeType === 'string' && media.mimeType.trim()
            ? media.mimeType.trim()
            : null,
        duration:
          typeof media.duration === 'number' && Number.isFinite(media.duration)
            ? Number(media.duration.toFixed(2))
            : null,
        sortOrder:
          typeof media.sortOrder === 'number' &&
          Number.isFinite(media.sortOrder)
            ? media.sortOrder
            : index,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((media, index) => ({
        ...media,
        sortOrder: index,
      }));
  }

  private async replaceQcMedia(
    productId: string,
    qcMedia: Array<
      Pick<
        ProductQcMedia,
        'type' | 'url' | 'posterUrl' | 'mimeType' | 'duration' | 'sortOrder'
      >
    >,
  ): Promise<ProductQcMedia[]> {
    await this.productQcMediaRepository.delete({ productId });

    if (qcMedia.length === 0) {
      return [];
    }

    const entities = qcMedia.map((media) =>
      this.productQcMediaRepository.create({
        productId,
        type: media.type,
        url: media.url,
        posterUrl: media.posterUrl,
        mimeType: media.mimeType,
        duration: media.duration,
        sortOrder: media.sortOrder,
      }),
    );

    return this.productQcMediaRepository.save(entities);
  }

  private async triggerFrontendRevalidate(slug?: string): Promise<void> {
    if (!slug) return;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
    const secret = process.env.REVALIDATE_SECRET;

    if (!secret) {
      this.logger.warn('REVALIDATE_SECRET 未配置，跳过前端缓存刷新');
      return;
    }

    try {
      const response = await fetch(`${frontendUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`前端 ISR 刷新失败 [${slug}]: ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`前端 ISR 刷新异常 [${slug}]: ${message}`);
    }
  }

  private async triggerFrontendBulkRevalidate(): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
    const secret = process.env.REVALIDATE_SECRET;

    if (!secret) {
      this.logger.warn('REVALIDATE_SECRET 未配置，跳过前端批量缓存刷新');
      return;
    }

    try {
      const response = await fetch(`${frontendUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ all: true, path: '/', type: 'layout' }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`前端批量 ISR 刷新失败: ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`前端批量 ISR 刷新异常: ${message}`);
    }
  }

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductInteractionEvent)
    private productInteractionEventRepository: Repository<ProductInteractionEvent>,
    @InjectRepository(ProductQcMedia)
    private productQcMediaRepository: Repository<ProductQcMedia>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly brandsService: BrandsService,
    private readonly brandGovernanceService: BrandGovernanceService,
    private readonly categoriesService: CategoriesService,
    private readonly productStatusService: ProductStatusService,
    private readonly productSkuService: ProductSkuService,
    private readonly productImportService: ProductImportService,
    private readonly productQueryService: ProductQueryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly attributesService: AttributesService,
    private readonly attributeValidator: AttributeValidatorService,
    private readonly analyticsDedupService: AnalyticsDedupService,
  ) {}

  private async recordTrustedInteractionEvent(
    productId: string,
    eventType: ProductInteractionEventType,
    context?: AnalyticsRequestContext,
  ): Promise<ProductInteractionEvent> {
    const event = this.productInteractionEventRepository.create({
      productId,
      eventType,
      trustedVisitorId: context?.trustedVisitorId || null,
      userId: context?.userId || null,
    });
    return this.productInteractionEventRepository.save(event);
  }

  private touchInteractionAbuseBucket(
    buckets: Map<string, ProductInteractionAbuseBucket>,
    key: string,
    productId: string,
  ): ProductInteractionAbuseBucket {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.expiresAt) {
      bucket = {
        expiresAt: now + this.productInteractionAbuseWindowMs,
        eventCount: 0,
        productIds: new Set<string>(),
      };
      buckets.set(key, bucket);
    }

    bucket.eventCount += 1;
    bucket.productIds.add(productId);
    return bucket;
  }

  private shouldSkipSuspiciousInteractionWrite(
    productId: string,
    context?: AnalyticsRequestContext,
  ): boolean {
    if (!context) return false;

    const visitorBucket = this.touchInteractionAbuseBucket(
      this.productInteractionAbuseByVisitor,
      context.trustedVisitorId,
      productId,
    );
    if (
      visitorBucket.productIds.size >
      this.maxInteractionProductsPerVisitorWindow
    ) {
      this.logger.warn(
        `Skipping product interaction writes for fast product scan visitor=${context.trustedVisitorId}: products=${visitorBucket.productIds.size}, events=${visitorBucket.eventCount}`,
      );
      return true;
    }

    if (!context.ipAddress || context.ipAddress === 'unknown') {
      return false;
    }

    const ipBucket = this.touchInteractionAbuseBucket(
      this.productInteractionAbuseByIp,
      context.ipAddress,
      productId,
    );
    if (ipBucket.eventCount > this.maxInteractionEventsPerIpWindow) {
      this.logger.warn(
        `Skipping product interaction writes for high-volume IP=${context.ipAddress}: products=${ipBucket.productIds.size}, events=${ipBucket.eventCount}`,
      );
      return true;
    }

    return false;
  }

  // ===== Product CRUD =====

  private async validatePrimaryCategoryForStatus(
    categoryId: string,
    status: ProductStatus = ProductStatus.DRAFT,
  ): Promise<Category> {
    if (
      status === ProductStatus.DRAFT ||
      status === ProductStatus.PENDING_REVIEW
    ) {
      return this.categoriesService.ensureCanonicalActiveCategory(categoryId);
    }

    return this.categoriesService.ensureCanonicalLeafCategory(categoryId);
  }

  // 创建商品
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const normalizedQcMedia = this.normalizeQcMedia(createProductDto.qcMedia);
    const productPayload = { ...createProductDto };
    delete productPayload.qcMedia;

    // 验证主分类是否存在
    const targetStatus = createProductDto.status || ProductStatus.DRAFT;
    const primaryCategory = await this.validatePrimaryCategoryForStatus(
      createProductDto.primaryCategoryId,
      targetStatus,
    );

    // 使用 AI 品牌名生成 slug
    const brandSlug = createProductDto.aiBrandName
      ? createProductDto.aiBrandName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : 'unknown';

    const slug = await generateUniqueProductSlug({
      brandSlug,
      categorySlug: primaryCategory.slug,
      exists: async (candidate) => {
        const existingProduct = await this.productRepository.findOne({
          where: { slug: candidate },
          select: { id: true },
        });
        return !!existingProduct;
      },
    });

    // 🆕 自动补齐副分类：获取主分类的祖先链
    const ancestorIds = await this.getCategoryAncestorIds(
      createProductDto.primaryCategoryId,
    );

    // 合并：祖先链 + 用户手动指定的副分类（去重）
    const allSecondaryCategoryIds = [
      ...new Set([
        ...ancestorIds,
        ...(createProductDto.secondaryCategoryIds || []),
      ]),
    ];

    // 验证所有副分类是否存在
    let secondaryCategories: Category[] = [];
    if (allSecondaryCategoryIds.length > 0) {
      secondaryCategories = await this.categoryRepository.find({
        where: { id: In(allSecondaryCategoryIds) },
      });

      if (secondaryCategories.length !== allSecondaryCategoryIds.length) {
        throw new NotFoundException('部分副分类 ID 不存在');
      }
    }

    // 品牌匹配/创建：如果提供了 aiBrandName，先修正再匹配或创建
    let brandId: string | undefined = createProductDto.brandId;
    if (!brandId && createProductDto.aiBrandName) {
      const correctedBrand = correctBrandByTitle(
        createProductDto.aiBrandName,
        createProductDto.title,
      );
      const brand = await this.brandsService.findOrCreateByName(
        correctedBrand,
        createProductDto.brandConfidence,
      );
      if (brand) {
        brandId = brand.id;
      }
    }

    // 创建商品
    const product = this.productRepository.create({
      ...productPayload,
      slug,
      brandId,
      secondaryCategories,
    });

    if (targetStatus === ProductStatus.ACTIVE) {
      assertProductPublicationQuality(product);
    }

    const savedProduct = await this.productRepository.save(product);
    await this.brandGovernanceService.syncProductBrandDecision({
      productId: savedProduct.id,
      rawBrandName: createProductDto.aiBrandName,
      matchedBrandId: brandId,
      matchConfidence: createProductDto.brandConfidence,
      matchMethod: 'manual',
      resolverType: 'admin',
    });

    savedProduct.qcMedia = normalizedQcMedia
      ? await this.replaceQcMedia(savedProduct.id, normalizedQcMedia)
      : [];

    // Dual-write: sync product attributes to normalized table
    if (savedProduct.aiAttributes) {
      try {
        const { attributeValueIds } =
          await this.attributeValidator.validateAndResolve(
            savedProduct.aiAttributes,
          );
        if (attributeValueIds.length) {
          await this.attributesService.syncProductAttributes(
            savedProduct.id,
            attributeValueIds,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to sync product attributes for ${savedProduct.id}: ${message}`,
        );
      }
    }

    await this.productQueryService.invalidateProductDetailCacheBySlug(
      savedProduct.slug,
    );
    await this.clearProductListCache();
    await this.triggerFrontendRevalidate(savedProduct.slug);

    return savedProduct;
  }

  // 查询商品列表（委托给 ProductQueryService）
  async findAll(
    query: QueryProductDto,
    searchContext?: {
      userId?: string;
      sessionId?: string;
      deviceId?: string;
      visitId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<{
    data: Product[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.productQueryService.findAll(query, searchContext);
  }

  // 获取筛选器facets（委托给 ProductQueryService）
  async getFacets(query: QueryProductDto) {
    return this.productQueryService.getFacets(query);
  }

  // 查询单个商品（委托给 ProductQueryService）
  async findOne(id: string): Promise<Product> {
    return this.productQueryService.findOne(id);
  }

  // 根据 slug 查询商品（委托给 ProductQueryService）
  async findBySlug(slug: string): Promise<Product> {
    return this.productQueryService.findBySlug(slug);
  }

  // 根据微店商品ID查询（委托给 ProductQueryService）
  async findByWeidianItemId(weidianItemId: string): Promise<Product | null> {
    return this.productQueryService.findByWeidianItemId(weidianItemId);
  }

  // 更新商品
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['secondaryCategories', 'qcMedia'],
    });

    if (!product) {
      throw new NotFoundException(`商品 ID ${id} 不存在`);
    }

    const previousSlug = product.slug;

    // 如果更新 slug，检查是否重复
    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existingProduct = await this.productRepository.findOne({
        where: { slug: updateProductDto.slug },
      });

      if (existingProduct) {
        throw new ConflictException('商品 slug 已存在');
      }
    }

    const nextStatus = updateProductDto.status || product.status;
    const nextPrimaryCategoryId =
      updateProductDto.primaryCategoryId || product.primaryCategoryId;

    // 验证主分类是否存在（如果更新了分类，或状态变化会影响分类约束）
    if (updateProductDto.primaryCategoryId || updateProductDto.status) {
      await this.validatePrimaryCategoryForStatus(
        nextPrimaryCategoryId,
        nextStatus,
      );
    }

    // 🆕 更新副分类（如果提供主分类或副分类，则重新计算祖先链）
    if (
      updateProductDto.primaryCategoryId ||
      updateProductDto.secondaryCategoryIds
    ) {
      // 获取最新的主分类 ID（可能是新的，也可能是原来的）
      const currentPrimaryCategoryId = nextPrimaryCategoryId;

      // 自动补齐副分类：获取主分类的祖先链
      const ancestorIds = await this.getCategoryAncestorIds(
        currentPrimaryCategoryId,
      );

      // 合并：祖先链 + 用户手动指定的副分类（去重）
      const allSecondaryCategoryIds = [
        ...new Set([
          ...ancestorIds,
          ...(updateProductDto.secondaryCategoryIds || []),
        ]),
      ];

      // 验证所有副分类是否存在
      const secondaryCategories = await this.categoryRepository.find({
        where: { id: In(allSecondaryCategoryIds) },
      });

      if (secondaryCategories.length !== allSecondaryCategoryIds.length) {
        throw new NotFoundException('部分副分类 ID 不存在');
      }

      product.secondaryCategories = secondaryCategories;
    }

    // 🆕 检测被删除的图片，同步清除 SKU 的 image 引用
    const newImages = updateProductDto.images;
    if (newImages !== undefined) {
      const oldImages = product.images || [];
      const removedImages = oldImages.filter((img) => !newImages.includes(img));

      if (removedImages.length > 0) {
        const clearedCount =
          await this.productSkuService.clearSkuImagesForRemovedUrls(
            id,
            removedImages,
          );
        if (clearedCount > 0) {
          this.logger.log(
            `产品 ${id} 删除了 ${removedImages.length} 张图片，已同步清除 ${clearedCount} 个 SKU 的图片引用`,
          );
        }
      }
    }

    const normalizedQcMedia = this.normalizeQcMedia(updateProductDto.qcMedia);
    const productUpdates = { ...updateProductDto };
    delete productUpdates.qcMedia;

    // 更新其他字段
    Object.assign(product, productUpdates);

    // 自动同步 mainImage：images 数组更新时，始终让 mainImage = images[0]（支持拖拽排序）
    if (newImages && newImages.length > 0) {
      product.mainImage = newImages[0];
    }

    if (nextStatus === ProductStatus.ACTIVE) {
      assertProductPublicationQuality(product);
    }

    const savedProduct = await this.productRepository.save(product);

    if (normalizedQcMedia !== undefined) {
      savedProduct.qcMedia = await this.replaceQcMedia(
        savedProduct.id,
        normalizedQcMedia,
      );
    } else {
      savedProduct.qcMedia = product.qcMedia || [];
    }

    // Dual-write: sync product attributes to normalized table when aiAttributes change
    if (updateProductDto.aiAttributes && savedProduct.aiAttributes) {
      try {
        const { attributeValueIds } =
          await this.attributeValidator.validateAndResolve(
            savedProduct.aiAttributes,
          );
        await this.attributesService.syncProductAttributes(
          savedProduct.id,
          attributeValueIds,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to sync product attributes for ${savedProduct.id}: ${message}`,
        );
      }
    }

    // 清除缓存，确保编辑后前端立即看到最新数据
    await this.clearProductListCache();

    // 发射更新事件，通知搜索索引等下游服务同步更新
    this.eventEmitter.emit(ProductEvents.UPDATED, {
      productId: savedProduct.id,
      changes: updateProductDto,
      updatedAt: new Date(),
    });

    await this.productQueryService.invalidateProductDetailCacheBySlug(
      previousSlug,
    );
    if (savedProduct.slug !== previousSlug) {
      await this.productQueryService.invalidateProductDetailCacheBySlug(
        savedProduct.slug,
      );
    }
    await this.triggerFrontendRevalidate(savedProduct.slug);

    return savedProduct;
  }

  // 删除商品（硬删除：真正从数据库删除）
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    const productId = product.id;
    const productSlug = product.slug;
    await this.productRepository.remove(product);
    // 清除产品列表缓存，确保删除后立即反映在列表中
    await this.clearProductListCache();
    this.eventEmitter.emit(ProductEvents.DELETED, {
      productId,
      deletedAt: new Date(),
    } as ProductDeletedEvent);
    await this.productQueryService.invalidateProductDetailCacheBySlug(
      productSlug,
    );
    await this.triggerFrontendRevalidate(productSlug);
  }

  // 批量删除商品
  async batchRemove(ids: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; reason: string }>;
  }> {
    const failed: Array<{ id: string; reason: string }> = [];

    // 批量查询所有产品
    const products = await this.productRepository.find({
      where: { id: In(ids) },
    });

    const foundIds = new Set(products.map((p) => p.id));
    // 记录成功的 ID（remove 后实体 id 会被清除）
    const successIds = [...foundIds];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        failed.push({ id, reason: '产品不存在' });
      }
    }

    if (products.length > 0) {
      await this.productRepository.remove(products);
    }

    // 清除缓存一次即可
    await this.clearProductListCache();

    // 为每个成功删除的商品发射删除事件
    for (const productId of successIds) {
      this.eventEmitter.emit(ProductEvents.DELETED, {
        productId,
        deletedAt: new Date(),
      } as ProductDeletedEvent);
    }

    await Promise.all(
      products.map((product) =>
        this.productQueryService.invalidateProductDetailCacheBySlug(
          product.slug,
        ),
      ),
    );

    if (products.length > 0) {
      await this.triggerFrontendBulkRevalidate();
    }

    this.logger.log(
      `Batch delete: ${successIds.length} succeeded, ${failed.length} failed`,
    );

    return { success: successIds, failed };
  }

  // 清除产品及关联模块（品牌/分类）的缓存
  // 产品增删会影响品牌和分类的 productCount，需要一并清除
  private async clearProductListCache(): Promise<void> {
    const patterns = [
      '*products*',
      '*brands*',
      '*categories*',
      '*public:stats:*',
    ];
    try {
      const keyvStore = (this.cacheManager as any).stores?.[0];
      const redisClient = keyvStore?.client ?? keyvStore?.store?.client;

      // KeyvRedis: 通过底层 Redis client 使用 SCAN 精确删除
      if (redisClient?.scanIterator) {
        let totalCleared = 0;
        for (const pattern of patterns) {
          for await (const scannedKeys of redisClient.scanIterator({
            MATCH: pattern,
            COUNT: 100,
          })) {
            const keys = Array.isArray(scannedKeys)
              ? scannedKeys
              : [scannedKeys];
            if (keys.length > 0) {
              await redisClient.unlink(keys);
              totalCleared += keys.length;
            }
          }
        }
        if (totalCleared > 0) {
          this.logger.log(
            `Cleared ${totalCleared} cache entries for products/brands/categories (Redis SCAN)`,
          );
        }
        return;
      }

      // In-memory store fallback
      const internalStore = keyvStore?.store;
      if (internalStore instanceof Map) {
        const keysToDelete: string[] = [];
        for (const key of internalStore.keys()) {
          if (
            typeof key === 'string' &&
            (key.includes('/products') ||
              key.includes('/brands') ||
              key.includes('/categories'))
          ) {
            keysToDelete.push(key);
          }
        }
        for (const key of keysToDelete) {
          internalStore.delete(key);
        }
        if (keysToDelete.length > 0) {
          this.logger.log(
            `Cleared ${keysToDelete.length} cache entries for products/brands/categories`,
          );
        }
        return;
      }

      // 未匹配到已知的缓存存储类型，仅记录警告，不清空全部缓存
      this.logger.warn(
        'Unable to clear product cache: unknown cache store type, skipping',
      );
    } catch (error) {
      this.logger.warn('Failed to clear product cache:', error);
    }
  }

  // 软删除：仅标记为 inactive（如需要可调用此方法）
  async softRemove(id: string): Promise<void> {
    const product = await this.findOne(id);
    product.status = ProductStatus.INACTIVE;
    await this.productRepository.save(product);
  }

  // 增加外跳次数（销量）
  async incrementSalesCount(id: string): Promise<void> {
    await this.productRepository.increment({ id }, 'salesCount', 1);
  }

  // 记录商品浏览（由前端详情页主动上报）
  async recordProductView(
    productId: string,
    context?: AnalyticsRequestContext,
  ): Promise<void> {
    if (this.shouldSkipSuspiciousInteractionWrite(productId, context)) {
      return;
    }

    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'product_view',
      windowMs: 30 * 60 * 1000,
      parts: [context?.trustedVisitorId || productId, productId],
    });
    if (!shouldRecord) {
      return;
    }
    try {
      await this.recordTrustedInteractionEvent(
        productId,
        ProductInteractionEventType.VIEW,
        context,
      );
      await this.productRepository.increment({ id: productId }, 'viewCount', 1);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        this.logger.warn(
          `Skipping product view tracking for missing product ${productId}`,
        );
        return;
      }
      throw error;
    }

    if (context?.userId) {
      await this.maybeAwardDailyBrowseReward(context.userId);
    }
  }

  private async maybeAwardDailyBrowseReward(userId: string): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const row = await this.productInteractionEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event."productId")', 'count')
      .where('event."userId" = :userId', { userId })
      .andWhere('event."eventType" = :eventType', {
        eventType: ProductInteractionEventType.VIEW,
      })
      .andWhere('event."createdAt" >= :todayStart', { todayStart })
      .getRawOne<{ count?: string }>();

    const distinctProducts = parseInt(row?.count || '0', 10) || 0;
    if (distinctProducts < 5) return;

    this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
      userId,
      action: 'daily_browse_5_products',
      referenceType: 'daily_task',
      referenceId: new Date().toISOString().split('T')[0],
      metadata: {
        distinctProducts,
      },
    } as EarnPointsRequestEvent);
  }

  // 记录商品点击
  async recordProductClick(
    productId: string,
    context?: AnalyticsRequestContext,
  ): Promise<void> {
    if (this.shouldSkipSuspiciousInteractionWrite(productId, context)) {
      return;
    }

    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'product_click',
      windowMs: 10 * 60 * 1000,
      parts: [context?.trustedVisitorId || productId, productId],
    });
    if (!shouldRecord) {
      return;
    }
    try {
      await this.recordTrustedInteractionEvent(
        productId,
        ProductInteractionEventType.CLICK,
        context,
      );
      await this.productRepository.increment(
        { id: productId },
        'clickCount',
        1,
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        this.logger.warn(
          `Skipping product click tracking for missing product ${productId}`,
        );
        return;
      }
      throw error;
    }

    // 异步更新 CTR
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id', 'viewCount', 'clickCount'],
    });
    if (product && product.viewCount > 0) {
      const newCtr = product.clickCount / product.viewCount;
      await this.productRepository.update(productId, { ctr: newCtr });
    }
  }

  // 切换推荐状态
  async toggleFeatured(productId: string): Promise<{ isFeatured: boolean }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id', 'isFeatured'],
    });
    if (!product) {
      throw new NotFoundException(`商品 ${productId} 不存在`);
    }
    const newValue = !product.isFeatured;
    await this.productRepository.update(productId, { isFeatured: newValue });

    // 触发 MeiliSearch 同步，用户端即时生效
    this.eventEmitter.emit(ProductEvents.UPDATED, { productId });

    return { isFeatured: newValue };
  }

  // 批量更新推荐排序
  async updateFeaturedSort(
    items: Array<{ id: string; featuredSort: number }>,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const item of items) {
      const result = await this.productRepository.update(item.id, {
        featuredSort: item.featuredSort,
      });
      if (result.affected) updated += result.affected;
    }

    // 触发 MeiliSearch 同步
    for (const item of items) {
      this.eventEmitter.emit(ProductEvents.UPDATED, {
        productId: item.id,
      });
    }

    return { updated };
  }

  // ===== 状态管理（委托给 ProductStatusService）=====

  async performStatusAction(
    id: string,
    action: ProductStatusAction,
    options?: {
      allowParentCategory?: boolean;
    },
  ): Promise<Product> {
    const product = await this.productStatusService.performStatusAction(
      id,
      action,
      options,
    );
    await this.syncStatusMutation(product);
    return product;
  }

  async submitForReview(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.SUBMIT_FOR_REVIEW);
  }

  async approveProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.APPROVE);
  }

  async rejectProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.REJECT);
  }

  async publishProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.PUBLISH);
  }

  async unpublishProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.UNPUBLISH);
  }

  async markOutOfStock(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.MARK_OUT_OF_STOCK);
  }

  async restockProduct(id: string): Promise<Product> {
    return this.performStatusAction(id, ProductStatusAction.RESTOCK);
  }

  getAvailableStatusActions(
    status: string,
  ): Array<{ action: ProductStatusAction; label: string }> {
    return this.productStatusService.getAvailableStatusActions(status);
  }

  async batchUpdateStatus(
    ids: string[],
    action: ProductStatusAction,
    options?: {
      allowParentCategory?: boolean;
    },
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; reason: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of ids) {
      try {
        await this.performStatusAction(id, action, options);
        success.push(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ id, reason: message });
      }
    }

    return { success, failed };
  }

  async batchUpdatePrimaryCategory(
    ids: string[],
    primaryCategoryId: string,
    options?: {
      scope?: BatchTargetScope;
      approveAfterUpdate?: boolean;
      allowParentCategory?: boolean;
    },
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; reason: string }>;
  }> {
    const targetIds = await this.resolveBatchTargetIds(ids, options?.scope);
    const success: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of targetIds) {
      try {
        await this.update(id, { primaryCategoryId });
        if (options?.approveAfterUpdate) {
          await this.performStatusAction(id, ProductStatusAction.APPROVE, {
            allowParentCategory: options.allowParentCategory,
          });
        }
        success.push(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ id, reason: message });
      }
    }

    return { success, failed };
  }

  // ===== 辅助方法 =====

  /**
   * 获取分类的完整祖先链 ID 列表（包含自己）
   * @param categoryId 分类 ID
   * @returns 祖先链 ID 数组，从根分类到当前分类
   */
  private async getCategoryAncestorIds(categoryId: string): Promise<string[]> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      return [];
    }

    // 使用 TreeRepository 的 findAncestorsTree 方法获取祖先链
    const ancestors = await this.categoryRepository.manager
      .getTreeRepository(Category)
      .findAncestors(category);

    // 返回祖先链的 ID 数组（包含当前分类自己）
    return ancestors.map((cat) => cat.id);
  }

  // ===== SKU CRUD（委托给 ProductSkuService）=====

  async createSku(createSkuDto: CreateSkuDto): Promise<Sku> {
    return this.productSkuService.createSku(createSkuDto);
  }

  async findSkusByProduct(productId: string): Promise<Sku[]> {
    return this.productSkuService.findSkusByProduct(productId);
  }

  async findOneSku(id: string): Promise<Sku> {
    return this.productSkuService.findOneSku(id);
  }

  async updateSku(id: string, updateSkuDto: UpdateSkuDto): Promise<Sku> {
    return this.productSkuService.updateSku(id, updateSkuDto);
  }

  async removeSku(id: string): Promise<void> {
    return this.productSkuService.removeSku(id);
  }

  // ===== 微店导入功能（委托给 ProductImportService）=====

  async importFromWeidian(
    dto: ImportFromWeidianDto,
  ): Promise<ImportFromWeidianResultDto> {
    return this.productImportService.importFromWeidian(dto);
  }

  /**
   * 从微店导入商品（带混合商品检测）v2.1
   * 使用综合分析检测混合商品
   */
  async importFromWeidianWithMixedDetection(dto: ImportFromWeidianDto) {
    return this.productImportService.importFromWeidianWithMixedDetection(dto);
  }

  async createProductFromBatchItem(
    data: CreateFromBatchItemInput,
  ): Promise<ImportFromWeidianResultDto> {
    return this.productImportService.createProductFromBatchItem(data);
  }

  // ===== 辅助方法 =====

  // 获取 slugs（委托给 ProductQueryService），支持分页
  async getAllSlugs(
    page?: number,
    limit?: number,
  ): Promise<{ slugs: string[]; total?: number }> {
    return this.productQueryService.getAllSlugs(page, limit);
  }

  // 搜索商品（委托给 ProductQueryService）
  async search(query: string, limit: number = 10): Promise<Product[]> {
    return this.productQueryService.search(query, limit);
  }

  /**
   * 搜索建议：并行查询品牌、分类、商品
   */
  async getSuggestions(query: string) {
    const empty = { brands: [], categories: [], products: [] };
    if (!query || query.length < 2) return empty;

    const [brands, categories, products] = await Promise.all([
      this.brandsService.search(query, 3),
      this.categoriesService.search(query, 3),
      this.search(query, 5),
    ]);

    return { brands, categories, products };
  }

  // 生成外跳购买链接（委托给 ProductQueryService）
  async generateBuyLink(productId: string, platformKey?: string) {
    return this.productQueryService.generateBuyLink(productId, platformKey);
  }

  // 获取所有可用的代购平台（委托给 ProductQueryService）
  async getAvailablePlatforms() {
    return this.productQueryService.getAvailablePlatforms();
  }
}
