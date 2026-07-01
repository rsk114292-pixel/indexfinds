import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReferralAttribution,
  AttributionEventType,
  AttributionStatus,
} from './entities/referral-attribution.entity';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralClick } from './entities/referral-click.entity';
import { PointsService } from '../points/points.service';
import type {
  ReferralAlertCandidate,
  ReferralClickMetrics,
} from './referral.service';

type ReferralRiskLevel = 'low' | 'medium' | 'high';

interface ReferrerLeaderboardRow {
  id: string;
  code: string;
  ownerId: string;
  clicks: number;
  rawClicks: number;
  conversions: number;
}

interface ReferrerDiagnosticsRow {
  referralCodeId: string;
  rawClicks: number;
  trustedClicks: number;
  uniqueSessions: number;
  uniqueIps: number;
  suspiciousClicks: number;
  emptyRefererClicks: number;
}

interface ReferrerVisitRow {
  rawLandingVisits: number;
  referralCodeId: string;
  landingVisits: number;
  strictLandingVisits: number;
  strictMatchedClicks: number;
  carryoverLandingVisits: number;
  firstPartyVisits: number;
  gaCaptures: number;
  consentAccepted: number;
  consentRejected: number;
  consentPending: number;
}

interface ReferrerRegistrationRow {
  referralCodeId: string;
  registrations: number;
  verifiedRegistrations: number;
}

interface ReferralProgressRow {
  userId: string;
  referralCodeId: string;
  count: string;
}

@Injectable()
export class ReferralAnalyticsService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly codeRepo: Repository<ReferralCode>,
    @InjectRepository(ReferralClick)
    private readonly clickRepo: Repository<ReferralClick>,
    @InjectRepository(ReferralAttribution)
    private readonly attrRepo: Repository<ReferralAttribution>,
    private readonly pointsService: PointsService,
  ) {}

  private getTrustedClickFingerprintSql(alias: string): string {
    return `CONCAT_WS('|',
      ${alias}."referralCodeId"::text,
      COALESCE(NULLIF(${alias}."sessionId", ''), NULLIF(${alias}.ip, ''), ${alias}."referralCodeId"::text),
      COALESCE(NULLIF(${alias}."landingPage", ''), NULLIF(${alias}."redirectTo", ''), '/'),
      FLOOR(EXTRACT(EPOCH FROM ${alias}."createdAt") / 1800)::bigint
    )`;
  }

  async getReferralFunnelOverview(startDate: Date, endDate: Date) {
    const [registrations, trustedClicksRow] = await Promise.all([
      this.attrRepo
        .createQueryBuilder('attr')
        .leftJoin('attr.user', 'user')
        .where('attr.eventType = :eventType', {
          eventType: AttributionEventType.REGISTRATION,
        })
        .andWhere('attr.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .select([
          'attr.id AS id',
          'attr.userId AS "userId"',
          'attr.referralCodeId AS "referralCodeId"',
          'attr.status AS status',
          'attr.createdAt AS "createdAt"',
          'user.emailVerified AS "emailVerified"',
        ])
        .getRawMany<{
          id: string;
          userId: string | null;
          referralCodeId: string;
          status: AttributionStatus;
          createdAt: Date;
          emailVerified: boolean | null;
        }>(),
      this.clickRepo
        .createQueryBuilder('click')
        .select(
          `COUNT(DISTINCT ${this.getTrustedClickFingerprintSql('click')})`,
          'count',
        )
        .where('click.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .getRawOne<{ count: string }>(),
    ]);
    const clicks = parseInt(trustedClicksRow?.count ?? '0', 10) || 0;
    const registrationsCount = registrations.length;
    const sameWindowRegistrationRate =
      clicks > 0 ? registrationsCount / clicks : 0;

    if (registrations.length === 0) {
      return {
        steps: {
          clicks,
          registrations: 0,
          activatedConversions: 0,
          emailVerified: 0,
          productViewsReady: 0,
          actionReady: 0,
          validConversions: 0,
        },
        trafficQuality: {
          trustedClicks: clicks,
          registrationsInWindow: 0,
          sameWindowRegistrationRate,
          metricType: 'date_window_snapshot',
        },
        conversionCohort: {
          registrations: 0,
          emailVerified: 0,
          productViewsReady: 0,
          actionReady: 0,
          activatedConversions: 0,
          validConversions: 0,
          activationRate: 0,
          settlementRate: 0,
          metricType: 'registration_cohort',
        },
        blockers: {
          emailVerification: 0,
          productViews: 0,
          favoriteOrPurchase: 0,
          riskReview: 0,
        },
        layers: {
          registration: {
            eligible: clicks,
            converted: 0,
            conversionRate: 0,
            blockers: {
              notRegistered: clicks,
            },
          },
          activation: {
            eligible: 0,
            converted: 0,
            conversionRate: 0,
            blockers: {
              emailVerification: 0,
              productViews: 0,
            },
          },
          rewardSettlement: {
            eligible: 0,
            converted: 0,
            conversionRate: 0,
            blockers: {
              favoriteOrPurchase: 0,
              riskReview: 0,
            },
          },
        },
      };
    }

    const userIds = registrations
      .map((item) => item.userId)
      .filter((value): value is string => !!value);
    const codeIds = [
      ...new Set(registrations.map((item) => item.referralCodeId)),
    ];

    const productViewRows = userIds.length
      ? await this.attrRepo
          .createQueryBuilder('attr')
          .select('attr.userId', 'userId')
          .addSelect('attr.referralCodeId', 'referralCodeId')
          .addSelect(
            'COUNT(DISTINCT attr."eventData"->>\'productId\')',
            'count',
          )
          .where('attr.userId IN (:...userIds)', { userIds })
          .andWhere('attr.referralCodeId IN (:...codeIds)', { codeIds })
          .andWhere('attr.eventType = :eventType', {
            eventType: AttributionEventType.PRODUCT_VIEW,
          })
          .groupBy('attr.userId')
          .addGroupBy('attr.referralCodeId')
          .getRawMany<ReferralProgressRow>()
      : [];

    const actionRows = userIds.length
      ? await this.attrRepo
          .createQueryBuilder('attr')
          .select('attr.userId', 'userId')
          .addSelect('attr.referralCodeId', 'referralCodeId')
          .addSelect('COUNT(*)', 'count')
          .where('attr.userId IN (:...userIds)', { userIds })
          .andWhere('attr.referralCodeId IN (:...codeIds)', { codeIds })
          .andWhere('attr.eventType IN (:...types)', {
            types: [
              AttributionEventType.FAVORITE,
              AttributionEventType.PURCHASE_CLICK,
            ],
          })
          .groupBy('attr.userId')
          .addGroupBy('attr.referralCodeId')
          .getRawMany<ReferralProgressRow>()
      : [];

    const productViewMap = new Map(
      productViewRows.map((row) => [
        `${row.userId}:${row.referralCodeId}`,
        parseInt(row.count, 10) || 0,
      ]),
    );
    const actionMap = new Map(
      actionRows.map((row) => [
        `${row.userId}:${row.referralCodeId}`,
        parseInt(row.count, 10) || 0,
      ]),
    );

    let emailVerified = 0;
    let productViewsReady = 0;
    let actionReady = 0;
    let activatedConversions = 0;
    let validConversions = 0;
    const blockers = {
      emailVerification: 0,
      productViews: 0,
      favoriteOrPurchase: 0,
      riskReview: 0,
    };

    for (const registration of registrations) {
      const progressKey = registration.userId
        ? `${registration.userId}:${registration.referralCodeId}`
        : null;
      const isVerified = !!registration.emailVerified;
      const viewCount = progressKey
        ? (productViewMap.get(progressKey) ?? 0)
        : 0;
      const hasAction = progressKey
        ? (actionMap.get(progressKey) ?? 0) > 0
        : false;
      const isActivated = isVerified && viewCount >= 3;

      if (isVerified) emailVerified += 1;
      if (viewCount >= 3) productViewsReady += 1;
      if (hasAction) actionReady += 1;
      if (isActivated) activatedConversions += 1;
      if (registration.status === AttributionStatus.VALID) {
        validConversions += 1;
        continue;
      }

      if (!isVerified) {
        blockers.emailVerification += 1;
      } else if (viewCount < 3) {
        blockers.productViews += 1;
      } else if (!hasAction) {
        blockers.favoriteOrPurchase += 1;
      } else {
        blockers.riskReview += 1;
      }
    }

    return {
      steps: {
        clicks,
        registrations: registrationsCount,
        activatedConversions,
        emailVerified,
        productViewsReady,
        actionReady,
        validConversions,
      },
      trafficQuality: {
        trustedClicks: clicks,
        registrationsInWindow: registrationsCount,
        sameWindowRegistrationRate,
        metricType: 'date_window_snapshot',
      },
      conversionCohort: {
        registrations: registrationsCount,
        emailVerified,
        productViewsReady,
        actionReady,
        activatedConversions,
        validConversions,
        activationRate:
          registrationsCount > 0
            ? activatedConversions / registrationsCount
            : 0,
        settlementRate:
          activatedConversions > 0
            ? validConversions / activatedConversions
            : 0,
        metricType: 'registration_cohort',
      },
      blockers,
      layers: {
        registration: {
          eligible: clicks,
          converted: registrationsCount,
          conversionRate: sameWindowRegistrationRate,
          blockers: {
            notRegistered: Math.max(clicks - registrationsCount, 0),
          },
        },
        activation: {
          eligible: registrationsCount,
          converted: activatedConversions,
          conversionRate:
            registrationsCount > 0
              ? activatedConversions / registrationsCount
              : 0,
          blockers: {
            emailVerification: blockers.emailVerification,
            productViews: blockers.productViews,
          },
        },
        rewardSettlement: {
          eligible: activatedConversions,
          converted: validConversions,
          conversionRate:
            activatedConversions > 0
              ? validConversions / activatedConversions
              : 0,
          blockers: {
            favoriteOrPurchase: blockers.favoriteOrPurchase,
            riskReview: blockers.riskReview,
          },
        },
      },
    };
  }

  async getReferralOverview() {
    const totalCodes = await this.codeRepo.count();
    const trustedClicksRow = await this.clickRepo
      .createQueryBuilder('click')
      .select(
        `COUNT(DISTINCT ${this.getTrustedClickFingerprintSql('click')})`,
        'trustedClicks',
      )
      .getRawOne<{ trustedClicks: string }>();
    const totalClicks = parseInt(trustedClicksRow?.trustedClicks ?? '0', 10);
    const rawClicks = await this.clickRepo.count();
    const totalConversions = await this.attrRepo.count({
      where: { status: AttributionStatus.VALID },
    });

    return { totalCodes, totalClicks, rawClicks, totalConversions };
  }

  async getTopReferrers(limit = 10, startDate?: Date, endDate?: Date) {
    const clickAggregationSql = `
      SELECT
        c."referralCodeId" AS "referralCodeId",
        COUNT(*)::int AS "rawClicks",
        COUNT(DISTINCT ${this.getTrustedClickFingerprintSql('c')})::int AS "trustedClicks"
      FROM referral_clicks c
      %CLICK_WHERE%
      GROUP BY c."referralCodeId"
    `;
    let leaderboard: ReferrerLeaderboardRow[];

    if (startDate && endDate) {
      leaderboard = await this.codeRepo.query(
        `SELECT
          rc.id AS id,
          rc.code AS code,
          rc."ownerId" AS "ownerId",
          COALESCE(clicks."trustedClicks", 0)::int AS clicks,
          COALESCE(clicks."rawClicks", 0)::int AS "rawClicks",
          COALESCE(conversions.count, 0)::int AS conversions
        FROM referral_codes rc
        LEFT JOIN (
          ${clickAggregationSql.replace(
            '%CLICK_WHERE%',
            'WHERE c."createdAt" BETWEEN $1 AND $2',
          )}
        ) clicks ON clicks."referralCodeId" = rc.id
        LEFT JOIN (
          SELECT
            a."referralCodeId" AS "referralCodeId",
            COUNT(*) AS count
          FROM referral_attributions a
          WHERE a."createdAt" BETWEEN $1 AND $2
            AND a.status = $4
          GROUP BY a."referralCodeId"
        ) conversions ON conversions."referralCodeId" = rc.id
        WHERE rc."isActive" = true
          AND (
            COALESCE(clicks."trustedClicks", 0) > 0
            OR COALESCE(conversions.count, 0) > 0
          )
        ORDER BY conversions DESC, clicks DESC, rc.code ASC
        LIMIT $3`,
        [startDate, endDate, limit, AttributionStatus.VALID],
      );
    } else {
      leaderboard = await this.codeRepo.query(
        `SELECT
          rc.id AS id,
          rc.code AS code,
          rc."ownerId" AS "ownerId",
          COALESCE(clicks."trustedClicks", 0)::int AS clicks,
          COALESCE(clicks."rawClicks", 0)::int AS "rawClicks",
          COALESCE(conversions.count, 0)::int AS conversions
        FROM referral_codes rc
        LEFT JOIN (
          ${clickAggregationSql.replace('%CLICK_WHERE%', '')}
        ) clicks ON clicks."referralCodeId" = rc.id
        LEFT JOIN (
          SELECT
            a."referralCodeId" AS "referralCodeId",
            COUNT(*) AS count
          FROM referral_attributions a
          WHERE a.status = $2
          GROUP BY a."referralCodeId"
        ) conversions ON conversions."referralCodeId" = rc.id
        WHERE rc."isActive" = true
          AND (
            COALESCE(clicks."trustedClicks", 0) > 0
            OR COALESCE(conversions.count, 0) > 0
          )
        ORDER BY conversions DESC, clicks DESC, rc.code ASC
        LIMIT $1`,
        [limit, AttributionStatus.VALID],
      );
    }

    if (leaderboard.length === 0) {
      return [];
    }

    return this.hydrateTopReferrerDiagnostics(leaderboard, startDate, endDate);
  }

  async getClicksByDate(startDate: Date, endDate: Date) {
    return this.clickRepo
      .createQueryBuilder('rc')
      .select('DATE(rc.createdAt)', 'date')
      .addSelect(
        `COUNT(DISTINCT ${this.getTrustedClickFingerprintSql('rc')})`,
        'count',
      )
      .addSelect('COUNT(*)', 'rawCount')
      .where('rc.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('DATE(rc.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getReferralDetails(userId: string, page = 1, limit = 20) {
    const referralCode = await this.codeRepo.findOne({
      where: { ownerId: userId, ownerType: 'user' },
    });

    if (!referralCode) {
      return {
        stats: {
          totalClicks: 0,
          trustedClicks: 0,
          rawClicks: 0,
          totalRegistrations: 0,
          totalConversions: 0,
          totalEarnings: 0,
        },
        items: [],
        total: 0,
      };
    }
    const clickMetrics = await this.getCodeClickMetrics(referralCode.id);

    const [totalRegistrations, totalEarnings, [attributions, total]] =
      await Promise.all([
        this.attrRepo.count({
          where: {
            referralCodeId: referralCode.id,
            eventType: AttributionEventType.REGISTRATION,
          },
        }),
        this.pointsService.getTotalEarningsByActions(userId, [
          'referral_conversion',
          'referral_milestone',
        ]),
        this.attrRepo
          .createQueryBuilder('attr')
          .leftJoinAndSelect('attr.user', 'user')
          .where('attr.referralCodeId = :codeId', { codeId: referralCode.id })
          .andWhere('attr.eventType = :eventType', {
            eventType: AttributionEventType.REGISTRATION,
          })
          .orderBy('attr.createdAt', 'DESC')
          .skip((page - 1) * limit)
          .take(limit)
          .getManyAndCount(),
      ]);

    const items = await Promise.all(
      attributions.map(async (attr) => {
        const converted = attr.status === AttributionStatus.VALID;
        let progress: {
          emailVerified: boolean;
          productViews: number;
          hasFavoriteOrPurchase: boolean;
        } | null = null;

        if (!converted && attr.userId) {
          const [productViewsResult, actionCount] = await Promise.all([
            this.attrRepo
              .createQueryBuilder('a')
              .select('COUNT(DISTINCT a."eventData"->>\'productId\')', 'count')
              .where('a.userId = :userId', { userId: attr.userId })
              .andWhere('a.referralCodeId = :codeId', {
                codeId: referralCode.id,
              })
              .andWhere('a.eventType = :type', {
                type: AttributionEventType.PRODUCT_VIEW,
              })
              .getRawOne(),
            this.attrRepo
              .createQueryBuilder('a')
              .where('a.userId = :userId', { userId: attr.userId })
              .andWhere('a.referralCodeId = :codeId', {
                codeId: referralCode.id,
              })
              .andWhere('a.eventType IN (:...types)', {
                types: [
                  AttributionEventType.FAVORITE,
                  AttributionEventType.PURCHASE_CLICK,
                ],
              })
              .getCount(),
          ]);

          progress = {
            emailVerified: attr.user?.emailVerified ?? false,
            productViews: parseInt(productViewsResult?.count ?? '0', 10),
            hasFavoriteOrPurchase: actionCount > 0,
          };
        }

        return {
          maskedName: this.maskName(attr.user?.username),
          status: converted ? 'converted' : 'registered',
          createdAt: attr.createdAt,
          progress,
        };
      }),
    );

    return {
      stats: {
        totalClicks: clickMetrics.trustedClicks,
        trustedClicks: clickMetrics.trustedClicks,
        rawClicks: clickMetrics.rawClicks,
        totalRegistrations,
        totalConversions: referralCode.totalConversions,
        totalEarnings,
      },
      items,
      total,
    };
  }

  async getCodeClickMetrics(codeId: string): Promise<ReferralClickMetrics> {
    const [row] = await this.getClickDiagnosticsByCode([codeId]);
    return {
      rawClicks: row?.rawClicks ?? 0,
      trustedClicks: row?.trustedClicks ?? 0,
      uniqueSessions: row?.uniqueSessions ?? 0,
      uniqueIps: row?.uniqueIps ?? 0,
      suspiciousClicks: row?.suspiciousClicks ?? 0,
      emptyRefererClicks: row?.emptyRefererClicks ?? 0,
    };
  }

  async getReferralAlerts(
    startDate: Date,
    endDate: Date,
    limit = 10,
  ): Promise<ReferralAlertCandidate[]> {
    const leaderboard = await this.codeRepo.query(
      `SELECT
        rc.id AS id,
        rc.code AS code,
        rc."ownerId" AS "ownerId",
        COALESCE(clicks."trustedClicks", 0)::int AS clicks,
        COALESCE(clicks."rawClicks", 0)::int AS "rawClicks",
        COALESCE(conversions.count, 0)::int AS conversions
      FROM referral_codes rc
      LEFT JOIN (
        SELECT
          c."referralCodeId" AS "referralCodeId",
          COUNT(*)::int AS "rawClicks",
          COUNT(DISTINCT ${this.getTrustedClickFingerprintSql('c')})::int AS "trustedClicks"
        FROM referral_clicks c
        WHERE c."createdAt" BETWEEN $1 AND $2
        GROUP BY c."referralCodeId"
      ) clicks ON clicks."referralCodeId" = rc.id
      LEFT JOIN (
        SELECT
          a."referralCodeId" AS "referralCodeId",
          COUNT(*) AS count
        FROM referral_attributions a
        WHERE a."createdAt" BETWEEN $1 AND $2
          AND a.status = $4
        GROUP BY a."referralCodeId"
      ) conversions ON conversions."referralCodeId" = rc.id
      WHERE rc."isActive" = true
        AND COALESCE(clicks."rawClicks", 0) > 0
      ORDER BY "rawClicks" DESC, clicks DESC
      LIMIT $3`,
      [startDate, endDate, limit, AttributionStatus.VALID],
    );

    if (!leaderboard.length) {
      return [];
    }

    const diagnostics = await this.hydrateTopReferrerDiagnostics(
      leaderboard,
      startDate,
      endDate,
    );

    return diagnostics
      .map((row) => {
        const duplicateGap = Math.max((row.rawClicks || 0) - row.clicks, 0);
        const duplicateRate =
          row.rawClicks > 0 ? duplicateGap / row.rawClicks : 0;
        const severity: 'medium' | 'high' =
          row.riskLevel === 'high' || duplicateRate >= 0.55 ? 'high' : 'medium';

        const shouldAlert =
          row.riskLevel === 'high' ||
          (row.rawClicks >= 30 && duplicateRate >= 0.4) ||
          (row.clicks >= 20 && row.clickToLandingRate < 0.2);

        if (!shouldAlert) {
          return null;
        }

        const reasons = [...row.riskReasons];
        if (duplicateRate >= 0.4) {
          reasons.unshift(
            `raw/trusted 差值 ${(duplicateRate * 100).toFixed(0)}%`,
          );
        }

        return {
          type: 'referral' as const,
          severity,
          code: row.code,
          ownerId: row.ownerId,
          title: `推荐码 ${row.code} 出现异常流量`,
          description:
            `可信点击 ${row.clicks}，归因落地 ${row.landingVisits}，严格落地 ${row.strictLandingVisits}，` +
            `严格可回溯点击率 ${(row.clickToLandingRate * 100).toFixed(1)}%。`,
          metrics: {
            trustedClicks: row.clicks,
            rawClicks: row.rawClicks,
            rawLandingVisits: row.rawLandingVisits,
            landingVisits: row.landingVisits,
            strictLandingVisits: row.strictLandingVisits,
            strictMatchedClicks: row.strictMatchedClicks,
            carryoverLandingVisits: row.carryoverLandingVisits,
            registrations: row.registrations,
            suspiciousClicks: row.suspiciousClicks,
            clickToLandingRate: row.clickToLandingRate,
          },
          reasons,
        };
      })
      .filter((alert): alert is ReferralAlertCandidate => !!alert)
      .sort((left, right) => {
        if (left.severity !== right.severity) {
          return left.severity === 'high' ? -1 : 1;
        }
        return right.metrics.rawClicks - left.metrics.rawClicks;
      })
      .slice(0, limit);
  }

  private maskName(name?: string | null): string {
    if (!name || name.length <= 2) {
      return 'U***r';
    }
    return name[0] + '***' + name[name.length - 1];
  }

  private async hydrateTopReferrerDiagnostics(
    leaderboard: ReferrerLeaderboardRow[],
    startDate?: Date,
    endDate?: Date,
  ) {
    const codeIds = leaderboard.map((row) => row.id);
    const diagnostics = await Promise.all([
      this.getClickDiagnosticsByCode(codeIds, startDate, endDate),
      this.getVisitDiagnosticsByCode(codeIds, startDate, endDate),
      this.getRegistrationDiagnosticsByCode(codeIds, startDate, endDate),
    ]);

    const clickDiagnosticsMap = new Map(
      diagnostics[0].map((row) => [row.referralCodeId, row]),
    );
    const visitDiagnosticsMap = new Map(
      diagnostics[1].map((row) => [row.referralCodeId, row]),
    );
    const registrationDiagnosticsMap = new Map(
      diagnostics[2].map((row) => [row.referralCodeId, row]),
    );

    return leaderboard.map(({ id, ...row }) => {
      const clicks = Number(row.clicks) || 0;
      const rawClicks = Number(row.rawClicks) || clicks;
      const conversions = Number(row.conversions) || 0;
      const clickDiagnostics = clickDiagnosticsMap.get(id);
      const visitDiagnostics = visitDiagnosticsMap.get(id);
      const registrationDiagnostics = registrationDiagnosticsMap.get(id);
      const rawLandingVisits = visitDiagnostics?.rawLandingVisits ?? 0;
      const landingVisits = visitDiagnostics?.landingVisits ?? 0;
      const strictLandingVisits = visitDiagnostics?.strictLandingVisits ?? 0;
      const strictMatchedClicks = visitDiagnostics?.strictMatchedClicks ?? 0;
      const carryoverLandingVisits =
        visitDiagnostics?.carryoverLandingVisits ??
        Math.max(landingVisits - strictLandingVisits, 0);
      const firstPartyVisits = visitDiagnostics?.firstPartyVisits ?? 0;
      const uniqueSessions = clickDiagnostics?.uniqueSessions ?? 0;
      const uniqueIps = clickDiagnostics?.uniqueIps ?? 0;
      const suspiciousClicks = clickDiagnostics?.suspiciousClicks ?? 0;
      const emptyRefererClicks = clickDiagnostics?.emptyRefererClicks ?? 0;
      const registrations = registrationDiagnostics?.registrations ?? 0;
      const verifiedRegistrations =
        registrationDiagnostics?.verifiedRegistrations ?? 0;
      const consentAccepted = visitDiagnostics?.consentAccepted ?? 0;
      const consentRejected = visitDiagnostics?.consentRejected ?? 0;
      const consentPending = visitDiagnostics?.consentPending ?? 0;
      const suspiciousClickRate =
        rawClicks > 0 ? suspiciousClicks / rawClicks : 0;
      const emptyRefererRate =
        rawClicks > 0 ? emptyRefererClicks / rawClicks : 0;
      const clickToLandingRate = clicks > 0 ? strictMatchedClicks / clicks : 0;
      const landingToRegistrationRate =
        strictLandingVisits > 0 ? registrations / strictLandingVisits : 0;
      const consentDecisionRate =
        firstPartyVisits > 0
          ? (consentAccepted + consentRejected) / firstPartyVisits
          : 0;
      const gaCaptureRate =
        firstPartyVisits > 0
          ? (visitDiagnostics?.gaCaptures ?? 0) / firstPartyVisits
          : 0;
      const clickPerSession =
        uniqueSessions > 0 ? clicks / uniqueSessions : clicks;
      const riskReasons: string[] = [];

      if (suspiciousClicks > 0) {
        riskReasons.push(`脚本 UA ${suspiciousClicks} 次`);
      }
      if (clicks >= 100 && clickToLandingRate < 0.1) {
        riskReasons.push('点击到落地率过低');
      }
      if (clicks >= 50 && registrations === 0) {
        riskReasons.push('高点击但无注册');
      }
      if (clicks >= 20 && verifiedRegistrations === 0 && registrations > 0) {
        riskReasons.push('注册后无人验证邮箱');
      }
      if (clicks >= 50 && emptyRefererRate > 0.9) {
        riskReasons.push('Referer 几乎全空');
      }
      if (clicks >= 20 && clickPerSession >= 1.4) {
        riskReasons.push('单会话重复点击偏高');
      }

      let riskLevel: ReferralRiskLevel = 'low';
      if (
        suspiciousClicks > 0 ||
        (clicks >= 100 && clickToLandingRate < 0.1) ||
        (clicks >= 100 && registrations === 0) ||
        (clicks >= 50 && verifiedRegistrations === 0 && registrations > 0)
      ) {
        riskLevel = 'high';
      } else if (
        (clicks >= 30 && clickToLandingRate < 0.2) ||
        suspiciousClickRate >= 0.05 ||
        clickPerSession >= 1.25
      ) {
        riskLevel = 'medium';
      }

      return {
        ...row,
        clicks,
        rawClicks,
        conversions,
        uniqueSessions,
        uniqueBrowserIds: uniqueSessions,
        uniqueIps,
        rawLandingVisits,
        landingVisits,
        strictLandingVisits,
        strictMatchedClicks,
        carryoverLandingVisits,
        firstPartyVisits,
        gaCaptures: visitDiagnostics?.gaCaptures ?? 0,
        consentAccepted,
        consentRejected,
        consentPending,
        consentDecisionRate,
        gaCaptureRate,
        registrations,
        verifiedRegistrations,
        suspiciousClicks,
        emptyRefererClicks,
        suspiciousClickRate,
        clickToLandingRate,
        landingToRegistrationRate,
        riskLevel,
        riskReasons,
      };
    });
  }

  private async getClickDiagnosticsByCode(
    codeIds: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReferrerDiagnosticsRow[]> {
    const params: Array<Date | string[]> = [codeIds];
    const filters = ['c."referralCodeId" = ANY($1::uuid[])'];

    if (startDate && endDate) {
      params.unshift(startDate, endDate);
      filters[0] = 'c."createdAt" BETWEEN $1 AND $2';
      filters.push(`c."referralCodeId" = ANY($3::uuid[])`);
    }

    const rows = await this.codeRepo.query(
      `SELECT
        c."referralCodeId" AS "referralCodeId",
        COUNT(*)::int AS "rawClicks",
        COUNT(DISTINCT ${this.getTrustedClickFingerprintSql('c')})::int AS "trustedClicks",
        COUNT(DISTINCT c."sessionId")::int AS "uniqueSessions",
        COUNT(DISTINCT c.ip)::int AS "uniqueIps",
        COUNT(*) FILTER (
          WHERE LOWER(COALESCE(c."userAgent", '')) LIKE '%python%'
             OR LOWER(COALESCE(c."userAgent", '')) LIKE '%curl%'
             OR LOWER(COALESCE(c."userAgent", '')) LIKE '%wget%'
             OR LOWER(COALESCE(c."userAgent", '')) LIKE '%headless%'
             OR LOWER(COALESCE(c."userAgent", '')) LIKE '%bot%'
        )::int AS "suspiciousClicks",
        COUNT(*) FILTER (
          WHERE c.referer IS NULL OR c.referer = ''
        )::int AS "emptyRefererClicks"
      FROM referral_clicks c
      WHERE ${filters.join(' AND ')}
      GROUP BY c."referralCodeId"`,
      params,
    );

    return rows.map((row: ReferrerDiagnosticsRow) => ({
      referralCodeId: row.referralCodeId,
      rawClicks: Number(row.rawClicks) || 0,
      trustedClicks: Number(row.trustedClicks) || 0,
      uniqueSessions: Number(row.uniqueSessions) || 0,
      uniqueIps: Number(row.uniqueIps) || 0,
      suspiciousClicks: Number(row.suspiciousClicks) || 0,
      emptyRefererClicks: Number(row.emptyRefererClicks) || 0,
    }));
  }

  private async getVisitDiagnosticsByCode(
    codeIds: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReferrerVisitRow[]> {
    const params: Array<Date | string[]> = [codeIds];
    const visitFilters = ['rc.id = ANY($1::uuid[])'];
    let clickRangeClause = '';

    if (startDate && endDate) {
      params.unshift(startDate, endDate);
      visitFilters[0] = 'vs.created_at BETWEEN $1 AND $2';
      visitFilters.push('rc.id = ANY($3::uuid[])');
      clickRangeClause = 'AND c."createdAt" BETWEEN $1 AND $2';
    }

    const rows = await this.codeRepo.query(
      `SELECT
        rc.id AS "referralCodeId",
        COUNT(DISTINCT vs.id)::int AS "rawLandingVisits",
        COUNT(
          DISTINCT COALESCE(
            NULLIF(vs.visit_id, ''),
            NULLIF(vs.device_id, ''),
            vs.session_id
          )
        )::int AS "landingVisits",
        COUNT(
          DISTINCT CASE
            WHEN c.id IS NOT NULL
            THEN COALESCE(
              NULLIF(vs.visit_id, ''),
              NULLIF(vs.device_id, ''),
              vs.session_id
            )
          END
        )::int AS "strictLandingVisits",
        COUNT(
          DISTINCT CASE
            WHEN c.id IS NOT NULL
            THEN ${this.getTrustedClickFingerprintSql('c')}
          END
        )::int AS "strictMatchedClicks",
        COUNT(
          DISTINCT CASE
            WHEN c.id IS NULL
            THEN COALESCE(
              NULLIF(vs.visit_id, ''),
              NULLIF(vs.device_id, ''),
              vs.session_id
            )
          END
        )::int AS "carryoverLandingVisits",
        COUNT(
          DISTINCT COALESCE(
            NULLIF(vs.visit_id, ''),
            NULLIF(vs.device_id, ''),
            vs.session_id
          )
        )::int AS "firstPartyVisits",
        COUNT(
          DISTINCT CASE
            WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
            THEN COALESCE(
              NULLIF(vs.visit_id, ''),
              NULLIF(vs.device_id, ''),
              vs.session_id
            )
          END
        )::int AS "gaCaptures"
        ,
        COUNT(
          DISTINCT CASE
            WHEN vs.consent_status = 'accepted'
            THEN COALESCE(
              NULLIF(vs.visit_id, ''),
              NULLIF(vs.device_id, ''),
              vs.session_id
            )
          END
        )::int AS "consentAccepted",
        COUNT(
          DISTINCT CASE
            WHEN vs.consent_status = 'rejected'
            THEN COALESCE(
              NULLIF(vs.visit_id, ''),
              NULLIF(vs.device_id, ''),
              vs.session_id
            )
          END
        )::int AS "consentRejected",
        COUNT(
          DISTINCT CASE
            WHEN vs.consent_status IS NULL OR vs.consent_status = 'pending'
            THEN COALESCE(
              NULLIF(vs.visit_id, ''),
              NULLIF(vs.device_id, ''),
              vs.session_id
            )
          END
        )::int AS "consentPending"
      FROM referral_codes rc
      INNER JOIN visit_sessions vs
        ON (
          vs.referral_code = rc.code
          OR EXISTS (
            SELECT 1
            FROM referral_clicks click_match
            WHERE click_match.id = vs.ref_click_id
              AND click_match."referralCodeId" = rc.id
          )
        )
      LEFT JOIN referral_clicks c
        ON c.id = vs.ref_click_id
        AND c."referralCodeId" = rc.id
        ${clickRangeClause}
      WHERE ${visitFilters.join(' AND ')}
      GROUP BY rc.id`,
      params,
    );

    return rows.map((row: ReferrerVisitRow) => ({
      referralCodeId: row.referralCodeId,
      rawLandingVisits: Number(row.rawLandingVisits) || 0,
      landingVisits: Number(row.landingVisits) || 0,
      strictLandingVisits: Number(row.strictLandingVisits) || 0,
      strictMatchedClicks: Number(row.strictMatchedClicks) || 0,
      carryoverLandingVisits: Number(row.carryoverLandingVisits) || 0,
      firstPartyVisits: Number(row.firstPartyVisits) || 0,
      gaCaptures: Number(row.gaCaptures) || 0,
      consentAccepted: Number(row.consentAccepted) || 0,
      consentRejected: Number(row.consentRejected) || 0,
      consentPending: Number(row.consentPending) || 0,
    }));
  }

  private async getRegistrationDiagnosticsByCode(
    codeIds: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReferrerRegistrationRow[]> {
    const params: Array<Date | string[] | AttributionEventType> = [
      AttributionEventType.REGISTRATION,
      codeIds,
    ];
    const filters = [
      'a."eventType" = $1',
      'a."referralCodeId" = ANY($2::uuid[])',
    ];

    if (startDate && endDate) {
      params.unshift(startDate, endDate);
      filters.unshift('a."createdAt" BETWEEN $1 AND $2');
      filters[1] = 'a."eventType" = $3';
      filters[2] = 'a."referralCodeId" = ANY($4::uuid[])';
    }

    const rows = await this.codeRepo.query(
      `SELECT
        a."referralCodeId" AS "referralCodeId",
        COUNT(*)::int AS registrations,
        COUNT(*) FILTER (
          WHERE COALESCE(u.email_verified, false) = true
        )::int AS "verifiedRegistrations"
      FROM referral_attributions a
      LEFT JOIN users u ON u.id = a."userId"
      WHERE ${filters.join(' AND ')}
      GROUP BY a."referralCodeId"`,
      params,
    );

    return rows.map((row: ReferrerRegistrationRow) => ({
      referralCodeId: row.referralCodeId,
      registrations: Number(row.registrations) || 0,
      verifiedRegistrations: Number(row.verifiedRegistrations) || 0,
    }));
  }
}
