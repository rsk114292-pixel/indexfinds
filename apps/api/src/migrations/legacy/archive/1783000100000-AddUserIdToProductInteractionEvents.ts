import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToProductInteractionEvents1783000100000 implements MigrationInterface {
  name = 'AddUserIdToProductInteractionEvents1783000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_interaction_events
      ADD COLUMN IF NOT EXISTS "userId" UUID;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_interaction_events_user_type_createdAt"
      ON product_interaction_events ("userId", "eventType", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_interaction_events_user_type_createdAt";
    `);

    await queryRunner.query(`
      ALTER TABLE product_interaction_events
      DROP COLUMN IF EXISTS "userId";
    `);
  }
}
