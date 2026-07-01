import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

/**
 * 检查品牌错配问题
 *
 * 使用方法:
 * npx ts-node -r tsconfig-paths/register src/scripts/check-brand-mismatch.ts
 */
async function checkBrandMismatch() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔍 开始检查品牌错配问题...\n');

  // 1. 检查混合商品的品牌分配
  console.log('📋 1. 检查混合商品:');
  const mixedProducts = await dataSource.query(`
    SELECT
      p.id,
      p.title,
      p."aiBrandName",
      p."potentialMixedProduct",
      p."splitMetadata",
      COUNT(s.id) as sku_count,
      b.name as brand_name
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."potentialMixedProduct" = true
    GROUP BY p.id, b.name
    LIMIT 10
  `);

  if (mixedProducts.length === 0) {
    console.log('  ✅ 未发现混合商品\n');
  } else {
    console.log(`  ⚠️ 发现 ${mixedProducts.length} 个混合商品:\n`);
    for (const product of mixedProducts) {
      console.log(`  产品: ${product.title}`);
      console.log(`  ID: ${product.id}`);
      console.log(`  AI品牌: ${product.aiBrandName}`);
      console.log(`  数据库品牌: ${product.brand_name}`);
      console.log(`  SKU数量: ${product.sku_count}`);

      // 分析splitMetadata
      if (product.splitMetadata) {
        const metadata = product.splitMetadata;
        if (metadata.suggestedGroups) {
          console.log(`  检测到的品牌分组:`);
          metadata.suggestedGroups.forEach((group: any, index: number) => {
            console.log(
              `    ${index + 1}. ${group.brand} - ${group.productInfo?.title}`,
            );
          });
        }
      }
      console.log('');
    }
  }

  // 2. 检查同一商品下SKU是否应该属于不同品牌
  console.log('📋 2. 检查可疑的品牌-SKU分配:');
  const suspiciousProducts = await dataSource.query(`
    SELECT
      p.id,
      p.title,
      p."aiBrandName",
      b.name as brand_name,
      COUNT(DISTINCT s.attributes) as distinct_attr_count,
      COUNT(s.id) as sku_count,
      p."splitMetadata"
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."potentialMixedProduct" = false
    GROUP BY p.id, b.name
    HAVING COUNT(s.id) > 3  -- 超过3个SKU的商品
    ORDER BY sku_count DESC
    LIMIT 10
  `);

  for (const product of suspiciousProducts) {
    console.log(`  产品: ${product.title}`);
    console.log(`  品牌: ${product.brand_name} (AI: ${product.aiBrandName})`);
    console.log(`  SKU数量: ${product.sku_count}`);
    console.log(`  不同属性组合: ${product.distinct_attr_count}`);
    console.log('');
  }

  // 3. 检查品牌自动创建的情况
  console.log('📋 3. 检查自动创建的品牌:');
  const autoCreatedBrands = await dataSource.query(`
    SELECT
      b.name,
      b.tier,
      b.status,
      b.metadata::text,
      COUNT(p.id) as product_count
    FROM brands b
    LEFT JOIN products p ON p."brandId" = b.id
    WHERE b.metadata::text LIKE '%auto-created%'
    GROUP BY b.id, b.metadata
    ORDER BY b."createdAt" DESC
    LIMIT 20
  `);

  if (autoCreatedBrands.length === 0) {
    console.log('  ✅ 未发现自动创建的品牌\n');
  } else {
    console.log(`  ⚠️ 发现 ${autoCreatedBrands.length} 个自动创建的品牌:\n`);
    for (const brand of autoCreatedBrands) {
      console.log(`  品牌: ${brand.name}`);
      console.log(`  状态: ${brand.status} | Tier: ${brand.tier}`);
      console.log(`  商品数: ${brand.product_count}`);
      console.log('');
    }
  }

  // 4. 检查品牌名称相似度（可能是重复）
  console.log('📋 4. 检查可能重复的品牌:');
  const allBrands = await dataSource.query(`
    SELECT name FROM brands WHERE status = 'active' ORDER BY name
  `);

  const similarBrands: string[] = [];
  for (let i = 0; i < allBrands.length - 1; i++) {
    for (let j = i + 1; j < allBrands.length; j++) {
      const name1 = allBrands[i].name.toLowerCase();
      const name2 = allBrands[j].name.toLowerCase();

      // 简单的相似度检查：包含关系或编辑距离小
      if (
        name1.includes(name2) ||
        name2.includes(name1) ||
        levenshteinDistance(name1, name2) <= 2
      ) {
        similarBrands.push(`  ${allBrands[i].name} ≈ ${allBrands[j].name}`);
      }
    }
  }

  if (similarBrands.length === 0) {
    console.log('  ✅ 未发现相似品牌\n');
  } else {
    console.log(`  ⚠️ 发现 ${similarBrands.length} 组相似品牌:\n`);
    similarBrands.forEach((pair) => console.log(pair));
    console.log('');
  }

  // 5. 检查特定价格的商品（从截图中看到的¥487.20）
  console.log('📋 5. 检查价格¥487.20的商品:');
  const priceProducts = await dataSource.query(`
    SELECT
      p.id,
      p.title,
      p."aiBrandName",
      b.name as brand_name,
      p.price,
      COUNT(s.id) as sku_count
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p.price = 487.20
    GROUP BY p.id, b.name
    ORDER BY p."createdAt" DESC
  `);

  if (priceProducts.length === 0) {
    console.log('  未找到价格为¥487.20的商品\n');
  } else {
    console.log(`  找到 ${priceProducts.length} 个商品:\n`);
    for (const product of priceProducts) {
      console.log(`  产品: ${product.title}`);
      console.log(`  AI品牌: ${product.aiBrandName}`);
      console.log(`  数据库品牌: ${product.brand_name}`);
      console.log(`  SKU数量: ${product.sku_count}`);
      console.log('');
    }
  }

  console.log('✅ 检查完成！');
  await app.close();
}

// 计算编辑距离（Levenshtein距离）
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 删除
          dp[i][j - 1] + 1, // 插入
          dp[i - 1][j - 1] + 1, // 替换
        );
      }
    }
  }

  return dp[m][n];
}

checkBrandMismatch().catch(console.error);
