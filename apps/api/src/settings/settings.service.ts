import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { Setting } from './entities/setting.entity';
import { validateTrackingSettingValue } from './tracking-config.validation';

// 默认配置常量
const DEFAULT_SETTINGS = {
  loongbuy_invitecode: {
    value: '',
    description: 'Loongbuy 平台邀请码（新站上线前重新配置）',
    isSecret: false,
  },
  loongbuy_base_url: {
    value: 'https://www.loongbuy.com/product-details',
    description: 'Loongbuy 商品页基础 URL',
    isSecret: false,
  },
  exchange_rate_usd: {
    value: '0.14',
    description: 'CNY → USD 汇率',
    isSecret: false,
  },
  exchange_rate_eur: {
    value: '0.13',
    description: 'CNY → EUR 汇率',
    isSecret: false,
  },
  exchange_rate_gbp: {
    value: '0.11',
    description: 'CNY → GBP 汇率',
    isSecret: false,
  },
  exchange_rate_cad: {
    value: '0.19',
    description: 'CNY → CAD 汇率',
    isSecret: false,
  },
  exchange_rate_aud: {
    value: '0.22',
    description: 'CNY → AUD 汇率',
    isSecret: false,
  },
  tracking_gtm_id: {
    value: '',
    description: 'Google Tag Manager 容器 ID（如 GTM-XXXXXXX）',
    isSecret: false,
  },
  tracking_ga_id: {
    value: '',
    description: 'GA4 Measurement ID（如 G-XXXXXXXXXX），配置 GTM 后可留空',
    isSecret: false,
  },
  tracking_enabled: {
    value: 'true',
    description: '是否启用追踪代码（总开关）',
    isSecret: false,
  },
  search_engine: {
    value: process.env.SEARCH_ENGINE || 'meilisearch',
    description: '搜索引擎（meilisearch | postgres），支持管理员后台动态切换',
    isSecret: false,
  },
  ai_api_key: {
    value: process.env.QWEN_API_KEY || '',
    description: 'AI 服务 API Key',
    isSecret: true,
  },
  ai_model: {
    value: 'qwen3-vl-plus',
    description: 'AI 模型名称',
    isSecret: false,
  },
  ai_api_endpoint: {
    value:
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    description: 'AI API 端点地址',
    isSecret: false,
  },
};

// ExchangeRate-API 需要同步的货币列表
const RATE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private settingRepo: Repository<Setting>,
    private httpService: HttpService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  async set(
    key: string,
    value: string,
    description?: string,
  ): Promise<Setting> {
    const validatedValue = validateTrackingSettingValue(key, value);
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = validatedValue;
      if (description) setting.description = description;
    } else {
      setting = this.settingRepo.create({
        key,
        value: validatedValue,
        description,
      });
    }
    return this.settingRepo.save(setting);
  }

  async getAll(): Promise<Setting[]> {
    return this.settingRepo.find({ order: { key: 'ASC' } });
  }

  private async ensureDefaults() {
    for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
      const exists = await this.settingRepo.findOne({ where: { key } });
      if (!exists) {
        await this.settingRepo.save({
          key,
          value: config.value,
          description: config.description,
          isSecret: config.isSecret,
        });
      }
    }
  }

  async getExchangeRates(): Promise<Record<string, number>> {
    const [usd, eur, gbp, cad, aud] = await Promise.all([
      this.get('exchange_rate_usd'),
      this.get('exchange_rate_eur'),
      this.get('exchange_rate_gbp'),
      this.get('exchange_rate_cad'),
      this.get('exchange_rate_aud'),
    ]);
    return {
      CNY: 1,
      USD: parseFloat(usd || '0.14'),
      EUR: parseFloat(eur || '0.13'),
      GBP: parseFloat(gbp || '0.11'),
      CAD: parseFloat(cad || '0.19'),
      AUD: parseFloat(aud || '0.22'),
    };
  }

  /**
   * 每天早上 8:00 (服务器时间) 自动同步汇率
   */
  @Cron('0 8 * * *')
  async handleExchangeRateCron() {
    this.logger.log('定时任务：开始同步汇率...');
    await this.syncExchangeRates();
  }

  /**
   * 从 ExchangeRate-API 拉取最新汇率并写入数据库
   */
  async syncExchangeRates(): Promise<{
    success: boolean;
    message: string;
    rates?: Record<string, number>;
  }> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      this.logger.warn('未配置 EXCHANGE_RATE_API_KEY，跳过汇率同步');
      return {
        success: false,
        message: '未配置 EXCHANGE_RATE_API_KEY 环境变量',
      };
    }

    try {
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/CNY`;
      const { data } = await firstValueFrom(
        this.httpService.get(url, { timeout: 10000 }),
      );

      if (data.result !== 'success') {
        this.logger.warn(`汇率 API 返回异常: ${data['error-type']}`);
        return { success: false, message: `API 错误: ${data['error-type']}` };
      }

      const remoteRates = data.conversion_rates;
      const updatedRates: Record<string, number> = { CNY: 1 };

      for (const cur of RATE_CURRENCIES) {
        const rate = remoteRates[cur];
        if (rate != null) {
          const key = `exchange_rate_${cur.toLowerCase()}`;
          await this.set(key, String(rate), `CNY → ${cur} 汇率`);
          updatedRates[cur] = rate;
        }
      }

      // 记录上次同步时间
      await this.set(
        'exchange_rate_last_sync',
        new Date().toISOString(),
        '汇率上次同步时间',
      );

      this.logger.log(`汇率同步成功: ${JSON.stringify(updatedRates)}`);
      return { success: true, message: '汇率同步成功', rates: updatedRates };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`汇率同步失败: ${errMsg}`);
      return { success: false, message: `同步失败: ${errMsg}` };
    }
  }

  /**
   * 获取上次汇率同步时间
   */
  async getLastSyncTime(): Promise<string | null> {
    return this.get('exchange_rate_last_sync');
  }

  async getAIConfig(): Promise<{
    apiKey: string;
    model: string;
    endpoint: string;
  }> {
    const [apiKey, model, endpoint] = await Promise.all([
      this.get('ai_api_key'),
      this.get('ai_model'),
      this.get('ai_api_endpoint'),
    ]);
    return {
      apiKey: apiKey || process.env.QWEN_API_KEY || '',
      model: model || 'qwen3-vl-plus',
      endpoint:
        endpoint ||
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    };
  }

  async getTrackingConfig(): Promise<{
    gtmId: string;
    gaId: string;
    enabled: boolean;
  }> {
    const [gtmId, gaId, enabled] = await Promise.all([
      this.get('tracking_gtm_id'),
      this.get('tracking_ga_id'),
      this.get('tracking_enabled'),
    ]);
    return {
      gtmId: gtmId || '',
      gaId: gaId || '',
      enabled: enabled !== 'false',
    };
  }

  async getLoongbuyConfig() {
    const [invitecode, baseUrl] = await Promise.all([
      this.get('loongbuy_invitecode'),
      this.get('loongbuy_base_url'),
    ]);
    return {
      invitecode: invitecode || '',
      baseUrl: baseUrl || 'https://www.loongbuy.com/product-details',
    };
  }
}
