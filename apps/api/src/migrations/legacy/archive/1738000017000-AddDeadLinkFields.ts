import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeadLinkFields1738000017000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "weidianDeadLinkAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "weidianDeadLinkReason" TEXT,
        ADD COLUMN IF NOT EXISTS "weidianDeadLinkAttempts" INT NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "weidianDeadLinkAt",
        DROP COLUMN IF EXISTS "weidianDeadLinkReason",
        DROP COLUMN IF EXISTS "weidianDeadLinkAttempts";
    `);
  }
}
