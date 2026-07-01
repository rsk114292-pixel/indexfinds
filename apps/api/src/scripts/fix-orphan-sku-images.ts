/**
 * 修复孤立的 SKU 图片引用
 *
 * 问题：SKU.image 可能引用了已从 product.images 中删除的图片
 * 解决：检查所有 SKU，如果其 image 不在对应产品的 images 数组中，则清除
 *
 * 运行方式：
 * cd apps/api && npx ts-node -r tsconfig-paths/register src/scripts/fix-orphan-sku-images.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

interface Product {
  id: string;
  title: string;
  images: string[];
}

interface Sku {
  id: string;
  productId: string;
  image: string | null;
  attributes: Record<string, string>;
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
  console.log('数据库连接成功\n');

  try {
    // 1. 获取所有有 image 的 SKU
    const skusWithImages: Sku[] = await dataSource.query(`
      SELECT id, "productId", image, attributes
      FROM skus
      WHERE image IS NOT NULL AND image != ''
    `);

    console.log(`找到 ${skusWithImages.length} 个有图片的 SKU\n`);

    if (skusWithImages.length === 0) {
      console.log('没有需要检查的 SKU');
      return;
    }

    // 2. 获取相关产品的 images
    const productIds = [...new Set(skusWithImages.map((s) => s.productId))];
    const products: Product[] = await dataSource.query(
      `
      SELECT id, title, images
      FROM products
      WHERE id = ANY($1)
    `,
      [productIds],
    );

    const productMap = new Map(products.map((p) => [p.id, p]));
    console.log(`涉及 ${products.length} 个产品\n`);

    // 3. 找出孤立的 SKU 图片
    const orphanSkuIds: string[] = [];
    const orphanDetails: Array<{
      skuId: string;
      productTitle: string;
      skuImage: string;
      attributes: Record<string, string>;
    }> = [];

    for (const sku of skusWithImages) {
      const product = productMap.get(sku.productId);
      if (!product) {
        // 产品不存在（不应该发生，因为有外键约束）
        console.warn(`警告：SKU ${sku.id} 的产品 ${sku.productId} 不存在`);
        continue;
      }

      const productImages = product.images || [];
      if (!productImages.includes(sku.image!)) {
        orphanSkuIds.push(sku.id);
        orphanDetails.push({
          skuId: sku.id,
          productTitle: product.title,
          skuImage: sku.image!,
          attributes: sku.attributes,
        });
      }
    }

    console.log(`发现 ${orphanSkuIds.length} 个孤立的 SKU 图片引用\n`);

    if (orphanSkuIds.length === 0) {
      console.log('所有 SKU 图片都是有效的，无需修复');
      return;
    }

    // 4. 显示详情
    console.log('=== 孤立 SKU 图片详情 ===\n');
    for (const detail of orphanDetails.slice(0, 20)) {
      // 只显示前 20 个
      console.log(`产品: ${detail.productTitle}`);
      console.log(`SKU 属性: ${JSON.stringify(detail.attributes)}`);
      console.log(`孤立图片: ${detail.skuImage.substring(0, 80)}...`);
      console.log('---');
    }

    if (orphanDetails.length > 20) {
      console.log(`... 还有 ${orphanDetails.length - 20} 个\n`);
    }

    // 5. 执行修复
    console.log('\n开始修复...\n');

    const result = await dataSource.query(
      `
      UPDATE skus
      SET image = NULL
      WHERE id = ANY($1)
    `,
      [orphanSkuIds],
    );

    console.log(`已清除 ${result[1]} 个 SKU 的孤立图片引用`);
    console.log('\n修复完成！');
  } catch (error) {
    console.error('执行出错:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();
