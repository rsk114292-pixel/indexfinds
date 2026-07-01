import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auth Phase 2: 创建 login_logs 表 + 用户表添加账号锁定字段
 */
export class AuthPhase2LoginLogs1738000008000 implements MigrationInterface {
  name = 'AuthPhase2LoginLogs1738000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at)`,
    );

    // 账号锁定字段
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS locked_until`,
    );
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS failed_login_attempts`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS login_logs`);
  }
}
