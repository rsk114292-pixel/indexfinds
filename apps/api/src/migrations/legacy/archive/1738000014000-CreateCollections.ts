import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建用户收藏夹系统：user_collections + collection_items
 */
export class CreateCollections1738000014000 implements MigrationInterface {
  name = 'CreateCollections1738000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_collections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, name)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collection_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        collection_id UUID NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
        favorite_id UUID NOT NULL REFERENCES user_favorites(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(collection_id, favorite_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_collection_items_favorite_id ON collection_items(favorite_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS collection_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_collections`);
  }
}
