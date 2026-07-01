import { MigrationInterface, QueryRunner } from 'typeorm';

export class HotSearchAdminFields1738000022000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE hot_searches ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE hot_searches ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE hot_searches ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'auto';
    `);
    await queryRunner.query(`
      ALTER TABLE hot_searches ADD COLUMN IF NOT EXISTS display_start_at TIMESTAMPTZ DEFAULT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE hot_searches ADD COLUMN IF NOT EXISTS display_end_at TIMESTAMPTZ DEFAULT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_is_pinned ON hot_searches(is_pinned);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_source ON hot_searches(source);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hot_searches_source;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hot_searches_is_pinned;`);
    await queryRunner.query(
      `ALTER TABLE hot_searches DROP COLUMN IF EXISTS display_end_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE hot_searches DROP COLUMN IF EXISTS display_start_at;`,
    );
    await queryRunner.query(
      `ALTER TABLE hot_searches DROP COLUMN IF EXISTS source;`,
    );
    await queryRunner.query(
      `ALTER TABLE hot_searches DROP COLUMN IF EXISTS sort_order;`,
    );
    await queryRunner.query(
      `ALTER TABLE hot_searches DROP COLUMN IF EXISTS is_pinned;`,
    );
  }
}
