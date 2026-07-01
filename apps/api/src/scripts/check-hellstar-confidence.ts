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

  // 获取 HELLSTAR 短裤的 AI 相关信息
  const product = await ds.query(`
    SELECT
      id,
      title,
      status,
      "brandConfidence",
      "splitMetadata",
      "aiAttributes"
    FROM products
    WHERE id = '0a5ad25d-6591-4c6c-8371-4fee66c4d808'
  `);

  if (product.length > 0) {
    const p = product[0];
    console.log('=== HELLSTAR 短裤 AI 置信度信息 ===');
    console.log('状态:', p.status);
    console.log('品牌置信度:', p.brandConfidence);
    console.log('splitMetadata:', JSON.stringify(p.splitMetadata, null, 2));
  }

  await ds.destroy();
}

main().catch(console.error);
