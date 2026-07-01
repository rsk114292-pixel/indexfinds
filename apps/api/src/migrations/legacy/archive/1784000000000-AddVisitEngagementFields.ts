import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitEngagementFields1784000000000 implements MigrationInterface {
  name = 'AddVisitEngagementFields1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS active_duration_ms integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS total_duration_ms integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS heartbeat_count integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS engagement_event_count integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS active_duration_before_first_outbound_ms integer
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_engagement_created
      ON visit_sessions (created_at, heartbeat_count, active_duration_ms)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_visit_sessions_engagement_created
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS last_engagement_at
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS active_duration_before_first_outbound_ms
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS engagement_event_count
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS heartbeat_count
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS total_duration_ms
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS active_duration_ms
    `);
  }
}
