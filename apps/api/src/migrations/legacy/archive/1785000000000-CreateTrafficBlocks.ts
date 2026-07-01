import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrafficBlocks1785000000000 implements MigrationInterface {
  name = 'CreateTrafficBlocks1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS traffic_blocks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        target_type character varying(20) NOT NULL,
        target character varying(64) NOT NULL,
        scope character varying(30) NOT NULL DEFAULT 'product_paths',
        status character varying(30) NOT NULL,
        reason text,
        metrics_snapshot jsonb,
        created_by uuid,
        expires_at TIMESTAMP WITH TIME ZONE,
        applied_at TIMESTAMP WITH TIME ZONE,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_traffic_blocks_target_scope_status
      ON traffic_blocks(target, scope, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_traffic_blocks_status_expires
      ON traffic_blocks(status, expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_traffic_blocks_status_expires
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_traffic_blocks_target_scope_status
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS traffic_blocks
    `);
  }
}
