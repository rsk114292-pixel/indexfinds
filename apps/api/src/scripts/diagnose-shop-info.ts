/**
 * 诊断脚本：检查店铺信息状态
 *
 * 运行方式：npx ts-node -r tsconfig-paths/register src/scripts/diagnose-shop-info.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('数据库连接成功\n');

  try {
    // 1. 检查商品表中的店铺信息
    console.log('========== 1. 商品表店铺信息统计 ==========\n');

    const productStats = await dataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT("weidianShopId") as with_shop_id,
        COUNT("weidianShopName") as with_shop_name,
        COUNT(CASE WHEN "weidianShopId" IS NOT NULL AND "weidianShopName" IS NOT NULL THEN 1 END) as with_both
      FROM products
    `);
    console.log('商品总数:', productStats[0].total);
    console.log('有 weidianShopId:', productStats[0].with_shop_id);
    console.log('有 weidianShopName:', productStats[0].with_shop_name);
    console.log('两者都有:', productStats[0].with_both);

    // 2. 查看有店铺信息的商品示例
    console.log('\n========== 2. 有店铺信息的商品示例 ==========\n');

    const productsWithShop = await dataSource.query(`
      SELECT id, title, "weidianShopId", "weidianShopName", "weidianItemId"
      FROM products
      WHERE "weidianShopId" IS NOT NULL OR "weidianShopName" IS NOT NULL
      LIMIT 5
    `);

    if (productsWithShop.length > 0) {
      productsWithShop.forEach((p: any, i: number) => {
        console.log(`[${i + 1}] ${p.title}`);
        console.log(`    shopId: ${p.weidianShopId || '(空)'}`);
        console.log(`    shopName: ${p.weidianShopName || '(空)'}`);
        console.log(`    itemId: ${p.weidianItemId}`);
      });
    } else {
      console.log('没有商品有店铺信息');
    }

    // 3. 检查微店缓存表
    console.log('\n========== 3. 微店缓存表店铺信息 ==========\n');

    const cacheStats = await dataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT("shopId") as with_shop_id,
        COUNT("shopName") as with_shop_name
      FROM weidian_cache
    `);
    console.log('缓存总数:', cacheStats[0].total);
    console.log('有 shopId:', cacheStats[0].with_shop_id);
    console.log('有 shopName:', cacheStats[0].with_shop_name);

    // 4. 查看缓存中的店铺信息示例
    console.log('\n========== 4. 缓存中的店铺信息示例 ==========\n');

    const cacheWithShop = await dataSource.query(`
      SELECT "itemId", "shopId", "shopName", title
      FROM weidian_cache
      WHERE "shopId" IS NOT NULL OR "shopName" IS NOT NULL
      LIMIT 5
    `);

    if (cacheWithShop.length > 0) {
      cacheWithShop.forEach((c: any, i: number) => {
        console.log(`[${i + 1}] itemId: ${c.itemId}`);
        console.log(`    shopId: ${c.shopId || '(空)'}`);
        console.log(`    shopName: ${c.shopName || '(空)'}`);
        console.log(`    title: ${c.title?.substring(0, 50) || '(空)'}...`);
      });
    } else {
      console.log('缓存中没有店铺信息');
    }

    // 5. 检查 weidianRawData 中是否有 seller 信息
    console.log('\n========== 5. 检查原始数据中的 seller 信息 ==========\n');

    const rawDataSample = await dataSource.query(`
      SELECT id, title, "weidianRawData"
      FROM products
      WHERE "weidianRawData" IS NOT NULL
      LIMIT 3
    `);

    if (rawDataSample.length > 0) {
      rawDataSample.forEach((p: any, i: number) => {
        console.log(`[${i + 1}] ${p.title}`);
        const rawData =
          typeof p.weidianRawData === 'string'
            ? JSON.parse(p.weidianRawData)
            : p.weidianRawData;

        if (rawData?.skuInfo?.result?.seller) {
          console.log(
            '    seller:',
            JSON.stringify(rawData.skuInfo.result.seller),
          );
        } else {
          console.log('    seller: (不存在)');
        }

        // 检查是否有其他可能包含店铺信息的字段
        const skuInfoKeys = rawData?.skuInfo?.result
          ? Object.keys(rawData.skuInfo.result)
          : [];
        console.log('    skuInfo.result 字段:', skuInfoKeys.join(', '));
      });
    } else {
      console.log('没有商品有原始数据');
    }

    // 6. 总结
    console.log('\n========== 6. 诊断总结 ==========\n');

    const totalProducts = parseInt(productStats[0].total);
    const withShopInfo = parseInt(productStats[0].with_both);
    const percentage =
      totalProducts > 0 ? ((withShopInfo / totalProducts) * 100).toFixed(1) : 0;

    console.log(
      `商品店铺信息覆盖率: ${withShopInfo}/${totalProducts} (${percentage}%)`,
    );

    if (withShopInfo === 0) {
      console.log(
        '\n结论: Thor API 可能不返回 seller 信息，需要从其他来源获取',
      );
    } else if (withShopInfo < totalProducts) {
      console.log('\n结论: 部分商品有店铺信息，可能是不同时期导入的差异');
    } else {
      console.log('\n结论: 所有商品都有店铺信息');
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch(console.error);
