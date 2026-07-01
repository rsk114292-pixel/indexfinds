import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

/**
 * 最终验证 - 检查拆分后的商品状态
 */
async function finalVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🎯 最终验证 - 品牌错配修复结果\n');
  console.log('='.repeat(60) + '\n');

  // 1. 检查8个新商品的品牌关联
  console.log('📋 1. 拆分后的商品（按品牌分组）:\n');
  const splitProducts = await dataSource.query(`
    SELECT
      p.id,
      p.title,
      p.slug,
      b.name as brand_name,
      p."aiBrandName",
      p.status,
      COUNT(s.id) as sku_count,
      p."createdAt"
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."createdAt" > NOW() - INTERVAL '10 minutes'
      AND p.status = 'active'
    GROUP BY p.id, b.name
    ORDER BY b.name, p."createdAt" DESC
  `);

  if (splitProducts.length > 0) {
    let totalSkus = 0;
    const brandGroups = new Map<string, any[]>();

    splitProducts.forEach((product: any) => {
      const brandName = product.brand_name || 'Unknown';
      if (!brandGroups.has(brandName)) {
        brandGroups.set(brandName, []);
      }
      brandGroups.get(brandName)!.push(product);
      totalSkus += parseInt(product.sku_count);
    });

    brandGroups.forEach((products, brandName) => {
      console.log(`  🏷️  ${brandName}:`);
      products.forEach((product: any) => {
        const brandMatch =
          product.brand_name === product.aiBrandName ? '✅' : '⚠️';
        console.log(`     ${brandMatch} ${product.title}`);
        console.log(`        SKU数量: ${product.sku_count}`);
        console.log(`        Slug: ${product.slug}`);
        console.log(
          `        品牌ID: ${product.brand_name ? '已关联' : 'NULL'}`,
        );
      });
      console.log('');
    });

    console.log(`  📊 汇总:`);
    console.log(`     总商品数: ${splitProducts.length}`);
    console.log(`     品牌数: ${brandGroups.size}`);
    console.log(`     总SKU数: ${totalSkus}`);
    console.log('');
  } else {
    console.log(`  未找到最近10分钟创建的商品\n`);
  }

  // 2. 检查品牌关联完整性
  console.log('📋 2. 品牌关联完整性检查:\n');
  const brandIntegrityCheck = await dataSource.query(`
    SELECT
      CASE
        WHEN "brandId" IS NULL AND "aiBrandName" IS NOT NULL THEN '缺少brandId'
        WHEN "brandId" IS NOT NULL AND "aiBrandName" IS NULL THEN '缺少aiBrandName'
        WHEN "brandId" IS NOT NULL AND "aiBrandName" IS NOT NULL THEN '完整'
        ELSE '都缺少'
      END as integrity_status,
      COUNT(*) as count
    FROM products
    WHERE status = 'active'
    GROUP BY integrity_status
  `);

  brandIntegrityCheck.forEach((row: any) => {
    const icon = row.integrity_status === '完整' ? '✅' : '⚠️';
    console.log(`  ${icon} ${row.integrity_status}: ${row.count} 个商品`);
  });
  console.log('');

  // 3. 检查原混合商品状态
  console.log('📋 3. 原混合商品状态:\n');
  const originalProduct = await dataSource.query(`
    SELECT
      id,
      title,
      status,
      "potentialMixedProduct",
      "createdAt"
    FROM products
    WHERE id = '6ab31766-9c6d-4e52-9d67-a739f9465ece'
  `);

  if (originalProduct.length > 0) {
    const product = originalProduct[0];
    console.log(`  标题: ${product.title}`);
    console.log(`  状态: ${product.status}`);
    console.log(`  混合商品标记: ${product.potentialMixedProduct}`);
    console.log('');
  }

  // 4. 品牌分布统计
  console.log('📋 4. 当前品牌分布 (前15个):\n');
  const brandStats = await dataSource.query(`
    SELECT
      b.name,
      b.tier,
      COUNT(DISTINCT p.id) as product_count,
      COUNT(s.id) as sku_count
    FROM brands b
    LEFT JOIN products p ON p."brandId" = b.id AND p.status = 'active'
    LEFT JOIN skus s ON s."productId" = p.id
    GROUP BY b.id
    HAVING COUNT(DISTINCT p.id) > 0
    ORDER BY sku_count DESC
    LIMIT 15
  `);

  brandStats.forEach((brand: any, index: number) => {
    console.log(`  ${index + 1}. ${brand.name} (Tier ${brand.tier})`);
    console.log(
      `     商品数: ${brand.product_count}, SKU数: ${brand.sku_count}`,
    );
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ 验证完成！\n');

  await app.close();
}

finalVerification().catch(console.error);
