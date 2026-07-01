/**
 * 创建 user_oauth_accounts 表（社交登录账号关联表）
 * 运行: npx ts-node -r tsconfig-paths/register src/scripts/create-user-oauth-accounts-table.ts
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function createUserOAuthAccountsTable() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 1. 创建 user_oauth_accounts 表
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_oauth_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        avatar VARCHAR(500),
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_account_id)
      );
    `);
    console.log('✅ user_oauth_accounts 表创建成功');

    // 2. 创建索引
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth_accounts(user_id);
    `);
    console.log('✅ 索引创建成功');

    // 3. 修改 users 表 password 字段为可空（社交登录用户无密码）
    await dataSource.query(`
      ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
    `);
    console.log('✅ users.password 字段已改为可空');

    console.log('\n🎉 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

createUserOAuthAccountsTable();
