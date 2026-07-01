/**
 * 批量生成商品图片 embedding 脚本
 *
 * 功能：
 * - 获取所有没有 embedding 的商品
 * - 调用 Python embedding 服务提取图片特征
 * - 将 embedding 存入数据库
 *
 * 使用方法：
 *   cd apps/api
 *   node scripts/backfill/generate-embeddings.js
 *
 * 环境变量：
 *   DATABASE_URL - 数据库连接字符串
 *   EMBEDDING_SERVICE_URL - Python 服务地址 (默认 http://localhost:18001)
 */

import axios from 'axios';
import { Pool } from 'pg';

// 配置
const config = {
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:15432/lolobuyspreadsheets_dev',
  embeddingServiceUrl:
    process.env.EMBEDDING_SERVICE_URL || 'http://localhost:18001',
  batchSize: 10, // 每批处理数量
  concurrency: 3, // 并发请求数
  retryCount: 2, // 失败重试次数
  retryDelay: 1000, // 重试延迟 (ms)
};

// 统计信息
const stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
};

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 检查 embedding 服务是否可用
 */
async function checkEmbeddingService(): Promise<boolean> {
  try {
    const response = await axios.get(`${config.embeddingServiceUrl}/health`, {
      timeout: 5000,
    });
    return response.data?.status === 'ok';
  } catch (error) {
    return false;
  }
}

/**
 * 从 URL 获取图片 embedding
 */
async function getEmbeddingFromUrl(
  imageUrl: string,
  retries = config.retryCount,
): Promise<number[] | null> {
  try {
    const response = await axios.post(
      `${config.embeddingServiceUrl}/embedding/url`,
      null,
      {
        params: { url: imageUrl },
        timeout: 30000,
      },
    );
    return response.data.embedding;
  } catch (error: any) {
    if (retries > 0) {
      await sleep(config.retryDelay);
      return getEmbeddingFromUrl(imageUrl, retries - 1);
    }
    console.error(`  Failed to get embedding: ${error.message}`);
    return null;
  }
}

/**
 * 处理单个商品
 */
async function processProduct(
  pool: Pool,
  product: { id: string; mainImage: string | null; images: string | null },
): Promise<boolean> {
  // images 可能是 JSON 字符串
  let imagesArray: string[] = [];
  if (product.images) {
    try {
      imagesArray = JSON.parse(product.images);
    } catch {
      imagesArray = [];
    }
  }
  const imageUrl = product.mainImage || imagesArray[0];

  if (!imageUrl) {
    stats.skipped++;
    return false;
  }

  const embedding = await getEmbeddingFromUrl(imageUrl);

  if (!embedding) {
    stats.failed++;
    return false;
  }

  try {
    await pool.query(
      `UPDATE products SET embedding = $1::vector WHERE id = $2`,
      [`[${embedding.join(',')}]`, product.id],
    );
    stats.success++;
    return true;
  } catch (error: any) {
    console.error(`  DB update failed for ${product.id}: ${error.message}`);
    stats.failed++;
    return false;
  }
}

/**
 * 打印进度
 */
function printProgress(): void {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const rate = stats.processed / elapsed;
  const eta = stats.total > 0 ? (stats.total - stats.processed) / rate : 0;

  process.stdout.write(
    `\rProgress: ${stats.processed}/${stats.total} | ` +
      `Success: ${stats.success} | Failed: ${stats.failed} | ` +
      `Rate: ${rate.toFixed(1)}/s | ETA: ${Math.round(eta)}s    `,
  );
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Batch Generate Product Embeddings');
  console.log('='.repeat(60));
  console.log(`Database: ${config.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`Embedding Service: ${config.embeddingServiceUrl}`);
  console.log('');

  // 检查 embedding 服务
  console.log('Checking embedding service...');
  const serviceAvailable = await checkEmbeddingService();
  if (!serviceAvailable) {
    console.error('ERROR: Embedding service is not available!');
    console.error(
      `Please ensure the service is running at ${config.embeddingServiceUrl}`,
    );
    console.error('');
    console.error('To start the service:');
    console.error('  docker-compose up -d embedding-service');
    console.error('  # or');
    console.error('  cd embedding-service && python main.py');
    process.exit(1);
  }
  console.log('Embedding service is available!\n');

  // 连接数据库
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    // 检查 pgvector 扩展
    const extCheck = await pool.query(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector'`,
    );
    if (extCheck.rowCount === 0) {
      console.error('ERROR: pgvector extension is not enabled!');
      console.error('Please run: CREATE EXTENSION vector;');
      process.exit(1);
    }

    // 检查 embedding 列是否存在
    const colCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'embedding'
    `);
    if (colCheck.rowCount === 0) {
      console.error('ERROR: embedding column does not exist!');
      console.error('Please run the migration script first.');
      process.exit(1);
    }

    // 获取需要处理的商品
    console.log('Fetching products without embeddings...');
    const { rows: products } = await pool.query(`
      SELECT id, "mainImage", images
      FROM products
      WHERE embedding IS NULL
        AND (
          "mainImage" IS NOT NULL
          OR (images IS NOT NULL AND images != '[]' AND images != '')
        )
      ORDER BY "createdAt" DESC
    `);

    stats.total = products.length;
    console.log(`Found ${stats.total} products to process\n`);

    if (stats.total === 0) {
      console.log('All products already have embeddings!');
      return;
    }

    // 批量处理
    console.log('Processing...');
    stats.startTime = Date.now();

    for (let i = 0; i < products.length; i += config.concurrency) {
      const batch = products.slice(i, i + config.concurrency);

      await Promise.all(
        batch.map(async (product) => {
          await processProduct(pool, product);
          stats.processed++;
          printProgress();
        }),
      );

      // 短暂延迟，避免过载
      if (i + config.concurrency < products.length) {
        await sleep(100);
      }
    }

    // 打印最终统计
    console.log('\n');
    console.log('='.repeat(60));
    console.log('Completed!');
    console.log('='.repeat(60));
    console.log(`Total:     ${stats.total}`);
    console.log(`Success:   ${stats.success}`);
    console.log(`Failed:    ${stats.failed}`);
    console.log(`Skipped:   ${stats.skipped} (no image)`);
    console.log(
      `Time:      ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`,
    );

    // 建议创建索引
    if (stats.success > 100) {
      console.log('\n');
      console.log('TIP: You may want to create/refresh the vector index:');
      console.log(`
  -- Drop existing index if exists
  DROP INDEX IF EXISTS idx_products_embedding;

  -- Create IVFFlat index (adjust 'lists' based on your data size)
  CREATE INDEX idx_products_embedding
  ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = ${Math.ceil(Math.sqrt(stats.success))});
      `);
    }
  } finally {
    await pool.end();
  }
}

// 运行
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
