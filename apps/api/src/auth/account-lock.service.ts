import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AccountLockService {
  private readonly logger = new Logger(AccountLockService.name);
  private readonly maxLoginAttempts: number;
  private readonly lockDurationMinutes: number;
  private readonly redisAttemptsTtl: number;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject('REDIS_CLIENT')
    private redisClient: Redis,
    private configService: ConfigService,
  ) {
    this.maxLoginAttempts = parseInt(
      this.configService.get<string>('MAX_LOGIN_ATTEMPTS') || '5',
      10,
    );
    this.lockDurationMinutes = parseInt(
      this.configService.get<string>('LOCK_DURATION_MINUTES') || '30',
      10,
    );
    this.redisAttemptsTtl = this.lockDurationMinutes * 60;
  }

  /**
   * 获取 Redis key
   */
  private getAttemptsKey(email: string): string {
    return `login:attempts:${email.toLowerCase()}`;
  }

  /**
   * 检查账号是否被锁定
   * @throws ForbiddenException 如果账号被锁定
   */
  async checkLocked(user: User): Promise<void> {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new ForbiddenException({
        code: 'AUTH_ACCOUNT_LOCKED',
        message: 'AUTH_ACCOUNT_LOCKED',
        remainingMinutes,
        lockedUntil: user.lockedUntil,
      });
    }

    // 如果锁定已过期，清除锁定状态
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.clearLock(user);
    }
  }

  /**
   * 记录登录失败
   * @returns 当前失败次数
   */
  async recordFailure(email: string, user?: User): Promise<number> {
    const key = this.getAttemptsKey(email);

    let attempts = 1;
    try {
      // Redis 计数 +1
      attempts = await this.redisClient.incr(key);

      // 设置过期时间（仅首次设置）
      if (attempts === 1) {
        await this.redisClient.expire(key, this.redisAttemptsTtl);
      }
    } catch (error) {
      // Redis 不可用时，使用数据库中的计数 +1
      this.logger.warn(
        `Redis unavailable, using DB fallback: ${error.message}`,
      );
      if (user) {
        attempts = (user.failedLoginAttempts || 0) + 1;
      }
    }

    // 达到阈值，写入数据库锁定状态
    if (attempts >= this.maxLoginAttempts && user) {
      const lockedUntil = new Date(
        Date.now() + this.lockDurationMinutes * 60 * 1000,
      );
      await this.userRepository.update(user.id, {
        lockedUntil,
        failedLoginAttempts: attempts,
      });
    } else if (user) {
      // 更新数据库中的失败次数（作为备份）
      await this.userRepository.update(user.id, {
        failedLoginAttempts: attempts,
      });
    }

    return attempts;
  }

  /**
   * 登录成功，清除失败计数
   */
  async clearAttempts(email: string, user: User): Promise<void> {
    const key = this.getAttemptsKey(email);

    // 清除 Redis 计数（允许失败）
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.warn(`Redis del failed, continuing: ${error.message}`);
    }

    // 清除数据库中的失败次数
    if (user.failedLoginAttempts > 0) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
      });
    }
  }

  /**
   * 清除锁定状态
   */
  private async clearLock(user: User): Promise<void> {
    await this.userRepository.update(user.id, {
      lockedUntil: null as any, // TypeORM 需要 null 来清除值
      failedLoginAttempts: 0,
    });

    // 同时清除 Redis 计数（允许失败）
    try {
      const key = this.getAttemptsKey(user.email);
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.warn(`Redis del failed during clearLock: ${error.message}`);
    }
  }

  /**
   * 获取剩余尝试次数
   */
  async getRemainingAttempts(email: string): Promise<number> {
    const key = this.getAttemptsKey(email);
    try {
      const attempts = await this.redisClient.get(key);
      const currentAttempts = attempts ? parseInt(attempts, 10) : 0;
      return Math.max(0, this.maxLoginAttempts - currentAttempts);
    } catch (error) {
      this.logger.warn(
        `Redis get failed, returning max attempts: ${error.message}`,
      );
      return this.maxLoginAttempts; // Redis 不可用时返回最大尝试次数
    }
  }

  /**
   * 获取最大登录尝试次数（供外部引用，避免硬编码）
   */
  getMaxAttempts(): number {
    return this.maxLoginAttempts;
  }

  /**
   * 手动解锁账号（管理员使用）
   */
  async unlockAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await this.clearLock(user);
    }
  }
}
