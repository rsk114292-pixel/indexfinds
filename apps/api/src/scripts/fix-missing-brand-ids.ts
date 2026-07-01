import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { BrandsService } from '../brands/brands.service';

/**
 * 修复缺失的品牌ID
 *
 * 用于修复已经拆分但品牌关联（brandId）为null的商品
 */
async function fixMissingBrandIds() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const brandsService = app.get(BrandsService);

  console.log('🔧 开始修复缺失的品牌ID...\n');

  // 1. 查找所有brandId为null但有aiBrandName的商品
  const productsWithoutBrand = await dataSource.query(`
    SELECT
      id,
      title,
      "aiBrandName",
      slug,
      status
    FROM products
    WHERE "brandId" IS NULL
      AND "aiBrandName" IS NOT NULL
      AND status = 'active'
    ORDER BY "createdAt" DESC
  `);

  if (productsWithoutBrand.length === 0) {
    console.log('✅ 没有需要修复的商品\n');
    await app.close();
    return;
  }

  console.log(`📋 找到 ${productsWithoutBrand.length} 个需要修复的商品:\n`);

  let fixedCount = 0;
  let failedCount = 0;

  for (const product of productsWithoutBrand) {
    console.log(`处理: ${product.title}`);
    console.log(`  AI品牌: ${product.aiBrandName}`);
    console.log(`  ID: ${product.id}`);

    try {
      // 使用findOrCreateByName查找或创建品牌
      const brand = await brandsService.findOrCreateByName(product.aiBrandName);

      if (brand) {
        // 更新商品的brandId
        await dataSource.query(
          `
          UPDATE products
          SET "brandId" = $1
          WHERE id = $2
        `,
          [brand.id, product.id],
        );

        console.log(`  ✅ 已关联到品牌: ${brand.name} (${brand.id})`);
        fixedCount++;
      } else {
        console.log(`  ⚠️ 无法找到或创建品牌: ${product.aiBrandName}`);
        failedCount++;
      }
    } catch (error) {
      console.error(`  ❌ 修复失败:`, error.message);
      failedCount++;
    }

    console.log('');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 修复统计:`);
  console.log(`  总商品数: ${productsWithoutBrand.length}`);
  console.log(`  成功修复: ${fixedCount}`);
  console.log(`  失败数量: ${failedCount}`);

  // 验证修复结果
  console.log(`\n🔍 验证修复结果:`);
  const remainingIssues = await dataSource.query(`
    SELECT COUNT(*) as count
    FROM products
    WHERE "brandId" IS NULL
      AND "aiBrandName" IS NOT NULL
      AND status = 'active'
  `);

  console.log(`  剩余未关联品牌的商品: ${remainingIssues[0].count}`);

  // 显示品牌分布
  console.log(`\n📋 品牌分布 (最近修复的):`);
  const brandDistribution = await dataSource.query(`
    SELECT
      b.name,
      COUNT(p.id) as product_count,
      COUNT(s.id) as sku_count
    FROM brands b
    LEFT JOIN products p ON p."brandId" = b.id AND p.status = 'active'
    LEFT JOIN skus s ON s."productId" = p.id
    WHERE b."updatedAt" > NOW() - INTERVAL '1 hour'
    GROUP BY b.id
    ORDER BY b."updatedAt" DESC
    LIMIT 10
  `);

  brandDistribution.forEach((brand: any) => {
    console.log(
      `  ${brand.name}: ${brand.product_count} 商品, ${brand.sku_count} SKU`,
    );
  });

  console.log(`\n✅ 修复完成！`);
  await app.close();
}

fixMissingBrandIds().catch(console.error);
