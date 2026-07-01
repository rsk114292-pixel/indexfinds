import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as geoip from 'geoip-lite';
import {
  LoginLog,
  LoginEventType,
  LoginProvider,
} from './entities/login-log.entity';
import { LOGIN_STATS_WINDOW_MS } from './auth.constants';

export interface LogLoginParams {
  userId?: string;
  email?: string;
  eventType: LoginEventType;
  provider?: LoginProvider;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LoginLogService {
  constructor(
    @InjectRepository(LoginLog)
    private loginLogRepository: Repository<LoginLog>,
  ) {}

  /**
   * 记录登录事件
   */
  async log(params: LogLoginParams): Promise<LoginLog> {
    const { userId, email, eventType, provider, ipAddress, userAgent } = params;

    // 解析 IP 地理位置
    const geoLocation = this.getGeoLocation(ipAddress) ?? undefined;

    const loginLog = this.loginLogRepository.create({
      userId,
      email,
      eventType,
      provider: provider || LoginProvider.EMAIL,
      ipAddress,
      geoLocation,
      userAgent,
    });

    // save 返回类型需要明确为单个实体
    const saved = await this.loginLogRepository.save(loginLog);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  /**
   * 记录登录成功
   */
  async logSuccess(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    provider: LoginProvider = LoginProvider.EMAIL,
  ): Promise<LoginLog> {
    return this.log({
      userId,
      eventType: LoginEventType.LOGIN,
      provider,
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录登录失败
   */
  async logFailure(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
  ): Promise<LoginLog> {
    return this.log({
      userId,
      email,
      eventType: LoginEventType.FAILED,
      provider: LoginProvider.EMAIL,
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录登出
   */
  async logLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginLog> {
    return this.log({
      userId,
      eventType: LoginEventType.LOGOUT,
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录 OAuth 登录
   */
  async logOAuth(
    userId: string,
    provider: LoginProvider,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginLog> {
    return this.log({
      userId,
      eventType: LoginEventType.OAUTH,
      provider,
      ipAddress,
      userAgent,
    });
  }

  /**
   * 获取用户登录历史
   */
  async getUserLoginHistory(
    userId: string,
    limit: number = 20,
  ): Promise<LoginLog[]> {
    return this.loginLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 管理员：获取所有登录日志（分页 + 筛选）
   */
  async getLoginLogs(options: {
    page?: number;
    limit?: number;
    eventType?: LoginEventType;
    email?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    data: LoginLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      eventType,
      email,
      startDate,
      endDate,
    } = options;

    const queryBuilder = this.loginLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    // 筛选条件
    if (eventType) {
      queryBuilder.andWhere('log.eventType = :eventType', { eventType });
    }

    if (email) {
      queryBuilder.andWhere(
        '(log.email ILIKE :email OR user.email ILIKE :email)',
        { email: `%${email}%` },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * 管理员：获取登录统计概览
   */
  async getLoginStats(): Promise<{
    totalLogins: number;
    totalFailed: number;
    last24hLogins: number;
    last24hFailed: number;
  }> {
    const now = new Date();
    const last24h = new Date(now.getTime() - LOGIN_STATS_WINDOW_MS);

    const [totalLogins, totalFailed, last24hLogins, last24hFailed] =
      await Promise.all([
        this.loginLogRepository.count({
          where: { eventType: LoginEventType.LOGIN },
        }),
        this.loginLogRepository.count({
          where: { eventType: LoginEventType.FAILED },
        }),
        this.loginLogRepository
          .createQueryBuilder('log')
          .where('log.eventType = :type', { type: LoginEventType.LOGIN })
          .andWhere('log.createdAt >= :date', { date: last24h })
          .getCount(),
        this.loginLogRepository
          .createQueryBuilder('log')
          .where('log.eventType = :type', { type: LoginEventType.FAILED })
          .andWhere('log.createdAt >= :date', { date: last24h })
          .getCount(),
      ]);

    return { totalLogins, totalFailed, last24hLogins, last24hFailed };
  }

  /**
   * 通过 IP 获取地理位置
   */
  private getGeoLocation(ipAddress?: string): string | null {
    if (!ipAddress) return null;

    // 处理本地 IP
    if (
      ipAddress === '127.0.0.1' ||
      ipAddress === '::1' ||
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.')
    ) {
      return 'Local';
    }

    try {
      const geo = geoip.lookup(ipAddress);
      if (geo) {
        const parts = [geo.city, geo.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
      }
    } catch {
      // geoip 查询失败，返回 null
    }

    return null;
  }
}
