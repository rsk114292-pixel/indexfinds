import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CreateClickEventDto } from './dto/create-click-event.dto';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';

@ApiTags('Analytics (Legacy)')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Legacy outbound click event endpoint.
   * Kept for referral attribution and conversion checks only.
   * Primary outbound analytics should use /outbound/click.
   */
  @ApiOperation({
    summary: 'Legacy referral purchase click event',
    deprecated: true,
  })
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('click-events')
  async recordLegacyClickEvent(
    @Body() dto: CreateClickEventDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
    @CurrentUser() user?: { id: string },
  ) {
    const referralCookie = req.cookies?.['mf_ref_attrib'];
    const requestContext = buildAnalyticsRequestContext(req, user?.id);

    return this.analyticsService.recordLegacyReferralClickEvent(
      { ...dto, userAgent, userId: user?.id },
      referralCookie,
      requestContext,
    );
  }
}
