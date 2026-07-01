import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSkuSplitAutoBatches1782831000000 implements MigrationInterface {
  name = 'CreateSkuSplitAutoBatches1782831000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'sku_split_batch_status_enum'
        ) THEN
          CREATE TYPE sku_split_batch_status_enum AS ENUM (
            'pending',
            'processing',
            'completed',
            'partial_failed',
            'failed'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'sku_split_batch_item_status_enum'
        ) THEN
          CREATE TYPE sku_split_batch_item_status_enum AS ENUM (
            'pending',
            'analyzing',
            'creating_job',
            'waiting_job',
            'completed',
            'failed',
            'skipped'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sku_split_batches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        status sku_split_batch_status_enum NOT NULL DEFAULT 'pending',
        "totalUrls" INTEGER NOT NULL,
        "processedUrls" INTEGER NOT NULL DEFAULT 0,
        "successUrls" INTEGER NOT NULL DEFAULT 0,
        "failedUrls" INTEGER NOT NULL DEFAULT 0,
        "skippedUrls" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "completedAt" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sku_split_batch_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id UUID NOT NULL REFERENCES sku_split_batches(id) ON DELETE CASCADE,
        status sku_split_batch_item_status_enum NOT NULL DEFAULT 'pending',
        "sourceUrl" TEXT NOT NULL,
        "weidianItemId" VARCHAR,
        "splitJobId" UUID,
        "selectedCount" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "processingLog" JSONB DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "processedAt" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sku_split_batches_status
      ON sku_split_batches(status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sku_split_batch_items_batch_id
      ON sku_split_batch_items(batch_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sku_split_batch_items_status
      ON sku_split_batch_items(status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sku_split_batch_items_split_job_id
      ON sku_split_batch_items("splitJobId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sku_split_batch_items_split_job_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sku_split_batch_items_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sku_split_batch_items_batch_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_sku_split_batches_status`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS sku_split_batch_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS sku_split_batches`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS sku_split_batch_item_status_enum`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS sku_split_batch_status_enum`);
  }
}
