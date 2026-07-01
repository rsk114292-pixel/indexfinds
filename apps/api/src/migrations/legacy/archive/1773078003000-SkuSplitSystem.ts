import { MigrationInterface, QueryRunner } from 'typeorm';

export class SkuSplitSystem1773078003000 implements MigrationInterface {
  name = 'SkuSplitSystem1773078003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Product 表新增 SKU 拆分字段
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "skuVariantKey" varchar DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "splitSourceWeidianId" varchar DEFAULT NULL`,
    );

    // 去重组合索引（部分索引：仅对非 null 值生效）
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_split_variant"
       ON "products" ("splitSourceWeidianId", "skuVariantKey")
       WHERE "splitSourceWeidianId" IS NOT NULL AND "skuVariantKey" IS NOT NULL`,
    );

    // 查询索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_splitSourceWeidianId"
       ON "products" ("splitSourceWeidianId")
       WHERE "splitSourceWeidianId" IS NOT NULL`,
    );

    // 2. SkuSplitJob 表
    await queryRunner.query(`
      CREATE TYPE "sku_split_job_status_enum" AS ENUM (
        'pending', 'analyzing', 'processing', 'completed', 'partial_failed', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sku_split_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" "sku_split_job_status_enum" NOT NULL DEFAULT 'pending',
        "weidianItemId" varchar NOT NULL,
        "weidianTitle" text,
        "splitDimension" varchar NOT NULL,
        "totalVariantCount" integer NOT NULL DEFAULT 0,
        "processedCount" integer NOT NULL DEFAULT 0,
        "successCount" integer NOT NULL DEFAULT 0,
        "failedCount" integer NOT NULL DEFAULT 0,
        "duplicateCount" integer NOT NULL DEFAULT 0,
        "productGroupId" uuid NOT NULL,
        "sourceUrl" varchar,
        "shopId" varchar,
        "createdBy" varchar,
        "errorMessage" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP,
        CONSTRAINT "PK_sku_split_jobs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sku_split_jobs_status" ON "sku_split_jobs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sku_split_jobs_productGroupId" ON "sku_split_jobs" ("productGroupId")`,
    );

    // 3. SkuSplitItem 表
    await queryRunner.query(`
      CREATE TYPE "sku_split_item_status_enum" AS ENUM (
        'pending', 'processing', 'success', 'failed', 'duplicate'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sku_split_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "attrId" bigint NOT NULL,
        "variantValue" varchar NOT NULL,
        "imageUrl" varchar,
        "price" decimal(10,2),
        "skuCount" integer NOT NULL DEFAULT 0,
        "status" "sku_split_item_status_enum" NOT NULL DEFAULT 'pending',
        "productId" uuid,
        "errorMessage" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sku_split_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sku_split_items_job" FOREIGN KEY ("job_id")
          REFERENCES "sku_split_jobs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sku_split_items_job_id" ON "sku_split_items" ("job_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 逆序删除
    await queryRunner.query(`DROP TABLE IF EXISTS "sku_split_items"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sku_split_item_status_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "sku_split_jobs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sku_split_job_status_enum"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_splitSourceWeidianId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_product_split_variant"`);

    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "splitSourceWeidianId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "skuVariantKey"`,
    );
  }
}
