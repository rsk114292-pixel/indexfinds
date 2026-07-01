import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import {
  DEFAULT_OAUTH_CODE_TTL,
  TOKEN_THEFT_GRACE_PERIOD_MS,
  TOKEN_THEFT_REVOKE_THROTTLE_MS,
  TOKEN_THEFT_LOG_THROTTLE_MS,
  BLACKLIST_TTL_BUFFER_SECONDS,
  REDIS_BLACKLIST_CHECK_TIMEOUT_MS,
  REDIS_CIRCUIT_OPEN_THRESHOLD,
  REDIS_CIRCUIT_RESET_MS,
  THROTTLE_MAP_MAX_SIZE,
  THROTTLE_MAP_PRUNE_AGE_MS,
  THROTTLE_MAP_PRUNE_INTERVAL_MS,
  REFRESH_TOKEN_IDLE_DAYS,
  DEFAULT_ACCESS_TOKEN_EXPIRATION,
} from './auth.constants';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
  iat?: number;
}

// 导出别名，兼容 JwtStrategy 使用
export type JwtPayload = AccessTokenPayload;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpirationDays: number;
  private readonly blacklistTtlSeconds: number;
  private readonly oauthCodeTtl: number;
  private readonly throttleMap = new Map<string, number>();
  private readonly pruneTimer: NodeJS.Timeout;
  private redisFailCount = 0;
  private redisCircuitResetTimer: NodeJS.Timeout | null = null;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
  ) {
    this.accessTokenExpiration =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
      DEFAULT_ACCESS_TOKEN_EXPIRATION;
    this.refreshTokenExpirationDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION_DAYS') || '30',
      10,
    );
    // 黑名单 TTL = Access Token 有效期 + 缓冲时间
    this.blacklistTtlSeconds =
      this.parseExpirationToSeconds(this.accessTokenExpiration) +
      BLACKLIST_TTL_BUFFER_SECONDS;
    this.oauthCodeTtl = parseInt(
      this.configService.get<string>('OAUTH_CODE_TTL') ||
        String(DEFAULT_OAUTH_CODE_TTL),
      10,
    );

    // 定时清理 throttleMap，防止低频场景下旧条目堆积
    // .unref() 确保定时器不阻止 Node.js 进程正常退出
    this.pruneTimer = setInterval(() => {
      if (this.throttleMap.size > 0) {
        this.pruneThrottleMap(Date.now());
      }
    }, THROTTLE_MAP_PRUNE_INTERVAL_MS);
    this.pruneTimer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.pruneTimer);
    if (this.redisCircuitResetTimer) {
      clearTimeout(this.redisCircuitResetTimer);
    }
  }

  /**
   * 解析过期时间字符串（如 '2h', '30m', '3600s'）为秒数
   */
  private parseExpirationToSeconds(exp: string): number {
    const match = exp.match(/^(\d+)(h|m|s)?$/);
    if (!match) return 2 * 3600; // 默认 2 小时
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 'h':
        return value * 3600;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return value; // 纯数字视为秒
    }
  }

  /**
   * 生成 Access Token
   */
  generateAccessToken(user: User): string {
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiration as any,
    });
  }

  /**
   * 生成 Refresh Token 并存入数据库
   */
  async generateRefreshToken(
    user: User,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpirationDays);

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      ipAddress,
      deviceInfo,
      expiresAt,
      lastUsedAt: new Date(),
    });

    await this.refreshTokenRepository.save(refreshToken);
    return token;
  }

  /**
   * 生成双令牌
   */
  async generateTokenPair(
    user: User,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(
      user,
      ipAddress,
      deviceInfo,
    );
    return { accessToken, refreshToken };
  }

  /**
   * 验证并刷新 Token
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      // 宽限期：如果 token 在 10 秒内刚被轮换，视为并发竞态（多标签页同时刷新）
      const msSinceRevoked = Date.now() - storedToken.revokedAt.getTime();
      if (msSinceRevoked < TOKEN_THEFT_GRACE_PERIOD_MS) {
        // Auth0 模式：在宽限期内返回替代 token 而不是拒绝请求
        if (storedToken.replacedByTokenHash) {
          const replacementToken = await this.refreshTokenRepository.findOne({
            where: { tokenHash: storedToken.replacedByTokenHash },
            relations: ['user'],
          });
          if (
            replacementToken &&
            !replacementToken.revokedAt &&
            replacementToken.user
          ) {
            if (
              this.shouldProceed(`refresh-race:${storedToken.tokenHash}`, 2000)
            ) {
              this.logger.warn(
                `Revoked refresh token reused for user ${storedToken.userId} within grace period (${msSinceRevoked}ms), returning replacement token`,
              );
            }
            // 返回替代 token 的信息（新的 access token + 原来的 replacement refresh token）
            const accessToken = this.generateAccessToken(replacementToken.user);
            return {
              accessToken,
              refreshToken: '',
              user: replacementToken.user,
            };
          }
        }
        // 没有找到替代 token，仍然拒绝
        throw new UnauthorizedException('Refresh token has been revoked');
      }
      // 超过宽限期仍被使用，可能是 token 被盗，撤销该用户所有 token
      const shouldRevokeAll = this.shouldProceed(
        `refresh-theft-revokeall:${storedToken.userId}`,
        TOKEN_THEFT_REVOKE_THROTTLE_MS,
      );
      const revokedCount = shouldRevokeAll
        ? await this.revokeAllUserTokens(storedToken.userId)
        : 0;

      if (
        this.shouldProceed(
          `refresh-theft-log:${storedToken.userId}`,
          TOKEN_THEFT_LOG_THROTTLE_MS,
        )
      ) {
        const action = shouldRevokeAll ? `revoked ${revokedCount}` : 'skipped';
        this.logger.error(
          `Revoked refresh token reused for user ${storedToken.userId} after ${msSinceRevoked}ms, revoke-all=${action} (possible token theft)`,
        );
      }
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // 滑动会话 idle 检查：如果上次使用距今超过 idle 天数，则过期
    if (storedToken.lastUsedAt) {
      const idleMs = Date.now() - storedToken.lastUsedAt.getTime();
      const idleLimitMs = REFRESH_TOKEN_IDLE_DAYS * 24 * 60 * 60 * 1000;
      if (idleMs > idleLimitMs) {
        storedToken.revokedAt = new Date();
        await this.refreshTokenRepository.save(storedToken);
        throw new UnauthorizedException('Session expired due to inactivity');
      }
    }

    if (!storedToken.user || !storedToken.user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 生成新的 refresh token
    const newRefreshToken = await this.generateRefreshToken(
      storedToken.user,
      ipAddress,
      deviceInfo,
    );
    const newTokenHash = this.hashToken(newRefreshToken);

    // 轮换：废弃旧 refresh token，记录替代 token hash（用于多标签页竞态处理）
    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = newTokenHash;
    await this.refreshTokenRepository.save(storedToken);

    const accessToken = this.generateAccessToken(storedToken.user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: storedToken.user,
    };
  }

  /**
   * 撤销单个 Refresh Token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.update(
      { tokenHash },
      { revokedAt: new Date() },
    );
  }

  /**
   * 撤销用户所有 Refresh Token（登出所有设备）
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return result.affected || 0;
  }

  /**
   * 将 Access Token 加入黑名单
   */
  async blacklistAccessToken(jti: string): Promise<void> {
    await this.redis.setex(
      `token:blacklist:${jti}`,
      this.blacklistTtlSeconds,
      '1',
    );
  }

  /**
   * 检查 Access Token 是否在黑名单中
   * 使用断路器模式：Redis 连续失败超过阈值后跳过检查（fail-open）
   * Access Token 本身仍具有密码学有效性，fail-open 不会导致安全问题
   */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    // Circuit breaker: if Redis has failed multiple times, skip the check
    if (this.redisFailCount >= REDIS_CIRCUIT_OPEN_THRESHOLD) {
      return false; // fail-open: allow request, token is still cryptographically valid
    }

    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race([
        this.redis.get(`token:blacklist:${jti}`),
        new Promise<null>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Redis timeout')),
            REDIS_BLACKLIST_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      // Reset fail count on success
      if (this.redisFailCount > 0) {
        this.redisFailCount = 0;
        if (this.redisCircuitResetTimer) {
          clearTimeout(this.redisCircuitResetTimer);
          this.redisCircuitResetTimer = null;
        }
      }
      return result === '1';
    } catch (error) {
      this.redisFailCount++;
      this.logger.warn(
        `Redis blacklist check failed (${this.redisFailCount}/${REDIS_CIRCUIT_OPEN_THRESHOLD}), allowing request: ${error.message}`,
      );
      // Schedule circuit reset after configured timeout
      if (!this.redisCircuitResetTimer) {
        this.redisCircuitResetTimer = setTimeout(() => {
          this.redisFailCount = 0;
          this.redisCircuitResetTimer = null;
          this.logger.log('Redis circuit breaker reset');
        }, REDIS_CIRCUIT_RESET_MS);
        this.redisCircuitResetTimer.unref();
      }
      return false; // fail-open: allow request through
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 清理过期的 Refresh Token（可定期执行）
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  /**
   * 获取用户的活跃会话
   */
  async getUserSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.user_id = :userId', { userId })
      .andWhere('rt.revoked_at IS NULL')
      .andWhere('rt.expires_at > :now', { now: new Date() })
      .orderBy('rt.created_at', 'DESC')
      .getMany();
  }

  /**
   * 撤销指定会话
   */
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await this.refreshTokenRepository.update(
      { id: sessionId, userId },
      { revokedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  /**
   * 哈希 Token（SHA256）
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private shouldProceed(key: string, intervalMs: number): boolean {
    const now = Date.now();
    const last = this.throttleMap.get(key);
    if (last !== undefined && now - last < intervalMs) {
      return false;
    }
    this.throttleMap.set(key, now);
    if (this.throttleMap.size > THROTTLE_MAP_MAX_SIZE) {
      this.pruneThrottleMap(now);
    }
    return true;
  }

  private pruneThrottleMap(nowMs: number): void {
    for (const [key, last] of this.throttleMap) {
      if (nowMs - last > THROTTLE_MAP_PRUNE_AGE_MS) {
        this.throttleMap.delete(key);
      }
    }
  }

  // ============ OAuth 一次性 Code 相关方法 ============

  /**
   * 生成一次性 OAuth Code（用于安全传递 token）
   * Code 有效期 5 分钟，只能使用一次
   */
  async generateOAuthCode(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');
    const key = `oauth:code:${code}`;

    // 存储 code 对应的数据，5 分钟有效
    await this.redis.setex(
      key,
      this.oauthCodeTtl,
      JSON.stringify({ userId, accessToken, refreshToken }),
    );

    return code;
  }

  /**
   * 验证并消费一次性 OAuth Code
   * 成功后立即删除 code（一次性使用）
   */
  async exchangeOAuthCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
  } | null> {
    const key = `oauth:code:${code}`;

    // 使用 GETDEL 原子操作（获取并删除）
    const data = await this.redis.getdel(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}
