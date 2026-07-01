import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProductEvents } from '../shared/events';
import type {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../shared/events';
import { QUEUE_NAMES } from '../queue/queue.module';
import type { EmbeddingJobData } from '../queue/processors/embedding.processor';

/**
 * 搜索事件监听器
 * 监听商品变更事件，自动更新搜索索引和生成向量
 */
@Injectable()
export class SearchEventListener {
  private readonly logger = new Logger(SearchEventListener.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue<EmbeddingJobData>,
  ) {}

  /**
   * 商品创建时生成向量
   */
  @OnEvent(ProductEvents.CREATED)
  async handleProductCreated(payload: ProductCreatedEvent) {
    this.logger.debug(`商品创建，触发向量生成: ${payload.productId}`);

    try {
      // jobId 去重：同一 productId 的 CREATED 和 IMPORT_COMPLETED 事件只入队一次
      await this.embeddingQueue.add(
        'product-embedding',
        {
          productId: payload.productId,
          embeddingType: 'both',
          priority: 'normal',
        },
        {
          jobId: `embed-${payload.productId}`,
          delay: 2000,
          priority: 2,
        },
      );

      this.logger.log(`向量生成任务已加入队列: ${payload.productId}`);
    } catch (error) {
      this.logger.error(
        `添加向量生成任务失败: ${payload.productId}, ${error.message}`,
      );
    }
  }

  /**
   * 商品更新时重新生成文本向量（文本内容可能变化）
   */
  @OnEvent(ProductEvents.UPDATED)
  async handleProductUpdated(payload: ProductUpdatedEvent) {
    this.logger.debug(`商品更新，触发文本向量更新: ${payload.productId}`);

    try {
      // 只重新生成文本向量（图片向量通常不变）
      await this.embeddingQueue.add(
        'product-embedding',
        {
          productId: payload.productId,
          embeddingType: 'text', // 只更新文本向量
          priority: 'low',
        },
        {
          delay: 1000,
          priority: 3, // 低优先级
        },
      );
    } catch (error) {
      this.logger.error(
        `添加文本向量更新任务失败: ${payload.productId}, ${error.message}`,
      );
    }
  }

  /**
   * 商品删除时无需处理（向量表有 CASCADE DELETE）
   */
  @OnEvent(ProductEvents.DELETED)
  handleProductDeleted(payload: ProductDeletedEvent) {
    this.logger.debug(`商品删除，向量将自动清理: ${payload.productId}`);
    // product_text_embeddings 和 product_image_embeddings 表
    // 都设置了 ON DELETE CASCADE，删除商品时会自动清理
  }

  /**
   * 商品导入完成时批量生成向量
   */
  @OnEvent(ProductEvents.IMPORT_COMPLETED)
  async handleImportCompleted(payload: { productId: string }) {
    this.logger.debug(`商品导入完成，触发向量生成: ${payload.productId}`);

    try {
      // 同一 jobId：如果 CREATED 事件已入队，此处自动跳过（BullMQ 去重）
      await this.embeddingQueue.add(
        'product-embedding',
        {
          productId: payload.productId,
          embeddingType: 'both',
          priority: 'normal',
        },
        {
          jobId: `embed-${payload.productId}`,
          delay: 3000,
          priority: 2,
        },
      );
    } catch (error) {
      this.logger.error(
        `添加导入商品向量任务失败: ${payload.productId}, ${error.message}`,
      );
    }
  }
}
