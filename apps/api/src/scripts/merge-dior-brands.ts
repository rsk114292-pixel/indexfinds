/**
 * 合并 Christian Dior 到 Dior
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

async function mergeBrands() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    // 查找两个品牌
    const diorResult = await dataSource.query(
      "SELECT * FROM brands WHERE name = 'Dior'",
    );
    const christianDiorResult = await dataSource.query(
      "SELECT * FROM brands WHERE name = 'Christian Dior'",
    );

    const dior = diorResult[0];
    const christianDior = christianDiorResult[0];

    console.log('Dior ID:', dior?.id);
    console.log('Christian Dior ID:', christianDior?.id);

    if (!dior) {
      console.log('未找到 Dior 品牌');
      return;
    }

    if (!christianDior) {
      console.log('未找到 Christian Dior 品牌（可能已合并）');
      return;
    }

    // 将 Christian Dior 的商品转移到 Dior
    const updateResult = await dataSource.query(
      'UPDATE products SET "brandId" = $1 WHERE "brandId" = $2 RETURNING id, title',
      [dior.id, christianDior.id],
    );
    console.log(`已转移 ${updateResult.length} 个商品到 Dior:`);
    updateResult.forEach((p: any) => console.log(`  - ${p.title}`));

    // 删除 Christian Dior 品牌
    await dataSource.query('DELETE FROM brands WHERE id = $1', [
      christianDior.id,
    ]);
    console.log('已删除 Christian Dior 品牌');

    // 验证结果
    const updatedDior = await dataSource.query(
      "SELECT * FROM brands WHERE name = 'Dior'",
    );
    const productCount = await dataSource.query(
      'SELECT COUNT(*) FROM products WHERE "brandId" = $1',
      [dior.id],
    );
    console.log(`\nDior 品牌现有 ${productCount[0].count} 个商品`);
    console.log('Dior 别名:', updatedDior[0]?.aliases);

    await dataSource.destroy();
    console.log('\n完成！');
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

mergeBrands();
