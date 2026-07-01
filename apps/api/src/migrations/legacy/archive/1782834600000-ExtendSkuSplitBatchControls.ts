import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendSkuSplitBatchControls1782834600000 implements MigrationInterface {
  name = 'ExtendSkuSplitBatchControls1782834600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TYPE sku_split_batch_status_enum ADD VALUE IF NOT EXISTS 'paused';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TYPE sku_split_batch_status_enum ADD VALUE IF NOT EXISTS 'cancelled';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TYPE sku_split_batch_item_status_enum ADD VALUE IF NOT EXISTS 'cancelled';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE sku_split_batches
      ADD COLUMN IF NOT EXISTS "cancelledUrls" INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sku_split_batches
      DROP COLUMN IF EXISTS "cancelledUrls"
    `);
  }
}
