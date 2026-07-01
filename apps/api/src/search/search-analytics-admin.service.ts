import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLog } from './entities/search-log.entity';
import { SearchImpression } from './entities/search-impression.entity';
import { SearchClick } from './entities/search-click.entity';
import {
  SearchSuggestionService,
  SearchSuggestion,
} from './search-suggestion.service';
import type {
  SearchAnalyticsOverview,
  TopSearchQuery,
  ZeroResultQuery,
  LowCTRQuery,
  ProductCTRRanking,
  SearchTrendItem,
} from './dto/search-analytics.types';

@Injectable()
export class SearchAnalyticsAdminService {
  private readonly impressionActorSql = `COALESCE(CAST(sl.user_id AS text), NULLIF(sl.device_id, ''), NULLIF(sl.session_id, ''), NULLIF(sl.visit_id, ''), NULLIF(sl.ip_address, ''), 'anon')`;

  constructor(
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @InjectRepository(SearchImpression)
    private readonly impressionRepository: Repository<SearchImpression>,
    @InjectRepository(SearchClick)
    private readonly clickRepository: Repository<SearchClick>,
    private readonly suggestionService: SearchSuggestionService,
  ) {}

  private resolveRange(startDateOrDays: Date | number, endDate?: Date) {
    if (typeof startDateOrDays === 'number') {
      const end = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - startDateOrDays);
      return { startDate, end, includePeriod: true };
    }

    return {
      startDate: startDateOrDays,
      end: endDate!,
      includePeriod: false,
    };
  }

  private buildSearchDedupKeySql(alias = 'sl') {
    return `CONCAT_WS('|', COALESCE(CAST(${alias}.user_id AS text), NULLIF(${alias}.device_id, ''), NULLIF(${alias}.session_id, ''), NULLIF(${alias}.visit_id, ''), NULLIF(${alias}.ip_address, ''), 'anon'), ${alias}.normalized_keyword, FLOOR(EXTRACT(EPOCH FROM ${alias}.created_at) / 30)::bigint)`;
  }

  private buildImpressionDedupKeySql() {
    return `CONCAT_WS('|', ${this.impressionActorSql}, i."productId", i.page, i.position, FLOOR(EXTRACT(EPOCH FROM i."createdAt") / 300)::bigint)`;
  }

  private buildClickDedupKeySql(alias = 'c') {
    return `CONCAT_WS('|', COALESCE(CAST(${alias}."userId" AS text), NULLIF(${alias}.device_id, ''), NULLIF(${alias}."sessionId", ''), NULLIF(${alias}.visit_id, ''), 'anon'), ${alias}."productId", COALESCE(${alias}.query, ''), ${alias}.page, FLOOR(EXTRACT(EPOCH FROM ${alias}."createdAt") / 600)::bigint)`;
  }

  async getSearchAnalytics(
    startDateOrDays: Date | number,
    endDate?: Date,
  ): Promise<Record<string, unknown>> {
    const { startDate, end, includePeriod } = this.resolveRange(
      startDateOrDays,
      endDate,
    );

    const [searchStats, impressionStats, clickStats] = await Promise.all([
      this.searchLogRepository.query(
        `
        SELECT
          COUNT(*)::int AS "rawSearches",
          COUNT(DISTINCT ${this.buildSearchDedupKeySql()})::int AS "dedupedSearches",
          COUNT(*) FILTER (WHERE sl.result_count = 0)::int AS "zeroResultSearches"
        FROM search_logs sl
        WHERE sl.created_at BETWEEN $1 AND $2
        `,
        [startDate, end],
      ),
      this.impressionRepository.query(
        `
        SELECT
          COUNT(*)::int AS "rawImpressions",
          COUNT(DISTINCT ${this.buildImpressionDedupKeySql()})::int AS "dedupedImpressions"
        FROM search_impressions i
        INNER JOIN search_logs sl ON sl.id = i."searchLogId"
        WHERE i."createdAt" BETWEEN $1 AND $2
        `,
        [startDate, end],
      ),
      this.clickRepository.query(
        `
        SELECT
          COUNT(*)::int AS "rawClicks",
          COUNT(DISTINCT ${this.buildClickDedupKeySql()})::int AS "dedupedClicks",
          COUNT(*) FILTER (WHERE c.converted = true)::int AS "rawConversions",
          COUNT(DISTINCT CASE WHEN c.converted = true THEN ${this.buildClickDedupKeySql()} END)::int AS "dedupedConversions"
        FROM search_clicks c
        WHERE c."createdAt" BETWEEN $1 AND $2
        `,
        [startDate, end],
      ),
    ]);

    const searchRow = searchStats[0] ?? {};
    const impressionRow = impressionStats[0] ?? {};
    const clickRow = clickStats[0] ?? {};

    const rawSearches = parseInt(String(searchRow.rawSearches ?? 0), 10) || 0;
    const dedupedSearches =
      parseInt(String(searchRow.dedupedSearches ?? 0), 10) || 0;
    const zeroResultSearches =
      parseInt(String(searchRow.zeroResultSearches ?? 0), 10) || 0;
    const rawImpressions =
      parseInt(String(impressionRow.rawImpressions ?? 0), 10) || 0;
    const dedupedImpressions =
      parseInt(String(impressionRow.dedupedImpressions ?? 0), 10) || 0;
    const rawClicks = parseInt(String(clickRow.rawClicks ?? 0), 10) || 0;
    const dedupedClicks =
      parseInt(String(clickRow.dedupedClicks ?? 0), 10) || 0;
    const rawConversions =
      parseInt(String(clickRow.rawConversions ?? 0), 10) || 0;
    const dedupedConversions =
      parseInt(String(clickRow.dedupedConversions ?? 0), 10) || 0;

    const result: SearchAnalyticsOverview = {
      totalSearches: dedupedSearches,
      zeroResultSearches,
      zeroResultRate:
        dedupedSearches > 0 ? zeroResultSearches / dedupedSearches : 0,
      totalImpressions: dedupedImpressions,
      totalClicks: dedupedClicks,
      ctr: dedupedImpressions > 0 ? dedupedClicks / dedupedImpressions : 0,
      totalConversions: dedupedConversions,
      conversionRate:
        dedupedClicks > 0 ? dedupedConversions / dedupedClicks : 0,
    };

    const diagnostics = {
      rawSearches,
      dedupedSearches,
      suspiciousSearches: Math.max(rawSearches - dedupedSearches, 0),
      rawImpressions,
      dedupedImpressions,
      suspiciousImpressions: Math.max(rawImpressions - dedupedImpressions, 0),
      rawClicks,
      dedupedClicks,
      suspiciousClicks: Math.max(rawClicks - dedupedClicks, 0),
      rawConversions,
      dedupedConversions,
      suspiciousConversions: Math.max(rawConversions - dedupedConversions, 0),
      trustedCtr: result.ctr,
      trustedConversionRate: result.conversionRate,
    };

    if (includePeriod) {
      return { ...result, ...diagnostics, period: { start: startDate, end } };
    }

    return { ...result, ...diagnostics };
  }

  async getTopSearchQueries(
    limit: number = 100,
    days: number = 7,
  ): Promise<TopSearchQuery[]> {
    const { startDate, end } = this.resolveRange(days);
    return this.getTopSearchQueriesByRange(startDate, end, limit);
  }

  async getTopSearchQueriesByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<any[]> {
    const searchDedupKeySql = this.buildSearchDedupKeySql();
    const clickDedupKeySql = this.buildClickDedupKeySql();

    const results = await this.searchLogRepository.query(
      `
      SELECT
        sl.normalized_keyword AS keyword,
        COUNT(*)::int AS "rawSearchCount",
        COUNT(DISTINCT ${searchDedupKeySql})::int AS "dedupedSearchCount",
        ROUND(AVG(sl.result_count))::int AS "avgResultCount"
      FROM search_logs sl
      WHERE sl.created_at BETWEEN $1 AND $2
        AND sl.result_count > 0
      GROUP BY sl.normalized_keyword
      ORDER BY "dedupedSearchCount" DESC, "rawSearchCount" DESC
      LIMIT $3
      `,
      [startDate, endDate, limit],
    );

    const keywords = (results as Array<Record<string, string>>).map(
      (r: Record<string, string>) => r.keyword,
    );
    if (keywords.length === 0) return [];

    const clickStats = await this.clickRepository.query(
      `
      SELECT
        LOWER(c.query) AS keyword,
        COUNT(*)::int AS "rawClicks",
        COUNT(DISTINCT ${clickDedupKeySql})::int AS "dedupedClicks"
      FROM search_clicks c
      WHERE LOWER(c.query) = ANY($1)
        AND c."createdAt" BETWEEN $2 AND $3
      GROUP BY LOWER(c.query)
      `,
      [keywords, startDate, endDate],
    );

    const clickMap = new Map<
      string,
      { rawClicks: number; dedupedClicks: number }
    >(
      (clickStats as Array<Record<string, string>>).map(
        (c: Record<string, string>) => [
          c.keyword,
          {
            rawClicks: parseInt(c.rawClicks, 10) || 0,
            dedupedClicks: parseInt(c.dedupedClicks, 10) || 0,
          },
        ],
      ),
    );

    return (results as Array<Record<string, string>>).map((r) => {
      const clickStatsForKeyword: { rawClicks: number; dedupedClicks: number } =
        clickMap.get(r.keyword) || {
          rawClicks: 0,
          dedupedClicks: 0,
        };
      const rawSearchCount = parseInt(r.rawSearchCount, 10) || 0;
      const dedupedSearchCount = parseInt(r.dedupedSearchCount, 10) || 0;
      return {
        keyword: r.keyword,
        searchCount: dedupedSearchCount,
        avgResultCount: parseInt(r.avgResultCount, 10) || 0,
        clicks: clickStatsForKeyword.dedupedClicks,
        ctr:
          dedupedSearchCount > 0
            ? clickStatsForKeyword.dedupedClicks / dedupedSearchCount
            : 0,
        rawSearchCount,
        dedupedSearchCount,
        suspiciousSearchCount: Math.max(rawSearchCount - dedupedSearchCount, 0),
        rawClicks: clickStatsForKeyword.rawClicks,
        dedupedClicks: clickStatsForKeyword.dedupedClicks,
        suspiciousClicks: Math.max(
          clickStatsForKeyword.rawClicks - clickStatsForKeyword.dedupedClicks,
          0,
        ),
      };
    });
  }

  async getZeroResultQueries(
    limit: number = 50,
    days: number = 7,
  ): Promise<ZeroResultQuery[]> {
    const { startDate, end } = this.resolveRange(days);
    return this.getZeroResultQueriesByRange(startDate, end, limit);
  }

  async getZeroResultQueriesByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
  ): Promise<Array<ZeroResultQuery & Record<string, string | number>>> {
    return this.searchLogRepository.query(
      `
      SELECT
        sl.normalized_keyword AS keyword,
        COUNT(*)::int AS "rawSearchCount",
        COUNT(DISTINCT ${this.buildSearchDedupKeySql()})::int AS "searchCount",
        MAX(sl.created_at) AS "lastSearchedAt"
      FROM search_logs sl
      WHERE sl.created_at BETWEEN $1 AND $2
        AND sl.result_count = 0
      GROUP BY sl.normalized_keyword
      ORDER BY "searchCount" DESC, "rawSearchCount" DESC
      LIMIT $3
      `,
      [startDate, endDate, limit],
    );
  }

  async getZeroResultQueriesWithSuggestions(
    limit: number = 50,
    days: number = 7,
  ): Promise<Array<ZeroResultQuery & { suggestion: SearchSuggestion }>> {
    const zeroResults = await this.getZeroResultQueries(limit, days);
    return zeroResults.map((item) => {
      const rawSearchCount = Number(
        (item as unknown as Record<string, number>).rawSearchCount || 0,
      );
      const dedupedSearchCount = Number(
        (item as unknown as Record<string, number>).searchCount || 0,
      );
      return {
        ...item,
        suggestion: this.suggestionService.analyzeTerm(item.keyword),
        suspiciousSearchCount: Math.max(rawSearchCount - dedupedSearchCount, 0),
      };
    });
  }

  async getZeroResultQueriesWithSuggestionsByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
  ): Promise<Array<ZeroResultQuery & { suggestion: SearchSuggestion }>> {
    const zeroResults = await this.getZeroResultQueriesByRange(
      startDate,
      endDate,
      limit,
    );
    return zeroResults.map((item) => {
      const rawSearchCount = Number(
        (item as unknown as Record<string, number>).rawSearchCount || 0,
      );
      const dedupedSearchCount = Number(
        (item as unknown as Record<string, number>).searchCount || 0,
      );
      return {
        ...item,
        suggestion: this.suggestionService.analyzeTerm(item.keyword),
        suspiciousSearchCount: Math.max(rawSearchCount - dedupedSearchCount, 0),
      };
    });
  }

  async getLowCTRQueries(
    limit: number = 50,
    minImpressions: number = 10,
  ): Promise<LowCTRQuery[]> {
    const { startDate, end } = this.resolveRange(30);
    return this.getLowCTRQueriesByRange(startDate, end, limit, minImpressions);
  }

  async getLowCTRQueriesByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
    minImpressions: number = 10,
  ): Promise<any[]> {
    const results = await this.impressionRepository.query(
      `
      SELECT
        sl.normalized_keyword AS keyword,
        COUNT(*)::int AS "rawImpressions",
        COUNT(DISTINCT ${this.buildImpressionDedupKeySql()})::int AS impressions
      FROM search_impressions i
      INNER JOIN search_logs sl ON sl.id = i."searchLogId"
      WHERE i."createdAt" BETWEEN $1 AND $2
      GROUP BY sl.normalized_keyword
      HAVING COUNT(DISTINCT ${this.buildImpressionDedupKeySql()}) >= $3
      `,
      [startDate, endDate, minImpressions],
    );

    if (results.length === 0) return [];

    const keywords = (results as Array<Record<string, string>>).map(
      (r: Record<string, string>) => r.keyword,
    );
    const clickStats = await this.clickRepository.query(
      `
      SELECT
        LOWER(c.query) AS keyword,
        COUNT(*)::int AS "rawClicks",
        COUNT(DISTINCT ${this.buildClickDedupKeySql()})::int AS clicks
      FROM search_clicks c
      WHERE LOWER(c.query) = ANY($1)
        AND c."createdAt" BETWEEN $2 AND $3
      GROUP BY LOWER(c.query)
      `,
      [keywords, startDate, endDate],
    );

    const clickMap = new Map<string, { rawClicks: number; clicks: number }>(
      (clickStats as Array<Record<string, string>>).map(
        (c: Record<string, string>) => [
          c.keyword,
          {
            rawClicks: parseInt(c.rawClicks, 10) || 0,
            clicks: parseInt(c.clicks, 10) || 0,
          },
        ],
      ),
    );

    const withCTR = (results as Array<Record<string, string>>).map((r) => {
      const impressions = parseInt(r.impressions, 10) || 0;
      const rawImpressions = parseInt(r.rawImpressions, 10) || 0;
      const clickStatsForKeyword: { rawClicks: number; clicks: number } =
        clickMap.get(r.keyword) || {
          rawClicks: 0,
          clicks: 0,
        };
      return {
        keyword: r.keyword,
        impressions,
        clicks: clickStatsForKeyword.clicks,
        ctr: impressions > 0 ? clickStatsForKeyword.clicks / impressions : 0,
        rawImpressions,
        suspiciousImpressions: Math.max(rawImpressions - impressions, 0),
        rawClicks: clickStatsForKeyword.rawClicks,
        suspiciousClicks: Math.max(
          clickStatsForKeyword.rawClicks - clickStatsForKeyword.clicks,
          0,
        ),
      };
    });

    return withCTR
      .sort((a: LowCTRQuery, b: LowCTRQuery) => a.ctr - b.ctr)
      .slice(0, limit);
  }

  async getProductCTRRanking(
    limit: number = 100,
  ): Promise<ProductCTRRanking[]> {
    const impressionStats = await this.impressionRepository
      .createQueryBuilder('i')
      .select('i.productId', 'productId')
      .addSelect('COUNT(*)', 'impressions')
      .groupBy('i.productId')
      .having('COUNT(*) >= 5')
      .getRawMany();

    if (impressionStats.length === 0) return [];

    const productIds = impressionStats.map((r) => r.productId);
    const clickStats = await this.clickRepository
      .createQueryBuilder('c')
      .select('c.productId', 'productId')
      .addSelect('COUNT(*)', 'clicks')
      .addSelect(
        'SUM(CASE WHEN c.converted = true THEN 1 ELSE 0 END)',
        'conversions',
      )
      .where('c.productId IN (:...productIds)', { productIds })
      .groupBy('c.productId')
      .getRawMany();

    const clickMap = new Map(
      clickStats.map((c) => [
        c.productId,
        {
          clicks: parseInt(c.clicks),
          conversions: parseInt(c.conversions || '0'),
        },
      ]),
    );

    const results = impressionStats.map((r) => {
      const impressions = parseInt(r.impressions);
      const clickData = clickMap.get(r.productId) || {
        clicks: 0,
        conversions: 0,
      };
      return {
        productId: r.productId,
        impressions,
        clicks: clickData.clicks,
        ctr: impressions > 0 ? clickData.clicks / impressions : 0,
        conversions: clickData.conversions,
        conversionRate:
          clickData.clicks > 0 ? clickData.conversions / clickData.clicks : 0,
      };
    });

    return results.sort((a, b) => b.ctr - a.ctr).slice(0, limit);
  }

  async getSearchTrends(
    days: number = 30,
    groupBy: 'hour' | 'day' = 'day',
  ): Promise<SearchTrendItem[]> {
    const { startDate, end } = this.resolveRange(days);
    return this.getSearchTrendsByRange(startDate, end, groupBy);
  }

  async getSearchTrendsByRange(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' = 'day',
  ): Promise<any[]> {
    const dateFormat = groupBy === 'hour' ? 'YYYY-MM-DD HH24:00' : 'YYYY-MM-DD';

    const searchTrends = await this.searchLogRepository.query(
      `
      SELECT
        TO_CHAR(sl.created_at, '${dateFormat}') AS period,
        COUNT(*)::int AS "rawSearches",
        COUNT(DISTINCT ${this.buildSearchDedupKeySql()})::int AS searches,
        COUNT(DISTINCT CASE WHEN sl.result_count = 0 THEN ${this.buildSearchDedupKeySql()} END)::int AS "zeroResults"
      FROM search_logs sl
      WHERE sl.created_at BETWEEN $1 AND $2
      GROUP BY TO_CHAR(sl.created_at, '${dateFormat}')
      ORDER BY period ASC
      `,
      [startDate, endDate],
    );

    const clickTrends = await this.clickRepository.query(
      `
      SELECT
        TO_CHAR(c."createdAt", '${dateFormat}') AS period,
        COUNT(*)::int AS "rawClicks",
        COUNT(DISTINCT ${this.buildClickDedupKeySql()})::int AS clicks
      FROM search_clicks c
      WHERE c."createdAt" BETWEEN $1 AND $2
      GROUP BY TO_CHAR(c."createdAt", '${dateFormat}')
      `,
      [startDate, endDate],
    );

    const clickMap = new Map<string, { rawClicks: number; clicks: number }>(
      (clickTrends as Array<Record<string, string>>).map(
        (c: Record<string, string>) => [
          c.period,
          {
            rawClicks: parseInt(c.rawClicks, 10) || 0,
            clicks: parseInt(c.clicks, 10) || 0,
          },
        ],
      ),
    );

    return (searchTrends as Array<Record<string, string>>).map((s) => ({
      period: s.period,
      searches: parseInt(s.searches, 10) || 0,
      zeroResults: parseInt(s.zeroResults || '0', 10) || 0,
      clicks: clickMap.get(s.period)?.clicks || 0,
      rawSearches: parseInt(s.rawSearches, 10) || 0,
      rawClicks: clickMap.get(s.period)?.rawClicks || 0,
    }));
  }
}
