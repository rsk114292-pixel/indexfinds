import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';
import { ReferralService } from '../referral/referral.service';
import { AttributionEventType } from '../referral/entities/referral-attribution.entity';
import { TokenService } from './token.service';
import { LoginLogService } from './login-log.service';
import { LoginProvider } from './entities/login-log.entity';
import { AccountLockService } from './account-lock.service';
import { EmailService } from '../email/email.service';
import {
  DEFAULT_BCRYPT_ROUNDS,
  DEFAULT_EMAIL_VERIFY_TOKEN_TTL,
  DEFAULT_PASSWORD_RESET_TOKEN_TTL,
} from './auth.constants';
import { isDisposableEmail } from '../referral/disposable-domains';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PointsEvents } from '../points/points.events';
import type { EarnPointsRequestEvent } from '../points/points.events';
import type { OAuthAuthContext } from './oauth.service';
import type { OAuthCallbackErrorCode } from './oauth-error.util';

type OAuthUserWithContext = User & {
  __oauthContext?: OAuthAuthContext;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  private readonly emailVerifyTokenTtl: number;
  private readonly passwordResetTokenTtl: number;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private referralService: ReferralService,
    private tokenService: TokenService,
    private loginLogService: LoginLogService,
    private accountLockService: AccountLockService,
    private emailService: EmailService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private eventEmitter: EventEmitter2,
  ) {
    this.bcryptRounds = parseInt(
      this.configService.get<string>('BCRYPT_ROUNDS') ||
        String(DEFAULT_BCRYPT_ROUNDS),
      10,
    );
    this.emailVerifyTokenTtl = parseInt(
      this.configService.get<string>('EMAIL_VERIFY_TOKEN_TTL') ||
        String(DEFAULT_EMAIL_VERIFY_TOKEN_TTL),
      10,
    );
    this.passwordResetTokenTtl = parseInt(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL') ||
        String(DEFAULT_PASSWORD_RESET_TOKEN_TTL),
      10,
    );
  }

  async register(
    registerDto: RegisterDto,
    referralCookie?: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // 标准化邮箱
    const email = registerDto.email.toLowerCase().trim();

    // 拒绝一次性/临时邮箱
    if (isDisposableEmail(email)) {
      throw new BadRequestException(
        'Disposable email addresses are not allowed',
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.bcryptRounds,
    );

    // 创建用户
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      username: registerDto.username,
    });

    await this.usersRepository.save(user);

    // 处理推荐归因
    if (referralCookie) {
      await this.referralService.triggerAttributionFromCookie(
        referralCookie,
        AttributionEventType.REGISTRATION,
        user.id,
        { email: user.email },
      );
      const attachedAnonymousAttributions =
        await this.referralService.attachAnonymousAttributionsToUserFromCookie(
          referralCookie,
          user.id,
        );

      if (attachedAnonymousAttributions.highIntentActionCount > 0) {
        this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
          userId: user.id,
          action: 'first_favorite',
          referenceType: 'user',
          referenceId: user.id,
          metadata: {
            source: 'anonymous_referral_rebind',
          },
        } as EarnPointsRequestEvent);
      }
    }

    // 注册阶段统一发放 5 积分；若为被推荐用户，额外 5 分在邮箱验证后补发
    this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
      userId: user.id,
      action: 'registration',
      referenceType: 'user',
      referenceId: user.id,
    } as EarnPointsRequestEvent);

    // 生成双令牌
    const tokens = await this.tokenService.generateTokenPair(
      user,
      ipAddress,
      deviceInfo,
    );

    // 记录注册后的登录日志
    await this.loginLogService.logSuccess(user.id, ipAddress, deviceInfo);

    // 异步发送验证邮件（不阻塞注册流程）
    this.sendVerificationEmail(user.id).catch((err) => {
      this.logger.error('Failed to send verification email on register', err);
    });

    return {
      ...tokens,
      user: this.formatUserResponse(user),
    };
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // 标准化邮箱
    const email = loginDto.email.toLowerCase().trim();

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      // 记录失败日志（用户不存在）
      await this.loginLogService.logFailure(email, ipAddress, deviceInfo);
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // 检查账号是否被锁定
    await this.accountLockService.checkLocked(user);

    // 检查用户是否有密码（社交登录用户可能没有密码）
    if (!user.password) {
      throw new UnauthorizedException({
        code: 'AUTH_NO_PASSWORD',
        message:
          'This account was created via social login. Please use social login or set a password first.',
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      // 记录失败并增加计数
      const attempts = await this.accountLockService.recordFailure(email, user);
      await this.loginLogService.logFailure(
        email,
        ipAddress,
        deviceInfo,
        user.id,
      );

      const maxAttempts = this.accountLockService.getMaxAttempts();
      const remaining = maxAttempts - attempts;
      if (remaining > 0) {
        throw new UnauthorizedException({
          code: 'AUTH_INVALID_CREDENTIALS',
          message: `Invalid email or password. ${remaining} attempt(s) remaining.`,
          remainingAttempts: remaining,
        });
      } else {
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_LOCKED',
          message:
            'Too many failed login attempts. Account locked for 30 minutes.',
        });
      }
    }

    // 登录成功，清除失败计数
    await this.accountLockService.clearAttempts(email, user);

    // 记录成功登录日志
    await this.loginLogService.logSuccess(user.id, ipAddress, deviceInfo);

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    // 生成双令牌
    const tokens = await this.tokenService.generateTokenPair(
      user,
      ipAddress,
      deviceInfo,
    );

    return {
      ...tokens,
      user: this.formatUserResponse(user),
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private formatUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }

  /**
   * 修改密码
   */
  async updateAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<{ avatar: string }> {
    await this.usersRepository.update(userId, { avatar: avatarUrl });
    this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
      userId,
      action: 'complete_profile',
      referenceType: 'user',
      referenceId: userId,
      metadata: {
        source: 'avatar',
      },
    } as EarnPointsRequestEvent);
    return { avatar: avatarUrl };
  }

  async updateUsername(
    userId: string,
    username: string,
  ): Promise<{ username: string }> {
    await this.usersRepository.update(userId, { username });
    this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
      userId,
      action: 'complete_profile',
      referenceType: 'user',
      referenceId: userId,
      metadata: {
        source: 'username',
      },
    } as EarnPointsRequestEvent);
    return { username };
  }

  async updatePreferences(
    userId: string,
    prefs: { preferredCurrency?: string; preferredPlatform?: string },
  ): Promise<{
    preferredCurrency: string | null;
    preferredPlatform: string | null;
  }> {
    const update: Partial<{
      preferredCurrency: string | null;
      preferredPlatform: string | null;
    }> = {};

    if (prefs.preferredCurrency !== undefined) {
      const allowed = ['CNY', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
      update.preferredCurrency = allowed.includes(prefs.preferredCurrency)
        ? prefs.preferredCurrency
        : null;
    }

    if (prefs.preferredPlatform !== undefined) {
      update.preferredPlatform = prefs.preferredPlatform || null;
    }

    if (Object.keys(update).length > 0) {
      await this.usersRepository.update(userId, update);
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    return {
      preferredCurrency: user?.preferredCurrency ?? null,
      preferredPlatform: user?.preferredPlatform ?? null,
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 如果用户已有密码，必须验证当前密码
    if (user.password) {
      if (!changePasswordDto.currentPassword) {
        throw new UnauthorizedException('Current password is required');
      }
      const isValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );
      if (!isValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // 加密并更新新密码
    user.password = await bcrypt.hash(
      changePasswordDto.newPassword,
      this.bcryptRounds,
    );
    user.passwordChangedAt = new Date();
    await this.usersRepository.save(user);

    // 注销所有 refresh token（安全考虑）
    await this.tokenService.revokeAllUserTokens(userId);
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken(
    refreshToken: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const result = await this.tokenService.refreshTokens(
      refreshToken,
      ipAddress,
      deviceInfo,
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: this.formatUserResponse(result.user),
    };
  }

  /**
   * 安全登出（撤销 Refresh Token + Access Token 加入黑名单）
   */
  async logout(
    refreshToken: string,
    jti?: string,
    userId?: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<void> {
    // 撤销 Refresh Token
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }

    // Access Token 加入黑名单
    if (jti) {
      await this.tokenService.blacklistAccessToken(jti);
    }

    // 记录登出日志
    if (userId) {
      await this.loginLogService.logLogout(userId, ipAddress, deviceInfo);
    }
  }

  /**
   * 登出所有设备
   */
  async logoutAll(userId: string, currentJti?: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);

    // 当前 Access Token 也加入黑名单
    if (currentJti) {
      await this.tokenService.blacklistAccessToken(currentJti);
    }
  }

  /**
   * 忘记密码 — 发送重置邮件
   */
  async forgotPassword(rawEmail: string): Promise<void> {
    const email = rawEmail.toLowerCase().trim();
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    // 不泄露用户是否存在，始终返回成功
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const redisKey = `verify:password:${token}`;

    try {
      await this.redis.set(redisKey, user.id, 'EX', this.passwordResetTokenTtl);
      await this.emailService.sendPasswordResetEmail(email, token);
    } catch (error) {
      this.logger.error('Failed to process password reset', error);
    }
  }

  /**
   * 重置密码 — 通过邮件 token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const redisKey = `verify:password:${token}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, this.bcryptRounds);
    user.passwordChangedAt = new Date();
    await this.usersRepository.save(user);

    // Delete token (one-time use)
    await this.redis.del(redisKey);

    // Revoke all sessions for security
    await this.tokenService.revokeAllUserTokens(userId);

    this.logger.log(`Password reset completed for user ${userId}`);
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const redisKey = `verify:email:${token}`;

    await this.redis.set(redisKey, user.id, 'EX', this.emailVerifyTokenTtl);

    try {
      await this.emailService.sendVerificationEmail(user.email, token);
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      await this.redis.del(redisKey);
      throw new BadRequestException(
        'Failed to send verification email. Please check email service configuration.',
      );
    }
  }

  /**
   * 验证邮箱 — 通过邮件 token
   */
  async verifyEmail(token: string): Promise<void> {
    const redisKey = `verify:email:${token}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await this.usersRepository.save(user);

    // Delete token (one-time use)
    await this.redis.del(redisKey);

    this.logger.log(`Email verified for user ${userId}`);

    this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
      userId,
      action: 'email_verification',
      referenceType: 'user',
      referenceId: userId,
    } as EarnPointsRequestEvent);

    const isReferredUser =
      await this.referralService.hasRegistrationAttribution(userId);
    if (isReferredUser) {
      this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
        userId,
        action: 'referred_email_verification',
        referenceType: 'user',
        referenceId: userId,
      } as EarnPointsRequestEvent);
    }

    // 触发推荐转化检查（邮箱验证是转化条件之一）
    await this.referralService.checkAndFinalizeConversion(userId);
  }

  /**
   * 获取 Refresh Token Cookie 配置
   * 将 Cookie 配置集中在 Service 层，Controller 仅负责设置
   */
  getRefreshTokenCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    maxAge: number;
    path: string;
  } {
    const refreshDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION_DAYS') || '30',
      10,
    );
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
      path: '/',
    };
  }

  getOAuthCallbackRedirectUrl(params: {
    code?: string;
    error?: OAuthCallbackErrorCode;
    provider?: LoginProvider;
  }): string {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3101',
    );
    const searchParams = new URLSearchParams();

    if (params.code) {
      searchParams.set('code', params.code);
    }
    if (params.error) {
      searchParams.set('error', params.error);
    }
    if (params.provider) {
      searchParams.set('provider', params.provider);
    }

    const query = searchParams.toString();
    return `${frontendUrl}/auth/callback${query ? `?${query}` : ''}`;
  }

  /**
   * 处理 OAuth 登录：生成令牌 → 记录日志 → 生成一次性 code → 返回重定向 URL
   */
  async handleOAuthLogin(
    user: User,
    provider: LoginProvider,
    ipAddress?: string,
    deviceInfo?: string,
    referralCookie?: string,
  ): Promise<{ redirectUrl: string }> {
    const oauthContext = (user as OAuthUserWithContext).__oauthContext;
    const isNewOAuthUser = !!oauthContext?.isNewUser;

    if (isNewOAuthUser) {
      if (referralCookie) {
        await this.referralService.triggerAttributionFromCookie(
          referralCookie,
          AttributionEventType.REGISTRATION,
          user.id,
          { email: user.email },
        );

        const attachedAnonymousAttributions =
          await this.referralService.attachAnonymousAttributionsToUserFromCookie(
            referralCookie,
            user.id,
          );

        if (attachedAnonymousAttributions.highIntentActionCount > 0) {
          this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
            userId: user.id,
            action: 'first_favorite',
            referenceType: 'user',
            referenceId: user.id,
            metadata: {
              source: 'anonymous_referral_rebind',
            },
          } as EarnPointsRequestEvent);
        }
      }

      this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
        userId: user.id,
        action: 'registration',
        referenceType: 'user',
        referenceId: user.id,
      } as EarnPointsRequestEvent);

      if (user.emailVerified) {
        this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
          userId: user.id,
          action: 'email_verification',
          referenceType: 'user',
          referenceId: user.id,
        } as EarnPointsRequestEvent);
      }

      if (referralCookie && user.emailVerified) {
        this.eventEmitter.emit(PointsEvents.EARN_REQUEST, {
          userId: user.id,
          action: 'referred_email_verification',
          referenceType: 'user',
          referenceId: user.id,
        } as EarnPointsRequestEvent);

        await this.referralService.checkAndFinalizeConversion(user.id);
      }

      if (!user.emailVerified) {
        this.sendVerificationEmail(user.id).catch((err) => {
          this.logger.error(
            'Failed to send verification email on OAuth register',
            err,
          );
        });
      }
    }

    const { accessToken, refreshToken } =
      await this.tokenService.generateTokenPair(user, ipAddress, deviceInfo);

    await this.loginLogService.logOAuth(
      user.id,
      provider,
      ipAddress,
      deviceInfo,
    );

    const code = await this.tokenService.generateOAuthCode(
      user.id,
      accessToken,
      refreshToken,
    );

    return { redirectUrl: this.getOAuthCallbackRedirectUrl({ code }) };
  }
}
