import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClickEvent } from './entities/click-event.entity';
import { CreateClickEventDto } from './dto/create-click-event.dto';
import { ReferralService } from '../referral/referral.service';
import { AttributionEventType } from '../referral/entities/referral-attribution.entity';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ClickEvent)
    private clickEventRepo: Repository<ClickEvent>,
    private referralService: ReferralService,
    private readonly analyticsDedupService: AnalyticsDedupService,
  ) {}

  async recordLegacyReferralClickEvent(
    dto: CreateClickEventDto,
    referralCookie?: string,
    context?: AnalyticsRequestContext,
  ): Promise<ClickEvent> {
    const trustedVisitorId = context?.trustedVisitorId || dto.sessionId;
    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'legacy_outbound_click',
      windowMs: 10 * 60 * 1000,
      parts: [trustedVisitorId, dto.productId, dto.platform],
    });
    if (!shouldRecord) {
      return this.clickEventRepo.create({
        ...dto,
        userId: context?.userId || dto.userId,
        sessionId: trustedVisitorId,
        userAgent: context?.userAgent || dto.userAgent,
        ip: context?.ipAddress || dto.ip,
      });
    }

    // Legacy referral/conversion event log.
    // Do not add new analytics dimensions here; use outbound_clicks instead.
    const event = this.clickEventRepo.create({
      ...dto,
      userId: context?.userId || dto.userId,
      sessionId: trustedVisitorId,
      userAgent: context?.userAgent || dto.userAgent,
      ip: context?.ipAddress || dto.ip,
    });
    const savedEvent = await this.clickEventRepo.save(event);

    // 处理推荐归因 - 外跳点击
    if (referralCookie) {
      await this.referralService.triggerAttributionFromCookie(
        referralCookie,
        AttributionEventType.PURCHASE_CLICK,
        context?.userId || dto.userId,
        { productId: dto.productId, platform: dto.platform },
      );
      // 检查是否满足所有转化条件
      if (context?.userId || dto.userId) {
        await this.referralService.checkAndFinalizeConversion(
          context?.userId || dto.userId!,
        );
      }
    }

    return savedEvent;
  }
}
