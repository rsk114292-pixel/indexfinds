import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { WeidianModule } from './weidian/weidian.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { ColorsModule } from './colors/colors.module';
import { QueueModule } from './queue/queue.module';
import { BatchModule } from './batch/batch.module';
import { SettingsModule } from './settings/settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReferralModule } from './referral/referral.module';
import { PlatformsModule } from './platforms/platforms.module';
import { SearchModule } from './search/search.module';
import { SocialLinksModule } from './social-links/social-links.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { SharedModule } from './shared/shared.module';
import { EmailModule } from './email/email.module';
import { VisitTrackingModule } from './visit-tracking/visit-tracking.module';
import { AttributesModule } from './attributes/attributes.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { PointsModule } from './points/points.module';
import { CheckinModule } from './checkin/checkin.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { ProductSourcingRequestsModule } from './product-sourcing-requests/product-sourcing-requests.module';
import { existsSync } from 'fs';
import { resolve } from 'path';

const enableQueue = process.env.NODE_ENV !== 'test';

function resolveApiEnvFiles(): string[] {
  const candidates = [
    resolve(__dirname, '..', '.env.local'),
    resolve(__dirname, '..', '.env'),
    resolve(__dirname, '..', '..', '.env.local'),
    resolve(__dirname, '..', '..', '.env'),
  ];

  return [...new Set(candidates)].filter((filePath) => existsSync(filePath));
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveApiEnvFiles(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>(
          'DB_NAME',
          'lolobuyspreadsheets_dev',
        ),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/baseline/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        // 测试环境自动同步表结构，生产环境使用 migration:run
        synchronize: process.env.NODE_ENV === 'test',
        // 不自动执行迁移，通过 CLI 手动执行
        migrationsRun: false,
        // 仅当 DB_SSL=true 时启用 SSL（Docker 内部网络不需要 SSL）
        ssl:
          configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        extra: {
          max: 50,
          min: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 3000,
        },
      }),
      inject: [ConfigService],
    }),
    // 定时任务模块
    ScheduleModule.forRoot(),
    // 共享模块（事件总线）- 必须在业务模块之前导入
    SharedModule,
    // 全局邮件模块
    EmailModule,
    // 缓存模块配置（Redis）
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST', 'localhost');
        const port = configService.get('REDIS_PORT', 6379);
        const password = configService.get('REDIS_PASSWORD');
        const redisUrl = password
          ? `redis://:${password}@${host}:${port}`
          : `redis://${host}:${port}`;
        return {
          ttl: 5 * 60 * 1000, // 默认缓存5分钟（毫秒）
          stores: [new KeyvRedis(redisUrl)],
        };
      },
      inject: [ConfigService],
    }),
    // 限流配置 - 防止暴力破解和DDoS
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1秒
        limit: 30, // 每秒最多30次请求（放宽以支持商品列表页）
      },
      {
        name: 'medium',
        ttl: 10000, // 10秒
        limit: 100, // 每10秒最多100次请求
      },
      {
        name: 'long',
        ttl: 60000, // 1分钟
        limit: 300, // 每分钟最多300次请求
      },
    ]),
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    WeidianModule,
    UsersModule,
    AuthModule,
    UploadModule,
    AdminModule,
    ColorsModule,
    SettingsModule,
    AnalyticsModule,
    ReferralModule,
    PlatformsModule,
    SearchModule,
    VisitTrackingModule,
    SocialLinksModule,
    AttributesModule,
    RecommendationsModule,
    PointsModule,
    CheckinModule,
    WithdrawalsModule,
    ProductSourcingRequestsModule,
    ...(enableQueue ? [QueueModule, BatchModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 测试环境或压力测试时禁用限流（DISABLE_THROTTLE=true）
    ...(process.env.NODE_ENV !== 'test' &&
    process.env.DISABLE_THROTTLE !== 'true'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
  ],
})
export class AppModule {}
