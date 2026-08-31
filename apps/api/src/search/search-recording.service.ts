import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SearchLog } from './entities/search-log.entity';
import { HotSearch } from './entities/hot-search.entity';
import { SearchImpression } from './entities/search-impression.entity';
import { SearchClick } from './entities/search-click.entity';
import type {
  SearchContext,
  SearchLogResult,
  ImpressionItem,
  RecordClickParams,
} from './dto/search-analytics.types';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';

@Injectable()
export class SearchRecordingService {
  private readonly logger = new Logger(SearchRecordingService.name);

  constructor(
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @InjectRepository(HotSearch)
    private readonly hotSearchRepository: Repository<HotSearch>,
    @InjectRepository(SearchImpression)
    private readonly impressionRepository: Repository<SearchImpression>,
    @InjectRepository(SearchClick)
    private readonly clickRepository: Repository<SearchClick>,
    private readonly dataSource: DataSource,
    private readonly analyticsDedupService: AnalyticsDedupService,
  ) {}

  async logSearch(
    keyword: string,
    resultCount: number,
    context: SearchContext = {},
  ): Promise<SearchLogResult> {
    const normalizedKeyword = this.normalizeKeyword(keyword);
    if (/^\{?search_term_string\}?$/i.test(normalizedKeyword)) {
      return { searchLogId: '' };
    }
    const trustedVisitorId = context.deviceId || context.sessionId;

    if (trustedVisitorId) {
      const shouldLog = await this.analyticsDedupService.claim({
        scope: 'search_log',
        windowMs: 30_000,
        parts: [trustedVisitorId, normalizedKeyword],
      });

      if (!shouldLog) {
        const existingLog = await this.searchLogRepository.findOne({
          where: {
            normalizedKeyword,
            deviceId: trustedVisitorId,
          },
          order: { createdAt: 'DESC' },
        });

        if (existingLog) {
          if (context.visitId && !existingLog.visitId) {
            await this.searchLogRepository.update(existingLog.id, {
              visitId: context.visitId,
            });
          }
          return { searchLogId: existingLog.id };
        }

        this.logger.warn(
          `Skip trusted search log for "${normalizedKeyword}" because dedup claim was not acquired and no prior log was found`,
        );
        return { searchLogId: '' };
      }
    }

    const log = this.searchLogRepository.create({
      keyword,
      normalizedKeyword,
      resultCount,
      ...context,
    });
    const savedLog = await this.searchLogRepository.save(log);

    this.updateHotSearch(normalizedKeyword, resultCount).catch((err) => {
      this.logger.error('Failed to update hot search:', err);
    });

    return { searchLogId: savedLog.id };
  }

  async recordImpressions(
    searchLogId: string,
    impressions: ImpressionItem[],
    page: number = 1,
    context?: AnalyticsRequestContext,
  ): Promise<void> {
    if (!impressions.length) return;
    const searchLog = await this.searchLogRepository.findOne({
      where: { id: searchLogId },
      select: ['id', 'userId', 'deviceId'],
    });
    if (!searchLog || !this.canAccessSearchLog(searchLog, context)) {
      return;
    }

    const dedupedItems: ImpressionItem[] = [];
    for (const item of impressions) {
      const shouldRecord = await this.analyticsDedupService.claim({
        scope: 'search_impression',
        windowMs: 5 * 60 * 1000,
        parts: [
          context?.trustedVisitorId || searchLog.deviceId || searchLogId,
          searchLogId,
          item.productId,
          item.position,
          page,
        ],
      });
      if (shouldRecord) {
        dedupedItems.push(item);
      }
    }

    if (!dedupedItems.length) return;

    const entities = dedupedItems.map((item) =>
      this.impressionRepository.create({
        searchLogId,
        productId: item.productId,
        position: item.position,
        page,
      }),
    );

    await this.impressionRepository.save(entities);
  }

  async recordClick(
    params: RecordClickParams,
    context?: AnalyticsRequestContext,
  ): Promise<string> {
    const searchLog = await this.searchLogRepository.findOne({
      where: { id: params.searchLogId },
      select: ['id', 'userId', 'deviceId', 'normalizedKeyword'],
    });
    if (!searchLog || !this.canAccessSearchLog(searchLog, context)) {
      return '';
    }

    if (
      params.query &&
      searchLog.normalizedKeyword &&
      this.normalizeKeyword(params.query) !== searchLog.normalizedKeyword
    ) {
      return '';
    }

    const trustedVisitorId = context?.trustedVisitorId || searchLog.deviceId;
    const shouldRecord = await this.analyticsDedupService.claim({
      scope: 'search_click',
      windowMs: 10 * 60 * 1000,
      parts: [
        trustedVisitorId || params.searchLogId,
        params.searchLogId,
        params.productId,
        params.page || 1,
      ],
    });
    if (!shouldRecord) {
      return '';
    }

    const click = this.clickRepository.create({
      searchLogId: params.searchLogId,
      query: params.query,
      productId: params.productId,
      position: params.position,
      page: params.page || 1,
      userId: context?.userId || params.userId,
      sessionId: trustedVisitorId || params.sessionId || undefined,
      deviceId:
        trustedVisitorId || params.deviceId || params.sessionId || undefined,
      visitId:
        params.visitId || trustedVisitorId || params.sessionId || undefined,
      converted: false,
    });

    const saved = await this.clickRepository.save(click);
    return saved.id;
  }

  async markConversion(
    searchClickId: string,
    context?: AnalyticsRequestContext,
  ): Promise<void> {
    const click = await this.clickRepository.findOne({
      where: { id: searchClickId },
      select: ['id', 'userId', 'deviceId', 'converted'],
    });
    if (!click) return;

    const trustedVisitorId = context?.trustedVisitorId;
    const belongsToActor =
      (click.userId && context?.userId && click.userId === context.userId) ||
      (click.deviceId &&
        trustedVisitorId &&
        click.deviceId === trustedVisitorId);

    if (!belongsToActor || click.converted) {
      return;
    }

    await this.clickRepository.update(searchClickId, { converted: true });
  }

  normalizeKeyword(keyword: string): string {
    return keyword.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private canAccessSearchLog(
    searchLog: { userId?: string; deviceId?: string | null },
    context?: AnalyticsRequestContext,
  ): boolean {
    if (!context) return false;
    if (searchLog.userId && context.userId) {
      return searchLog.userId === context.userId;
    }
    if (searchLog.deviceId && context.trustedVisitorId) {
      return searchLog.deviceId === context.trustedVisitorId;
    }
    return Boolean(context.userId || context.trustedVisitorId);
  }

  private async updateHotSearch(
    normalizedKeyword: string,
    resultCount: number,
  ): Promise<void> {
    // 使用 INSERT ON CONFLICT 原子操作，消除竞态条件
    await this.dataSource.query(
      `
      INSERT INTO hot_searches (keyword, "search_count", "search_count_24h", "search_count_7d", "avg_result_count")
      VALUES ($1, 1, 1, 1, $2)
      ON CONFLICT (keyword) DO UPDATE SET
        "search_count" = hot_searches."search_count" + 1,
        "search_count_24h" = hot_searches."search_count_24h" + 1,
        "search_count_7d" = hot_searches."search_count_7d" + 1,
        "avg_result_count" = ROUND(hot_searches."avg_result_count" * 0.9 + $2 * 0.1)
      `,
      [normalizedKeyword, resultCount],
    );
  }
}
