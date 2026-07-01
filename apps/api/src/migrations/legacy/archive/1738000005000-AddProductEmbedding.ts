import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 添加商品图片 embedding 向量字段（CLIP 512 维）
 * 用于以图搜图功能
 */
export class AddProductEmbedding1738000005000 implements MigrationInterface {
  name = 'AddProductEmbedding1738000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 确保 pgvector 扩展已启用
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 添加 512 维向量字段
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'embedding'
        ) THEN
          ALTER TABLE products ADD COLUMN embedding vector(512);
        END IF;
      END $$
    `);

    // IVFFlat 索引需要数据才能创建，条件创建
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_embedding'
        ) THEN
          IF (SELECT COUNT(*) FROM products WHERE embedding IS NOT NULL) > 100 THEN
            CREATE INDEX idx_products_embedding
            ON products USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
          END IF;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_embedding`);
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS embedding`,
    );
  }
}
