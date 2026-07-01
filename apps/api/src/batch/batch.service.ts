import {
  BadRequestException,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Observable, interval } from 'rxjs';
import { map, switchMap, takeWhile } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, FindOptionsWhere } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BatchJob,
  BatchJobStatus,
  BatchJobType,
} from './entities/batch-job.entity';
import {
  BatchJobItem,
  BatchJobItemStatus,
} from './entities/batch-job-item.entity';
import { QUEUE_NAMES } from '../queue/queue.module';
import { ProductsService } from '../products/products.service';
import { ProductStatus } from '../products/product-status';
import {
  BatchItemStateMachine,
  InvalidStateTransitionError,
} from './state-machine/batch-item-state';
// 类型定义见 ./types/batch-data.types.ts (WeidianSourceData, AiGeneratedData, FinalProductData)

/** SSE 轮询间隔（毫秒） */
const SSE_POLL_INTERVAL_MS = 3000;
/** 进度查询：活跃 items 最大返回数 */
const ACTIVE_ITEMS_LIMIT = 10;
/** 进度查询：最近完成 items 最大返回数 */
const RECENT_ITEMS_LIMIT = 5;

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    @InjectRepository(BatchJob)
    private batchJobRepo: Repository<BatchJob>,
    @InjectRepository(BatchJobItem)
    private batchJobItemRepo: Repository<BatchJobItem>,
    @InjectQueue(QUEUE_NAMES.BATCH_IMPORT)
    private batchImportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AI_GENERATION)
    private aiGenerationQueue: Queue,
    private readonly productsService: ProductsService,
  ) {}

  // 创建批量导入任务
  async createBatchJob(
    urls: string[],
    userId: string,
    type: BatchJobType = BatchJobType.IMPORT,
  ): Promise<BatchJob> {
    // URL 去重
    const uniqueUrls = [...new Set(urls.map((u) => u.trim()))];
    const duplicateCount = urls.length - uniqueUrls.length;
    if (duplicateCount > 0) {
      this.logger.log(
        `Removed ${duplicateCount} duplicate URLs (${urls.length} → ${uniqueUrls.length})`,
      );
    }

    const job = this.batchJobRepo.create({
      type,
      totalItems: uniqueUrls.length,
      createdById: userId,
      status: BatchJobStatus.PENDING,
    });
    const savedJob = await this.batchJobRepo.save(job);

    // 创建子项
    const items = uniqueUrls.map((url) =>
      this.batchJobItemRepo.create({
        batchJobId: savedJob.id,
        sourceUrl: url,
        status: BatchJobItemStatus.PENDING,
      }),
    );
    await this.batchJobItemRepo.save(items);

    return savedJob;
  }

  // 启动批量任务（添加到队列）
  async startBatchJob(jobId: string): Promise<void> {
    const job = await this.batchJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    // 防止重复启动
    if (job.status === BatchJobStatus.PROCESSING) {
      throw new BadRequestException('Job is already processing');
    }

    await this.batchJobRepo.update(jobId, {
      status: BatchJobStatus.PROCESSING,
    });

    const items = await this.batchJobItemRepo.find({
      where: { batchJobId: jobId, status: BatchJobItemStatus.PENDING },
    });

    await Promise.all(
      items.map((item) =>
        this.batchImportQueue.add('import-item', {
          jobId,
          itemId: item.id,
          sourceUrl: item.sourceUrl,
          jobType: job.type,
        }),
      ),
    );
  }

  // 获取任务详情
  async findJobById(jobId: string): Promise<BatchJob | null> {
    return this.batchJobRepo.findOne({
      where: { id: jobId },
      relations: ['items'],
    });
  }

  async getJobDetail(jobId: string): Promise<BatchJob | null> {
    return this.findJobById(jobId);
  }

  async getItem(itemId: string): Promise<BatchJobItem | null> {
    return this.batchJobItemRepo.findOne({
      where: { id: itemId },
    });
  }

  /** 追加一条处理日志到 item */
  async appendLog(
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
      const jsonStr = JSON.stringify(entry);
      await this.batchJobItemRepo
        .createQueryBuilder()
        .update(BatchJobItem)
        .set({
          processingLog: () =>
            `COALESCE("processingLog", '[]'::jsonb) || :newEntry::jsonb`,
        })
        .setParameter('newEntry', jsonStr)
        .where('id = :id', { id: itemId })
        .execute();
    } catch (err) {
      this.logger.warn(`appendLog failed for ${itemId}: ${err}`);
    }
  }

  /** 重跑 AI 分析：将 item 状态重置为 FETCHED 并重新入队 */
  async regenerateItem(itemId: string): Promise<void> {
    const item = await this.batchJobItemRepo.findOne({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException(`Item ${itemId} not found`);
    if (!item.sourceData) {
      throw new BadRequestException('该项目没有抓取数据，无法重跑 AI');
    }

    await this.batchJobItemRepo.update(itemId, {
      status: BatchJobItemStatus.FETCHED,
      aiGeneratedData: null,
      errorMessage: null,
    });

    await this.aiGenerationQueue.add('generate-content', {
      jobId: item.batchJobId,
      itemId: item.id,
    });

    await this.appendLog(itemId, '手动重跑 AI 分析');
    this.logger.log(`Item ${itemId} queued for AI regeneration`);
  }

  // 获取用户的所有任务
  async findJobsByUser(userId: string): Promise<BatchJob[]> {
    return this.batchJobRepo.find({
      where: { createdById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getJobs(page = 1, limit = 10) {
    const [data, total] = await this.batchJobRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // 轻量摘要 + 活跃 items + 最近完成 items（供 SSE 推送）
  async getJobProgressData(jobId: string) {
    // 查询 1：job 摘要（不 join items）
    const job = await this.batchJobRepo.findOne({
      where: { id: jobId },
      select: [
        'id',
        'status',
        'totalItems',
        'processedItems',
        'successItems',
        'failedItems',
        'inProgressItems',
        'createdAt',
        'completedAt',
      ],
    });
    if (!job) return null;

    // 查询 2：当前正在处理的 items（fetching / fetched / generating），最多 10 条
    const activeItems = await this.batchJobItemRepo.find({
      where: {
        batchJobId: jobId,
        status: In([
          BatchJobItemStatus.FETCHING,
          BatchJobItemStatus.FETCHED,
          BatchJobItemStatus.GENERATING,
        ]),
      },
      select: ['id', 'sourceUrl', 'status', 'weidianItemId'],
      take: ACTIVE_ITEMS_LIMIT,
    });

    // 查询 3：最近完成/失败的 items（按处理时间倒序）
    const recentItems = await this.batchJobItemRepo.find({
      where: {
        batchJobId: jobId,
        status: In([
          BatchJobItemStatus.REVIEW,
          BatchJobItemStatus.FAILED,
          BatchJobItemStatus.SKIPPED,
        ]),
      },
      select: [
        'id',
        'sourceUrl',
        'status',
        'errorMessage',
        'weidianItemId',
        'processedAt',
      ],
      order: { processedAt: 'DESC' },
      take: RECENT_ITEMS_LIMIT,
    });

    return { ...job, activeItems, recentItems };
  }

  getJobProgressStream(jobId: string): Observable<MessageEvent> {
    return interval(SSE_POLL_INTERVAL_MS).pipe(
      switchMap(() => this.getJobProgressData(jobId)),
      map((data) => ({ data: data ?? { id: jobId, status: 'not_found' } })),
      // 终态后发送最终事件再关闭流，停止无意义的数据库轮询
      takeWhile((event) => {
        const status = (event.data as Record<string, unknown>)?.status;
        return !this.isTerminalJobStatus(status as string);
      }, true),
    );
  }

  private isTerminalJobStatus(status: string): boolean {
    const terminalStatuses: string[] = [
      BatchJobStatus.COMPLETED,
      BatchJobStatus.FAILED,
      BatchJobStatus.PARTIAL,
      BatchJobStatus.CANCELLED,
      'not_found',
    ];
    return terminalStatuses.includes(status);
  }

  // 分页查询 job items（供前端表格按需加载）
  async getJobItems(jobId: string, page = 1, limit = 20, status?: string) {
    const where: FindOptionsWhere<BatchJobItem> = { batchJobId: jobId };
    if (status) where.status = status as BatchJobItemStatus;

    const [data, total] = await this.batchJobItemRepo.findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getReviewItems(jobId?: string): Promise<BatchJobItem[]> {
    const qb = this.batchJobItemRepo
      .createQueryBuilder('item')
      .where('item.status = :status', { status: BatchJobItemStatus.REVIEW })
      .andWhere(
        `(item."aiGeneratedData" IS NULL OR item."aiGeneratedData" -> 'duplicateOf' IS NULL)`,
      )
      .orderBy('item.createdAt', 'DESC');
    if (jobId) {
      qb.andWhere('item.batchJobId = :jobId', { jobId });
    }
    return qb.getMany();
  }

  async getDuplicateReviewItems(): Promise<BatchJobItem[]> {
    return this.batchJobItemRepo
      .createQueryBuilder('item')
      .where('item.status = :status', { status: BatchJobItemStatus.REVIEW })
      .andWhere(`item."aiGeneratedData" -> 'duplicateOf' IS NOT NULL`)
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  async getReviewItem(itemId: string): Promise<BatchJobItem | null> {
    return this.batchJobItemRepo.findOne({
      where: { id: itemId },
    });
  }

  async retryFailedItems(jobId: string) {
    const failedItems = await this.batchJobItemRepo.find({
      where: { batchJobId: jobId, status: BatchJobItemStatus.FAILED },
    });
    if (failedItems.length === 0) {
      return { retried: 0 };
    }

    // 获取任务信息以确定类型
    const job = await this.batchJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    await this.batchJobRepo.update(jobId, {
      status: BatchJobStatus.PROCESSING,
    });

    // 并发重置状态和添加到队列
    await Promise.all(
      failedItems.map(async (item) => {
        await this.batchJobItemRepo.update(item.id, {
          status: BatchJobItemStatus.PENDING,
          errorMessage: null,
          retryCount: item.retryCount + 1,
        });
        await this.batchImportQueue.add('import-item', {
          jobId,
          itemId: item.id,
          sourceUrl: item.sourceUrl,
          jobType: job.type,
        });
      }),
    );

    return { retried: failedItems.length };
  }

  // 重试卡住的 items（PENDING/FETCHING/FETCHED/GENERATING）
  async retryStuckItems(jobId: string) {
    const job = await this.batchJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const stuckItems = await this.batchJobItemRepo.find({
      where: [
        { batchJobId: jobId, status: BatchJobItemStatus.PENDING },
        { batchJobId: jobId, status: BatchJobItemStatus.FETCHING },
        { batchJobId: jobId, status: BatchJobItemStatus.FETCHED },
        { batchJobId: jobId, status: BatchJobItemStatus.GENERATING },
      ],
    });

    if (stuckItems.length === 0) {
      return { retried: 0 };
    }

    await this.batchJobRepo.update(jobId, {
      status: BatchJobStatus.PROCESSING,
    });

    let retriedCount = 0;
    await Promise.all(
      stuckItems.map(async (item) => {
        if (
          item.status === BatchJobItemStatus.FETCHED ||
          item.status === BatchJobItemStatus.GENERATING
        ) {
          // 已抓取但 AI 没跑，直接投入 AI 队列
          await this.aiGenerationQueue.add('generate-content', {
            jobId,
            itemId: item.id,
          });
          await this.appendLog(item.id, '重新加入 AI 生成队列（卡住恢复）');
        } else {
          // PENDING/FETCHING → 重置为 PENDING，投入抓取队列
          await this.batchJobItemRepo.update(item.id, {
            status: BatchJobItemStatus.PENDING,
            errorMessage: null,
          });
          await this.batchImportQueue.add('import-item', {
            jobId,
            itemId: item.id,
            sourceUrl: item.sourceUrl,
            jobType: job.type,
          });
          await this.appendLog(item.id, '重新加入抓取队列（卡住恢复）');
        }
        retriedCount++;
      }),
    );

    return { retried: retriedCount };
  }

  /**
   * 定时自动恢复卡住的 batch items
   * 每 30 分钟扫描一次：超过 30 分钟仍在 FETCHING/GENERATING 状态的 item 视为卡住
   */
  @Cron('*/30 * * * *')
  async autoRecoverStuckItems(): Promise<void> {
    const stuckThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 分钟前

    const stuckItems = await this.batchJobItemRepo
      .createQueryBuilder('item')
      .where('item.status IN (:...statuses)', {
        statuses: [BatchJobItemStatus.FETCHING, BatchJobItemStatus.GENERATING],
      })
      .andWhere('item.updatedAt < :threshold', { threshold: stuckThreshold })
      .getMany();

    if (stuckItems.length === 0) return;

    this.logger.warn(
      `Auto-recovery: found ${stuckItems.length} stuck items (>${30}min in FETCHING/GENERATING)`,
    );

    // 按 jobId 分组恢复
    const jobIds = [...new Set(stuckItems.map((item) => item.batchJobId))];
    let totalRetried = 0;

    for (const jobId of jobIds) {
      try {
        const result = await this.retryStuckItems(jobId);
        totalRetried += result.retried;
      } catch (error) {
        this.logger.error(
          `Auto-recovery failed for job ${jobId}: ${error.message}`,
        );
      }
    }

    if (totalRetried > 0) {
      this.logger.log(
        `Auto-recovery complete: retried ${totalRetried} items across ${jobIds.length} jobs`,
      );
    }
  }

  async approveItem(itemId: string): Promise<void> {
    await this.updateItemStatus(itemId, BatchJobItemStatus.APPROVED);
  }

  async publishItem(itemId: string) {
    const item = await this.batchJobItemRepo.findOne({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (
      item.status !== BatchJobItemStatus.APPROVED &&
      item.status !== BatchJobItemStatus.REVIEW
    ) {
      throw new BadRequestException('Item not approved');
    }

    // 如果状态是 REVIEW，先自动审核通过（遵守状态机规则：REVIEW → APPROVED → PUBLISHED）
    if (item.status === BatchJobItemStatus.REVIEW) {
      await this.updateItemStatus(itemId, BatchJobItemStatus.APPROVED);
    }

    const editedData = item.finalData || item.aiGeneratedData;
    if (!editedData?.primaryCategoryId) {
      throw new BadRequestException('Missing primaryCategoryId');
    }
    if (!item.sourceData) {
      throw new BadRequestException('Missing sourceData');
    }

    // AI 特有字段（mixedness、analysis 等）始终来自 aiGeneratedData
    const aiSource = item.aiGeneratedData;

    const result = await this.productsService.createProductFromBatchItem({
      sourceUrl: item.sourceUrl,
      sourceData: {
        title: item.sourceData.title,
        images: item.sourceData.images || [],
        detailImages: item.sourceData.detailImages || [],
        mainImage: item.sourceData.mainImage,
        priceMin: item.sourceData.priceMin,
        priceMax: item.sourceData.priceMax,
        skus: item.sourceData.skus || [],
        rawSkuInfo: item.sourceData.rawSkuInfo,
        rawDetailDesc: item.sourceData.rawDetailDesc,
        shopId: item.sourceData.shopId,
        shopName: item.sourceData.shopName,
      },
      aiData: {
        title: editedData.title!,
        slug: editedData.slug,
        description: editedData.description,
        brandId: editedData.brandId,
        brandName: editedData.brandName || aiSource?.aiBrandName,
        primaryCategoryId: editedData.primaryCategoryId,
        attributes: editedData.attributes,
        mixednessScore: aiSource?.mixednessScore,
        isMixedProduct: aiSource?.isMixedProduct,
        processingStrategy: aiSource?.processingStrategy,
        comprehensiveAnalysis: aiSource?.comprehensiveAnalysis,
      },
      status: ProductStatus.ACTIVE,
    });
    if (!result.success || !result.product) {
      throw new BadRequestException(
        result.errors?.join(', ') || 'Publish failed',
      );
    }
    await this.updateItemStatus(itemId, BatchJobItemStatus.PUBLISHED, {
      productId: result.product.id,
    });
    return result.product;
  }
  /**
   * 批量发布商品
   * @param itemIds 要发布的商品项 ID 列表
   * @param concurrency 并发数，默认 10（纯数据库操作，可以更高）
   */
  async batchPublish(itemIds: string[], concurrency = 10) {
    let success = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; error: string }> = [];

    // 分批并发处理
    for (let i = 0; i < itemIds.length; i += concurrency) {
      const batch = itemIds.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        batch.map((id) =>
          this.publishItem(id).then(
            (product) => ({ id, success: true, product }),
            (error) => {
              throw Object.assign(
                new Error(
                  error instanceof Error ? error.message : String(error),
                ),
                { id, originalError: error },
              );
            },
          ),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          success++;
        } else {
          failed++;
          const reason = result.reason as Error & { id: string };
          failedItems.push({ id: reason.id, error: reason.message });
          this.logger.error(
            `batchPublish failed for item ${reason.id}: ${reason.message}`,
          );
        }
      }
    }

    return { success, failed, failedItems };
  }

  /**
   * 更新子项状态（带状态机验证）
   * @param itemId 子项 ID
   * @param targetStatus 目标状态
   * @param data 附加数据
   * @param skipValidation 跳过状态验证（仅用于数据修复场景）
   */
  async updateItemStatus(
    itemId: string,
    targetStatus: BatchJobItemStatus,
    data?: {
      productId?: string;
      errorMessage?: string;
      sourceData?: Record<string, any>;
      aiGeneratedData?: Record<string, any>;
      finalData?: Record<string, any>;
      weidianItemId?: string;
    },
    skipValidation = false,
  ): Promise<void> {
    // 获取当前状态
    const item = await this.batchJobItemRepo.findOne({
      where: { id: itemId },
      select: ['id', 'status'],
    });

    if (!item) {
      throw new NotFoundException(`BatchJobItem ${itemId} not found`);
    }

    const currentStatus = item.status;

    // 状态机验证
    if (!skipValidation && currentStatus !== targetStatus) {
      try {
        BatchItemStateMachine.validateTransition(
          currentStatus,
          targetStatus,
          itemId,
        );
      } catch (error) {
        if (error instanceof InvalidStateTransitionError) {
          this.logger.warn(
            `Invalid state transition blocked: ${currentStatus} → ${targetStatus} [item: ${itemId}]`,
          );
          throw new BadRequestException(error.message);
        }
        throw error;
      }
    }

    // 记录状态变更
    if (currentStatus !== targetStatus) {
      this.logger.debug(
        `State transition: ${currentStatus} → ${targetStatus} [item: ${itemId}]`,
      );
    }

    await this.batchJobItemRepo.update(itemId, {
      status: targetStatus,
      processedAt: new Date(),
      ...data,
    });
  }

  /** @param sourceData See WeidianSourceData in ./types/batch-data.types.ts */
  async saveRawData(
    itemId: string,
    sourceData: Record<string, any>,
    weidianItemId?: string,
  ): Promise<void> {
    await this.batchJobItemRepo.update(itemId, {
      sourceData,
      weidianItemId,
    });
  }

  /** @param aiGeneratedData See AiGeneratedData in ./types/batch-data.types.ts */
  async saveAiGeneratedData(
    itemId: string,
    aiGeneratedData: Record<string, any>,
  ): Promise<void> {
    await this.batchJobItemRepo.update(itemId, {
      aiGeneratedData,
    });
  }

  /** @param finalData See FinalProductData in ./types/batch-data.types.ts */
  async updateFinalData(
    itemId: string,
    finalData: Record<string, any>,
  ): Promise<void> {
    await this.batchJobItemRepo.update(itemId, {
      finalData,
    });
  }

  // 更新任务进度，返回 statusMap 供 checkAndCompleteJob 复用
  async updateJobProgress(jobId: string): Promise<Record<string, number>> {
    const counts = await this.batchJobItemRepo
      .createQueryBuilder('item')
      .select('item.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('item.batchJobId = :jobId', { jobId })
      .groupBy('item.status')
      .getRawMany();

    const statusMap: Record<string, number> = counts.reduce(
      (acc, { status, count }) => ({ ...acc, [status]: parseInt(count) }),
      {},
    );

    const successStatuses = [
      BatchJobItemStatus.REVIEW,
      BatchJobItemStatus.APPROVED,
      BatchJobItemStatus.PUBLISHED,
    ];
    const processedStatuses = [
      ...successStatuses,
      BatchJobItemStatus.FAILED,
      BatchJobItemStatus.SKIPPED,
      BatchJobItemStatus.CANCELLED,
    ];
    const inProgressStatuses = [
      BatchJobItemStatus.FETCHING,
      BatchJobItemStatus.FETCHED,
      BatchJobItemStatus.GENERATING,
    ];
    const processed = processedStatuses.reduce(
      (total, status) => total + (statusMap[status] || 0),
      0,
    );
    const successItems = successStatuses.reduce(
      (total, status) => total + (statusMap[status] || 0),
      0,
    );
    const inProgressItems = inProgressStatuses.reduce(
      (total, status) => total + (statusMap[status] || 0),
      0,
    );

    await this.batchJobRepo.update(jobId, {
      processedItems: processed,
      successItems,
      failedItems: statusMap[BatchJobItemStatus.FAILED] || 0,
      inProgressItems,
    });

    return statusMap;
  }

  // 检查并完成任务（复用 updateJobProgress 返回的 statusMap，省去重复 COUNT 查询）
  async checkAndCompleteJob(
    jobId: string,
    statusMap?: Record<string, number>,
  ): Promise<void> {
    // 如果 job 已被取消，不覆盖状态
    const currentJob = await this.batchJobRepo.findOne({
      where: { id: jobId },
      select: ['id', 'status'],
    });
    if (currentJob?.status === BatchJobStatus.CANCELLED) {
      return;
    }

    // 如果没有传入 statusMap，自行查询（向后兼容）
    if (!statusMap) {
      statusMap = await this.updateJobProgress(jobId);
    }

    const pending = statusMap[BatchJobItemStatus.PENDING] || 0;
    const inProgress =
      (statusMap[BatchJobItemStatus.FETCHING] || 0) +
      (statusMap[BatchJobItemStatus.FETCHED] || 0) +
      (statusMap[BatchJobItemStatus.GENERATING] || 0);

    if (pending === 0 && inProgress === 0) {
      const successStatuses = [
        BatchJobItemStatus.REVIEW,
        BatchJobItemStatus.APPROVED,
        BatchJobItemStatus.PUBLISHED,
      ];
      const successItems = successStatuses.reduce(
        (total, s) => total + (statusMap[s] || 0),
        0,
      );
      const failedItems = statusMap[BatchJobItemStatus.FAILED] || 0;

      const status =
        failedItems > 0
          ? successItems > 0
            ? BatchJobStatus.PARTIAL
            : BatchJobStatus.FAILED
          : BatchJobStatus.COMPLETED;

      await this.batchJobRepo.update(jobId, {
        status,
        completedAt: new Date(),
      });
    }
  }

  async cancelJob(jobId: string): Promise<{ cancelledItems: number }> {
    const job = await this.batchJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    if (job.status !== BatchJobStatus.PROCESSING) {
      throw new BadRequestException(
        `Job ${jobId} is not processing (current: ${job.status})`,
      );
    }

    // 批量将未完成的 items 标记为 CANCELLED
    const result = await this.batchJobItemRepo
      .createQueryBuilder()
      .update(BatchJobItem)
      .set({ status: BatchJobItemStatus.CANCELLED, processedAt: new Date() })
      .where('batchJobId = :jobId', { jobId })
      .andWhere('status IN (:...statuses)', {
        statuses: [
          BatchJobItemStatus.PENDING,
          BatchJobItemStatus.FETCHING,
          BatchJobItemStatus.FETCHED,
          BatchJobItemStatus.GENERATING,
        ],
      })
      .execute();

    const cancelledItems = result.affected || 0;

    // 将 job 状态设为 CANCELLED
    await this.batchJobRepo.update(jobId, {
      status: BatchJobStatus.CANCELLED,
      completedAt: new Date(),
    });

    // 更新计数
    await this.updateJobProgress(jobId);

    this.logger.log(
      `Job ${jobId} cancelled, ${cancelledItems} items marked as cancelled`,
    );

    return { cancelledItems };
  }

  async deleteJob(jobId: string): Promise<void> {
    const job = await this.batchJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    await this.batchJobRepo.remove(job);
  }

  async batchDelete(itemIds: string[]) {
    if (itemIds.length === 0) {
      return { deleted: 0 };
    }

    const items = await this.batchJobItemRepo.find({
      where: { id: In(itemIds) },
    });

    if (items.length === 0) {
      return { deleted: 0 };
    }

    await this.batchJobItemRepo.remove(items);

    // Update job progress for each affected job
    const affectedJobIds = [...new Set(items.map((item) => item.batchJobId))];
    for (const jobId of affectedJobIds) {
      const statusMap = await this.updateJobProgress(jobId);
      await this.checkAndCompleteJob(jobId, statusMap);
    }

    return { deleted: items.length };
  }
}
