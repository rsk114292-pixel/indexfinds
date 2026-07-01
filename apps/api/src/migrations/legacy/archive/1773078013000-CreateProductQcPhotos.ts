import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductQcPhotos1773078013000 implements MigrationInterface {
  name = 'CreateProductQcPhotos1773078013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_qc_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_qc_photos_product_sort
      ON product_qc_photos(product_id, sort_order)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_product_qc_photos_product_sort
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS product_qc_photos
    `);
  }
}
