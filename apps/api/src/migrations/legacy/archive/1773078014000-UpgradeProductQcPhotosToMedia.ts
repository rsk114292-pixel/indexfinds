import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradeProductQcPhotosToMedia1773078014000 implements MigrationInterface {
  name = 'UpgradeProductQcPhotosToMedia1773078014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_qc_photos
      RENAME TO product_qc_media
    `);

    await queryRunner.query(`
      ALTER INDEX IF EXISTS idx_product_qc_photos_product_sort
      RENAME TO idx_product_qc_media_product_sort
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'product_qc_media' AND column_name = 'type'
        ) THEN
          CREATE TYPE product_qc_media_type_enum AS ENUM ('image', 'video');
          ALTER TABLE product_qc_media
            ADD COLUMN type product_qc_media_type_enum NOT NULL DEFAULT 'image',
            ADD COLUMN poster_url text NULL,
            ADD COLUMN mime_type varchar(100) NULL,
            ADD COLUMN duration numeric(10,2) NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_qc_media
      DROP COLUMN IF EXISTS duration,
      DROP COLUMN IF EXISTS mime_type,
      DROP COLUMN IF EXISTS poster_url,
      DROP COLUMN IF EXISTS type
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS product_qc_media_type_enum
    `);

    await queryRunner.query(`
      ALTER INDEX IF EXISTS idx_product_qc_media_product_sort
      RENAME TO idx_product_qc_photos_product_sort
    `);

    await queryRunner.query(`
      ALTER TABLE product_qc_media
      RENAME TO product_qc_photos
    `);
  }
}
