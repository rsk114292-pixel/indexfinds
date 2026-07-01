import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureSearchTrackingTables1790000200000
  implements MigrationInterface
{
  name = 'EnsureSearchTrackingTables1790000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword VARCHAR(255) NOT NULL,
        normalized_keyword VARCHAR(255) NOT NULL,
        result_count INTEGER NOT NULL DEFAULT 0,
        user_id UUID,
        session_id VARCHAR(255),
        device_id VARCHAR(255),
        visit_id VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE search_logs
        ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS visit_id VARCHAR(255)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_keyword
      ON search_logs(keyword)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_normalized_keyword
      ON search_logs(normalized_keyword)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_normalized_keyword_created_at
      ON search_logs(normalized_keyword, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_session_id
      ON search_logs(session_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_device_id_created_at
      ON search_logs(device_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_visit_id_created_at
      ON search_logs(visit_id, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_impressions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "searchLogId" UUID NOT NULL,
        "productId" UUID NOT NULL,
        position INTEGER NOT NULL,
        page INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_search_impressions_searchLog'
        ) THEN
          ALTER TABLE search_impressions
          ADD CONSTRAINT "FK_search_impressions_searchLog"
          FOREIGN KEY ("searchLogId") REFERENCES search_logs(id) ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_impressions_search_log_id
      ON search_impressions("searchLogId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_impressions_product_id
      ON search_impressions("productId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_impressions_search_log_product
      ON search_impressions("searchLogId", "productId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_impressions_product_created
      ON search_impressions("productId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_impressions_created_at
      ON search_impressions("createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "searchLogId" UUID NOT NULL,
        query VARCHAR(255) NOT NULL,
        "productId" UUID NOT NULL,
        position INTEGER NOT NULL,
        page INTEGER NOT NULL DEFAULT 1,
        "userId" UUID,
        "sessionId" VARCHAR(255),
        device_id VARCHAR(255),
        visit_id VARCHAR(255),
        converted BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE search_clicks
        ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS visit_id VARCHAR(255)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_search_clicks_searchLog'
        ) THEN
          ALTER TABLE search_clicks
          ADD CONSTRAINT "FK_search_clicks_searchLog"
          FOREIGN KEY ("searchLogId") REFERENCES search_logs(id) ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_search_log_id
      ON search_clicks("searchLogId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_product_id
      ON search_clicks("productId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_query
      ON search_clicks(query)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_search_log_product
      ON search_clicks("searchLogId", "productId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_product_created
      ON search_clicks("productId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_query_product
      ON search_clicks(query, "productId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_created_at
      ON search_clicks("createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_device_id_created_at
      ON search_clicks(device_id, "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_search_clicks_visit_id_created_at
      ON search_clicks(visit_id, "createdAt")
    `);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: this repair migration may add missing columns to existing data tables.
  }
}
