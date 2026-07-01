import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { runScriptMain, withScriptDataSource } from './lib/script-support';

type IpSummaryRow = {
  ipAddress: string;
  sessions: string | number;
  devices: string | number;
  visits: string | number;
  directSessions: string | number;
  productLandings: string | number;
  firstSeen: string;
  lastSeen: string;
  topLandingPage: string | null;
};

type NetworkSummaryRow = {
  network: string;
  sampleIp: string | null;
  sessions: string | number;
  ips: string | number;
  devices: string | number;
  directSessions: string | number;
  productLandings: string | number;
  firstSeen: string;
  lastSeen: string;
};

type MinuteBurstRow = {
  minute: string;
  ipAddress: string;
  sessions: string | number;
  devices: string | number;
  productLandings: string | number;
};

type SearchIpRow = {
  ipAddress: string;
  searches: string | number;
  devices: string | number;
  userAgents: string | number;
  suspiciousUserAgents: string | number;
  firstSeen: string;
  lastSeen: string;
};

type OutboundIpRow = {
  ipAddress: string;
  clicks: string | number;
  devices: string | number;
  productClicks: string | number;
  firstSeen: string;
  lastSeen: string;
};

type AsnInfo = {
  org?: string;
  asn?: string;
  country?: string;
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

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function toInt(value: string | number | null | undefined): number {
  return parseInt(String(value ?? 0), 10) || 0;
}

function formatDate(value: Date): string {
  return value.toISOString().replace('T', ' ').slice(0, 19);
}

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function quoteCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function printTable(rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    console.log('(none)');
    return;
  }

  const headers = Object.keys(rows[0]);
  console.log(headers.join(','));
  for (const row of rows) {
    console.log(headers.map((header) => quoteCell(row[header])).join(','));
  }
}

function normalizeIp(value: string | null | undefined): string {
  const ip = (value || '').trim();
  return ip || '(unknown)';
}

function riskLabel(row: {
  sessions: number;
  ips?: number;
  devices: number;
  directSessions: number;
  productLandings: number;
}): string {
  const directProductHeavy =
    row.productLandings >= 30 &&
    row.directSessions >= Math.max(30, Math.floor(row.sessions * 0.7));
  const rotatingDevices = row.devices >= 30;
  const rotatingIps = (row.ips ?? 0) >= 8;

  if (directProductHeavy && rotatingDevices && rotatingIps) {
    return 'high_proxy_pool';
  }

  if (directProductHeavy && rotatingDevices) {
    return 'direct_product_rotation';
  }

  if (rotatingDevices || rotatingIps) {
    return 'watch';
  }

  return '';
}

async function fetchAsnInfo(ip: string, token: string): Promise<AsnInfo | null> {
  if (ip === '(unknown)' || typeof fetch !== 'function') {
    return null;
  }

  const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    org?: string;
    country?: string;
  };
  const org = data.org || '';
  const asn = org.match(/^AS\d+/)?.[0];
  return { org, asn, country: data.country };
}

async function enrichAsn(
  ips: string[],
  enabled: boolean,
): Promise<Map<string, AsnInfo>> {
  const token = process.env.IPINFO_TOKEN;
  const result = new Map<string, AsnInfo>();
  if (!enabled || !token) {
    return result;
  }

  for (const ip of ips) {
    const info = await fetchAsnInfo(ip, token);
    if (info) {
      result.set(ip, info);
    }
  }
  return result;
}

async function tableExists(dataSource: DataSource, tableName: string): Promise<boolean> {
  const rows = await dataSource.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${tableName}`],
  );
  return rows[0]?.exists === true;
}

async function run(): Promise<void> {
  const windowMinutes = Math.max(toInt(getArgValue('--minutes') ?? '60'), 1);
  const limit = Math.min(Math.max(toInt(getArgValue('--limit') ?? '20'), 1), 100);
  const enrich = hasFlag('--enrich-asn');
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - windowMinutes * 60 * 1000);

  await withScriptDataSource(async (dataSource) => {
    console.log('Traffic abuse audit');
    console.log(`Window: ${formatDate(startDate)} -> ${formatDate(endDate)}`);
    console.log(`Limit: ${limit}`);
    if (enrich && !process.env.IPINFO_TOKEN) {
      console.log('ASN enrichment skipped: IPINFO_TOKEN is not set');
    }

    const ipSummaryRows = (await dataSource.query(
      `WITH scoped AS (
        SELECT
          COALESCE(NULLIF(vs.ip_address, ''), '(unknown)') AS ip_address,
          COALESCE(NULLIF(vs.device_id, ''), vs.session_id) AS device_key,
          COALESCE(NULLIF(vs.visit_id, ''), vs.session_id) AS visit_key,
          COALESCE(vs.channel_type, 'direct') AS channel_type,
          COALESCE(vs.landing_page, '') AS landing_page,
          vs.created_at
        FROM visit_sessions vs
        WHERE vs.created_at BETWEEN $1 AND $2
      ),
      landing_rank AS (
        SELECT
          ip_address,
          landing_page,
          ROW_NUMBER() OVER (
            PARTITION BY ip_address
            ORDER BY COUNT(*) DESC, landing_page ASC
          ) AS rank
        FROM scoped
        GROUP BY ip_address, landing_page
      )
      SELECT
        s.ip_address AS "ipAddress",
        COUNT(*)::int AS sessions,
        COUNT(DISTINCT s.device_key)::int AS devices,
        COUNT(DISTINCT s.visit_key)::int AS visits,
        COUNT(*) FILTER (WHERE s.channel_type = 'direct')::int AS "directSessions",
        COUNT(*) FILTER (
          WHERE s.landing_page ~ '^/[a-z]{2}/products/'
             OR s.landing_page ~ '^/products/'
        )::int AS "productLandings",
        MIN(s.created_at)::text AS "firstSeen",
        MAX(s.created_at)::text AS "lastSeen",
        MAX(lr.landing_page) FILTER (WHERE lr.rank = 1) AS "topLandingPage"
      FROM scoped s
      LEFT JOIN landing_rank lr ON lr.ip_address = s.ip_address
      GROUP BY s.ip_address
      ORDER BY sessions DESC, devices DESC
      LIMIT $3`,
      [startDate, endDate, limit],
    )) as IpSummaryRow[];

    const topIps = ipSummaryRows.map((row) => normalizeIp(row.ipAddress));
    const asn = await enrichAsn(topIps, enrich);

    printSection('Top visit-session IPs');
    printTable(
      ipSummaryRows.map((row) => {
        const ip = normalizeIp(row.ipAddress);
        const info = asn.get(ip);
        const sessions = toInt(row.sessions);
        const devices = toInt(row.devices);
        const productLandings = toInt(row.productLandings);
        const directSessions = toInt(row.directSessions);
        return {
          ip,
          sessions,
          devices,
          visits: toInt(row.visits),
          deviceSessionRatio: sessions > 0 ? (devices / sessions).toFixed(2) : '0',
          directPct:
            sessions > 0 ? `${Math.round((directSessions / sessions) * 100)}%` : '0%',
          productLandingPct:
            sessions > 0 ? `${Math.round((productLandings / sessions) * 100)}%` : '0%',
          asn: info?.asn || '',
          org: info?.org || '',
          country: info?.country || '',
          firstSeen: row.firstSeen,
          lastSeen: row.lastSeen,
          topLandingPage: row.topLandingPage || '',
        };
      }),
    );

    const networkSummaryRows = (await dataSource.query(
      `WITH scoped AS (
        SELECT
          COALESCE(NULLIF(vs.ip_address, ''), '(unknown)') AS ip_address,
          CASE
            WHEN COALESCE(NULLIF(vs.ip_address, ''), '') ~ '^[0-9]{1,3}(\\.[0-9]{1,3}){3}$'
              THEN regexp_replace(vs.ip_address, '\\.[0-9]{1,3}$', '.0/24')
            ELSE COALESCE(NULLIF(vs.ip_address, ''), '(unknown)')
          END AS network,
          COALESCE(NULLIF(vs.device_id, ''), vs.session_id) AS device_key,
          COALESCE(vs.channel_type, 'direct') AS channel_type,
          COALESCE(vs.landing_page, '') AS landing_page,
          vs.created_at
        FROM visit_sessions vs
        WHERE vs.created_at BETWEEN $1 AND $2
      )
      SELECT
        network,
        MIN(NULLIF(ip_address, '(unknown)')) AS "sampleIp",
        COUNT(*)::int AS sessions,
        COUNT(DISTINCT ip_address)::int AS ips,
        COUNT(DISTINCT device_key)::int AS devices,
        COUNT(*) FILTER (WHERE channel_type = 'direct')::int AS "directSessions",
        COUNT(*) FILTER (
          WHERE landing_page ~ '^/[a-z]{2}/products/'
             OR landing_page ~ '^/products/'
        )::int AS "productLandings",
        MIN(created_at)::text AS "firstSeen",
        MAX(created_at)::text AS "lastSeen"
      FROM scoped
      GROUP BY network
      HAVING COUNT(*) >= $3
          OR COUNT(DISTINCT ip_address) >= $4
          OR COUNT(DISTINCT device_key) >= $5
      ORDER BY devices DESC, sessions DESC, ips DESC
      LIMIT $6`,
      [startDate, endDate, 60, 8, 25, limit],
    )) as NetworkSummaryRow[];

    const networkSampleIps = networkSummaryRows
      .map((row) => normalizeIp(row.sampleIp))
      .filter((ip) => ip !== '(unknown)');
    const networkAsn = await enrichAsn(networkSampleIps, enrich);

    printSection('Top visit-session networks');
    printTable(
      networkSummaryRows.map((row) => {
        const sampleIp = normalizeIp(row.sampleIp);
        const info = networkAsn.get(sampleIp);
        const sessions = toInt(row.sessions);
        const ips = toInt(row.ips);
        const devices = toInt(row.devices);
        const directSessions = toInt(row.directSessions);
        const productLandings = toInt(row.productLandings);
        return {
          network: row.network,
          sessions,
          ips,
          devices,
          directPct:
            sessions > 0 ? `${Math.round((directSessions / sessions) * 100)}%` : '0%',
          productLandingPct:
            sessions > 0 ? `${Math.round((productLandings / sessions) * 100)}%` : '0%',
          risk: riskLabel({
            sessions,
            ips,
            devices,
            directSessions,
            productLandings,
          }),
          sampleIp,
          asn: info?.asn || '',
          org: info?.org || '',
          country: info?.country || '',
          firstSeen: row.firstSeen,
          lastSeen: row.lastSeen,
        };
      }),
    );

    const minuteBurstRows = (await dataSource.query(
      `SELECT
        DATE_TRUNC('minute', vs.created_at)::text AS minute,
        COALESCE(NULLIF(vs.ip_address, ''), '(unknown)') AS "ipAddress",
        COUNT(*)::int AS sessions,
        COUNT(DISTINCT COALESCE(NULLIF(vs.device_id, ''), vs.session_id))::int AS devices,
        COUNT(*) FILTER (
          WHERE COALESCE(vs.landing_page, '') ~ '^/[a-z]{2}/products/'
             OR COALESCE(vs.landing_page, '') ~ '^/products/'
        )::int AS "productLandings"
      FROM visit_sessions vs
      WHERE vs.created_at BETWEEN $1 AND $2
      GROUP BY 1, 2
      HAVING COUNT(*) >= $3
          OR COUNT(DISTINCT COALESCE(NULLIF(vs.device_id, ''), vs.session_id)) >= $4
      ORDER BY sessions DESC, devices DESC
      LIMIT $5`,
      [startDate, endDate, 40, 15, limit],
    )) as MinuteBurstRow[];

    printSection('Minute bursts from visit_sessions');
    printTable(
      minuteBurstRows.map((row) => ({
        minute: row.minute,
        ip: normalizeIp(row.ipAddress),
        sessions: toInt(row.sessions),
        devices: toInt(row.devices),
        productLandings: toInt(row.productLandings),
      })),
    );

    if (await tableExists(dataSource, 'search_logs')) {
      const searchRows = (await dataSource.query(
        `SELECT
          COALESCE(NULLIF(sl.ip_address, ''), '(unknown)') AS "ipAddress",
          COUNT(*)::int AS searches,
          COUNT(DISTINCT COALESCE(NULLIF(sl.device_id, ''), sl.session_id))::int AS devices,
          COUNT(DISTINCT COALESCE(NULLIF(sl.user_agent, ''), '(empty)'))::int AS "userAgents",
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(sl.user_agent, '')) LIKE '%python%'
               OR LOWER(COALESCE(sl.user_agent, '')) LIKE '%curl%'
               OR LOWER(COALESCE(sl.user_agent, '')) LIKE '%wget%'
               OR LOWER(COALESCE(sl.user_agent, '')) LIKE '%headless%'
               OR LOWER(COALESCE(sl.user_agent, '')) LIKE '%bot%'
          )::int AS "suspiciousUserAgents",
          MIN(sl.created_at)::text AS "firstSeen",
          MAX(sl.created_at)::text AS "lastSeen"
        FROM search_logs sl
        WHERE sl.created_at BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY searches DESC, devices DESC
        LIMIT $3`,
        [startDate, endDate, limit],
      )) as SearchIpRow[];

      printSection('Top search-log IPs');
      printTable(
        searchRows.map((row) => ({
          ip: normalizeIp(row.ipAddress),
          searches: toInt(row.searches),
          devices: toInt(row.devices),
          userAgents: toInt(row.userAgents),
          suspiciousUserAgents: toInt(row.suspiciousUserAgents),
          firstSeen: row.firstSeen,
          lastSeen: row.lastSeen,
        })),
      );
    }

    if (await tableExists(dataSource, 'outbound_clicks')) {
      const outboundRows = (await dataSource.query(
        `SELECT
          COALESCE(NULLIF(vs.ip_address, ''), '(unknown)') AS "ipAddress",
          COUNT(*)::int AS clicks,
          COUNT(DISTINCT COALESCE(NULLIF(o.device_id, ''), o."sessionId"))::int AS devices,
          COUNT(DISTINCT o."productId")::int AS "productClicks",
          MIN(o."createdAt")::text AS "firstSeen",
          MAX(o."createdAt")::text AS "lastSeen"
        FROM outbound_clicks o
        LEFT JOIN LATERAL (
          SELECT visit.ip_address
          FROM visit_sessions visit
          WHERE COALESCE(NULLIF(o.visit_id, ''), o."sessionId")
            = COALESCE(NULLIF(visit.visit_id, ''), visit.session_id)
          ORDER BY visit.created_at DESC
          LIMIT 1
        ) vs ON true
        WHERE o."createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY clicks DESC, devices DESC
        LIMIT $3`,
        [startDate, endDate, limit],
      )) as OutboundIpRow[];

      printSection('Top outbound-click IPs');
      printTable(
        outboundRows.map((row) => ({
          ip: normalizeIp(row.ipAddress),
          clicks: toInt(row.clicks),
          devices: toInt(row.devices),
          productClicks: toInt(row.productClicks),
          firstSeen: row.firstSeen,
          lastSeen: row.lastSeen,
        })),
      );
    }
  });
}

void runScriptMain('traffic abuse audit', run);
