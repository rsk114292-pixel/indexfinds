import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// 加载环境变量
config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

async function migrateBrandTier() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();

    // 步骤 1: 检查 brands 表是否存在
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'brands'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('⚠️ brands 表不存在，无需迁移');
      await AppDataSource.destroy();
      return;
    }

    console.log('\n🔄 开始迁移 tier 字段...');

    // 步骤 2: 检查 tier 列的类型
    const columnInfo = await queryRunner.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'brands' AND column_name = 'tier';
    `);

    if (columnInfo.length === 0) {
      console.log('⚠️ tier 列不存在');
      await AppDataSource.destroy();
      return;
    }

    const currentType = columnInfo[0].data_type;
    console.log(`  📋 当前 tier 类型: ${currentType}`);

    if (currentType === 'integer') {
      console.log('✅ tier 列已经是 integer 类型，无需迁移');
      await AppDataSource.destroy();
      return;
    }

    // 步骤 3: 创建临时列
    console.log('  📝 创建临时列 tier_new...');
    await queryRunner.query(`
      ALTER TABLE brands ADD COLUMN tier_new INTEGER DEFAULT 0;
    `);

    // 步骤 4: 转换数据 (A->1, B->2, C->0, D->0, 其他->0)
    console.log('  🔄 转换数据: A->1, B->2, C/D->0...');
    await queryRunner.query(`
      UPDATE brands
      SET tier_new = CASE
        WHEN tier = 'A' THEN 1
        WHEN tier = 'B' THEN 2
        WHEN tier = 'C' THEN 0
        WHEN tier = 'D' THEN 0
        ELSE 0
      END;
    `);

    // 步骤 5: 删除旧列
    console.log('  🗑️ 删除旧 tier 列...');
    await queryRunner.query(`
      ALTER TABLE brands DROP COLUMN tier;
    `);

    // 步骤 6: 重命名新列
    console.log('  ✏️ 重命名 tier_new 为 tier...');
    await queryRunner.query(`
      ALTER TABLE brands RENAME COLUMN tier_new TO tier;
    `);

    // 步骤 7: 验证结果
    const result = await queryRunner.query(`
      SELECT tier, COUNT(*) as count
      FROM brands
      GROUP BY tier
      ORDER BY tier;
    `);

    console.log('\n  ✅ 迁移完成！数据分布:');
    result.forEach((row: any) => {
      const tierName =
        row.tier === 1 ? '核心品牌' : row.tier === 2 ? '热门品牌' : '长尾品牌';
      console.log(`     tier ${row.tier} (${tierName}): ${row.count} 个品牌`);
    });

    await AppDataSource.destroy();
    console.log('\n🎉 迁移成功！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrateBrandTier();
