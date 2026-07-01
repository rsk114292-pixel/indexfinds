import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductSkuService } from './product-sku.service';
import { LockService } from '../shared/services/lock.service';
import { generateUniqueProductSlug } from '../utils/slug';
import { ProductEvents } from '../shared/events';
import { ProductStatus } from './product-status';
import { AttributesService } from '../attributes/attributes.service';
import { AttributeValidatorService } from '../attributes/attribute-validator.service';
import { CategoriesService } from '../categories/categories.service';

/**
 * 创建商品所需的数据
 */
export interface CreateProductData {
  slug?: string;
  title: string;
  originalTitle?: string;
  description?: string;
  brandId?: string;
  aiBrandName?: string;
  primaryCategoryId: string;
  secondaryCategories?: Category[];
  weidianItemId?: string;
  weidianShopId?: string;
  weidianShopName?: string;
  weidianRawData?: {
    skuInfo?: unknown;
    detailDesc?: unknown;
  };
  sourceUrl?: string;
  aiAttributes?: Record<string, unknown>;
  mainImage?: string;
  images?: string[];
  detailImages?: string[];
  priceMin?: number;
  priceMax?: number;
  status: ProductStatus;
  isFeatured?: boolean;

  // v2.1 混合商品支持
  mixednessScore?: number;
  mixednessEvaluated?: boolean;
  potentialMixedProduct?: boolean;
  productGroupId?: string;
  isFromSplit?: boolean;
  splitSourceUrl?: string;
  splitMetadata?: {
    analysisTimestamp: string;
    aiAnalysisSnapshot?: unknown; // 完整的 ComprehensiveProductAnalysis
    suggestedGroups: unknown[];
    overallConfidence: number;
    processingStrategy: string;
  };
  // SKU 拆分支持
  skuVariantKey?: string;
  splitSourceWeidianId?: string;

  parentProductId?: string;
  hasVariants?: boolean;
  variantAttributes?: {
    type?: string;
    value?: string;
    values?: string[];
  };

  allowNonLeafPrimaryCategory?: boolean;
}

/**
 * SKU 创建数据
 */
export interface CreateSkuData {
  weidianSkuId?: string;
  skuId?: string;
  attrIds?: number[];
  weidianAttrIds?: number[];
  attributes?: Record<string, string>;
  skuKey?: string;
  price?: number;
  stock?: number;
  image?: string | null;
}

/**
 * 商品创建结果
 */
export interface ProductCreationResult {
  product: Product;
  skus: Sku[];
  warnings: string[];
}

/**
 * ProductCreatorService
 * 负责商品和 SKU 的创建：
 * - 商品实体创建
 * - SKU 批量创建
 * - Slug 生成
 * - 分类祖先链处理
 * - 事件发射
 */
@Injectable()
export class ProductCreatorService {
  private readonly logger = new Logger(ProductCreatorService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly productSkuService: ProductSkuService,
    private readonly eventEmitter: EventEmitter2,
    private readonly lockService: LockService,
    private readonly attributesService: AttributesService,
    private readonly attributeValidator: AttributeValidatorService,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * 生成唯一的商品 Slug
   */
  async generateSlug(
    brandName: string | undefined,
    categorySlug: string,
  ): Promise<string> {
    const brandSlugPart = brandName
      ? brandName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : 'unknown';

    return generateUniqueProductSlug({
      brandSlug: brandSlugPart,
      categorySlug,
      exists: async (candidate) => {
        const existingProduct = await this.productRepository.findOne({
          where: { slug: candidate },
          select: { id: true },
        });
        return !!existingProduct;
      },
    });
  }

  /**
   * 获取分类的完整祖先链 ID 列表
   */
  async getCategoryAncestorIds(categoryId: string): Promise<string[]> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      return [];
    }

    const ancestors = await this.categoryRepository.manager
      .getTreeRepository(Category)
      .findAncestors(category);

    return ancestors.map((cat) => cat.id);
  }

  /**
   * 验证并获取主分类
   */
  async validateAndGetPrimaryCategory(categoryId: string): Promise<Category> {
    return this.categoriesService.ensureCanonicalLeafCategory(categoryId);
  }

  /**
   * 获取副分类（包含祖先链）
   */
  async getSecondaryCategories(
    primaryCategoryId: string,
    additionalCategoryIds: string[] = [],
  ): Promise<{ categories: Category[]; warnings: string[] }> {
    const warnings: string[] = [];

    const ancestorIds = await this.getCategoryAncestorIds(primaryCategoryId);
    const allCategoryIds = [
      ...new Set([...ancestorIds, ...additionalCategoryIds]),
    ];

    if (allCategoryIds.length === 0) {
      return { categories: [], warnings };
    }

    const categories = await this.categoryRepository.find({
      where: { id: In(allCategoryIds) },
    });

    if (categories.length !== allCategoryIds.length) {
      warnings.push('部分副分类 ID 不存在，已忽略');
    }

    return { categories, warnings };
  }

  /**
   * 检查商品是否已存在
   */
  async findExistingProduct(weidianItemId: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { weidianItemId },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });
  }

  /**
   * 创建商品和 SKU
   * @param productData 商品数据
   * @param skusData SKU 数据
   * @param emitEvents 是否发射事件
   * @param entityManager 可选的 EntityManager，用于外部事务支持
   */
  async createProductWithSkus(
    productData: CreateProductData,
    skusData: CreateSkuData[] = [],
    emitEvents = true,
    entityManager?: EntityManager,
  ): Promise<ProductCreationResult> {
    // 如果提供了外部 EntityManager，直接使用（外部事务）
    if (entityManager) {
      return this.createProductWithSkusInternal(
        productData,
        skusData,
        entityManager,
        emitEvents,
      );
    }

    // 使用分布式锁防止并发创建同一商品
    const lockKey = productData.weidianItemId
      ? `product:weidian:${productData.weidianItemId}`
      : `product:slug:${productData.slug}`;

    const acquired = await this.lockService.acquireLockWithRetry(
      lockKey,
      60000,
      3,
      1500,
    );
    if (!acquired) {
      // 锁已被持有，检查商品是否已存在
      if (productData.weidianItemId) {
        const existing = await this.findExistingProduct(
          productData.weidianItemId,
        );
        if (existing) {
          this.logger.warn(
            `商品已被其他进程创建: ${productData.weidianItemId}`,
          );
          return {
            product: existing,
            skus: [],
            warnings: ['商品已存在（并发创建检测）'],
          };
        }
      }
      throw new Error('无法获取锁，商品可能正在被其他进程创建，请稍后重试');
    }

    try {
      // Double-check: 获取锁后再次检查商品是否已存在
      if (productData.weidianItemId) {
        const existing = await this.findExistingProduct(
          productData.weidianItemId,
        );
        if (existing) {
          this.logger.warn(
            `商品已存在（double-check）: ${productData.weidianItemId}`,
          );
          return {
            product: existing,
            skus: [],
            warnings: ['商品已存在'],
          };
        }
      }

      // 创建内部事务，确保商品和 SKU 原子性
      const warnings: string[] = [];
      let result: { product: Product; skus: Sku[] };

      try {
        result = await this.productRepository.manager.transaction(
          async (manager) => {
            const innerResult = await this.createProductWithSkusInternal(
              productData,
              skusData,
              manager,
              false, // 事务内不发射事件
            );
            warnings.push(...innerResult.warnings);
            return { product: innerResult.product, skus: innerResult.skus };
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`创建商品事务失败: ${message}`);
        throw error;
      }

      // 事务内已加载完整关联数据（brand, primaryCategory, secondaryCategories），
      // 事务提交后数据仍有效，无需重复查询

      // 事务成功后发射事件
      if (emitEvents) {
        this.emitProductEvents(result.product, result.skus.length, 'weidian');
      }

      return {
        product: result.product,
        skus: result.skus,
        warnings,
      };
    } finally {
      // 释放锁
      await this.lockService.releaseLock(lockKey);
    }
  }

  /**
   * 内部方法：在事务中创建商品和 SKU
   */
  private async createProductWithSkusInternal(
    productData: CreateProductData,
    skusData: CreateSkuData[],
    manager: EntityManager,
    emitEvents: boolean,
  ): Promise<ProductCreationResult> {
    const warnings: string[] = [];
    const productRepo = manager.getRepository(Product);
    const skuRepo = manager.getRepository(Sku);
    if (
      productData.allowNonLeafPrimaryCategory &&
      productData.status === ProductStatus.PENDING_REVIEW
    ) {
      await this.categoriesService.ensureCanonicalActiveCategory(
        productData.primaryCategoryId,
      );
    } else {
      await this.categoriesService.ensureCanonicalLeafCategory(
        productData.primaryCategoryId,
      );
    }

    // 创建商品
    this.logger.log(
      `创建商品记录: ${productData.slug}, 状态: ${productData.status}`,
    );
    const product = productRepo.create({
      slug: productData.slug,
      title: productData.title,
      originalTitle: productData.originalTitle,
      description: productData.description,
      brandId: productData.brandId || undefined,
      aiBrandName: productData.aiBrandName || undefined,
      primaryCategoryId: productData.primaryCategoryId,
      secondaryCategories: productData.secondaryCategories,
      weidianItemId: productData.weidianItemId,
      weidianShopId: productData.weidianShopId,
      weidianShopName: productData.weidianShopName,
      weidianRawData: productData.weidianRawData,
      sourceUrl: productData.sourceUrl,
      aiAttributes: productData.aiAttributes,
      mainImage: productData.mainImage,
      images: productData.images || [],
      detailImages: productData.detailImages || [],
      priceMin: productData.priceMin,
      priceMax: productData.priceMax,
      status: productData.status,
      isFeatured: productData.isFeatured || false,
      viewCount: 0,
      salesCount: 0,
      favoriteCount: 0,
      popularityScore: 0,
      // v2.1 混合商品支持
      // 确保 mixednessScore 是有效数字，NaN/undefined/null 转为 0
      mixednessScore:
        productData.mixednessScore !== undefined &&
        productData.mixednessScore !== null &&
        !isNaN(productData.mixednessScore)
          ? productData.mixednessScore
          : 0,
      mixednessEvaluated: productData.mixednessEvaluated ?? false,
      potentialMixedProduct: productData.potentialMixedProduct ?? false,
      productGroupId: productData.productGroupId,
      isFromSplit: productData.isFromSplit ?? false,
      splitSourceUrl: productData.splitSourceUrl,
      splitMetadata: productData.splitMetadata,
      parentProductId: productData.parentProductId,
      hasVariants: productData.hasVariants ?? false,
      variantAttributes: productData.variantAttributes,
      // SKU 拆分支持
      skuVariantKey: productData.skuVariantKey,
      splitSourceWeidianId: productData.splitSourceWeidianId,
    });

    const savedProduct = await productRepo.save(product);
    this.logger.log(`商品创建成功: ${savedProduct.id}`);

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
            manager,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to sync product attributes for ${savedProduct.id}: ${message}`,
        );
        warnings.push(`属性同步失败: ${message}`);
      }
    }

    // 批量创建 SKU - 在事务中，任何失败都会导致整个事务回滚
    const createdSkus: Sku[] = [];
    if (skusData.length > 0) {
      this.logger.log(`批量创建 ${skusData.length} 个 SKU`);

      const skuEntities = skusData.map((skuData) =>
        skuRepo.create({
          productId: savedProduct.id,
          weidianSkuId: skuData.weidianSkuId || skuData.skuId,
          weidianAttrIds: skuData.weidianAttrIds || skuData.attrIds || [],
          attributes: skuData.attributes || {},
          skuKey: skuData.skuKey,
          price: skuData.price,
          stock: skuData.stock || 0,
          image: skuData.image,
        }),
      );
      createdSkus.push(...(await skuRepo.save(skuEntities)));

      this.logger.log(`成功创建 ${createdSkus.length} 个 SKU`);

      // 在事务内更新价格范围（避免事务外更新导致数据不一致）
      const prices = createdSkus
        .map((sku) => sku.price)
        .filter((price) => price !== null && price !== undefined);

      if (prices.length > 0) {
        const priceMin = Math.min(...prices);
        const priceMax = Math.max(...prices);
        await productRepo.update(savedProduct.id, { priceMin, priceMax });
        this.logger.log(`价格范围已更新: ${priceMin} - ${priceMax} (在事务内)`);
      }
    } else {
      warnings.push('没有 SKU 数据');
    }

    // 在事务内重新加载商品
    const reloadedProduct = await productRepo.findOne({
      where: { id: savedProduct.id },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });

    if (!reloadedProduct) {
      throw new Error('无法重新加载商品数据');
    }

    // 事务内不发射事件
    if (emitEvents) {
      this.emitProductEvents(reloadedProduct, createdSkus.length, 'weidian');
    }

    return {
      product: reloadedProduct,
      skus: createdSkus,
      warnings,
    };
  }

  /**
   * 发射商品创建相关事件
   */
  private emitProductEvents(
    product: Product,
    skuCount: number,
    source: string,
  ): void {
    this.eventEmitter.emit(ProductEvents.IMPORT_COMPLETED, {
      importId: `import-${Date.now()}`,
      productId: product.id,
      source,
      skuCount,
      completedAt: new Date(),
    });

    this.eventEmitter.emit(ProductEvents.CREATED, {
      productId: product.id,
      title: product.title,
      brandId: product.brandId,
      primaryCategoryId: product.primaryCategoryId,
      weidianItemId: product.weidianItemId,
      createdAt: new Date(),
    });
  }
}
