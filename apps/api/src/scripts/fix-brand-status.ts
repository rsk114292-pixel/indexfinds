/**
 * 修复品牌状态：将所有 pending_review 改为 active
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

async function fixBrandStatus() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    // 更新所有 pending_review 状态的品牌为 active
    const result = await dataSource.query(
      "UPDATE brands SET status = 'active' WHERE status = 'pending_review' RETURNING id, name",
    );

    console.log(`已更新 ${result.length} 个品牌:`);
    result.forEach((b: any) => console.log(`  - ${b.name}`));

    // 显示所有品牌
    const allBrands = await dataSource.query(
      'SELECT name, status FROM brands ORDER BY name',
    );
    console.log('\n所有品牌:');
    allBrands.forEach((b: any) => console.log(`  - ${b.name}: ${b.status}`));

    await dataSource.destroy();
    console.log('\n完成！');
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

fixBrandStatus();
