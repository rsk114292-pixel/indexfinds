import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPopularityScoreFields1773078001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 favoriteCount 字段
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "favoriteCount" integer NOT NULL DEFAULT 0`,
    );

    // 添加 popularityScore 字段
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS "popularityScore" decimal(10,6) NOT NULL DEFAULT 0`,
    );

    // 添加 popularityScore 降序索引（用于默认排序）
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_popularity_score ON products("popularityScore" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_products_popularity_score`,
    );
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "popularityScore"`,
    );
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS "favoriteCount"`,
    );
  }
}
