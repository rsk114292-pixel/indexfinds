import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 健康检查端点 — Docker HEALTHCHECK 和监控系统使用
   * GET /health
   */
  @Public()
  @Get('health')
  async healthCheck() {
    return this.appService.healthCheck();
  }

  /**
   * 测试缓存功能
   * GET /test-cache
   */
  @Public()
  @Get('test-cache')
  async testCache() {
    return this.appService.testCache();
  }
}
