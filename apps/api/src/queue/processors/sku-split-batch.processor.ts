import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../queue.module';
import { SkuSplitService } from '../../products/services/sku-split.service';
import {
  SkuSplitBatch,
  SkuSplitBatchStatus,
} from '../../products/entities/sku-split-batch.entity';
import {
  SkuSplitBatchItem,
  SkuSplitBatchItemStatus,
} from '../../products/entities/sku-split-batch-item.entity';
import {
  SkuSplitJob,
  SkuSplitJobStatus,
} from '../../products/entities/sku-split-job.entity';

export interface SkuSplitBatchJobData {
  batchId: string;
}

class BatchPausedError extends Error {}
class BatchCancelledError extends Error {}

const TERMINAL_SPLIT_JOB_STATUSES = new Set<SkuSplitJobStatus>([
  SkuSplitJobStatus.COMPLETED,
  SkuSplitJobStatus.PARTIAL_FAILED,
  SkuSplitJobStatus.FAILED,
]);

@Processor(QUEUE_NAMES.SKU_SPLIT_BATCH, {
  concurrency: 1,
  lockDuration: 10 * 60 * 1000,
})
export class SkuSplitBatchProcessor extends WorkerHost {
  private readonly logger = new Logger(SkuSplitBatchProcessor.name);

  constructor(
    @InjectRepository(SkuSplitBatch)
    private readonly batchRepository: Repository<SkuSplitBatch>,
    @InjectRepository(SkuSplitBatchItem)
    private readonly batchItemRepository: Repository<SkuSplitBatchItem>,
    @InjectRepository(SkuSplitJob)
    private readonly splitJobRepository: Repository<SkuSplitJob>,
    private readonly skuSplitService: SkuSplitService,
  ) {
    super();
  }

  async process(job: Job<SkuSplitBatchJobData>): Promise<void> {
    const { batchId } = job.data;
    this.logger.log(`开始处理自动拆分批次: ${batchId}`);

    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });
    if (!batch) {
      this.logger.warn(`自动拆分批次不存在: ${batchId}`);
      return;
    }
    if (
      batch.status === SkuSplitBatchStatus.PAUSED ||
      batch.status === SkuSplitBatchStatus.CANCELLED
    ) {
      this.logger.log(
        `自动拆分批次跳过处理: ${batchId}, 状态: ${batch.status}`,
      );
      return;
    }

    await this.batchRepository.update(batchId, {
      status: SkuSplitBatchStatus.PROCESSING,
      errorMessage: null,
      completedAt: null,
    });

    const items =
      (await this.batchItemRepository.find({
        where: { batchId },
        order: { createdAt: 'ASC' },
      })) ?? [];

    try {
      for (const item of items) {
        const currentBatch = await this.batchRepository.findOne({
          where: { id: batchId },
        });
        if (!currentBatch) return;
        if (currentBatch.status === SkuSplitBatchStatus.PAUSED) {
          this.logger.log(`自动拆分批次已暂停: ${batchId}`);
          await this.refreshBatchProgress(batchId);
          return;
        }
        if (currentBatch.status === SkuSplitBatchStatus.CANCELLED) {
          this.logger.log(`自动拆分批次已取消: ${batchId}`);
          await this.refreshBatchProgress(batchId);
          return;
        }

        if (
          item.status === SkuSplitBatchItemStatus.COMPLETED ||
          item.status === SkuSplitBatchItemStatus.FAILED ||
          item.status === SkuSplitBatchItemStatus.SKIPPED ||
          item.status === SkuSplitBatchItemStatus.CANCELLED
        ) {
          continue;
        }

        if (
          item.status === SkuSplitBatchItemStatus.WAITING_JOB &&
          item.splitJobId
        ) {
          await this.resumeWaitingBatchItem(batchId, item);
        } else {
          await this.processBatchItem(batchId, item);
        }
        await this.refreshBatchProgress(batchId);
      }
    } catch (error) {
      if (
        error instanceof BatchPausedError ||
        error instanceof BatchCancelledError
      ) {
        await this.refreshBatchProgress(batchId);
        this.logger.log(
          `自动拆分批次控制中断: ${batchId} - ${error instanceof BatchPausedError ? 'paused' : 'cancelled'}`,
        );
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`自动拆分批次失败: ${batchId} - ${message}`);
      await this.batchRepository.update(batchId, {
        status: SkuSplitBatchStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });
      throw error;
    }

    await this.refreshBatchProgress(batchId);
    this.logger.log(`自动拆分批次处理结束: ${batchId}`);
  }

  private async processBatchItem(
    batchId: string,
    item: SkuSplitBatchItem,
  ): Promise<void> {
    await this.updateBatchItem(item.id, {
      status: SkuSplitBatchItemStatus.ANALYZING,
      errorMessage: null,
    });
    await this.appendItemLog(item.id, '开始自动分析', {
      sourceUrl: item.sourceUrl,
    });

    try {
      const preview = await this.skuSplitService.previewSplit(item.sourceUrl);
      const selectedAttrIds = preview.variants
        .filter((variant) => !variant.duplicateInfo)
        .map((variant) => variant.attrId);

      await this.updateBatchItem(item.id, {
        weidianItemId: preview.weidianItemId,
        selectedCount: selectedAttrIds.length,
      });
      await this.appendItemLog(item.id, '预览完成', {
        weidianItemId: preview.weidianItemId,
        totalVariants: preview.totalVariants,
        selectedCount: selectedAttrIds.length,
      });

      if (selectedAttrIds.length === 0) {
        await this.updateBatchItem(item.id, {
          status: SkuSplitBatchItemStatus.SKIPPED,
          processedAt: new Date(),
        });
        await this.appendItemLog(item.id, '自动跳过', {
          reason: '全部变体均已重复或无可创建款式',
        });
        return;
      }

      await this.updateBatchItem(item.id, {
        status: SkuSplitBatchItemStatus.CREATING_JOB,
      });

      const splitJob = await this.skuSplitService.createSplitJob(
        preview.weidianItemId,
        undefined,
        selectedAttrIds,
        undefined,
        batchId,
      );

      await this.updateBatchItem(item.id, {
        splitJobId: splitJob.jobId,
        status: SkuSplitBatchItemStatus.WAITING_JOB,
      });
      await this.appendItemLog(item.id, '已创建拆分任务', {
        splitJobId: splitJob.jobId,
        selectedCount: selectedAttrIds.length,
      });

      const splitJobStatus = await this.waitForSplitJobTerminal(
        batchId,
        splitJob.jobId,
      );

      if (splitJobStatus === SkuSplitJobStatus.COMPLETED) {
        await this.updateBatchItem(item.id, {
          status: SkuSplitBatchItemStatus.COMPLETED,
          processedAt: new Date(),
        });
        await this.appendItemLog(item.id, '拆分任务完成', {
          splitJobId: splitJob.jobId,
          splitJobStatus,
        });
        return;
      }

      await this.updateBatchItem(item.id, {
        status: SkuSplitBatchItemStatus.FAILED,
        errorMessage:
          splitJobStatus === SkuSplitJobStatus.PARTIAL_FAILED
            ? '拆分任务部分失败'
            : '拆分任务失败',
        processedAt: new Date(),
      });
      await this.appendItemLog(item.id, '拆分任务异常结束', {
        splitJobId: splitJob.jobId,
        splitJobStatus,
      });
    } catch (error) {
      if (
        error instanceof BatchPausedError ||
        error instanceof BatchCancelledError
      ) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      await this.updateBatchItem(item.id, {
        status: SkuSplitBatchItemStatus.FAILED,
        errorMessage: message,
        processedAt: new Date(),
      });
      await this.appendItemLog(item.id, '自动处理失败', {
        error: message,
      });
    }
  }

  private async resumeWaitingBatchItem(
    batchId: string,
    item: SkuSplitBatchItem,
  ): Promise<void> {
    const splitJobStatus = await this.waitForSplitJobTerminal(
      batchId,
      item.splitJobId!,
    );

    if (splitJobStatus === SkuSplitJobStatus.COMPLETED) {
      await this.updateBatchItem(item.id, {
        status: SkuSplitBatchItemStatus.COMPLETED,
        processedAt: new Date(),
      });
      await this.appendItemLog(item.id, '恢复等待后完成', {
        splitJobId: item.splitJobId,
        splitJobStatus,
      });
      return;
    }

    await this.updateBatchItem(item.id, {
      status: SkuSplitBatchItemStatus.FAILED,
      errorMessage:
        splitJobStatus === SkuSplitJobStatus.PARTIAL_FAILED
          ? '拆分任务部分失败'
          : '拆分任务失败',
      processedAt: new Date(),
    });
    await this.appendItemLog(item.id, '恢复等待后异常结束', {
      splitJobId: item.splitJobId,
      splitJobStatus,
    });
  }

  private async waitForSplitJobTerminal(
    batchId: string,
    splitJobId: string,
  ): Promise<SkuSplitJobStatus> {
    for (let i = 0; i < 240; i++) {
      const batch = await this.batchRepository.findOne({
        where: { id: batchId },
      });
      if (batch?.status === SkuSplitBatchStatus.PAUSED) {
        throw new BatchPausedError(`批次已暂停: ${batchId}`);
      }
      if (batch?.status === SkuSplitBatchStatus.CANCELLED) {
        throw new BatchCancelledError(`批次已取消: ${batchId}`);
      }

      const splitJob = await this.splitJobRepository.findOne({
        where: { id: splitJobId },
      });

      if (!splitJob) {
        throw new Error(`拆分任务不存在: ${splitJobId}`);
      }

      if (TERMINAL_SPLIT_JOB_STATUSES.has(splitJob.status)) {
        return splitJob.status;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`等待拆分任务超时: ${splitJobId}`);
  }

  private async refreshBatchProgress(batchId: string): Promise<void> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId },
    });
    if (!batch) return;

    const items =
      (await this.batchItemRepository.find({
        where: { batchId },
      })) ?? [];

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
    const processedUrls =
      successUrls + failedUrls + skippedUrls + cancelledUrls;

    let status = batch.status;
    let completedAt = batch.completedAt;

    if (batch.status === SkuSplitBatchStatus.CANCELLED) {
      completedAt = batch.completedAt || new Date();
    } else if (batch.status === SkuSplitBatchStatus.PAUSED) {
      completedAt = null;
    } else if (processedUrls >= batch.totalUrls) {
      completedAt = new Date();
      if (failedUrls === batch.totalUrls) {
        status = SkuSplitBatchStatus.FAILED;
      } else if (failedUrls > 0) {
        status = SkuSplitBatchStatus.PARTIAL_FAILED;
      } else {
        status = SkuSplitBatchStatus.COMPLETED;
      }
    }

    await this.batchRepository.update(batchId, {
      processedUrls,
      successUrls,
      failedUrls,
      skippedUrls,
      cancelledUrls,
      status,
      completedAt,
    });
  }

  private async updateBatchItem(
    itemId: string,
    patch: Partial<SkuSplitBatchItem>,
  ): Promise<void> {
    const item = await this.batchItemRepository.findOne({
      where: { id: itemId },
    });
    if (!item) return;

    Object.assign(item, patch);
    await this.batchItemRepository.save(item);
  }

  private async appendItemLog(
    itemId: string,
    event: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const item = await this.batchItemRepository.findOne({
      where: { id: itemId },
    });
    if (!item) return;

    const nextLog = [
      ...(item.processingLog || []),
      {
        ts: new Date().toISOString(),
        event,
        ...(data ? { data } : {}),
      },
    ];

    item.processingLog = nextLog;
    await this.batchItemRepository.save(item);
  }
}
