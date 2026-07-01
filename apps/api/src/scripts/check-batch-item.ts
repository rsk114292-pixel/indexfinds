import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
    synchronize: false,
  });

  await ds.initialize();

  // 获取最近的批处理任务项
  const items = await ds.query(`
    SELECT
      i.id,
      i."sourceUrl",
      i.status,
      i."aiGeneratedData",
      i."createdAt",
      i."updatedAt"
    FROM batch_job_items i
    ORDER BY i."createdAt" DESC
    LIMIT 5
  `);

  console.log('=== 最近的批处理任务项 ===');
  items.forEach((item: any, idx: number) => {
    console.log(`\n--- 任务项 ${idx + 1} ---`);
    console.log('ID:', item.id);
    console.log('来源URL:', item.sourceUrl);
    console.log('状态:', item.status);
    console.log('创建时间:', item.createdAt);

    if (item.aiGeneratedData) {
      const ai = item.aiGeneratedData;
      console.log('\n--- AI 生成数据 ---');
      console.log('标题:', ai.title);
      console.log('品牌:', ai.brandName);
      console.log('分类:', ai.category);
      console.log('置信度:', ai.confidence);
      console.log('是否混合商品:', ai.isMixedProduct);
      console.log('混合度评分:', ai.mixednessScore);
      console.log('处理策略:', ai.processingStrategy);
    }
  });

  await ds.destroy();
}

main().catch(console.error);
