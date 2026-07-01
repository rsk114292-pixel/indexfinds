import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 添加 aiBrandName 字段到 products 表
 * 用于存储 AI 识别但未匹配到数据库的品牌名，供后台审核使用
 */
export class AddAiBrandName1738000001000 implements MigrationInterface {
  name = 'AddAiBrandName1738000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'aiBrandName'
        ) THEN
          ALTER TABLE products ADD COLUMN "aiBrandName" VARCHAR(255) NULL;
          COMMENT ON COLUMN products."aiBrandName" IS 'AI 识别的品牌名（未匹配到数据库时暂存，待审核）';
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "aiBrandName"`,
    );
  }
}
