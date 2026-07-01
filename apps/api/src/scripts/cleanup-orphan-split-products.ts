import { DataSource, In } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupOrphanSplitProducts() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // 查找所有 isFromSplit = true 的商品
    const splitProducts = await dataSource.query(`
      SELECT id, title, slug, status, "isFromSplit", "productGroupId", "createdAt"
      FROM products
      WHERE "isFromSplit" = true
      ORDER BY "createdAt" DESC
    `);

    console.log(`找到 ${splitProducts.length} 个拆分创建的商品:\n`);

    for (const product of splitProducts) {
      console.log(`- ${product.title}`);
      console.log(`  ID: ${product.id}`);
      console.log(`  Slug: ${product.slug}`);
      console.log(`  Status: ${product.status}`);
      console.log(`  Group ID: ${product.productGroupId}`);
      console.log(`  Created: ${product.createdAt}`);
      console.log('');
    }

    // 检查是否有对应的 split history 记录
    const splitHistories = await dataSource.query(`
      SELECT id, "sourceProductId", "sourceWeidianItemId", status, "resultProductIds", "createdAt"
      FROM product_split_history
      ORDER BY "createdAt" DESC
    `);

    console.log(`\n找到 ${splitHistories.length} 条拆分历史记录:\n`);

    for (const history of splitHistories) {
      console.log(`- History ID: ${history.id}`);
      console.log(`  Source Product ID: ${history.sourceProductId}`);
      console.log(`  Weidian Item ID: ${history.sourceWeidianItemId}`);
      console.log(`  Status: ${history.status}`);
      console.log(
        `  Result Product IDs: ${JSON.stringify(history.resultProductIds)}`,
      );
      console.log(`  Created: ${history.createdAt}`);
      console.log('');
    }

    // 找出孤儿产品（isFromSplit=true 但不在任何 active 历史的 resultProductIds 中）
    const activeHistoryProductIds = splitHistories
      .filter((h: any) => h.status === 'active')
      .flatMap((h: any) => h.resultProductIds || []);

    const orphanProducts = splitProducts.filter(
      (p: any) => !activeHistoryProductIds.includes(p.id),
    );

    console.log(
      `\n⚠️ 发现 ${orphanProducts.length} 个孤儿商品（无有效拆分历史关联）:\n`,
    );

    for (const product of orphanProducts) {
      console.log(`- ${product.title} (${product.id})`);
    }

    if (orphanProducts.length > 0) {
      console.log(
        '\n是否要删除这些孤儿商品？请在确认后运行带 --delete 参数的命令',
      );

      // 检查命令行参数
      if (process.argv.includes('--delete')) {
        console.log('\n正在删除孤儿商品...');

        const orphanIds = orphanProducts.map((p: any) => p.id);

        // 先删除关联的 SKU
        await dataSource.query(
          `
          DELETE FROM skus WHERE "productId" = ANY($1::uuid[])
        `,
          [orphanIds],
        );

        // 删除商品
        await dataSource.query(
          `
          DELETE FROM products WHERE id = ANY($1::uuid[])
        `,
          [orphanIds],
        );

        console.log(`✅ 已删除 ${orphanProducts.length} 个孤儿商品及其 SKU`);
      }
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

cleanupOrphanSplitProducts();
