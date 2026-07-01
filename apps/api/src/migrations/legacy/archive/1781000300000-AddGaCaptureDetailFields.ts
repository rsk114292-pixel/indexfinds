import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGaCaptureDetailFields1781000300000 implements MigrationInterface {
  name = 'AddGaCaptureDetailFields1781000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_requested boolean
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_first_pageview_sent boolean
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_event_count integer
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_failed_reason character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_failed_reason
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_event_count
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_first_pageview_sent
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_requested
    `);
  }
}
