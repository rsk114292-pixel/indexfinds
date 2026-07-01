import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auth Phase 4: 添加 password_changed_at 字段到 users 表
 */
export class AuthPhase4PasswordChangedAt1738000010000 implements MigrationInterface {
  name = 'AuthPhase4PasswordChangedAt1738000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at`,
    );
  }
}
