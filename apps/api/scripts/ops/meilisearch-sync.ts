/**
 * 一次性脚本：触发 Meilisearch 全量同步
 * 用法：npx ts-node -r tsconfig-paths/register scripts/ops/meilisearch-sync.ts
 * 同步完成后可删除此文件
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { MeilisearchSyncService } from '../../src/meilisearch/meilisearch-sync.service';
import { MeilisearchService } from '../../src/meilisearch/meilisearch.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const meiliService = app.get(MeilisearchService);
  const syncService = app.get(MeilisearchSyncService);

  // 1. 健康检查
  const healthy = await meiliService.isHealthy();
  if (!healthy) {
    console.error('❌ Meilisearch 无法连接，请确认 docker compose up -d meilisearch');
    await app.close();
    process.exit(1);
  }
  console.log('✅ Meilisearch 连接正常');

  // 2. 全量同步
  console.log('🔄 开始全量同步...');
  const start = Date.now();
  const result = await syncService.fullSync();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ 同步完成：${result.synced} 个商品，耗时 ${elapsed}s`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ 同步失败:', err.message);
  process.exit(1);
});
