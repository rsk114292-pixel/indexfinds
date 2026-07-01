import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auth Phase 3: 创建 user_oauth_accounts 表 + 允许 password 为 NULL（社交登录用户）
 */
export class AuthPhase3OAuthAccounts1738000009000 implements MigrationInterface {
  name = 'AuthPhase3OAuthAccounts1738000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth_accounts(user_id)`,
    );

    // 允许 password 为 NULL（社交登录用户无密码）
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN password DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 恢复 password NOT NULL（需要先处理 NULL 值）
    await queryRunner.query(
      `UPDATE users SET password = '' WHERE password IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN password SET NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS user_oauth_accounts`);
  }
}
