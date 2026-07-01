import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 队列名称常量
export const QUEUE_NAMES = {
  BATCH_IMPORT: 'batch-import',
  AI_GENERATION: 'ai-generation',
  EMBEDDING: 'embedding',
  CACHE_REFRESH: 'cache-refresh',
  SKU_SPLIT: 'sku-split',
  SKU_SPLIT_BATCH: 'sku-split-batch',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          family: 4, // 强制使用 IPv4
          maxRetriesPerRequest: null,
          connectTimeout: 10000,
          keepAlive: 30000,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),
    // 批量导入队列 - 微店抓取，严格限制并发避免 IP 被封
    BullModule.registerQueue({
      name: QUEUE_NAMES.BATCH_IMPORT,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5秒 → 10秒 → 20秒（给微店服务器喘息时间）
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    // AI 生成队列 - API 调用，可能遇到 rate limit，重试间隔较长
    // 注意：AI 分析可能需要较长时间（尤其是 50+ 图片的两阶段分析）
    BullModule.registerQueue({
      name: QUEUE_NAMES.AI_GENERATION,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5秒 → 10秒 → 20秒
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    // Embedding 队列 - 后台任务，优先级低
    // 6 次重试 + 不自动删除失败任务，由定时恢复任务兜底
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMBEDDING,
      defaultJobOptions: {
        attempts: 6,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10s → 20s → 40s → 80s → 160s → 320s（总等待 ~10分钟）
        },
        removeOnComplete: 100,
        removeOnFail: false, // 不删除失败任务，保留用于排查和恢复
      },
    }),
    // 缓存刷新队列 - 点击触发 + 兜底扫描
    BullModule.registerQueue({
      name: QUEUE_NAMES.CACHE_REFRESH,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10秒 → 20秒
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    // SKU 拆分队列 - 内部并发由 processor 控制
    BullModule.registerQueue({
      name: QUEUE_NAMES.SKU_SPLIT,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10秒 → 20秒
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.SKU_SPLIT_BATCH,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
