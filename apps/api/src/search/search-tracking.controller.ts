import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SearchAnalyticsService } from './search-analytics.service';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  RecordImpressionsDto,
  RecordSearchClickDto,
  MarkConversionDto,
} from './dto/search-tracking.dto';
import type { Request } from 'express';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';

@ApiTags('Search Tracking')
@Controller('search/tracking')
@Public()
@Throttle({ default: { limit: 30, ttl: 60000 } })
@UseGuards(OptionalJwtAuthGuard)
export class SearchTrackingController {
  constructor(private readonly analyticsService: SearchAnalyticsService) {}

  /**
   * 记录搜索曝光（批量）
   * 前端在搜索结果渲染后调用
   */
  @Post('impressions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordImpressions(
    @Body() dto: RecordImpressionsDto,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ): Promise<void> {
    await this.analyticsService.recordImpressions(
      dto.searchLogId,
      dto.impressions,
      dto.page,
      buildAnalyticsRequestContext(req, user?.id),
    );
  }

  /**
   * 记录搜索点击
   * 前端在用户点击商品时调用
   */
  @Post('click')
  async recordClick(
    @Body() dto: RecordSearchClickDto,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ): Promise<{ clickId: string }> {
    const clickId = await this.analyticsService.recordClick(
      {
        searchLogId: dto.searchLogId,
        query: dto.query,
        productId: dto.productId,
        position: dto.position,
        page: dto.page,
        userId: user?.id,
        sessionId: dto.sessionId,
        deviceId: dto.deviceId,
        visitId: dto.visitId,
      },
      buildAnalyticsRequestContext(req, user?.id),
    );
    return { clickId };
  }

  /**
   * 标记转化
   * 前端在用户跳转到购买平台时调用
   */
  @Post('conversion')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markConversion(
    @Body() dto: MarkConversionDto,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ): Promise<void> {
    await this.analyticsService.markConversion(
      dto.searchClickId,
      buildAnalyticsRequestContext(req, user?.id),
    );
  }
}
