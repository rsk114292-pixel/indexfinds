/**
 * 运维脚本：清空产品相关数据
 * 用法：npx ts-node -r tsconfig-paths/register scripts/ops/clean-products.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// 加载环境变量
config();

async function cleanProducts() {
  console.log('🧹 开始清理产品数据...\n');

  // 创建数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 统计当前数据
    const productsCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM product',
    );
    const skusCount = await dataSource.query('SELECT COUNT(*) as count FROM sku');
    const brandsCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM brand',
    );

    console.log('📊 当前数据统计：');
    console.log(`   - 商品数量: ${productsCount[0].count}`);
    console.log(`   - SKU 数量: ${skusCount[0].count}`);
    console.log(`   - 品牌数量: ${brandsCount[0].count}`);
    console.log('');

    if (productsCount[0].count === '0') {
      console.log('ℹ️  数据库已经是空的，无需清理\n');
      await dataSource.destroy();
      return;
    }

    // 2. 删除 SKU（因为有外键约束，需要先删除）
    console.log('🗑️  删除所有 SKU...');
    const skuResult = await dataSource.query('DELETE FROM sku');
    console.log(`   ✅ 已删除 ${skuResult[1]} 个 SKU\n`);

    // 3. 删除产品
    console.log('🗑️  删除所有产品...');
    const productResult = await dataSource.query('DELETE FROM product');
    console.log(`   ✅ 已删除 ${productResult[1]} 个产品\n`);

    // 4. 删除品牌（可选，如果你想保留品牌，注释掉这部分）
    console.log('🗑️  删除所有品牌...');
    const brandResult = await dataSource.query('DELETE FROM brand');
    console.log(`   ✅ 已删除 ${brandResult[1]} 个品牌\n`);

    // 5. 清理微店缓存（可选）
    console.log('🗑️  清理微店缓存...');
    try {
      const cacheResult = await dataSource.query('DELETE FROM weidian_cache');
      console.log(`   ✅ 已清理 ${cacheResult[1]} 条缓存\n`);
    } catch (error) {
      console.log('   ⚠️  微店缓存表可能不存在，跳过\n');
    }

    // 6. 验证清理结果
    const finalProductsCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM product',
    );
    const finalSkusCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM sku',
    );
    const finalBrandsCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM brand',
    );

    console.log('✅ 清理完成！\n');
    console.log('📊 清理后统计：');
    console.log(`   - 商品数量: ${finalProductsCount[0].count}`);
    console.log(`   - SKU 数量: ${finalSkusCount[0].count}`);
    console.log(`   - 品牌数量: ${finalBrandsCount[0].count}`);
    console.log('');
    console.log('🎉 数据库已清空，可以重新导入产品了！\n');
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// 执行清理
cleanProducts()
  .then(() => {
    console.log('✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
