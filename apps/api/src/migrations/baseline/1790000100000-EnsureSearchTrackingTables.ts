import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureSearchTrackingTables1790000100000 implements MigrationInterface {
  name = 'EnsureSearchTrackingTables1790000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hot_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword VARCHAR(255) NOT NULL UNIQUE,
        search_count INTEGER NOT NULL DEFAULT 0,
        search_count_24h INTEGER NOT NULL DEFAULT 0,
        search_count_7d INTEGER NOT NULL DEFAULT 0,
        avg_result_count INTEGER NOT NULL DEFAULT 0,
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER DEFAULT NULL,
        source VARCHAR(20) NOT NULL DEFAULT 'auto',
        display_start_at TIMESTAMPTZ DEFAULT NULL,
        display_end_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE hot_searches
        ADD COLUMN IF NOT EXISTS search_count_24h INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS search_count_7d INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS avg_result_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'auto',
        ADD COLUMN IF NOT EXISTS display_start_at TIMESTAMPTZ DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS display_end_at TIMESTAMPTZ DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_keyword
      ON hot_searches(keyword)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_search_count
      ON hot_searches(search_count DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_search_count_7d
      ON hot_searches(search_count_7d DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_is_blocked
      ON hot_searches(is_blocked)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_is_pinned
      ON hot_searches(is_pinned)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hot_searches_source
      ON hot_searches(source)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS visit_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) NOT NULL,
        device_id VARCHAR(255),
        visit_id VARCHAR(255),
        user_id UUID,
        ref_click_id UUID,
        referral_code VARCHAR(64),
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
        consent_status VARCHAR(20),
        ga_status VARCHAR(50),
        ga_tracking_enabled BOOLEAN,
        ga_requested BOOLEAN,
        ga_script_loaded BOOLEAN,
        ga_configured_target VARCHAR(20),
        ga_first_pageview_sent BOOLEAN,
        ga_event_count INTEGER,
        ga_failed_reason VARCHAR(100),
        is_in_app_browser BOOLEAN,
        browser_context VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_activity_at TIMESTAMPTZ,
        active_duration_ms INTEGER NOT NULL DEFAULT 0,
        total_duration_ms INTEGER NOT NULL DEFAULT 0,
        heartbeat_count INTEGER NOT NULL DEFAULT 0,
        engagement_event_count INTEGER NOT NULL DEFAULT 0,
        active_duration_before_first_outbound_ms INTEGER,
        last_engagement_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      ALTER TABLE visit_sessions
        ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS visit_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS ref_click_id UUID,
        ADD COLUMN IF NOT EXISTS referral_code VARCHAR(64),
        ADD COLUMN IF NOT EXISTS consent_status VARCHAR(20),
        ADD COLUMN IF NOT EXISTS ga_status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS ga_tracking_enabled BOOLEAN,
        ADD COLUMN IF NOT EXISTS ga_requested BOOLEAN,
        ADD COLUMN IF NOT EXISTS ga_script_loaded BOOLEAN,
        ADD COLUMN IF NOT EXISTS ga_configured_target VARCHAR(20),
        ADD COLUMN IF NOT EXISTS ga_first_pageview_sent BOOLEAN,
        ADD COLUMN IF NOT EXISTS ga_event_count INTEGER,
        ADD COLUMN IF NOT EXISTS ga_failed_reason VARCHAR(100),
        ADD COLUMN IF NOT EXISTS is_in_app_browser BOOLEAN,
        ADD COLUMN IF NOT EXISTS browser_context VARCHAR(100),
        ADD COLUMN IF NOT EXISTS active_duration_ms INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_duration_ms INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS heartbeat_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS engagement_event_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS active_duration_before_first_outbound_ms INTEGER,
        ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_session_created
      ON visit_sessions(session_id, created_at)
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
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_channel_created
      ON visit_sessions(channel_type, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_utm_source_created
      ON visit_sessions(utm_source, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_utm_campaign_created
      ON visit_sessions(utm_campaign, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_referrer_domain_created
      ON visit_sessions(referrer_domain, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_ref_click_id_created
      ON visit_sessions(ref_click_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_created_at
      ON visit_sessions(created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_country_created
      ON visit_sessions(country, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_device_created
      ON visit_sessions(device_type, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_sessions_engagement_created
      ON visit_sessions(created_at, heartbeat_count, active_duration_ms)
    `);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: this repair migration may add missing columns to existing data tables.
  }
}
