/**
 * 历史数据回填脚本
 *
 * 功能：
 * 1. 从 OutboundClick 表聚合外跳次数 → 写入 products.salesCount
 * 2. 从 UserFavorite 表聚合收藏次数 → 写入 products.favoriteCount
 * 3. 触发 popularityScore 重新计算
 *
 * 用法：
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfill-popularity-data.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { PopularityScoreService } from '../products/popularity-score.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('BackfillPopularityData');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const popularityScoreService = app.get(PopularityScoreService);

  try {
    // 1. 回填 salesCount（从 OutboundClick 聚合）
    logger.log('Step 1: 回填 salesCount...');
    const salesResult = await dataSource.query(`
      UPDATE products p
      SET "salesCount" = sub.cnt
      FROM (
        SELECT "productId", COUNT(*)::int AS cnt
        FROM outbound_clicks
        GROUP BY "productId"
      ) sub
      WHERE p.id = sub."productId"
    `);
    logger.log(`salesCount 回填完成，更新 ${salesResult?.[1] ?? '?'} 行`);

    // 2. 回填 favoriteCount（从 UserFavorite 聚合）
    logger.log('Step 2: 回填 favoriteCount...');
    const favResult = await dataSource.query(`
      UPDATE products p
      SET "favoriteCount" = sub.cnt
      FROM (
        SELECT "product_id" AS pid, COUNT(*)::int AS cnt
        FROM user_favorites
        GROUP BY "product_id"
      ) sub
      WHERE p.id = sub.pid
    `);
    logger.log(`favoriteCount 回填完成，更新 ${favResult?.[1] ?? '?'} 行`);

    // 3. 重新计算 popularityScore
    logger.log('Step 3: 重新计算 popularityScore...');
    const { updated, duration } = await popularityScoreService.recalculateAll();
    logger.log(
      `popularityScore 计算完成：${updated} 个产品，耗时 ${duration}ms`,
    );

    logger.log('全部回填完成！');
  } catch (error) {
    logger.error(`回填失败: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
