import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductSeoIndexGate1790000700000 implements MigrationInterface {
  name = 'AddProductSeoIndexGate1790000700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "seoIndexable" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "seoReviewedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "seoReviewedBy" uuid,
        ADD COLUMN IF NOT EXISTS "seoReviewNote" text
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_seoIndexable"
      ON "products" ("seoIndexable")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_seoIndexable"`);
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "seoReviewNote",
        DROP COLUMN IF EXISTS "seoReviewedBy",
        DROP COLUMN IF EXISTS "seoReviewedAt",
        DROP COLUMN IF EXISTS "seoIndexable"
    `);
  }
}
