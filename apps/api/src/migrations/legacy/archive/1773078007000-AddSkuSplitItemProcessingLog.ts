import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkuSplitItemProcessingLog1773078007000 implements MigrationInterface {
  name = 'AddSkuSplitItemProcessingLog1773078007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sku_split_items"
      ADD COLUMN IF NOT EXISTS "processingLog" jsonb DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sku_split_items"
      DROP COLUMN IF EXISTS "processingLog"
    `);
  }
}
