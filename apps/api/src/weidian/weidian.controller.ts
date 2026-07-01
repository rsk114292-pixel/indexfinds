import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WeidianService } from './weidian.service';
import { CacheRefreshService } from './cache-refresh.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Weidian')
@Controller('weidian')
export class WeidianController {
  constructor(
    private readonly weidianService: WeidianService,
    private readonly cacheRefreshService: CacheRefreshService,
  ) {}

  /**
   * 测试接口：抓取微店商品信息
   * GET /weidian/scrape?url=https://weidian.com/item.html?itemID=7569577612&wdtoken=xxx
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('scrape')
  async scrape(
    @Query('url') url?: string,
    @Query('itemId') itemId?: string,
    @Query('wdtoken') wdtoken?: string,
    @Query('forceRefresh') forceRefresh?: string,
  ) {
    // 提取 itemId
    let extractedItemId: string | undefined = itemId;
    if (!extractedItemId && url) {
      const extracted = this.weidianService.extractItemId(url);
      extractedItemId = extracted || undefined;
    }

    if (!extractedItemId) {
      throw new HttpException(
        '请提供有效的微店 URL 或 itemId',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 抓取数据
    const data = await this.weidianService.scrapeItem({
      itemId: extractedItemId,
      wdtoken,
      forceRefresh: forceRefresh === 'true',
    });

    return {
      success: true,
      data,
    };
  }

  /**
   * 测试接口：从 URL 提取 itemId
   * GET /weidian/extract-id?url=https://weidian.com/item.html?itemID=7569577612
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('extract-id')
  extractId(@Query('url') url: string) {
    if (!url) {
      throw new HttpException('请提供 URL 参数', HttpStatus.BAD_REQUEST);
    }

    const itemId = this.weidianService.extractItemId(url);

    if (!itemId) {
      throw new HttpException(
        '无法从 URL 中提取 itemId',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      itemId,
    };
  }

  /**
   * 管理后台：手动触发缓存刷新扫描
   * POST /weidian/cache/scan
   */
  @Post('cache/scan')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '手动触发缓存刷新扫描' })
  async manualCacheScan(
    @Body() body: { staleDays?: number; batchSize?: number },
  ) {
    const result = await this.cacheRefreshService.manualRefreshScan({
      staleDays: body.staleDays,
      batchSize: body.batchSize,
    });

    return {
      success: true,
      message: `已将 ${result.total} 个产品分 ${result.batches} 批加入刷新队列`,
      ...result,
    };
  }

  /**
   * 管理后台：获取缓存刷新状态
   * GET /weidian/cache/status
   */
  @Get('cache/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '获取缓存刷新状态' })
  getCacheStatus() {
    return {
      success: true,
      message: '缓存刷新服务运行中',
      config: {
        cooldownHours: 4,
        staleThresholdDays: 25,
        batchSize: 50,
        weeklySchedule: '每周日凌晨 3 点',
      },
    };
  }

  /**
   * 管理后台：获取死链统计
   * GET /weidian/dead-links/stats
   */
  @Get('dead-links/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '获取死链统计' })
  async getDeadLinkStats() {
    const stats = await this.cacheRefreshService.getDeadLinkStats();
    return { success: true, ...stats };
  }

  /**
   * 管理后台：重置产品死链状态（标记为误判）
   * POST /weidian/dead-links/:productId/reset
   */
  @Post('dead-links/:productId/reset')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '重置产品死链状态（误判处理）' })
  async resetDeadLink(@Param('productId') productId: string) {
    await this.cacheRefreshService.resetDeadLink(productId);
    return { success: true, message: '死链状态已重置' };
  }
}
