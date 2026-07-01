import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ReferralService } from './referral.service';
import { TrackReferralExperimentDto } from './dto/track-referral-experiment.dto';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';
import {
  REFERRAL_TRACKING_SIGNATURE_HEADER,
  REFERRAL_TRACKING_TIMESTAMP_HEADER,
  verifyReferralTrackingPayload,
} from '../shared/utils/referral-tracking-signature';

/** 校验 redirect 为站内相对路径，防止 Open Redirect 攻击 */
export function getSafeRedirect(raw?: string): string {
  if (!raw) return '/';
  try {
    const url = new URL(raw, 'http://localhost');
    if (url.origin !== 'http://localhost') return '/';
    return url.pathname + url.search;
  } catch {
    return '/';
  }
}

@ApiTags('Referral')
@Controller()
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  private getTrustedClickInput(
    req: Request,
    body: {
      code: string;
      sessionId?: string;
      landingPage?: string;
      redirectTo?: string;
      userAgent?: string;
      ip?: string;
      referer?: string;
    },
  ) {
    const requestContext = buildAnalyticsRequestContext(req);
    const signature = Array.isArray(
      req.headers[REFERRAL_TRACKING_SIGNATURE_HEADER],
    )
      ? req.headers[REFERRAL_TRACKING_SIGNATURE_HEADER][0]
      : req.headers[REFERRAL_TRACKING_SIGNATURE_HEADER];
    const timestamp = Array.isArray(
      req.headers[REFERRAL_TRACKING_TIMESTAMP_HEADER],
    )
      ? req.headers[REFERRAL_TRACKING_TIMESTAMP_HEADER][0]
      : req.headers[REFERRAL_TRACKING_TIMESTAMP_HEADER];
    const forwardedReferer =
      typeof req.headers.referer === 'string' ? req.headers.referer : '';

    const hasTrustedForwardedContext = verifyReferralTrackingPayload(
      {
        timestamp: timestamp || '',
        code: body.code,
        sessionId: body.sessionId,
        landingPage: body.landingPage,
        redirectTo: body.redirectTo,
        ip: body.ip,
        userAgent: body.userAgent,
        referer: body.referer,
      },
      typeof signature === 'string' ? signature : undefined,
    );

    return {
      sessionId:
        hasTrustedForwardedContext && body.sessionId
          ? body.sessionId
          : requestContext.trustedVisitorId,
      userAgent:
        hasTrustedForwardedContext && body.userAgent
          ? body.userAgent
          : requestContext.userAgent,
      ip:
        hasTrustedForwardedContext && body.ip
          ? body.ip
          : requestContext.ipAddress,
      referer:
        hasTrustedForwardedContext && body.referer
          ? body.referer
          : forwardedReferer,
      requestContext,
    };
  }

  // 获取当前用户的推荐码
  @Get('referral/my-code')
  @UseGuards(JwtAuthGuard)
  async getMyCode(@CurrentUser() user: { id: string }) {
    const code = await this.referralService.getOrCreateUserCode(user.id);
    const clickMetrics = await this.referralService.getCodeClickMetrics(
      code.id,
    );
    return {
      code: code.code,
      shareUrl: `/r/${code.code}`,
      totalClicks: clickMetrics.trustedClicks,
      trustedClicks: clickMetrics.trustedClicks,
      rawClicks: clickMetrics.rawClicks,
      totalConversions: code.totalConversions,
    };
  }

  // 获取用户推荐统计
  @Get('referral/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser() user: { id: string }) {
    return this.referralService.getUserStats(user.id);
  }

  @Get('referral/my-activation')
  @UseGuards(JwtAuthGuard)
  async getMyActivation(@CurrentUser() user: { id: string }) {
    return this.referralService.getCurrentUserActivationProgress(user.id);
  }

  // 获取推荐明细（统计 + 被推荐用户列表）
  @Get('referral/details')
  @UseGuards(JwtAuthGuard)
  async getReferralDetails(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referralService.getReferralDetails(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('referral/experiment')
  @UseGuards(JwtAuthGuard)
  getExperimentAssignment(@CurrentUser() user: { id: string }) {
    return this.referralService.getExperimentAssignment(user.id);
  }

  @Post('referral/experiment/event')
  @UseGuards(JwtAuthGuard)
  async trackExperimentEvent(
    @CurrentUser() user: { id: string },
    @Body() dto: TrackReferralExperimentDto,
  ) {
    await this.referralService.trackExperimentEvent(user.id, dto);
    return { success: true };
  }

  // 追踪商品浏览（用于转化验证）
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('referral/track-view')
  async trackProductView(
    @Body() body: { productId: string },
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ) {
    const { productId } = body;
    if (!productId) {
      return { success: false, message: 'productId is required' };
    }

    // 从 Cookie 中获取推荐归因信息
    const refCookie = req.cookies?.mf_ref_attrib;
    if (!refCookie) {
      return { success: false, message: 'No referral attribution found' };
    }

    const attribution = await this.referralService.trackProductViewFromCookie(
      refCookie,
      productId,
      user?.id,
      buildAnalyticsRequestContext(req, user?.id),
    );

    if (attribution) {
      if (user?.id) {
        await this.referralService.checkAndFinalizeConversion(user.id);
      }
      return { success: true, attributionId: attribution.id };
    }

    return { success: false, message: 'Failed to create attribution' };
  }

  // 记录推荐链接点击（由前端 Route Handler 服务端调用）
  @Public()
  @Post('referral/track-click')
  async trackClick(
    @Body()
    body: {
      code: string;
      sessionId?: string;
      landingPage?: string;
      redirectTo?: string;
      userAgent?: string;
      ip?: string;
      referer?: string;
    },
    @Req() req: Request,
  ) {
    const { code } = body;
    if (!code) {
      return { success: false, message: 'code is required' };
    }

    const trustedInput = this.getTrustedClickInput(req, body);

    const click = await this.referralService.recordClick({
      code,
      sessionId: trustedInput.sessionId,
      landingPage: body.landingPage,
      redirectTo: body.redirectTo,
      userAgent: trustedInput.userAgent,
      ip: trustedInput.ip,
      referer: trustedInput.referer,
    });

    if (!click) {
      return { success: false, message: 'Invalid or inactive referral code' };
    }

    // 返回 cookie 值，由前端 Route Handler 在同域设置
    const cookieValue = new URLSearchParams({
      ref_click_id: click.id,
      referral_code: code.toUpperCase(),
      exp: String(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).toString();

    return { success: true, cookieValue };
  }
}
