/**
 * 清空品牌库脚本
 * 运行: npx ts-node src/scripts/clear-brands.ts
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearBrands() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // 1. 清空商品的 brandId
    const updateResult = await dataSource.query(
      'UPDATE products SET "brandId" = NULL WHERE "brandId" IS NOT NULL',
    );
    console.log(
      `✅ Cleared brandId from products: ${updateResult[1] || 0} rows affected`,
    );

    // 2. 删除所有品牌
    const deleteResult = await dataSource.query('DELETE FROM brands');
    console.log(`✅ Deleted all brands: ${deleteResult[1] || 0} rows deleted`);

    // 3. 验证
    const brandsCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM brands',
    );
    const productsWithBrand = await dataSource.query(
      'SELECT COUNT(*) as count FROM products WHERE "brandId" IS NOT NULL',
    );

    console.log('\n📊 验证结果:');
    console.log(`   - 品牌数量: ${brandsCount[0].count}`);
    console.log(`   - 有品牌关联的商品数: ${productsWithBrand[0].count}`);
    console.log('\n🎉 品牌库已清空！');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

clearBrands();
