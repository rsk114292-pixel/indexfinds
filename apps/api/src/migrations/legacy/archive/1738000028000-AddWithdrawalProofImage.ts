import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawalProofImage1738000028000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE point_withdrawals
      ADD COLUMN IF NOT EXISTS "proofImage" varchar(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE point_withdrawals
      DROP COLUMN IF EXISTS "proofImage"
    `);
  }
}
