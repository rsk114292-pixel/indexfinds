import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, SelectQueryBuilder } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as geoip from 'geoip-lite';
import { ReferralService } from '../referral/referral.service';
import { ReferralClick } from '../referral/entities/referral-click.entity';
import { VisitSession } from './entities/visit-session.entity';
import { CreateVisitSessionDto } from './dto/create-visit-session.dto';
import { UpdateVisitDiagnosticsDto } from './dto/update-visit-diagnostics.dto';
import { UpdateVisitEngagementDto } from './dto/update-visit-engagement.dto';
import { classifyChannel } from './utils/channel-classifier';
import { parseUserAgent } from './utils/ua-parser';
import { isLikelyBotUserAgent } from './utils/traffic-bot';
import { isInternalDomain } from './utils/traffic-source';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import {
  buildTrustedVisitId,
  type AnalyticsRequestContext,
} from '../shared/utils/analytics-request';
import { TrafficDefenseService } from './traffic-defense.service';

// ─── Response Types ───

export type AdminTrafficScope = 'customer' | 'raw';

export type AdminTrafficScopeOptions = {
  scope?: AdminTrafficScope;
};

export interface TrafficOverview {
  total: number;
  totalChange: number;
  uniqueSessions: number;
  uniqueSessionsChange: number;
  uniqueVisitors: number;
  uniqueVisitorsChange: number;
  totalOutboundVisits: number;
  totalOutboundVisitsChange: number;
  outboundVisitRate: number;
  highIntentVisitors: number;
  highIntentVisitorsChange: number;
  highIntentVisitorRate: number;
  activatedUsers: number;
  activatedUsersChange: number;
  activatedUserRate: number;
  effectiveNewUsers: number;
  effectiveNewUsersChange: number;
  effectiveNewUserRate: number;
  effectiveUsers: number;
  effectiveUsersChange: number;
  effectiveUserRate: number;
  suspiciousVisitRecords: number;
  suspiciousVisitRate: number;
  topChannel: string | null;
  topSource: string | null;
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
}

export interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage: number;
}

export interface SourceBreakdown {
  source: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
  measuredVisits: number;
  avgActiveDurationMs: number;
  shortStayRate: number;
  engaged10sRate: number;
  engaged30sRate: number;
  avgActiveBeforeOutboundMs: number;
}

export interface CampaignBreakdown {
  campaign: string;
  source: string | null;
  medium: string | null;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
}

export interface LandingPageBreakdown {
  landingPage: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  suspiciousVisits: number;
  suspiciousRate: number;
  outboundVisits: number;
  outboundClicks: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
}

export interface TrafficTrend {
  period: string;
  rawCount: number;
  count: number;
  suspiciousCount: number;
}

export interface GeoBreakdown {
  country: string;
  count: number;
  percentage: number;
}

export interface DeviceBreakdown {
  deviceType: string;
  count: number;
  percentage: number;
}

export interface TrafficEngagementOverview {
  totalVisits: number;
  measuredVisits: number;
  measurementCoverageRate: number;
  avgActiveDurationMs: number;
  medianActiveDurationMs: number;
  shortStayVisits: number;
  shortStayRate: number;
  engaged10sVisits: number;
  engaged10sRate: number;
  engaged30sVisits: number;
  engaged30sRate: number;
  avgActiveBeforeOutboundMs: number;
}

export interface CaptureDiagnosticsOverview {
  totalVisits: number;
  consentAccepted: number;
  consentRejected: number;
  consentPending: number;
  gaEligibleVisits: number;
  gaRequested: number;
  gaLoaded: number;
  gaReady: number;
  gaFirstPageviewSent: number;
  gaEventCountTotal: number;
  gaBlocked: number;
  gaFailed: number;
  gaDisabled: number;
  inAppBrowserVisits: number;
  overallCaptureRate: number;
  eligibleCaptureRate: number;
}

export interface CaptureLossBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

export interface ReconciliationOverview {
  referralClicks: number;
  landingVisits: number;
  firstPartyVisits: number;
  unmatchedFirstPartyVisits: number;
  gaCaptures: number;
  clickToLandingRate: number;
  landingToFirstPartyRate: number;
  gaCaptureRate: number;
}

export interface CaptureDiagnosticsDimensionBreakdown {
  dimension: string;
  value: string;
  firstPartyVisits: number;
  gaCaptures: number;
  blockedOrFailed: number;
  pendingConsent: number;
  inAppBrowserVisits: number;
  captureRate: number;
}

export interface AttributionQualityOverview {
  totalVisits: number;
  attributedVisits: number;
  attributedRate: number;
  utmTaggedVisits: number;
  utmCoverageRate: number;
  referrerTaggedVisits: number;
  referrerCoverageRate: number;
  directVisits: number;
  directRate: number;
  referralShareUnattributedVisits: number;
  referralShareUnattributedRate: number;
  webviewReferrerLossVisits: number;
  webviewReferrerLossRate: number;
  likelyAutomatedDirectVisits: number;
  likelyAutomatedDirectRate: number;
  trueDirectVisits: number;
  trueDirectRate: number;
  otherUnattributedVisits: number;
  otherUnattributedRate: number;
}

export interface DirectBreakdown {
  reason: string;
  rawCount: number;
  count: number;
  uniqueVisitors: number;
  shareOfDirect: number;
  shareOfTotal: number;
}

export interface SourceLandingPageDiagnostic {
  landingPage: string;
  visits: number;
  share: number;
}

export interface SourceQualityDiagnostics {
  source: string;
  rawCount: number;
  visits: number;
  uniqueVisitors: number;
  repeatVisitRate: number;
  outboundVisits: number;
  outboundRate: number;
  effectiveUsers: number;
  effectiveUserRate: number;
  avgProductViewsPerVisitor: number;
  oneVisitDeviceRate: number;
  concentration: {
    distinctDevices: number;
    distinctIpAddresses: number;
    distinctBrowsers: number;
    topDeviceShare: number;
    topIpShare: number;
    topBrowser: string | null;
    topBrowserShare: number;
  };
  landingPages: SourceLandingPageDiagnostic[];
}

export interface TrafficBehaviorFunnelOverview {
  visits: number;
  registrations: number;
  verifiedUsers: number;
  productViewReadyUsers: number;
  actionReadyUsers: number;
  effectiveUsers: number;
  visitToRegistrationRate: number;
  registrationToVerificationRate: number;
  verificationToProductViewRate: number;
  productViewToEffectiveRate: number;
  visitToEffectiveRate: number;
  blockers: {
    anonymousOrUnregisteredVisits: number;
    unverifiedUsers: number;
    insufficientProductViews: number;
    missingAction: number;
  };
}

export interface TrafficBehaviorFunnelBySource {
  source: string;
  visits: number;
  registrations: number;
  verifiedUsers: number;
  productViewReadyUsers: number;
  actionReadyUsers: number;
  effectiveUsers: number;
  visitToRegistrationRate: number;
  registrationToEffectiveRate: number;
  visitToEffectiveRate: number;
}

export interface TrafficBehaviorFunnelByDimension {
  dimension: string;
  value: string;
  visits: number;
  registrations: number;
  verifiedUsers: number;
  productViewReadyUsers: number;
  actionReadyUsers: number;
  effectiveUsers: number;
  visitToRegistrationRate: number;
  registrationToEffectiveRate: number;
  visitToEffectiveRate: number;
}

export interface TrafficBehaviorSample {
  userId: string;
  email: string | null;
  latestVisitAt: string;
  landingPage: string | null;
  campaign: string | null;
  registered: boolean;
  emailVerified: boolean;
  productViews: number;
  actionReady: boolean;
  effectiveUser: boolean;
  blocker:
    | 'unverified'
    | 'insufficient_product_views'
    | 'missing_action'
    | 'effective';
}

export interface ResolvedVisitIdentity {
  id: string;
  sessionId: string;
  deviceId: string | null;
  visitId: string | null;
}

type VisitAbuseBucket = {
  expiresAt: number;
  sessionCount: number;
  deviceIds: Set<string>;
};

type SuspiciousVisitDecision = {
  drop: boolean;
  reason?: string;
  target?: string;
  metricsSnapshot?: Record<string, unknown>;
};

@Injectable()
export class VisitSessionService {
  private readonly logger = new Logger(VisitSessionService.name);
  private readonly activeVisitWindowMs = 30 * 60 * 1000;
  private readonly maxActiveDeltaMs = 30 * 1000;
  private readonly maxTotalDeltaMs = 60 * 1000;
  private readonly visitAbuseWindowMs = 60 * 1000;
  private readonly maxVisitSessionsPerIpWindow = 80;
  private readonly maxVisitDevicesPerIpWindow = 12;
  private readonly directProductNetworkAbuseWindowMs = 15 * 60 * 1000;
  private readonly maxDirectProductSessionsPerNetworkWindow = 80;
  private readonly maxDirectProductDevicesPerNetworkWindow = 24;
  private readonly visitAbuseByIp = new Map<string, VisitAbuseBucket>();
  private readonly directProductVisitAbuseByNetwork = new Map<
    string,
    VisitAbuseBucket
  >();
  private readonly visitKeySql = `COALESCE(vs.visit_id, vs.session_id)`;
  private readonly deviceKeySql = `COALESCE(vs.device_id, vs.session_id)`;
  private readonly sourceSql = `
    CASE
      WHEN vs.channel_type = 'internal' THEN '(internal)'
      WHEN vs.utm_source IS NOT NULL AND vs.utm_source <> '' THEN LOWER(vs.utm_source)
      WHEN vs.referrer_domain IS NOT NULL AND vs.referrer_domain <> '' THEN LOWER(vs.referrer_domain)
      ELSE '(direct)'
    END
  `;
  private readonly explicitAttributionPredicate = `(
      (vs.utm_source IS NOT NULL AND vs.utm_source <> '')
      OR (vs.referrer_domain IS NOT NULL AND vs.referrer_domain <> '')
    )`;
  private readonly directVisitPredicate = `vs.channel_type = 'direct'
    AND COALESCE(NULLIF(vs.utm_source, ''), '') = ''
    AND COALESCE(NULLIF(vs.referrer_domain, ''), '') = ''`;
  private readonly directReasonSql = `
    CASE
      WHEN vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL
        THEN 'referral_share_unattributed'
      WHEN COALESCE(vs.is_in_app_browser, false) = true
        OR COALESCE(LOWER(vs.browser_context), '') LIKE '%webview%'
        THEN 'webview_referrer_loss'
      WHEN COALESCE(NULLIF(LOWER(vs.browser_context), ''), 'standard_browser') = 'standard_browser'
        THEN 'true_direct'
      ELSE 'other_unattributed'
    END
  `;
  private readonly referredVisitPredicate = `(vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)`;
  private readonly reconciliationDimensionSql: Record<string, string> = {
    source: this.sourceSql,
    campaign: `COALESCE(NULLIF(vs.utm_campaign, ''), '(not set)')`,
    browser: `COALESCE(NULLIF(LOWER(vs.browser), ''), '(unknown)')`,
    deviceType: `COALESCE(NULLIF(LOWER(vs.device_type), ''), '(unknown)')`,
    browserContext: `COALESCE(NULLIF(LOWER(vs.browser_context), ''), '(unknown)')`,
    locale: `COALESCE(NULLIF(LOWER(vs.language), ''), '(unknown)')`,
  };

  private buildExternalVisitPredicate(alias: string = 'vs'): string {
    return `${alias}.channel_type <> 'internal'
      AND NOT EXISTS (
        SELECT 1
        FROM users internal_user
        WHERE internal_user.id = ${alias}.user_id
          AND internal_user.role IN ('admin', 'super_admin')
      )`;
  }

  private buildVisitScopeWhere(
    startPlaceholder: string,
    endPlaceholder: string,
    alias: string = 'vs',
    options?: AdminTrafficScopeOptions,
  ): string {
    const datePredicate = `${alias}.created_at BETWEEN ${startPlaceholder} AND ${endPlaceholder}`;
    if (options?.scope === 'raw') {
      return datePredicate;
    }
    return `${datePredicate}
      AND ${this.buildExternalVisitPredicate(alias)}`;
  }

  private buildUserScopePredicate(
    alias: string = 'u',
    options?: AdminTrafficScopeOptions,
  ): string {
    if (options?.scope === 'raw') {
      return '1 = 1';
    }
    return `${alias}.role NOT IN ('admin', 'super_admin')`;
  }

  private applyVisitScope(
    query: SelectQueryBuilder<VisitSession>,
    startDate: Date,
    endDate: Date,
    alias: string = 'vs',
    options?: AdminTrafficScopeOptions,
  ): SelectQueryBuilder<VisitSession> {
    const scopedQuery = query.where(
      `${alias}.created_at BETWEEN :startDate AND :endDate`,
      {
        startDate,
        endDate,
      },
    );

    if (options?.scope === 'raw') {
      return scopedQuery;
    }

    return scopedQuery.andWhere(this.buildExternalVisitPredicate(alias));
  }

  private buildLandingPageTypeSql(alias: string = 'vs'): string {
    return `
      CASE
        WHEN COALESCE(${alias}.landing_page, '') ~ '^/[a-z]{2}/products/[^/?#]+'
          OR COALESCE(${alias}.landing_page, '') ~ '^/products/[^/?#]+'
          THEN 'product_detail'
        WHEN COALESCE(${alias}.landing_page, '') ~ '^/[a-z]{2}/search'
          OR COALESCE(${alias}.landing_page, '') ~ '^/search'
          THEN 'search'
        WHEN COALESCE(${alias}.landing_page, '') ~ '^/[a-z]{2}/categories/'
          OR COALESCE(${alias}.landing_page, '') ~ '^/categories/'
          THEN 'category'
        WHEN COALESCE(${alias}.landing_page, '') ~ '^/[a-z]{2}/brands/'
          OR COALESCE(${alias}.landing_page, '') ~ '^/brands/'
          THEN 'brand'
        ELSE 'other'
      END
    `;
  }

  private buildDirectLabeledCte(
    startPlaceholder: string,
    endPlaceholder: string,
    options?: AdminTrafficScopeOptions,
  ): string {
    const pageTypeSql = this.buildLandingPageTypeSql('vs');

    return `
      WITH direct_scope AS (
        SELECT
          ${this.visitKeySql} AS visit_key,
          ${this.deviceKeySql} AS device_key,
          COALESCE(NULLIF(UPPER(vs.country), ''), '(unknown)') AS country,
          COALESCE(NULLIF(LOWER(vs.browser), ''), '(unknown)') AS browser,
          ${pageTypeSql} AS page_type,
          ${this.directReasonSql} AS base_reason
        FROM visit_sessions vs
        WHERE ${this.buildVisitScopeWhere(startPlaceholder, endPlaceholder, 'vs', options)}
          AND ${this.directVisitPredicate}
      ),
      direct_labeled AS (
        SELECT
          ds.visit_key,
          ds.device_key,
          CASE
            WHEN ds.base_reason = 'true_direct'
              AND ds.country IN ('SG', 'JP')
              AND ds.page_type = 'product_detail'
              THEN 'likely_automated_direct'
            ELSE ds.base_reason
          END AS reason
        FROM direct_scope ds
      )
    `;
  }

  private async getOutboundVisitCount(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<number> {
    const rows = await this.repo.query(
      `SELECT
        COUNT(DISTINCT CASE
          WHEN oc.id IS NOT NULL THEN COALESCE(vs.visit_id, vs.session_id)
        END)::int AS "outboundVisits"
      FROM visit_sessions vs
      LEFT JOIN outbound_clicks oc
        ON COALESCE(vs.visit_id, vs.session_id) = COALESCE(oc.visit_id, oc."sessionId")
       AND oc."createdAt" BETWEEN $1 AND $2
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}`,
      [startDate, endDate],
    );

    return parseInt(String(rows[0]?.outboundVisits ?? 0), 10) || 0;
  }

  constructor(
    @InjectRepository(VisitSession)
    private readonly repo: Repository<VisitSession>,
    @InjectRepository(ReferralClick)
    private readonly referralClickRepo: Repository<ReferralClick>,
    private readonly referralService: ReferralService,
    private readonly analyticsDedupService: AnalyticsDedupService,
    private readonly trafficDefenseService: TrafficDefenseService,
  ) {}

  private touchVisitAbuseBucket(
    buckets: Map<string, VisitAbuseBucket>,
    key: string,
    deviceId: string,
    windowMs: number,
  ): VisitAbuseBucket {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.expiresAt) {
      bucket = {
        expiresAt: now + windowMs,
        sessionCount: 0,
        deviceIds: new Set<string>(),
      };
      buckets.set(key, bucket);
    }

    bucket.sessionCount += 1;
    bucket.deviceIds.add(deviceId);
    return bucket;
  }

  private getVisitAbuseNetworkKey(ip: string): string | null {
    const normalizedIp = ip.trim().toLowerCase();
    const ipv4 = normalizedIp.startsWith('::ffff:')
      ? normalizedIp.slice('::ffff:'.length)
      : normalizedIp;
    const ipv4Parts = ipv4.split('.');

    if (
      ipv4Parts.length === 4 &&
      ipv4Parts.every((part) => {
        const value = Number(part);
        return (
          part !== '' && Number.isInteger(value) && value >= 0 && value <= 255
        );
      })
    ) {
      return `${ipv4Parts.slice(0, 3).join('.')}.0/24`;
    }

    if (normalizedIp.includes(':')) {
      const parts = normalizedIp.split(':').filter(Boolean);
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}::/64`;
      }
    }

    return null;
  }

  private getVisitAbuseIpv4Target(ip: string): string | null {
    const normalizedIp = ip.trim().toLowerCase();
    const ipv4 = normalizedIp.startsWith('::ffff:')
      ? normalizedIp.slice('::ffff:'.length)
      : normalizedIp;
    const ipv4Parts = ipv4.split('.');

    if (
      ipv4Parts.length === 4 &&
      ipv4Parts.every((part) => {
        const value = Number(part);
        return (
          part !== '' && Number.isInteger(value) && value >= 0 && value <= 255
        );
      })
    ) {
      return ipv4;
    }

    return null;
  }

  private isProductLandingPage(landingPage?: string): boolean {
    return /^\/(?:[a-z]{2}\/)?products\/[^/?#]+/.test(landingPage || '');
  }

  private hasSuspiciousProductFromChain(landingPage?: string): boolean {
    if (!this.isProductLandingPage(landingPage)) {
      return false;
    }

    try {
      const url = new URL(
        landingPage || '/',
        'https://indexfinds.com',
      );
      const fromValues = url.searchParams.getAll('from');
      if (fromValues.length === 0) {
        return false;
      }
      if (fromValues.length > 1) {
        return true;
      }

      const from = fromValues[0] || '';
      if (/[?&]from=/.test(from)) {
        return true;
      }

      const fromPath = from.split('?')[0]?.split('#')[0] ?? '';
      return /^\/(?:[a-z]{2}\/)?products\/[^/?#]+$/.test(fromPath);
    } catch {
      return true;
    }
  }

  private evaluateSuspiciousVisit(
    ip: string,
    deviceId: string,
    options?: { landingPage?: string; hasExplicitSource?: boolean },
  ): SuspiciousVisitDecision {
    if (this.hasSuspiciousProductFromChain(options?.landingPage)) {
      this.logger.warn(
        `Dropping suspicious product visit with chained from parameter: ${options?.landingPage}`,
      );
      const target = this.getVisitAbuseIpv4Target(ip);
      return {
        drop: true,
        reason: 'chained_product_from',
        target: target ?? undefined,
        metricsSnapshot: {
          ip,
          deviceId,
          landingPage: options?.landingPage,
        },
      };
    }

    if (!ip || ip === 'unknown') return { drop: false };

    const bucket = this.touchVisitAbuseBucket(
      this.visitAbuseByIp,
      ip,
      deviceId,
      this.visitAbuseWindowMs,
    );

    const shouldDrop =
      bucket.sessionCount > this.maxVisitSessionsPerIpWindow ||
      bucket.deviceIds.size > this.maxVisitDevicesPerIpWindow;

    if (shouldDrop) {
      this.logger.warn(
        `Dropping suspicious visit session traffic from ${ip}: sessions=${bucket.sessionCount}, devices=${bucket.deviceIds.size}`,
      );
      const target = this.getVisitAbuseIpv4Target(ip);
      return {
        drop: true,
        reason: 'same_ip_visit_rotation',
        target: target ?? undefined,
        metricsSnapshot: {
          ip,
          deviceId,
          sessions: bucket.sessionCount,
          devices: bucket.deviceIds.size,
          landingPage: options?.landingPage,
        },
      };
    }

    if (
      options &&
      !options.hasExplicitSource &&
      this.isProductLandingPage(options.landingPage)
    ) {
      const networkKey = this.getVisitAbuseNetworkKey(ip);
      if (networkKey) {
        const networkBucket = this.touchVisitAbuseBucket(
          this.directProductVisitAbuseByNetwork,
          networkKey,
          deviceId,
          this.directProductNetworkAbuseWindowMs,
        );
        const shouldDropNetwork =
          networkBucket.sessionCount >
            this.maxDirectProductSessionsPerNetworkWindow ||
          networkBucket.deviceIds.size >
            this.maxDirectProductDevicesPerNetworkWindow;

        if (shouldDropNetwork) {
          this.logger.warn(
            `Dropping suspicious direct product visit traffic from ${networkKey}: sessions=${networkBucket.sessionCount}, devices=${networkBucket.deviceIds.size}`,
          );
          return {
            drop: true,
            reason: 'direct_product_network_rotation',
            target: networkKey.endsWith('/24') ? networkKey : undefined,
            metricsSnapshot: {
              ip,
              network: networkKey,
              deviceId,
              sessions: networkBucket.sessionCount,
              devices: networkBucket.deviceIds.size,
              landingPage: options.landingPage,
            },
          };
        }
      }
    }

    return { drop: false };
  }

  private shouldDropSuspiciousVisit(
    ip: string,
    deviceId: string,
    options?: { landingPage?: string; hasExplicitSource?: boolean },
  ): boolean {
    return this.evaluateSuspiciousVisit(ip, deviceId, options).drop;
  }

  private shouldDropSuspiciousVisitMutation(
    context: AnalyticsRequestContext | undefined,
    fallbackId: string | undefined,
  ): boolean {
    const deviceId = context?.trustedVisitorId || fallbackId;
    if (!deviceId) return false;

    return this.shouldDropSuspiciousVisit(context?.ipAddress || '', deviceId);
  }

  private roundRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 10000) / 100;
  }

  private parseQueryNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      return parseFloat(value) || 0;
    }

    return 0;
  }

  private buildCaptureVisitRollupCte(
    startPlaceholder: string,
    endPlaceholder: string,
    options?: { referredOnly?: boolean } & AdminTrafficScopeOptions,
  ): string {
    const referredFilter = options?.referredOnly
      ? `
          AND ${this.referredVisitPredicate}`
      : '';

    return `
      WITH capture_visits AS (
        SELECT
          ${this.visitKeySql} AS visit_key,
          BOOL_OR(vs.consent_status = 'accepted') AS consent_accepted,
          BOOL_OR(vs.consent_status = 'rejected') AS consent_rejected,
          BOOL_OR(
            vs.consent_status IS NULL OR vs.consent_status = 'pending'
          ) AS consent_pending,
          BOOL_OR(COALESCE(vs.ga_tracking_enabled, false)) AS ga_tracking_enabled,
          BOOL_OR(vs.ga_configured_target IS NOT NULL) AS ga_configured_target,
          BOOL_OR(COALESCE(vs.ga_requested, false)) AS ga_requested,
          BOOL_OR(COALESCE(vs.ga_script_loaded, false)) AS ga_loaded,
          BOOL_OR(vs.ga_status = 'ready') AS ga_ready,
          BOOL_OR(vs.ga_status = 'loading') AS ga_loading,
          BOOL_OR(COALESCE(vs.ga_first_pageview_sent, false)) AS ga_first_pageview_sent,
          MAX(COALESCE(vs.ga_event_count, 0))::int AS ga_event_count,
          BOOL_OR(vs.ga_status = 'blocked') AS ga_blocked,
          BOOL_OR(vs.ga_status = 'failed') AS ga_failed,
          MAX(vs.ga_failed_reason) FILTER (
            WHERE vs.ga_status = 'failed' AND vs.ga_failed_reason IS NOT NULL
          ) AS ga_failed_reason,
          BOOL_OR(vs.ga_status = 'disabled') AS ga_disabled_status,
          BOOL_OR(COALESCE(vs.is_in_app_browser, false)) AS is_in_app_browser
        FROM visit_sessions vs
        WHERE ${this.buildVisitScopeWhere(startPlaceholder, endPlaceholder, 'vs', options)}${referredFilter}
        GROUP BY ${this.visitKeySql}
      )
    `.trimEnd();
  }

  private buildEffectiveUsersCte(
    startPlaceholder: string,
    endPlaceholder: string,
    options?: AdminTrafficScopeOptions,
  ): string {
    return `
      WITH effective_users AS (
        SELECT u.id AS user_id
        FROM users u
        LEFT JOIN user_browsing_history ubh
          ON ubh.user_id = u.id
         AND ubh.viewed_at BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        LEFT JOIN user_favorites uf
          ON uf.user_id = u.id
         AND uf."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        LEFT JOIN outbound_clicks eoc
          ON eoc."userId" = u.id
         AND eoc."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        WHERE u."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
          AND ${this.buildUserScopePredicate('u', options)}
          AND COALESCE(u.email_verified, false) = true
          AND u.email_verified_at IS NOT NULL
          AND u.email_verified_at BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        GROUP BY u.id
        HAVING COUNT(DISTINCT ubh.product_id) >= 3
           AND (
             COUNT(DISTINCT uf.id) > 0
             OR COUNT(DISTINCT eoc.id) > 0
           )
      )
    `;
  }

  private buildActivatedUsersCte(
    startPlaceholder: string,
    endPlaceholder: string,
    options?: AdminTrafficScopeOptions,
  ): string {
    return `
      WITH activated_users AS (
        SELECT u.id AS user_id
        FROM users u
        LEFT JOIN user_browsing_history ubh
          ON ubh.user_id = u.id
         AND ubh.viewed_at BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        LEFT JOIN user_favorites uf
          ON uf.user_id = u.id
         AND uf."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        LEFT JOIN outbound_clicks eoc
          ON eoc."userId" = u.id
         AND eoc."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        WHERE ${this.buildUserScopePredicate('u', options)}
          AND COALESCE(u.email_verified, false) = true
          AND u.email_verified_at IS NOT NULL
          AND u.email_verified_at <= ${endPlaceholder}
        GROUP BY u.id
        HAVING COUNT(DISTINCT ubh.product_id) >= 3
           AND (
             COUNT(DISTINCT uf.id) > 0
             OR COUNT(DISTINCT eoc.id) > 0
           )
      )
    `;
  }

  private async getEffectiveUserSummary(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<{ effectiveUsers: number; effectiveUserRate: number }> {
    const rows = await this.repo.query(
      `${this.buildEffectiveUsersCte('$1', '$2', options)}
      SELECT
        (
          SELECT COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int
          FROM visit_sessions vs
          WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        ) AS visits,
        (SELECT COUNT(*)::int FROM effective_users) AS "effectiveUsers"`,
      [startDate, endDate],
    );

    const summary = rows?.[0] ?? {};
    const visits = parseInt(summary.visits ?? '0', 10) || 0;
    const effectiveUsers = parseInt(summary.effectiveUsers ?? '0', 10) || 0;

    return {
      effectiveUsers,
      effectiveUserRate: this.roundRate(effectiveUsers, visits),
    };
  }

  private async getActivatedUserSummary(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<{ activatedUsers: number; activatedUserRate: number }> {
    const rows = await this.repo.query(
      `${this.buildActivatedUsersCte('$1', '$2', options)}
      SELECT
        (
          SELECT COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int
          FROM visit_sessions vs
          WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        ) AS visits,
        (SELECT COUNT(*)::int FROM activated_users) AS "activatedUsers"`,
      [startDate, endDate],
    );

    const summary = rows?.[0] ?? {};
    const visits = parseInt(summary.visits ?? '0', 10) || 0;
    const activatedUsers = parseInt(summary.activatedUsers ?? '0', 10) || 0;

    return {
      activatedUsers,
      activatedUserRate: this.roundRate(activatedUsers, visits),
    };
  }

  private async getHighIntentVisitorSummary(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<{ highIntentVisitors: number; highIntentVisitorRate: number }> {
    const rows = await this.repo.query(
      `WITH visit_scope AS (
        SELECT DISTINCT COALESCE(vs.device_id, vs.session_id) AS visitor_id
        FROM visit_sessions vs
        WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
      ),
      visitor_product_views AS (
        SELECT pie."trustedVisitorId" AS visitor_id
        FROM product_interaction_events pie
        JOIN visit_scope scope
          ON scope.visitor_id = pie."trustedVisitorId"
        WHERE pie."createdAt" BETWEEN $1 AND $2
          AND pie."eventType" = 'view'
          AND pie."trustedVisitorId" IS NOT NULL
        GROUP BY pie."trustedVisitorId"
        HAVING COUNT(DISTINCT pie."productId") >= 3
      ),
      visitor_user_map AS (
        SELECT DISTINCT COALESCE(vs.device_id, vs.session_id) AS visitor_id, vs.user_id
        FROM visit_sessions vs
        WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
          AND vs.user_id IS NOT NULL
      ),
      visitor_actions AS (
        SELECT DISTINCT COALESCE(oc.device_id, oc."sessionId") AS visitor_id
        FROM outbound_clicks oc
        JOIN visit_scope scope
          ON scope.visitor_id = COALESCE(oc.device_id, oc."sessionId")
        WHERE oc."createdAt" BETWEEN $1 AND $2
          AND COALESCE(oc.device_id, oc."sessionId") IS NOT NULL

        UNION

        SELECT DISTINCT vum.visitor_id
        FROM visitor_user_map vum
        JOIN user_favorites uf
          ON uf.user_id = vum.user_id
         AND uf."createdAt" BETWEEN $1 AND $2
      ),
      high_intent_visitors AS (
        SELECT vpv.visitor_id
        FROM visitor_product_views vpv
        JOIN visitor_actions va
          ON va.visitor_id = vpv.visitor_id
      )
      SELECT
        (
          SELECT COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int
          FROM visit_sessions vs
          WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        ) AS visits,
        (SELECT COUNT(*)::int FROM high_intent_visitors) AS "highIntentVisitors"`,
      [startDate, endDate],
    );

    const summary = rows?.[0] ?? {};
    const visits = parseInt(summary.visits ?? '0', 10) || 0;
    const highIntentVisitors =
      parseInt(summary.highIntentVisitors ?? '0', 10) || 0;

    return {
      highIntentVisitors,
      highIntentVisitorRate: this.roundRate(highIntentVisitors, visits),
    };
  }

  private buildTrafficFunnelCtes(
    startPlaceholder: string,
    endPlaceholder: string,
    options?: AdminTrafficScopeOptions,
  ): string {
    return `
      WITH registered_users AS (
        SELECT u.id AS user_id
        FROM users u
        WHERE u."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
          AND ${this.buildUserScopePredicate('u', options)}
      ),
      verified_users AS (
        SELECT ru.user_id
        FROM registered_users ru
        JOIN users u
          ON u.id = ru.user_id
        WHERE COALESCE(u.email_verified, false) = true
          AND u.email_verified_at IS NOT NULL
          AND u.email_verified_at BETWEEN ${startPlaceholder} AND ${endPlaceholder}
      ),
      product_view_ready_users AS (
        SELECT ubh.user_id
        FROM user_browsing_history ubh
        JOIN verified_users vu
          ON vu.user_id = ubh.user_id
        WHERE ubh.viewed_at BETWEEN ${startPlaceholder} AND ${endPlaceholder}
        GROUP BY ubh.user_id
        HAVING COUNT(DISTINCT ubh.product_id) >= 3
      ),
      action_ready_users AS (
        SELECT DISTINCT action_users.user_id
        FROM (
          SELECT uf.user_id
          FROM user_favorites uf
          WHERE uf."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}

          UNION

          SELECT oc."userId" AS user_id
          FROM outbound_clicks oc
          WHERE oc."createdAt" BETWEEN ${startPlaceholder} AND ${endPlaceholder}
            AND oc."userId" IS NOT NULL
        ) action_users
        JOIN registered_users ru
          ON ru.user_id = action_users.user_id
      ),
      effective_users AS (
        SELECT pvu.user_id
        FROM product_view_ready_users pvu
        JOIN action_ready_users aru
          ON aru.user_id = pvu.user_id
      )
    `;
  }

  private buildBehaviorFunnelDimensionQuery(
    dimensionName: string,
    dimensionSql: string,
    limitPlaceholder: string,
    options?: AdminTrafficScopeOptions,
  ): string {
    return `
      SELECT
        '${dimensionName}' AS dimension,
        ${dimensionSql} AS value,
        COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int AS visits,
        COUNT(DISTINCT CASE WHEN ru.user_id IS NOT NULL THEN vs.user_id END)::int AS registrations,
        COUNT(DISTINCT CASE WHEN vu.user_id IS NOT NULL THEN vs.user_id END)::int AS "verifiedUsers",
        COUNT(DISTINCT CASE WHEN pvu.user_id IS NOT NULL THEN vs.user_id END)::int AS "productViewReadyUsers",
        COUNT(DISTINCT CASE WHEN aru.user_id IS NOT NULL THEN vs.user_id END)::int AS "actionReadyUsers",
        COUNT(DISTINCT CASE WHEN eu.user_id IS NOT NULL THEN vs.user_id END)::int AS "effectiveUsers"
      FROM visit_sessions vs
      LEFT JOIN registered_users ru
        ON ru.user_id = vs.user_id
      LEFT JOIN verified_users vu
        ON vu.user_id = vs.user_id
      LEFT JOIN product_view_ready_users pvu
        ON pvu.user_id = vs.user_id
      LEFT JOIN action_ready_users aru
        ON aru.user_id = vs.user_id
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
      GROUP BY ${dimensionSql}
      ORDER BY visits DESC
      LIMIT ${limitPlaceholder}
    `;
  }

  async create(
    dto: CreateVisitSessionDto,
    ip: string,
    userAgent: string,
    referralCookie?: string,
    trustedVisitorId?: string,
    countryCode?: string,
  ): Promise<{ id: string }> {
    if (isLikelyBotUserAgent(userAgent)) {
      this.logger.debug(`Skip visit session for bot traffic: ${userAgent}`);
      return { id: '' };
    }

    const deviceId = trustedVisitorId || dto.deviceId || dto.sessionId;
    if (
      await this.trafficDefenseService.shouldBlockProductPathVisit(
        ip,
        dto.landingPage,
      )
    ) {
      return { id: '' };
    }

    const hasExplicitSource = Boolean(
      dto.utmSource || dto.utmMedium || dto.referrer,
    );
    const suspiciousDecision = this.evaluateSuspiciousVisit(ip, deviceId, {
      landingPage: dto.landingPage,
      hasExplicitSource,
    });
    if (suspiciousDecision.drop) {
      if (suspiciousDecision.target) {
        await this.trafficDefenseService.createAutomaticTemporaryBlock({
          target: suspiciousDecision.target,
          reason: suspiciousDecision.reason ?? 'suspicious_visit',
          metricsSnapshot: suspiciousDecision.metricsSnapshot,
          ttlHours: 1,
        });
      }
      return { id: '' };
    }

    // 1. 提取 referrer 域名
    const referrerDomain = this.extractDomain(dto.referrer);
    const normalizedReferrerDomain =
      referrerDomain && !isInternalDomain(referrerDomain)
        ? referrerDomain
        : undefined;

    // 2. 自动分类渠道
    const channelType = classifyChannel({
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      referrerDomain: referrerDomain || undefined,
    });

    // 3. 解析设备信息
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // 4. 解析地理位置
    const geo = geoip.lookup(ip);
    const normalizedCountryCode = countryCode?.trim().toUpperCase();
    const country =
      normalizedCountryCode &&
      normalizedCountryCode !== 'XX' &&
      /^[A-Z]{2}$/.test(normalizedCountryCode)
        ? normalizedCountryCode
        : geo?.country || undefined;
    const parsedReferral = referralCookie
      ? this.referralService.parseAttributionCookie(referralCookie)
      : null;
    const visitId = buildTrustedVisitId({
      trustedVisitorId: deviceId,
      landingPage: dto.landingPage,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      browserContext: dto.browserContext,
    });

    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'visit_landing',
      windowMs: 30 * 60 * 1000,
      parts: [
        deviceId,
        dto.landingPage,
        dto.utmSource,
        dto.utmMedium,
        dto.utmCampaign,
        dto.browserContext,
      ],
    });
    if (!shouldRecord) {
      const existing = await this.repo.findOne({
        where: {
          deviceId,
          visitId,
        },
        order: { createdAt: 'DESC' },
      });
      return { id: existing?.id || '' };
    }

    // 5. 保存
    const session = this.repo.create({
      sessionId: dto.sessionId,
      deviceId,
      visitId,
      lastActivityAt: new Date(),
      refClickId: parsedReferral?.clickId ?? dto.refClickId ?? null,
      referralCode: parsedReferral?.code ?? dto.referralCode ?? null,
      referrer: dto.referrer,
      referrerDomain: normalizedReferrerDomain,
      channelType,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      utmTerm: dto.utmTerm,
      utmContent: dto.utmContent,
      landingPage: dto.landingPage,
      language: dto.language,
      timezone: dto.timezone,
      consentStatus: dto.consentStatus ?? null,
      gaStatus: dto.gaStatus ?? null,
      gaTrackingEnabled: dto.gaTrackingEnabled ?? null,
      gaRequested: dto.gaRequested ?? null,
      gaScriptLoaded: dto.gaScriptLoaded ?? null,
      gaConfiguredTarget: dto.gaConfiguredTarget ?? null,
      gaFirstPageviewSent: dto.gaFirstPageviewSent ?? null,
      gaEventCount: dto.gaEventCount ?? null,
      gaFailedReason: dto.gaFailedReason ?? null,
      isInAppBrowser: dto.isInAppBrowser ?? null,
      browserContext: dto.browserContext ?? null,
      deviceType,
      browser: browser || undefined,
      os: os || undefined,
      ipAddress: ip,
      country,
      city: geo?.city || undefined,
    });

    const saved = await this.repo.save(session);
    return { id: saved.id };
  }

  async updateDiagnostics(
    dto: UpdateVisitDiagnosticsDto,
    context?: AnalyticsRequestContext,
  ): Promise<{ updated: boolean }> {
    if (
      this.shouldDropSuspiciousVisitMutation(
        context,
        dto.visitId || dto.sessionId,
      )
    ) {
      return { updated: false };
    }

    const scopedWhere = context?.trustedVisitorId
      ? { sessionId: dto.sessionId, deviceId: context.trustedVisitorId }
      : { sessionId: dto.sessionId };
    let latestSession = await this.repo.findOne({
      where: scopedWhere,
      order: { createdAt: 'DESC' },
    });

    if (!latestSession && dto.visitId) {
      latestSession = await this.repo.findOne({
        where: { visitId: dto.visitId },
        order: { createdAt: 'DESC' },
      });
    }

    if (!latestSession) {
      return { updated: false };
    }

    const patch: Partial<VisitSession> = {};

    if (dto.consentStatus !== undefined) {
      patch.consentStatus = dto.consentStatus;
    }
    if (dto.gaStatus !== undefined) {
      patch.gaStatus = dto.gaStatus;
    }
    if (dto.gaTrackingEnabled !== undefined) {
      patch.gaTrackingEnabled = dto.gaTrackingEnabled;
    }
    if (dto.gaRequested !== undefined) {
      patch.gaRequested = dto.gaRequested;
    }
    if (dto.gaScriptLoaded !== undefined) {
      patch.gaScriptLoaded = dto.gaScriptLoaded;
    }
    if (dto.gaConfiguredTarget !== undefined) {
      patch.gaConfiguredTarget = dto.gaConfiguredTarget;
    }
    if (dto.gaFirstPageviewSent !== undefined) {
      patch.gaFirstPageviewSent = dto.gaFirstPageviewSent;
    }
    if (dto.gaEventCount !== undefined) {
      patch.gaEventCount = dto.gaEventCount;
    }
    if (dto.gaFailedReason !== undefined) {
      patch.gaFailedReason = dto.gaFailedReason;
    }
    if (dto.isInAppBrowser !== undefined) {
      patch.isInAppBrowser = dto.isInAppBrowser;
    }
    if (dto.browserContext !== undefined) {
      patch.browserContext = dto.browserContext;
    }

    if (Object.keys(patch).length === 0) {
      return { updated: false };
    }

    patch.lastActivityAt = new Date();

    const merged = this.repo.merge(latestSession, patch);
    const saved = await this.repo.save(merged);
    return { updated: Boolean(saved?.id) };
  }

  async updateEngagement(
    dto: UpdateVisitEngagementDto,
    context?: AnalyticsRequestContext,
  ): Promise<{ updated: boolean }> {
    if (
      this.shouldDropSuspiciousVisitMutation(
        context,
        dto.visitId || dto.sessionId,
      )
    ) {
      return { updated: false };
    }

    const scopedWhere = context?.trustedVisitorId
      ? { sessionId: dto.sessionId, deviceId: context.trustedVisitorId }
      : { sessionId: dto.sessionId };
    let latestSession = await this.repo.findOne({
      where: scopedWhere,
      order: { createdAt: 'DESC' },
    });

    if (!latestSession && dto.visitId) {
      latestSession = await this.repo.findOne({
        where: { visitId: dto.visitId },
        order: { createdAt: 'DESC' },
      });
    }

    if (!latestSession) {
      return { updated: false };
    }

    const activeDeltaMs = Math.min(
      Math.max(dto.activeDeltaMs || 0, 0),
      this.maxActiveDeltaMs,
    );
    const totalDeltaMs = Math.min(
      Math.max(dto.totalDeltaMs || 0, 0),
      this.maxTotalDeltaMs,
    );
    const eventCount = Math.min(Math.max(dto.eventCount || 0, 0), 100);

    if (activeDeltaMs <= 0 && totalDeltaMs <= 0 && eventCount <= 0) {
      return { updated: false };
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const safeOccurredAt = Number.isNaN(occurredAt.getTime())
      ? new Date()
      : occurredAt;

    const rows = await this.repo.query(
      `UPDATE visit_sessions
       SET active_duration_ms = COALESCE(active_duration_ms, 0) + $2,
           total_duration_ms = COALESCE(total_duration_ms, 0) + $3,
           heartbeat_count = COALESCE(heartbeat_count, 0) + 1,
           engagement_event_count = COALESCE(engagement_event_count, 0) + $4,
           active_duration_before_first_outbound_ms = CASE
             WHEN $5 = 'outbound'
              AND active_duration_before_first_outbound_ms IS NULL
             THEN COALESCE(active_duration_ms, 0) + $2
             ELSE active_duration_before_first_outbound_ms
           END,
           last_engagement_at = $6::timestamptz,
           last_activity_at = $7::timestamptz
       WHERE id = $1
       RETURNING id`,
      [
        latestSession.id,
        activeDeltaMs,
        totalDeltaMs,
        eventCount,
        dto.reason || 'heartbeat',
        safeOccurredAt,
        safeOccurredAt,
      ],
    );

    return { updated: rows.length > 0 };
  }

  async associateUser(sessionId: string, userId: string): Promise<void> {
    await this.repo.update({ sessionId }, { userId });
  }

  async resolveActiveVisitIdentity(
    trustedVisitorId: string,
    options?: {
      landingPage?: string | null;
      occurredAt?: Date;
    },
  ): Promise<ResolvedVisitIdentity | null> {
    const occurredAt = options?.occurredAt ?? new Date();
    const activeAfter = new Date(
      occurredAt.getTime() - this.activeVisitWindowMs,
    );

    const baseQuery = () =>
      this.repo
        .createQueryBuilder('vs')
        .where('vs.deviceId = :deviceId', { deviceId: trustedVisitorId })
        .andWhere('vs.createdAt <= :occurredAt', { occurredAt })
        .orderBy('COALESCE(vs.lastActivityAt, vs.createdAt)', 'DESC')
        .addOrderBy('vs.createdAt', 'DESC');

    if (options?.landingPage) {
      const pageMatch = await baseQuery()
        .andWhere('vs.landingPage = :landingPage', {
          landingPage: options.landingPage,
        })
        .andWhere('COALESCE(vs.lastActivityAt, vs.createdAt) >= :activeAfter', {
          activeAfter,
        })
        .getOne();
      if (pageMatch) {
        return this.mapResolvedVisitIdentity(pageMatch);
      }
    }

    const activeVisit = await baseQuery()
      .andWhere('COALESCE(vs.lastActivityAt, vs.createdAt) >= :activeAfter', {
        activeAfter,
      })
      .getOne();
    if (activeVisit) {
      return this.mapResolvedVisitIdentity(activeVisit);
    }

    const latestVisit = await baseQuery().getOne();
    return latestVisit ? this.mapResolvedVisitIdentity(latestVisit) : null;
  }

  async touchVisitActivity(
    id: string,
    occurredAt: Date = new Date(),
  ): Promise<void> {
    await this.repo.update({ id }, { lastActivityAt: occurredAt });
  }

  private mapResolvedVisitIdentity(
    session: VisitSession,
  ): ResolvedVisitIdentity {
    return {
      id: session.id,
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      visitId: session.visitId,
    };
  }

  // ─── 统计查询方法（Admin 看板用） ───

  async getOverview(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficOverview> {
    // 计算上一个对比周期
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime());

    // 当前周期
    const [
      current,
      prev,
      currentHighIntentSummary,
      prevHighIntentSummary,
      currentActivatedSummary,
      prevActivatedSummary,
      currentEffectiveSummary,
      prevEffectiveSummary,
      totalOutboundVisits,
      prevTotalOutboundVisits,
    ] = await Promise.all([
      this.applyVisitScope(
        this.repo
          .createQueryBuilder('vs')
          .select('COUNT(*)', 'total')
          .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'uniqueSessions')
          .addSelect(`COUNT(DISTINCT ${this.deviceKeySql})`, 'uniqueVisitors'),
        startDate,
        endDate,
        'vs',
        options,
      ).getRawOne(),
      this.applyVisitScope(
        this.repo
          .createQueryBuilder('vs')
          .select('COUNT(*)', 'total')
          .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'uniqueSessions')
          .addSelect(`COUNT(DISTINCT ${this.deviceKeySql})`, 'uniqueVisitors'),
        prevStartDate,
        prevEndDate,
        'vs',
        options,
      ).getRawOne(),
      this.getHighIntentVisitorSummary(startDate, endDate, options),
      this.getHighIntentVisitorSummary(prevStartDate, prevEndDate, options),
      this.getActivatedUserSummary(startDate, endDate, options),
      this.getActivatedUserSummary(prevStartDate, prevEndDate, options),
      this.getEffectiveUserSummary(startDate, endDate, options),
      this.getEffectiveUserSummary(prevStartDate, prevEndDate, options),
      this.getOutboundVisitCount(startDate, endDate, options),
      this.getOutboundVisitCount(prevStartDate, prevEndDate, options),
    ]);

    const total = parseInt(current.total) || 0;
    const prevTotal = parseInt(prev.total) || 0;
    const uniqueSessions = parseInt(current.uniqueSessions) || 0;
    const prevUniqueSessions = parseInt(prev.uniqueSessions) || 0;
    const uniqueVisitors = parseInt(current.uniqueVisitors) || 0;
    const prevUniqueVisitors = parseInt(prev.uniqueVisitors) || 0;
    const highIntentVisitors = currentHighIntentSummary.highIntentVisitors;
    const prevHighIntentVisitors = prevHighIntentSummary.highIntentVisitors;
    const activatedUsers = currentActivatedSummary.activatedUsers;
    const prevActivatedUsers = prevActivatedSummary.activatedUsers;
    const effectiveNewUsers = currentEffectiveSummary.effectiveUsers;
    const prevEffectiveNewUsers = prevEffectiveSummary.effectiveUsers;
    const suspiciousVisitRecords = Math.max(total - uniqueSessions, 0);

    // Top 渠道和来源
    const [topChannelRow, topSourceRow] = await Promise.all([
      this.applyVisitScope(
        this.repo
          .createQueryBuilder('vs')
          .select('vs.channelType', 'channel')
          .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'count'),
        startDate,
        endDate,
        'vs',
        options,
      )
        .groupBy('vs.channelType')
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne(),
      this.applyVisitScope(
        this.repo
          .createQueryBuilder('vs')
          .select(this.sourceSql, 'source')
          .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'count'),
        startDate,
        endDate,
        'vs',
        options,
      )
        .andWhere('(vs.utmSource IS NOT NULL OR vs.referrerDomain IS NOT NULL)')
        .groupBy(this.sourceSql)
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne(),
    ]);

    return {
      total,
      totalChange:
        prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0,
      uniqueSessions,
      uniqueSessionsChange:
        prevUniqueSessions > 0
          ? Math.round(
              ((uniqueSessions - prevUniqueSessions) / prevUniqueSessions) *
                100,
            )
          : 0,
      uniqueVisitors,
      uniqueVisitorsChange:
        prevUniqueVisitors > 0
          ? Math.round(
              ((uniqueVisitors - prevUniqueVisitors) / prevUniqueVisitors) *
                100,
            )
          : 0,
      totalOutboundVisits,
      totalOutboundVisitsChange:
        prevTotalOutboundVisits > 0
          ? Math.round(
              ((totalOutboundVisits - prevTotalOutboundVisits) /
                prevTotalOutboundVisits) *
                100,
            )
          : 0,
      outboundVisitRate: this.roundRate(totalOutboundVisits, uniqueSessions),
      highIntentVisitors,
      highIntentVisitorsChange:
        prevHighIntentVisitors > 0
          ? Math.round(
              ((highIntentVisitors - prevHighIntentVisitors) /
                prevHighIntentVisitors) *
                100,
            )
          : 0,
      highIntentVisitorRate: currentHighIntentSummary.highIntentVisitorRate,
      activatedUsers,
      activatedUsersChange:
        prevActivatedUsers > 0
          ? Math.round(
              ((activatedUsers - prevActivatedUsers) / prevActivatedUsers) *
                100,
            )
          : 0,
      activatedUserRate: currentActivatedSummary.activatedUserRate,
      effectiveNewUsers,
      effectiveNewUsersChange:
        prevEffectiveNewUsers > 0
          ? Math.round(
              ((effectiveNewUsers - prevEffectiveNewUsers) /
                prevEffectiveNewUsers) *
                100,
            )
          : 0,
      effectiveNewUserRate: currentEffectiveSummary.effectiveUserRate,
      effectiveUsers: effectiveNewUsers,
      effectiveUsersChange:
        prevEffectiveNewUsers > 0
          ? Math.round(
              ((effectiveNewUsers - prevEffectiveNewUsers) /
                prevEffectiveNewUsers) *
                100,
            )
          : 0,
      effectiveUserRate: currentEffectiveSummary.effectiveUserRate,
      suspiciousVisitRecords,
      suspiciousVisitRate: this.roundRate(suspiciousVisitRecords, total),
      topChannel: topChannelRow?.channel || null,
      topSource: topSourceRow?.source || null,
      period: {
        current: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        previous: {
          start: prevStartDate.toISOString(),
          end: prevEndDate.toISOString(),
        },
      },
    };
  }

  async getByChannel(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<ChannelBreakdown[]> {
    const rows = await this.applyVisitScope(
      this.repo
        .createQueryBuilder('vs')
        .select('vs.channelType', 'channel')
        .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'count'),
      startDate,
      endDate,
      'vs',
      options,
    )
      .groupBy('vs.channelType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);

    return rows.map((r: any) => ({
      channel: r.channel,
      count: parseInt(r.count),
      percentage:
        total > 0 ? Math.round((parseInt(r.count) / total) * 10000) / 100 : 0,
    }));
  }

  async getBySource(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<SourceBreakdown[]> {
    const rows = await this.repo.query(
      `${this.buildEffectiveUsersCte('$1', '$2', options)}
      SELECT
        ${this.sourceSql} AS source,
        COUNT(*)::int AS "rawCount",
        COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id)) AS count,
        COUNT(DISTINCT COALESCE(vs.device_id, vs.session_id)) AS "uniqueVisitors",
        COUNT(DISTINCT CASE WHEN oc.id IS NOT NULL THEN COALESCE(vs.visit_id, vs.session_id) END) AS "outboundVisits",
        COUNT(DISTINCT CASE WHEN eu.user_id IS NOT NULL THEN vs.user_id END) AS "effectiveUsers",
        COUNT(DISTINCT CASE WHEN COALESCE(vs.heartbeat_count, 0) > 0 THEN COALESCE(vs.visit_id, vs.session_id) END) AS "measuredVisits",
        COALESCE(ROUND(AVG(NULLIF(COALESCE(vs.active_duration_ms, 0), 0)))::int, 0) AS "avgActiveDurationMs",
        COUNT(DISTINCT CASE
          WHEN COALESCE(vs.heartbeat_count, 0) > 0
           AND COALESCE(vs.active_duration_ms, 0) < 3000
          THEN COALESCE(vs.visit_id, vs.session_id)
        END) AS "shortStayVisits",
        COUNT(DISTINCT CASE
          WHEN COALESCE(vs.active_duration_ms, 0) >= 10000
          THEN COALESCE(vs.visit_id, vs.session_id)
        END) AS "engaged10sVisits",
        COUNT(DISTINCT CASE
          WHEN COALESCE(vs.active_duration_ms, 0) >= 30000
          THEN COALESCE(vs.visit_id, vs.session_id)
        END) AS "engaged30sVisits",
        COALESCE(ROUND(AVG(vs.active_duration_before_first_outbound_ms) FILTER (
          WHERE vs.active_duration_before_first_outbound_ms IS NOT NULL
        ))::int, 0) AS "avgActiveBeforeOutboundMs"
      FROM visit_sessions vs
      LEFT JOIN outbound_clicks oc
        ON COALESCE(vs.visit_id, vs.session_id) = COALESCE(oc.visit_id, oc."sessionId")
        AND oc."createdAt" BETWEEN $1 AND $2
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
      GROUP BY ${this.sourceSql}
      ORDER BY count DESC
      LIMIT $3`,
      [startDate, endDate, limit],
    );

    return rows.map((r: any) => ({
      source: r.source,
      rawCount: parseInt(r.rawCount, 10) || 0,
      count: parseInt(r.count),
      uniqueVisitors: parseInt(r.uniqueVisitors, 10) || 0,
      suspiciousVisits: Math.max(
        (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
        0,
      ),
      suspiciousRate:
        (parseInt(r.rawCount, 10) || 0) > 0
          ? Math.round(
              (Math.max(
                (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
                0,
              ) /
                (parseInt(r.rawCount, 10) || 0)) *
                10000,
            ) / 100
          : 0,
      outboundVisits:
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
      outboundClicks:
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
      outboundRate: this.roundRate(
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
        parseInt(r.count, 10) || 0,
      ),
      effectiveUsers: parseInt(r.effectiveUsers, 10) || 0,
      effectiveUserRate: this.roundRate(
        parseInt(r.effectiveUsers, 10) || 0,
        parseInt(r.count, 10) || 0,
      ),
      measuredVisits: parseInt(r.measuredVisits, 10) || 0,
      avgActiveDurationMs: parseInt(r.avgActiveDurationMs, 10) || 0,
      shortStayRate: this.roundRate(
        parseInt(r.shortStayVisits, 10) || 0,
        parseInt(r.measuredVisits, 10) || 0,
      ),
      engaged10sRate: this.roundRate(
        parseInt(r.engaged10sVisits, 10) || 0,
        parseInt(r.measuredVisits, 10) || 0,
      ),
      engaged30sRate: this.roundRate(
        parseInt(r.engaged30sVisits, 10) || 0,
        parseInt(r.measuredVisits, 10) || 0,
      ),
      avgActiveBeforeOutboundMs: parseInt(r.avgActiveBeforeOutboundMs, 10) || 0,
    }));
  }

  async getEngagementOverview(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficEngagementOverview> {
    const rows = await this.repo.query(
      `WITH visit_rollup AS (
        SELECT
          COALESCE(vs.visit_id, vs.session_id) AS visit_key,
          MAX(COALESCE(vs.active_duration_ms, 0))::int AS active_duration_ms,
          MAX(COALESCE(vs.heartbeat_count, 0))::int AS heartbeat_count,
          MAX(vs.active_duration_before_first_outbound_ms)::int AS active_before_outbound_ms
        FROM visit_sessions vs
        WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        GROUP BY COALESCE(vs.visit_id, vs.session_id)
      )
      SELECT
        COUNT(*)::int AS "totalVisits",
        COUNT(*) FILTER (WHERE heartbeat_count > 0)::int AS "measuredVisits",
        COALESCE(ROUND(AVG(active_duration_ms) FILTER (
          WHERE heartbeat_count > 0
        ))::int, 0) AS "avgActiveDurationMs",
        COALESCE(ROUND((
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY active_duration_ms)
          FILTER (WHERE heartbeat_count > 0)
        )::numeric)::int, 0) AS "medianActiveDurationMs",
        COUNT(*) FILTER (
          WHERE heartbeat_count > 0 AND active_duration_ms < 3000
        )::int AS "shortStayVisits",
        COUNT(*) FILTER (WHERE active_duration_ms >= 10000)::int AS "engaged10sVisits",
        COUNT(*) FILTER (WHERE active_duration_ms >= 30000)::int AS "engaged30sVisits",
        COALESCE(ROUND(AVG(active_before_outbound_ms) FILTER (
          WHERE active_before_outbound_ms IS NOT NULL
        ))::int, 0) AS "avgActiveBeforeOutboundMs"
      FROM visit_rollup`,
      [startDate, endDate],
    );

    const row = rows?.[0] ?? {};
    const totalVisits = parseInt(row.totalVisits ?? '0', 10) || 0;
    const measuredVisits = parseInt(row.measuredVisits ?? '0', 10) || 0;
    const shortStayVisits = parseInt(row.shortStayVisits ?? '0', 10) || 0;
    const engaged10sVisits = parseInt(row.engaged10sVisits ?? '0', 10) || 0;
    const engaged30sVisits = parseInt(row.engaged30sVisits ?? '0', 10) || 0;

    return {
      totalVisits,
      measuredVisits,
      measurementCoverageRate: this.roundRate(measuredVisits, totalVisits),
      avgActiveDurationMs: parseInt(row.avgActiveDurationMs ?? '0', 10) || 0,
      medianActiveDurationMs:
        parseInt(row.medianActiveDurationMs ?? '0', 10) || 0,
      shortStayVisits,
      shortStayRate: this.roundRate(shortStayVisits, measuredVisits),
      engaged10sVisits,
      engaged10sRate: this.roundRate(engaged10sVisits, measuredVisits),
      engaged30sVisits,
      engaged30sRate: this.roundRate(engaged30sVisits, measuredVisits),
      avgActiveBeforeOutboundMs:
        parseInt(row.avgActiveBeforeOutboundMs ?? '0', 10) || 0,
    };
  }

  async getByCampaign(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<CampaignBreakdown[]> {
    const rows = await this.repo.query(
      `${this.buildEffectiveUsersCte('$1', '$2', options)}
      SELECT
        vs.utm_campaign AS campaign,
        vs.utm_source AS source,
        vs.utm_medium AS medium,
        COUNT(*)::int AS "rawCount",
        COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id)) AS count,
        COUNT(DISTINCT COALESCE(vs.device_id, vs.session_id)) AS "uniqueVisitors",
        COUNT(DISTINCT CASE WHEN oc.id IS NOT NULL THEN COALESCE(vs.visit_id, vs.session_id) END) AS "outboundVisits",
        COUNT(DISTINCT CASE WHEN eu.user_id IS NOT NULL THEN vs.user_id END) AS "effectiveUsers"
      FROM visit_sessions vs
      LEFT JOIN outbound_clicks oc
        ON COALESCE(vs.visit_id, vs.session_id) = COALESCE(oc.visit_id, oc."sessionId")
        AND oc."createdAt" BETWEEN $1 AND $2
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        AND vs.utm_campaign IS NOT NULL
      GROUP BY vs.utm_campaign, vs.utm_source, vs.utm_medium
      ORDER BY count DESC`,
      [startDate, endDate],
    );

    return rows.map((r: any) => ({
      campaign: r.campaign,
      source: r.source || null,
      medium: r.medium || null,
      rawCount: parseInt(r.rawCount, 10) || 0,
      count: parseInt(r.count),
      uniqueVisitors: parseInt(r.uniqueVisitors, 10) || 0,
      suspiciousVisits: Math.max(
        (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
        0,
      ),
      suspiciousRate:
        (parseInt(r.rawCount, 10) || 0) > 0
          ? Math.round(
              (Math.max(
                (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
                0,
              ) /
                (parseInt(r.rawCount, 10) || 0)) *
                10000,
            ) / 100
          : 0,
      outboundVisits:
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
      outboundClicks:
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
      outboundRate: this.roundRate(
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
        parseInt(r.count, 10) || 0,
      ),
      effectiveUsers: parseInt(r.effectiveUsers, 10) || 0,
      effectiveUserRate: this.roundRate(
        parseInt(r.effectiveUsers, 10) || 0,
        parseInt(r.count, 10) || 0,
      ),
    }));
  }

  async getByLandingPage(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<LandingPageBreakdown[]> {
    const rows = await this.repo.query(
      `${this.buildEffectiveUsersCte('$1', '$2', options)}
      SELECT
        vs.landing_page AS "landingPage",
        COUNT(*)::int AS "rawCount",
        COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id)) AS count,
        COUNT(DISTINCT COALESCE(vs.device_id, vs.session_id)) AS "uniqueVisitors",
        COUNT(DISTINCT CASE WHEN oc.id IS NOT NULL THEN COALESCE(vs.visit_id, vs.session_id) END) AS "outboundVisits",
        COUNT(DISTINCT CASE WHEN eu.user_id IS NOT NULL THEN vs.user_id END) AS "effectiveUsers"
      FROM visit_sessions vs
      LEFT JOIN outbound_clicks oc
        ON COALESCE(vs.visit_id, vs.session_id) = COALESCE(oc.visit_id, oc."sessionId")
        AND oc."createdAt" BETWEEN $1 AND $2
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
      GROUP BY vs.landing_page
      ORDER BY count DESC
      LIMIT $3`,
      [startDate, endDate, limit],
    );

    return rows.map((r: any) => ({
      landingPage: r.landingPage,
      rawCount: parseInt(r.rawCount, 10) || 0,
      count: parseInt(r.count),
      uniqueVisitors: parseInt(r.uniqueVisitors, 10) || 0,
      suspiciousVisits: Math.max(
        (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
        0,
      ),
      suspiciousRate:
        (parseInt(r.rawCount, 10) || 0) > 0
          ? Math.round(
              (Math.max(
                (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
                0,
              ) /
                (parseInt(r.rawCount, 10) || 0)) *
                10000,
            ) / 100
          : 0,
      outboundVisits:
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
      outboundClicks:
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
      outboundRate: this.roundRate(
        parseInt(String(r.outboundVisits ?? r.outboundClicks ?? 0), 10) || 0,
        parseInt(r.count, 10) || 0,
      ),
      effectiveUsers: parseInt(r.effectiveUsers, 10) || 0,
      effectiveUserRate: this.roundRate(
        parseInt(r.effectiveUsers, 10) || 0,
        parseInt(r.count, 10) || 0,
      ),
    }));
  }

  async getBehaviorFunnelOverview(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorFunnelOverview> {
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      SELECT
        (
          SELECT COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int
          FROM visit_sessions vs
          WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        ) AS visits,
        (SELECT COUNT(*)::int FROM registered_users) AS registrations,
        (SELECT COUNT(*)::int FROM verified_users) AS "verifiedUsers",
        (SELECT COUNT(*)::int FROM product_view_ready_users) AS "productViewReadyUsers",
        (SELECT COUNT(*)::int FROM action_ready_users) AS "actionReadyUsers",
        (SELECT COUNT(*)::int FROM effective_users) AS "effectiveUsers"`,
      [startDate, endDate],
    );

    const row = rows?.[0] ?? {};
    const visits = parseInt(row.visits ?? '0', 10) || 0;
    const registrations = parseInt(row.registrations ?? '0', 10) || 0;
    const verifiedUsers = parseInt(row.verifiedUsers ?? '0', 10) || 0;
    const productViewReadyUsers =
      parseInt(row.productViewReadyUsers ?? '0', 10) || 0;
    const actionReadyUsers = parseInt(row.actionReadyUsers ?? '0', 10) || 0;
    const effectiveUsers = parseInt(row.effectiveUsers ?? '0', 10) || 0;

    return {
      visits,
      registrations,
      verifiedUsers,
      productViewReadyUsers,
      actionReadyUsers,
      effectiveUsers,
      visitToRegistrationRate: this.roundRate(registrations, visits),
      registrationToVerificationRate: this.roundRate(
        verifiedUsers,
        registrations,
      ),
      verificationToProductViewRate: this.roundRate(
        productViewReadyUsers,
        verifiedUsers,
      ),
      productViewToEffectiveRate: this.roundRate(
        effectiveUsers,
        productViewReadyUsers,
      ),
      visitToEffectiveRate: this.roundRate(effectiveUsers, visits),
      blockers: {
        anonymousOrUnregisteredVisits: Math.max(visits - registrations, 0),
        unverifiedUsers: Math.max(registrations - verifiedUsers, 0),
        insufficientProductViews: Math.max(
          verifiedUsers - productViewReadyUsers,
          0,
        ),
        missingAction: Math.max(productViewReadyUsers - effectiveUsers, 0),
      },
    };
  }

  async getBehaviorFunnelBySource(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorFunnelBySource[]> {
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      ${this.buildBehaviorFunnelDimensionQuery('source', this.sourceSql, '$3', options)}`,
      [startDate, endDate, limit],
    );

    return rows.map((row: any) => {
      const visits = parseInt(row.visits ?? '0', 10) || 0;
      const registrations = parseInt(row.registrations ?? '0', 10) || 0;
      const effectiveUsers = parseInt(row.effectiveUsers ?? '0', 10) || 0;

      return {
        source: row.value ?? row.source,
        visits,
        registrations,
        verifiedUsers: parseInt(row.verifiedUsers ?? '0', 10) || 0,
        productViewReadyUsers:
          parseInt(row.productViewReadyUsers ?? '0', 10) || 0,
        actionReadyUsers: parseInt(row.actionReadyUsers ?? '0', 10) || 0,
        effectiveUsers,
        visitToRegistrationRate: this.roundRate(registrations, visits),
        registrationToEffectiveRate: this.roundRate(
          effectiveUsers,
          registrations,
        ),
        visitToEffectiveRate: this.roundRate(effectiveUsers, visits),
      };
    });
  }

  async getBehaviorFunnelByCampaign(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorFunnelByDimension[]> {
    const dimensionSql = `COALESCE(NULLIF(vs.utm_campaign, ''), '(not set)')`;
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      ${this.buildBehaviorFunnelDimensionQuery('campaign', dimensionSql, '$3', options)}`,
      [startDate, endDate, limit],
    );

    return rows.map((row: any) => {
      const visits = parseInt(row.visits ?? '0', 10) || 0;
      const registrations = parseInt(row.registrations ?? '0', 10) || 0;
      const effectiveUsers = parseInt(row.effectiveUsers ?? '0', 10) || 0;

      return {
        dimension: row.dimension,
        value: row.value,
        visits,
        registrations,
        verifiedUsers: parseInt(row.verifiedUsers ?? '0', 10) || 0,
        productViewReadyUsers:
          parseInt(row.productViewReadyUsers ?? '0', 10) || 0,
        actionReadyUsers: parseInt(row.actionReadyUsers ?? '0', 10) || 0,
        effectiveUsers,
        visitToRegistrationRate: this.roundRate(registrations, visits),
        registrationToEffectiveRate: this.roundRate(
          effectiveUsers,
          registrations,
        ),
        visitToEffectiveRate: this.roundRate(effectiveUsers, visits),
      };
    });
  }

  async getBehaviorFunnelByLandingPage(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorFunnelByDimension[]> {
    const dimensionSql = `vs.landing_page`;
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      ${this.buildBehaviorFunnelDimensionQuery('landingPage', dimensionSql, '$3', options)}`,
      [startDate, endDate, limit],
    );

    return rows.map((row: any) => {
      const visits = parseInt(row.visits ?? '0', 10) || 0;
      const registrations = parseInt(row.registrations ?? '0', 10) || 0;
      const effectiveUsers = parseInt(row.effectiveUsers ?? '0', 10) || 0;

      return {
        dimension: row.dimension,
        value: row.value,
        visits,
        registrations,
        verifiedUsers: parseInt(row.verifiedUsers ?? '0', 10) || 0,
        productViewReadyUsers:
          parseInt(row.productViewReadyUsers ?? '0', 10) || 0,
        actionReadyUsers: parseInt(row.actionReadyUsers ?? '0', 10) || 0,
        effectiveUsers,
        visitToRegistrationRate: this.roundRate(registrations, visits),
        registrationToEffectiveRate: this.roundRate(
          effectiveUsers,
          registrations,
        ),
        visitToEffectiveRate: this.roundRate(effectiveUsers, visits),
      };
    });
  }

  async getBehaviorFunnelSamplesBySource(
    startDate: Date,
    endDate: Date,
    source: string,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorSample[]> {
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      SELECT
        vs.user_id AS "userId",
        u.email AS email,
        MAX(vs.created_at)::text AS "latestVisitAt",
        MAX(vs.landing_page) AS "landingPage",
        MAX(vs.utm_campaign) AS campaign,
        true AS registered,
        CASE WHEN vu.user_id IS NOT NULL THEN true ELSE false END AS "emailVerified",
        COALESCE(pv."productViews", 0)::int AS "productViews",
        CASE WHEN aru.user_id IS NOT NULL THEN true ELSE false END AS "actionReady",
        CASE WHEN eu.user_id IS NOT NULL THEN true ELSE false END AS "effectiveUser"
      FROM visit_sessions vs
      LEFT JOIN users u
        ON u.id = vs.user_id
      LEFT JOIN verified_users vu
        ON vu.user_id = vs.user_id
      LEFT JOIN (
        SELECT ubh.user_id, COUNT(DISTINCT ubh.product_id)::int AS "productViews"
        FROM user_browsing_history ubh
        WHERE ubh.viewed_at BETWEEN $1 AND $2
        GROUP BY ubh.user_id
      ) pv
        ON pv.user_id = vs.user_id
      LEFT JOIN action_ready_users aru
        ON aru.user_id = vs.user_id
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        AND ${this.sourceSql} = $3
        AND vs.user_id IS NOT NULL
      GROUP BY
        vs.user_id,
        u.email,
        vu.user_id,
        pv."productViews",
        aru.user_id,
        eu.user_id
      ORDER BY MAX(vs.created_at) DESC
      LIMIT $4`,
      [startDate, endDate, source, limit],
    );

    return rows.map((row: any) => {
      const emailVerified = !!row.emailVerified;
      const productViews = parseInt(row.productViews ?? '0', 10) || 0;
      const actionReady = !!row.actionReady;
      const effectiveUser = !!row.effectiveUser;

      let blocker: TrafficBehaviorSample['blocker'] = 'effective';
      if (!emailVerified) {
        blocker = 'unverified';
      } else if (productViews < 3) {
        blocker = 'insufficient_product_views';
      } else if (!actionReady) {
        blocker = 'missing_action';
      }

      return {
        userId: row.userId,
        email: row.email || null,
        latestVisitAt: row.latestVisitAt,
        landingPage: row.landingPage || null,
        campaign: row.campaign || null,
        registered: true,
        emailVerified,
        productViews,
        actionReady,
        effectiveUser,
        blocker,
      };
    });
  }

  async getBehaviorFunnelSamplesByCampaign(
    startDate: Date,
    endDate: Date,
    campaign: string,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorSample[]> {
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      SELECT
        vs.user_id AS "userId",
        u.email AS email,
        MAX(vs.created_at)::text AS "latestVisitAt",
        MAX(vs.landing_page) AS "landingPage",
        MAX(vs.utm_campaign) AS campaign,
        true AS registered,
        CASE WHEN vu.user_id IS NOT NULL THEN true ELSE false END AS "emailVerified",
        COALESCE(pv."productViews", 0)::int AS "productViews",
        CASE WHEN aru.user_id IS NOT NULL THEN true ELSE false END AS "actionReady",
        CASE WHEN eu.user_id IS NOT NULL THEN true ELSE false END AS "effectiveUser"
      FROM visit_sessions vs
      LEFT JOIN users u
        ON u.id = vs.user_id
      LEFT JOIN verified_users vu
        ON vu.user_id = vs.user_id
      LEFT JOIN (
        SELECT ubh.user_id, COUNT(DISTINCT ubh.product_id)::int AS "productViews"
        FROM user_browsing_history ubh
        WHERE ubh.viewed_at BETWEEN $1 AND $2
        GROUP BY ubh.user_id
      ) pv
        ON pv.user_id = vs.user_id
      LEFT JOIN action_ready_users aru
        ON aru.user_id = vs.user_id
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        AND COALESCE(NULLIF(vs.utm_campaign, ''), '(not set)') = $3
        AND vs.user_id IS NOT NULL
      GROUP BY
        vs.user_id,
        u.email,
        vu.user_id,
        pv."productViews",
        aru.user_id,
        eu.user_id
      ORDER BY MAX(vs.created_at) DESC
      LIMIT $4`,
      [startDate, endDate, campaign, limit],
    );

    return rows.map((row: any) => {
      const emailVerified = !!row.emailVerified;
      const productViews = parseInt(row.productViews ?? '0', 10) || 0;
      const actionReady = !!row.actionReady;
      const effectiveUser = !!row.effectiveUser;

      let blocker: TrafficBehaviorSample['blocker'] = 'effective';
      if (!emailVerified) {
        blocker = 'unverified';
      } else if (productViews < 3) {
        blocker = 'insufficient_product_views';
      } else if (!actionReady) {
        blocker = 'missing_action';
      }

      return {
        userId: row.userId,
        email: row.email || null,
        latestVisitAt: row.latestVisitAt,
        landingPage: row.landingPage || null,
        campaign: row.campaign || null,
        registered: true,
        emailVerified,
        productViews,
        actionReady,
        effectiveUser,
        blocker,
      };
    });
  }

  async getBehaviorFunnelSamplesByLandingPage(
    startDate: Date,
    endDate: Date,
    landingPage: string,
    limit: number = 20,
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficBehaviorSample[]> {
    const rows = await this.repo.query(
      `${this.buildTrafficFunnelCtes('$1', '$2', options)}
      SELECT
        vs.user_id AS "userId",
        u.email AS email,
        MAX(vs.created_at)::text AS "latestVisitAt",
        MAX(vs.landing_page) AS "landingPage",
        MAX(vs.utm_campaign) AS campaign,
        true AS registered,
        CASE WHEN vu.user_id IS NOT NULL THEN true ELSE false END AS "emailVerified",
        COALESCE(pv."productViews", 0)::int AS "productViews",
        CASE WHEN aru.user_id IS NOT NULL THEN true ELSE false END AS "actionReady",
        CASE WHEN eu.user_id IS NOT NULL THEN true ELSE false END AS "effectiveUser"
      FROM visit_sessions vs
      LEFT JOIN users u
        ON u.id = vs.user_id
      LEFT JOIN verified_users vu
        ON vu.user_id = vs.user_id
      LEFT JOIN (
        SELECT ubh.user_id, COUNT(DISTINCT ubh.product_id)::int AS "productViews"
        FROM user_browsing_history ubh
        WHERE ubh.viewed_at BETWEEN $1 AND $2
        GROUP BY ubh.user_id
      ) pv
        ON pv.user_id = vs.user_id
      LEFT JOIN action_ready_users aru
        ON aru.user_id = vs.user_id
      LEFT JOIN effective_users eu
        ON eu.user_id = vs.user_id
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        AND vs.landing_page = $3
        AND vs.user_id IS NOT NULL
      GROUP BY
        vs.user_id,
        u.email,
        vu.user_id,
        pv."productViews",
        aru.user_id,
        eu.user_id
      ORDER BY MAX(vs.created_at) DESC
      LIMIT $4`,
      [startDate, endDate, landingPage, limit],
    );

    return rows.map((row: any) => {
      const emailVerified = !!row.emailVerified;
      const productViews = parseInt(row.productViews ?? '0', 10) || 0;
      const actionReady = !!row.actionReady;
      const effectiveUser = !!row.effectiveUser;

      let blocker: TrafficBehaviorSample['blocker'] = 'effective';
      if (!emailVerified) {
        blocker = 'unverified';
      } else if (productViews < 3) {
        blocker = 'insufficient_product_views';
      } else if (!actionReady) {
        blocker = 'missing_action';
      }

      return {
        userId: row.userId,
        email: row.email || null,
        latestVisitAt: row.latestVisitAt,
        landingPage: row.landingPage || null,
        campaign: row.campaign || null,
        registered: true,
        emailVerified,
        productViews,
        actionReady,
        effectiveUser,
        blocker,
      };
    });
  }

  async getTrends(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'hour' = 'day',
    options?: AdminTrafficScopeOptions,
  ): Promise<TrafficTrend[]> {
    const dateExpr =
      groupBy === 'hour'
        ? "TO_CHAR(vs.created_at, 'YYYY-MM-DD HH24:00')"
        : 'DATE(vs.created_at)';

    const rows = await this.repo.query(
      `SELECT
        ${dateExpr} AS period,
        COUNT(*)::int AS "rawCount",
        COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id)) AS count
      FROM visit_sessions vs
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
      GROUP BY ${dateExpr}
      ORDER BY period ASC`,
      [startDate, endDate],
    );

    return rows.map((r: any) => ({
      period: String(r.period),
      rawCount: parseInt(r.rawCount, 10) || 0,
      count: parseInt(r.count),
      suspiciousCount: Math.max(
        (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
        0,
      ),
    }));
  }

  async getGeoDistribution(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<GeoBreakdown[]> {
    const rows = await this.applyVisitScope(
      this.repo
        .createQueryBuilder('vs')
        .select("COALESCE(vs.country, 'Unknown')", 'country')
        .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'count'),
      startDate,
      endDate,
      'vs',
      options,
    )
      .groupBy("COALESCE(vs.country, 'Unknown')")
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);

    return rows.map((r: any) => ({
      country: r.country,
      count: parseInt(r.count),
      percentage:
        total > 0 ? Math.round((parseInt(r.count) / total) * 10000) / 100 : 0,
    }));
  }

  async getDeviceDistribution(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<DeviceBreakdown[]> {
    const rows = await this.applyVisitScope(
      this.repo
        .createQueryBuilder('vs')
        .select('vs.deviceType', 'deviceType')
        .addSelect(`COUNT(DISTINCT ${this.visitKeySql})`, 'count'),
      startDate,
      endDate,
      'vs',
      options,
    )
      .groupBy('vs.deviceType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);

    return rows.map((r: any) => ({
      deviceType: r.deviceType,
      count: parseInt(r.count),
      percentage:
        total > 0 ? Math.round((parseInt(r.count) / total) * 10000) / 100 : 0,
    }));
  }

  async getCaptureDiagnosticsOverview(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<CaptureDiagnosticsOverview> {
    const row = await this.repo.query(
      `${this.buildCaptureVisitRollupCte('$1', '$2', options)}
      SELECT
        COUNT(*)::int AS "totalVisits",
        COUNT(*) FILTER (WHERE cv.consent_accepted)::int AS "consentAccepted",
        COUNT(*) FILTER (
          WHERE NOT cv.consent_accepted AND cv.consent_rejected
        )::int AS "consentRejected",
        COUNT(*) FILTER (
          WHERE NOT cv.consent_accepted AND NOT cv.consent_rejected
        )::int AS "consentPending",
        COUNT(*) FILTER (
          WHERE cv.consent_accepted
            AND cv.ga_tracking_enabled
            AND cv.ga_configured_target
        )::int AS "gaEligibleVisits",
        COUNT(*) FILTER (WHERE cv.ga_requested)::int AS "gaRequested",
        COUNT(*) FILTER (WHERE cv.ga_loaded)::int AS "gaLoaded",
        COUNT(*) FILTER (WHERE cv.ga_ready)::int AS "gaReady",
        COUNT(*) FILTER (WHERE cv.ga_first_pageview_sent)::int AS "gaFirstPageviewSent",
        COALESCE(SUM(cv.ga_event_count), 0)::int AS "gaEventCountTotal",
        COUNT(*) FILTER (WHERE cv.ga_blocked)::int AS "gaBlocked",
        COUNT(*) FILTER (WHERE cv.ga_failed)::int AS "gaFailed",
        COUNT(*) FILTER (
          WHERE cv.ga_disabled_status OR NOT cv.ga_tracking_enabled
        )::int AS "gaDisabled",
        COUNT(*) FILTER (WHERE cv.is_in_app_browser)::int AS "inAppBrowserVisits"
      FROM capture_visits cv`,
      [startDate, endDate],
    );

    const data = row[0] as Record<string, string | number> | undefined;
    const totalVisits = parseInt(String(data?.totalVisits ?? 0), 10) || 0;
    const consentAccepted =
      parseInt(String(data?.consentAccepted ?? 0), 10) || 0;
    const gaEligibleVisits =
      parseInt(String(data?.gaEligibleVisits ?? 0), 10) || 0;
    const gaReady = parseInt(String(data?.gaReady ?? 0), 10) || 0;
    const gaFirstPageviewSent =
      parseInt(String(data?.gaFirstPageviewSent ?? 0), 10) || 0;

    return {
      totalVisits,
      consentAccepted,
      consentRejected: parseInt(String(data?.consentRejected ?? 0), 10) || 0,
      consentPending: parseInt(String(data?.consentPending ?? 0), 10) || 0,
      gaEligibleVisits,
      gaRequested: parseInt(String(data?.gaRequested ?? 0), 10) || 0,
      gaLoaded: parseInt(String(data?.gaLoaded ?? 0), 10) || 0,
      gaReady,
      gaFirstPageviewSent,
      gaEventCountTotal:
        parseInt(String(data?.gaEventCountTotal ?? 0), 10) || 0,
      gaBlocked: parseInt(String(data?.gaBlocked ?? 0), 10) || 0,
      gaFailed: parseInt(String(data?.gaFailed ?? 0), 10) || 0,
      gaDisabled: parseInt(String(data?.gaDisabled ?? 0), 10) || 0,
      inAppBrowserVisits:
        parseInt(String(data?.inAppBrowserVisits ?? 0), 10) || 0,
      overallCaptureRate:
        totalVisits > 0
          ? Math.round((gaFirstPageviewSent / totalVisits) * 10000) / 100
          : 0,
      eligibleCaptureRate:
        gaEligibleVisits > 0
          ? Math.round((gaFirstPageviewSent / gaEligibleVisits) * 10000) / 100
          : 0,
    };
  }

  async getCaptureLossBreakdown(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<CaptureLossBreakdown[]> {
    const rows = await this.repo.query(
      `${this.buildCaptureVisitRollupCte('$1', '$2', options)}
      SELECT
        CASE
          WHEN cv.ga_first_pageview_sent THEN 'captured'
          WHEN NOT cv.consent_accepted AND cv.consent_rejected THEN 'consent_rejected'
          WHEN NOT cv.consent_accepted AND NOT cv.consent_rejected THEN 'consent_pending'
          WHEN cv.ga_blocked THEN 'ga_blocked'
          WHEN cv.ga_failed AND cv.ga_failed_reason IS NOT NULL
            THEN CONCAT('ga_failed:', cv.ga_failed_reason)
          WHEN cv.ga_failed THEN 'ga_failed'
          WHEN cv.ga_disabled_status OR NOT cv.ga_tracking_enabled THEN 'ga_disabled'
          WHEN cv.ga_ready THEN 'ready_but_no_pageview'
          WHEN cv.ga_loading THEN 'ga_loading'
          ELSE 'unclassified'
        END AS reason,
        COUNT(*)::int AS count
      FROM capture_visits cv
      GROUP BY 1
      ORDER BY count DESC`,
      [startDate, endDate],
    );

    const total = rows.reduce(
      (sum: number, row: { count: string | number }) =>
        sum + (parseInt(String(row.count), 10) || 0),
      0,
    );

    return rows.map((row: { reason: string; count: string | number }) => {
      const count = parseInt(String(row.count), 10) || 0;
      return {
        reason: row.reason,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      };
    });
  }

  async getReconciliationOverview(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<ReconciliationOverview> {
    const [referralClicks, row] = await Promise.all([
      this.referralClickRepo.count({
        where: {
          createdAt: Between(startDate, endDate),
        },
      }),
      this.repo.query(
        `SELECT
          COUNT(DISTINCT CASE
            WHEN rc.id IS NOT NULL THEN ${this.visitKeySql}
          END)::int AS "landingVisits",
          COUNT(DISTINCT ${this.visitKeySql})::int AS "firstPartyVisits",
          COUNT(DISTINCT CASE
            WHEN rc.id IS NOT NULL THEN rc.id
          END)::int AS "matchedReferralClicks",
          COUNT(DISTINCT CASE
            WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
            THEN ${this.visitKeySql}
          END)::int AS "gaCaptures"
        FROM visit_sessions vs
        LEFT JOIN referral_clicks rc
          ON rc.id = vs.ref_click_id
         AND rc."createdAt" BETWEEN $1 AND $2
        WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
          AND ${this.referredVisitPredicate}`,
        [startDate, endDate],
      ),
    ]);

    const data = row[0] as Record<string, string | number> | undefined;
    const landingVisits = parseInt(String(data?.landingVisits ?? 0), 10) || 0;
    const firstPartyVisits =
      parseInt(String(data?.firstPartyVisits ?? 0), 10) || 0;
    const matchedReferralClicks =
      parseInt(String(data?.matchedReferralClicks ?? 0), 10) || 0;
    const gaCaptures = parseInt(String(data?.gaCaptures ?? 0), 10) || 0;

    return {
      referralClicks,
      landingVisits,
      firstPartyVisits,
      unmatchedFirstPartyVisits: Math.max(firstPartyVisits - landingVisits, 0),
      gaCaptures,
      clickToLandingRate:
        referralClicks > 0
          ? Math.round((matchedReferralClicks / referralClicks) * 10000) / 100
          : 0,
      landingToFirstPartyRate:
        firstPartyVisits > 0
          ? Math.round((landingVisits / firstPartyVisits) * 10000) / 100
          : 0,
      gaCaptureRate:
        firstPartyVisits > 0
          ? Math.round((gaCaptures / firstPartyVisits) * 10000) / 100
          : 0,
    };
  }

  async getCaptureDiagnosticsBreakdown(
    startDate: Date,
    endDate: Date,
    dimension:
      | 'source'
      | 'campaign'
      | 'browser'
      | 'deviceType'
      | 'browserContext'
      | 'locale' = 'source',
    options?: AdminTrafficScopeOptions,
  ): Promise<CaptureDiagnosticsDimensionBreakdown[]> {
    const dimensionSql =
      this.reconciliationDimensionSql[dimension] ??
      this.reconciliationDimensionSql.source;

    const rows = await this.repo.query(
      `SELECT
        $3::text AS dimension,
        ${dimensionSql} AS value,
        COUNT(DISTINCT ${this.visitKeySql})::int AS "firstPartyVisits",
        COUNT(DISTINCT CASE
          WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
          THEN ${this.visitKeySql}
        END)::int AS "gaCaptures",
        COUNT(DISTINCT CASE
          WHEN vs.ga_status IN ('blocked', 'failed')
          THEN ${this.visitKeySql}
        END)::int AS "blockedOrFailed",
        COUNT(DISTINCT CASE
          WHEN vs.consent_status IS NULL OR vs.consent_status = 'pending'
          THEN ${this.visitKeySql}
        END)::int AS "pendingConsent",
        COUNT(DISTINCT CASE
          WHEN COALESCE(vs.is_in_app_browser, false) = true
          THEN ${this.visitKeySql}
        END)::int AS "inAppBrowserVisits"
      FROM visit_sessions vs
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
        AND ${this.referredVisitPredicate}
      GROUP BY value
      ORDER BY "firstPartyVisits" DESC, value ASC
      LIMIT 25`,
      [startDate, endDate, dimension],
    );

    return rows.map(
      (
        row: Record<string, string | number>,
      ): CaptureDiagnosticsDimensionBreakdown => {
        const firstPartyVisits =
          parseInt(String(row.firstPartyVisits ?? 0), 10) || 0;
        const gaCaptures = parseInt(String(row.gaCaptures ?? 0), 10) || 0;

        return {
          dimension: String(row.dimension ?? dimension),
          value: String(row.value ?? '(unknown)'),
          firstPartyVisits,
          gaCaptures,
          blockedOrFailed: parseInt(String(row.blockedOrFailed ?? 0), 10) || 0,
          pendingConsent: parseInt(String(row.pendingConsent ?? 0), 10) || 0,
          inAppBrowserVisits:
            parseInt(String(row.inAppBrowserVisits ?? 0), 10) || 0,
          captureRate:
            firstPartyVisits > 0
              ? Math.round((gaCaptures / firstPartyVisits) * 10000) / 100
              : 0,
        };
      },
    );
  }

  async getAttributionQualityOverview(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<AttributionQualityOverview> {
    const rows = await this.repo.query(
      `${this.buildDirectLabeledCte('$1', '$2', options)},
      direct_rollup AS (
        SELECT
          COUNT(DISTINCT visit_key) FILTER (
            WHERE reason = 'referral_share_unattributed'
          )::int AS "referralShareUnattributedVisits",
          COUNT(DISTINCT visit_key) FILTER (
            WHERE reason = 'webview_referrer_loss'
          )::int AS "webviewReferrerLossVisits",
          COUNT(DISTINCT visit_key) FILTER (
            WHERE reason = 'likely_automated_direct'
          )::int AS "likelyAutomatedDirectVisits",
          COUNT(DISTINCT visit_key) FILTER (
            WHERE reason = 'true_direct'
          )::int AS "trueDirectVisits",
          COUNT(DISTINCT visit_key) FILTER (
            WHERE reason = 'other_unattributed'
          )::int AS "otherUnattributedVisits"
        FROM direct_labeled
      )
      SELECT
        COUNT(DISTINCT ${this.visitKeySql})::int AS "totalVisits",
        COUNT(DISTINCT CASE
          WHEN ${this.explicitAttributionPredicate}
          THEN ${this.visitKeySql}
        END)::int AS "attributedVisits",
        COUNT(DISTINCT CASE
          WHEN vs.utm_source IS NOT NULL AND vs.utm_source <> ''
          THEN ${this.visitKeySql}
        END)::int AS "utmTaggedVisits",
        COUNT(DISTINCT CASE
          WHEN vs.referrer_domain IS NOT NULL AND vs.referrer_domain <> ''
          THEN ${this.visitKeySql}
        END)::int AS "referrerTaggedVisits",
        COUNT(DISTINCT CASE
          WHEN ${this.directVisitPredicate}
          THEN ${this.visitKeySql}
        END)::int AS "directVisits",
        dr."referralShareUnattributedVisits",
        dr."webviewReferrerLossVisits",
        dr."likelyAutomatedDirectVisits",
        dr."trueDirectVisits",
        dr."otherUnattributedVisits"
      FROM visit_sessions vs
      CROSS JOIN direct_rollup dr
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
      GROUP BY
        dr."referralShareUnattributedVisits",
        dr."webviewReferrerLossVisits",
        dr."likelyAutomatedDirectVisits",
        dr."trueDirectVisits",
        dr."otherUnattributedVisits"`,
      [startDate, endDate],
    );

    const data = rows[0] as Record<string, string | number> | undefined;
    const totalVisits = parseInt(String(data?.totalVisits ?? 0), 10) || 0;
    const attributedVisits =
      parseInt(String(data?.attributedVisits ?? 0), 10) || 0;
    const utmTaggedVisits =
      parseInt(String(data?.utmTaggedVisits ?? 0), 10) || 0;
    const referrerTaggedVisits =
      parseInt(String(data?.referrerTaggedVisits ?? 0), 10) || 0;
    const directVisits = parseInt(String(data?.directVisits ?? 0), 10) || 0;
    const referralShareUnattributedVisits =
      parseInt(String(data?.referralShareUnattributedVisits ?? 0), 10) || 0;
    const webviewReferrerLossVisits =
      parseInt(String(data?.webviewReferrerLossVisits ?? 0), 10) || 0;
    const likelyAutomatedDirectVisits =
      parseInt(String(data?.likelyAutomatedDirectVisits ?? 0), 10) || 0;
    const trueDirectVisits =
      parseInt(String(data?.trueDirectVisits ?? 0), 10) || 0;
    const otherUnattributedVisits =
      parseInt(String(data?.otherUnattributedVisits ?? 0), 10) || 0;

    const shareOfTotal = (value: number) =>
      totalVisits > 0 ? Math.round((value / totalVisits) * 10000) / 100 : 0;

    return {
      totalVisits,
      attributedVisits,
      attributedRate: shareOfTotal(attributedVisits),
      utmTaggedVisits,
      utmCoverageRate: shareOfTotal(utmTaggedVisits),
      referrerTaggedVisits,
      referrerCoverageRate: shareOfTotal(referrerTaggedVisits),
      directVisits,
      directRate: shareOfTotal(directVisits),
      referralShareUnattributedVisits,
      referralShareUnattributedRate: shareOfTotal(
        referralShareUnattributedVisits,
      ),
      webviewReferrerLossVisits,
      webviewReferrerLossRate: shareOfTotal(webviewReferrerLossVisits),
      likelyAutomatedDirectVisits,
      likelyAutomatedDirectRate: shareOfTotal(likelyAutomatedDirectVisits),
      trueDirectVisits,
      trueDirectRate: shareOfTotal(trueDirectVisits),
      otherUnattributedVisits,
      otherUnattributedRate: shareOfTotal(otherUnattributedVisits),
    };
  }

  async getDirectBreakdown(
    startDate: Date,
    endDate: Date,
    options?: AdminTrafficScopeOptions,
  ): Promise<DirectBreakdown[]> {
    const rows = await this.repo.query(
      `${this.buildDirectLabeledCte('$1', '$2', options)}
      SELECT
        reason,
        COUNT(*)::int AS "rawCount",
        COUNT(DISTINCT visit_key)::int AS count,
        COUNT(DISTINCT device_key)::int AS "uniqueVisitors"
      FROM direct_labeled
      GROUP BY reason
      ORDER BY count DESC, reason ASC`,
      [startDate, endDate],
    );

    const totalDirectVisits = rows.reduce(
      (sum: number, row: { count: string | number }) =>
        sum + (parseInt(String(row.count), 10) || 0),
      0,
    );

    const totalRows = await this.repo.query(
      `SELECT
        COUNT(DISTINCT ${this.visitKeySql})::int AS "totalVisits"
      FROM visit_sessions vs
      WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}`,
      [startDate, endDate],
    );
    const totalVisits =
      parseInt(String(totalRows[0]?.totalVisits ?? 0), 10) || 0;

    return rows.map((row: Record<string, string | number>) => {
      const count = parseInt(String(row.count ?? 0), 10) || 0;
      return {
        reason: String(row.reason ?? 'other_unattributed'),
        rawCount: parseInt(String(row.rawCount ?? 0), 10) || 0,
        count,
        uniqueVisitors: parseInt(String(row.uniqueVisitors ?? 0), 10) || 0,
        shareOfDirect:
          totalDirectVisits > 0
            ? Math.round((count / totalDirectVisits) * 10000) / 100
            : 0,
        shareOfTotal:
          totalVisits > 0 ? Math.round((count / totalVisits) * 10000) / 100 : 0,
      };
    });
  }

  async getSourceQualityDiagnostics(
    startDate: Date,
    endDate: Date,
    source: string,
    options?: AdminTrafficScopeOptions,
  ): Promise<SourceQualityDiagnostics> {
    const normalizedSource = source.trim().toLowerCase();
    const rows = await this.repo.query(
      `${this.buildEffectiveUsersCte('$1', '$2', options)}
      , scoped_raw AS (
        SELECT
          ${this.visitKeySql} AS visit_key,
          ${this.deviceKeySql} AS device_key,
          vs.user_id,
          COALESCE(NULLIF(vs.ip_address, ''), '(unknown)') AS ip_address,
          COALESCE(NULLIF(LOWER(vs.browser), ''), '(unknown)') AS browser,
          COALESCE(NULLIF(vs.landing_page, ''), '/') AS landing_page
        FROM visit_sessions vs
        WHERE ${this.buildVisitScopeWhere('$1', '$2', 'vs', options)}
          AND ${this.sourceSql} = $3
      ),
      scoped_visits AS (
        SELECT
          visit_key,
          MAX(device_key) AS device_key,
          (ARRAY_AGG(user_id) FILTER (WHERE user_id IS NOT NULL))[1] AS user_id,
          MAX(ip_address) AS ip_address,
          MAX(browser) AS browser,
          MAX(landing_page) AS landing_page
        FROM scoped_raw
        GROUP BY visit_key
      ),
      device_visit_counts AS (
        SELECT device_key, COUNT(*)::int AS visits
        FROM scoped_visits
        GROUP BY device_key
      ),
      product_views_by_device AS (
        SELECT
          pie."trustedVisitorId" AS device_key,
          COUNT(DISTINCT pie."productId")::int AS product_views
        FROM product_interaction_events pie
        JOIN (SELECT DISTINCT device_key FROM scoped_visits) devices
          ON devices.device_key = pie."trustedVisitorId"
        WHERE pie."createdAt" BETWEEN $1 AND $2
          AND pie."eventType" = 'view'
          AND pie."trustedVisitorId" IS NOT NULL
        GROUP BY pie."trustedVisitorId"
      ),
      landing_pages AS (
        SELECT
          landing_page AS "landingPage",
          COUNT(*)::int AS visits
        FROM scoped_visits
        GROUP BY landing_page
        ORDER BY visits DESC, landing_page ASC
        LIMIT 8
      ),
      browser_distribution AS (
        SELECT browser, COUNT(*)::int AS visits
        FROM scoped_visits
        GROUP BY browser
        ORDER BY visits DESC, browser ASC
        LIMIT 1
      ),
      summary AS (
        SELECT
          (SELECT COUNT(*)::int FROM scoped_raw) AS "rawCount",
          COUNT(*)::int AS visits,
          COUNT(DISTINCT sv.device_key)::int AS "uniqueVisitors",
          COUNT(DISTINCT sv.ip_address)::int AS "distinctIpAddresses",
          COUNT(DISTINCT sv.browser)::int AS "distinctBrowsers",
          (
            SELECT COUNT(DISTINCT sv_out.visit_key)::int
            FROM scoped_visits sv_out
            JOIN outbound_clicks oc
              ON sv_out.visit_key = COALESCE(oc.visit_id, oc."sessionId")
             AND oc."createdAt" BETWEEN $1 AND $2
          ) AS "outboundVisits",
          (
            SELECT COUNT(DISTINCT sv_eff.user_id)::int
            FROM scoped_visits sv_eff
            JOIN effective_users eu
              ON eu.user_id = sv_eff.user_id
          ) AS "effectiveUsers",
          COUNT(*) FILTER (WHERE dvc.visits = 1)::int AS "oneVisitDevices",
          COALESCE(MAX(dvc.visits), 0)::int AS "topDeviceVisits",
          COUNT(*) FILTER (WHERE sv.ip_address = '(unknown)')::int AS "unknownIpVisits",
          COALESCE((
            SELECT COUNT(*)::int
            FROM scoped_visits ip_scope
            WHERE ip_scope.ip_address <> '(unknown)'
            GROUP BY ip_scope.ip_address
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ), 0) AS "topIpVisits",
          COALESCE(AVG(COALESCE(pvd.product_views, 0)), 0)::float AS "avgProductViewsPerVisitor"
        FROM scoped_visits sv
        LEFT JOIN device_visit_counts dvc
          ON dvc.device_key = sv.device_key
        LEFT JOIN product_views_by_device pvd
          ON pvd.device_key = sv.device_key
      )
      SELECT
        summary.*,
        COALESCE(browser_distribution.browser, NULL) AS "topBrowser",
        COALESCE(browser_distribution.visits, 0)::int AS "topBrowserVisits",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'landingPage', lp."landingPage",
                'visits', lp.visits
              )
            )
            FROM landing_pages lp
          ),
          '[]'::json
        ) AS "landingPages"
      FROM summary
      LEFT JOIN browser_distribution ON true`,
      [startDate, endDate, normalizedSource],
    );

    const row = rows[0] as Record<string, unknown> | undefined;
    const visits = this.parseQueryNumber(row?.visits);
    const rawCount = this.parseQueryNumber(row?.rawCount);
    const uniqueVisitors = this.parseQueryNumber(row?.uniqueVisitors);
    const outboundVisits = this.parseQueryNumber(row?.outboundVisits);
    const effectiveUsers = this.parseQueryNumber(row?.effectiveUsers);
    const oneVisitDevices = this.parseQueryNumber(row?.oneVisitDevices);
    const topDeviceVisits = this.parseQueryNumber(row?.topDeviceVisits);
    const topIpVisits = this.parseQueryNumber(row?.topIpVisits);
    const topBrowserVisits = this.parseQueryNumber(row?.topBrowserVisits);
    const rawLandingPages = Array.isArray(row?.landingPages)
      ? (row.landingPages as Array<{ landingPage?: string; visits?: number }>)
      : [];

    return {
      source: normalizedSource,
      rawCount,
      visits,
      uniqueVisitors,
      repeatVisitRate: this.roundRate(Math.max(rawCount - visits, 0), rawCount),
      outboundVisits,
      outboundRate: this.roundRate(outboundVisits, visits),
      effectiveUsers,
      effectiveUserRate: this.roundRate(effectiveUsers, visits),
      avgProductViewsPerVisitor:
        Math.round(
          this.parseQueryNumber(row?.avgProductViewsPerVisitor) * 100,
        ) / 100,
      oneVisitDeviceRate: this.roundRate(oneVisitDevices, uniqueVisitors),
      concentration: {
        distinctDevices: uniqueVisitors,
        distinctIpAddresses: this.parseQueryNumber(row?.distinctIpAddresses),
        distinctBrowsers: this.parseQueryNumber(row?.distinctBrowsers),
        topDeviceShare: this.roundRate(topDeviceVisits, visits),
        topIpShare: this.roundRate(topIpVisits, visits),
        topBrowser: typeof row?.topBrowser === 'string' ? row.topBrowser : null,
        topBrowserShare: this.roundRate(topBrowserVisits, visits),
      },
      landingPages: rawLandingPages.map((item) => {
        const itemVisits = parseInt(String(item.visits ?? 0), 10) || 0;
        return {
          landingPage: item.landingPage || '/',
          visits: itemVisits,
          share: this.roundRate(itemVisits, visits),
        };
      }),
    };
  }

  /**
   * 定时清理: 每月1号凌晨3点
   * - 删除超过 12 个月的原始记录
   * - 清除超过 30 天的 IP 地址
   */
  @Cron('0 3 1 * *')
  async cleanupOldData(): Promise<void> {
    this.logger.log('Starting visit_sessions cleanup...');

    const deleted = await this.repo
      .createQueryBuilder()
      .delete()
      .where("created_at < NOW() - INTERVAL '12 months'")
      .execute();

    await this.repo.query(
      `UPDATE visit_sessions SET ip_address = NULL
       WHERE ip_address IS NOT NULL
       AND created_at < NOW() - INTERVAL '30 days'`,
    );

    this.logger.log(
      `Cleanup done: ${deleted.affected} records deleted, IPs cleared`,
    );
  }

  private extractDomain(referrer: string | undefined): string | null {
    if (!referrer) return null;
    try {
      const url = new URL(referrer);
      return url.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }
}
