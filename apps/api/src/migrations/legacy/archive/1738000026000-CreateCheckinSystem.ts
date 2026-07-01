import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckinSystem1738000026000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_checkins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "checkinDate" DATE NOT NULL,
        "streakCount" INT NOT NULL DEFAULT 1,
        "pointsEarned" INT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_uc_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_uc_user_date
        ON user_checkins("userId", "checkinDate");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uc_user_recent
        ON user_checkins("userId", "checkinDate" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_uc_user_recent;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_uc_user_date;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_checkins;`);
  }
}
