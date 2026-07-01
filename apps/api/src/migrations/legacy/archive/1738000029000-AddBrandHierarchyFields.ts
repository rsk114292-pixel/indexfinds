import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandHierarchyFields1738000029000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // parentId - 父品牌 ID（自引用外键）
    await queryRunner.query(`
      ALTER TABLE brands
      ADD COLUMN IF NOT EXISTS "parentId" uuid NULL
    `);

    // isIndependent - 是否独立展示（不折叠到父品牌下）
    await queryRunner.query(`
      ALTER TABLE brands
      ADD COLUMN IF NOT EXISTS "isIndependent" boolean NOT NULL DEFAULT false
    `);

    // 外键约束：parentId → brands.id
    // 先检查约束是否已存在，避免重复创建
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_brands_parent'
            AND table_name = 'brands'
        ) THEN
          ALTER TABLE brands
          ADD CONSTRAINT "FK_brands_parent"
          FOREIGN KEY ("parentId") REFERENCES brands(id)
          ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // parentId 索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_brands_parentId"
      ON brands ("parentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_brands_parentId"
    `);
    await queryRunner.query(`
      ALTER TABLE brands DROP CONSTRAINT IF EXISTS "FK_brands_parent"
    `);
    await queryRunner.query(`
      ALTER TABLE brands DROP COLUMN IF EXISTS "isIndependent"
    `);
    await queryRunner.query(`
      ALTER TABLE brands DROP COLUMN IF EXISTS "parentId"
    `);
  }
}
