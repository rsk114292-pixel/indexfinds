import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 添加邮箱验证字段到 users 表
 * 已有用户默认标记为已验证
 */
export class AddEmailVerificationFields1738000011000 implements MigrationInterface {
  name = 'AddEmailVerificationFields1738000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`,
    );

    // 已有用户标记为已验证
    await queryRunner.query(
      `UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email_verified = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at`,
    );
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS email_verified`,
    );
  }
}
