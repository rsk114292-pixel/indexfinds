/**
 * 修复缺少店铺信息的产品
 * 从 weidian_cache 表中获取店铺信息并更新到 products 表
 */
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
  });

  await ds.initialize();
  console.log('数据库连接成功\n');

  try {
    // 1. 找到所有缺少店铺信息的产品
    const productsWithoutShop = await ds.query(`
      SELECT id, title, "weidianItemId"
      FROM products
      WHERE ("weidianShopId" IS NULL OR "weidianShopName" IS NULL)
        AND "weidianItemId" IS NOT NULL
    `);

    console.log(`找到 ${productsWithoutShop.length} 个缺少店铺信息的产品\n`);

    if (productsWithoutShop.length === 0) {
      console.log('没有需要修复的产品');
      return;
    }

    // 2. 获取这些产品对应的缓存数据
    const itemIds = [
      ...new Set(productsWithoutShop.map((p: any) => p.weidianItemId)),
    ];
    console.log(`涉及 ${itemIds.length} 个唯一的微店商品ID\n`);

    const cacheData = await ds.query(
      `
      SELECT "itemId", "shopId", "shopName"
      FROM weidian_cache
      WHERE "itemId" = ANY($1)
    `,
      [itemIds],
    );

    // 创建 itemId -> shopInfo 映射
    const shopInfoMap = new Map<string, { shopId: string; shopName: string }>();
    cacheData.forEach((c: any) => {
      shopInfoMap.set(c.itemId, { shopId: c.shopId, shopName: c.shopName });
    });

    console.log(`从缓存中找到 ${shopInfoMap.size} 个商品的店铺信息\n`);

    // 3. 更新产品
    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of productsWithoutShop) {
      const shopInfo = shopInfoMap.get(product.weidianItemId);

      if (shopInfo && shopInfo.shopId && shopInfo.shopName) {
        await ds.query(
          `
          UPDATE products
          SET "weidianShopId" = $1, "weidianShopName" = $2
          WHERE id = $3
        `,
          [shopInfo.shopId, shopInfo.shopName, product.id],
        );

        console.log(`✓ 更新: ${product.title}`);
        console.log(
          `  -> shopId: ${shopInfo.shopId}, shopName: ${shopInfo.shopName}`,
        );
        updatedCount++;
      } else {
        console.log(`✗ 跳过: ${product.title} (缓存中没有店铺信息)`);
        skippedCount++;
      }
    }

    console.log('\n========== 修复完成 ==========');
    console.log(`成功更新: ${updatedCount} 个产品`);
    console.log(`跳过: ${skippedCount} 个产品`);

    // 4. 验证修复结果
    const remainingCount = await ds.query(`
      SELECT COUNT(*) as count
      FROM products
      WHERE "weidianShopId" IS NULL OR "weidianShopName" IS NULL
    `);

    console.log(`\n修复后仍缺少店铺信息的产品: ${remainingCount[0].count} 个`);
  } finally {
    await ds.destroy();
  }
}

main().catch(console.error);
