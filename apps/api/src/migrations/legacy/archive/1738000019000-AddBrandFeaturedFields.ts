import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrandFeaturedFields1738000019000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE brands ADD COLUMN "isFeatured" BOOLEAN DEFAULT false;
      ALTER TABLE brands ADD COLUMN "featuredSort" INT DEFAULT 0;
      CREATE INDEX idx_brands_featured ON brands("isFeatured") WHERE "isFeatured" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_brands_featured;
      ALTER TABLE brands DROP COLUMN IF EXISTS "featuredSort";
      ALTER TABLE brands DROP COLUMN IF EXISTS "isFeatured";
    `);
  }
}
