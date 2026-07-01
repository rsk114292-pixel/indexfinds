import { Injectable, Inject, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SettingsService } from '../settings/settings.service';
import {
  SEARCH_DEGRADATION_CACHE_KEY,
  SEARCH_DEGRADATION_TTL_MS,
} from './product-query.constants';

@Injectable()
export class ProductSearchRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(ProductSearchRuntimeService.name);
  private searchEngineValue = 'postgres';
  private degradationCount = 0;
  private lastDegradationAt: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    const dbValue = await this.settingsService.get('search_engine');
    this.searchEngineValue =
      dbValue || this.configService.get('SEARCH_ENGINE') || 'meilisearch';
    await this.loadDegradationStats();
    this.logger.log(`搜索引擎初始化: ${this.searchEngineValue}`);
  }

  handleSearchEngineChanged(payload: { engine: string }) {
    this.searchEngineValue = payload.engine;
    this.logger.log(`搜索引擎已切换: ${payload.engine}`);
  }

  get searchEngine(): string {
    return this.searchEngineValue;
  }

  get useMeilisearch(): boolean {
    return this.searchEngineValue === 'meilisearch';
  }

  getDegradationStats() {
    this.pruneDegradationStats();
    return {
      count: this.degradationCount,
      lastAt: this.lastDegradationAt?.toISOString() ?? null,
    };
  }

  async recordDegradation() {
    this.degradationCount++;
    this.lastDegradationAt = new Date();
    await this.cacheManager.set(
      SEARCH_DEGRADATION_CACHE_KEY,
      {
        count: this.degradationCount,
        lastAt: this.lastDegradationAt.toISOString(),
      },
      SEARCH_DEGRADATION_TTL_MS,
    );
  }

  private async loadDegradationStats() {
    const cached = await this.cacheManager.get<{
      count: number;
      lastAt: string | null;
    }>(SEARCH_DEGRADATION_CACHE_KEY);
    if (!cached) {
      this.degradationCount = 0;
      this.lastDegradationAt = null;
      return;
    }

    this.degradationCount = cached.count || 0;
    this.lastDegradationAt = cached.lastAt ? new Date(cached.lastAt) : null;
    this.pruneDegradationStats();
  }

  private pruneDegradationStats() {
    if (
      this.lastDegradationAt &&
      Date.now() - this.lastDegradationAt.getTime() >= SEARCH_DEGRADATION_TTL_MS
    ) {
      this.degradationCount = 0;
      this.lastDegradationAt = null;
    }
  }
}
