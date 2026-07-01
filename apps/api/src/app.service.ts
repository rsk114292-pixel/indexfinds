import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * 健康检查 — 验证数据库连通性
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    database: string;
  }> {
    let dbStatus = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    };
  }

  /**
   * 测试缓存功能
   * 第一次访问：从数据库查询（模拟）
   * 后续访问：从缓存返回
   */
  async testCache(): Promise<{
    message: string;
    timestamp: string;
    cached: boolean;
  }> {
    const cacheKey = 'test-cache-key';

    // 尝试从缓存获取
    const cachedValue = await this.cacheManager.get<{ timestamp: string }>(
      cacheKey,
    );

    if (cachedValue) {
      return {
        message: 'Data from cache',
        timestamp: cachedValue.timestamp,
        cached: true,
      };
    }

    // 模拟数据库查询
    const freshData = {
      timestamp: new Date().toISOString(),
    };

    // 写入缓存（TTL 60秒）
    await this.cacheManager.set(cacheKey, freshData, 60000);

    return {
      message: 'Data from database (cached for 60s)',
      timestamp: freshData.timestamp,
      cached: false,
    };
  }
}
