/**
 * 验证推荐系统迁移是否成功
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  try {
    await AppDataSource.initialize();

    // 1. 检查枚举类型
    const enumValues = await AppDataSource.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'referral_attributions_eventtype_enum'
      )
      ORDER BY enumlabel
    `);

    console.log('📋 Current AttributionEventType values:');
    enumValues.forEach((row: any) => {
      console.log(`  - ${row.enumlabel}`);
    });

    const hasProductView = enumValues.some(
      (row: any) => row.enumlabel === 'product_view',
    );

    if (hasProductView) {
      console.log('\n✅ SUCCESS: product_view enum value exists!');
    } else {
      console.log('\n❌ FAILED: product_view enum value not found!');
      process.exit(1);
    }

    // 2. 检查归因表结构
    const tableInfo = await AppDataSource.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'referral_attributions'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 referral_attributions table structure:');
    tableInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // 3. 显示当前归因统计
    const stats = await AppDataSource.query(`
      SELECT
        "eventType",
        COUNT(*) as count
      FROM referral_attributions
      GROUP BY "eventType"
      ORDER BY count DESC
    `);

    console.log('\n📈 Current attribution statistics:');
    if (stats.length === 0) {
      console.log('  (No attribution records yet)');
    } else {
      stats.forEach((row: any) => {
        console.log(`  - ${row.eventType}: ${row.count} records`);
      });
    }

    await AppDataSource.destroy();

    console.log('\n✨ Verification complete! The migration was successful.\n');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();
