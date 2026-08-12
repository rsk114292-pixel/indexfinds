import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import {
  VisitSessionService,
  TrafficOverview,
  ChannelBreakdown,
  SourceBreakdown,
  CampaignBreakdown,
  LandingPageBreakdown,
  TrafficTrend,
  GeoBreakdown,
  DeviceBreakdown,
  TrafficEngagementOverview,
  CaptureDiagnosticsOverview,
  CaptureLossBreakdown,
  ReconciliationOverview,
  CaptureDiagnosticsDimensionBreakdown,
  AttributionQualityOverview,
  DirectBreakdown,
  SourceQualityDiagnostics,
  TrafficBehaviorFunnelOverview,
  TrafficBehaviorFunnelBySource,
  TrafficBehaviorFunnelByDimension,
  TrafficBehaviorSample,
  type AdminTrafficScopeOptions,
} from './visit-session.service';
import { TrafficDefenseService } from './traffic-defense.service';
import {
  CreateTrafficBlockDto,
  IgnoreTrafficCandidateDto,
  QueryTrafficBlocksDto,
  QueryTrafficDefenseCandidatesDto,
} from './dto/traffic-defense.dto';

@ApiTags('Admin Traffic Analytics')
@Controller('admin/analytics/traffic')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminTrafficController {
  constructor(
    private readonly visitSessionService: VisitSessionService,
    private readonly trafficDefenseService: TrafficDefenseService,
  ) {}

  private parseDates(startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end);
    if (!startDate) {
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  private parseScope(scope?: string): AdminTrafficScopeOptions {
    return scope === 'raw' || scope === 'all' || scope === 'original'
      ? { scope: 'raw' }
      : { scope: 'customer' };
  }

  @Get('overview')
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficOverview> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getOverview(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('defense/candidates')
  async getDefenseCandidates(@Query() query: QueryTrafficDefenseCandidatesDto) {
    return this.trafficDefenseService.getCandidates(query);
  }

  @Get('defense/blocks')
  async getDefenseBlocks(@Query() query: QueryTrafficBlocksDto) {
    return this.trafficDefenseService.getBlocks(query);
  }

  @Post('defense/blocks')
  async createDefenseBlock(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTrafficBlockDto,
  ) {
    return this.trafficDefenseService.createBlock(dto, req.user.id);
  }

  @Post('defense/ignore')
  async ignoreDefenseCandidate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: IgnoreTrafficCandidateDto,
  ) {
    return this.trafficDefenseService.ignoreCandidate(dto, req.user.id);
  }

  @Post('defense/blocks/:id/expire')
  async expireDefenseBlock(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.trafficDefenseService.expireBlock(id, req.user.id);
  }

  @Get('engagement/overview')
  async getEngagementOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficEngagementOverview> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getEngagementOverview(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('by-channel')
  async getByChannel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<ChannelBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getByChannel(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('by-source')
  async getBySource(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<SourceBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBySource(
      start,
      end,
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('by-campaign')
  async getByCampaign(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<CampaignBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getByCampaign(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('by-landing-page')
  async getByLandingPage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<LandingPageBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getByLandingPage(
      start,
      end,
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('trends')
  async getTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'hour',
    @Query('scope') scope?: string,
  ): Promise<TrafficTrend[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getTrends(
      start,
      end,
      groupBy || 'day',
      this.parseScope(scope),
    );
  }

  @Get('geo')
  async getGeoDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<GeoBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getGeoDistribution(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('devices')
  async getDeviceDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<DeviceBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getDeviceDistribution(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('capture-diagnostics/overview')
  async getCaptureDiagnosticsOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<CaptureDiagnosticsOverview> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getCaptureDiagnosticsOverview(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('capture-diagnostics/loss-breakdown')
  async getCaptureLossBreakdown(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<CaptureLossBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getCaptureLossBreakdown(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('reconciliation/overview')
  async getReconciliationOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<ReconciliationOverview> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getReconciliationOverview(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('capture-diagnostics/breakdown')
  async getCaptureDiagnosticsBreakdown(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dimension')
    dimension?:
      | 'source'
      | 'campaign'
      | 'browser'
      | 'deviceType'
      | 'browserContext'
      | 'locale',
    @Query('scope') scope?: string,
  ): Promise<CaptureDiagnosticsDimensionBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getCaptureDiagnosticsBreakdown(
      start,
      end,
      dimension || 'source',
      this.parseScope(scope),
    );
  }

  @Get('attribution-quality/overview')
  async getAttributionQualityOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<AttributionQualityOverview> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getAttributionQualityOverview(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('attribution-quality/direct-breakdown')
  async getDirectBreakdown(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<DirectBreakdown[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getDirectBreakdown(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('attribution-quality/source-diagnostics')
  async getSourceQualityDiagnostics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('source') source?: string,
    @Query('scope') scope?: string,
  ): Promise<SourceQualityDiagnostics> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getSourceQualityDiagnostics(
      start,
      end,
      source || 'indexfinds.com',
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/overview')
  async getBehaviorFunnelOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorFunnelOverview> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelOverview(
      start,
      end,
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/by-source')
  async getBehaviorFunnelBySource(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorFunnelBySource[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelBySource(
      start,
      end,
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/by-campaign')
  async getBehaviorFunnelByCampaign(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorFunnelByDimension[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelByCampaign(
      start,
      end,
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/by-landing-page')
  async getBehaviorFunnelByLandingPage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorFunnelByDimension[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelByLandingPage(
      start,
      end,
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/source-samples')
  async getBehaviorFunnelSamplesBySource(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorSample[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelSamplesBySource(
      start,
      end,
      source || '(direct)',
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/campaign-samples')
  async getBehaviorFunnelSamplesByCampaign(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaign') campaign?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorSample[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelSamplesByCampaign(
      start,
      end,
      campaign || '(not set)',
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }

  @Get('behavior-funnel/landing-page-samples')
  async getBehaviorFunnelSamplesByLandingPage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('landingPage') landingPage?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
  ): Promise<TrafficBehaviorSample[]> {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.visitSessionService.getBehaviorFunnelSamplesByLandingPage(
      start,
      end,
      landingPage || '/',
      limit ? parseInt(limit) : 20,
      this.parseScope(scope),
    );
  }
}
