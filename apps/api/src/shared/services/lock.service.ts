import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ClaimOnceOptions {
  onUnavailable?: 'open' | 'closed';
}

/**
 * 分布式锁服务
 * 用于防止并发操作导致的数据不一致
 */
@Injectable()
export class LockService implements OnModuleDestroy {
  private readonly logger = new Logger(LockService.name);
  private readonly redis: Redis;
  private readonly lockPrefix = 'lock:';
  private readonly lockValues = new Map<string, string>();
  private readonly CLAIM_UNAVAILABLE_LOG_INTERVAL_MS = 30_000;
  private lastClaimUnavailableLogAt = 0;

  private readonly unlockScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    end
    return 0
  `;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', '127.0.0.1'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      family: 4,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * 获取分布式锁
   * @param key 锁的唯一标识
   * @param ttlMs 锁的过期时间（毫秒），默认 30 秒
   * @returns 是否成功获取锁
   */
  async acquireLock(key: string, ttlMs = 30000): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const result = await this.redis.set(
        lockKey,
        lockValue,
        'PX',
        ttlMs,
        'NX',
      );
      const acquired = result === 'OK';

      if (acquired) {
        this.lockValues.set(lockKey, lockValue);
        this.logger.debug(`Lock acquired: ${lockKey}`);
      } else {
        this.logger.debug(`Lock already held: ${lockKey}`);
      }

      return acquired;
    } catch (error) {
      // Redis 不可用时 fail-open：放行请求，依赖业务层 double-check 防重复
      this.logger.warn(
        `Redis unavailable, fail-open for ${lockKey}: ${error instanceof Error ? error.message : error}`,
      );
      return true;
    }
  }

  /**
   * 认领一个一次性键（NX + TTL）
   * 用于埋点去重，不会在内存中持有释放句柄。
   */
  async claimOnce(
    key: string,
    ttlMs: number,
    options?: ClaimOnceOptions,
  ): Promise<boolean> {
    const claimKey = `${this.lockPrefix}claim:${key}`;
    const fallbackMode = options?.onUnavailable ?? 'closed';

    try {
      const result = await this.redis.set(claimKey, '1', 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      const message =
        `Redis unavailable for analytics dedup ${claimKey}: ` +
        `${error instanceof Error ? error.message : error}`;

      if (fallbackMode === 'open') {
        this.logClaimUnavailable(`${message}; falling back to fail-open`);
        return true;
      }

      this.logClaimUnavailable(
        `${message}; failing closed to protect trusted metrics`,
      );
      return false;
    }
  }

  private logClaimUnavailable(message: string): void {
    const now = Date.now();
    if (
      now - this.lastClaimUnavailableLogAt <
      this.CLAIM_UNAVAILABLE_LOG_INTERVAL_MS
    ) {
      return;
    }

    this.lastClaimUnavailableLogAt = now;
    this.logger.warn(message);
  }

  /**
   * 带重试的锁获取（指数退避 + 随机抖动）
   * @param key 锁的唯一标识
   * @param ttlMs 锁的过期时间（毫秒）
   * @param retries 最大重试次数
   * @param retryDelayMs 初始重试延迟（毫秒），每次翻倍
   * @returns 是否成功获取锁
   */
  async acquireLockWithRetry(
    key: string,
    ttlMs = 30000,
    retries = 3,
    retryDelayMs = 1000,
  ): Promise<boolean> {
    const acquired = await this.acquireLock(key, ttlMs);
    if (acquired) return true;

    let delay = retryDelayMs;
    for (let attempt = 1; attempt <= retries; attempt++) {
      // 指数退避 + ±30% 随机抖动
      const jitter = delay * (0.7 + Math.random() * 0.6);
      this.logger.debug(
        `Lock retry ${attempt}/${retries} for "${key}" in ${Math.round(jitter)}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, jitter));

      const retryAcquired = await this.acquireLock(key, ttlMs);
      if (retryAcquired) return true;

      delay *= 2;
    }

    this.logger.warn(
      `Failed to acquire lock "${key}" after ${retries} retries`,
    );
    return false;
  }

  /**
   * 释放分布式锁
   * @param key 锁的唯一标识
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `${this.lockPrefix}${key}`;
    const lockValue = this.lockValues.get(lockKey);

    if (!lockValue) {
      this.logger.warn(`No lock value found for ${lockKey}, skipping release`);
      return;
    }

    try {
      await this.redis.eval(this.unlockScript, 1, lockKey, lockValue);
      this.lockValues.delete(lockKey);
      this.logger.debug(`Lock released: ${lockKey}`);
    } catch (error) {
      this.logger.error(
        `Failed to release lock ${lockKey}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * 使用锁执行操作
   * @param key 锁的唯一标识
   * @param fn 要执行的函数
   * @param ttlMs 锁的过期时间
   * @returns 函数执行结果，如果获取锁失败返回 null
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs = 30000,
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const acquired = await this.acquireLock(key, ttlMs);

    if (!acquired) {
      return {
        success: false,
        error: '无法获取锁，操作正在被其他进程执行',
      };
    }

    try {
      const result = await fn();
      return { success: true, result };
    } finally {
      await this.releaseLock(key);
    }
  }

  /**
   * 检查锁是否被持有
   * @param key 锁的唯一标识
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;

    try {
      const exists = await this.redis.exists(lockKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check lock ${lockKey}: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }

  /**
   * 延长锁的过期时间
   * @param key 锁的唯一标识
   * @param ttlMs 新的过期时间
   */
  async extendLock(key: string, ttlMs: number): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;

    try {
      const result = await this.redis.pexpire(lockKey, ttlMs);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Failed to extend lock ${lockKey}: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }
}
