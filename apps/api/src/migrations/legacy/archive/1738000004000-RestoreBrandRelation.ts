import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 恢复 products 表中的 brandId 外键关联
 * 实现品牌归一化：AI 识别品牌后自动匹配或创建品牌记录
 */
export class RestoreBrandRelation1738000004000 implements MigrationInterface {
  name = 'RestoreBrandRelation1738000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 brandId 列
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'brandId'
        ) THEN
          ALTER TABLE products ADD COLUMN "brandId" UUID;
        END IF;
      END $$
    `);

    // 创建索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_brandId" ON products ("brandId")`,
    );

    // 添加外键约束
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_type = 'FOREIGN KEY'
          AND table_name = 'products'
          AND constraint_name = 'FK_products_brand'
        ) THEN
          ALTER TABLE products
          ADD CONSTRAINT "FK_products_brand"
          FOREIGN KEY ("brandId") REFERENCES brands(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // 根据 aiBrandName 创建品牌记录（如果不存在）
    await queryRunner.query(`
      INSERT INTO brands (id, name, slug, status, tier, metadata, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        p."aiBrandName",
        LOWER(REGEXP_REPLACE(p."aiBrandName", '[^a-zA-Z0-9\u4e00-\u9fa5]+', '-', 'g')),
        'active',
        3,
        '{"aiSource": "migrated-from-aiBrandName"}'::jsonb,
        NOW(),
        NOW()
      FROM (
        SELECT DISTINCT "aiBrandName"
        FROM products
        WHERE "aiBrandName" IS NOT NULL AND "aiBrandName" != ''
      ) p
      WHERE NOT EXISTS (
        SELECT 1 FROM brands b
        WHERE LOWER(b.name) = LOWER(p."aiBrandName")
        OR LOWER(b.aliases::text) LIKE '%' || LOWER(p."aiBrandName") || '%'
      )
    `);

    // 关联 products.brandId 到品牌
    await queryRunner.query(`
      UPDATE products p
      SET "brandId" = b.id
      FROM brands b
      WHERE p."aiBrandName" IS NOT NULL
      AND p."brandId" IS NULL
      AND (
        LOWER(b.name) = LOWER(p."aiBrandName")
        OR LOWER(b.aliases::text) LIKE '%' || LOWER(p."aiBrandName") || '%'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 移除外键约束
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_products_brand'
        ) THEN
          ALTER TABLE products DROP CONSTRAINT "FK_products_brand";
        END IF;
      END $$
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_brandId"`);
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "brandId"`,
    );
  }
}
