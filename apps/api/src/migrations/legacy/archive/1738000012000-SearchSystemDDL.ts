import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 搜索系统 DDL：扩展、trigram 索引、文本向量表、图片向量表、热搜表
 * 使用 IF NOT EXISTS 保证幂等（部分表可能已由早期迁移创建）
 */
export class SearchSystemDDL1738000012000 implements MigrationInterface {
  name = 'SearchSystemDDL1738000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. pg_trgm 扩展（全文模糊搜索）
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // 2. pgvector 扩展（向量相似度搜索）
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 3. Trigram 索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_product_title_trgm ON products USING gin (title gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_product_description_trgm ON products USING gin (description gin_trgm_ops)`,
    );

    // 4. 文本向量表（384 维，all-MiniLM-L6-v2）
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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pte_product_id ON product_text_embeddings(product_id)`,
    );

    // 5. 图片向量表（512 维，CLIP）— 幂等，可能已由 AddProductImageEmbeddings 创建
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

    // 6. 热搜表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hot_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword VARCHAR(255) NOT NULL UNIQUE,
        search_count INTEGER NOT NULL DEFAULT 0,
        search_count_24h INTEGER NOT NULL DEFAULT 0,
        search_count_7d INTEGER NOT NULL DEFAULT 0,
        avg_result_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_hot_searches_keyword ON hot_searches(keyword)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_hot_searches_search_count ON hot_searches(search_count DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hot_searches`);
    // 注意：product_image_embeddings 和 product_text_embeddings 由各自的迁移管理
    // 此处仅删除本迁移独有的 trigram 索引
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_product_description_trgm`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_title_trgm`);
    // 不删除扩展，因为其他迁移/功能可能依赖
  }
}
