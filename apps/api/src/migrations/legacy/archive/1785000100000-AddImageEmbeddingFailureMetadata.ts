import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageEmbeddingFailureMetadata1785000100000 implements MigrationInterface {
  name = 'AddImageEmbeddingFailureMetadata1785000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_image_embeddings
        ADD COLUMN IF NOT EXISTS embedding_failure_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS embedding_failure_reason TEXT,
        ADD COLUMN IF NOT EXISTS embedding_failed_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS embedding_failure_count INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pie_embedding_failure_code
        ON product_image_embeddings(embedding_failure_code)
        WHERE embedding_failure_code IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pie_embedding_failure_code`,
    );
    await queryRunner.query(`
      ALTER TABLE product_image_embeddings
        DROP COLUMN IF EXISTS embedding_failure_count,
        DROP COLUMN IF EXISTS embedding_failed_at,
        DROP COLUMN IF EXISTS embedding_failure_reason,
        DROP COLUMN IF EXISTS embedding_failure_code
    `);
  }
}
