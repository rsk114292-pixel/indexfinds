import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { DiscordStrategy } from './strategies/discord.strategy';
import { TokenService } from './token.service';
import { LoginLogService } from './login-log.service';
import { AccountLockService } from './account-lock.service';
import { OAuthService } from './oauth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginLog } from './entities/login-log.entity';
import { UserOAuthAccount } from './entities/user-oauth-account.entity';
import { ReferralModule } from '../referral/referral.module';
import { UploadModule } from '../upload/upload.module';
import { REDIS_CONFIG } from './auth.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, LoginLog, UserOAuthAccount]),
    PassportModule,
    ReferralModule,
    UploadModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const accessExpiration = (configService.get<string>(
          'JWT_ACCESS_EXPIRATION',
        ) || '2h') as `${number}${'s' | 'm' | 'h' | 'd'}`;
        if (!jwtSecret) {
          const nodeEnv = configService.get<string>('NODE_ENV', 'development');
          if (nodeEnv === 'production') {
            throw new Error('JWT_SECRET 未配置');
          }
          Logger.warn(
            'JWT_SECRET 未配置，已使用开发环境默认值。请在 .env 中配置 JWT_SECRET。',
            'AuthModule',
          );
          return {
            secret: 'dev_jwt_secret_change_me',
            signOptions: { expiresIn: accessExpiration },
          };
        }
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: accessExpiration },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // OAuth 策略仅在配置了 clientID 时加载
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleStrategy] : []),
    ...(process.env.DISCORD_CLIENT_ID ? [DiscordStrategy] : []),
    TokenService,
    LoginLogService,
    AccountLockService,
    OAuthService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          family: 4, // 强制使用 IPv4，避免 Windows/Docker/WSL2 的 IPv6 问题
          retryStrategy: (times) => {
            if (times > REDIS_CONFIG.MAX_RETRIES) {
              Logger.warn('Max retries reached, giving up', 'Redis');
              return null;
            }
            return Math.min(times * 1000, 5000);
          },
          maxRetriesPerRequest: REDIS_CONFIG.MAX_RETRIES_PER_REQUEST,
          enableReadyCheck: false,
          lazyConnect: true,
          connectTimeout: REDIS_CONFIG.CONNECT_TIMEOUT_MS,
          keepAlive: REDIS_CONFIG.KEEP_ALIVE_MS,
        });

        // 处理错误事件，避免 unhandled error
        redis.on('error', (err: Error & { code?: string }) => {
          if (err.code !== 'ECONNRESET') {
            Logger.error(
              `Connection error: ${err.message}`,
              undefined,
              'Redis',
            );
          }
          // ECONNRESET 错误太频繁，不打印
        });

        redis.on('connect', () => {
          Logger.log('Connected', 'Redis');
        });

        redis.on('reconnecting', () => {
          Logger.log('Reconnecting...', 'Redis');
        });

        // 主动连接
        redis.connect().catch(() => {
          // 连接失败时静默处理，已有错误处理器
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, TokenService, OAuthService],
})
export class AuthModule {}
