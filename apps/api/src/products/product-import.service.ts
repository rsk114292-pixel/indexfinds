import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ImportFromWeidianDto,
  ImportFromWeidianResultDto,
} from './dto/import-from-weidian.dto';
import { WeidianService } from '../weidian/weidian.service';
import {
  ProductAIEnhancerService,
  BrandProcessingResult,
  ComprehensiveEnhancementResult,
} from './product-ai-enhancer.service';
import { ProductCreatorService } from './product-creator.service';
import {
  ProductDataMapperService,
  WeidianSkuRaw,
} from './product-data-mapper.service';
import { ProductEvents } from '../shared/events';
import { ProcessingStrategy } from '../ai/ai.types';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import type { WeidianNormalizedData } from '../weidian/interfaces/thor-api.interface';
import type { Category } from '../categories/entities/category.entity';
import { ProductStatus } from './product-status';
import type { CreateFromBatchItemInput } from '../batch/types/batch-data.types';
import { BrandGovernanceService } from '../brands/brand-governance.service';

/**
 * 混合商品检测导入结果 (v2.1)
 */
export interface MixedProductImportResult extends ImportFromWeidianResultDto {
  // 混合商品检测信息
  isMixedProduct?: boolean;
  mixednessScore?: number;
  processingStrategy?: ProcessingStrategy;
  suggestedGroupCount?: number;
  comprehensiveAnalysis?: ComprehensiveEnhancementResult['comprehensiveAnalysis'];
}

/**
 * ProductImportService
 * 商品导入流程协调器（Facade）
 *
 * 职责：
 * - 协调导入流程各步骤
 * - 调用 ProductAIEnhancerService 处理 AI 增强
 * - 调用 ProductCreatorService 创建商品和 SKU
 */
@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    private readonly weidianService: WeidianService,
    private readonly aiEnhancerService: ProductAIEnhancerService,
    private readonly creatorService: ProductCreatorService,
    private readonly dataMapper: ProductDataMapperService,
    private readonly brandGovernanceService: BrandGovernanceService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * 从微店导入商品（完整流程）
   */
  async importFromWeidian(
    dto: ImportFromWeidianDto,
  ): Promise<ImportFromWeidianResultDto> {
    const warnings: string[] = [];

    this.logger.log(`开始从微店导入商品: ${dto.url || dto.itemId}`);

    try {
      // 步骤 1-2: 提取 itemId + 抓取数据
      const fetchResult = await this.fetchWeidianData(dto);
      if ('success' in fetchResult) return fetchResult;
      const { itemId, weidianData } = fetchResult;

      // 步骤 3: AI 增强处理
      const aiResult = await this.aiEnhancerService.analyzeAndEnhance(
        weidianData.images || [],
        dto.title || '未命名商品',
        dto.description,
      );
      warnings.push(...aiResult.warnings);

      // 步骤 4-6: 分类 + 品牌 + Slug
      const metadata = await this.resolveMetadata(
        dto,
        aiResult.aiCategorySlug,
        aiResult.aiBrandName,
      );
      warnings.push(...metadata.warnings);

      // 步骤 7: 决定状态
      const autoStatus = this.aiEnhancerService.determineStatusByConfidence(
        aiResult.aiConfidence,
        dto.status,
      );

      // 步骤 8: 创建商品和 SKU
      const {
        product,
        skus,
        warnings: createWarnings,
      } = await this.creatorService.createProductWithSkus(
        {
          slug: metadata.slug,
          title: aiResult.translatedTitle,
          originalTitle: weidianData.title,
          description: aiResult.translatedDescription,
          brandId: metadata.brandResult.brandId,
          aiBrandName: metadata.brandResult.aiBrandName,
          primaryCategoryId: metadata.primaryCategoryId,
          secondaryCategories: metadata.secondaryCategories,
          weidianItemId: itemId,
          weidianShopId: weidianData.shopId,
          weidianShopName: weidianData.shopName,
          weidianRawData: {
            skuInfo: weidianData.rawSkuInfo as unknown,
            detailDesc: weidianData.rawDetailDesc as unknown,
          },
          aiAttributes: aiResult.aiAttributes || dto.aiAttributes,
          mainImage: weidianData.mainImage,
          images: weidianData.images,
          detailImages: weidianData.detailImages,
          status: autoStatus,
          isFeatured: dto.isFeatured || false,
        },
        this.dataMapper.mapWeidianSkus(weidianData.skus),
      );
      warnings.push(...createWarnings);
      await this.brandGovernanceService.syncProductBrandDecision({
        productId: product.id,
        rawBrandName: metadata.brandResult.aiBrandName,
        matchedBrandId: product.brandId,
        matchConfidence: aiResult.aiConfidence,
        matchMethod: product.brandId ? 'rule_match' : 'manual',
        resolverType: 'system',
      });

      return this.buildImportResult(
        product,
        skus,
        metadata.brandResult.aiBrandName,
        warnings,
      );
    } catch (error: unknown) {
      return this.handleImportError(error, warnings);
    }
  }

  /**
   * 从微店导入商品（带混合商品检测）v2.1
   */
  async importFromWeidianWithMixedDetection(
    dto: ImportFromWeidianDto,
  ): Promise<MixedProductImportResult> {
    const warnings: string[] = [];

    this.logger.log(
      `[v2.1] 开始从微店导入商品（带混合商品检测）: ${dto.url || dto.itemId}`,
    );

    try {
      // 步骤 1-2: 提取 itemId + 抓取数据
      const fetchResult = await this.fetchWeidianData(dto);
      if ('success' in fetchResult) return fetchResult;
      const { itemId, weidianData } = fetchResult;

      // 步骤 3: 构建 SKU 提示
      const skuHints = this.dataMapper.buildSkuHints(
        weidianData.skus as WeidianSkuRaw[],
      );

      // 步骤 4: 综合分析（含混合商品检测）
      const allImages = [
        ...(weidianData.images || []),
        ...(weidianData.detailImages || []),
      ];

      const aiResult =
        await this.aiEnhancerService.analyzeAndEnhanceComprehensive(
          allImages,
          skuHints,
          dto.title || weidianData.title || '未命名商品',
          dto.description,
        );
      warnings.push(...aiResult.warnings);

      this.logger.log(
        `[v2.1] 混合商品检测完成: ` +
          `isMixed=${aiResult.isMixedProduct}, ` +
          `score=${(aiResult.mixednessScore * 100).toFixed(0)}%, ` +
          `strategy=${aiResult.processingStrategy}, ` +
          `groups=${aiResult.comprehensiveAnalysis.suggestedGroups.length}`,
      );

      // 步骤 5-7: 分类 + 品牌 + Slug
      const metadata = await this.resolveMetadata(
        dto,
        aiResult.aiCategorySlug,
        aiResult.aiBrandName,
      );
      warnings.push(...metadata.warnings);

      // 步骤 8: 决定状态（考虑混合商品）
      const autoStatus = this.aiEnhancerService.determineStatusByMixedness(
        aiResult.aiConfidence,
        aiResult.isMixedProduct,
        aiResult.processingStrategy,
        dto.status,
      );

      // 步骤 9: 创建商品和 SKU（带混合商品信息）
      const {
        product,
        skus,
        warnings: createWarnings,
      } = await this.creatorService.createProductWithSkus(
        {
          slug: metadata.slug,
          title: aiResult.translatedTitle,
          originalTitle: weidianData.title,
          description: aiResult.translatedDescription,
          brandId: metadata.brandResult.brandId,
          aiBrandName: metadata.brandResult.aiBrandName,
          primaryCategoryId: metadata.primaryCategoryId,
          secondaryCategories: metadata.secondaryCategories,
          weidianItemId: itemId,
          weidianShopId: weidianData.shopId,
          weidianShopName: weidianData.shopName,
          weidianRawData: {
            skuInfo: weidianData.rawSkuInfo as unknown,
            detailDesc: weidianData.rawDetailDesc as unknown,
          },
          aiAttributes: aiResult.aiAttributes || dto.aiAttributes,
          mainImage: weidianData.mainImage,
          images: weidianData.images,
          detailImages: weidianData.detailImages,
          status: autoStatus,
          isFeatured: dto.isFeatured || false,
          // v2.1 混合商品字段
          mixednessScore: aiResult.mixednessScore,
          mixednessEvaluated: true,
          potentialMixedProduct: aiResult.isMixedProduct,
          splitMetadata: aiResult.isMixedProduct
            ? {
                analysisTimestamp: new Date().toISOString(),
                aiAnalysisSnapshot: aiResult.comprehensiveAnalysis,
                suggestedGroups: aiResult.comprehensiveAnalysis.suggestedGroups,
                overallConfidence:
                  aiResult.comprehensiveAnalysis.overallConfidence,
                processingStrategy: aiResult.processingStrategy,
              }
            : undefined,
        },
        this.dataMapper.mapWeidianSkus(weidianData.skus),
      );
      warnings.push(...createWarnings);
      await this.brandGovernanceService.syncProductBrandDecision({
        productId: product.id,
        rawBrandName: metadata.brandResult.aiBrandName,
        matchedBrandId: product.brandId,
        matchConfidence: aiResult.aiConfidence,
        matchMethod: product.brandId ? 'rule_match' : 'manual',
        resolverType: 'system',
      });

      return {
        ...this.buildImportResult(
          product,
          skus,
          metadata.brandResult.aiBrandName,
          warnings,
        ),
        // v2.1 混合商品检测信息
        isMixedProduct: aiResult.isMixedProduct,
        mixednessScore: aiResult.mixednessScore,
        processingStrategy: aiResult.processingStrategy,
        suggestedGroupCount:
          aiResult.comprehensiveAnalysis.suggestedGroups.length,
        comprehensiveAnalysis: aiResult.comprehensiveAnalysis,
      };
    } catch (error: unknown) {
      return this.handleImportError(error, warnings, '[v2.1] ');
    }
  }

  /**
   * 从批量导入项直接创建商品（跳过重新抓取和AI分析）
   * 用于 AI 生成处理器自动发布已处理的商品
   */
  async createProductFromBatchItem(
    data: CreateFromBatchItemInput,
  ): Promise<ImportFromWeidianResultDto> {
    const warnings: string[] = [];

    try {
      // 1. 提取 itemId
      const itemId = this.weidianService.extractItemId(data.sourceUrl);
      if (!itemId) {
        throw new BadRequestException('无法从 URL 提取 itemId');
      }

      // 2. 检查是否已存在
      const existingProduct =
        await this.creatorService.findExistingProduct(itemId);
      if (existingProduct) {
        // 如果商品已存在，但有新的 AI 分析数据（如 comprehensiveAnalysis），则更新
        if (
          data.aiData.comprehensiveAnalysis ||
          data.aiData.mixednessScore !== undefined
        ) {
          this.logger.log(
            `商品已存在，更新混合商品分析数据: ${existingProduct.id}`,
          );

          // 构建 splitMetadata
          const splitMetadata: Partial<NonNullable<Product['splitMetadata']>> =
            {
              ...(existingProduct.splitMetadata || {}),
              aiAnalysisSnapshot: data.aiData.comprehensiveAnalysis,
              analysisTimestamp: new Date().toISOString(),
              processingStrategy: data.aiData.processingStrategy,
            };

          // 如果检测到混合商品，更新状态为 pending_review
          const statusUpdate = data.aiData.isMixedProduct
            ? { status: ProductStatus.PENDING_REVIEW }
            : {};

          // 确保 mixednessScore 是有效数字
          const validMixednessScore =
            data.aiData.mixednessScore !== undefined &&
            data.aiData.mixednessScore !== null &&
            !isNaN(data.aiData.mixednessScore)
              ? data.aiData.mixednessScore
              : 0;

          // TypeORM 的 _QueryDeepPartialEntity 无法处理 simple-json 中的 unknown 类型，
          // 需要 as any 绕过（仅限 splitMetadata 字段）
          await this.productRepository.update(existingProduct.id, {
            mixednessScore: validMixednessScore,
            mixednessEvaluated: true,
            potentialMixedProduct: data.aiData.isMixedProduct || false,
            splitMetadata: splitMetadata as any,
            ...statusUpdate,
          });
        }
        return this.dataMapper.buildExistingProductResult(existingProduct);
      }

      // 3. 验证分类
      const primaryCategory =
        await this.creatorService.validateAndGetPrimaryCategory(
          data.aiData.primaryCategoryId,
        );

      // 4. 获取副分类
      const { categories: secondaryCategories } =
        await this.creatorService.getSecondaryCategories(
          data.aiData.primaryCategoryId,
        );

      // 5. 生成 Slug
      const slug = await this.creatorService.generateSlug(
        data.aiData.brandName,
        primaryCategory.slug,
      );

      // 6. 创建商品和 SKU
      this.logger.log(`[createProductFromBatchItem] 创建商品: ${slug}`);

      // v2.1 混合商品状态：混合商品进入待审核
      const productStatus =
        data.status ||
        (data.aiData.isMixedProduct
          ? ProductStatus.PENDING_REVIEW
          : ProductStatus.ACTIVE);
      if (data.aiData.isMixedProduct) {
        this.logger.warn(
          `[createProductFromBatchItem] 检测到混合商品，状态设为: ${productStatus}`,
        );
      }

      const {
        product,
        skus,
        warnings: createWarnings,
      } = await this.creatorService.createProductWithSkus(
        {
          slug,
          title: data.aiData.title,
          originalTitle: data.sourceData.title,
          description: data.aiData.description,
          brandId: data.aiData.brandId,
          aiBrandName: data.aiData.brandName,
          primaryCategoryId: data.aiData.primaryCategoryId,
          secondaryCategories,
          weidianItemId: itemId,
          weidianShopId: data.sourceData.shopId,
          weidianShopName: data.sourceData.shopName,
          sourceUrl: data.sourceUrl,
          weidianRawData: {
            skuInfo: data.sourceData.rawSkuInfo,
            detailDesc: data.sourceData.rawDetailDesc,
          },
          aiAttributes: data.aiData.attributes as Record<string, unknown>,
          mainImage: data.sourceData.mainImage,
          images: data.sourceData.images || [],
          detailImages: data.sourceData.detailImages || [],
          priceMin: data.sourceData.priceMin,
          priceMax: data.sourceData.priceMax,
          status: productStatus,
          isFeatured: false,
          // v2.1 混合商品字段
          mixednessScore: data.aiData.mixednessScore,
          mixednessEvaluated: data.aiData.mixednessScore !== undefined,
          potentialMixedProduct: data.aiData.isMixedProduct ?? false,
          splitMetadata: data.aiData.isMixedProduct
            ? {
                analysisTimestamp: new Date().toISOString(),
                aiAnalysisSnapshot: data.aiData.comprehensiveAnalysis,
                suggestedGroups:
                  (
                    data.aiData.comprehensiveAnalysis as {
                      suggestedGroups?: unknown[];
                    }
                  )?.suggestedGroups || [],
                overallConfidence:
                  (
                    data.aiData.comprehensiveAnalysis as {
                      overallConfidence?: number;
                    }
                  )?.overallConfidence || 0,
                processingStrategy:
                  data.aiData.processingStrategy || 'manual_review',
              }
            : undefined,
        },
        this.dataMapper.mapSourceSkus(data.sourceData.skus || []),
        false, // 不发射事件（批量导入场景）
      );
      warnings.push(...createWarnings);
      await this.brandGovernanceService.syncProductBrandDecision({
        productId: product.id,
        rawBrandName: data.aiData.brandName || data.aiData.aiBrandName,
        matchedBrandId: product.brandId,
        matchConfidence: data.aiData.confidence,
        matchMethod: product.brandId ? 'rule_match' : 'manual',
        resolverType: 'system',
      });

      return this.buildImportResult(
        product,
        skus,
        data.aiData.brandName,
        warnings,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[createProductFromBatchItem] 创建商品失败: ${message}`,
        stack,
      );

      return {
        success: false,
        errors: [message],
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }
  }

  // ========== 私有辅助方法（共用流程） ==========

  /**
   * 提取 itemId、检查重复、抓取微店数据
   * 返回已有商品结果（早期返回）或抓取到的数据
   */
  private async fetchWeidianData(
    dto: ImportFromWeidianDto,
  ): Promise<
    | { itemId: string; weidianData: WeidianNormalizedData }
    | ImportFromWeidianResultDto
  > {
    const itemId = this.extractItemId(dto);

    const existingProduct =
      await this.creatorService.findExistingProduct(itemId);
    if (existingProduct) {
      return this.dataMapper.buildExistingProductResult(existingProduct);
    }

    this.logger.log(`抓取微店商品数据: ${itemId}`);
    const weidianData = await this.weidianService.scrapeItem({
      itemId,
      wdtoken: dto.wdtoken,
      forceRefresh: dto.forceRefresh,
    });

    if (!weidianData) {
      throw new BadRequestException('抓取微店商品数据失败');
    }

    return { itemId, weidianData };
  }

  /**
   * 解析分类、品牌、Slug 等元数据
   */
  private async resolveMetadata(
    dto: ImportFromWeidianDto,
    aiCategorySlug: string | undefined,
    aiBrandName: string | undefined,
  ): Promise<{
    primaryCategoryId: string;
    primaryCategory: Category;
    secondaryCategories: Category[];
    brandResult: BrandProcessingResult;
    slug: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // 分类：优先用户指定 > AI 推荐
    let primaryCategoryId: string | undefined = dto.primaryCategoryId;
    if (!primaryCategoryId && aiCategorySlug) {
      primaryCategoryId =
        await this.aiEnhancerService.resolveCategoryFromSlug(aiCategorySlug);
    }

    if (!primaryCategoryId) {
      throw new BadRequestException(
        '必须提供 primaryCategoryId 或让 AI 自动推荐分类',
      );
    }

    const primaryCategory =
      await this.creatorService.validateAndGetPrimaryCategory(
        primaryCategoryId,
      );

    const { categories: secondaryCategories, warnings: categoryWarnings } =
      await this.creatorService.getSecondaryCategories(
        primaryCategoryId,
        dto.secondaryCategoryIds,
      );
    warnings.push(...categoryWarnings);

    // 品牌
    const brandResult = await this.aiEnhancerService.processBrand(
      dto.brandId,
      dto.brandName || aiBrandName,
      {
        exactMatchOnly: true,
        fallbackToDesign: true,
      },
    );
    warnings.push(...brandResult.warnings);

    // Slug
    const slug = await this.creatorService.generateSlug(
      brandResult.aiBrandName,
      primaryCategory.slug,
    );

    return {
      primaryCategoryId,
      primaryCategory,
      secondaryCategories,
      brandResult,
      slug,
      warnings,
    };
  }

  /**
   * 构建标准导入结果
   */
  private buildImportResult(
    product: Product,
    skus: Sku[],
    brandName: string | undefined,
    warnings: string[],
  ): ImportFromWeidianResultDto {
    return {
      success: true,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        originalTitle: product.originalTitle,
        weidianItemId: product.weidianItemId,
        aiBrandName: brandName,
        primaryCategoryId: product.primaryCategoryId,
        skuCount: skus.length,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        images: product.images,
      },
      skus: skus.map((sku) => ({
        id: sku.id,
        weidianSkuId: sku.weidianSkuId,
        attributes: sku.attributes,
        price: sku.price,
        stock: sku.stock,
      })),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 统一的导入错误处理
   */
  private handleImportError(
    error: unknown,
    warnings: string[],
    logPrefix = '',
  ): ImportFromWeidianResultDto {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`${logPrefix}导入商品失败: ${message}`, stack);

    this.eventEmitter.emit(ProductEvents.IMPORT_FAILED, {
      importId: `import-${Date.now()}`,
      source: 'weidian',
      error: message,
      failedAt: new Date(),
    });

    return {
      success: false,
      errors: [message],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 提取微店 itemId
   */
  private extractItemId(dto: ImportFromWeidianDto): string {
    let itemId = dto.itemId;
    if (dto.url && !itemId) {
      const extracted = this.weidianService.extractItemId(dto.url);
      if (!extracted) {
        throw new BadRequestException('无法从 URL 提取 itemId');
      }
      itemId = extracted;
    }

    if (!itemId) {
      throw new BadRequestException('必须提供 url 或 itemId');
    }

    return itemId;
  }
}
