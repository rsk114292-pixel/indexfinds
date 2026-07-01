import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitIdentityAndReferralFields1781000100000 implements MigrationInterface {
  name = 'AddVisitIdentityAndReferralFields1781000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS device_id character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS visit_id character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS ref_click_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ADD COLUMN IF NOT EXISTS referral_code character varying(64)
    `);
    await queryRunner.query(`
      UPDATE visit_sessions
      SET device_id = session_id
      WHERE device_id IS NULL
    `);
    await queryRunner.query(`
      UPDATE visit_sessions
      SET visit_id = session_id
      WHERE visit_id IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_device_id_created
      ON visit_sessions(device_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_visit_id_created
      ON visit_sessions(visit_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_ref_click_id_created
      ON visit_sessions(ref_click_id, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_visit_sessions_ref_click_id_created
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_visit_sessions_visit_id_created
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_visit_sessions_device_id_created
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS referral_code
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS ref_click_id
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS visit_id
    `);
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      DROP COLUMN IF EXISTS device_id
    `);
  }
}
