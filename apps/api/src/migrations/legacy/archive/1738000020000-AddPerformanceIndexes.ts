import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1738000020000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_view_count ON products("viewCount" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_price_min ON products("priceMin" ASC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_price_max ON products("priceMax" ASC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skus_product_id ON skus("productId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_skus_product_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_price_max;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_price_min;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_view_count;`);
  }
}
