import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchMetricsService } from './search-metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * 搜索系统性能监控端点
 * 提供 Prometheus 格式的 metrics
 */
@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SearchMetricsController {
  constructor(private readonly metricsService: SearchMetricsService) {}

  /**
   * Prometheus metrics 端点
   */
  @Get()
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns search system metrics in Prometheus format',
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  /**
   * 召回路径命中率统计（供仪表盘使用）
   */
  @Get('recall-hit-rates')
  @ApiOperation({
    summary: 'Get recall path hit rates',
    description: 'Returns hit rates for each recall path',
  })
  getRecallHitRates(): Record<string, number> {
    return this.metricsService.getRecallHitRates();
  }
}
