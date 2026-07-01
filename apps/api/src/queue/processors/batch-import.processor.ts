import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QUEUE_NAMES } from '../queue.module';
import { BatchService } from '../../batch/batch.service';
import { BatchJobItemStatus } from '../../batch/entities/batch-job-item.entity';
import { BatchJobType } from '../../batch/entities/batch-job.entity';
import {
  extractErrorCode,
  isRetryableError,
} from '../../batch/errors/batch.errors';
import { WeidianService } from '../../weidian/weidian.service';
import { ProductsService } from '../../products/products.service';
import { UnifiedDuplicateCheckService } from '../../products/services/unified-duplicate-check.service';

export interface BatchImportJobData {
  jobId: string;
  itemId: string;
  sourceUrl: string;
  jobType?: BatchJobType;
}

// 微店抓取并发限制为 2，避免 IP 被封
@Processor(QUEUE_NAMES.BATCH_IMPORT, {
  concurrency: 2,
  lockDuration: 60000, // 60秒，纯抓取无图片处理
})
export class BatchImportProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchImportProcessor.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly weidianService: WeidianService,
    private readonly productsService: ProductsService,
    private readonly duplicateCheckService: UnifiedDuplicateCheckService,
    @InjectQueue(QUEUE_NAMES.AI_GENERATION)
    private readonly aiGenerationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<BatchImportJobData>): Promise<void> {
    const { jobId, itemId, sourceUrl, jobType } = job.data;
    this.logger.log(
      `Processing item ${itemId} from ${sourceUrl} (type: ${jobType || 'IMPORT'})`,
    );

    // 防御性检查：itemId 必须是有效的非空字符串
    if (!itemId || itemId === 'undefined' || itemId === 'null') {
      this.logger.error(
        `Invalid itemId in batch import job: ${JSON.stringify(job.data)}`,
      );
      return;
    }

    try {
      // 检查 item 是否已处于终态（取消、已发布、已跳过等）
      const item = await this.batchService.getItem(itemId);
      if (!item) {
        this.logger.error(`Item ${itemId} not found, skipping`);
        return;
      }
      const terminalStatuses = [
        BatchJobItemStatus.CANCELLED,
        BatchJobItemStatus.PUBLISHED,
        BatchJobItemStatus.SKIPPED,
        BatchJobItemStatus.REVIEW,
        BatchJobItemStatus.APPROVED,
      ];
      if (terminalStatuses.includes(item.status)) {
        this.logger.log(
          `Item ${itemId} is already in terminal state (${item.status}), skipping`,
        );
        return;
      }

      await this.batchService.appendLog(itemId, '开始抓取', { sourceUrl });

      // Update status to fetching
      await this.batchService.updateItemStatus(
        itemId,
        BatchJobItemStatus.FETCHING,
      );

      const extractedItemId = this.weidianService.extractItemId(sourceUrl);
      if (!extractedItemId) {
        throw new Error('Invalid Weidian URL: unable to extract itemId');
      }

      // 去重检查（UPDATE 模式跳过）
      if (jobType !== BatchJobType.UPDATE) {
        const dupResult =
          await this.duplicateCheckService.checkByWeidianItemId(
            extractedItemId,
          );

        if (dupResult.isDuplicate) {
          await this.batchService.appendLog(itemId, '跳过：产品已存在', {
            weidianItemId: extractedItemId,
            existingProductId: dupResult.matchedProductId,
          });
          await this.batchService.updateItemStatus(
            itemId,
            BatchJobItemStatus.SKIPPED,
            { errorMessage: 'Duplicate product detected' },
          );
          this.logger.log(`Item ${itemId} skipped (duplicate)`);
          return;
        }
      } else {
        const existing =
          await this.productsService.findByWeidianItemId(extractedItemId);
        if (existing) {
          await this.batchService.appendLog(
            itemId,
            '更新模式：产品已存在，继续处理',
          );
          this.logger.log(
            `Item ${itemId} will be updated (existing product found)`,
          );
        }
      }

      // 随机延迟 500ms-1500ms，降低被微店封控的风险
      const delay = 500 + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const productData = await this.weidianService.scrapeItem({
        itemId: extractedItemId,
      });

      if (!productData) {
        throw new Error('Failed to fetch product data from Weidian');
      }

      await this.batchService.appendLog(itemId, '抓取成功', {
        title: productData.title,
        imagesCount: productData.images?.length || 0,
        skuCount: productData.skus?.length || 0,
      });

      this.logger.log(`Weidian data for item ${itemId}:`, {
        title: productData.title,
        imagesCount: productData.images?.length || 0,
        hasMainImage: !!productData.mainImage,
        images: productData.images?.slice(0, 3), // 只记录前3张图片URL
      });

      await this.batchService.saveRawData(itemId, productData, extractedItemId);
      await this.batchService.updateItemStatus(
        itemId,
        BatchJobItemStatus.FETCHED,
      );

      // 图片视觉去重（UPDATE 模式跳过）
      let mainImageEmbedding: number[] | undefined;
      if (productData.mainImage && jobType !== BatchJobType.UPDATE) {
        const visualResult =
          await this.duplicateCheckService.checkByImageSimilarity(
            productData.mainImage,
          );

        if (visualResult.isDuplicate) {
          this.logger.log(
            `Item ${itemId} visual duplicate detected: ${visualResult.matchedProductId} (${visualResult.similarity}%)`,
          );
          await this.batchService.appendLog(itemId, '检测到视觉重复产品', {
            duplicateProductId: visualResult.matchedProductId,
            duplicateTitle: visualResult.matchedProductTitle,
            similarity: visualResult.similarity,
          });
          await this.batchService.saveAiGeneratedData(itemId, {
            duplicateOf: {
              productId: visualResult.matchedProductId,
              title: visualResult.matchedProductTitle,
              mainImage: visualResult.matchedProductImage,
              similarity: visualResult.similarity,
            },
          });
          await this.batchService.updateItemStatus(
            itemId,
            BatchJobItemStatus.REVIEW,
          );
          return;
        }

        // 保存 embedding 供 AI 阶段产品创建后同步写入
        mainImageEmbedding = visualResult.embedding;
      }

      // 将主图 embedding 暂存到 aiGeneratedData，供后续 AI 创建阶段复用
      if (mainImageEmbedding) {
        await this.batchService.saveAiGeneratedData(itemId, {
          mainImageEmbedding,
        });
      }

      await this.aiGenerationQueue.add('generate-content', {
        jobId,
        itemId,
      });

      await this.batchService.appendLog(itemId, '已加入 AI 生成队列');
      this.logger.log(`Item ${itemId} fetched successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = extractErrorCode(error);
      const canRetry = isRetryableError(error);
      const attemptsRemaining =
        (job.opts.attempts || 3) - (job.attemptsMade || 0) - 1;

      this.logger.error(
        `Item ${itemId} failed: [${errorCode}] ${errorMessage}`,
      );

      await this.batchService.appendLog(itemId, '抓取失败', {
        errorCode,
        errorMessage,
        canRetry,
        attemptsRemaining,
      });

      if (canRetry && attemptsRemaining > 0) {
        // 可重试且还有重试次数，抛出错误让 BullMQ 重试
        this.logger.warn(
          `🔄 Item ${itemId} will retry (${attemptsRemaining} attempts remaining)`,
        );
        throw error;
      }

      // 不可重试或重试次数用尽，标记为失败
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
}
