import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryCoverImage1773078012000 implements MigrationInterface {
  name = 'AddCategoryCoverImage1773078012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE category
      ADD COLUMN IF NOT EXISTS "coverImage" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE category
      DROP COLUMN IF EXISTS "coverImage"
    `);
  }
}
