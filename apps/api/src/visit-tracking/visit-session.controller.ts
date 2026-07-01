import { Controller, Post, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VisitSessionService } from './visit-session.service';
import { CreateVisitSessionDto } from './dto/create-visit-session.dto';
import { UpdateVisitDiagnosticsDto } from './dto/update-visit-diagnostics.dto';
import { UpdateVisitEngagementDto } from './dto/update-visit-engagement.dto';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';

@ApiTags('Visit Tracking')
@Controller('visit-sessions')
export class VisitSessionController {
  constructor(private readonly visitSessionService: VisitSessionService) {}

  @Post()
  @Public()
  @Throttle({
    short: { limit: 3, ttl: 1000 },
    long: { limit: 60, ttl: 60000 },
  })
  async create(
    @Body() dto: CreateVisitSessionDto,
    @Req() req: Request,
  ): Promise<{ id: string }> {
    const referralCookie = req.cookies?.['mf_ref_attrib'];
    const requestContext = buildAnalyticsRequestContext(req);
    return this.visitSessionService.create(
      dto,
      requestContext.ipAddress,
      requestContext.userAgent,
      referralCookie,
      requestContext.trustedVisitorId,
      requestContext.countryCode,
    );
  }

  @Patch('diagnostics')
  @Public()
  @Throttle({
    short: { limit: 5, ttl: 1000 },
    long: { limit: 120, ttl: 60000 },
  })
  async updateDiagnostics(
    @Body() dto: UpdateVisitDiagnosticsDto,
    @Req() req: Request,
  ): Promise<{ updated: boolean }> {
    return this.visitSessionService.updateDiagnostics(
      dto,
      buildAnalyticsRequestContext(req),
    );
  }

  @Patch('engagement')
  @Public()
  @Throttle({
    short: { limit: 4, ttl: 1000 },
    long: { limit: 120, ttl: 60000 },
  })
  async updateEngagement(
    @Body() dto: UpdateVisitEngagementDto,
    @Req() req: Request,
  ): Promise<{ updated: boolean }> {
    return this.visitSessionService.updateEngagement(
      dto,
      buildAnalyticsRequestContext(req),
    );
  }

  @Post('engagement')
  @Public()
  @Throttle({
    short: { limit: 4, ttl: 1000 },
    long: { limit: 120, ttl: 60000 },
  })
  async updateEngagementBeacon(
    @Body() dto: UpdateVisitEngagementDto,
    @Req() req: Request,
  ): Promise<{ updated: boolean }> {
    return this.visitSessionService.updateEngagement(
      dto,
      buildAnalyticsRequestContext(req),
    );
  }

  @Patch('associate')
  @UseGuards(JwtAuthGuard)
  async associateUser(
    @Body() body: { sessionId: string },
    @Req() req: Request,
  ): Promise<void> {
    const userId = (req as any).user?.id;
    if (!userId) return;
    return this.visitSessionService.associateUser(body.sessionId, userId);
  }
}
