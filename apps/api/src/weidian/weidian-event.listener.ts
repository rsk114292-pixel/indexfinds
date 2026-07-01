import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WeidianService } from './weidian.service';
import { CacheRefreshService } from './cache-refresh.service';
import { WeidianEvents, SearchEvents } from '../shared/events';
import type {
  WeidianScrapeRequestEvent,
  WeidianExtractIdRequestEvent,
  OutboundClickRecordedEvent,
} from '../shared/events';

/**
 * 微店事件监听器
 * 处理来自其他模块的微店爬虫请求和缓存刷新事件
 */
@Injectable()
export class WeidianEventListener {
  private readonly logger = new Logger(WeidianEventListener.name);

  constructor(
    private readonly weidianService: WeidianService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheRefreshService: CacheRefreshService,
  ) {}

  /**
   * 处理商品抓取请求
   */
  @OnEvent(WeidianEvents.SCRAPE_REQUEST)
  async handleScrapeRequest(payload: WeidianScrapeRequestEvent) {
    this.logger.debug(`收到微店抓取请求: ${payload.itemId}`);

    try {
      const data = await this.weidianService.scrapeItem({
        itemId: payload.itemId,
        wdtoken: payload.wdtoken,
        forceRefresh: payload.forceRefresh,
      });

      // 发送成功响应
      this.eventEmitter.emit(WeidianEvents.SCRAPE_RESPONSE, {
        requestId: payload.requestId,
        success: true,
        data: {
          itemId: data.itemId,
          title: data.title || '',
          price: data.priceMin || 0,
          images: data.images,
          description: undefined,
          skus: data.skus?.map((sku) => ({
            skuId: sku.skuId || sku.weidianSkuId,
            title: sku.skuKey,
            price: sku.price,
            stock: sku.stock,
            imageUrl: sku.image,
          })),
          shopInfo: data.shopId
            ? { shopId: data.shopId, shopName: data.shopName || '' }
            : undefined,
          rawData: data.rawSkuInfo,
        },
      });

      this.logger.debug(`微店抓取成功: ${payload.itemId}`);
    } catch (error) {
      this.logger.error(`微店抓取失败: ${error.message}`);

      // 发送失败响应
      this.eventEmitter.emit(WeidianEvents.SCRAPE_FAILED, {
        requestId: payload.requestId,
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * 处理 URL 提取 ID 请求
   */
  @OnEvent(WeidianEvents.EXTRACT_ID_REQUEST)
  handleExtractIdRequest(payload: WeidianExtractIdRequestEvent) {
    this.logger.debug(`收到提取 ID 请求: ${payload.url}`);

    const itemId = this.weidianService.extractItemId(payload.url);

    this.eventEmitter.emit(WeidianEvents.EXTRACT_ID_RESPONSE, {
      requestId: payload.requestId,
      itemId,
    });
  }

  /**
   * 处理外跳点击事件 — 触发缓存刷新检查
   * 由 SearchModule 的 OutboundTrackingService 通过事件总线发出，
   * 解耦 SearchModule 对 WeidianModule 的直接依赖
   */
  @OnEvent(SearchEvents.OUTBOUND_CLICK_RECORDED)
  async handleOutboundClick(payload: OutboundClickRecordedEvent) {
    try {
      await this.cacheRefreshService.triggerRefreshOnClick(payload.productId);
    } catch (err) {
      this.logger.error(`外跳点击缓存刷新失败: ${err.message}`);
    }
  }
}
