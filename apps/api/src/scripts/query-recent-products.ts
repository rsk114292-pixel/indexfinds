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

  // 查询最近导入的产品
  const products = await ds.query(`
    SELECT
      id,
      substring(title, 1, 60) as title,
      substring("originalTitle", 1, 60) as original_title,
      status,
      "potentialMixedProduct",
      "mixednessScore",
      "isFromSplit",
      "createdAt",
      "sourceUrl"
    FROM products
    ORDER BY "createdAt" DESC
    LIMIT 15
  `);

  console.log('=== 最近导入的产品 ===');
  products.forEach((p: any, i: number) => {
    console.log(`\n--- 产品 ${i + 1} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`标题: ${p.title}`);
    console.log(`原始标题: ${p.original_title}`);
    console.log(`状态: ${p.status}`);
    console.log(`混合商品标记: ${p.potentialMixedProduct}`);
    console.log(`混合度评分: ${p.mixednessScore || 'N/A'}`);
    console.log(`是否拆分而来: ${p.isFromSplit}`);
    console.log(`创建时间: ${p.createdAt}`);
    console.log(`来源URL: ${p.sourceUrl || 'N/A'}`);
  });

  // 统计各状态产品数量
  const statusCounts = await ds.query(`
    SELECT status, count(*) as count
    FROM products
    GROUP BY status
  `);
  console.log('\n=== 产品状态统计 ===');
  console.log(statusCounts);

  // 查看混合商品（潜在混合商品）
  const mixedProducts = await ds.query(`
    SELECT id, substring(title, 1, 60) as title, status, "mixednessScore", "createdAt"
    FROM products
    WHERE "potentialMixedProduct" = true
    ORDER BY "createdAt" DESC
    LIMIT 10
  `);
  console.log('\n=== 混合商品列表（潜在混合商品）===');
  console.log(mixedProducts);

  await ds.destroy();
}

main().catch(console.error);
