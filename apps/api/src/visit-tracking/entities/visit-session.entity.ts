import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('visit_sessions')
@Index(['sessionId', 'createdAt'])
@Index(['deviceId', 'createdAt'])
@Index(['visitId', 'createdAt'])
@Index(['channelType', 'createdAt'])
@Index(['utmSource', 'createdAt'])
@Index(['utmCampaign', 'createdAt'])
@Index(['referrerDomain', 'createdAt'])
@Index(['refClickId', 'createdAt'])
export class VisitSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', length: 255 })
  sessionId: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId: string | null;

  @Column({ name: 'visit_id', type: 'varchar', length: 255, nullable: true })
  visitId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @Column({ name: 'ref_click_id', type: 'uuid', nullable: true })
  refClickId: string | null;

  @Column({
    name: 'referral_code',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  referralCode: string | null;

  @Column({ type: 'text', nullable: true })
  referrer: string;

  @Column({ name: 'referrer_domain', length: 255, nullable: true })
  referrerDomain: string;

  @Column({
    name: 'channel_type',
    type: 'varchar',
    length: 50,
    default: 'direct',
  })
  channelType: string;

  @Column({ name: 'utm_source', length: 500, nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', length: 500, nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', length: 500, nullable: true })
  utmCampaign: string;

  @Column({ name: 'utm_term', length: 500, nullable: true })
  utmTerm: string;

  @Column({ name: 'utm_content', length: 500, nullable: true })
  utmContent: string;

  @Column({ name: 'landing_page', type: 'text' })
  landingPage: string;

  @Column({
    name: 'device_type',
    type: 'varchar',
    length: 20,
    default: 'desktop',
  })
  deviceType: string;

  @Column({ length: 255, nullable: true })
  browser: string;

  @Column({ length: 255, nullable: true })
  os: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  language: string;

  @Column({ length: 100, nullable: true })
  timezone: string;

  @Column({
    name: 'consent_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  consentStatus: string | null;

  @Column({ name: 'ga_status', type: 'varchar', length: 50, nullable: true })
  gaStatus: string | null;

  @Column({ name: 'ga_tracking_enabled', type: 'boolean', nullable: true })
  gaTrackingEnabled: boolean | null;

  @Column({ name: 'ga_requested', type: 'boolean', nullable: true })
  gaRequested: boolean | null;

  @Column({ name: 'ga_script_loaded', type: 'boolean', nullable: true })
  gaScriptLoaded: boolean | null;

  @Column({
    name: 'ga_configured_target',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  gaConfiguredTarget: string | null;

  @Column({ name: 'ga_first_pageview_sent', type: 'boolean', nullable: true })
  gaFirstPageviewSent: boolean | null;

  @Column({ name: 'ga_event_count', type: 'integer', nullable: true })
  gaEventCount: number | null;

  @Column({
    name: 'ga_failed_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  gaFailedReason: string | null;

  @Column({ name: 'is_in_app_browser', type: 'boolean', nullable: true })
  isInAppBrowser: boolean | null;

  @Column({
    name: 'browser_context',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  browserContext: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt: Date;

  @Column({ name: 'active_duration_ms', type: 'integer', default: 0 })
  activeDurationMs: number;

  @Column({ name: 'total_duration_ms', type: 'integer', default: 0 })
  totalDurationMs: number;

  @Column({ name: 'heartbeat_count', type: 'integer', default: 0 })
  heartbeatCount: number;

  @Column({ name: 'engagement_event_count', type: 'integer', default: 0 })
  engagementEventCount: number;

  @Column({
    name: 'active_duration_before_first_outbound_ms',
    type: 'integer',
    nullable: true,
  })
  activeDurationBeforeFirstOutboundMs: number | null;

  @Column({ name: 'last_engagement_at', type: 'timestamptz', nullable: true })
  lastEngagementAt: Date | null;
}
