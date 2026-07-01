import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeVisitEngagementTimestamps1784000100000 implements MigrationInterface {
  name = 'NormalizeVisitEngagementTimestamps1784000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ALTER COLUMN last_engagement_at TYPE TIMESTAMP WITH TIME ZONE
      USING last_engagement_at AT TIME ZONE 'UTC'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE visit_sessions
      ALTER COLUMN last_engagement_at TYPE timestamp
      USING last_engagement_at AT TIME ZONE 'UTC'
    `);
  }
}
