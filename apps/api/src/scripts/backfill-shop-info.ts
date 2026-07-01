/**
 * 回填脚本：为现有商品补充店铺信息
 *
 * 运行方式：npx ts-node -r tsconfig-paths/register src/scripts/backfill-shop-info.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// 从微店商品页面 HTML 抓取店铺信息
async function fetchShopInfoFromHtml(
  itemId: string,
): Promise<{ shopId?: string; shopName?: string }> {
  const url = `https://weidian.com/item.html?itemID=${itemId}`;
  console.log(`  [${itemId}] 抓取页面: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`  [${itemId}] 请求失败: ${response.status}`);
      return {};
    }

    const html = await response.text();

    // 方法1: 从 data-obj 属性中提取（微店新版页面结构）
    // 数据格式: <script id="__rocker-render-inject__" data-obj="{&#34;...&#34;}">
    const dataObjMatch = html.match(/data-obj="([^"]+)"/);
    if (dataObjMatch) {
      try {
        // 解码 HTML 实体
        const decoded = dataObjMatch[1]
          .replace(/&#34;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        const data = JSON.parse(decoded);
        const shopInfo = data?.result?.default_model?.shop_info;

        if (shopInfo?.shop_id || shopInfo?.shopName) {
          console.log(
            `  [${itemId}] 从 data-obj 获取店铺: ${shopInfo.shopName} (ID: ${shopInfo.shop_id})`,
          );
          return {
            shopId: String(shopInfo.shop_id),
            shopName: shopInfo.shopName,
          };
        }
      } catch (e) {
        console.log(
          `  [${itemId}] data-obj 解析失败: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // 方法2: 从 window.__INITIAL_STATE__ 中提取（旧版页面结构）
    const stateMatch = html.match(
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/,
    );
    if (stateMatch) {
      try {
        const state = JSON.parse(stateMatch[1]);
        if (state?.shop?.shopName || state?.seller?.shopName) {
          const shop = state.shop || state.seller;
          return {
            shopId: shop.shopId || shop.shop_id || shop.id,
            shopName: shop.shopName || shop.shop_name || shop.name,
          };
        }
      } catch {
        // 继续尝试其他方法
      }
    }

    // 方法3: 从 JSON 数据中提取
    const shopNamePatterns = [
      /shopName["']\s*:\s*["']([^"']+)["']/,
      /shop_name["']\s*:\s*["']([^"']+)["']/,
      /"shopName"\s*:\s*"([^"]+)"/,
      /"shop_name"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of shopNamePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const shopName = match[1].trim();
        if (shopName && shopName.length > 0 && shopName.length < 100) {
          // 尝试获取 shopId
          const shopIdMatch = html.match(
            /["']?shopId["']?\s*:\s*["']?(\d+)["']?/,
          );
          return {
            shopId: shopIdMatch ? shopIdMatch[1] : undefined,
            shopName,
          };
        }
      }
    }

    // 方法3: 只获取 shopId
    const shopIdMatch = html.match(/["']?shopId["']?\s*:\s*["']?(\d+)["']?/);
    if (shopIdMatch) {
      return { shopId: shopIdMatch[1] };
    }

    console.log(`  [${itemId}] 无法提取店铺信息`);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  [${itemId}] 抓取失败: ${message}`);
    return {};
  }
}

// 延迟函数，避免请求过快
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    // 1. 获取需要回填的商品
    const products = await dataSource.query(`
      SELECT id, title, "weidianItemId", "weidianShopId", "weidianShopName"
      FROM products
      WHERE "weidianItemId" IS NOT NULL
        AND ("weidianShopId" IS NULL OR "weidianShopName" IS NULL)
      ORDER BY "createdAt" DESC
    `);

    console.log(`找到 ${products.length} 个需要回填店铺信息的商品\n`);

    if (products.length === 0) {
      console.log('没有需要回填的商品');
      return;
    }

    let success = 0;
    let failed = 0;
    let skipped = 0;

    // 2. 逐个处理商品
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(
        `[${i + 1}/${products.length}] ${product.title.substring(0, 40)}...`,
      );

      if (!product.weidianItemId) {
        console.log('  跳过: 没有 weidianItemId');
        skipped++;
        continue;
      }

      // 从 HTML 页面抓取店铺信息
      const shopInfo = await fetchShopInfoFromHtml(product.weidianItemId);

      if (shopInfo.shopId || shopInfo.shopName) {
        // 更新商品
        await dataSource.query(
          `UPDATE products SET "weidianShopId" = $1, "weidianShopName" = $2 WHERE id = $3`,
          [shopInfo.shopId || null, shopInfo.shopName || null, product.id],
        );

        // 同时更新缓存表
        await dataSource.query(
          `UPDATE weidian_cache SET "shopId" = $1, "shopName" = $2 WHERE "itemId" = $3`,
          [
            shopInfo.shopId || null,
            shopInfo.shopName || null,
            product.weidianItemId,
          ],
        );

        console.log(
          `  ✓ 更新成功: shopId=${shopInfo.shopId || '(空)'}, shopName=${shopInfo.shopName || '(空)'}`,
        );
        success++;
      } else {
        console.log('  ✗ 无法获取店铺信息');
        failed++;
      }

      // 延迟 1 秒，避免请求过快
      if (i < products.length - 1) {
        await delay(1000);
      }
    }

    // 3. 输出统计
    console.log('\n========== 回填完成 ==========');
    console.log(`成功: ${success}`);
    console.log(`失败: ${failed}`);
    console.log(`跳过: ${skipped}`);
    console.log(`总计: ${products.length}`);

    // 4. 验证结果
    const stats = await dataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT("weidianShopId") as with_shop_id,
        COUNT("weidianShopName") as with_shop_name
      FROM products
    `);
    console.log('\n========== 当前状态 ==========');
    console.log(`商品总数: ${stats[0].total}`);
    console.log(`有 shopId: ${stats[0].with_shop_id}`);
    console.log(`有 shopName: ${stats[0].with_shop_name}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch(console.error);
