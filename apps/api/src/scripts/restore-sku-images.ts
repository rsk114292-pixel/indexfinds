/**
 * 从 weidian_cache 恢复 SKU 图片为微店 CDN 原始链接
 *
 * 匹配策略：skus.weidianAttrIds ↔ weidian_cache.skuInfo.result.skuInfos[].attrIds
 * 每个 SKU 在创建时保存了微店属性 ID 数组，与缓存中的 skuInfos 通过 attrIds 一一对应。
 *
 * 运行方式：
 *   cd apps/api && npx ts-node -r tsconfig-paths/register src/scripts/restore-sku-images.ts
 *   cd apps/api && npx ts-node -r tsconfig-paths/register src/scripts/restore-sku-images.ts --dry-run
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

interface SkuRow {
  id: string;
  productId: string;
  weidianSkuId: string | null;
  weidianAttrIds: string | null; // simple-array 在 raw query 中返回逗号分隔字符串
  image: string | null;
}

interface ProductRow {
  id: string;
  weidianItemId: string;
}

interface CacheSkuInfo {
  result?: {
    skuInfos?: Array<{
      attrIds: number[];
      skuInfo: { id: string; img?: string };
    }>;
  };
}

function parseAttrIds(val: string | null): number[] {
  if (!val) return [];
  return val
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

/** 比较两个 attrId 数组是否相同（忽略顺序） */
function attrIdsMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log(`数据库连接成功 ${DRY_RUN ? '(DRY RUN 模式)' : ''}\n`);

  const stats = {
    totalSkus: 0,
    restored: 0,
    noAttrIds: 0,
    noCache: 0,
    noMatch: 0,
    noImage: 0,
    alreadyHasImage: 0,
  };

  try {
    // 1. 找到所有 image 为 NULL 且关联微店产品的 SKU
    const skus: SkuRow[] = await dataSource.query(`
      SELECT s.id, s."productId", s."weidianSkuId", s."weidianAttrIds", s.image
      FROM skus s
      JOIN products p ON s."productId" = p.id
      WHERE p."weidianItemId" IS NOT NULL
        AND s.image IS NULL
    `);

    stats.totalSkus = skus.length;
    console.log(`找到 ${skus.length} 个 image 为 NULL 的微店 SKU\n`);

    if (skus.length === 0) {
      console.log('没有需要恢复的 SKU');
      return;
    }

    // 2. 按产品分组
    const skusByProduct = new Map<string, SkuRow[]>();
    for (const sku of skus) {
      const list = skusByProduct.get(sku.productId) || [];
      list.push(sku);
      skusByProduct.set(sku.productId, list);
    }

    console.log(`涉及 ${skusByProduct.size} 个产品\n`);

    // 3. 逐产品处理
    for (const [productId, productSkus] of skusByProduct) {
      // 获取产品的 weidianItemId
      const products: ProductRow[] = await dataSource.query(
        `SELECT id, "weidianItemId" FROM products WHERE id = $1`,
        [productId],
      );

      if (products.length === 0) continue;
      const product = products[0];

      // 获取缓存
      const cacheRows: Array<{ skuInfo: CacheSkuInfo | null }> =
        await dataSource.query(
          `SELECT "skuInfo" FROM weidian_cache WHERE "itemId" = $1`,
          [product.weidianItemId],
        );

      if (cacheRows.length === 0 || !cacheRows[0].skuInfo) {
        stats.noCache += productSkus.length;
        continue;
      }

      const cachedSkuInfos = cacheRows[0].skuInfo.result?.skuInfos || [];
      if (cachedSkuInfos.length === 0) {
        stats.noCache += productSkus.length;
        continue;
      }

      // 4. 逐 SKU 匹配
      for (const sku of productSkus) {
        const attrIds = parseAttrIds(sku.weidianAttrIds);

        if (attrIds.length === 0) {
          stats.noAttrIds++;
          continue;
        }

        // 通过 attrIds 匹配缓存中的 skuInfo
        const matched = cachedSkuInfos.find((si) =>
          attrIdsMatch(attrIds, si.attrIds),
        );

        if (!matched) {
          stats.noMatch++;
          continue;
        }

        const originalImage = matched.skuInfo.img;
        if (!originalImage) {
          stats.noImage++;
          continue;
        }

        console.log(
          `✅ SKU ${sku.id} [attrIds=${attrIds.join(',')}] → ${originalImage.substring(0, 70)}...`,
        );

        if (!DRY_RUN) {
          await dataSource.query(`UPDATE skus SET image = $1 WHERE id = $2`, [
            originalImage,
            sku.id,
          ]);
        }
        stats.restored++;
      }
    }

    // 5. 统计已有图片的 SKU 数量（信息参考）
    const existingResult: Array<{ count: string }> = await dataSource.query(`
      SELECT COUNT(*) as count FROM skus s
      JOIN products p ON s."productId" = p.id
      WHERE p."weidianItemId" IS NOT NULL AND s.image IS NOT NULL
    `);
    stats.alreadyHasImage = parseInt(existingResult[0].count, 10);

    // 6. 汇总
    console.log('\n========== 汇总 ==========');
    console.log(`NULL 图片 SKU:  ${stats.totalSkus}`);
    console.log(`成功恢复:       ${stats.restored}`);
    console.log(`无 attrIds:     ${stats.noAttrIds}`);
    console.log(`无缓存:         ${stats.noCache}`);
    console.log(`attrIds 不匹配: ${stats.noMatch}`);
    console.log(`缓存无图片:     ${stats.noImage}`);
    console.log(`已有图片(参考):  ${stats.alreadyHasImage}`);
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN 模式，没有实际修改数据库');
    } else {
      console.log('\n✅ 恢复完成！');
    }
  } catch (error) {
    console.error('执行出错:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();
