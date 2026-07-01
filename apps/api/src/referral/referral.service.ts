import { Injectable } from '@nestjs/common';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralClick } from './entities/referral-click.entity';
import {
  ReferralAttribution,
  AttributionEventType,
} from './entities/referral-attribution.entity';
import { TrackReferralExperimentDto } from './dto/track-referral-experiment.dto';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';
import { ReferralExperimentService } from './referral-experiment.service';
import { ReferralAnalyticsService } from './referral-analytics.service';
import { ReferralCodeService } from './referral-code.service';
import { ReferralAttributionService } from './referral-attribution.service';
import { ReferralConversionService } from './referral-conversion.service';

export interface ReferralClickMetrics {
  rawClicks: number;
  trustedClicks: number;
  uniqueSessions: number;
  uniqueIps: number;
  suspiciousClicks: number;
  emptyRefererClicks: number;
}

export interface AttachedAnonymousAttributionSummary {
  attachedCount: number;
  highIntentActionCount: number;
}

export interface CurrentUserReferralActivationProgress {
  isReferred: boolean;
  status: 'not_referred' | 'in_progress' | 'ready' | 'completed' | 'rejected';
  progress: {
    registered: boolean;
    emailVerified: boolean;
    productViews: number;
    requiredProductViews: number;
    hasAction: boolean;
    completedSteps: number;
    totalSteps: number;
  };
  blockers: {
    emailVerification: boolean;
    remainingProductViews: number;
    favoriteOrPurchase: boolean;
  };
}

export interface ReferralAlertCandidate {
  type: 'referral';
  severity: 'medium' | 'high';
  code: string;
  ownerId: string;
  title: string;
  description: string;
  metrics: {
    trustedClicks: number;
    rawClicks: number;
    rawLandingVisits: number;
    landingVisits: number;
    strictLandingVisits: number;
    strictMatchedClicks: number;
    carryoverLandingVisits: number;
    registrations: number;
    suspiciousClicks: number;
    clickToLandingRate: number;
  };
  reasons: string[];
}

@Injectable()
export class ReferralService {
  constructor(
    private readonly referralExperimentService: ReferralExperimentService,
    private readonly referralAnalyticsService: ReferralAnalyticsService,
    private readonly referralCodeService: ReferralCodeService,
    private readonly referralAttributionService: ReferralAttributionService,
    private readonly referralConversionService: ReferralConversionService,
  ) {}

  getExperimentAssignment(userId: string) {
    return this.referralExperimentService.getExperimentAssignment(userId);
  }

  async trackExperimentEvent(userId: string, dto: TrackReferralExperimentDto) {
    await this.referralExperimentService.trackExperimentEvent(userId, dto);
  }

  async getReferralFunnelOverview(startDate: Date, endDate: Date) {
    return this.referralAnalyticsService.getReferralFunnelOverview(
      startDate,
      endDate,
    );
  }

  async getReferralExperimentMetrics(startDate: Date, endDate: Date) {
    return this.referralExperimentService.getReferralExperimentMetrics(
      startDate,
      endDate,
    );
  }

  // 获取或创建用户的推荐码
  async getOrCreateUserCode(userId: string): Promise<ReferralCode> {
    return this.referralCodeService.getOrCreateUserCode(userId);
  }

  // 根据推荐码查找
  async findByCode(code: string): Promise<ReferralCode | null> {
    return this.referralCodeService.findByCode(code);
  }

  // 记录推荐链接点击
  async recordClick(data: {
    code: string;
    sessionId: string;
    landingPage?: string;
    redirectTo?: string;
    userAgent?: string;
    ip?: string;
    referer?: string;
  }): Promise<ReferralClick | null> {
    return this.referralAttributionService.recordClick(data);
  }

  // 获取用户的推荐统计
  async getUserStats(userId: string) {
    return this.referralCodeService.getUserStats(userId);
  }

  async hasRegistrationAttribution(userId: string): Promise<boolean> {
    return this.referralConversionService.hasRegistrationAttribution(userId);
  }

  // 查找最近的点击记录
  async findRecentClick(
    sessionId: string,
    referralCode: string,
  ): Promise<ReferralClick | null> {
    return this.referralAttributionService.findRecentClick(
      sessionId,
      referralCode,
    );
  }

  // 创建归因记录（仅记录事件，不直接判定转化）
  async createAttribution(data: {
    referralClickId: string;
    eventType: AttributionEventType;
    userId?: string;
    eventData?: Record<string, any>;
  }): Promise<ReferralAttribution | null> {
    return this.referralAttributionService.createAttribution(data);
  }

  /**
   * 复合转化验证：检查被推荐用户是否满足所有转化条件
   *
   * 条件（全部满足才算 1 次有效转化）：
   * 1. 通过推荐链接注册（存在 REGISTRATION 归因）
   * 2. 邮箱已验证
   * 3. 至少浏览过 3 个不同的商品
   * 4. 至少一次收藏或购买点击归因
   */
  async checkAndFinalizeConversion(userId: string): Promise<boolean> {
    return this.referralConversionService.checkAndFinalizeConversion(userId);
  }

  async getCurrentUserActivationProgress(
    userId: string,
  ): Promise<CurrentUserReferralActivationProgress> {
    return this.referralConversionService.getCurrentUserActivationProgress(
      userId,
    );
  }

  // 获取推荐码统计概览
  async getReferralOverview() {
    return this.referralAnalyticsService.getReferralOverview();
  }

  // 获取推荐码排行榜
  async getTopReferrers(limit = 10, startDate?: Date, endDate?: Date) {
    return this.referralAnalyticsService.getTopReferrers(
      limit,
      startDate,
      endDate,
    );
  }

  // 按日期统计推荐点击
  async getClicksByDate(startDate: Date, endDate: Date) {
    return this.referralAnalyticsService.getClicksByDate(startDate, endDate);
  }

  // 解析归因Cookie (URLSearchParams 格式)
  parseAttributionCookie(
    cookieValue: string,
  ): { code: string; clickId: string; timestamp: number } | null {
    return this.referralAttributionService.parseAttributionCookie(cookieValue);
  }

  // 获取推荐明细（统计 + 被推荐用户列表 + 转化进度）
  async getReferralDetails(userId: string, page = 1, limit = 20) {
    return this.referralAnalyticsService.getReferralDetails(
      userId,
      page,
      limit,
    );
  }

  // 从Cookie触发归因
  async triggerAttributionFromCookie(
    cookieValue: string,
    eventType: AttributionEventType,
    userId?: string,
    eventData?: Record<string, any>,
  ): Promise<ReferralAttribution | null> {
    return this.referralAttributionService.triggerAttributionFromCookie(
      cookieValue,
      eventType,
      userId,
      eventData,
    );
  }

  async attachAnonymousAttributionsToUserFromCookie(
    cookieValue: string,
    userId: string,
  ): Promise<AttachedAnonymousAttributionSummary> {
    return this.referralAttributionService.attachAnonymousAttributionsToUserFromCookie(
      cookieValue,
      userId,
    );
  }

  async trackProductViewFromCookie(
    cookieValue: string,
    productId: string,
    userId: string | undefined,
    context: AnalyticsRequestContext,
  ): Promise<ReferralAttribution | null> {
    return this.referralAttributionService.trackProductViewFromCookie(
      cookieValue,
      productId,
      userId,
      context,
    );
  }

  async getCodeClickMetrics(codeId: string): Promise<ReferralClickMetrics> {
    return this.referralAnalyticsService.getCodeClickMetrics(codeId);
  }

  async getReferralAlerts(
    startDate: Date,
    endDate: Date,
    limit = 10,
  ): Promise<ReferralAlertCandidate[]> {
    return this.referralAnalyticsService.getReferralAlerts(
      startDate,
      endDate,
      limit,
    );
  }
}
