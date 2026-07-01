import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MixedProductService } from '../products/mixed-product.service';
import { DataSource } from 'typeorm';

/**
 * 修复品牌错配问题 - 拆分混合商品
 *
 * 使用方法:
 * npx ts-node -r tsconfig-paths/register src/scripts/fix-brand-mismatch.ts [productId]
 *
 * 如果不提供productId，将自动查找并拆分所有混合商品
 */
async function fixBrandMismatch() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const mixedProductService = app.get(MixedProductService);
  const dataSource = app.get(DataSource);

  const targetProductId = process.argv[2];

  console.log('🔧 开始修复品牌错配问题...\n');

  // 1. 查找所有混合商品
  const mixedProducts = await dataSource.query(`
    SELECT
      p.id,
      p.title,
      p."aiBrandName",
      p."splitMetadata",
      COUNT(s.id) as sku_count,
      b.name as brand_name
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
    LEFT JOIN brands b ON b.id = p."brandId"
    WHERE p."potentialMixedProduct" = true
    ${targetProductId ? `AND p.id = '${targetProductId}'` : ''}
    GROUP BY p.id, b.name
    ORDER BY sku_count DESC
  `);

  if (mixedProducts.length === 0) {
    console.log('✅ 未找到需要拆分的混合商品\n');
    await app.close();
    return;
  }

  console.log(`📋 找到 ${mixedProducts.length} 个混合商品:\n`);

  for (const product of mixedProducts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`产品: ${product.title}`);
    console.log(`ID: ${product.id}`);
    console.log(`当前品牌: ${product.brand_name} (AI: ${product.aiBrandName})`);
    console.log(`SKU数量: ${product.sku_count}`);

    // 分析分组信息
    if (product.splitMetadata?.suggestedGroups) {
      const groups = product.splitMetadata.suggestedGroups;
      console.log(`\n检测到 ${groups.length} 个品牌分组:`);
      groups.forEach((group: any, index: number) => {
        console.log(
          `  ${index + 1}. ${group.brand} - ${group.productInfo?.title || '未命名'}`,
        );
        console.log(`     SKU数量: ${group.skuIndices?.length || 0}`);
      });

      // 询问是否执行拆分
      console.log(`\n⚠️ 拆分操作将:`);
      console.log(`  1. 将当前商品标记为已拆分`);
      console.log(`  2. 创建 ${groups.length} 个新商品，每个对应一个品牌`);
      console.log(`  3. 将 ${product.sku_count} 个SKU重新分配到新商品`);

      // 自动执行拆分（如果需要确认，可以添加用户输入）
      console.log(`\n🚀 开始拆分...`);

      try {
        // 使用自动SKU映射执行拆分
        const result = await mixedProductService.executeSplit({
          productId: product.id,
          // skuMappings 留空，让服务自动映射
        });

        console.log(`✅ 拆分成功！`);
        console.log(`  拆分历史ID: ${result.splitHistoryId}`);
        console.log(`  商品组ID: ${result.productGroupId}`);
        console.log(`  原商品状态: ${result.sourceProduct.newStatus}`);
        console.log(`  创建了 ${result.createdProducts?.length || 0} 个新商品`);

        // 显示新创建的商品
        if (result.createdProducts && result.createdProducts.length > 0) {
          console.log(`\n新创建的商品:`);
          result.createdProducts.forEach((newProduct: any, index: number) => {
            console.log(`  ${index + 1}. ${newProduct.title}`);
            console.log(`     ID: ${newProduct.id}`);
            console.log(`     Slug: ${newProduct.slug}`);
            console.log(`     SKU数量: ${newProduct.skuCount || 0}`);
          });
        }

        // 显示警告（如果有）
        if (result.warnings && result.warnings.length > 0) {
          console.log(`\n⚠️ 警告:`);
          result.warnings.forEach((warning) => console.log(`  - ${warning}`));
        }
      } catch (error) {
        console.error(`❌ 拆分失败:`, error.message);
        if (error.response) {
          console.error(`  详情:`, error.response.message);
        }
      }
    } else {
      console.log(`\n⚠️ 该商品没有拆分元数据，跳过`);
      console.log(`  可能需要重新运行AI分析来生成拆分建议`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n✅ 修复完成！`);

  // 显示修复后的统计
  console.log(`\n📊 修复后统计:`);
  const stats = await dataSource.query(`
    SELECT
      COUNT(DISTINCT p.id) as total_products,
      COUNT(DISTINCT CASE WHEN p."potentialMixedProduct" = true THEN p.id END) as mixed_products,
      COUNT(DISTINCT CASE WHEN p."hasSplit" = true THEN p.id END) as split_products,
      COUNT(s.id) as total_skus
    FROM products p
    LEFT JOIN skus s ON s."productId" = p.id
  `);

  console.log(`  总商品数: ${stats[0].total_products}`);
  console.log(`  混合商品数: ${stats[0].mixed_products}`);
  console.log(`  已拆分商品数: ${stats[0].split_products}`);
  console.log(`  总SKU数: ${stats[0].total_skus}`);

  await app.close();
}

fixBrandMismatch().catch(console.error);
