import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OutboundClick,
  OutboundSource,
} from './entities/outbound-click.entity';
import { RecordOutboundClickDto } from './dto/search-tracking.dto';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import { SearchEvents } from '../shared/events';
import type { OutboundClickRecordedEvent } from '../shared/events';
import { SearchClick } from './entities/search-click.entity';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';
import { VisitSessionService } from '../visit-tracking/visit-session.service';

type AnalyticsFilters = {
  source?: string;
  platform?: string;
  productIds?: string[] | null;
  includeInternal?: boolean;
};

type ClickCountSummary = {
  rawCount: number;
  dedupedCount: number;
  productIntentCount: number;
  platformSelectionCount: number;
};

type FullAnalyticsOptions = {
  page?: number;
  limit?: number;
  source?: string;
  platform?: string;
  productKeyword?: string;
  includeInternal?: boolean;
};

@Injectable()
export class OutboundTrackingService {
  private readonly logger = new Logger(OutboundTrackingService.name);
  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    @InjectRepository(OutboundClick)
    private readonly outboundClickRepository: Repository<OutboundClick>,
    @InjectRepository(SearchClick)
    private readonly searchClickRepository: Repository<SearchClick>,
    private readonly productQueryFacade: ProductQueryFacadeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly analyticsDedupService: AnalyticsDedupService,
    private readonly visitSessionService: VisitSessionService,
  ) {}

  private buildOutboundDedupKeySql(alias = 'o') {
    return `CONCAT_WS('|', COALESCE(CAST(${alias}."userId" AS text), NULLIF(${alias}.device_id, ''), NULLIF(${alias}."sessionId", ''), NULLIF(${alias}.visit_id, ''), 'anon'), ${alias}."productId", ${alias}."platformType", COALESCE(${alias}."pagePath", ${alias}."pageType", ''), FLOOR(EXTRACT(EPOCH FROM ${alias}."createdAt") / 600)::bigint)`;
  }

  private buildProductIntentDedupKeySql(alias = 'o') {
    return `CONCAT_WS('|', COALESCE(CAST(${alias}."userId" AS text), NULLIF(${alias}.device_id, ''), NULLIF(${alias}."sessionId", ''), NULLIF(${alias}.visit_id, ''), 'anon'), ${alias}."productId", FLOOR(EXTRACT(EPOCH FROM ${alias}."createdAt") / 600)::bigint)`;
  }

  private buildPlatformSelectionDedupKeySql(alias = 'o') {
    return `CONCAT_WS('|', COALESCE(CAST(${alias}."userId" AS text), NULLIF(${alias}.device_id, ''), NULLIF(${alias}."sessionId", ''), NULLIF(${alias}.visit_id, ''), 'anon'), ${alias}."productId", ${alias}."platformType", FLOOR(EXTRACT(EPOCH FROM ${alias}."createdAt") / 600)::bigint)`;
  }

  private buildBusinessDateSql(alias = 'o') {
    return `DATE(${alias}."createdAt" + INTERVAL '8 hours')`;
  }

  private async getClickCountSummary(
    startDate: Date,
    endDate: Date,
    filters?: AnalyticsFilters,
  ): Promise<ClickCountSummary> {
    const result = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select('COUNT(*)', 'rawCount')
      .addSelect(
        `COUNT(DISTINCT ${this.buildOutboundDedupKeySql()})`,
        'dedupedCount',
      )
      .addSelect(
        `COUNT(DISTINCT ${this.buildProductIntentDedupKeySql()})`,
        'productIntentCount',
      )
      .addSelect(
        `COUNT(DISTINCT ${this.buildPlatformSelectionDedupKeySql()})`,
        'platformSelectionCount',
      )
      .getRawOne<{
        rawCount: string;
        dedupedCount: string;
        productIntentCount: string;
        platformSelectionCount: string;
      }>();

    return {
      rawCount: parseInt(result?.rawCount || '0', 10),
      dedupedCount: parseInt(result?.dedupedCount || '0', 10),
      productIntentCount: parseInt(result?.productIntentCount || '0', 10),
      platformSelectionCount: parseInt(
        result?.platformSelectionCount || '0',
        10,
      ),
    };
  }

  /**
   * 记录外跳点击
   */
  async recordOutboundClick(
    dto: RecordOutboundClickDto,
    context?: AnalyticsRequestContext,
  ): Promise<string> {
    const trustedVisitorId =
      context?.trustedVisitorId || dto.deviceId || dto.sessionId;
    const resolvedVisit = trustedVisitorId
      ? await this.visitSessionService.resolveActiveVisitIdentity(
          trustedVisitorId,
          {
            landingPage: dto.pagePath || null,
            occurredAt: new Date(),
          },
        )
      : null;
    if (
      dto.searchClickId &&
      !(await this.canUseSearchClick(dto.searchClickId, context))
    ) {
      return '';
    }

    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'outbound_click',
      windowMs: 10 * 60 * 1000,
      parts: [
        trustedVisitorId || dto.sessionId || dto.productId,
        dto.productId,
        dto.platformType,
        dto.pagePath || dto.pageType || '',
      ],
    });
    if (!shouldRecord) {
      return '';
    }

    const query =
      dto.query ||
      (dto.searchClickId
        ? await this.resolveQueryFromSearchClick(dto.searchClickId)
        : undefined);

    if (!resolvedVisit && trustedVisitorId) {
      this.logger.warn(
        `No active visit session found for trusted visitor ${trustedVisitorId}; falling back to request identifiers for outbound click on product ${dto.productId}`,
      );
    }

    const outboundClick = this.outboundClickRepository.create({
      productId: dto.productId,
      platformType: dto.platformType,
      platformUrl: dto.platformUrl,
      source: dto.source || OutboundSource.DIRECT,
      searchClickId: dto.searchClickId,
      pageType: dto.pageType || undefined,
      pagePath: dto.pagePath || undefined,
      query,
      buttonVariant: dto.buttonVariant || undefined,
      locale: dto.locale || undefined,
      viewportDeviceType: dto.viewportDeviceType || undefined,
      userId: context?.userId || dto.userId,
      sessionId:
        resolvedVisit?.sessionId ||
        dto.sessionId ||
        trustedVisitorId ||
        undefined,
      deviceId:
        resolvedVisit?.deviceId ||
        trustedVisitorId ||
        dto.deviceId ||
        dto.sessionId ||
        undefined,
      visitId: resolvedVisit?.visitId || undefined,
    });

    const saved = await this.outboundClickRepository.save(outboundClick);
    if (resolvedVisit?.id) {
      await this.visitSessionService.touchVisitActivity(
        resolvedVisit.id,
        saved.createdAt,
      );
    }

    // 通过事件触发缓存刷新，解耦 SearchModule 与 WeidianModule
    this.eventEmitter.emit(SearchEvents.OUTBOUND_CLICK_RECORDED, {
      productId: dto.productId,
    } satisfies OutboundClickRecordedEvent);

    return saved.id;
  }

  /**
   * 获取外跳总览数据
   */
  async getOverview(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();

    const clicks = await this.outboundClickRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    // 按来源统计
    const bySource = this.groupBy(clicks, 'source');
    // 按平台统计
    const byPlatform = this.groupBy(clicks, 'platformType');

    return {
      total: clicks.length,
      bySource: this.formatGroupCount(bySource),
      byPlatform: this.formatGroupCount(byPlatform),
      startDate,
      endDate,
    };
  }

  /**
   * 获取外跳概览卡片数据
   * 用于管理后台 overview，与旧 clicks 概览结构兼容
   */
  async getClickOverview(startDate: Date, endDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [periodCounts, todayCounts] = await Promise.all([
      this.getClickCountSummary(startDate, endDate),
      this.getClickCountSummary(today, new Date()),
    ]);

    return {
      total: periodCounts.dedupedCount,
      todayCount: todayCounts.dedupedCount,
      rawTotal: periodCounts.rawCount,
      rawTodayCount: todayCounts.rawCount,
      productIntentTotal: periodCounts.productIntentCount,
      productIntentTodayCount: todayCounts.productIntentCount,
      platformSelectionTotal: periodCounts.platformSelectionCount,
      platformSelectionTodayCount: todayCounts.platformSelectionCount,
      suspiciousTotal: Math.max(
        periodCounts.rawCount - periodCounts.platformSelectionCount,
        0,
      ),
      suspiciousTodayCount: Math.max(
        todayCounts.rawCount - todayCounts.platformSelectionCount,
        0,
      ),
    };
  }

  /**
   * 获取热门商品（按购买意图）
   */
  async getTopProducts(days: number = 7, limit: number = 20) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.outboundClickRepository
      .createQueryBuilder('o')
      .select('o.productId', 'productId')
      .addSelect(
        `COUNT(DISTINCT ${this.buildProductIntentDedupKeySql()})`,
        'outboundCount',
      )
      .where('o.createdAt >= :startDate', { startDate })
      .groupBy('o.productId')
      .orderBy('outboundCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      productId: r.productId,
      outboundCount: parseInt(r.outboundCount, 10),
    }));
  }

  /**
   * 获取外跳趋势（按天）
   */
  async getTrends(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.outboundClickRepository
      .createQueryBuilder('o')
      .select(this.buildBusinessDateSql(), 'date')
      .addSelect('COUNT(*)', 'rawCount')
      .addSelect(
        `COUNT(DISTINCT ${this.buildProductIntentDedupKeySql()})`,
        'count',
      )
      .where('o.createdAt >= :startDate', { startDate })
      .groupBy(this.buildBusinessDateSql())
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      rawCount: parseInt(r.rawCount, 10) || 0,
      count: parseInt(r.count, 10),
      suspiciousCount: Math.max(
        (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
        0,
      ),
    }));
  }

  /**
   * 获取指定日期范围内的外跳趋势（管理后台用）
   */
  async getClicksByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: AnalyticsFilters,
  ) {
    const result = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select(this.buildBusinessDateSql(), 'date')
      .addSelect('COUNT(*)', 'rawCount')
      .addSelect(
        `COUNT(DISTINCT ${this.buildProductIntentDedupKeySql()})`,
        'count',
      )
      .groupBy(this.buildBusinessDateSql())
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      rawCount: parseInt(r.rawCount, 10) || 0,
      count: parseInt(r.count, 10),
      suspiciousCount: Math.max(
        (parseInt(r.rawCount, 10) || 0) - (parseInt(r.count, 10) || 0),
        0,
      ),
    }));
  }

  /**
   * 获取指定日期范围内的热门商品（管理后台用）
   */
  async getTopProductsByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 10,
    filters?: AnalyticsFilters,
  ) {
    const result = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select('o.productId', 'productId')
      .addSelect(
        `COUNT(DISTINCT ${this.buildProductIntentDedupKeySql()})`,
        'count',
      )
      .groupBy('o.productId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; count: string }>();

    const productIds = result.map((row) => row.productId).filter(Boolean);
    const products =
      productIds.length > 0
        ? await this.productQueryFacade.findProductsByIds(productIds, [
            'id',
            'title',
            'mainImage',
          ])
        : [];
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    return result.map((row) => {
      const product = productMap.get(row.productId);
      return {
        productId: row.productId,
        productName: product?.title || '未知商品',
        productImage: product?.mainImage || null,
        count: parseInt(row.count, 10),
      };
    });
  }

  /**
   * 获取完整的外跳分析数据（管理后台用）
   */
  async getFullAnalytics(
    startDate: Date,
    endDate: Date,
    options: FullAnalyticsOptions = {},
  ) {
    // 计算时间跨度（用于对比上一周期）
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime());
    const page = options.page || 1;
    const limit = options.limit || 20;
    const productIds = await this.resolveProductIdsByKeyword(
      options.productKeyword,
    );
    const filters: AnalyticsFilters = {
      source: options.source,
      platform: options.platform,
      productIds,
      includeInternal: options.includeInternal,
    };

    const [
      counts,
      prevCounts,
      uniqueProducts,
      prevUniqueProducts,
      bySource,
      byPlatform,
      byPageType,
      byLocale,
      byViewportDeviceType,
      byButtonVariant,
      byDate,
      prevByDate,
      topProducts,
      topQueries,
      topPages,
      multiPlatformIntentCount,
      prevMultiPlatformIntentCount,
      records,
    ] = await Promise.all([
      this.getClickCountSummary(startDate, endDate, filters),
      this.getClickCountSummary(prevStartDate, prevEndDate, filters),
      this.getUniqueProductCount(startDate, endDate, filters),
      this.getUniqueProductCount(prevStartDate, prevEndDate, filters),
      this.getGroupedCounts(startDate, endDate, 'source', filters),
      this.getGroupedCounts(
        startDate,
        endDate,
        'platformType',
        filters,
        'platformSelection',
      ),
      this.getGroupedCounts(startDate, endDate, 'pageType', filters),
      this.getGroupedCounts(startDate, endDate, 'locale', filters),
      this.getGroupedCounts(startDate, endDate, 'viewportDeviceType', filters),
      this.getGroupedCounts(startDate, endDate, 'buttonVariant', filters),
      this.getClicksByDateRange(startDate, endDate, filters),
      this.getClicksByDateRange(prevStartDate, prevEndDate, filters),
      this.getTopProductsByDateRange(startDate, endDate, 20, filters),
      this.getTopFieldCounts(startDate, endDate, 'query', 10, filters),
      this.getTopFieldCounts(startDate, endDate, 'pagePath', 10, filters),
      this.getMultiPlatformIntentCount(startDate, endDate, filters),
      this.getMultiPlatformIntentCount(prevStartDate, prevEndDate, filters),
      this.getClickRecordsWithProducts(
        startDate,
        endDate,
        page,
        limit,
        filters,
      ),
    ]);

    const summary = {
      total: counts.dedupedCount,
      rawTotal: counts.rawCount,
      productIntentTotal: counts.productIntentCount,
      productIntentChange: this.calculateChangePercent(
        counts.productIntentCount,
        prevCounts.productIntentCount,
      ),
      prevProductIntentTotal: prevCounts.productIntentCount,
      platformSelectionTotal: counts.platformSelectionCount,
      platformSelectionChange: this.calculateChangePercent(
        counts.platformSelectionCount,
        prevCounts.platformSelectionCount,
      ),
      prevPlatformSelectionTotal: prevCounts.platformSelectionCount,
      platformSelectionRate:
        counts.productIntentCount > 0
          ? Math.round(
              (counts.platformSelectionCount / counts.productIntentCount) *
                10000,
            ) / 100
          : 0,
      multiPlatformIntentCount,
      multiPlatformIntentChange: this.calculateChangePercent(
        multiPlatformIntentCount,
        prevMultiPlatformIntentCount,
      ),
      prevMultiPlatformIntentCount,
      multiPlatformIntentRate:
        counts.productIntentCount > 0
          ? Math.round(
              (multiPlatformIntentCount / counts.productIntentCount) * 10000,
            ) / 100
          : 0,
      suspiciousClicks: Math.max(
        counts.rawCount - counts.platformSelectionCount,
        0,
      ),
      suspiciousRate:
        counts.rawCount > 0
          ? Math.round(
              (Math.max(counts.rawCount - counts.platformSelectionCount, 0) /
                counts.rawCount) *
                10000,
            ) / 100
          : 0,
      totalChange: this.calculateChangePercent(
        counts.dedupedCount,
        prevCounts.dedupedCount,
      ),
      uniqueProducts,
      uniqueProductsChange: this.calculateChangePercent(
        uniqueProducts,
        prevUniqueProducts,
      ),
      prevTotal: prevCounts.dedupedCount,
      prevRawTotal: prevCounts.rawCount,
      prevUniqueProducts,
    };

    return {
      summary,
      bySource,
      byPlatform,
      byPageType,
      byLocale,
      byViewportDeviceType,
      byButtonVariant,
      byDate,
      prevByDate,
      topProducts,
      topQueries,
      topPages,
      records: records.items,
      pagination: {
        total: counts.rawCount,
        page,
        limit,
      },
      filters: {
        source: options.source || null,
        platform: options.platform || null,
        productKeyword: options.productKeyword || null,
      },
      period: {
        current: { start: startDate, end: endDate },
        previous: { start: prevStartDate, end: prevEndDate },
      },
    };
  }

  /**
   * 计算环比变化百分比
   */
  private calculateChangePercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * 获取外跳明细记录（带商品名称）
   */
  async getClickRecordsWithProducts(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 50,
    filters?: AnalyticsFilters,
  ) {
    const clicks = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select([
        'o.id',
        'o.productId',
        'o.platformType',
        'o.source',
        'o.pageType',
        'o.pagePath',
        'o.query',
        'o.buttonVariant',
        'o.locale',
        'o.viewportDeviceType',
        'o.createdAt',
      ])
      .orderBy('o.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    // 获取商品信息（通过 Facade）
    const productIds = [...new Set(clicks.map((c) => c.productId))];
    const products = await this.productQueryFacade.findProductsByIds(
      productIds,
      ['id', 'title', 'mainImage'],
    );

    const productMap = new Map(products.map((p) => [p.id, p]));

    return {
      items: clicks.map((click) => {
        const product = productMap.get(click.productId);
        return {
          id: click.id,
          productId: click.productId,
          productName: product?.title || '未知商品',
          productImage: product?.mainImage || null,
          platform: click.platformType,
          source: click.source,
          pageType: click.pageType,
          pagePath: click.pagePath,
          query: click.query,
          buttonVariant: click.buttonVariant,
          locale: click.locale,
          viewportDeviceType: click.viewportDeviceType,
          createdAt: click.createdAt,
        };
      }),
    };
  }

  private async getUniqueProductCount(
    startDate: Date,
    endDate: Date,
    filters?: AnalyticsFilters,
  ): Promise<number> {
    const result = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select('COUNT(DISTINCT o.productId)', 'count')
      .getRawOne<{ count: string }>();

    return parseInt(result?.count || '0', 10);
  }

  private async getGroupedCounts(
    startDate: Date,
    endDate: Date,
    groupField:
      | 'source'
      | 'platformType'
      | 'pageType'
      | 'locale'
      | 'viewportDeviceType'
      | 'buttonVariant',
    filters?: AnalyticsFilters,
    metric: 'productIntent' | 'platformSelection' = 'productIntent',
  ): Promise<Record<string, number>> {
    const dedupKey =
      metric === 'platformSelection'
        ? this.buildPlatformSelectionDedupKeySql()
        : this.buildProductIntentDedupKeySql();
    const result = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select(`o.${groupField}`, 'key')
      .addSelect(`COUNT(DISTINCT ${dedupKey})`, 'count')
      .groupBy(`o.${groupField}`)
      .getRawMany<{ key: string; count: string }>();

    return result.reduce<Record<string, number>>((acc, row) => {
      if (!row.key) return acc;
      acc[row.key] = parseInt(row.count, 10);
      return acc;
    }, {});
  }

  private async getMultiPlatformIntentCount(
    startDate: Date,
    endDate: Date,
    filters?: AnalyticsFilters,
  ): Promise<number> {
    const intentKey = this.buildProductIntentDedupKeySql();
    const rows = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select(intentKey, 'intentKey')
      .addSelect('COUNT(DISTINCT o."platformType")', 'platformCount')
      .groupBy(intentKey)
      .having('COUNT(DISTINCT o."platformType") > 1')
      .getRawMany<{ intentKey: string; platformCount: string }>();

    return rows.length;
  }

  private async getTopFieldCounts(
    startDate: Date,
    endDate: Date,
    field: 'query' | 'pagePath',
    limit: number,
    filters?: AnalyticsFilters,
  ): Promise<Array<{ key: string; count: number }>> {
    const result = await this.buildFilteredClicksQuery(
      startDate,
      endDate,
      filters,
    )
      .select(`o.${field}`, 'key')
      .addSelect(
        `COUNT(DISTINCT ${this.buildProductIntentDedupKeySql()})`,
        'count',
      )
      .andWhere(`o.${field} IS NOT NULL`)
      .andWhere(`o.${field} != ''`)
      .groupBy(`o.${field}`)
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ key: string; count: string }>();

    return result.map((row) => ({
      key: row.key,
      count: parseInt(row.count, 10),
    }));
  }

  private buildFilteredClicksQuery(
    startDate: Date,
    endDate: Date,
    filters?: AnalyticsFilters,
  ): SelectQueryBuilder<OutboundClick> {
    const query = this.outboundClickRepository
      .createQueryBuilder('o')
      .where('o.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (!filters?.includeInternal) {
      query.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM users internal_user
          WHERE internal_user.id = o."userId"
            AND internal_user.role IN ('admin', 'super_admin')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM visit_sessions internal_visit
          LEFT JOIN users visit_user
            ON visit_user.id = internal_visit.user_id
          WHERE COALESCE(internal_visit.visit_id, internal_visit.session_id) = COALESCE(o.visit_id, o."sessionId")
            AND (
              internal_visit.channel_type = 'internal'
              OR visit_user.role IN ('admin', 'super_admin')
            )
        )`,
      );
    }

    if (filters?.source) {
      query.andWhere('o.source = :source', { source: filters.source });
    }

    if (filters?.platform) {
      query.andWhere('o.platformType = :platform', {
        platform: filters.platform,
      });
    }

    if (filters?.productIds) {
      if (filters.productIds.length === 0) {
        query.andWhere('1 = 0');
      } else {
        query.andWhere('o.productId IN (:...productIds)', {
          productIds: filters.productIds,
        });
      }
    }

    return query;
  }

  private async resolveProductIdsByKeyword(
    keyword?: string,
  ): Promise<string[] | null> {
    if (!keyword?.trim()) {
      return null;
    }

    const normalizedKeyword = keyword.trim();
    if (this.uuidPattern.test(normalizedKeyword)) {
      return [normalizedKeyword];
    }

    const rows = await this.productQueryFacade
      .createProductQueryBuilder('product')
      .select('product.id', 'id')
      .where(
        '(product.title ILIKE :keyword OR product.originalTitle ILIKE :keyword)',
        {
          keyword: `%${normalizedKeyword}%`,
        },
      )
      .limit(500)
      .getRawMany<{ id: string }>();

    return rows.map((row) => row.id);
  }

  private async resolveQueryFromSearchClick(
    searchClickId: string,
  ): Promise<string | null> {
    const click = await this.searchClickRepository.findOne({
      where: { id: searchClickId },
      select: ['id', 'query'],
    });

    return click?.query || null;
  }

  private async canUseSearchClick(
    searchClickId: string,
    context?: AnalyticsRequestContext,
  ): Promise<boolean> {
    const click = await this.searchClickRepository.findOne({
      where: { id: searchClickId },
      select: ['id', 'userId', 'deviceId'],
    });
    if (!click) return false;

    if (click.userId && context?.userId) {
      return click.userId === context.userId;
    }

    if (click.deviceId && context?.trustedVisitorId) {
      return click.deviceId === context.trustedVisitorId;
    }

    return false;
  }

  private groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of array) {
      const value = String(item[key]);
      if (!map.has(value)) {
        map.set(value, []);
      }
      map.get(value)!.push(item);
    }
    return map;
  }

  private formatGroupCount(map: Map<string, any[]>): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of map.entries()) {
      result[key] = value.length;
    }
    return result;
  }
}
