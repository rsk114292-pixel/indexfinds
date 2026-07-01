import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchVisitIdentityFields1781000200000 implements MigrationInterface {
  name = 'AddSearchVisitIdentityFields1781000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outbound_clicks
      ADD COLUMN IF NOT EXISTS "device_id" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE outbound_clicks
      ADD COLUMN IF NOT EXISTS "visit_id" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE search_clicks
      ADD COLUMN IF NOT EXISTS "device_id" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE search_clicks
      ADD COLUMN IF NOT EXISTS "visit_id" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE search_logs
      ADD COLUMN IF NOT EXISTS "device_id" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE search_logs
      ADD COLUMN IF NOT EXISTS "visit_id" character varying(255)
    `);
    await queryRunner.query(`
      UPDATE outbound_clicks
      SET "device_id" = "sessionId"
      WHERE "device_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE outbound_clicks
      SET "visit_id" = "sessionId"
      WHERE "visit_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE search_clicks
      SET "device_id" = "sessionId"
      WHERE "device_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE search_clicks
      SET "visit_id" = "sessionId"
      WHERE "visit_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE search_logs
      SET "device_id" = "session_id"
      WHERE "device_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE search_logs
      SET "visit_id" = "session_id"
      WHERE "visit_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_device_id" ON outbound_clicks ("device_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_visit_id" ON outbound_clicks ("visit_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_search_clicks_device_id" ON search_clicks ("device_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_search_clicks_visit_id" ON search_clicks ("visit_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_search_logs_device_id_created_at" ON search_logs ("device_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_search_logs_visit_id_created_at" ON search_logs ("visit_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_search_logs_visit_id_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_search_logs_device_id_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_search_clicks_visit_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_search_clicks_device_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_outbound_clicks_visit_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_outbound_clicks_device_id"
    `);
    await queryRunner.query(`
      ALTER TABLE search_logs
      DROP COLUMN IF EXISTS "visit_id"
    `);
    await queryRunner.query(`
      ALTER TABLE search_logs
      DROP COLUMN IF EXISTS "device_id"
    `);
    await queryRunner.query(`
      ALTER TABLE search_clicks
      DROP COLUMN IF EXISTS "visit_id"
    `);
    await queryRunner.query(`
      ALTER TABLE search_clicks
      DROP COLUMN IF EXISTS "device_id"
    `);
    await queryRunner.query(`
      ALTER TABLE outbound_clicks
      DROP COLUMN IF EXISTS "visit_id"
    `);
    await queryRunner.query(`
      ALTER TABLE outbound_clicks
      DROP COLUMN IF EXISTS "device_id"
    `);
  }
}
