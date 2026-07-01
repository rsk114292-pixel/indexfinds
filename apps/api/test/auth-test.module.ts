import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Auth 相关实体
import { User } from '../src/users/entities/user.entity';
import { UserOAuthAccount } from '../src/auth/entities/user-oauth-account.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { LoginLog } from '../src/auth/entities/login-log.entity';

// Auth 相关服务和控制器
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { TokenService } from '../src/auth/token.service';
import { OAuthService } from '../src/auth/oauth.service';
import { LoginLogService } from '../src/auth/login-log.service';
import { AccountLockService } from '../src/auth/account-lock.service';

// 依赖的其他服务
import { ReferralService } from '../src/referral/referral.service';
import { EmailService } from '../src/email/email.service';

// Strategies
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';
import { DiscordStrategy } from '../src/auth/strategies/discord.strategy';

// Guards
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

// Redis Mock
import { CacheModule } from '@nestjs/cache-manager';

/**
 * 认证测试专用模块
 * 只加载认证相关的服务，避免加载会导致 pg-mem 问题的搜索服务
 */
@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),

    // TypeORM - 只注册认证相关实体
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        entities: [User, UserOAuthAccount, RefreshToken, LoginLog],
        synchronize: true, // 测试环境自动同步表结构
        dropSchema: false,
      }),
    }),

    TypeOrmModule.forFeature([User, UserOAuthAccount, RefreshToken, LoginLog]),

    // JWT
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'test-secret'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),

    // Throttler (Rate Limiting)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Cache (Redis Mock)
    CacheModule.register({
      isGlobal: true,
      ttl: 300,
    }),

    // Event Emitter
    EventEmitterModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OAuthService,
    LoginLogService,
    AccountLockService,
    JwtStrategy,
    GoogleStrategy,
    DiscordStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Mock Redis 客户端
    {
      provide: 'REDIS_CLIENT',
      useValue: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        getdel: jest.fn().mockResolvedValue(null),
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        ttl: jest.fn().mockResolvedValue(-1),
      },
    },
    // Mock ReferralService
    {
      provide: ReferralService,
      useValue: {
        trackReferral: jest.fn().mockResolvedValue(undefined),
        processReferral: jest.fn().mockResolvedValue(undefined),
        getReferralStats: jest.fn().mockResolvedValue({}),
      },
    },
    // Mock EmailService
    {
      provide: EmailService,
      useValue: {
        sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      },
    },
  ],
})
export class AuthTestModule {}
