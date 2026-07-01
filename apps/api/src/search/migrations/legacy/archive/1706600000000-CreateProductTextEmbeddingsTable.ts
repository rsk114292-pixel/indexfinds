import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建商品文本向量表
 * 用于语义搜索功能
 */
export class CreateProductTextEmbeddingsTable1706600000000 implements MigrationInterface {
  name = 'CreateProductTextEmbeddingsTable1706600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 确保 pgvector 扩展已启用
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 创建商品文本向量表
    // 注: 向量维度 384 对应 all-MiniLM-L6-v2 模型
    // 配置位置: SEMANTIC_CONFIG.vectorDimensions (config/search.config.ts)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_text_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        source_text TEXT NOT NULL,
        text_hash VARCHAR(64) NOT NULL,
        embedding vector(384),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_product_text_embedding UNIQUE (product_id)
      )
    `);

    // 创建索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pte_product_id
      ON product_text_embeddings(product_id)
    `);

    // 创建向量相似度索引 (IVFFlat)
    // 注意：需要先有数据才能创建此索引，这里先跳过
    // 后续可通过脚本创建: CREATE INDEX ON product_text_embeddings
    // USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_text_embeddings`);
  }
}
