import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboundTrackingService } from './outbound-tracking.service';
import { RecordOutboundClickDto } from './dto/search-tracking.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReferralService } from '../referral/referral.service';
import { AttributionEventType } from '../referral/entities/referral-attribution.entity';
import { PointsEvents } from '../points/points.events';
import type { EarnPointsRequestEvent } from '../points/points.events';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';

/**
 * 外跳追踪 API
 * 记录所有点击"购买"按钮跳转到代购平台的行为
 */
@ApiTags('Outbound Tracking')
@Controller('outbound')
export class OutboundTrackingController {
  constructor(
    private readonly outboundTrackingService: OutboundTrackingService,
    private readonly referralService: ReferralService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 记录外跳点击
   * POST /outbound/click
   */
  @Post('click')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async recordOutboundClick(
    @Body() dto: RecordOutboundClickDto,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ) {
    const requestContext = buildAnalyticsRequestContext(req, user?.id);
    const outboundId = await this.outboundTrackingService.recordOutboundClick(
      {
        ...dto,
        userId: user?.id,
      },
      requestContext,
    );

    const referralCookie = req.cookies?.['mf_ref_attrib'];
    const actorUserId = user?.id;
    if (actorUserId) {
      this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
        userId: actorUserId,
        action: 'first_favorite',
        referenceType: 'user',
        referenceId: actorUserId,
        metadata: {
          source: 'purchase_click',
          productId: dto.productId,
          platform: dto.platformType,
        },
      } as EarnPointsRequestEvent);
    }

    if (referralCookie) {
      await this.referralService.triggerAttributionFromCookie(
        referralCookie,
        AttributionEventType.PURCHASE_CLICK,
        actorUserId,
        {
          productId: dto.productId,
          platform: dto.platformType,
        },
      );

      if (actorUserId) {
        await this.referralService.checkAndFinalizeConversion(actorUserId);
      }
    }

    return { success: true, outboundId };
  }

  /**
   * 获取外跳总览（管理后台用）
   * GET /outbound/overview?days=7
   */
  @Get('overview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getOverview(@Query('days') days?: string) {
    const daysNum = Math.min(Math.max(parseInt(days || '', 10) || 7, 1), 365);
    return this.outboundTrackingService.getOverview(daysNum);
  }

  /**
   * 获取热门商品
   * GET /outbound/top-products?days=7&limit=20
   */
  @Get('top-products')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getTopProducts(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const daysNum = Math.min(Math.max(parseInt(days || '', 10) || 7, 1), 365);
    const limitNum = Math.min(
      Math.max(parseInt(limit || '', 10) || 20, 1),
      100,
    );
    return this.outboundTrackingService.getTopProducts(daysNum, limitNum);
  }

  /**
   * 获取外跳趋势
   * GET /outbound/trends?days=7
   */
  @Get('trends')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getTrends(@Query('days') days?: string) {
    const daysNum = Math.min(Math.max(parseInt(days || '', 10) || 7, 1), 365);
    return this.outboundTrackingService.getTrends(daysNum);
  }
}
