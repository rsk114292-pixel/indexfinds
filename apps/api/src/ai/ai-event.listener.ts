import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AIService } from './ai.service';
import { AIEvents } from '../shared/events';
import type { AIAnalyzeRequestEvent } from '../shared/events';

/**
 * AI 事件监听器
 * 处理来自其他模块的 AI 分析请求
 */
@Injectable()
export class AIEventListener {
  private readonly logger = new Logger(AIEventListener.name);

  constructor(
    private readonly aiService: AIService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 处理商品分析请求
   */
  @OnEvent(AIEvents.ANALYZE_REQUEST)
  async handleAnalyzeRequest(payload: AIAnalyzeRequestEvent) {
    this.logger.debug(`收到 AI 分析请求: ${payload.requestId}`);

    try {
      const result = await this.aiService.analyzeProductImage(
        payload.images,
        payload.existingBrands?.map((name) => ({ name })),
        payload.existingCategories?.map((slug) => ({ name: slug, slug })),
      );

      // 发送成功响应
      this.eventEmitter.emit(AIEvents.ANALYZE_RESPONSE, {
        requestId: payload.requestId,
        success: true,
        result: {
          suggestedTitle: result.title,
          detectedBrand: result.brandName
            ? {
                name: result.brandName,
                confidence: result.confidence || 0.8,
              }
            : undefined,
          suggestedCategory: result.category
            ? {
                slug: result.category,
                confidence: result.confidence || 0.8,
              }
            : undefined,
          attributes: result.attributes,
        },
      });

      this.logger.debug(`AI 分析完成: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`AI 分析失败: ${error.message}`);

      // 发送失败响应
      this.eventEmitter.emit(AIEvents.ANALYZE_FAILED, {
        requestId: payload.requestId,
        success: false,
        error: error.message,
      });
    }
  }
}
