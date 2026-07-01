import { MigrationInterface, QueryRunner } from 'typeorm';

export class HotSearchPersonalization1738000023000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 实验表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hot_search_experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        variants JSONB NOT NULL DEFAULT '[]',
        start_at TIMESTAMPTZ DEFAULT NULL,
        end_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 实验事件追踪表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hot_search_experiment_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id UUID NOT NULL REFERENCES hot_search_experiments(id) ON DELETE CASCADE,
        variant_id VARCHAR(50) NOT NULL,
        event_type VARCHAR(20) NOT NULL,
        keyword VARCHAR(255),
        session_id VARCHAR(255),
        user_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hsee_experiment ON hot_search_experiment_events(experiment_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hsee_variant ON hot_search_experiment_events(variant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hsee_event_type ON hot_search_experiment_events(event_type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hsee_event_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hsee_variant;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hsee_experiment;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS hot_search_experiment_events;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS hot_search_experiments;`);
  }
}
