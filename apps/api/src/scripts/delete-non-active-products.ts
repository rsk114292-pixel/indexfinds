/**
 * 删除非上架状态的产品
 *
 * 使用方法: npx ts-node src/scripts/delete-non-active-products.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  await dataSource.initialize();
  console.log('数据库连接成功\n');

  // 查看各状态的产品数量
  const stats = await dataSource.query(`
    SELECT status, COUNT(*) as count
    FROM products
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('产品状态统计:');
  console.table(stats);

  // 查看非 active 状态的产品数量
  const nonActiveProducts = await dataSource.query(`
    SELECT id, title, status, "createdAt"
    FROM products
    WHERE status != 'active'
    ORDER BY "createdAt" DESC
    LIMIT 20
  `);

  const totalNonActive = await dataSource.query(`
    SELECT COUNT(*) as count FROM products WHERE status != 'active'
  `);

  console.log(`\n非上架状态产品总数: ${totalNonActive[0].count}`);
  console.log('\n最近的非上架产品 (最多20个):');
  console.table(
    nonActiveProducts.map((p: any) => ({
      id: p.id.substring(0, 8) + '...',
      title: p.title?.substring(0, 40) || 'N/A',
      status: p.status,
      createdAt: p.createdAt,
    })),
  );

  if (parseInt(totalNonActive[0].count) === 0) {
    console.log('\n没有需要删除的产品');
    await dataSource.destroy();
    return;
  }

  // 确认删除
  const shouldDelete = await confirm(
    `\n确定要删除 ${totalNonActive[0].count} 个非上架产品吗?`,
  );

  if (!shouldDelete) {
    console.log('操作已取消');
    await dataSource.destroy();
    return;
  }

  console.log('\n开始删除...');

  // 使用事务删除
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. 获取要删除的产品 ID
    const productIds = await queryRunner.query(`
      SELECT id FROM products WHERE status != 'active'
    `);
    const ids = productIds.map((p: any) => p.id);

    if (ids.length === 0) {
      console.log('没有需要删除的产品');
      await queryRunner.rollbackTransaction();
      return;
    }

    console.log(`准备删除 ${ids.length} 个产品...`);

    // 2. 更新 batch_job_items 的 productId 为 null (先更新外键引用)
    const batchResult = await queryRunner.query(
      `
      UPDATE batch_job_items SET "productId" = NULL WHERE "productId" = ANY($1)
    `,
      [ids],
    );
    console.log(`已更新 ${batchResult[1] || 0} 个 batch_job_items`);

    // 3. 删除相关的 SKU
    const skuResult = await queryRunner.query(
      `
      DELETE FROM skus WHERE "productId" = ANY($1)
    `,
      [ids],
    );
    console.log(`已删除 ${skuResult[1] || 0} 个 SKU`);

    // 4. 检查并删除产品文本嵌入 (如果表存在)
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'product_text_embeddings'
      )
    `);
    if (tableExists[0].exists) {
      const embeddingResult = await queryRunner.query(
        `
        DELETE FROM product_text_embeddings WHERE product_id = ANY($1)
      `,
        [ids],
      );
      console.log(`已删除 ${embeddingResult[1] || 0} 个文本嵌入`);
    }

    // 5. 删除产品
    const productResult = await queryRunner.query(
      `
      DELETE FROM products WHERE id = ANY($1)
    `,
      [ids],
    );
    console.log(`已删除 ${productResult[1] || 0} 个产品`);

    await queryRunner.commitTransaction();
    console.log('\n✅ 删除完成!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('删除失败:', error);
  } finally {
    await queryRunner.release();
  }

  await dataSource.destroy();
}

main().catch(console.error);
