import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserHistoryAndPreferences1738000024000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 用户浏览历史表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_browsing_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        brand_id VARCHAR,
        category_id VARCHAR,
        viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 联合唯一索引：同一用户同一商品只保留一条记录
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ubh_user_product
        ON user_browsing_history(user_id, product_id);
    `);

    // 查询索引：按用户+时间排序
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ubh_user_viewed_at
        ON user_browsing_history(user_id, viewed_at DESC);
    `);

    // 2. 用户搜索历史表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_search_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query VARCHAR(200) NOT NULL,
        searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 联合唯一索引：同一用户同一搜索词只保留一条记录
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ush_user_query
        ON user_search_history(user_id, query);
    `);

    // 查询索引：按用户+时间排序
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ush_user_searched_at
        ON user_search_history(user_id, searched_at DESC);
    `);

    // 3. 用户偏好字段（货币、平台）
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3),
        ADD COLUMN IF NOT EXISTS preferred_platform VARCHAR(50);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS preferred_platform;`,
    );
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS preferred_currency;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ush_user_searched_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ush_user_query;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_search_history;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ubh_user_viewed_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ubh_user_product;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_browsing_history;`);
  }
}
