import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository, DataSource } from 'typeorm';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { QUEUE_NAMES } from '../queue/queue.module';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import { ProductSplitHistory } from './entities/product-split-history.entity';
import {
  ProductCreatorService,
  CreateProductData,
  CreateSkuData,
} from './product-creator.service';
import { ProductAIEnhancerService } from './product-ai-enhancer.service';
import { ProductSkuService } from './product-sku.service';
import { ProductStatus } from './product-status';
import { WeidianService } from '../weidian/weidian.service';
import { MixedProductQueryService } from './mixed-product-query.service';
import type { ComprehensiveProductAnalysis } from '../ai/ai.types';
import type {
  SkuGroupMapping,
  CustomGroup,
  SplitProductRequest,
  SplitPreviewResult,
  SplitExecutionResult,
  ValidGroup,
} from './dto/mixed-product.types';

@Injectable()
export class MixedProductSplitService {
  private readonly logger = new Logger(MixedProductSplitService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @InjectRepository(ProductSplitHistory)
    private readonly splitHistoryRepository: Repository<ProductSplitHistory>,
    private readonly productCreatorService: ProductCreatorService,
    private readonly productAiEnhancerService: ProductAIEnhancerService,
    private readonly productSkuService: ProductSkuService,
    private readonly weidianService: WeidianService,
    private readonly mixedProductQueryService: MixedProductQueryService,
    private readonly dataSource: DataSource,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue,
  ) {}

  /**
   * 生成拆分预览 - 自动预填 SKU 映射
   */
  async generateSplitPreview(productId: string): Promise<SplitPreviewResult> {
    const { product, skus, splitMetadata } =
      await this.mixedProductQueryService.getMixedProductDetail(productId);

    if (!splitMetadata) {
      throw new BadRequestException('该商品没有 AI 分析数据，无法进行拆分预览');
    }

    if (!product.potentialMixedProduct) {
      throw new BadRequestException('该商品未被标记为混合商品');
    }

    if (
      !splitMetadata.suggestedGroups ||
      splitMetadata.suggestedGroups.length === 0
    ) {
      throw new BadRequestException('AI 分析数据不完整：缺少分组建议');
    }

    if (!splitMetadata.overview || !splitMetadata.overview.mixednessScore) {
      throw new BadRequestException(
        'AI 分析数据不完整：缺少混合度评分。请重新分析该商品。',
      );
    }

    const suggestedMappings = this.autoMapSkusToGroups(
      skus,
      splitMetadata,
      product,
    );

    const groups = splitMetadata.suggestedGroups.map((group) => {
      const groupSkuIds = suggestedMappings
        .filter((m) => m.groupKey === group.groupKey)
        .map((m) => m.skuId);

      return {
        groupKey: group.groupKey,
        brand: group.brand,
        brandSlug: group.brandSlug,
        model: group.model,
        suggestedTitle:
          group.productInfo?.title || `${group.brand} ${group.model}`,
        skuIds: groupSkuIds,
        imageIndexes: group.imageIndexes || [], // 简化模式下可能为空
      };
    });

    return {
      sourceProduct: {
        id: product.id,
        title: product.title,
        weidianItemId: product.weidianItemId || '',
        skuCount: skus.length,
      },
      aiAnalysis: splitMetadata,
      suggestedMappings,
      groups,
    };
  }

  /**
   * 自动将 SKU 映射到分组 - 基于 SKU 图片与 AI 分析结果匹配
   */
  private autoMapSkusToGroups(
    skus: Sku[],
    analysis: ComprehensiveProductAnalysis,
    product: Product,
  ): SkuGroupMapping[] {
    const mappings: SkuGroupMapping[] = [];

    this.logger.debug(
      `开始 SKU 自动映射: ${skus.length} 个 SKU, ${analysis.perImageAnalysis?.length || 0} 个图片分析`,
    );

    let matchedByUrl = 0;
    let matchedByIndex = 0;
    let matchedByImageIndex = 0;
    let matchedByKeyword = 0;
    let defaultAssigned = 0;

    const validGroups =
      analysis.suggestedGroups?.filter((g) => g.groupKey !== 'composite') || [];

    for (const sku of skus) {
      let assignedGroup: string | null = null;

      // 策略 1：通过 SKU 图片匹配
      if (sku.image && analysis.perImageAnalysis?.length > 0) {
        let matchedImage = analysis.perImageAnalysis.find(
          (img) => img.imageUrl === sku.image,
        );

        if (!matchedImage && product.images) {
          const imageIndex = product.images.indexOf(sku.image);
          if (imageIndex !== -1) {
            matchedImage = analysis.perImageAnalysis.find(
              (img) => img.imageIndex === imageIndex,
            );
          }
        }

        if (
          matchedImage &&
          !matchedImage.isComposite &&
          matchedImage.assignedGroupKey !== 'composite'
        ) {
          assignedGroup = matchedImage.assignedGroupKey;
          if (matchedImage.imageUrl) {
            matchedByUrl++;
          } else {
            matchedByIndex++;
          }
        }
      }

      // 策略 1.5：通过分组的 imageIndexes 查找
      if (
        !assignedGroup &&
        sku.image &&
        product.images &&
        validGroups.length > 0
      ) {
        const imageIndex = product.images.indexOf(sku.image);
        if (imageIndex !== -1) {
          for (const group of validGroups) {
            if (group.imageIndexes?.includes(imageIndex)) {
              assignedGroup = group.groupKey;
              matchedByImageIndex++;
              break;
            }
          }
        }
      }

      // 策略 2：通过 SKU 属性名称中的品牌/型号关键词匹配
      if (!assignedGroup && sku.attributes && validGroups.length > 0) {
        const attrValues = Object.values(sku.attributes)
          .join(' ')
          .toLowerCase();
        for (const group of validGroups) {
          const brandLower = group.brand.toLowerCase();
          const modelLower = group.model.toLowerCase();
          if (
            attrValues.includes(brandLower) ||
            attrValues.includes(modelLower)
          ) {
            assignedGroup = group.groupKey;
            matchedByKeyword++;
            break;
          }
        }
      }

      // 策略 3：默认分配到第一个有效分组
      if (!assignedGroup && validGroups.length > 0) {
        assignedGroup = validGroups[0].groupKey;
        defaultAssigned++;
      }

      if (assignedGroup) {
        mappings.push({ skuId: sku.id, groupKey: assignedGroup });
      }
    }

    this.logger.log(
      `SKU 映射完成: URL=${matchedByUrl}, 索引=${matchedByIndex}, 分组索引=${matchedByImageIndex}, 关键词=${matchedByKeyword}, 默认=${defaultAssigned}`,
    );

    if (defaultAssigned > skus.length * 0.5) {
      this.logger.warn(`⚠️ 超过 50% 的 SKU 使用默认分配，建议检查 AI 分析数据`);
    }

    return mappings;
  }

  /**
   * 执行商品拆分
   */
  async executeSplit(
    request: SplitProductRequest,
  ): Promise<SplitExecutionResult> {
    const { productId, skuMappings, customGroups, operatorId } = request;

    const { product, skus, splitMetadata } =
      await this.mixedProductQueryService.getMixedProductDetail(productId);

    if (!splitMetadata) {
      throw new BadRequestException('该商品没有 AI 分析数据，无法进行拆分');
    }

    if (product.status === 'split') {
      throw new ConflictException('该商品已被拆分');
    }

    // 检查并补充店铺信息
    await this.ensureShopInfo(product);

    const finalMappings =
      skuMappings || this.autoMapSkusToGroups(skus, splitMetadata, product);

    // 确定使用的分组
    const validGroups = this.prepareValidGroups(splitMetadata, customGroups);

    if (validGroups.length === 0) {
      throw new BadRequestException('没有有效的分组可以创建产品');
    }

    this.logger.log(`有效分组数: ${validGroups.length}`);

    const productGroupId = uuidv4();

    return this.executeTransactionalSplit(
      product,
      skus,
      splitMetadata,
      validGroups,
      finalMappings,
      productGroupId,
      operatorId,
    );
  }

  /**
   * 确保商品有店铺信息
   */
  private async ensureShopInfo(product: Product): Promise<void> {
    if (
      product.weidianItemId &&
      (!product.weidianShopId || !product.weidianShopName)
    ) {
      this.logger.log(`源产品缺少店铺信息，尝试从缓存/微店获取...`);
      try {
        const shopInfo = await this.weidianService.getShopInfo(
          product.weidianItemId,
        );
        if (shopInfo.shopId || shopInfo.shopName) {
          await this.productRepository.update(product.id, {
            weidianShopId: shopInfo.shopId || product.weidianShopId,
            weidianShopName: shopInfo.shopName || product.weidianShopName,
          });
          product.weidianShopId = shopInfo.shopId || product.weidianShopId;
          product.weidianShopName =
            shopInfo.shopName || product.weidianShopName;
          this.logger.log(`已补充店铺信息: ${shopInfo.shopName}`);
        }
      } catch (error) {
        this.logger.warn(`获取店铺信息失败: ${error.message}`);
      }
    }
  }

  /**
   * 准备有效分组
   */
  private prepareValidGroups(
    splitMetadata: ComprehensiveProductAnalysis,
    customGroups?: CustomGroup[],
  ): ValidGroup[] {
    if (customGroups && customGroups.length > 0) {
      this.logger.log(`使用自定义分组: ${customGroups.length} 个`);

      const originalGroupMap = new Map(
        splitMetadata.suggestedGroups.map((g) => [g.groupKey, g]),
      );

      return customGroups
        .filter((g) => g.groupKey !== 'composite')
        .map((g) => {
          const allImageIndexes: number[] = [];
          const originalKeys = g.originalGroupKeys || [g.groupKey];
          for (const origKey of originalKeys) {
            const origGroup = originalGroupMap.get(origKey);
            if (origGroup?.imageIndexes) {
              allImageIndexes.push(...origGroup.imageIndexes);
            }
          }

          return {
            groupKey: g.groupKey,
            brand: g.brand,
            model: g.model || g.brand,
            suggestedTitle: g.suggestedTitle || `${g.brand} Product`,
            originalGroupKeys: g.originalGroupKeys,
            imageIndexes: [...new Set(allImageIndexes)],
          };
        });
    }

    return splitMetadata.suggestedGroups
      .filter((group) => group.groupKey !== 'composite')
      .map((g) => ({
        groupKey: g.groupKey,
        brand: g.brand,
        model: g.model,
        suggestedTitle: g.productInfo?.title || `${g.brand} ${g.model}`,
        originalGroupKeys: [g.groupKey],
        imageIndexes: g.imageIndexes || [], // 简化模式下可能为空
      }));
  }

  /**
   * 执行事务性拆分
   */
  private async executeTransactionalSplit(
    product: Product,
    skus: Sku[],
    splitMetadata: ComprehensiveProductAnalysis,
    validGroups: ValidGroup[],
    finalMappings: SkuGroupMapping[],
    productGroupId: string,
    operatorId?: string,
  ): Promise<SplitExecutionResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const warnings: string[] = [];
    const createdProducts: SplitExecutionResult['createdProducts'] = [];

    try {
      for (const group of validGroups) {
        const groupSkuMappings = finalMappings.filter(
          (m) => m.groupKey === group.groupKey,
        );
        const groupSkuIds = groupSkuMappings.map((m) => m.skuId);
        const groupSkus = skus.filter((s) => groupSkuIds.includes(s.id));

        if (groupSkus.length === 0) {
          warnings.push(`分组 ${group.groupKey} 没有匹配的 SKU，跳过创建`);
          continue;
        }

        const productData = await this.prepareProductDataFromGroup(
          product,
          group,
          productGroupId,
          splitMetadata,
          groupSkus,
        );

        const skusData = this.prepareSkuDataFromOriginal(groupSkus);

        const result = await this.productCreatorService.createProductWithSkus(
          productData,
          skusData,
          false,
          queryRunner.manager,
        );

        createdProducts.push({
          id: result.product.id,
          slug: result.product.slug,
          title: result.product.title,
          skuCount: result.skus.length,
          groupKey: group.groupKey,
        });

        if (result.warnings.length > 0) {
          warnings.push(...result.warnings);
        }

        this.logger.log(
          `创建拆分商品: ${result.product.slug}, SKU: ${result.skus.length}`,
        );
      }

      // 更新原商品状态
      await queryRunner.manager.update(Product, product.id, {
        status: ProductStatus.SPLIT,
        productGroupId,
      });

      // 创建拆分历史记录
      const splitHistory = this.splitHistoryRepository.create({
        sourceProductId: product.id,
        sourceWeidianItemId: product.weidianItemId || '',
        sourceUrl: product.sourceUrl || '',
        resultProductIds: createdProducts.map((p) => p.id),
        aiAnalysisData: splitMetadata,
        splitStrategy: finalMappings ? 'semi_auto' : 'auto',
        status: 'active',
        operatorId,
      });

      await queryRunner.manager.save(ProductSplitHistory, splitHistory);
      await queryRunner.commitTransaction();

      // 事务提交后的后续处理
      await this.postSplitProcessing(createdProducts);

      this.logger.log(
        `商品 ${product.id} 拆分完成，创建了 ${createdProducts.length} 个新商品`,
      );

      return {
        success: true,
        splitHistoryId: splitHistory.id,
        productGroupId,
        sourceProduct: { id: product.id, newStatus: 'split' },
        createdProducts,
        warnings,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`拆分商品 ${product.id} 失败: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 拆分后的处理：更新价格范围、添加向量生成任务
   */
  private async postSplitProcessing(
    createdProducts: SplitExecutionResult['createdProducts'],
  ): Promise<void> {
    for (const createdProduct of createdProducts) {
      await this.productSkuService.updateProductPriceRange(createdProduct.id);
    }

    for (const createdProduct of createdProducts) {
      await this.embeddingQueue.add(
        'generate-embedding',
        { productId: createdProduct.id },
        { priority: 2 },
      );
      this.logger.log(`📷 已添加向量生成任务: ${createdProduct.id}`);
    }
  }

  /**
   * 从原始 SKU 准备新 SKU 数据
   */
  private prepareSkuDataFromOriginal(skus: Sku[]): CreateSkuData[] {
    return skus.map((sku) => ({
      weidianSkuId: sku.weidianSkuId,
      weidianAttrIds: sku.weidianAttrIds,
      attributes: sku.attributes,
      skuKey: sku.skuKey,
      price: sku.price,
      stock: sku.stock,
      image: sku.image,
    }));
  }

  /**
   * 从分组信息准备新商品数据
   */
  private async prepareProductDataFromGroup(
    sourceProduct: Product,
    group: ValidGroup,
    productGroupId: string,
    analysis: ComprehensiveProductAnalysis,
    groupSkus: Sku[],
  ): Promise<CreateProductData> {
    // 获取 composite 图片索引
    const compositeImageIndexes = new Set(
      (analysis.perImageAnalysis || [])
        .filter((img) => img.isComposite === true)
        .map((img) => img.imageIndex),
    );

    // 从 SKU 获取图片
    const skuImages = groupSkus
      .map((sku) => sku.image)
      .filter((img): img is string => !!img);

    const uniqueSkuImages = [...new Set(skuImages)].filter((img) => {
      const imageIndex = sourceProduct.images?.indexOf(img) ?? -1;
      return imageIndex === -1 || !compositeImageIndexes.has(imageIndex);
    });

    // 从分组获取图片（简化模式下 imageIndexes 可能为空）
    const groupImages = (group.imageIndexes || [])
      .filter((idx) => !compositeImageIndexes.has(idx))
      .map((idx) => sourceProduct.images?.[idx])
      .filter((img): img is string => !!img);

    const finalImages =
      uniqueSkuImages.length > 0
        ? uniqueSkuImages
        : groupImages.length > 0
          ? groupImages
          : sourceProduct.images || [];

    this.logger.log(
      `分组 ${group.groupKey}: SKU图片=${uniqueSkuImages.length}, 分组图片=${groupImages.length}`,
    );

    // 处理品牌
    const brandResult = await this.productAiEnhancerService.processBrand(
      undefined,
      group.brand,
      {
        brandSlug: group.brandSlug,
        exactMatchOnly: true,
        fallbackToDesign: true,
      },
    );

    // 获取原始分组信息
    const originalGroupKey = group.originalGroupKeys?.[0] || group.groupKey;
    const originalGroup = analysis.suggestedGroups.find(
      (g) => g.groupKey === originalGroupKey,
    );
    const productInfo = originalGroup?.productInfo;

    // 生成 slug
    const categorySlug =
      productInfo?.category || sourceProduct.primaryCategory?.slug || 'product';
    const slug = await this.productCreatorService.generateSlug(
      brandResult.aiBrandName,
      categorySlug,
    );

    return {
      slug,
      title: group.suggestedTitle,
      originalTitle: sourceProduct.originalTitle,
      description:
        productInfo?.description ||
        `${brandResult.aiBrandName || group.brand} ${group.model} product`,
      brandId: brandResult.brandId,
      aiBrandName: brandResult.aiBrandName,
      primaryCategoryId: sourceProduct.primaryCategoryId,
      secondaryCategories: sourceProduct.secondaryCategories,
      weidianItemId: sourceProduct.weidianItemId,
      weidianShopId: sourceProduct.weidianShopId,
      weidianShopName: sourceProduct.weidianShopName,
      sourceUrl: sourceProduct.sourceUrl,
      aiAttributes:
        (productInfo?.attributes as unknown as Record<string, unknown>) || {},
      mainImage: finalImages[0] || sourceProduct.mainImage,
      images: finalImages.length > 0 ? finalImages : sourceProduct.images,
      detailImages: sourceProduct.detailImages,
      status: ProductStatus.ACTIVE,
      mixednessScore: 0,
      mixednessEvaluated: true,
      potentialMixedProduct: false,
      productGroupId,
      isFromSplit: true,
      splitSourceWeidianId: sourceProduct.weidianItemId || undefined,
      skuVariantKey: group.groupKey,
      splitSourceUrl: sourceProduct.sourceUrl,
      splitMetadata: {
        analysisTimestamp: new Date().toISOString(),
        suggestedGroups: [group],
        overallConfidence: analysis.overallConfidence,
        processingStrategy: 'split_products',
      },
    };
  }
}
