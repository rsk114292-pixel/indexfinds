import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 移除 products 表中的 brandId 外键关联
 * 品牌改由 AI 生成，存储在 aiBrandName 字段
 */
export class RemoveBrandRelation1738000003000 implements MigrationInterface {
  name = 'RemoveBrandRelation1738000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 移除外键约束（如果存在）
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_type = 'FOREIGN KEY'
          AND table_name = 'products'
          AND constraint_name LIKE '%brand%'
        ) THEN
          EXECUTE (
            SELECT 'ALTER TABLE products DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_name = 'products'
            AND constraint_name LIKE '%brand%'
            LIMIT 1
          );
        END IF;
      END $$
    `);

    // 移除 brandId 列上的索引
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_brandId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_brand_id"`);

    // 将 brandId 数据迁移到 aiBrandName
    await queryRunner.query(`
      UPDATE products p
      SET "aiBrandName" = b.name
      FROM brands b
      WHERE p."brandId" = b.id
      AND (p."aiBrandName" IS NULL OR p."aiBrandName" = '')
    `);

    // 移除 brandId 列
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "brandId"`,
    );

    // 为 aiBrandName 添加索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_aiBrandName" ON products ("aiBrandName")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 恢复 brandId 列
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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_brandId" ON products ("brandId")`,
    );
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
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_aiBrandName"`);
  }
}
