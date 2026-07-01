import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HotSearchExperimentService } from './hot-search-experiment.service';
import {
  CreateExperimentDto,
  UpdateExperimentDto,
  TrackExperimentEventDto,
} from './dto/hot-search-experiment.dto';
import { ExperimentEventType } from './entities/hot-search-experiment-event.entity';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';

@ApiTags('Hot Search Experiments')
@Controller('admin/hot-search-experiments')
export class HotSearchExperimentController {
  constructor(private readonly experimentService: HotSearchExperimentService) {}

  @UseGuards(AdminGuard)
  @Get()
  findAll() {
    return this.experimentService.findAll();
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreateExperimentDto) {
    return this.experimentService.create(dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExperimentDto,
  ) {
    return this.experimentService.update(id, dto);
  }

  @UseGuards(AdminGuard)
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentService.start(id);
  }

  @UseGuards(AdminGuard)
  @Post(':id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentService.pause(id);
  }

  @UseGuards(AdminGuard)
  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentService.complete(id);
  }

  @UseGuards(AdminGuard)
  @Get(':id/results')
  getResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.experimentService.getResults(id);
  }

  /**
   * 公开端点：记录实验事件（前端调用）
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('track')
  async trackEvent(
    @Body() dto: TrackExperimentEventDto,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ) {
    await this.experimentService.trackEvent({
      experimentId: dto.experimentId,
      variantId: dto.variantId,
      eventType: dto.eventType as ExperimentEventType,
      keyword: dto.keyword,
      context: buildAnalyticsRequestContext(req, user?.id),
    });
    return { ok: true };
  }
}
