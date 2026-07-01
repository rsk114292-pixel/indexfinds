import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '../queue.module';
import { WeidianService } from '../../weidian/weidian.service';
import { SkuSplitAnalyzerService } from '../../products/services/sku-split-analyzer.service';
import { SkuSplitService } from '../../products/services/sku-split.service';
import { ProductAIEnhancerService } from '../../products/product-ai-enhancer.service';
import { ProductCreatorService } from '../../products/product-creator.service';
import { BrandsService } from '../../brands/brands.service';
import { CategoriesService } from '../../categories/categories.service';
import type { CategoryAiMatchResult } from '../../categories/categories.service';
import { Category } from '../../categories/entities/category.entity';
import { MeilisearchSyncService } from '../../meilisearch/meilisearch-sync.service';
import { VisualSearchService } from '../../search/visual-search.service';
import { Product } from '../../products/entities/product.entity';
import { BrandGovernanceService } from '../../brands/brand-governance.service';
import {
  SkuSplitItem,
  SkuSplitItemStatus,
} from '../../products/entities/sku-split-item.entity';
import { SkuSplitJobStatus } from '../../products/entities/sku-split-job.entity';
import { ProductStatus } from '../../products/product-status';
import type { WeidianNormalizedData } from '../../weidian/interfaces/thor-api.interface';
import type { CreateSkuData } from '../../products/product-creator.service';

const AI_CONCURRENCY = 20;
const HIGH_CONFIDENCE_FUZZY_SCORE = 180;
const HIGH_CONFIDENCE_FUZZY_GAP = 40;
const HIGH_CONFIDENCE_AI_CONFIDENCE = 0.75;
const CONTEXT_BACKED_FUZZY_SCORE = 140;
const CONTEXT_BACKED_FUZZY_GAP = 20;
const CONTEXT_BACKED_AI_CONFIDENCE = 0.6;

@Processor(QUEUE_NAMES.SKU_SPLIT, { concurrency: 1 })
export class SkuSplitProcessor extends WorkerHost {
  private readonly logger = new Logger(SkuSplitProcessor.name);

  private isWeakAiTitle(title?: string): boolean {
    const normalized = title?.trim();
    if (!normalized) return true;
    if (normalized.length < 8) return true;
    return /^(untitled|product|item)\b/i.test(normalized);
  }

  private isGenericAiTitle(title?: string): boolean {
    const normalized = title?.trim();
    if (!normalized) return true;
    if (this.isWeakAiTitle(normalized)) return true;
    return /^(design|unknown|unidentified|unbranded)\b/i.test(normalized);
  }

  private determineVariantProductStatus(params: {
    aiTitle?: string;
    aiBrandName?: string;
    aiConfidence?: number;
    categoryMatch: CategoryAiMatchResult;
  }): {
    productStatus: ProductStatus;
    reviewReasons: string[];
  } {
    const reviewReasons: string[] = [];
    const fuzzyScore = params.categoryMatch.score ?? 0;
    const fuzzyGap = fuzzyScore - (params.categoryMatch.runnerUpScore ?? 0);
    const hasAcceptableAiConfidence =
      typeof params.aiConfidence !== 'number' ||
      isNaN(params.aiConfidence) ||
      params.aiConfidence >= HIGH_CONFIDENCE_AI_CONFIDENCE;
    const hasAcceptableContextBackedConfidence =
      typeof params.aiConfidence !== 'number' ||
      isNaN(params.aiConfidence) ||
      params.aiConfidence >= CONTEXT_BACKED_AI_CONFIDENCE;
    const isStrongFuzzyMatch =
      params.categoryMatch.matchType === 'fuzzy' &&
      !this.isWeakAiTitle(params.aiTitle) &&
      ((fuzzyScore >= HIGH_CONFIDENCE_FUZZY_SCORE &&
        fuzzyGap >= HIGH_CONFIDENCE_FUZZY_GAP &&
        hasAcceptableAiConfidence) ||
        (params.categoryMatch.resolvedByContext === true &&
          fuzzyScore >= CONTEXT_BACKED_FUZZY_SCORE &&
          fuzzyGap >= CONTEXT_BACKED_FUZZY_GAP &&
          hasAcceptableContextBackedConfidence));

    if (params.categoryMatch.matchType === 'fuzzy' && !isStrongFuzzyMatch) {
      reviewReasons.push('分类仅通过模糊匹配命中');
    }

    if (this.isWeakAiTitle(params.aiTitle)) {
      reviewReasons.push('AI 标题质量不足');
    }

    if (
      typeof params.aiConfidence === 'number' &&
      !isNaN(params.aiConfidence) &&
      params.aiConfidence > 0 &&
      params.aiConfidence < 0.4
    ) {
      reviewReasons.push(`AI 置信度较低 (${params.aiConfidence})`);
    }

    if (!params.aiBrandName && this.isGenericAiTitle(params.aiTitle)) {
      reviewReasons.push('品牌缺失且标题过于泛化');
    }

    return {
      productStatus:
        reviewReasons.length > 0
          ? ProductStatus.PENDING_REVIEW
          : ProductStatus.ACTIVE,
      reviewReasons,
    };
  }

  private classifyVariantFailure(message: string): {
    reasonCode: string;
    actionable: boolean;
    suggestedAction?: string;
  } {
    if (message.includes('无法解析分类')) {
      return {
        reasonCode: 'category_unresolved',
        actionable: true,
        suggestedAction: '补充规范分类或人工确认分类后重试',
      };
    }

    if (message.includes('AI 无法生成可用标题')) {
      return {
        reasonCode: 'ai_title_invalid',
        actionable: true,
        suggestedAction: '检查款式图质量或手动补标题后重试',
      };
    }

    if (message.includes('变体没有款式图片')) {
      return {
        reasonCode: 'missing_image',
        actionable: true,
        suggestedAction: '补充款式图后重试',
      };
    }

    return {
      reasonCode: 'product_create_failed',
      actionable: false,
    };
  }

  constructor(
    @InjectRepository(SkuSplitItem)
    private readonly itemRepository: Repository<SkuSplitItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue,
    private readonly weidianService: WeidianService,
    private readonly analyzerService: SkuSplitAnalyzerService,
    private readonly skuSplitService: SkuSplitService,
    private readonly aiEnhancerService: ProductAIEnhancerService,
    private readonly creatorService: ProductCreatorService,
    private readonly brandsService: BrandsService,
    private readonly brandGovernanceService: BrandGovernanceService,
    private readonly categoriesService: CategoriesService,
    private readonly meilisearchSyncService: MeilisearchSyncService,
    private readonly visualSearchService: VisualSearchService,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: Job<{ jobId: string }>): Promise<void> {
    const { jobId } = job.data;
    this.logger.log(`开始处理拆分任务: ${jobId}`);

    try {
      await this.processJob(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`拆分任务失败: ${jobId} - ${message}`);
      await this.skuSplitService.updateJobStatus(
        jobId,
        SkuSplitJobStatus.FAILED,
        message,
      );
      throw error;
    }
  }

  private async processJob(jobId: string): Promise<void> {
    // 1. 更新状态为 ANALYZING
    await this.skuSplitService.updateJobStatus(
      jobId,
      SkuSplitJobStatus.ANALYZING,
    );

    // 2. 获取 Job 信息和 Items
    const jobDetail = await this.skuSplitService.getJobDetail(jobId);

    // 3. 抓取微店数据
    const normalizedData = await this.weidianService.scrapeItem({
      itemId: jobDetail.weidianItemId,
    });

    // 4. 分析拆分方案（获取 splitDimension 名称）
    const plan = this.analyzerService.analyzeSplitPlan(normalizedData);
    if (!plan) {
      throw new Error('微店数据分析失败：无可拆分的款式维度');
    }

    // 5. 更新状态为 PROCESSING
    await this.skuSplitService.updateJobStatus(
      jobId,
      SkuSplitJobStatus.PROCESSING,
    );

    // 6. 分批并发处理变体（只处理 PENDING，重试时跳过已成功/重复的）
    const items = await this.itemRepository.find({
      where: { jobId, status: SkuSplitItemStatus.PENDING },
      order: { createdAt: 'ASC' },
    });

    const createdProductIds: string[] = [];

    for (let i = 0; i < items.length; i += AI_CONCURRENCY) {
      const batch = items.slice(i, i + AI_CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map((item) =>
          this.processVariant(
            item,
            normalizedData,
            plan.splitDimension,
            jobDetail.productGroupId,
            jobDetail.sourceUrl || '',
            jobDetail.weidianItemId,
          ),
        ),
      );

      // 统计结果
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const item = batch[j];

        if (result.status === 'fulfilled' && result.value) {
          createdProductIds.push(result.value);
          await this.skuSplitService.incrementJobCounter(jobId, 'successCount');
        } else if (result.status === 'fulfilled' && !result.value) {
          // null = duplicate or skipped
        } else {
          const errMsg =
            result.status === 'rejected'
              ? String(result.reason)
              : 'Unknown error';
          this.logger.error(`变体处理失败: ${item.variantValue} - ${errMsg}`);
        }

        await this.skuSplitService.incrementJobCounter(jobId, 'processedCount');
      }

      // 并发 20，无需批次间延迟
    }

    // 7. 完成后批量提交后处理任务
    await this.finalizeJob(jobId, createdProductIds);
  }

  /**
   * 处理单个变体：AI 分析 → 品牌 → 分类 → 创建产品
   * 返回 productId 或 null（重复/跳过）
   */
  private async processVariant(
    item: SkuSplitItem,
    normalizedData: WeidianNormalizedData,
    splitDimensionName: string,
    productGroupId: string,
    sourceUrl: string,
    weidianItemId: string,
  ): Promise<string | null> {
    const log = (event: string, data?: Record<string, unknown>) =>
      this.skuSplitService.appendItemLog(item.id, event, data);
    let latestAiCategorySlug: string | undefined;
    let latestAiTitle: string | undefined;

    // 防御性检查：跳过非 PENDING 状态的 item（重试安全）
    if (item.status === SkuSplitItemStatus.SUCCESS) {
      return item.productId || null;
    }
    if (item.status === SkuSplitItemStatus.DUPLICATE) {
      return null;
    }

    try {
      // 1. 标记为处理中
      await this.itemRepository.update(item.id, {
        status: SkuSplitItemStatus.PROCESSING,
      });
      await log('开始处理');

      // 2. 获取 embedding（优先从 Redis 缓存读取，cache miss 才调 CLIP）
      let variantEmbedding: number[] | undefined;
      if (item.imageUrl) {
        try {
          const cacheKey = `sku-emb:${weidianItemId}:${item.attrId}`;
          const cached = await this.redis.get(cacheKey);

          if (cached) {
            variantEmbedding = JSON.parse(cached);
            await log('读取缓存向量');
          } else if (this.visualSearchService.isAvailable()) {
            const embStart = Date.now();
            variantEmbedding =
              await this.visualSearchService.getImageEmbeddingFromUrl(
                item.imageUrl,
              );
            await log('生成向量（缓存未命中）', {
              ms: Date.now() - embStart,
              dimensions: variantEmbedding.length,
            });
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `变体 embedding 获取失败: ${item.variantValue} - ${errMsg}`,
          );
          await log('向量获取失败', { error: errMsg });
        }
      }

      // 3. AI 分析（单张 SKU 款式图）
      // 去重已在预览阶段由人工审核完成，执行阶段不再重复检查
      if (!item.imageUrl) {
        throw new Error('变体没有款式图片');
      }

      await log('开始 AI 分析');
      const aiResult = await this.aiEnhancerService.analyzeAndEnhance(
        [item.imageUrl],
        '', // 不传微店标题
      );
      latestAiCategorySlug = aiResult.aiCategorySlug;
      latestAiTitle = aiResult.translatedTitle;

      if (this.isWeakAiTitle(aiResult.translatedTitle)) {
        throw new Error('AI 无法生成可用标题');
      }

      await log('AI 分析完成', {
        title: aiResult.translatedTitle,
        brand: aiResult.aiBrandName,
        category: aiResult.aiCategorySlug,
        confidence: aiResult.aiConfidence,
      });

      // 5. 品牌处理：AI 只能从 canonical brand list 中选择，未命中统一回退到 Design
      const brandResult = await this.aiEnhancerService.processBrand(
        aiResult.aiBrandId,
        aiResult.aiBrandName,
        { exactMatchOnly: true, fallbackToDesign: true },
      );
      const brandId = brandResult.brandId;
      const brandName = brandResult.aiBrandName;

      // 6. 分类解析
      const categoryMatch =
        await this.categoriesService.findCanonicalLeafMatchForAiInput({
          slug: aiResult.aiCategorySlug || '',
          contextText: aiResult.translatedTitle,
        });
      if (!categoryMatch) {
        throw new Error(`无法解析分类: AI 返回 "${aiResult.aiCategorySlug}"`);
      }
      let resolvedCategory: Category;
      let allowNonLeafPrimaryCategory = false;
      const extraReviewReasons: string[] = [];

      try {
        resolvedCategory =
          await this.categoriesService.ensureCanonicalLeafCategory(
            categoryMatch.categoryId,
          );
      } catch (error) {
        if (
          error instanceof ConflictException &&
          error.message.includes('仍有子分类')
        ) {
          resolvedCategory =
            await this.categoriesService.ensureCanonicalActiveCategory(
              categoryMatch.categoryId,
            );
          allowNonLeafPrimaryCategory = true;
          extraReviewReasons.push(
            `分类仅命中父类 "${resolvedCategory.slug}"，需人工确认子分类`,
          );
        } else {
          throw error;
        }
      }

      const publishDecision = this.determineVariantProductStatus({
        aiTitle: aiResult.translatedTitle,
        aiBrandName: brandName,
        aiConfidence: aiResult.aiConfidence,
        categoryMatch,
      });
      if (extraReviewReasons.length > 0) {
        publishDecision.reviewReasons.push(...extraReviewReasons);
        publishDecision.productStatus = ProductStatus.PENDING_REVIEW;
      }

      await log('分类解析完成', {
        requestedCategory: aiResult.aiCategorySlug,
        resolvedCategory: resolvedCategory.slug,
        matchType: categoryMatch.matchType,
        score: categoryMatch.score,
        runnerUpScore: categoryMatch.runnerUpScore,
        resolvedByContext: categoryMatch.resolvedByContext,
        allowNonLeafPrimaryCategory,
      });
      await log('发布判定完成', {
        productStatus: publishDecision.productStatus,
        reviewReasons: publishDecision.reviewReasons,
      });

      // 7. 生成 slug
      const categorySlug = resolvedCategory.slug || 'product';

      const slug = await this.creatorService.generateSlug(
        brandName,
        categorySlug,
      );

      // 8. 提取该变体的尺码 SKU 数据
      const attrIdNum = Number(item.attrId);
      const sizeSkus = this.analyzerService.extractVariantSizeSkus(
        normalizedData,
        attrIdNum,
        splitDimensionName,
        Number(item.price),
      );

      const skuData: CreateSkuData[] = sizeSkus.map((s) => ({
        weidianSkuId: s.weidianSkuId,
        attributes: s.attributes,
        skuKey: s.skuKey,
        price: s.price,
        stock: s.stock,
        image: s.image,
      }));

      // 9. 创建产品（emitEvents = false）
      const result = await this.creatorService.createProductWithSkus(
        {
          slug,
          title: aiResult.translatedTitle,
          description: aiResult.translatedDescription,
          mainImage: item.imageUrl,
          images: item.imageUrl ? [item.imageUrl] : [],
          detailImages: normalizedData.detailImages || [],
          brandId,
          aiBrandName: brandName,
          primaryCategoryId: resolvedCategory.id,
          aiAttributes: aiResult.aiAttributes,
          priceMin: item.price,
          priceMax: item.price,
          weidianItemId: undefined,
          weidianShopId: normalizedData.shopId,
          weidianShopName: normalizedData.shopName,
          sourceUrl,
          productGroupId,
          isFromSplit: true,
          splitSourceWeidianId: weidianItemId,
          skuVariantKey: String(item.attrId),
          status: publishDecision.productStatus,
          allowNonLeafPrimaryCategory,
        },
        skuData,
        false, // emitEvents = false
      );
      await this.brandGovernanceService.syncProductBrandDecision({
        productId: result.product.id,
        rawBrandName: aiResult.aiBrandName,
        matchedBrandId: result.product.brandId,
        matchConfidence: aiResult.aiConfidence,
        matchMethod: result.product.brandId ? 'rule_match' : 'manual',
        resolverType: 'system',
      });

      await log('产品创建成功', {
        productId: result.product.id,
        slug: result.product.slug,
        skuCount: skuData.length,
        status: publishDecision.productStatus,
      });

      if (publishDecision.reviewReasons.length > 0) {
        await log('已转入待审核', {
          reasons: publishDecision.reviewReasons,
        });
      }

      // 10. 同步写入变体图 embedding（去重时已生成，直接复用）
      if (variantEmbedding && item.imageUrl) {
        try {
          await this.visualSearchService.saveProductEmbedding(
            result.product.id,
            item.imageUrl,
            0,
            variantEmbedding,
          );
          await log('向量已同步写入');
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `变体 embedding 同步写入失败: ${result.product.id} - ${errMsg}`,
          );
          await log('向量写入失败', { error: errMsg });
        }
      } else if (!variantEmbedding) {
        await log('向量未生成，将由定时任务补齐');
      }

      // 11. 更新 item 状态
      await this.itemRepository.update(item.id, {
        status: SkuSplitItemStatus.SUCCESS,
        productId: result.product.id,
      });

      this.logger.log(
        `变体创建成功: ${item.variantValue} → ${result.product.slug} (${publishDecision.productStatus})`,
      );

      return result.product.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failure = this.classifyVariantFailure(message);

      if (failure.actionable) {
        await log('待人工处理', {
          actionable: true,
          reasonCode: failure.reasonCode,
          suggestedAction: failure.suggestedAction,
          aiCategorySlug: latestAiCategorySlug,
          aiTitle: latestAiTitle,
        });
      }

      await log('处理失败', { error: message });
      await this.itemRepository.update(item.id, {
        status: SkuSplitItemStatus.FAILED,
        errorMessage: message,
      });
      await this.skuSplitService.incrementJobCounter(item.jobId, 'failedCount');
      this.logger.error(`变体处理失败: ${item.variantValue} - ${message}`);
      return null;
    }
  }

  /**
   * 任务完成后：批量提交 embedding + Meilisearch 同步
   */
  private async finalizeJob(
    jobId: string,
    createdProductIds: string[],
  ): Promise<void> {
    // 确定最终状态
    const jobDetail = await this.skuSplitService.getJobDetail(jobId);
    let finalStatus: SkuSplitJobStatus;

    if (jobDetail.failedCount === 0 && jobDetail.successCount > 0) {
      finalStatus = SkuSplitJobStatus.COMPLETED;
    } else if (jobDetail.successCount > 0) {
      finalStatus = SkuSplitJobStatus.PARTIAL_FAILED;
    } else {
      finalStatus = SkuSplitJobStatus.FAILED;
    }

    await this.skuSplitService.updateJobStatus(jobId, finalStatus);

    // 批量提交后处理任务
    // 注意：变体图 image embedding 已在 processVariant 中同步写入
    // 这里只处理 text embedding（异步）和 Meilisearch 同步
    for (const productId of createdProductIds) {
      // Text embedding — 异步低优先级
      try {
        await this.embeddingQueue.add(
          'product-embedding',
          { productId, embeddingType: 'text' },
          { jobId: `embed-text-${productId}`, priority: 3, delay: 5000 },
        );
      } catch (error) {
        this.logger.warn(
          `Text embedding 任务入队失败: ${productId} - ${error}`,
        );
      }

      // Meilisearch 同步
      try {
        await this.meilisearchSyncService.syncProduct(productId);
      } catch (error) {
        this.logger.warn(`Meilisearch 同步失败: ${productId} - ${error}`);
      }
    }

    this.logger.log(
      `拆分任务完成: ${jobId}, 状态: ${finalStatus}, ` +
        `成功: ${jobDetail.successCount}, 失败: ${jobDetail.failedCount}, ` +
        `重复: ${jobDetail.duplicateCount}`,
    );
  }
}
