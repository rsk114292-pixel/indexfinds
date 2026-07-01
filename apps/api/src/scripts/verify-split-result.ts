import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

/**
 * 验证拆分结果
 */
async function verifySplitResult() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const originalProductId = '6ab31766-9c6d-4e52-9d67-a739f9465ece';

  console.log('🔍 验证拆分结果...\n');

  // 1. 检查原商品状态
  console.log('📋 1. 原商品状态:');
  const originalProduct = await dataSource.query(
    `
    SELECT
      id,
      title,
      status,
      "aiBrandName",
      "potentialMixedProduct"
    FROM products
    WHERE id = $1
  `,
    [originalProductId],
  );

  if (originalProduct.length > 0) {
    console.log(`  标题: ${originalProduct[0].title}`);
    console.log(`  状态: ${originalProduct[0].status}`);
    console.log(`  AI品牌: ${originalProduct[0].aiBrandName}`);
    console.log(`  混合商品标记: ${originalProduct[0].potentialMixedProduct}`);
  } else {
    console.log(`  ⚠️ 未找到原商品`);
  }

  // 2. 检查新创建的商品
  console.log(`\n📋 2. 新创建的商品:`);
  const newProducts = await dataSource.query(`
    SELECT
      p.id,
      p.slug,
      p.title,
      p."aiBrandName",
      p.status,
      b.name as brand_name,
      COUNT(s.id) as sku_count
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."createdAt" > NOW() - INTERVAL '5 minutes'
      AND p.status = 'active'
    GROUP BY p.id, b.name
    ORDER BY p."createdAt" DESC
  `);

  if (newProducts.length === 0) {
    console.log(`  ⚠️ 未找到新创建的商品（最近5分钟内）`);
  } else {
    console.log(`  ✅ 找到 ${newProducts.length} 个新商品:\n`);
    let totalSkus = 0;
    newProducts.forEach((product: any, index: number) => {
      console.log(`  ${index + 1}. ${product.title}`);
      console.log(
        `     品牌: ${product.brand_name} (AI: ${product.aiBrandName})`,
      );
      console.log(`     Slug: ${product.slug}`);
      console.log(`     SKU数量: ${product.sku_count}`);
      console.log(`     ID: ${product.id}`);
      console.log('');
      totalSkus += parseInt(product.sku_count);
    });
    console.log(`  📊 总SKU数: ${totalSkus}`);
  }

  // 3. 检查品牌分布
  console.log(`\n📋 3. 品牌分布:`);
  const brandDistribution = await dataSource.query(`
    SELECT
      b.name,
      COUNT(DISTINCT p.id) as product_count,
      COUNT(s.id) as sku_count
    FROM brands b
    LEFT JOIN products p ON p."brandId" = b.id AND p.status = 'active'
    LEFT JOIN skus s ON s."productId" = p.id
    WHERE b.name IN ('Louis Vuitton', 'Dolce & Gabbana', 'Hogan', 'Philipp Plein', 'Valentino', 'Givenchy', 'Moncler', 'Gucci')
    GROUP BY b.name
    ORDER BY sku_count DESC
  `);

  brandDistribution.forEach((brand: any) => {
    console.log(
      `  ${brand.name}: ${brand.product_count} 商品, ${brand.sku_count} SKU`,
    );
  });

  // 4. 检查拆分历史
  console.log(`\n📋 4. 拆分历史:`);
  const splitHistory = await dataSource.query(
    `
    SELECT
      id,
      "sourceProductId",
      "productGroupId",
      "createdProductsCount",
      "totalSkusProcessed",
      "createdAt"
    FROM product_split_history
    WHERE "sourceProductId" = $1
    ORDER BY "createdAt" DESC
    LIMIT 1
  `,
    [originalProductId],
  );

  if (splitHistory.length > 0) {
    const history = splitHistory[0];
    console.log(`  ✅ 找到拆分记录:`);
    console.log(`     ID: ${history.id}`);
    console.log(`     商品组ID: ${history.productGroupId}`);
    console.log(`     创建商品数: ${history.createdProductsCount}`);
    console.log(`     处理SKU数: ${history.totalSkusProcessed}`);
    console.log(`     时间: ${history.createdAt}`);
  } else {
    console.log(`  ⚠️ 未找到拆分历史记录`);
  }

  console.log(`\n✅ 验证完成！`);
  await app.close();
}

verifySplitResult().catch(console.error);
