/**
 * 执行推荐系统迁移脚本
 * 添加 product_view 到 AttributionEventType 枚举
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { AddProductViewAttribution1738000015000 } from '../migrations/legacy/archive/1738000015000-AddProductViewAttribution';

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

async function runMigration() {
  console.log('🔄 Connecting to database...');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('🔄 Running migration: AddProductViewAttribution...');

    const migration = new AddProductViewAttribution1738000015000();
    await migration.up(queryRunner);

    console.log('✅ Migration completed successfully!');

    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('\n✨ All done! The database has been updated.');
    console.log('\n📊 Next steps:');
    console.log('1. Restart your API server');
    console.log('2. Test the referral tracking flow');
    console.log('3. Monitor the logs for any issues\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
