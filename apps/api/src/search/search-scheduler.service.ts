import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SearchAnalyticsService } from './search-analytics.service';

@Injectable()
export class SearchSchedulerService {
  private readonly logger = new Logger(SearchSchedulerService.name);

  constructor(private readonly analyticsService: SearchAnalyticsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReset() {
    this.logger.log('定时任务：重置 24h 搜索计数...');
    await this.analyticsService.resetDaily();
    this.logger.log('24h 搜索计数重置完成');
  }

  @Cron('0 0 * * 1') // 每周一凌晨
  async handleWeeklyReset() {
    this.logger.log('定时任务：重置 7d 搜索计数...');
    await this.analyticsService.resetWeekly();
    this.logger.log('7d 搜索计数重置完成');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleLogCleanup() {
    this.logger.log('定时任务：清理 90 天前日志...');
    await this.analyticsService.cleanupOldLogs();
    this.logger.log('日志清理完成');
  }
}
