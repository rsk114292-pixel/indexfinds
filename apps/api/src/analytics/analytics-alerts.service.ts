import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralService } from '../referral/referral.service';
import { Product } from '../products/entities/product.entity';
import {
  ProductInteractionEvent,
  ProductInteractionEventType,
} from '../products/entities/product-interaction-event.entity';

const ALERTS_CACHE_KEY = 'analytics:alerts:v1';
const ALERTS_TTL_MS = 20 * 60 * 1000;

export interface AnalyticsAlertItem {
  id: string;
  type: 'referral' | 'product';
  severity: 'medium' | 'high';
  title: string;
  description: string;
  entityId: string;
  entityLabel: string;
  metrics: Record<string, number | string>;
  reasons: string[];
}

export interface AnalyticsAlertsSnapshot {
  generatedAt: string;
  summary: {
    total: number;
    high: number;
    medium: number;
    referral: number;
    product: number;
  };
  alerts: AnalyticsAlertItem[];
}

@Injectable()
export class AnalyticsAlertsService {
  private readonly logger = new Logger(AnalyticsAlertsService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly referralService: ReferralService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductInteractionEvent)
    private readonly productInteractionEventRepository: Repository<ProductInteractionEvent>,
  ) {}

  @Cron('*/15 * * * *')
  async refreshAlertsCron(): Promise<void> {
    const snapshot = await this.refreshAlerts();
    if (snapshot.summary.total > 0) {
      this.logger.warn(
        `Analytics alerts refreshed: total=${snapshot.summary.total}, high=${snapshot.summary.high}, medium=${snapshot.summary.medium}`,
      );
    } else {
      this.logger.log('Analytics alerts refreshed: no active alerts');
    }
  }

  private buildCacheKey(startDate?: Date, endDate?: Date): string {
    if (!startDate || !endDate) {
      return ALERTS_CACHE_KEY;
    }
    return `${ALERTS_CACHE_KEY}:${startDate.toISOString()}:${endDate.toISOString()}`;
  }

  async getAlerts(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalyticsAlertsSnapshot> {
    const cacheKey = this.buildCacheKey(startDate, endDate);
    const cached =
      await this.cacheManager.get<AnalyticsAlertsSnapshot>(cacheKey);
    if (cached) {
      return cached;
    }
    return this.refreshAlerts(startDate, endDate);
  }

  async refreshAlerts(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalyticsAlertsSnapshot> {
    const now = new Date();
    const referralWindowStart =
      startDate || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const referralWindowEnd = endDate || now;
    const [referralAlerts, productAlerts] = await Promise.all([
      this.referralService.getReferralAlerts(
        referralWindowStart,
        referralWindowEnd,
        8,
      ),
      this.getProductHeatAlerts(),
    ]);

    const alerts: AnalyticsAlertItem[] = [
      ...referralAlerts.map((alert) => ({
        id: `referral:${alert.code}`,
        type: 'referral' as const,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        entityId: alert.code,
        entityLabel: alert.code,
        metrics: alert.metrics,
        reasons: alert.reasons,
      })),
      ...productAlerts,
    ].sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === 'high' ? -1 : 1;
      }
      return 0;
    });

    const snapshot: AnalyticsAlertsSnapshot = {
      generatedAt: now.toISOString(),
      summary: {
        total: alerts.length,
        high: alerts.filter((alert) => alert.severity === 'high').length,
        medium: alerts.filter((alert) => alert.severity === 'medium').length,
        referral: alerts.filter((alert) => alert.type === 'referral').length,
        product: alerts.filter((alert) => alert.type === 'product').length,
      },
      alerts,
    };

    await this.cacheManager.set(
      this.buildCacheKey(startDate, endDate),
      snapshot,
      ALERTS_TTL_MS,
    );
    return snapshot;
  }

  private async getProductHeatAlerts(): Promise<AnalyticsAlertItem[]> {
    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previous7dStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const rows = await this.productInteractionEventRepository.query(
      `
        SELECT
          p.id,
          p.title,
          p.slug,
          COALESCE(p."popularityScore", 0) AS "popularityScore",
          COUNT(*) FILTER (
            WHERE e."eventType" = $1
              AND e."createdAt" >= $3
          )::int AS "views24h",
          COUNT(*) FILTER (
            WHERE e."eventType" = $2
              AND e."createdAt" >= $3
          )::int AS "clicks24h",
          COUNT(*) FILTER (
            WHERE e."eventType" = $1
              AND e."createdAt" >= $4
              AND e."createdAt" < $3
          )::int AS "viewsPrev7d",
          COUNT(*) FILTER (
            WHERE e."eventType" = $2
              AND e."createdAt" >= $4
              AND e."createdAt" < $3
          )::int AS "clicksPrev7d"
        FROM product_interaction_events e
        INNER JOIN products p ON p.id = e."productId"
        WHERE p.status = $5
          AND e."createdAt" >= $4
        GROUP BY p.id, p.title, p.slug, p."popularityScore"
        HAVING COUNT(*) FILTER (WHERE e."createdAt" >= $3) > 0
        ORDER BY "views24h" DESC, "clicks24h" DESC
        LIMIT 30
      `,
      [
        ProductInteractionEventType.VIEW,
        ProductInteractionEventType.CLICK,
        last24hStart,
        previous7dStart,
        'active',
      ],
    );

    return rows
      .map((row: Record<string, string>) => {
        const views24h = parseInt(row.views24h, 10) || 0;
        const clicks24h = parseInt(row.clicks24h, 10) || 0;
        const viewsPrev7d = parseInt(row.viewsPrev7d, 10) || 0;
        const clicksPrev7d = parseInt(row.clicksPrev7d, 10) || 0;
        const popularityScore = Number(row.popularityScore || 0);
        const viewBaseline = viewsPrev7d / 7;
        const clickBaseline = clicksPrev7d / 7;
        const viewSpike = viewBaseline > 0 ? views24h / viewBaseline : 0;
        const clickSpike = clickBaseline > 0 ? clicks24h / clickBaseline : 0;

        const isHigh =
          (views24h >= 80 && viewSpike >= 4) ||
          (clicks24h >= 25 && clickSpike >= 4);
        const isMedium =
          isHigh ||
          (views24h >= 50 && viewSpike >= 3) ||
          (clicks24h >= 15 && clickSpike >= 3) ||
          (views24h >= 60 && viewsPrev7d === 0 && popularityScore >= 0.6);

        if (!isMedium) {
          return null;
        }

        const reasons: string[] = [];
        if (viewBaseline > 0 && views24h >= 50) {
          reasons.push(`24h 浏览是近 7 天日均的 ${viewSpike.toFixed(1)}x`);
        }
        if (clickBaseline > 0 && clicks24h >= 15) {
          reasons.push(`24h 点击是近 7 天日均的 ${clickSpike.toFixed(1)}x`);
        }
        if (viewsPrev7d === 0 && views24h >= 60) {
          reasons.push('过去 7 天几乎无可信流量，近 24h 突然放量');
        }

        return {
          id: `product:${row.id}`,
          type: 'product' as const,
          severity: isHigh ? ('high' as const) : ('medium' as const),
          title: `商品热度突刺：${row.title}`,
          description:
            `近 24 小时可信浏览 ${views24h}，可信点击 ${clicks24h}，` +
            `当前热度分 ${popularityScore.toFixed(4)}。`,
          entityId: row.id,
          entityLabel: row.title,
          metrics: {
            slug: row.slug,
            trustedViews24h: views24h,
            trustedClicks24h: clicks24h,
            trustedViewsPrev7d: viewsPrev7d,
            trustedClicksPrev7d: clicksPrev7d,
            popularityScore,
          },
          reasons,
        };
      })
      .filter(
        (alert: AnalyticsAlertItem | null): alert is AnalyticsAlertItem =>
          !!alert,
      )
      .slice(0, 8);
  }
}
