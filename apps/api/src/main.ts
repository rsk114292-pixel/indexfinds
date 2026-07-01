import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { basename, join } from 'path';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { applyDnsResultOrder } from './network/dns-default-order';

/**
 * 确保 pgvector embedding 列存在
 * TypeORM 不支持 vector 类型，所以需要手动管理这个列
 */
async function ensureEmbeddingColumn(dataSource: DataSource) {
  try {
    await dataSource.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS embedding vector(512)
    `);
    console.log('✅ Embedding column ensured');
  } catch (error) {
    // 如果 pgvector 扩展不存在，尝试创建
    if (error.message?.includes('type "vector" does not exist')) {
      console.log(
        '⚠️ pgvector extension not installed, skipping embedding column',
      );
    } else {
      console.error('Failed to ensure embedding column:', error.message);
    }
  }
}

/**
 * 兼容旧数据库：确保 platforms.translations 列存在
 * 该列由 migration 1773078011000 引入，但开发环境可能未及时执行 migration
 */
async function ensurePlatformTranslationsColumn(dataSource: DataSource) {
  try {
    await dataSource.query(`
      ALTER TABLE platforms
      ADD COLUMN IF NOT EXISTS translations text
    `);
    console.log('✅ Platform translations column ensured');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to ensure platforms.translations column:', message);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message, error.stack);
  process.exit(1);
});

applyDnsResultOrder(process.env);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // In production the API sits behind one or more proxies/CDNs.
  // Trust forwarded client IPs so global rate limiting does not collapse all users
  // into the proxy's address and trigger false 429s on public catalog pages.
  const trustProxyConfig =
    process.env.TRUST_PROXY ??
    (process.env.NODE_ENV === 'production' ? 'true' : '');
  if (trustProxyConfig) {
    const normalized = trustProxyConfig.toLowerCase();
    const numericValue = Number(trustProxyConfig);
    const trustProxyValue =
      normalized === 'true'
        ? true
        : normalized === 'false'
          ? false
          : Number.isFinite(numericValue)
            ? numericValue
            : trustProxyConfig;
    app.set('trust proxy', trustProxyValue);
  }

  // 兼容旧库：先确保平台多语言列存在，避免模块初始化查询失败
  const dataSource = app.get(DataSource);
  await ensurePlatformTranslationsColumn(dataSource);

  // 确保 embedding 列存在（TypeORM 同步后可能会删除它）
  await ensureEmbeddingColumn(dataSource);

  // 响应压缩（gzip/br），减少 JSON 等响应体积 60-80%
  app.use(compression());

  // Cookie 解析中间件（用于 Refresh Token）
  app.use(cookieParser());

  // 安全中间件 - Helmet
  // CSP 策略：API 后端不需要内联脚本，移除 unsafe-inline 防止 XSS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          // scriptSrc: 移除 'unsafe-inline'，API 不应执行内联脚本
          scriptSrc: ["'self'"],
          // styleSrc: 保留 'unsafe-inline' 以支持可能的错误页面样式
          styleSrc: ["'self'", "'unsafe-inline'"],
          // 添加额外的安全指令
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // 允许嵌入外部图片
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // 允许跨域访问静态资源
    }),
  );

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints).join(', ')
            : 'validation failed';
          return `${error.property}: ${constraints}`;
        });
        console.error('Validation errors:', messages);
        return new BadRequestException(messages);
      },
    }),
  );

  // 全局序列化拦截器 — 使 @Exclude() 等 class-transformer 装饰器生效
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // 提供静态文件访问
  // 可通过 UPLOADS_PATH 环境变量覆盖（Docker 生产环境设为 /app/uploads）
  // 开发环境默认: __dirname=apps/api/dist → ../../uploads = apps/uploads
  const uploadsPath =
    process.env.UPLOADS_PATH || join(__dirname, '..', '..', 'uploads');
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    setHeaders: (res, filePath) => {
      const fileName = basename(filePath).toLowerCase();

      // Brand logos are content-versioned via timestamped filenames.
      // Safe to cache aggressively and let Cloudflare keep them at the edge.
      if (fileName.startsWith('brand-')) {
        res.setHeader(
          'Cache-Control',
          'public, max-age=31536000, immutable, stale-while-revalidate=604800',
        );
        return;
      }

      res.setHeader(
        'Cache-Control',
        'public, max-age=86400, stale-while-revalidate=604800',
      );
    },
  });

  // CORS配置（支持 HttpOnly Cookie 跨域）
  const corsOrigin = process.env.CORS_ORIGIN;
  const isProduction = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // 允许无 origin 的请求（如服务端请求）
      if (!origin) return callback(null, true);
      // 仅开发环境允许 localhost（生产环境必须走 CORS_ORIGIN 白名单）
      if (!isProduction) {
        if (/^http:\/\/localhost:\d+$/.test(origin))
          return callback(null, true);
        if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
          return callback(null, true);
      }
      // 从 CORS_ORIGIN 环境变量读取白名单
      if (corsOrigin) {
        const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
        if (allowedOrigins.includes(origin)) return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // Swagger/OpenAPI 文档（仅开发/测试环境）
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(`${process.env.SITE_NAME || 'LoloBuySpreadsheets'} API`)
      .setDescription(
        `${process.env.SITE_NAME || 'LoloBuySpreadsheets'} 商品搜索与发现平台 API 文档`,
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4101;
  await app.listen(port);
  console.log(`🚀 API服务器运行在 http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 API文档: http://localhost:${port}/api/docs`);
  }
}
void bootstrap();
