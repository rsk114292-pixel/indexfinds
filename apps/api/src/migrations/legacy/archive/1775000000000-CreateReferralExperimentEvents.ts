import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralExperimentEvents1775000000000 implements MigrationInterface {
  name = 'CreateReferralExperimentEvents1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referral_experiment_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "experimentKey" varchar(60) NOT NULL,
        "userId" uuid NOT NULL,
        "variantId" varchar(30) NOT NULL,
        "eventType" varchar(40) NOT NULL,
        metadata jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_experiment_events_experiment_created
      ON referral_experiment_events ("experimentKey", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_experiment_events_variant_created
      ON referral_experiment_events ("variantId", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_experiment_events_type_created
      ON referral_experiment_events ("eventType", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_experiment_events_user_created
      ON referral_experiment_events ("userId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS referral_experiment_events
    `);
  }
}
