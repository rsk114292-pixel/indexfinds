import 'reflect-metadata';
import * as dotenv from 'dotenv';
import AppDataSource from '../../data-source';

dotenv.config();

type SummaryRow = {
  referralClicks: string | number;
  landingVisits: string | number;
  firstPartyVisits: string | number;
  gaCaptures: string | number;
};

type BreakdownRow = {
  value: string | null;
  firstPartyVisits: string | number;
  gaCaptures: string | number;
  blockedOrFailed: string | number;
  pendingConsent: string | number;
  captureRate: string | number;
};

type SampleRow = {
  createdAt: string;
  visitId: string | null;
  landingPage: string | null;
  source: string | null;
  browserContext: string | null;
  consentStatus: string | null;
  gaStatus: string | null;
  gaFailedReason: string | null;
  gaFirstPageviewSent: boolean | null;
};

function getArgValue(name: string): string | null {
  const directPrefix = `${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(directPrefix));
  if (direct) return direct.slice(directPrefix.length);

  const index = process.argv.findIndex((arg) => arg === name);
  if (index >= 0 && index + 1 < process.argv.length) {
    return process.argv[index + 1] || null;
  }

  return null;
}

function toInt(value: string | number | null | undefined): number {
  return parseInt(String(value ?? 0), 10) || 0;
}

function toPercent(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

function formatDate(value: Date): string {
  return value.toISOString().replace('T', ' ').slice(0, 19);
}

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function run(): Promise<void> {
  const days = toInt(getArgValue('--days') ?? '7') || 7;
  const sampleLimit = toInt(getArgValue('--sample') ?? '10') || 10;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('Traffic reconciliation audit');
    console.log(`Window: ${formatDate(startDate)} -> ${formatDate(endDate)}`);

    const summaryRows = await AppDataSource.query(
      `WITH referred_visits AS (
        SELECT *
        FROM visit_sessions vs
        WHERE vs.created_at BETWEEN $1 AND $2
          AND (vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)
      )
      SELECT
        (SELECT COUNT(*)::int
         FROM referral_clicks rc
         WHERE rc."createdAt" BETWEEN $1 AND $2) AS "referralClicks",
        (SELECT COUNT(*)::int FROM referred_visits) AS "landingVisits",
        (SELECT COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int
         FROM referred_visits vs) AS "firstPartyVisits",
        (SELECT COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int
         FROM referred_visits vs
         WHERE COALESCE(vs.ga_first_pageview_sent, false) = true) AS "gaCaptures"`,
      [startDate, endDate],
    );

    const summary = (summaryRows[0] || {}) as SummaryRow;
    const referralClicks = toInt(summary.referralClicks);
    const landingVisits = toInt(summary.landingVisits);
    const firstPartyVisits = toInt(summary.firstPartyVisits);
    const gaCaptures = toInt(summary.gaCaptures);

    printSection('Funnel Summary');
    console.log(`Referral clicks: ${referralClicks}`);
    console.log(`Landing visits: ${landingVisits}`);
    console.log(`First-party visits: ${firstPartyVisits}`);
    console.log(`GA first pageviews: ${gaCaptures}`);
    console.log(
      `Click -> landing: ${
        referralClicks > 0 ? toPercent((landingVisits / referralClicks) * 100) : '0%'
      }`,
    );
    console.log(
      `Landing -> first-party: ${
        landingVisits > 0
          ? toPercent((firstPartyVisits / landingVisits) * 100)
          : '0%'
      }`,
    );
    console.log(
      `First-party -> GA capture: ${
        firstPartyVisits > 0
          ? toPercent((gaCaptures / firstPartyVisits) * 100)
          : '0%'
      }`,
    );

    const lossRows = await AppDataSource.query(
      `SELECT
        CASE
          WHEN COALESCE(vs.ga_first_pageview_sent, false) = true THEN 'captured'
          WHEN vs.consent_status = 'rejected' THEN 'consent_rejected'
          WHEN vs.consent_status IS NULL OR vs.consent_status = 'pending' THEN 'consent_pending'
          WHEN vs.ga_status = 'blocked' THEN 'ga_blocked'
          WHEN vs.ga_status = 'failed' AND vs.ga_failed_reason IS NOT NULL
            THEN CONCAT('ga_failed:', vs.ga_failed_reason)
          WHEN vs.ga_status = 'failed' THEN 'ga_failed'
          WHEN vs.ga_status = 'ready' THEN 'ready_but_no_pageview'
          WHEN vs.ga_status = 'disabled' OR COALESCE(vs.ga_tracking_enabled, false) = false
            THEN 'ga_disabled'
          ELSE 'unclassified'
        END AS reason,
        COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int AS count
      FROM visit_sessions vs
      WHERE vs.created_at BETWEEN $1 AND $2
        AND (vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)
      GROUP BY 1
      ORDER BY count DESC`,
      [startDate, endDate],
    );

    printSection('Loss Breakdown');
    for (const row of lossRows as Array<{ reason: string; count: string | number }>) {
      console.log(`${row.reason}: ${toInt(row.count)}`);
    }

    const breakdownQueries: Array<{
      title: string;
      sql: string;
    }> = [
      {
        title: 'Top Source Breakdown',
        sql: `SELECT
          COALESCE(
            NULLIF(
              CASE
                WHEN vs.channel_type = 'internal' THEN '(internal)'
                WHEN vs.utm_source IS NOT NULL AND vs.utm_source <> '' THEN LOWER(vs.utm_source)
                WHEN vs.referrer_domain IS NOT NULL AND vs.referrer_domain <> '' THEN LOWER(vs.referrer_domain)
                ELSE '(direct)'
              END,
              ''
            ),
            '(unknown)'
          ) AS value,
          COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int AS "firstPartyVisits",
          COUNT(DISTINCT CASE
            WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
            THEN COALESCE(vs.visit_id, vs.session_id)
          END)::int AS "gaCaptures",
          COUNT(DISTINCT CASE
            WHEN vs.ga_status IN ('blocked', 'failed')
            THEN COALESCE(vs.visit_id, vs.session_id)
          END)::int AS "blockedOrFailed",
          COUNT(DISTINCT CASE
            WHEN vs.consent_status IS NULL OR vs.consent_status = 'pending'
            THEN COALESCE(vs.visit_id, vs.session_id)
          END)::int AS "pendingConsent",
          ROUND(
            COUNT(DISTINCT CASE
              WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
              THEN COALESCE(vs.visit_id, vs.session_id)
            END)::numeric
            / NULLIF(COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id)), 0) * 100,
            2
          ) AS "captureRate"
        FROM visit_sessions vs
        WHERE vs.created_at BETWEEN $1 AND $2
          AND (vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)
        GROUP BY 1
        ORDER BY "firstPartyVisits" DESC
        LIMIT 10`,
      },
      {
        title: 'Top Browser Context Breakdown',
        sql: `SELECT
          COALESCE(NULLIF(LOWER(vs.browser_context), ''), '(unknown)') AS value,
          COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int AS "firstPartyVisits",
          COUNT(DISTINCT CASE
            WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
            THEN COALESCE(vs.visit_id, vs.session_id)
          END)::int AS "gaCaptures",
          COUNT(DISTINCT CASE
            WHEN vs.ga_status IN ('blocked', 'failed')
            THEN COALESCE(vs.visit_id, vs.session_id)
          END)::int AS "blockedOrFailed",
          COUNT(DISTINCT CASE
            WHEN vs.consent_status IS NULL OR vs.consent_status = 'pending'
            THEN COALESCE(vs.visit_id, vs.session_id)
          END)::int AS "pendingConsent",
          ROUND(
            COUNT(DISTINCT CASE
              WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
              THEN COALESCE(vs.visit_id, vs.session_id)
            END)::numeric
            / NULLIF(COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id)), 0) * 100,
            2
          ) AS "captureRate"
        FROM visit_sessions vs
        WHERE vs.created_at BETWEEN $1 AND $2
          AND (vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)
        GROUP BY 1
        ORDER BY "firstPartyVisits" DESC
        LIMIT 10`,
      },
    ];

    for (const query of breakdownQueries) {
      const rows = (await AppDataSource.query(query.sql, [startDate, endDate])) as BreakdownRow[];
      printSection(query.title);
      for (const row of rows) {
        console.log(
          [
            row.value || '(unknown)',
            `visits=${toInt(row.firstPartyVisits)}`,
            `ga=${toInt(row.gaCaptures)}`,
            `blocked=${toInt(row.blockedOrFailed)}`,
            `pending=${toInt(row.pendingConsent)}`,
            `rate=${row.captureRate ?? 0}%`,
          ].join(' | '),
        );
      }
    }

    const sampleRows = (await AppDataSource.query(
      `SELECT
        vs.created_at AS "createdAt",
        vs.visit_id AS "visitId",
        vs.landing_page AS "landingPage",
        CASE
          WHEN vs.utm_source IS NOT NULL AND vs.utm_source <> '' THEN LOWER(vs.utm_source)
          WHEN vs.referrer_domain IS NOT NULL AND vs.referrer_domain <> '' THEN LOWER(vs.referrer_domain)
          ELSE '(direct)'
        END AS source,
        vs.browser_context AS "browserContext",
        vs.consent_status AS "consentStatus",
        vs.ga_status AS "gaStatus",
        vs.ga_failed_reason AS "gaFailedReason",
        vs.ga_first_pageview_sent AS "gaFirstPageviewSent"
      FROM visit_sessions vs
      WHERE vs.created_at BETWEEN $1 AND $2
        AND (vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)
        AND (
          COALESCE(vs.ga_first_pageview_sent, false) = false
          OR vs.ga_status IN ('blocked', 'failed')
        )
      ORDER BY vs.created_at DESC
      LIMIT $3`,
      [startDate, endDate, sampleLimit],
    )) as SampleRow[];

    printSection('Recent Missed-Capture Samples');
    if (sampleRows.length === 0) {
      console.log('No missed-capture samples found in this window.');
    } else {
      sampleRows.forEach((row, index) => {
        console.log(
          [
            `#${index + 1}`,
            row.createdAt,
            row.visitId || '(no visit_id)',
            row.source || '(unknown)',
            row.browserContext || '(unknown)',
            row.consentStatus || '(null)',
            row.gaStatus || '(null)',
            row.gaFailedReason || '(none)',
            row.gaFirstPageviewSent ? 'captured=true' : 'captured=false',
            row.landingPage || '(no landing page)',
          ].join(' | '),
        );
      });
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
