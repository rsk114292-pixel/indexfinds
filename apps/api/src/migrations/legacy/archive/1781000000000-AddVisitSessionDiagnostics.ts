import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitSessionDiagnostics1781000000000 implements MigrationInterface {
  name = 'AddVisitSessionDiagnostics1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS consent_status character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_status character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_tracking_enabled boolean
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_script_loaded boolean
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ga_configured_target character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS is_in_app_browser boolean
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS browser_context character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS browser_context
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS is_in_app_browser
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_configured_target
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_script_loaded
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_tracking_enabled
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ga_status
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS consent_status
    `);
  }
}
