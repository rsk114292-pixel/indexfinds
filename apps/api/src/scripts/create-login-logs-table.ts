/**
 * Phase 2: 创建登录日志表和用户账号锁定字段
 *
 * 运行方式:
 * npx ts-node -r tsconfig-paths/register src/scripts/create-login-logs-table.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'lolobuyspreadsheets_dev',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  console.log('数据库连接成功');

  try {
    // 1. 创建 login_logs 表
    console.log('\n创建 login_logs 表...');
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(20) NOT NULL,
        provider VARCHAR(20),
        ip_address VARCHAR(45),
        geo_location VARCHAR(100),
        user_agent TEXT,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ login_logs 表创建成功');

    // 2. 创建索引
    console.log('\n创建索引...');
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
    `);
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
    `);
    console.log('✅ 索引创建成功');

    // 3. 为 users 表添加账号锁定字段
    console.log('\n为 users 表添加账号锁定字段...');

    // 检查字段是否存在
    const columns = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('failed_login_attempts', 'locked_until');
    `);

    const existingColumns = columns.map((c: any) => c.column_name);

    if (!existingColumns.includes('failed_login_attempts')) {
      await dataSource.query(`
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
      `);
      console.log('✅ failed_login_attempts 字段添加成功');
    } else {
      console.log('⏭️  failed_login_attempts 字段已存在，跳过');
    }

    if (!existingColumns.includes('locked_until')) {
      await dataSource.query(`
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
      `);
      console.log('✅ locked_until 字段添加成功');
    } else {
      console.log('⏭️  locked_until 字段已存在，跳过');
    }

    // 4. 验证结果
    console.log('\n验证表结构...');
    const loginLogsCount = await dataSource.query(`
      SELECT COUNT(*) as count FROM login_logs;
    `);
    console.log(`✅ login_logs 表记录数: ${loginLogsCount[0].count}`);

    const usersColumns = await dataSource.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('failed_login_attempts', 'locked_until')
      ORDER BY column_name;
    `);
    console.log('✅ users 表新增字段:');
    usersColumns.forEach((col: any) => {
      console.log(
        `   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'null'})`,
      );
    });

    console.log('\n🎉 Phase 2 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

main().catch(console.error);
