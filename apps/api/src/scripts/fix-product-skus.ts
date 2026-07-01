/**
 * 修复已发布商品的 SKU 数据
 * 从 batch_job_items.sourceData.rawSkuInfo 中重新解析 SKU 并创建
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

interface SkuInfo {
  skuInfo: {
    id: string;
    discountPrice: number;
    stock: number;
    img?: string;
  };
  attrIds: number[];
}

interface AttrValue {
  attrId: number;
  attrValue: string;
  img?: string;
}

interface AttrList {
  attrTitle: string;
  attrValues: AttrValue[];
}

interface ThorResult {
  skuInfos?: SkuInfo[];
  attrList?: AttrList[];
}

interface ThorSkuInfoResponse {
  result?: ThorResult;
}

async function fixProductSkus() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await ds.initialize();
  console.log('✅ 数据库连接成功');

  try {
    // 1. 查找所有已发布的 batch_job_items（有 productId 且有 rawSkuInfo）
    const items = await ds.query(`
      SELECT
        bji.id,
        bji."productId",
        bji."sourceData"
      FROM batch_job_items bji
      WHERE bji."productId" IS NOT NULL
        AND bji."sourceData"->'rawSkuInfo' IS NOT NULL
    `);

    console.log(`📦 找到 ${items.length} 个已发布的商品需要检查`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of items) {
      const productId = item.productId;
      const sourceData = item.sourceData;

      // 检查该商品是否已有 SKU
      const existingSkus = await ds.query(
        `SELECT COUNT(*) as count FROM skus WHERE "productId" = $1`,
        [productId],
      );

      if (parseInt(existingSkus[0].count) > 0) {
        console.log(`⏭️  商品 ${productId} 已有 SKU，跳过`);
        skippedCount++;
        continue;
      }

      // 从 rawSkuInfo 中解析 SKU
      const rawSkuInfo = sourceData.rawSkuInfo as ThorSkuInfoResponse;
      if (!rawSkuInfo?.result?.skuInfos) {
        console.log(
          `⚠️  商品 ${productId} 没有 rawSkuInfo.result.skuInfos，跳过`,
        );
        skippedCount++;
        continue;
      }

      const result = rawSkuInfo.result;
      const skuList = result.skuInfos || [];
      const attrList = result.attrList || [];

      if (skuList.length === 0) {
        console.log(`⚠️  商品 ${productId} SKU 列表为空，跳过`);
        skippedCount++;
        continue;
      }

      console.log(`🔧 处理商品 ${productId}，解析到 ${skuList.length} 个 SKU`);

      try {
        for (const sku of skuList) {
          // 匹配属性值
          const attributes: Record<string, string> = {};
          for (const attrId of sku.attrIds) {
            for (const attr of attrList) {
              const attrValue = attr.attrValues.find(
                (v) => v.attrId === attrId,
              );
              if (attrValue) {
                attributes[attr.attrTitle] = attrValue.attrValue;
              }
            }
          }

          // 生成 skuKey
          const skuKey = Object.entries(attributes)
            .map(([k, v]) => `${k}=${v}`)
            .sort()
            .join(';');

          // 创建 SKU
          await ds.query(
            `INSERT INTO skus (
              "productId",
              "weidianSkuId",
              "weidianAttrIds",
              "attributes",
              "skuKey",
              "price",
              "stock",
              "image",
              "status",
              "createdAt",
              "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              productId,
              sku.skuInfo.id,
              sku.attrIds.join(','), // simple-array 格式
              JSON.stringify(attributes),
              skuKey,
              sku.skuInfo.discountPrice / 100, // 分转元
              sku.skuInfo.stock || 0,
              sku.skuInfo.img || null,
              'available',
            ],
          );
        }

        console.log(`✅ 商品 ${productId} 创建了 ${skuList.length} 个 SKU`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 商品 ${productId} 创建 SKU 失败:`, error);
        errorCount++;
      }
    }

    console.log('\n========== 修复完成 ==========');
    console.log(`✅ 成功修复: ${fixedCount} 个商品`);
    console.log(`⏭️  跳过: ${skippedCount} 个商品`);
    console.log(`❌ 失败: ${errorCount} 个商品`);
  } finally {
    await ds.destroy();
  }
}

fixProductSkus().catch(console.error);
