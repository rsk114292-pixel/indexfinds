import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchAnalyticsService } from './search-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * 搜索分析 API（管理员专用）
 */
@ApiTags('Search Analytics')
@Controller('admin/search-analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SearchAnalyticsController {
  constructor(private readonly analyticsService: SearchAnalyticsService) {}

  private resolveRange(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) return null;

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime())
    ) {
      return null;
    }

    return { start: parsedStart, end: parsedEnd };
  }

  /**
   * 获取搜索概览数据
   * GET /admin/search-analytics/overview?days=7
   */
  @Get('overview')
  async getOverview(
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const range = this.resolveRange(startDate, endDate);
    if (range) {
      return this.analyticsService.getSearchAnalytics(range.start, range.end);
    }
    const safeDays = Math.min(Math.max(parseInt(days || '', 10) || 7, 1), 365);
    return this.analyticsService.getSearchAnalytics(safeDays);
  }

  /**
   * 获取热门搜索词
   * GET /admin/search-analytics/top-queries?limit=100&days=7
   */
  @Get('top-queries')
  async getTopQueries(
    @Query('limit') limit?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const safeLimit = Math.min(
      Math.max(parseInt(limit || '', 10) || 100, 1),
      500,
    );
    const range = this.resolveRange(startDate, endDate);
    if (range) {
      return this.analyticsService.getTopSearchQueriesByRange(
        range.start,
        range.end,
        safeLimit,
      );
    }
    const safeDays = Math.min(Math.max(parseInt(days || '', 10) || 7, 1), 365);
    return this.analyticsService.getTopSearchQueries(safeLimit, safeDays);
  }

  /**
   * 获取零结果搜索词（带智能建议）
   * GET /admin/search-analytics/zero-results?limit=50&days=7
   */
  @Get('zero-results')
  async getZeroResultQueries(
    @Query('limit') limit?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const safeLimit = Math.min(
      Math.max(parseInt(limit || '', 10) || 50, 1),
      500,
    );
    const range = this.resolveRange(startDate, endDate);
    if (range) {
      return this.analyticsService.getZeroResultQueriesWithSuggestionsByRange(
        range.start,
        range.end,
        safeLimit,
      );
    }
    const safeDays = Math.min(Math.max(parseInt(days || '', 10) || 7, 1), 365);
    return this.analyticsService.getZeroResultQueriesWithSuggestions(
      safeLimit,
      safeDays,
    );
  }

  /**
   * 获取低 CTR 搜索词（需要优化）
   * GET /admin/search-analytics/low-ctr?limit=50&minImpressions=10
   */
  @Get('low-ctr')
  async getLowCTRQueries(
    @Query('limit') limit?: string,
    @Query('minImpressions') minImpressions?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const safeLimit = Math.min(
      Math.max(parseInt(limit || '', 10) || 50, 1),
      500,
    );
    const safeMinImpressions = Math.min(
      Math.max(parseInt(minImpressions || '', 10) || 10, 1),
      10000,
    );
    const range = this.resolveRange(startDate, endDate);
    if (range) {
      return this.analyticsService.getLowCTRQueriesByRange(
        range.start,
        range.end,
        safeLimit,
        safeMinImpressions,
      );
    }
    return this.analyticsService.getLowCTRQueries(
      safeLimit,
      safeMinImpressions,
    );
  }

  /**
   * 获取商品 CTR 排名
   * GET /admin/search-analytics/product-ctr?limit=100
   */
  @Get('product-ctr')
  async getProductCTRRanking(@Query('limit') limit?: string) {
    const safeLimit = Math.min(
      Math.max(parseInt(limit || '', 10) || 100, 1),
      500,
    );
    return this.analyticsService.getProductCTRRanking(safeLimit);
  }

  /**
   * 获取搜索趋势（按天/小时）
   * GET /admin/search-analytics/trends?days=30&groupBy=day
   */
  @Get('trends')
  async getSearchTrends(
    @Query('days') days?: string,
    @Query('groupBy') groupBy: 'hour' | 'day' = 'day',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const range = this.resolveRange(startDate, endDate);
    if (range) {
      return this.analyticsService.getSearchTrendsByRange(
        range.start,
        range.end,
        groupBy,
      );
    }
    const safeDays = Math.min(Math.max(parseInt(days || '', 10) || 30, 1), 365);
    return this.analyticsService.getSearchTrends(safeDays, groupBy);
  }
}
