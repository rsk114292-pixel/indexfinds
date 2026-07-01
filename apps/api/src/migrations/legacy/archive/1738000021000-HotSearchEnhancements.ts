import { MigrationInterface, QueryRunner } from 'typeorm';

export class HotSearchEnhancements1738000021000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hot_searches ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_search_count_7d ON hot_searches(search_count_7d DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_is_blocked ON hot_searches(is_blocked);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_hot_searches_is_blocked;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_hot_searches_search_count_7d;`,
    );
    await queryRunner.query(
      `ALTER TABLE hot_searches DROP COLUMN IF EXISTS is_blocked;`,
    );
  }
}
