/**
 * 检查缺少店铺信息的产品
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    const products = await dataSource.query(`
    SELECT id, title, "weidianItemId", "weidianShopId", "weidianShopName", "createdAt"
    FROM products
    WHERE "weidianShopId" IS NULL OR "weidianShopName" IS NULL
    ORDER BY "createdAt" DESC
  `);

  console.log('缺少店铺信息的产品 (' + products.length + ' 个):\n');
  products.forEach((p: any, i: number) => {
    console.log(`[${i + 1}] ${p.title}`);
    console.log(`    ID: ${p.id}`);
    console.log(`    微店商品ID: ${p.weidianItemId || '无'}`);
    console.log(`    创建时间: ${p.createdAt}`);
    console.log('');
  });

  // 检查这些产品是否在缓存中有店铺信息
  console.log('\n========== 检查缓存中是否有这些产品的店铺信息 ==========\n');

  const itemIds = products.map((p: any) => p.weidianItemId).filter(Boolean);
  if (itemIds.length > 0) {
    const cacheData = await dataSource.query(
      `
      SELECT "itemId", "shopId", "shopName"
      FROM weidian_cache
      WHERE "itemId" = ANY($1)
    `,
      [itemIds],
    );

    if (cacheData.length > 0) {
      console.log('缓存中找到的店铺信息:');
      cacheData.forEach((c: any) => {
        console.log(
          `  itemId: ${c.itemId} -> shopId: ${c.shopId}, shopName: ${c.shopName}`,
        );
      });
    } else {
      console.log('缓存中没有这些产品的店铺信息');
    }
  }
  });
}

void runScriptMain('缺失店铺信息检查', main);
