/**
 * 批量生成商品文本向量脚本
 *
 * 用法:
 *   npx ts-node src/scripts/generate-text-embeddings.ts [--limit=1000] [--force]
 *
 * 参数:
 *   --limit=N  每次处理的商品数量，默认 100
 *   --force    强制重新生成所有向量（包括已存在的）
 *   --loop     循环执行直到所有商品都处理完
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SemanticSearchService } from '../search/semantic-search.service';

async function bootstrap() {
  console.log('Starting text embedding generation...\n');

  // 解析命令行参数
  const args = process.argv.slice(2);
  let limit = 100;
  let forceRegenerate = false;
  let loopMode = false;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10) || 100;
    } else if (arg === '--force') {
      forceRegenerate = true;
    } else if (arg === '--loop') {
      loopMode = true;
    }
  }

  console.log(`Configuration:`);
  console.log(`  - Limit per batch: ${limit}`);
  console.log(`  - Force regenerate: ${forceRegenerate}`);
  console.log(`  - Loop mode: ${loopMode}\n`);

  // 创建 NestJS 应用上下文
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const semanticSearchService = app.get(SemanticSearchService);

  // 检查服务可用性
  if (!semanticSearchService.isAvailable()) {
    console.error('ERROR: Embedding service is not available.');
    console.error(
      'Please ensure EMBEDDING_SERVICE_URL is configured correctly.',
    );
    await app.close();
    process.exit(1);
  }

  // 获取初始统计
  const initialStats = await semanticSearchService.getStats();
  console.log(`Initial state:`);
  console.log(`  - Total active products: ${initialStats.totalProducts}`);
  console.log(
    `  - Products with embeddings: ${initialStats.productsWithEmbedding}`,
  );
  console.log(
    `  - Coverage: ${(initialStats.coverageRate * 100).toFixed(1)}%\n`,
  );

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let batchNumber = 0;

  do {
    batchNumber++;
    console.log(`\n--- Batch ${batchNumber} ---`);

    const startTime = Date.now();
    const stats = await semanticSearchService.batchGenerateEmbeddings(
      limit,
      forceRegenerate,
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`Processed: ${stats.total} products in ${duration}s`);
    console.log(`  - Success: ${stats.success}`);
    console.log(`  - Failed: ${stats.failed}`);
    console.log(`  - Skipped: ${stats.skipped}`);

    totalProcessed += stats.total;
    totalSuccess += stats.success;
    totalFailed += stats.failed;

    // 如果没有处理任何商品，退出循环
    if (stats.total === 0) {
      console.log('\nNo more products to process.');
      break;
    }

    // 非循环模式只执行一次
    if (!loopMode) {
      break;
    }

    // 循环模式下，短暂暂停避免过载
    console.log('Waiting 2 seconds before next batch...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } while (loopMode);

  // 获取最终统计
  const finalStats = await semanticSearchService.getStats();

  console.log(`\n========== Summary ==========`);
  console.log(`Total batches: ${batchNumber}`);
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total success: ${totalSuccess}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log(`\nFinal state:`);
  console.log(
    `  - Products with embeddings: ${finalStats.productsWithEmbedding}`,
  );
  console.log(`  - Coverage: ${(finalStats.coverageRate * 100).toFixed(1)}%`);

  await app.close();
  console.log('\nDone!');
}

bootstrap().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
