import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrandsService } from './brands.service';
import { ProductEvents } from '../shared/events';
import type { BrandMatchRequestEvent } from '../shared/events';
import { BrandEvents } from '../shared/events/brand.events';

/**
 * 品牌事件监听器
 * 处理来自其他模块的品牌相关事件请求
 */
@Injectable()
export class BrandEventListener {
  private readonly logger = new Logger(BrandEventListener.name);

  constructor(
    private readonly brandsService: BrandsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 处理品牌匹配请求
   * 当其他模块（如 ProductImportService）需要查找或创建品牌时触发
   */
  @OnEvent(ProductEvents.REQUEST_BRAND_MATCH)
  async handleBrandMatchRequest(payload: BrandMatchRequestEvent) {
    this.logger.debug(`收到品牌匹配请求: ${payload.brandName}`);

    try {
      const brand = await this.brandsService.findOrCreateByName(
        payload.brandName,
        payload.confidence,
      );

      // 发送响应事件
      this.eventEmitter.emit(BrandEvents.MATCH_RESPONSE, {
        requestId: payload.requestId,
        brandId: brand?.id,
        brandName: brand?.name,
        isNew: brand?.metadata?.aiSource === 'auto-created',
      });

      this.logger.debug(`品牌匹配完成: ${brand?.name || '未找到'}`);
    } catch (error) {
      this.logger.error(`品牌匹配失败: ${error.message}`);
      // 发送失败响应
      this.eventEmitter.emit(BrandEvents.MATCH_RESPONSE, {
        requestId: payload.requestId,
        brandId: null,
        brandName: null,
        isNew: false,
        error: error.message,
      });
    }
  }

  /**
   * 监听商品创建事件，用于统计和日志
   */
  @OnEvent(ProductEvents.CREATED)
  handleProductCreated(payload: { brandId?: string }) {
    if (payload.brandId) {
      this.logger.debug(`商品创建关联品牌: ${payload.brandId}`);
      // 可以在这里更新品牌的商品计数缓存等
    }
  }

  /**
   * 监听商品导入完成事件
   */
  @OnEvent(ProductEvents.IMPORT_COMPLETED)
  handleProductImportCompleted(payload: { productId: string; source: string }) {
    this.logger.debug(
      `商品导入完成: ${payload.productId} from ${payload.source}`,
    );
  }
}
