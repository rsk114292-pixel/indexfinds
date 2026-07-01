import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建商品图片向量表 product_image_embeddings
 * 每张图片一个向量，支持多角度/多SKU搜索
 */
export class AddProductImageEmbeddings1738000006000 implements MigrationInterface {
  name = 'AddProductImageEmbeddings1738000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_image_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_index INTEGER NOT NULL DEFAULT 0,
        embedding vector(512),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_product_image UNIQUE (product_id, image_url)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pie_product_id ON product_image_embeddings(product_id)`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pie_embedding') THEN
          IF (SELECT COUNT(*) FROM product_image_embeddings WHERE embedding IS NOT NULL) > 100 THEN
            CREATE INDEX idx_pie_embedding ON product_image_embeddings
            USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
          END IF;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_image_embeddings`);
  }
}
