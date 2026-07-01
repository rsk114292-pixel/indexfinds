import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import Redis from 'ioredis';
import { WeidianService } from '../../weidian/weidian.service';
import { SkuSplitAnalyzerService } from './sku-split-analyzer.service';
import { UnifiedDuplicateCheckService } from './unified-duplicate-check.service';
import {
  SkuSplitJob,
  SkuSplitJobStatus,
} from '../entities/sku-split-job.entity';
import {
  SkuSplitItem,
  SkuSplitItemStatus,
} from '../entities/sku-split-item.entity';
import {
  SkuSplitBatch,
  SkuSplitBatchStatus,
} from '../entities/sku-split-batch.entity';
import {
  SkuSplitBatchItem,
  SkuSplitBatchItemStatus,
} from '../entities/sku-split-batch-item.entity';
import { QUEUE_NAMES } from '../../queue/queue.module';
import type {
  SkuSplitPlanResponse,
  SkuSplitJobResponse,
  SkuSplitJobDetailResponse,
  SkuSplitListResponse,
  SkuSplitAutoBatchResponse,
  SkuSplitAutoBatchDetailResponse,
  SkuSplitAutoBatchRetryResponse,
  SkuVariantPreview,
  VariantDuplicateInfo,
  SkuSplitItemResponse,
  SkuSplitFailureReasonStat,
  SkuSplitPublishDecisionStats,
  ProcessingLogEntry,
} from '../dto/sku-split.dto';

const FAILURE_REASON_LABELS: Record<string, string> = {
  category_unresolved: '分类无法解析',
  ai_title_invalid: 'AI 标题不可用',
  missing_image: '缺少款式图',
  product_create_failed: '创建商品失败',
  split_job_failed: '拆分子任务失败',
  split_job_partial_failed: '拆分子任务部分失败',
  unknown: '未知错误',
};

@Injectable()
export class SkuSplitService {
  private readonly logger = new Logger(SkuSplitService.name);

  constructor(
    @InjectRepository(SkuSplitJob)
    private readonly jobRepository: Repository<SkuSplitJob>,
    @InjectRepository(SkuSplitItem)
    private readonly itemRepository: Repository<SkuSplitItem>,
    @InjectRepository(SkuSplitBatch)
    private readonly batchRepository: Repository<SkuSplitBatch>,
    @InjectRepository(SkuSplitBatchItem)
    private readonly batchItemRepository: Repository<SkuSplitBatchItem>,
    @InjectQueue(QUEUE_NAMES.SKU_SPLIT)
    private readonly skuSplitQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SKU_SPLIT_BATCH)
    private readonly skuSplitBatchQueue: Queue,
    private readonly weidianService: WeidianService,
    private readonly analyzerService: SkuSplitAnalyzerService,
    private readonly duplicateCheckService: UnifiedDuplicateCheckService,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  private embeddingCacheKey(weidianItemId: string, attrId: number): string {
    return `sku-emb:${weidianItemId}:${attrId}`;
  }

  private readonly EMBEDDING_CACHE_TTL = 3600; // 1 小时
  private readonly PREFETCH_CACHE_TTL = 3600; // 1 小时

  // 跨请求共享的 CLIP 限流器，全局串行避免 429
  private readonly clipLimiter = pLimit(1);

  private getFailureReasonLabel(code?: string): string | undefined {
    if (!code) return undefined;
    return FAILURE_REASON_LABELS[code] || FAILURE_REASON_LABELS.unknown;
  }

  private inferFailureReasonFromMessage(message?: string | null): {
    code?: string;
    actionable: boolean;
    suggestedAction?: string;
  } {
    const normalized = message || '';
    if (normalized.includes('无法解析分类')) {
      return {
        code: 'category_unresolved',
        actionable: true,
        suggestedAction: '补充规范分类或人工确认分类后重试',
      };
    }
    if (normalized.includes('AI 无法生成可用标题')) {
      return {
        code: 'ai_title_invalid',
        actionable: true,
        suggestedAction: '检查款式图质量或手动补标题后重试',
      };
    }
    if (normalized.includes('变体没有款式图片')) {
      return {
        code: 'missing_image',
        actionable: true,
        suggestedAction: '补充款式图后重试',
      };
    }
    if (normalized.includes('拆分任务部分失败')) {
      return {
        code: 'split_job_partial_failed',
        actionable: true,
        suggestedAction: '仅重试失败链接，系统会自动跳过已成功创建的款式',
      };
    }
    if (normalized.includes('拆分任务失败')) {
      return {
        code: 'split_job_failed',
        actionable: true,
        suggestedAction: '重试失败链接并检查子任务明细中的失败原因',
      };
    }
    if (normalized) {
      return {
        code: 'product_create_failed',
        actionable: false,
      };
    }
    return {
      code: undefined,
      actionable: false,
    };
  }

  private extractItemInsights(
    item: Pick<SkuSplitItem, 'status' | 'errorMessage' | 'processingLog'>,
  ): {
    publishDecision: 'active' | 'pending_review' | null;
    actionable: boolean;
    failureReasonCode?: string;
    failureReasonLabel?: string;
    suggestedAction?: string;
  } {
    const logs = (item.processingLog || []) as ProcessingLogEntry[];
    const publishEvent = [...logs]
      .reverse()
      .find((entry) => entry.event === '发布判定完成');
    const manualActionEvent = [...logs]
      .reverse()
      .find((entry) => entry.event === '待人工处理');

    const publishDecisionRaw = publishEvent?.data?.productStatus;
    const publishDecision =
      publishDecisionRaw === 'active' || publishDecisionRaw === 'pending_review'
        ? publishDecisionRaw
        : null;

    const manualReasonCode =
      typeof manualActionEvent?.data?.reasonCode === 'string'
        ? manualActionEvent.data.reasonCode
        : undefined;
    const manualSuggestedAction =
      typeof manualActionEvent?.data?.suggestedAction === 'string'
        ? manualActionEvent.data.suggestedAction
        : undefined;
    const manualActionable = Boolean(manualActionEvent?.data?.actionable);

    if (manualReasonCode) {
      return {
        publishDecision,
        actionable: manualActionable,
        failureReasonCode: manualReasonCode,
        failureReasonLabel: this.getFailureReasonLabel(manualReasonCode),
        suggestedAction: manualSuggestedAction,
      };
    }

    const inferred = this.inferFailureReasonFromMessage(item.errorMessage);
    return {
      publishDecision,
      actionable: inferred.actionable,
      failureReasonCode: inferred.code,
      failureReasonLabel: this.getFailureReasonLabel(inferred.code),
      suggestedAction: inferred.suggestedAction,
    };
  }

  private mapItemResponse(item: SkuSplitItem): SkuSplitItemResponse {
    const insights = this.extractItemInsights(item);
    return {
      id: item.id,
      attrId: item.attrId,
      variantValue: item.variantValue,
      imageUrl: item.imageUrl,
      price: item.price,
      skuCount: item.skuCount,
      status: item.status,
      productId: item.productId,
      errorMessage: item.errorMessage,
      publishDecision: insights.publishDecision,
      actionable: insights.actionable,
      failureReasonCode: insights.failureReasonCode,
      failureReasonLabel: insights.failureReasonLabel,
      suggestedAction: insights.suggestedAction,
      processingLog: item.processingLog || [],
    };
  }

  private summarizeItems(items: SkuSplitItem[]): {
    actionableFailureCount: number;
    publishDecisionStats: SkuSplitPublishDecisionStats;
    failureReasonStats: SkuSplitFailureReasonStat[];
  } {
    let actionableFailureCount = 0;
    const publishDecisionStats: SkuSplitPublishDecisionStats = {
      active: 0,
      pendingReview: 0,
    };
    const failureReasonMap = new Map<string, SkuSplitFailureReasonStat>();

    for (const item of items) {
      const insights = this.extractItemInsights(item);

      if (insights.publishDecision === 'active') {
        publishDecisionStats.active += 1;
      } else if (insights.publishDecision === 'pending_review') {
        publishDecisionStats.pendingReview += 1;
      }

      if (insights.actionable) {
        actionableFailureCount += 1;
      }

      if (
        item.status === SkuSplitItemStatus.FAILED &&
        insights.failureReasonCode
      ) {
        const existing = failureReasonMap.get(insights.failureReasonCode) || {
          code: insights.failureReasonCode,
          label:
            insights.failureReasonLabel ||
            this.getFailureReasonLabel(insights.failureReasonCode) ||
            FAILURE_REASON_LABELS.unknown,
          count: 0,
          actionableCount: 0,
        };
        existing.count += 1;
        if (insights.actionable) {
          existing.actionableCount += 1;
        }
        failureReasonMap.set(insights.failureReasonCode, existing);
      }
    }

    return {
      actionableFailureCount,
      publishDecisionStats,
      failureReasonStats: [...failureReasonMap.values()].sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      ),
    };
  }

  private prefetchDataKey(itemId: string): string {
    return `sku-prefetch:${itemId}`;
  }

  private normalizeAutoBatchUrls(weidianUrls: string[]): string[] {
    return [...new Set(weidianUrls.map((url) => url.trim()).filter(Boolean))];
  }

  private inferAutoBatchFailureStage(
    item: Pick<SkuSplitBatchItem, 'status' | 'splitJobId' | 'processingLog'>,
  ): 'preview' | 'create_job' | 'split_job' | undefined {
    if (item.status !== SkuSplitBatchItemStatus.FAILED) {
      return undefined;
    }
    if (item.splitJobId) {
      return 'split_job';
    }

    const logs = (item.processingLog || []) as ProcessingLogEntry[];
    if (logs.some((entry) => entry.event === '预览完成')) {
      return 'create_job';
    }

    return 'preview';
  }

  private extractAutoBatchItemInsights(
    item: Pick<
      SkuSplitBatchItem,
      'status' | 'splitJobId' | 'errorMessage' | 'processingLog'
    >,
    splitJobItems: SkuSplitItem[] = [],
  ): {
    actionable: boolean;
    failureStage?: 'preview' | 'create_job' | 'split_job';
    failureReasonCode?: string;
    failureReasonLabel?: string;
    failureReasonStats: SkuSplitFailureReasonStat[];
    suggestedAction?: string;
  } {
    const failureStage = this.inferAutoBatchFailureStage(item);

    if (splitJobItems.length > 0) {
      const summary = this.summarizeItems(splitJobItems);
      const firstActionableItem = splitJobItems
        .map((splitItem) => this.extractItemInsights(splitItem))
        .find((splitItem) => splitItem.actionable && splitItem.suggestedAction);
      const primaryReason = summary.failureReasonStats[0];

      return {
        actionable: summary.actionableFailureCount > 0,
        failureStage: failureStage || 'split_job',
        failureReasonCode: primaryReason?.code,
        failureReasonLabel: primaryReason?.label,
        failureReasonStats: summary.failureReasonStats,
        suggestedAction: firstActionableItem?.suggestedAction,
      };
    }

    const inferred = this.inferFailureReasonFromMessage(item.errorMessage);
    const failureReasonCode =
      inferred.code ||
      (failureStage === 'split_job'
        ? 'split_job_failed'
        : failureStage === 'create_job'
          ? 'product_create_failed'
          : undefined);

    return {
      actionable: inferred.actionable,
      failureStage,
      failureReasonCode,
      failureReasonLabel: this.getFailureReasonLabel(failureReasonCode),
      failureReasonStats: failureReasonCode
        ? [
            {
              code: failureReasonCode,
              label:
                this.getFailureReasonLabel(failureReasonCode) ||
                FAILURE_REASON_LABELS.unknown,
              count: 1,
              actionableCount: inferred.actionable ? 1 : 0,
            },
          ]
        : [],
      suggestedAction: inferred.suggestedAction,
    };
  }

  private summarizeAutoBatchItems(
    items: SkuSplitBatchItem[],
    itemsByJob: Map<string, SkuSplitItem[]>,
  ): {
    actionableFailureCount: number;
    publishDecisionStats: SkuSplitPublishDecisionStats;
    failureReasonStats: SkuSplitFailureReasonStat[];
  } {
    let actionableFailureCount = 0;
    const publishDecisionStats: SkuSplitPublishDecisionStats = {
      active: 0,
      pendingReview: 0,
    };
    const failureReasonMap = new Map<string, SkuSplitFailureReasonStat>();

    for (const item of items) {
      const splitJobItems = item.splitJobId
        ? itemsByJob.get(item.splitJobId) || []
        : [];

      if (splitJobItems.length > 0) {
        const summary = this.summarizeItems(splitJobItems);
        actionableFailureCount += summary.actionableFailureCount;
        publishDecisionStats.active += summary.publishDecisionStats.active;
        publishDecisionStats.pendingReview +=
          summary.publishDecisionStats.pendingReview;

        for (const reason of summary.failureReasonStats) {
          const existing = failureReasonMap.get(reason.code) || {
            code: reason.code,
            label: reason.label,
            count: 0,
            actionableCount: 0,
          };
          existing.count += reason.count;
          existing.actionableCount += reason.actionableCount;
          failureReasonMap.set(reason.code, existing);
        }
        continue;
      }

      const insights = this.extractAutoBatchItemInsights(item);
      if (!insights.failureReasonCode) {
        continue;
      }

      if (insights.actionable) {
        actionableFailureCount += 1;
      }

      const existing = failureReasonMap.get(insights.failureReasonCode) || {
        code: insights.failureReasonCode,
        label:
          insights.failureReasonLabel ||
          this.getFailureReasonLabel(insights.failureReasonCode) ||
          FAILURE_REASON_LABELS.unknown,
        count: 0,
        actionableCount: 0,
      };
      existing.count += 1;
      if (insights.actionable) {
        existing.actionableCount += 1;
      }
      failureReasonMap.set(insights.failureReasonCode, existing);
    }

    return {
      actionableFailureCount,
      publishDecisionStats,
      failureReasonStats: [...failureReasonMap.values()].sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      ),
    };
  }

  /**
   * 预加载：抓取微店数据 + 生成向量，缓存到 Redis
   * 不做去重检查（去重必须基于最新 DB 状态，留给 previewSplit）
   */
  async prefetchUrl(weidianUrl: string): Promise<{
    itemId: string;
    variantCount: number;
    cached: boolean;
  }> {
    const itemId = this.weidianService.extractItemId(weidianUrl) || weidianUrl;

    if (!itemId || !/^\d+$/.test(itemId)) {
      throw new BadRequestException('无效的微店链接或 ID');
    }

    // 已缓存则跳过
    const cached = await this.redis.get(this.prefetchDataKey(itemId));
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const plan = this.analyzerService.analyzeSplitPlan(data);
        return {
          itemId,
          variantCount: plan?.variants.length ?? 0,
          cached: true,
        };
      } catch {
        // 缓存数据损坏，重新抓取
      }
    }

    // 抓取微店数据
    const normalizedData = await this.weidianService.scrapeItem({ itemId });

    // 缓存归一化数据
    try {
      await this.redis.set(
        this.prefetchDataKey(itemId),
        JSON.stringify(normalizedData),
        'EX',
        this.PREFETCH_CACHE_TTL,
      );
    } catch {
      // 缓存失败不阻塞
    }

    // 分析拆分方案
    const plan = this.analyzerService.analyzeSplitPlan(normalizedData);
    if (!plan) {
      return { itemId, variantCount: 0, cached: false };
    }

    // prefetch 不做 CLIP 向量生成（CLIP 服务限流严格）
    // 向量留给 previewSplit 阶段按需生成

    return {
      itemId,
      variantCount: plan.variants.length,
      cached: false,
    };
  }

  async createAutoBatch(
    weidianUrls: string[],
  ): Promise<SkuSplitAutoBatchResponse> {
    const normalizedUrls = this.normalizeAutoBatchUrls(weidianUrls);

    if (normalizedUrls.length === 0) {
      throw new BadRequestException('请输入至少一个微店链接或商品 ID');
    }

    const batch = await this.dataSource.transaction(async (manager) => {
      const batchEntity = manager.create(SkuSplitBatch, {
        status: SkuSplitBatchStatus.PENDING,
        totalUrls: normalizedUrls.length,
      });
      const savedBatch = await manager.save(batchEntity);

      const items = normalizedUrls.map((sourceUrl) =>
        manager.create(SkuSplitBatchItem, {
          batchId: savedBatch.id,
          sourceUrl,
        }),
      );
      await manager.save(items);

      return savedBatch;
    });

    await this.skuSplitBatchQueue.add(
      'process-auto-batch',
      { batchId: batch.id },
      { jobId: `sku-split-batch-${batch.id}` },
    );

    return {
      batchId: batch.id,
      totalUrls: batch.totalUrls,
      status: batch.status,
      createdAt: batch.createdAt.toISOString(),
    };
  }

  /**
   * 预览拆分方案（不创建任务，不消耗 AI）
   * 包含去重检查：同源变体键 + 跨源视觉相似度
   * 优先使用 prefetch 缓存的数据和向量
   */
  async previewSplit(weidianUrl: string): Promise<SkuSplitPlanResponse> {
    const itemId = this.weidianService.extractItemId(weidianUrl) || weidianUrl;

    if (!itemId || !/^\d+$/.test(itemId)) {
      throw new BadRequestException('无效的微店链接或 ID');
    }

    // 优先使用缓存的归一化数据
    let normalizedData: Awaited<ReturnType<WeidianService['scrapeItem']>>;
    const cachedData = await this.redis.get(this.prefetchDataKey(itemId));
    if (cachedData) {
      try {
        normalizedData = JSON.parse(cachedData);
      } catch {
        normalizedData = await this.weidianService.scrapeItem({ itemId });
      }
    } else {
      normalizedData = await this.weidianService.scrapeItem({ itemId });
    }

    const plan = this.analyzerService.analyzeSplitPlan(normalizedData);

    if (!plan) {
      throw new BadRequestException('该链接没有可拆分的款式维度');
    }

    // 去重检查 + 缓存 embedding，使用共享 clipLimiter 串行调用 CLIP
    let duplicateCount = 0;

    const variants: SkuVariantPreview[] = await Promise.all(
      plan.variants.map((variant) =>
        this.clipLimiter(async () => {
          // 尝试读取预缓存的 embedding
          let precomputedEmbedding: number[] | undefined;
          try {
            const cachedEmb = await this.redis.get(
              this.embeddingCacheKey(itemId, variant.attrId),
            );
            if (cachedEmb) {
              precomputedEmbedding = JSON.parse(cachedEmb);
            }
          } catch {
            // 缓存读取失败不影响流程
          }

          const result = await this.duplicateCheckService.checkAll({
            splitSourceWeidianId: itemId,
            skuVariantKey: String(variant.attrId),
            imageUrl: variant.imageUrl,
            precomputedEmbedding,
          });

          // 缓存 embedding 到 Redis（无论是否重复，执行阶段都可能需要）
          if (result.embedding) {
            try {
              await this.redis.set(
                this.embeddingCacheKey(itemId, variant.attrId),
                JSON.stringify(result.embedding),
                'EX',
                this.EMBEDDING_CACHE_TTL,
              );
            } catch {
              // 缓存失败不影响流程
            }
          }

          if (result.isDuplicate) {
            duplicateCount++;
            const duplicateInfo: VariantDuplicateInfo = {
              matchType: result.matchType!,
              matchedProductId: result.matchedProductId!,
              matchedProductTitle: result.matchedProductTitle,
              matchedProductImage: result.matchedProductImage,
              matchedShopName: result.matchedShopName,
              similarity: result.similarity,
            };
            return { ...variant, duplicateInfo };
          }

          return variant;
        }),
      ),
    );

    return {
      weidianItemId: plan.weidianItemId,
      weidianTitle: plan.weidianTitle,
      splitDimension: plan.splitDimension,
      totalVariants: plan.variants.length,
      variants,
      duplicateCount: duplicateCount > 0 ? duplicateCount : undefined,
    };
  }

  /**
   * 创建拆分任务并加入队列
   */
  async createSplitJob(
    weidianItemId: string,
    shopId?: string,
    selectedAttrIds?: number[],
    createdBy?: string,
    batchId?: string,
  ): Promise<SkuSplitJobResponse> {
    if (!weidianItemId || !/^\d+$/.test(weidianItemId)) {
      throw new BadRequestException('无效的微店 ID');
    }

    const productGroupId = uuidv4();

    // 先做一次快速分析，确认可拆分并获取变体信息
    const normalizedData = await this.weidianService.scrapeItem({
      itemId: weidianItemId,
    });

    const plan = this.analyzerService.analyzeSplitPlan(normalizedData);
    if (!plan) {
      throw new BadRequestException('该链接没有可拆分的款式维度');
    }

    // 过滤选中的变体
    let variants = plan.variants;
    if (selectedAttrIds && selectedAttrIds.length > 0) {
      variants = variants.filter((v) => selectedAttrIds.includes(v.attrId));
    }

    if (variants.length === 0) {
      throw new BadRequestException('没有选中的变体');
    }

    // 构造 sourceUrl
    const sourceUrl = `https://weidian.com/item.html?itemID=${weidianItemId}`;

    // 事务：Job + Items 原子写入，避免孤立记录
    const job = await this.dataSource.transaction(async (manager) => {
      const jobEntity = manager.create(SkuSplitJob, {
        status: SkuSplitJobStatus.PENDING,
        weidianItemId,
        weidianTitle: plan.weidianTitle,
        splitDimension: plan.splitDimension,
        totalVariantCount: variants.length,
        productGroupId,
        sourceUrl,
        shopId,
        createdBy,
        batchId: batchId || undefined,
      });

      const savedJob = await manager.save(jobEntity);

      const items = variants.map((v) =>
        manager.create(SkuSplitItem, {
          jobId: savedJob.id,
          attrId: v.attrId,
          variantValue: v.value,
          imageUrl: v.imageUrl,
          price: v.price,
          skuCount: v.skuCount,
          status: SkuSplitItemStatus.PENDING,
        }),
      );

      await manager.save(items);

      return savedJob;
    });

    // 加入队列（在事务外，确保 DB 已提交）
    await this.skuSplitQueue.add(
      'process-split',
      { jobId: job.id },
      {
        jobId: `sku-split-${job.id}`,
      },
    );

    this.logger.log(`拆分任务已创建: ${job.id}, ${variants.length} 个变体`);

    return {
      jobId: job.id,
      productGroupId,
      totalVariants: variants.length,
      status: job.status,
    };
  }

  /**
   * 查询任务详情
   */
  async getJobDetail(jobId: string): Promise<SkuSplitJobDetailResponse> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('拆分任务不存在');
    }

    const items = await this.itemRepository.find({
      where: { jobId },
      order: { createdAt: 'ASC' },
    });
    const summary = this.summarizeItems(items);

    return {
      id: job.id,
      status: job.status,
      weidianItemId: job.weidianItemId,
      weidianTitle: job.weidianTitle,
      splitDimension: job.splitDimension,
      sourceUrl: job.sourceUrl,
      productGroupId: job.productGroupId,
      totalVariantCount: job.totalVariantCount,
      processedCount: job.processedCount,
      successCount: job.successCount,
      failedCount: job.failedCount,
      duplicateCount: job.duplicateCount,
      actionableFailureCount: summary.actionableFailureCount,
      publishDecisionStats: summary.publishDecisionStats,
      failureReasonStats: summary.failureReasonStats,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      items: items.map((item) => this.mapItemResponse(item)),
    };
  }

  /**
   * 列出最近的拆分任务
   */
  async listJobs(
    limit = 20,
    createdBy?: string,
  ): Promise<SkuSplitJobDetailResponse[]> {
    const where: Record<string, unknown> = {};
    if (createdBy) where.createdBy = createdBy;

    const jobs = await this.jobRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // 批量加载 items
    const jobIds = jobs.map((j) => j.id);
    const allItems =
      jobIds.length > 0
        ? await this.itemRepository
            .createQueryBuilder('item')
            .where('item.job_id IN (:...jobIds)', { jobIds })
            .orderBy('item.createdAt', 'ASC')
            .getMany()
        : [];

    const itemsByJob = new Map<string, SkuSplitItem[]>();
    for (const item of allItems) {
      const list = itemsByJob.get(item.jobId) || [];
      list.push(item);
      itemsByJob.set(item.jobId, list);
    }

    return jobs.map((job) => {
      const jobItems = itemsByJob.get(job.id) || [];
      const summary = this.summarizeItems(jobItems);

      return {
        id: job.id,
        status: job.status,
        weidianItemId: job.weidianItemId,
        weidianTitle: job.weidianTitle,
        splitDimension: job.splitDimension,
        sourceUrl: job.sourceUrl,
        productGroupId: job.productGroupId,
        totalVariantCount: job.totalVariantCount,
        processedCount: job.processedCount,
        successCount: job.successCount,
        failedCount: job.failedCount,
        duplicateCount: job.duplicateCount,
        actionableFailureCount: summary.actionableFailureCount,
        publishDecisionStats: summary.publishDecisionStats,
        failureReasonStats: summary.failureReasonStats,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        items: jobItems.map((item) => this.mapItemResponse(item)),
      };
    });
  }

  /**
   * 列出拆分条目（批次聚合 + 单任务），按条目分页
   */
  async listEntries(page = 1, pageSize = 20): Promise<SkuSplitListResponse> {
    const offset = (page - 1) * pageSize;

    const [autoBatches, singleJobs, legacyBatchEntries] = await Promise.all([
      this.batchRepository.find({
        order: { createdAt: 'DESC' },
      }),
      this.jobRepository.find({
        where: { batchId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
      this.jobRepository.query(`
        SELECT
          'batch' as "type",
          'legacy_job_group' as "batchKind",
          "batchId"::text as "entryId",
          COUNT(*)::int as "jobCount",
          SUM("totalVariantCount")::int as "totalVariants",
          SUM("successCount")::int as "successCount",
          SUM("failedCount")::int as "failedCount",
          SUM("duplicateCount")::int as "duplicateCount",
          0::int as "skippedCount",
          0::int as "cancelledCount",
          SUM("processedCount")::int as "processedCount",
          'variants' as "progressUnit",
          CASE
            WHEN COUNT(*) FILTER (WHERE status IN ('pending','analyzing','processing')) > 0 THEN 'processing'
            WHEN COUNT(*) FILTER (WHERE status = 'failed') = COUNT(*) THEN 'failed'
            WHEN COUNT(*) FILTER (WHERE status IN ('failed','partial_failed')) > 0 THEN 'partial_failed'
            ELSE 'completed'
          END as "status",
          NULL as "weidianItemId",
          NULL as "weidianTitle",
          NULL as "splitDimension",
          NULL as "sourceUrl",
          NULL as "productGroupId",
          MAX("createdAt") as "createdAt",
          MAX("completedAt") as "completedAt"
        FROM sku_split_jobs
        WHERE "batchId" IS NOT NULL
          AND "batchId" NOT IN (SELECT id FROM sku_split_batches)
        GROUP BY "batchId"
      `),
    ]);

    const autoBatchEntries = autoBatches.map((batch) => ({
      type: 'batch' as const,
      batchKind: 'auto_batch' as const,
      entryId: batch.id,
      jobCount: batch.totalUrls,
      totalVariants: batch.totalUrls,
      successCount: batch.successUrls,
      failedCount: batch.failedUrls,
      duplicateCount: 0,
      skippedCount: batch.skippedUrls,
      cancelledCount: batch.cancelledUrls,
      processedCount: batch.processedUrls,
      progressUnit: 'urls' as const,
      status: batch.status,
      weidianItemId: undefined,
      weidianTitle: undefined,
      splitDimension: undefined,
      sourceUrl: undefined,
      productGroupId: undefined,
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString(),
    }));

    const singleEntries = singleJobs.map((job) => ({
      type: 'single' as const,
      entryId: job.id,
      batchKind: undefined,
      jobCount: 1,
      totalVariants: job.totalVariantCount,
      successCount: job.successCount,
      failedCount: job.failedCount,
      duplicateCount: job.duplicateCount,
      skippedCount: 0,
      cancelledCount: 0,
      processedCount: job.processedCount,
      progressUnit: 'variants' as const,
      status: job.status,
      weidianItemId: job.weidianItemId,
      weidianTitle: job.weidianTitle,
      splitDimension: job.splitDimension,
      sourceUrl: job.sourceUrl,
      productGroupId: job.productGroupId,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    }));

    const allEntries = [
      ...autoBatchEntries,
      ...legacyBatchEntries,
      ...singleEntries,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const pagedEntries = allEntries.slice(offset, offset + pageSize);

    const singleJobIds = pagedEntries
      .filter((entry) => entry.type === 'single')
      .map((entry) => entry.entryId);
    const batchIds = pagedEntries
      .filter((entry) => entry.type === 'batch')
      .map((entry) => entry.entryId);
    const autoBatchIds = pagedEntries
      .filter(
        (entry) => entry.type === 'batch' && entry.batchKind === 'auto_batch',
      )
      .map((entry) => entry.entryId);

    const jobWhere = [
      ...(singleJobIds.length > 0 ? [{ id: In(singleJobIds) }] : []),
      ...(batchIds.length > 0 ? [{ batchId: In(batchIds) }] : []),
    ];

    const relatedJobs =
      jobWhere.length > 0
        ? await this.jobRepository.find({
            where: jobWhere,
            order: { createdAt: 'ASC' },
          })
        : [];

    const relatedJobIds = relatedJobs.map((job) => job.id);
    const relatedItems =
      relatedJobIds.length > 0
        ? await this.itemRepository
            .createQueryBuilder('item')
            .where('item.job_id IN (:...jobIds)', { jobIds: relatedJobIds })
            .orderBy('item.createdAt', 'ASC')
            .getMany()
        : [];

    const itemsByJob = new Map<string, SkuSplitItem[]>();
    for (const item of relatedItems) {
      const list = itemsByJob.get(item.jobId) || [];
      list.push(item);
      itemsByJob.set(item.jobId, list);
    }

    const autoBatchItems =
      autoBatchIds.length > 0
        ? await this.batchItemRepository.find({
            where: { batchId: In(autoBatchIds) },
            order: { createdAt: 'ASC' },
          })
        : [];
    const autoBatchItemsByBatch = new Map<string, SkuSplitBatchItem[]>();
    for (const item of autoBatchItems) {
      const list = autoBatchItemsByBatch.get(item.batchId) || [];
      list.push(item);
      autoBatchItemsByBatch.set(item.batchId, list);
    }

    const jobsByBatch = new Map<string, typeof relatedJobs>();
    const jobsById = new Map<string, (typeof relatedJobs)[number]>();
    for (const job of relatedJobs) {
      jobsById.set(job.id, job);
      if (job.batchId) {
        const list = jobsByBatch.get(job.batchId) || [];
        list.push(job);
        jobsByBatch.set(job.batchId, list);
      }
    }

    return {
      data: pagedEntries.map((entry) => {
        let summary = {
          actionableFailureCount: 0,
          publishDecisionStats: { active: 0, pendingReview: 0 },
          failureReasonStats: [] as SkuSplitFailureReasonStat[],
        };

        if (entry.type === 'single') {
          const job = jobsById.get(entry.entryId);
          const jobItems = job ? itemsByJob.get(job.id) || [] : [];
          summary = this.summarizeItems(jobItems);
        } else if (entry.batchKind === 'auto_batch') {
          const batchItems = autoBatchItemsByBatch.get(entry.entryId) || [];
          summary = this.summarizeAutoBatchItems(batchItems, itemsByJob);
        } else {
          const batchJobs = jobsByBatch.get(entry.entryId) || [];
          const batchItems = batchJobs.flatMap(
            (job) => itemsByJob.get(job.id) || [],
          );
          summary = this.summarizeItems(batchItems);
        }

        return {
          ...entry,
          actionableFailureCount: summary.actionableFailureCount,
          publishDecisionStats: summary.publishDecisionStats,
          failureReasonStats: summary.failureReasonStats,
          completedAt: entry.completedAt ?? undefined,
        };
      }),
      total: allEntries.length,
      page,
      pageSize,
    };
  }

  async getAutoBatchDetail(
    batchId: string,
  ): Promise<SkuSplitAutoBatchDetailResponse> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('后台自动批次不存在');
    }

    const items = await this.batchItemRepository.find({
      where: { batchId },
      order: { createdAt: 'ASC' },
    });

    const splitJobIds = items
      .map((item) => item.splitJobId)
      .filter((splitJobId): splitJobId is string => Boolean(splitJobId));
    const splitJobs =
      splitJobIds.length > 0
        ? await this.jobRepository.find({
            where: { id: In(splitJobIds) },
          })
        : [];
    const splitJobsById = new Map(splitJobs.map((job) => [job.id, job]));
    const splitJobItems =
      splitJobIds.length > 0
        ? await this.itemRepository
            .createQueryBuilder('item')
            .where('item.job_id IN (:...jobIds)', { jobIds: splitJobIds })
            .orderBy('item.createdAt', 'ASC')
            .getMany()
        : [];
    const splitJobItemsByJob = new Map<string, SkuSplitItem[]>();
    for (const splitJobItem of splitJobItems) {
      const list = splitJobItemsByJob.get(splitJobItem.jobId) || [];
      list.push(splitJobItem);
      splitJobItemsByJob.set(splitJobItem.jobId, list);
    }

    return {
      id: batch.id,
      status: batch.status,
      totalUrls: batch.totalUrls,
      processedUrls: batch.processedUrls,
      successUrls: batch.successUrls,
      failedUrls: batch.failedUrls,
      skippedUrls: batch.skippedUrls,
      cancelledUrls: batch.cancelledUrls,
      createdAt: batch.createdAt.toISOString(),
      completedAt: batch.completedAt?.toISOString(),
      items: items.map((item) => {
        const splitJob = item.splitJobId
          ? splitJobsById.get(item.splitJobId)
          : undefined;
        const splitItems = item.splitJobId
          ? splitJobItemsByJob.get(item.splitJobId) || []
          : [];
        const insights = this.extractAutoBatchItemInsights(item, splitItems);
        return {
          id: item.id,
          sourceUrl: item.sourceUrl,
          status: item.status,
          weidianItemId: item.weidianItemId || undefined,
          splitJobId: item.splitJobId || undefined,
          splitJobStatus: splitJob?.status,
          splitJobTitle: splitJob?.weidianTitle || undefined,
          selectedCount: item.selectedCount,
          errorMessage: item.errorMessage || undefined,
          actionable: insights.actionable || undefined,
          failureStage: insights.failureStage,
          failureReasonCode: insights.failureReasonCode,
          failureReasonLabel: insights.failureReasonLabel,
          failureReasonStats:
            insights.failureReasonStats.length > 0
              ? insights.failureReasonStats
              : undefined,
          suggestedAction: insights.suggestedAction,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          processedAt: item.processedAt?.toISOString(),
        };
      }),
    };
  }

  async retryAutoBatchFailed(
    batchId: string,
  ): Promise<SkuSplitAutoBatchRetryResponse> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('后台自动批次不存在');
    }

    const failedItems = await this.batchItemRepository.find({
      where: { batchId, status: SkuSplitBatchItemStatus.FAILED },
      order: { createdAt: 'ASC' },
    });

    if (failedItems.length === 0) {
      throw new BadRequestException('该批次没有可重试的失败链接');
    }

    for (const item of failedItems) {
      item.status = SkuSplitBatchItemStatus.PENDING;
      item.errorMessage = null;
      item.splitJobId = null;
      item.processedAt = null;
      item.processingLog = [
        ...(item.processingLog || []),
        {
          ts: new Date().toISOString(),
          event: '重试失败链接',
          data: { previousStatus: SkuSplitBatchItemStatus.FAILED },
        },
      ];
    }
    await this.batchItemRepository.save(failedItems);

    const allItems = await this.batchItemRepository.find({
      where: { batchId },
    });
    const successUrls = allItems.filter(
      (item) => item.status === SkuSplitBatchItemStatus.COMPLETED,
    ).length;
    const skippedUrls = allItems.filter(
      (item) => item.status === SkuSplitBatchItemStatus.SKIPPED,
    ).length;

    await this.batchRepository.update(batchId, {
      status: SkuSplitBatchStatus.PENDING,
      processedUrls: successUrls + skippedUrls,
      successUrls,
      failedUrls: 0,
      skippedUrls,
      completedAt: null as any,
      errorMessage: null as any,
    });

    await this.skuSplitBatchQueue.add(
      'process-auto-batch',
      { batchId },
      { jobId: `sku-split-batch-retry-${batchId}-${Date.now()}` },
    );

    this.logger.log(
      `自动批次失败链接重试: ${batchId}, ${failedItems.length} 条`,
    );

    return {
      batchId,
      retryCount: failedItems.length,
      status: SkuSplitBatchStatus.PENDING,
    };
  }

  async pauseAutoBatch(batchId: string): Promise<{
    batchId: string;
    status: SkuSplitBatchStatus;
  }> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('后台自动批次不存在');
    }
    if (
      batch.status !== SkuSplitBatchStatus.PENDING &&
      batch.status !== SkuSplitBatchStatus.PROCESSING
    ) {
      throw new BadRequestException('只有等待中或处理中的批次可以暂停');
    }

    await this.batchRepository.update(batchId, {
      status: SkuSplitBatchStatus.PAUSED,
      completedAt: null as any,
    });

    return {
      batchId,
      status: SkuSplitBatchStatus.PAUSED,
    };
  }

  async resumeAutoBatch(batchId: string): Promise<{
    batchId: string;
    status: SkuSplitBatchStatus;
  }> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('后台自动批次不存在');
    }
    if (batch.status !== SkuSplitBatchStatus.PAUSED) {
      throw new BadRequestException('只有已暂停的批次可以恢复');
    }

    await this.batchRepository.update(batchId, {
      status: SkuSplitBatchStatus.PENDING,
      completedAt: null as any,
      errorMessage: null as any,
    });

    await this.skuSplitBatchQueue.add(
      'process-auto-batch',
      { batchId },
      { jobId: `sku-split-batch-resume-${batchId}-${Date.now()}` },
    );

    return {
      batchId,
      status: SkuSplitBatchStatus.PENDING,
    };
  }

  async cancelAutoBatch(batchId: string): Promise<{
    batchId: string;
    status: SkuSplitBatchStatus;
  }> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundException('后台自动批次不存在');
    }
    if (
      batch.status === SkuSplitBatchStatus.COMPLETED ||
      batch.status === SkuSplitBatchStatus.CANCELLED
    ) {
      throw new BadRequestException('当前批次不能取消');
    }

    const items = await this.batchItemRepository.find({
      where: { batchId },
    });

    for (const item of items) {
      if (
        item.status === SkuSplitBatchItemStatus.PENDING ||
        item.status === SkuSplitBatchItemStatus.ANALYZING ||
        item.status === SkuSplitBatchItemStatus.CREATING_JOB ||
        item.status === SkuSplitBatchItemStatus.WAITING_JOB
      ) {
        item.status = SkuSplitBatchItemStatus.CANCELLED;
        item.processedAt = new Date();
        item.processingLog = [
          ...(item.processingLog || []),
          {
            ts: new Date().toISOString(),
            event: '批次已取消',
          },
        ];
      }
    }
    await this.batchItemRepository.save(items);

    const successUrls = items.filter(
      (item) => item.status === SkuSplitBatchItemStatus.COMPLETED,
    ).length;
    const failedUrls = items.filter(
      (item) => item.status === SkuSplitBatchItemStatus.FAILED,
    ).length;
    const skippedUrls = items.filter(
      (item) => item.status === SkuSplitBatchItemStatus.SKIPPED,
    ).length;
    const cancelledUrls = items.filter(
      (item) => item.status === SkuSplitBatchItemStatus.CANCELLED,
    ).length;

    await this.batchRepository.update(batchId, {
      status: SkuSplitBatchStatus.CANCELLED,
      processedUrls: successUrls + failedUrls + skippedUrls + cancelledUrls,
      successUrls,
      failedUrls,
      skippedUrls,
      cancelledUrls,
      completedAt: new Date(),
      errorMessage: null as any,
    });

    return {
      batchId,
      status: SkuSplitBatchStatus.CANCELLED,
    };
  }

  /**
   * 获取批次下所有 jobs（展开批次时调用）
   */
  async getBatchJobs(batchId: string): Promise<SkuSplitJobDetailResponse[]> {
    const jobs = await this.jobRepository.find({
      where: { batchId },
      order: { createdAt: 'ASC' },
    });

    if (jobs.length === 0) {
      throw new NotFoundException('批次不存在');
    }

    const jobIds = jobs.map((j) => j.id);
    const allItems = await this.itemRepository
      .createQueryBuilder('item')
      .where('item.job_id IN (:...jobIds)', { jobIds })
      .orderBy('item.createdAt', 'ASC')
      .getMany();

    const itemsByJob = new Map<string, SkuSplitItem[]>();
    for (const item of allItems) {
      const list = itemsByJob.get(item.jobId) || [];
      list.push(item);
      itemsByJob.set(item.jobId, list);
    }

    return jobs.map((job) => {
      const jobItems = itemsByJob.get(job.id) || [];
      const summary = this.summarizeItems(jobItems);

      return {
        id: job.id,
        status: job.status,
        weidianItemId: job.weidianItemId,
        weidianTitle: job.weidianTitle,
        splitDimension: job.splitDimension,
        sourceUrl: job.sourceUrl,
        productGroupId: job.productGroupId,
        totalVariantCount: job.totalVariantCount,
        processedCount: job.processedCount,
        successCount: job.successCount,
        failedCount: job.failedCount,
        duplicateCount: job.duplicateCount,
        actionableFailureCount: summary.actionableFailureCount,
        publishDecisionStats: summary.publishDecisionStats,
        failureReasonStats: summary.failureReasonStats,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        items: jobItems.map((item) => this.mapItemResponse(item)),
      };
    });
  }

  /**
   * 重试失败的任务：只重试 failed 的 items，跳过 success/duplicate
   */
  async retryJob(jobId: string): Promise<SkuSplitJobResponse> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('拆分任务不存在');
    }

    if (
      job.status !== SkuSplitJobStatus.FAILED &&
      job.status !== SkuSplitJobStatus.PARTIAL_FAILED
    ) {
      throw new BadRequestException('只能重试失败或部分失败的任务');
    }

    // 重置失败的 items 为 PENDING
    await this.itemRepository.update(
      { jobId, status: SkuSplitItemStatus.FAILED },
      { status: SkuSplitItemStatus.PENDING, errorMessage: null as any },
    );

    // 重置崩溃残留的 PROCESSING items 为 PENDING（进程异常退出时可能发生）
    await this.itemRepository.update(
      { jobId, status: SkuSplitItemStatus.PROCESSING },
      { status: SkuSplitItemStatus.PENDING, errorMessage: null as any },
    );

    // 重新计算计数器
    const items = await this.itemRepository.find({ where: { jobId } });
    const successCount = items.filter(
      (i) => i.status === SkuSplitItemStatus.SUCCESS,
    ).length;
    const duplicateCount = items.filter(
      (i) => i.status === SkuSplitItemStatus.DUPLICATE,
    ).length;
    const pendingCount = items.filter(
      (i) => i.status === SkuSplitItemStatus.PENDING,
    ).length;

    await this.jobRepository.update(jobId, {
      status: SkuSplitJobStatus.PENDING,
      processedCount: successCount + duplicateCount,
      successCount,
      failedCount: 0,
      duplicateCount,
      completedAt: null as any,
      errorMessage: null as any,
    });

    // 重新入队
    await this.skuSplitQueue.add(
      'process-split',
      { jobId },
      { jobId: `sku-split-retry-${jobId}-${Date.now()}` },
    );

    this.logger.log(`任务重试: ${jobId}, ${pendingCount} 个变体待处理`);

    return {
      jobId: job.id,
      productGroupId: job.productGroupId,
      totalVariants: job.totalVariantCount,
      status: 'pending',
    };
  }

  /**
   * 删除拆分任务及其所有 items
   */
  async deleteJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('拆分任务不存在');
    }

    // CASCADE 会自动删除 items
    await this.jobRepository.remove(job);
    this.logger.log(`任务已删除: ${jobId}`);
  }

  /**
   * 更新 Job 计数器
   */
  async incrementJobCounter(
    jobId: string,
    field: 'processedCount' | 'successCount' | 'failedCount' | 'duplicateCount',
  ): Promise<void> {
    await this.jobRepository.increment({ id: jobId }, field, 1);
  }

  /**
   * 更新 Job 状态
   */
  async updateJobStatus(
    jobId: string,
    status: SkuSplitJobStatus,
    errorMessage?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (errorMessage) update.errorMessage = errorMessage;
    if (
      status === SkuSplitJobStatus.COMPLETED ||
      status === SkuSplitJobStatus.PARTIAL_FAILED ||
      status === SkuSplitJobStatus.FAILED
    ) {
      update.completedAt = new Date();
    }
    await this.jobRepository.update(jobId, update);
  }

  /**
   * 追加变体处理日志（JSONB 原子追加，不覆盖）
   */
  async appendItemLog(
    itemId: string,
    event: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const entry = {
        ts: new Date().toISOString(),
        event,
        ...(data ? { data } : {}),
      };
      await this.itemRepository
        .createQueryBuilder()
        .update()
        .set({
          processingLog: () =>
            `COALESCE("processingLog", '[]'::jsonb) || :newEntry::jsonb`,
        })
        .setParameter('newEntry', JSON.stringify(entry))
        .where('id = :id', { id: itemId })
        .execute();
    } catch (err) {
      this.logger.warn(`appendItemLog failed for ${itemId}: ${err}`);
    }
  }
}
