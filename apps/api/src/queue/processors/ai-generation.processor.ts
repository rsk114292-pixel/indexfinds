import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QUEUE_NAMES } from '../queue.module';
import { AIService } from '../../ai/ai.service';
import { BatchService } from '../../batch/batch.service';
import { BatchJobItemStatus } from '../../batch/entities/batch-job-item.entity';
import {
  BatchErrorCode,
  BatchProcessingError,
  isRetryableError,
} from '../../batch/errors/batch.errors';
import { BrandsService } from '../../brands/brands.service';
import { CategoriesService } from '../../categories/categories.service';
import { ProductsService } from '../../products/products.service';
import { ProductAIEnhancerService } from '../../products/product-ai-enhancer.service';
import { ProductStatus } from '../../products/product-status';
import { MeilisearchSyncService } from '../../meilisearch/meilisearch-sync.service';
import { VisualSearchService } from '../../search/visual-search.service';
import { SkuAttributeHint } from '../../ai/ai.types';
import { correctBrandByTitle } from '../../brands/brand-correction';

export interface AiGenerationJobData {
  jobId: string;
  itemId: string;
}

// AI 分析可能需要较长时间（尤其是两阶段分析 50+ 图片）
// lockDuration: 任务锁定时间，超过此时间未完成会被认为 stalled
// 并发 3，平衡处理速度与 API 限流
@Processor(QUEUE_NAMES.AI_GENERATION, {
  concurrency: 3,
  lockDuration: 300000, // 300秒（5分钟），两阶段分析 50+ 图片需要更长时间
})
export class AiGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGenerationProcessor.name);

  constructor(
    private readonly aiService: AIService,
    private readonly batchService: BatchService,
    private readonly brandsService: BrandsService,
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly aiEnhancerService: ProductAIEnhancerService,
    private readonly meilisearchSyncService: MeilisearchSyncService,
    private readonly visualSearchService: VisualSearchService,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<AiGenerationJobData>): Promise<void> {
    const { jobId, itemId } = job.data;

    // 防御性检查：itemId 必须是有效的非空字符串
    if (!itemId || itemId === 'undefined' || itemId === 'null') {
      this.logger.error(
        `Invalid itemId in AI generation job: ${JSON.stringify(job.data)}`,
      );
      return;
    }

    this.logger.log(`Generating AI content for item ${itemId}`);

    try {
      const item = await this.batchService.getItem(itemId);
      if (!item) {
        this.logger.error(`Item ${itemId} not found in database, skipping`);
        return;
      }

      // 跳过已处于终态的 item（防止重复处理）
      const terminalStatuses = [
        BatchJobItemStatus.PUBLISHED,
        BatchJobItemStatus.SKIPPED,
        BatchJobItemStatus.CANCELLED,
      ];
      if (terminalStatuses.includes(item.status)) {
        this.logger.log(
          `Item ${itemId} is already in terminal state (${item.status}), skipping`,
        );
        return;
      }

      if (!item.sourceData) {
        this.logger.error(
          `Item ${itemId} has no sourceData (status: ${item.status}), skipping...`,
        );
        await this.batchService.updateItemStatus(
          itemId,
          BatchJobItemStatus.FAILED,
          { errorMessage: 'Source data missing, please re-import' },
        );
        return;
      }

      // 取出批量导入阶段缓存的主图 embedding（去重时生成的）
      const cachedMainImageEmbedding: number[] | undefined =
        item.aiGeneratedData?.mainImageEmbedding;

      await this.batchService.updateItemStatus(
        itemId,
        BatchJobItemStatus.GENERATING,
      );
      await this.batchService.appendLog(itemId, '开始 AI 分析');

      const allImages = Array.isArray(item.sourceData?.images)
        ? item.sourceData.images
        : [];
      const detailImages = Array.isArray(item.sourceData?.detailImages)
        ? item.sourceData.detailImages
        : [];
      const mainImage = item.sourceData?.mainImage;

      // 只用SKU图片进行混合商品分析（排除封面主图和详情图）
      // 封面主图通常是商品展示图，不一定反映所有SKU的品牌
      // 详情图通常是尺码表、说明等，会干扰品牌识别
      let skuImages = mainImage
        ? allImages.filter((img) => img !== mainImage)
        : allImages;

      // 保底机制：如果没有SKU图片，使用封面图或详情图
      if (skuImages.length === 0) {
        if (mainImage) {
          skuImages = [mainImage];
          this.logger.warn(
            `Item ${itemId}: No SKU images found, using main image as fallback`,
          );
        } else if (detailImages.length > 0) {
          skuImages = detailImages.slice(0, 5);
          this.logger.warn(
            `Item ${itemId}: No SKU images found, using ${skuImages.length} detail images as fallback`,
          );
        }
      }

      if (skuImages.length === 0) {
        throw new Error('没有可用的分析图片，请检查商品图片数据');
      }

      this.logger.log(
        `Item ${itemId}: ${allImages.length} total images, ${skuImages.length} SKU images (excluded: 1 cover + ${detailImages.length} detail)`,
      );

      // 构建 SKU 提示
      const skuHints: SkuAttributeHint[] = (item.sourceData?.skus || [])
        .map((sku: { attributes?: Record<string, string> }, index: number) => {
          const attrValues = sku.attributes
            ? Object.values(sku.attributes).join(' ')
            : '';
          if (!attrValues) return null;
          return { index, name: attrValues };
        })
        .filter(
          (hint: SkuAttributeHint | null): hint is SkuAttributeHint =>
            hint !== null,
        );

      // SKU 图片少（<=3）时走简化的单商品分析，避免对 1-3 张图跑完整的混合商品检测
      // 同时补充 detailImages 提升品牌/分类识别准确度
      const SIMPLE_ANALYSIS_THRESHOLD = 3;
      const useSimpleAnalysis = skuImages.length <= SIMPLE_ANALYSIS_THRESHOLD;

      let comprehensiveResult;

      if (useSimpleAnalysis) {
        // 补充 detailImages（取前 5 张，避免尾部的尺码表/购前说明）
        const supplementImages = detailImages.slice(0, 5);
        const analysisImages = [
          ...new Set([...skuImages, ...supplementImages]),
        ].slice(0, 8);

        this.logger.log(
          `Item ${itemId}: SKU images <= ${SIMPLE_ANALYSIS_THRESHOLD}, using simple analysis with ${analysisImages.length} images (${skuImages.length} SKU + ${supplementImages.length} detail)`,
        );

        const simpleResult = await this.aiEnhancerService.analyzeAndEnhance(
          analysisImages,
          item.sourceData?.title || 'Untitled Product',
        );

        // 构造兼容 ComprehensiveEnhancementResult 的返回值
        comprehensiveResult = {
          ...simpleResult,
          comprehensiveAnalysis: {
            overview: {
              totalImages: analysisImages.length,
              mixednessScore: {
                brandDiversity: 0,
                modelDiversity: 0,
                visualConsistency: 1,
                overallScore: 0,
              },
              isRecommendedToSplit: false,
              detectedBrands: simpleResult.aiBrandName
                ? [simpleResult.aiBrandName]
                : [],
              detectedModels: [],
            },
            perImageAnalysis: [],
            suggestedGroups: [
              {
                groupKey: 'main',
                brand: simpleResult.aiBrandName || 'Unknown',
                model: simpleResult.translatedTitle,
                imageIndexes: analysisImages.map((_, i) => i),
                estimatedSkuCount: item.sourceData?.skus?.length || 1,
                groupConfidence: simpleResult.aiConfidence,
                productInfo: {
                  title: simpleResult.translatedTitle,
                  description: simpleResult.translatedDescription || '',
                  category: simpleResult.aiCategorySlug || '',
                  attributes: simpleResult.aiAttributes,
                },
              },
            ],
            overallConfidence: simpleResult.aiConfidence,
            warnings: simpleResult.warnings,
          },
          processingStrategy: 'single_product' as const,
          isMixedProduct: false,
          mixednessScore: 0,
        };
      } else {
        // 使用 v2.1 综合分析（含混合商品检测）
        this.logger.log(
          `Starting comprehensive analysis (v2.1) for item ${itemId} with ${skuImages.length} SKU images...`,
        );
        comprehensiveResult =
          await this.aiEnhancerService.analyzeAndEnhanceComprehensive(
            skuImages,
            skuHints,
            item.sourceData?.title || 'Untitled Product',
          );
      }

      // 提取分析结果
      const aiResult = {
        title: comprehensiveResult.translatedTitle,
        description: comprehensiveResult.translatedDescription,
        brandName: comprehensiveResult.aiBrandName,
        category: comprehensiveResult.aiCategorySlug,
        attributes: comprehensiveResult.aiAttributes,
        confidence: comprehensiveResult.aiConfidence,
      };

      // 混合商品检测结果
      const mixedProductInfo = {
        isMixedProduct: comprehensiveResult.isMixedProduct,
        mixednessScore: comprehensiveResult.mixednessScore,
        processingStrategy: comprehensiveResult.processingStrategy,
        suggestedGroupCount:
          comprehensiveResult.comprehensiveAnalysis.suggestedGroups.length,
      };

      this.logger.log(
        `AI Result for item ${itemId}: ${JSON.stringify({
          title: aiResult.title,
          confidence: aiResult.confidence,
          brandName: aiResult.brandName,
          category: aiResult.category,
          ...mixedProductInfo,
        })}`,
      );

      await this.batchService.appendLog(itemId, 'AI 分析完成', {
        title: aiResult.title,
        brandName: aiResult.brandName,
        category: aiResult.category,
        confidence: aiResult.confidence,
        isMixedProduct: mixedProductInfo.isMixedProduct,
        mixednessScore: mixedProductInfo.mixednessScore,
        processingStrategy: mixedProductInfo.processingStrategy,
        suggestedGroupCount: mixedProductInfo.suggestedGroupCount,
        skuImageCount: skuImages.length,
      });

      // 🆕 如果是混合商品，记录警告
      if (mixedProductInfo.isMixedProduct) {
        this.logger.warn(`⚠️ Item ${itemId} detected as MIXED PRODUCT:`);
        this.logger.warn(
          `   - Mixedness Score: ${(mixedProductInfo.mixednessScore * 100).toFixed(0)}%`,
        );
        this.logger.warn(
          `   - Processing Strategy: ${mixedProductInfo.processingStrategy}`,
        );
        this.logger.warn(
          `   - Suggested Groups: ${mixedProductInfo.suggestedGroupCount}`,
        );
      }

      // 品牌修正：当 AI 输出母品牌但标题包含子品牌关键词时，修正为子品牌
      const correctedBrandName = correctBrandByTitle(
        aiResult.brandName || 'unknown',
        aiResult.title || '',
      );
      if (correctedBrandName !== aiResult.brandName) {
        this.logger.log(
          `🔄 Brand corrected: "${aiResult.brandName}" → "${correctedBrandName}" (based on title)`,
        );
      }

      // 绑定 canonical brand，未命中时回退到 Design
      const brandResolution =
        await this.resolveCanonicalBrand(correctedBrandName);
      const brandId = brandResolution.brandId;
      const resolvedBrandName = brandResolution.brandName;

      // 查找分类
      const primaryCategoryId = await this.findCategoryId(
        aiResult.category || '',
      );

      // 生成 slug（即使还没发布也需要预生成）
      // 优先使用品牌名，如果没有则使用分类名作为前缀
      let categorySlug = 'product';
      if (primaryCategoryId) {
        try {
          const cat = await this.categoriesService.findOne(primaryCategoryId);
          categorySlug = cat?.slug || 'product';
        } catch {
          // 分类不存在，使用默认值
        }
      }

      const brandSlugPart = resolvedBrandName
        ? resolvedBrandName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
        : categorySlug; // 如果没有品牌名，使用分类名作为前缀

      const previewSlug = `${brandSlugPart}-${categorySlug}-${Date.now().toString(36)}`;

      const aiGeneratedData = {
        title: aiResult.title,
        slug: previewSlug, // 预生成 slug，发布时会替换为最终版本
        description: aiResult.description,
        brandName: resolvedBrandName,
        aiBrandName: aiResult.brandName, // 保留 AI 原始输出供追溯
        brandId: brandId || undefined,
        category: aiResult.category,
        primaryCategoryId: primaryCategoryId || undefined,
        attributes: aiResult.attributes,
        confidence: aiResult.confidence,
        // v2.1 混合商品检测信息
        isMixedProduct: mixedProductInfo.isMixedProduct,
        mixednessScore: mixedProductInfo.mixednessScore,
        processingStrategy: mixedProductInfo.processingStrategy,
        suggestedGroupCount: mixedProductInfo.suggestedGroupCount,
        comprehensiveAnalysis: comprehensiveResult.comprehensiveAnalysis,
      };

      this.logger.log(
        `AI data enriched for item ${itemId}: brandId=${brandId}, categoryId=${primaryCategoryId}`,
      );
      await this.batchService.saveAiGeneratedData(itemId, aiGeneratedData);
      this.logger.log(`AI generated data saved for item ${itemId}`);

      // 自动发布商品（如果有必要的数据）
      if (primaryCategoryId) {
        try {
          this.logger.log(`🚀 Auto-publishing item ${itemId}...`);
          this.logger.log(`  📂 categoryId: ${primaryCategoryId}`);
          this.logger.log(`  🏷️  brandId: ${brandId || 'null'}`);
          this.logger.log(
            `  🎨 aiAttributes: ${JSON.stringify(aiResult.attributes)}`,
          );

          await this.batchService.updateItemStatus(
            itemId,
            BatchJobItemStatus.APPROVED,
          );

          // 🆕 根据混合商品策略决定状态
          let autoStatus = this.aiEnhancerService.determineStatusByMixedness(
            aiResult.confidence,
            mixedProductInfo.isMixedProduct,
            mixedProductInfo.processingStrategy,
          );
          this.logger.log(
            `📊 Auto status determined: ${autoStatus} (isMixed=${mixedProductInfo.isMixedProduct}, strategy=${mixedProductInfo.processingStrategy})`,
          );

          // 数据质量验证：ACTIVE 状态需要满足基本数据完整性
          if (autoStatus === ProductStatus.ACTIVE) {
            const qualityIssues: string[] = [];

            const title = aiResult.title;
            if (
              !title ||
              title === 'Untitled Product' ||
              title.trim().length < 4
            ) {
              qualityIssues.push(`标题无效: "${title || 'empty'}"`);
            }

            const hasImage =
              item.sourceData?.mainImage ||
              (item.sourceData?.images?.length ?? 0) > 0;
            if (!hasImage) {
              qualityIssues.push('缺少商品图片');
            }

            if (!item.sourceData?.skus?.length) {
              qualityIssues.push('缺少 SKU 数据');
            }

            const hasPrice =
              (item.sourceData?.priceMin ?? 0) > 0 ||
              (item.sourceData?.priceMax ?? 0) > 0;
            if (!hasPrice) {
              qualityIssues.push('价格无效');
            }

            if (qualityIssues.length > 0) {
              this.logger.warn(
                `⚠️ Item ${itemId} 数据质量不足，降级到待审核: ${qualityIssues.join(', ')}`,
              );
              autoStatus = ProductStatus.PENDING_REVIEW;
              await this.batchService.appendLog(
                itemId,
                '数据质量检查未通过，降级到待审核',
                { issues: qualityIssues },
              );
            }
          }

          // 使用 createProductFromBatchItem 直接创建商品（跳过重复抓取和AI分析）
          const publishResult =
            await this.productsService.createProductFromBatchItem({
              sourceUrl: item.sourceUrl,
              sourceData: {
                title: item.sourceData?.title,
                images: item.sourceData?.images || [],
                detailImages: item.sourceData?.detailImages || [],
                mainImage: item.sourceData?.mainImage,
                priceMin: item.sourceData?.priceMin,
                priceMax: item.sourceData?.priceMax,
                skus: item.sourceData?.skus || [],
                rawSkuInfo: item.sourceData?.rawSkuInfo,
                rawDetailDesc: item.sourceData?.rawDetailDesc,
                // 店铺信息
                shopId: item.sourceData?.shopId,
                shopName: item.sourceData?.shopName,
              },
              aiData: {
                title: aiResult.title,
                description: aiResult.description,
                brandId: brandId || undefined,
                brandName: resolvedBrandName || undefined,
                primaryCategoryId,
                attributes: aiResult.attributes,
                // v2.1 混合商品信息
                mixednessScore: mixedProductInfo.mixednessScore,
                isMixedProduct: mixedProductInfo.isMixedProduct,
                processingStrategy: mixedProductInfo.processingStrategy,
                comprehensiveAnalysis:
                  comprehensiveResult.comprehensiveAnalysis,
              },
              status: autoStatus,
            });

          this.logger.log(
            `📥 Publish result:`,
            JSON.stringify(
              {
                success: publishResult.success,
                hasProduct: !!publishResult.product,
                productId: publishResult.product?.id,
                errors: publishResult.errors,
                warnings: publishResult.warnings,
              },
              null,
              2,
            ),
          );

          if (publishResult.success && publishResult.product) {
            await this.batchService.saveAiGeneratedData(itemId, {
              ...aiGeneratedData,
              slug: publishResult.product.slug,
            });
            await this.batchService.updateItemStatus(
              itemId,
              BatchJobItemStatus.PUBLISHED,
              {
                productId: publishResult.product.id,
              },
            );
            this.logger.log(
              `✅ Item ${itemId} auto-published successfully as product ${publishResult.product.id}`,
            );
            await this.batchService.appendLog(itemId, '产品创建成功', {
              productId: publishResult.product.id,
              status: autoStatus,
            });

            // 同步写入主图 embedding（去重阶段已生成，直接复用）
            if (cachedMainImageEmbedding && item.sourceData?.mainImage) {
              try {
                await this.visualSearchService.saveProductEmbedding(
                  publishResult.product.id,
                  item.sourceData.mainImage,
                  0,
                  cachedMainImageEmbedding,
                );
                this.logger.log(
                  `📷 主图 embedding 同步写入: ${publishResult.product.id}`,
                );
              } catch (embError) {
                this.logger.warn(
                  `主图 embedding 写入失败: ${embError instanceof Error ? embError.message : embError}`,
                );
              }
            }

            // 异步队列处理画廊图 + text embedding（主图已同步写入）
            await this.embeddingQueue.add(
              'product-embedding',
              {
                productId: publishResult.product.id,
                embeddingType: cachedMainImageEmbedding ? 'both' : 'both',
              },
              {
                jobId: `embed-${publishResult.product.id}`,
                priority: 2,
              },
            );
            await this.batchService.appendLog(itemId, '向量生成已加入队列');

            // 🔍 立即同步到 Meilisearch（避免 5 分钟补偿同步延迟）
            try {
              await this.meilisearchSyncService.syncProduct(
                publishResult.product.id,
              );
              this.logger.log(
                `🔍 Meilisearch synced for product ${publishResult.product.id}`,
              );
            } catch (syncError) {
              // 同步失败不阻塞主流程，补偿同步会兜底
              this.logger.warn(
                `Meilisearch sync failed for product ${publishResult.product.id}: ${syncError instanceof Error ? syncError.message : syncError}`,
              );
            }
          } else {
            const errorMsg =
              publishResult.errors?.join(', ') || 'Unknown publish error';
            this.logger.error(`❌ Publish returned success=false: ${errorMsg}`);
            throw new Error(errorMsg);
          }
        } catch (publishError) {
          const errorMessage =
            publishError instanceof Error
              ? publishError.message
              : String(publishError);
          const errorStack =
            publishError instanceof Error ? publishError.stack : undefined;

          this.logger.error(
            `❌ Auto-publish failed for ${itemId}: ${errorMessage}`,
          );
          if (errorStack) {
            this.logger.error(`📍 Error stack:`, errorStack);
          }

          // 发布失败，进入审核状态，并持久化错误信息
          await this.batchService.updateItemStatus(
            itemId,
            BatchJobItemStatus.REVIEW,
            {
              errorMessage: `自动发布失败: ${errorMessage}`,
            },
          );
          await this.batchService.appendLog(itemId, '自动发布失败，进入审核', {
            error: errorMessage,
          });
          this.logger.log(
            `⚠️  Item ${itemId} moved to review due to publish error: ${errorMessage}`,
          );
        }
      } else {
        // 缺少必要数据，进入审核状态
        await this.batchService.updateItemStatus(
          itemId,
          BatchJobItemStatus.REVIEW,
        );
        await this.batchService.appendLog(itemId, '进入待审核：缺少必要数据', {
          primaryCategoryId: primaryCategoryId || null,
          brandId: brandId || null,
          aiTitle: aiResult.title,
          aiConfidence: aiResult.confidence,
        });
        this.logger.warn(`⚠️  Item ${itemId} moved to review - missing data:`);
        this.logger.warn(
          `  - primaryCategoryId: ${primaryCategoryId || 'MISSING'}`,
        );
        this.logger.warn(`  - brandId: ${brandId || 'null (optional)'}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`AI generation failed for ${itemId}: ${errorMessage}`);
      await this.batchService.appendLog(itemId, 'AI 生成失败', {
        error: errorMessage,
        attemptsMade: job.attemptsMade,
      });

      // 判断是否可重试
      const canRetry = isRetryableError(error);
      const attemptsRemaining =
        (job.opts.attempts || 3) - (job.attemptsMade || 0) - 1;

      if (canRetry && attemptsRemaining > 0) {
        // 可重试且还有重试次数，抛出错误让 BullMQ 重试
        this.logger.warn(
          `🔄 Item ${itemId} will retry (${attemptsRemaining} attempts remaining)`,
        );
        throw error;
      }

      // 不可重试或重试次数用尽，标记为失败
      const errorCode =
        error instanceof BatchProcessingError
          ? error.code
          : BatchErrorCode.UNKNOWN_ERROR;

      await this.batchService.updateItemStatus(
        itemId,
        BatchJobItemStatus.FAILED,
        {
          errorMessage: `[${errorCode}] ${errorMessage}${
            job.attemptsMade > 0 ? ` (重试${job.attemptsMade}次后失败)` : ''
          }`,
        },
      );
    } finally {
      const statusMap = await this.batchService.updateJobProgress(jobId);
      await this.batchService.checkAndCompleteJob(jobId, statusMap);
    }
  }

  /**
   * 解析 canonical 品牌；未命中时统一回退到 Design
   */
  private async resolveCanonicalBrand(brandName: string): Promise<{
    brandId: string | null;
    brandName: string | null;
  }> {
    this.logger.log(`🔍 resolveCanonicalBrand called with: "${brandName}"`);

    try {
      const result = await this.aiEnhancerService.processBrand(
        undefined,
        brandName,
        {
          exactMatchOnly: true,
          fallbackToDesign: true,
        },
      );

      return {
        brandId: result.brandId || null,
        brandName: result.aiBrandName || null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to resolve canonical brand "${brandName}": ${errorMessage}`,
      );

      const designBrand = await this.brandsService.findDesignFallbackBrand();
      return {
        brandId: designBrand?.id || null,
        brandName: designBrand?.name || null,
      };
    }
  }

  /**
   * 查找分类 ID（委托给 CategoriesService 共享方法）
   */
  private async findCategoryId(slug: string): Promise<string | null> {
    const categoryId =
      await this.categoriesService.findCategoryIdByAiSlug(slug);
    if (categoryId) {
      try {
        const category =
          await this.categoriesService.ensureCanonicalLeafCategory(categoryId);
        this.logger.log(
          `Found canonical leaf category for slug "${slug}": ${category.id} (${category.slug})`,
        );
        return category.id;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Category "${slug}" resolved to non-canonical or non-leaf category and was rejected: ${message}`,
        );
        return null;
      }
    }

    if (slug) {
      this.logger.warn(`Category not found for slug: "${slug}"`);
    }
    return null;
  }
}
