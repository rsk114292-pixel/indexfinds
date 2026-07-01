import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformTranslations1773078011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE platforms ADD COLUMN IF NOT EXISTS translations text`,
    );

    // Backfill legacy single-language description into translations.
    await queryRunner.query(`
      UPDATE platforms
      SET translations = CASE
        WHEN description IS NULL OR btrim(description) = '' THEN NULL
        WHEN description ~ '[一-龥]' THEN json_build_object('zh', json_build_object('description', description))::text
        ELSE json_build_object('en', json_build_object('description', description))::text
      END
      WHERE (translations IS NULL OR btrim(translations) = '')
        AND description IS NOT NULL
        AND btrim(description) <> ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE platforms DROP COLUMN IF EXISTS translations`,
    );
  }
}
