import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuSplitBatchId1773078010000 implements MigrationInterface {
  name = 'AddSkuSplitBatchId1773078010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sku_split_jobs"
      ADD COLUMN IF NOT EXISTS "batchId" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sku_split_jobs_batch_id"
      ON "sku_split_jobs"("batchId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_sku_split_jobs_batch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sku_split_jobs" DROP COLUMN IF EXISTS "batchId"`,
    );
  }
}
