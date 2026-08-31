import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotSearch } from './entities/hot-search.entity';
import { SearchLog } from './entities/search-log.entity';
import { SearchImpression } from './entities/search-impression.entity';
import { SearchClick } from './entities/search-click.entity';
import { SearchRecordingService } from './search-recording.service';
import { SearchCTRService } from './search-ctr.service';
import { SearchAnalyticsAdminService } from './search-analytics-admin.service';

// Re-export types for backward compatibility
export type {
  SearchContext,
  SearchLogResult,
  ImpressionItem,
  ProductCTR,
  RecordClickParams,
  SearchAnalyticsOverview,
  TopSearchQuery,
  ZeroResultQuery,
  LowCTRQuery,
  ProductCTRRanking,
  SearchTrendItem,
} from './dto/search-analytics.types';

import type {
  SearchContext,
  SearchLogResult,
  ImpressionItem,
  ProductCTR,
  RecordClickParams,
} from './dto/search-analytics.types';
import type { AnalyticsRequestContext } from '../shared/utils/analytics-request';

/**
 * SearchAnalyticsService - Facade 服务
 *
 * 聚合以下子服务：
 * - SearchRecordingService: 记录搜索、曝光、点击
 * - SearchCTRService: CTR 计算
 * - SearchAnalyticsAdminService: 管理后台分析
 */
@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(
    @InjectRepository(HotSearch)
    private readonly hotSearchRepository: Repository<HotSearch>,
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @InjectRepository(SearchImpression)
    private readonly impressionRepository: Repository<SearchImpression>,
    @InjectRepository(SearchClick)
    private readonly clickRepository: Repository<SearchClick>,
    private readonly recordingService: SearchRecordingService,
    private readonly ctrService: SearchCTRService,
    private readonly adminService: SearchAnalyticsAdminService,
  ) {}

  // ============================================================
  // 记录方法 (委托给 SearchRecordingService)
  // ============================================================

  async logSearch(
    keyword: string,
    resultCount: number,
    context: SearchContext = {},
  ): Promise<SearchLogResult> {
    return this.recordingService.logSearch(keyword, resultCount, context);
  }

  async recordImpressions(
    searchLogId: string,
    impressions: ImpressionItem[],
    page: number = 1,
    context?: AnalyticsRequestContext,
  ): Promise<void> {
    return this.recordingService.recordImpressions(
      searchLogId,
      impressions,
      page,
      context,
    );
  }

  async recordClick(
    params: RecordClickParams,
    context?: AnalyticsRequestContext,
  ): Promise<string> {
    return this.recordingService.recordClick(params, context);
  }

  async markConversion(
    searchClickId: string,
    context?: AnalyticsRequestContext,
  ): Promise<void> {
    return this.recordingService.markConversion(searchClickId, context);
  }

  // ============================================================
  // CTR 方法 (委托给 SearchCTRService)
  // ============================================================

  async getProductCTR(
    productId: string,
    days: number = 30,
  ): Promise<ProductCTR | null> {
    return this.ctrService.getProductCTR(productId, days);
  }

  async batchGetProductCTR(
    productIds: string[],
    days: number = 30,
  ): Promise<Map<string, ProductCTR>> {
    return this.ctrService.batchGetProductCTR(productIds, days);
  }

  async getQueryProductCTR(
    query: string,
    productId: string,
    days: number = 30,
  ): Promise<ProductCTR | null> {
    return this.ctrService.getQueryProductCTR(query, productId, days);
  }

  // ============================================================
  // 管理分析 (委托给 SearchAnalyticsAdminService)
  // ============================================================

  async getSearchAnalytics(days: number): Promise<any>;
  async getSearchAnalytics(startDate: Date, endDate: Date): Promise<any>;
  async getSearchAnalytics(startDateOrDays: Date | number, endDate?: Date) {
    if (typeof startDateOrDays === 'number') {
      return this.adminService.getSearchAnalytics(startDateOrDays);
    }
    return this.adminService.getSearchAnalytics(startDateOrDays, endDate);
  }

  async getTopSearchQueries(limit: number = 100, days: number = 7) {
    return this.adminService.getTopSearchQueries(limit, days);
  }

  async getTopSearchQueriesByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ) {
    return this.adminService.getTopSearchQueriesByRange(
      startDate,
      endDate,
      limit,
    );
  }

  async getZeroResultQueries(limit: number = 50, days: number = 7) {
    return this.adminService.getZeroResultQueries(limit, days);
  }

  async getZeroResultQueriesByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
  ) {
    return this.adminService.getZeroResultQueriesByRange(
      startDate,
      endDate,
      limit,
    );
  }

  async getZeroResultQueriesWithSuggestions(
    limit: number = 50,
    days: number = 7,
  ) {
    return this.adminService.getZeroResultQueriesWithSuggestions(limit, days);
  }

  async getZeroResultQueriesWithSuggestionsByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
  ) {
    return this.adminService.getZeroResultQueriesWithSuggestionsByRange(
      startDate,
      endDate,
      limit,
    );
  }

  async getLowCTRQueries(limit: number = 50, minImpressions: number = 10) {
    return this.adminService.getLowCTRQueries(limit, minImpressions);
  }

  async getLowCTRQueriesByRange(
    startDate: Date,
    endDate: Date,
    limit: number = 50,
    minImpressions: number = 10,
  ) {
    return this.adminService.getLowCTRQueriesByRange(
      startDate,
      endDate,
      limit,
      minImpressions,
    );
  }

  async getProductCTRRanking(limit: number = 100) {
    return this.adminService.getProductCTRRanking(limit);
  }

  async getSearchTrends(days: number = 30, groupBy: 'hour' | 'day' = 'day') {
    return this.adminService.getSearchTrends(days, groupBy);
  }

  async getSearchTrendsByRange(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' = 'day',
  ) {
    return this.adminService.getSearchTrendsByRange(
      startDate,
      endDate,
      groupBy,
    );
  }

  // ============================================================
  // 热搜和建议 (本地实现)
  // ============================================================

  async getHotSearches(limit: number = 10): Promise<HotSearch[]> {
    const now = new Date();

    // 时间窗口通用条件
    const timeWindowCondition =
      '(hs.display_start_at IS NULL OR hs.display_start_at <= :now) AND (hs.display_end_at IS NULL OR hs.display_end_at >= :now)';

    // 1. 取置顶词
    const pinned = await this.hotSearchRepository
      .createQueryBuilder('hs')
      .where('hs.is_pinned = true')
      .andWhere('hs.is_blocked = false')
      .andWhere("LOWER(TRIM(hs.keyword)) <> 'search_term_string'")
      .andWhere(timeWindowCondition, { now })
      .orderBy('hs.sort_order', 'ASC', 'NULLS LAST')
      .take(limit)
      .getMany();

    const remaining = limit - pinned.length;
    if (remaining <= 0) return pinned.slice(0, limit);

    // 2. 取自动词填充剩余名额
    const pinnedIds = pinned.map((p) => p.id);
    const autoQb = this.hotSearchRepository
      .createQueryBuilder('hs')
      .where('hs.is_pinned = false')
      .andWhere('hs.is_blocked = false')
      .andWhere("LOWER(TRIM(hs.keyword)) <> 'search_term_string'")
      .andWhere('hs.search_count_7d > 0')
      .andWhere('hs.avg_result_count > 0')
      .andWhere(timeWindowCondition, { now });

    if (pinnedIds.length > 0) {
      autoQb.andWhere('hs.id NOT IN (:...pinnedIds)', { pinnedIds });
    }

    const auto = await autoQb
      .orderBy('hs.search_count_7d', 'DESC')
      .take(remaining)
      .getMany();

    return [...pinned, ...auto];
  }

  async getSuggestions(prefix: string, limit: number = 5): Promise<string[]> {
    const now = new Date();
    const results = await this.hotSearchRepository
      .createQueryBuilder('hs')
      .select('hs.keyword')
      .where('hs.keyword ILIKE :prefix', { prefix: `${prefix}%` })
      .andWhere("LOWER(TRIM(hs.keyword)) <> 'search_term_string'")
      .andWhere('hs.avg_result_count > 0')
      .andWhere('hs.is_blocked = false')
      .andWhere(
        '(hs.display_start_at IS NULL OR hs.display_start_at <= :now)',
        { now },
      )
      .andWhere('(hs.display_end_at IS NULL OR hs.display_end_at >= :now)', {
        now,
      })
      .orderBy('hs.search_count_7d', 'DESC')
      .limit(limit)
      .getMany();
    return results.map((r) => r.keyword);
  }

  // ============================================================
  // 维护方法 (本地实现)
  // ============================================================

  async resetDaily(): Promise<void> {
    await this.hotSearchRepository
      .createQueryBuilder()
      .update()
      .set({ searchCount24h: 0 })
      .execute();
  }

  async resetWeekly(): Promise<void> {
    await this.hotSearchRepository
      .createQueryBuilder()
      .update()
      .set({ searchCount7d: 0 })
      .execute();
  }

  /**
   * 清理过期日志（分批删除避免锁表）
   *
   * 使用分批删除策略，每次删除固定数量的记录，
   * 避免单次大批量删除导致的数据库锁表问题
   */
  async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const batchSize = 1000;
    let totalDeleted = 0;

    // 分批删除搜索日志
    const searchLogDeleted = await this.deleteBatchByDate(
      this.searchLogRepository,
      'created_at',
      cutoffDate,
      batchSize,
    );
    totalDeleted += searchLogDeleted;
    this.logger.log(`Cleaned up ${searchLogDeleted} old search logs`);

    // 分批删除曝光记录
    const impressionDeleted = await this.deleteBatchByDate(
      this.impressionRepository,
      'createdAt',
      cutoffDate,
      batchSize,
    );
    totalDeleted += impressionDeleted;
    this.logger.log(`Cleaned up ${impressionDeleted} old impressions`);

    // 分批删除点击记录
    const clickDeleted = await this.deleteBatchByDate(
      this.clickRepository,
      'createdAt',
      cutoffDate,
      batchSize,
    );
    totalDeleted += clickDeleted;
    this.logger.log(`Cleaned up ${clickDeleted} old clicks`);

    this.logger.log(
      `Total cleanup: ${totalDeleted} records deleted before ${cutoffDate.toISOString()}`,
    );
  }

  /**
   * 分批删除指定日期之前的记录
   *
   * @param repository 目标仓库
   * @param dateColumn 日期字段名
   * @param cutoffDate 截止日期
   * @param batchSize 每批删除数量
   * @returns 总共删除的记录数
   */
  private async deleteBatchByDate(
    repository: any,
    dateColumn: string,
    cutoffDate: Date,
    batchSize: number,
  ): Promise<number> {
    let totalDeleted = 0;
    let deletedInBatch = 0;

    do {
      // 使用子查询限制删除数量
      const result = await repository
        .createQueryBuilder()
        .delete()
        .where(
          `id IN (
            SELECT id FROM (
              SELECT id FROM ${repository.metadata.tableName}
              WHERE ${dateColumn} < :cutoffDate
              LIMIT :batchSize
            ) as subquery
          )`,
          { cutoffDate, batchSize },
        )
        .execute();

      deletedInBatch = result.affected || 0;
      totalDeleted += deletedInBatch;

      // 批次间短暂延时，降低数据库压力
      if (deletedInBatch >= batchSize) {
        await this.sleep(100);
      }
    } while (deletedInBatch >= batchSize);

    return totalDeleted;
  }

  /**
   * 延迟辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
