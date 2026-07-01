import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
  Inject,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('Settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private settingsService: SettingsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  async getAll() {
    const settings = await this.settingsService.getAll();
    return settings.map((s) => ({
      ...s,
      value: s.isSecret ? '******' : s.value,
    }));
  }

  @Get('ai-config')
  async getAIConfig() {
    const config = await this.settingsService.getAIConfig();
    // 脱敏 API Key：只显示前 3 位和后 4 位
    const masked =
      config.apiKey.length > 8
        ? config.apiKey.slice(0, 3) + '****' + config.apiKey.slice(-4)
        : config.apiKey
          ? '******'
          : '';

    // 读取今日使用量
    const today = new Date().toISOString().slice(0, 10);
    const usageCacheKey = `ai:daily:usage:${today}`;
    const used = (await this.cacheManager.get<number>(usageCacheKey)) || 0;

    return {
      apiKey: masked,
      model: config.model,
      endpoint: config.endpoint,
      usage: { used, date: today },
    };
  }

  @Post('ai-config/test')
  async testAIConfig() {
    const config = await this.settingsService.getAIConfig();

    if (!config.apiKey) {
      return { success: false, message: 'API Key 未配置' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          input: {
            messages: [
              {
                role: 'user',
                content: [{ text: 'Hello, respond with "OK" only.' }],
              },
            ],
          },
          parameters: { max_tokens: 10, result_format: 'message' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: '连接成功，API 可用' };
      }

      const errorText = await response.text();
      this.logger.warn(`AI API 测试失败: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `API 返回错误: ${response.status} ${response.statusText}`,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`AI API 测试异常: ${errMsg}`);
      return {
        success: false,
        message: `连接失败: ${errMsg}`,
      };
    }
  }

  @Post('sync-exchange-rates')
  async syncExchangeRates() {
    return this.settingsService.syncExchangeRates();
  }

  @Get(':key')
  async getOne(@Param('key') key: string) {
    const value = await this.settingsService.get(key);
    return { key, value };
  }

  @Put(':key')
  async update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.set(key, dto.value, dto.description);
  }
}
