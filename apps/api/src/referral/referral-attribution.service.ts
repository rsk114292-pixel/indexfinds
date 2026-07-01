import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ReferralClick } from './entities/referral-click.entity';
import {
  ReferralAttribution,
  AttributionEventType,
  AttributionStatus,
} from './entities/referral-attribution.entity';
import { ReferralRiskService } from './referral-risk.service';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';
import { ReferralCodeService } from './referral-code.service';
import type { AttachedAnonymousAttributionSummary } from './referral.service';

type ParsedAttributionCookie = {
  code: string;
  clickId: string;
  timestamp: number;
};

@Injectable()
export class ReferralAttributionService {
  private readonly logger = new Logger(ReferralAttributionService.name);

  constructor(
    @InjectRepository(ReferralClick)
    private readonly clickRepo: Repository<ReferralClick>,
    @InjectRepository(ReferralAttribution)
    private readonly attrRepo: Repository<ReferralAttribution>,
    private readonly riskService: ReferralRiskService,
    private readonly analyticsDedupService: AnalyticsDedupService,
    private readonly referralCodeService: ReferralCodeService,
  ) {}

  async recordClick(data: {
    code: string;
    sessionId: string;
    landingPage?: string;
    redirectTo?: string;
    userAgent?: string;
    ip?: string;
    referer?: string;
  }): Promise<ReferralClick | null> {
    const referralCode = await this.referralCodeService.findByCode(data.code);
    if (!referralCode) {
      return null;
    }

    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'referral_click',
      windowMs: 30 * 60 * 1000,
      parts: [
        data.sessionId || data.ip || referralCode.id,
        referralCode.id,
        data.landingPage || data.redirectTo || '/',
      ],
    });
    if (!shouldRecord) {
      return this.findRecentClick(data.sessionId, data.code);
    }

    const riskResult = await this.riskService.checkClickRisk({
      ip: data.ip,
      sessionId: data.sessionId,
      userAgent: data.userAgent,
      referralCodeId: referralCode.id,
      referer: data.referer,
    });
    if (!riskResult.isValid) {
      this.logger.warn(
        `Click rejected for code ${data.code}: ${riskResult.reason} (score=${riskResult.riskScore})`,
      );
      return null;
    }

    const click = this.clickRepo.create({
      referralCodeId: referralCode.id,
      sessionId: data.sessionId,
      landingPage: data.landingPage,
      redirectTo: data.redirectTo,
      userAgent: data.userAgent,
      ip: data.ip,
      referer: data.referer,
    });
    await this.clickRepo.save(click);

    return click;
  }

  async findRecentClick(
    sessionId: string,
    referralCode: string,
  ): Promise<ReferralClick | null> {
    const code = await this.referralCodeService.findByCode(referralCode);
    if (!code) return null;

    return this.clickRepo.findOne({
      where: { sessionId, referralCodeId: code.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createAttribution(data: {
    referralClickId: string;
    eventType: AttributionEventType;
    userId?: string;
    eventData?: Record<string, any>;
  }): Promise<ReferralAttribution | null> {
    const click = await this.clickRepo.findOne({
      where: { id: data.referralClickId },
    });

    if (!click) {
      return null;
    }

    if (
      data.eventType === AttributionEventType.PRODUCT_VIEW &&
      data.eventData?.productId
    ) {
      const existing = await this.attrRepo
        .createQueryBuilder('attr')
        .where('attr.referralClickId = :clickId', {
          clickId: data.referralClickId,
        })
        .andWhere('attr.eventType = :eventType', { eventType: data.eventType })
        .andWhere('attr.userId = :userId', { userId: data.userId })
        .andWhere('attr."eventData"->>\'productId\' = :productId', {
          productId: data.eventData.productId,
        })
        .getOne();

      if (existing) {
        return existing;
      }
    } else {
      const existing = await this.attrRepo.findOne({
        where: {
          referralClickId: data.referralClickId,
          eventType: data.eventType,
          userId: data.userId,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const attribution = this.attrRepo.create({
      referralCodeId: click.referralCodeId,
      referralClickId: data.referralClickId,
      eventType: data.eventType,
      userId: data.userId,
      eventData: data.eventData,
      status: AttributionStatus.PENDING,
    });

    return this.attrRepo.save(attribution);
  }

  parseAttributionCookie(cookieValue: string): ParsedAttributionCookie | null {
    if (!cookieValue) return null;

    try {
      const params = new URLSearchParams(cookieValue);
      const clickId = params.get('ref_click_id');
      const code = params.get('referral_code');
      const exp = params.get('exp');

      if (!clickId || !code || !exp) return null;

      const expTimestamp = parseInt(exp, 10);
      if (Date.now() > expTimestamp) {
        return null;
      }

      return { code, clickId, timestamp: expTimestamp };
    } catch {
      return null;
    }
  }

  async triggerAttributionFromCookie(
    cookieValue: string,
    eventType: AttributionEventType,
    userId?: string,
    eventData?: Record<string, any>,
  ): Promise<ReferralAttribution | null> {
    const parsed = this.parseAttributionCookie(cookieValue);
    if (!parsed) return null;

    return this.createAttribution({
      referralClickId: parsed.clickId,
      eventType,
      userId,
      eventData,
    });
  }

  async attachAnonymousAttributionsToUserFromCookie(
    cookieValue: string,
    userId: string,
  ): Promise<AttachedAnonymousAttributionSummary> {
    if (!userId) {
      return {
        attachedCount: 0,
        highIntentActionCount: 0,
      };
    }

    const parsed = this.parseAttributionCookie(cookieValue);
    if (!parsed) {
      return {
        attachedCount: 0,
        highIntentActionCount: 0,
      };
    }

    const highIntentActionCount = await this.attrRepo.count({
      where: {
        referralClickId: parsed.clickId,
        userId: IsNull(),
        eventType: In([
          AttributionEventType.PURCHASE_CLICK,
          AttributionEventType.FAVORITE,
        ]),
      },
    });

    const result = await this.attrRepo
      .createQueryBuilder()
      .update(ReferralAttribution)
      .set({ userId })
      .where('referralClickId = :clickId', {
        clickId: parsed.clickId,
      })
      .andWhere('userId IS NULL')
      .andWhere('eventType IN (:...types)', {
        types: [
          AttributionEventType.PRODUCT_VIEW,
          AttributionEventType.PURCHASE_CLICK,
          AttributionEventType.FAVORITE,
        ],
      })
      .execute();

    return {
      attachedCount: result.affected ?? 0,
      highIntentActionCount,
    };
  }

  async trackProductViewFromCookie(
    cookieValue: string,
    productId: string,
    userId: string | undefined,
    context: AnalyticsRequestContext,
  ): Promise<ReferralAttribution | null> {
    const parsed = this.parseAttributionCookie(cookieValue);
    if (!parsed) {
      return null;
    }

    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'referral_product_view',
      windowMs: 30 * 60 * 1000,
      parts: [
        context.trustedVisitorId || context.ipAddress,
        parsed.clickId,
        productId,
      ],
    });

    if (!shouldRecord) {
      return this.attrRepo
        .createQueryBuilder('attr')
        .where('attr.referralClickId = :clickId', {
          clickId: parsed.clickId,
        })
        .andWhere('attr.eventType = :eventType', {
          eventType: AttributionEventType.PRODUCT_VIEW,
        })
        .andWhere('attr.userId = :userId', { userId })
        .andWhere('attr."eventData"->>\'productId\' = :productId', {
          productId,
        })
        .getOne();
    }

    return this.createAttribution({
      referralClickId: parsed.clickId,
      eventType: AttributionEventType.PRODUCT_VIEW,
      userId,
      eventData: { productId },
    });
  }
}
