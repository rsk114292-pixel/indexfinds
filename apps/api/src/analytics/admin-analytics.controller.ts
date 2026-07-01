import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReferralService } from '../referral/referral.service';
import { OutboundTrackingService } from '../search/outbound-tracking.service';
import { AnalyticsAlertsService } from './analytics-alerts.service';

@ApiTags('Admin Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAnalyticsController {
  constructor(
    private referralService: ReferralService,
    private outboundTrackingService: OutboundTrackingService,
    private readonly analyticsAlertsService: AnalyticsAlertsService,
  ) {}

  private getTodayRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private isRawScope(scope?: string): boolean {
    return scope === 'raw' || scope === 'all' || scope === 'original';
  }

  // 统计概览
  @Get('overview')
  async getOverview() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [clicks, referrals] = await Promise.all([
      this.outboundTrackingService.getClickOverview(last30Days, now),
      this.referralService.getReferralOverview(),
    ]);

    return { clicks, referrals };
  }

  // 外跳点击统计（使用新的 OutboundTrackingService）
  @Get('clicks')
  async getClickStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('source') source: string,
    @Query('platform') platform: string,
    @Query('productKeyword') productKeyword: string,
    @Query('scope') scope?: string,
  ) {
    const todayRange = this.getTodayRange();
    const start = startDate ? new Date(startDate) : todayRange.start;
    const end = endDate ? new Date(endDate) : todayRange.end;
    const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
    const limitNum = Math.min(
      Math.max(parseInt(limit || '20', 10) || 20, 1),
      200,
    );

    return this.outboundTrackingService.getFullAnalytics(start, end, {
      page: pageNum,
      limit: limitNum,
      source: source || undefined,
      platform: platform || undefined,
      productKeyword: productKeyword || undefined,
      includeInternal: this.isRawScope(scope),
    });
  }

  // 推荐码统计
  @Get('referrals')
  async getReferralStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(endDate || Date.now());

    const [byDate, topReferrers, funnel, experiment] = await Promise.all([
      this.referralService.getClicksByDate(start, end),
      this.referralService.getTopReferrers(10, start, end),
      this.referralService.getReferralFunnelOverview(start, end),
      this.referralService.getReferralExperimentMetrics(start, end),
    ]);

    return { byDate, topReferrers, funnel, experiment };
  }

  @Get('alerts')
  async getAlerts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const hasRange = startDate && endDate;
    if (!hasRange) {
      return this.analyticsAlertsService.getAlerts();
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return this.analyticsAlertsService.getAlerts();
    }

    return this.analyticsAlertsService.getAlerts(start, end);
  }
}
