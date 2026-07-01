/**
 * 创建 refresh_tokens 表
 * 运行: npx ts-node -r tsconfig-paths/register src/scripts/create-refresh-tokens-table.ts
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function createRefreshTokensTable() {
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

    // 创建 refresh_tokens 表
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        device_info VARCHAR(255),
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        revoked_at TIMESTAMP
      );
    `);
    console.log('✅ refresh_tokens 表创建成功');

    // 创建索引
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON refresh_tokens(user_id);
    `);
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens(token_hash);
    `);
    console.log('✅ 索引创建成功');

    console.log('\n🎉 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

createRefreshTokensTable();
