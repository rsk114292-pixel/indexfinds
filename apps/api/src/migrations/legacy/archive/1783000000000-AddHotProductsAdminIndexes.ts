import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotProductsAdminIndexes1783000000000 implements MigrationInterface {
  name = 'AddHotProductsAdminIndexes1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_admin_hot_active_sort
      ON products ("isFeatured" DESC, "featuredSort" ASC, "popularityScore" DESC)
      WHERE status = 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_admin_hot_active_created_at
      ON products ("createdAt")
      WHERE status = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_products_admin_hot_active_created_at
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_products_admin_hot_active_sort
    `);
  }
}
