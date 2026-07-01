import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHnswVectorIndexes1773078005000 implements MigrationInterface {
  name = 'AddHnswVectorIndexes1773078005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // HNSW 索引：余弦距离，适用于 3 万+ 产品（30 万+ embedding 记录）
    // m=16, ef_construction=64 — 在召回率和索引速度之间取平衡
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pie_embedding_hnsw
        ON product_image_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pte_embedding_hnsw
        ON product_text_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pie_embedding_hnsw`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pte_embedding_hnsw`);
  }
}
