import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建 visit_sessions 表（流量来源追踪）及相关索引
 */
export class CreateVisitSessions1738000013000 implements MigrationInterface {
  name = 'CreateVisitSessions1738000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS visit_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL,
        user_id UUID,
        referrer TEXT,
        referrer_domain VARCHAR(255),
        channel_type VARCHAR(50) NOT NULL DEFAULT 'direct',
        utm_source VARCHAR(500),
        utm_medium VARCHAR(500),
        utm_campaign VARCHAR(500),
        utm_term VARCHAR(500),
        utm_content VARCHAR(500),
        landing_page TEXT NOT NULL,
        device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
        browser VARCHAR(255),
        os VARCHAR(255),
        ip_address VARCHAR(45),
        country VARCHAR(100),
        city VARCHAR(100),
        language VARCHAR(50),
        timezone VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 核心索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_session_created ON visit_sessions(session_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_channel_created ON visit_sessions(channel_type, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_utm_source_created ON visit_sessions(utm_source, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_utm_campaign_created ON visit_sessions(utm_campaign, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_referrer_domain_created ON visit_sessions(referrer_domain, created_at)`,
    );

    // 辅助索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_created_at ON visit_sessions(created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_country_created ON visit_sessions(country, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_visit_sessions_device_created ON visit_sessions(device_type, created_at)`,
    );

    // 为现有表补充 session_id 索引
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_outbound_clicks_session_id ON outbound_clicks("sessionId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_search_logs_session_id ON search_logs(session_id, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_search_logs_session_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_outbound_clicks_session_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS visit_sessions`);
  }
}
