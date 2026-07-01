/**
 * 删除所有产品（用于重新导入）
 *
 * 使用方法: cd apps/api && npx ts-node src/scripts/delete-all-products.ts
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

  const totalProducts = await dataSource.query(`
    SELECT COUNT(*) as count FROM products
  `);

  const totalCount = parseInt(totalProducts[0].count);
  console.log(`\n产品总数: ${totalCount}`);

  if (totalCount === 0) {
    console.log('\n没有需要删除的产品');
    await dataSource.destroy();
    return;
  }

  // 查看 batch_job_items 状态
  const batchStats = await dataSource.query(`
    SELECT status, COUNT(*) as count
    FROM batch_job_items
    GROUP BY status
    ORDER BY count DESC
  `);

  console.log('\nBatch Job Items 状态统计:');
  console.table(batchStats);

  // 确认删除
  console.log('\n⚠️  警告: 此操作将删除所有产品和相关的 SKU、嵌入数据！');
  console.log('⚠️  Batch Job Items 将保留，但 productId 会被清空。');
  const shouldDelete = await confirm(
    `\n确定要删除全部 ${totalCount} 个产品吗?`,
  );

  if (!shouldDelete) {
    console.log('操作已取消');
    await dataSource.destroy();
    return;
  }

  // 二次确认
  const shouldDeleteConfirm = await confirm('再次确认: 真的要删除所有产品吗?');
  if (!shouldDeleteConfirm) {
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
    // 1. 更新 batch_job_items 的 productId 为 null
    const batchResult = await queryRunner.query(`
      UPDATE batch_job_items SET "productId" = NULL WHERE "productId" IS NOT NULL
    `);
    console.log(`已更新 ${batchResult[1] || 0} 个 batch_job_items`);

    // 2. 删除所有 SKU
    const skuResult = await queryRunner.query(`DELETE FROM skus`);
    console.log(`已删除 ${skuResult[1] || 0} 个 SKU`);

    // 3. 检查并删除产品文本嵌入 (如果表存在)
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'product_text_embeddings'
      )
    `);
    if (tableExists[0].exists) {
      const embeddingResult = await queryRunner.query(
        `DELETE FROM product_text_embeddings`,
      );
      console.log(`已删除 ${embeddingResult[1] || 0} 个文本嵌入`);
    }

    // 4. 检查并删除图片嵌入 (如果表存在)
    const imgEmbeddingExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'product_image_embeddings'
      )
    `);
    if (imgEmbeddingExists[0].exists) {
      const imgResult = await queryRunner.query(
        `DELETE FROM product_image_embeddings`,
      );
      console.log(`已删除 ${imgResult[1] || 0} 个图片嵌入`);
    }

    // 5. 删除所有产品
    const productResult = await queryRunner.query(`DELETE FROM products`);
    console.log(`已删除 ${productResult[1] || 0} 个产品`);

    // 6. 重置 batch_job_items 状态为 FETCHED（可重新处理）
    const resetBatch = await confirm(
      '\n是否将 batch_job_items 状态重置为 FETCHED（以便重新导入）?',
    );
    if (resetBatch) {
      const resetResult = await queryRunner.query(`
        UPDATE batch_job_items
        SET status = 'FETCHED', "errorMessage" = NULL
        WHERE status IN ('PUBLISHED', 'APPROVED', 'REVIEW', 'FAILED', 'GENERATING')
      `);
      console.log(
        `已重置 ${resetResult[1] || 0} 个 batch_job_items 为 FETCHED 状态`,
      );
    }

    await queryRunner.commitTransaction();
    console.log('\n✅ 删除完成!');
    console.log('\n现在可以重新触发 AI 生成任务来重新导入产品。');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('删除失败:', error);
  } finally {
    await queryRunner.release();
  }

  await dataSource.destroy();
}

main().catch(console.error);
