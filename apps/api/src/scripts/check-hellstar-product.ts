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

  // 获取 HELLSTAR 短裤的完整信息
  const product = await ds.query(`
    SELECT *
    FROM products
    WHERE id = '0a5ad25d-6591-4c6c-8371-4fee66c4d808'
  `);

  if (product.length > 0) {
    const p = product[0];
    console.log('=== HELLSTAR 短裤详细信息 ===');
    console.log('ID:', p.id);
    console.log('标题:', p.title);
    console.log('原始标题:', p.originalTitle);
    console.log('状态:', p.status);
    console.log('品牌ID:', p.brandId);
    console.log('主分类ID:', p.primaryCategoryId);
    console.log(
      '描述:',
      p.description ? p.description.substring(0, 100) + '...' : 'N/A',
    );
    console.log('主图:', p.mainImage);
    console.log('图片数量:', p.images ? JSON.parse(p.images).length : 0);
    console.log('价格范围:', p.priceMin, '-', p.priceMax);
    console.log('混合商品标记:', p.potentialMixedProduct);
    console.log('混合度评分:', p.mixednessScore);
    console.log('AI属性:', p.aiAttributes);
    console.log('创建时间:', p.createdAt);
    console.log('更新时间:', p.updatedAt);
  }

  // 检查是否有关联的 SKU
  const skus = await ds.query(`
    SELECT id, "skuKey", price, stock, attributes
    FROM skus
    WHERE "productId" = '0a5ad25d-6591-4c6c-8371-4fee66c4d808'
  `);
  console.log('\n=== SKU 信息 ===');
  console.log('SKU 数量:', skus.length);
  if (skus.length > 0) {
    console.log('SKU 样例:', JSON.stringify(skus.slice(0, 3), null, 2));
  }

  // 检查队列任务状态
  const jobs = await ds.query(`
    SELECT * FROM information_schema.tables WHERE table_name = 'bull_jobs'
  `);

  if (jobs.length > 0) {
    const aiJobs = await ds.query(`
      SELECT * FROM bull_jobs
      WHERE data::text LIKE '%0a5ad25d-6591-4c6c-8371-4fee66c4d808%'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);
    console.log('\n=== 相关队列任务 ===');
    console.log(aiJobs);
  }

  await ds.destroy();
}

main().catch(console.error);
