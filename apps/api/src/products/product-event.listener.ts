import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductImportService } from './product-import.service';
import { ProductsService } from './products.service';
import { BatchEvents, SearchEvents } from '../shared/events';
import type {
  BatchItemProcessRequestEvent,
  OutboundClickRecordedEvent,
} from '../shared/events';

/**
 * 商品事件监听器
 * 处理来自其他模块的商品相关请求
 */
@Injectable()
export class ProductEventListener {
  private readonly logger = new Logger(ProductEventListener.name);

  constructor(
    private readonly productImportService: ProductImportService,
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 处理批量任务的商品处理请求
   */
  @OnEvent(BatchEvents.ITEM_PROCESS_REQUEST)
  async handleItemProcessRequest(payload: BatchItemProcessRequestEvent) {
    this.logger.debug(`收到商品处理请求: ${payload.itemId}`);

    try {
      if (payload.type === 'weidian_import' && payload.data.categoryId) {
        const result = await this.productImportService.importFromWeidian({
          url: payload.data.url,
          itemId: payload.data.itemId,
          primaryCategoryId: payload.data.categoryId,
        });

        // 发送处理完成事件
        this.eventEmitter.emit(BatchEvents.ITEM_PROCESS_COMPLETED, {
          requestId: payload.requestId,
          jobId: payload.jobId,
          itemId: payload.itemId,
          productId: result.product?.id,
          success: result.success,
          error: result.errors?.join(', '),
        });
      }
    } catch (error) {
      this.logger.error(`商品处理失败: ${error.message}`);

      this.eventEmitter.emit(BatchEvents.ITEM_PROCESS_COMPLETED, {
        requestId: payload.requestId,
        jobId: payload.jobId,
        itemId: payload.itemId,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * 外跳点击时递增 salesCount
   */
  @OnEvent(SearchEvents.OUTBOUND_CLICK_RECORDED)
  async handleOutboundClickForSales(payload: OutboundClickRecordedEvent) {
    try {
      await this.productsService.incrementSalesCount(payload.productId);
    } catch (err) {
      this.logger.error(
        `外跳递增 salesCount 失败 [${payload.productId}]: ${err.message}`,
      );
    }
  }
}
