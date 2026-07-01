export interface GscPageMetricRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoLandingGscSnapshotRow {
  key: string;
  landingPage: string;
  pageType: 'platform' | 'topic';
  platformName: string;
  topicName: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoLandingGscSnapshot {
  rows: SeoLandingGscSnapshotRow[];
  uploadedAt: string;
  sourceLabel: string | null;
}

const HEADER_ALIASES = {
  page: ['page', 'top pages', 'pages', 'url', '网页', '页面', '着陆页'],
  clicks: ['clicks', '点击', '点击次数'],
  impressions: ['impressions', '展示', '展现', '展示次数'],
  ctr: ['ctr'],
  position: ['position', '排名', '平均排名', 'avg position'],
} as const;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, '')
    .replace(/\s+/g, ' ')
    .replace(/[:：]/g, '');
}

function parseNumber(value: string): number {
  const normalized = value.trim().replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCtr(value: string): number {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  if (normalized.endsWith('%')) {
    return parseNumber(normalized.slice(0, -1));
  }

  const parsed = parseNumber(normalized);
  return parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
}

export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

export function parseGscPageMetricsCsv(input: string): GscPageMetricRow[] {
  const rows = parseCsvRows(input);

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0] || [];
  const pageIndex = findHeaderIndex(headers, HEADER_ALIASES.page);
  const clicksIndex = findHeaderIndex(headers, HEADER_ALIASES.clicks);
  const impressionsIndex = findHeaderIndex(headers, HEADER_ALIASES.impressions);
  const ctrIndex = findHeaderIndex(headers, HEADER_ALIASES.ctr);
  const positionIndex = findHeaderIndex(headers, HEADER_ALIASES.position);

  if ([pageIndex, clicksIndex, impressionsIndex, ctrIndex, positionIndex].some((index) => index < 0)) {
    return [];
  }

  return rows
    .slice(1)
    .map((row) => ({
      page: row[pageIndex]?.trim() || '',
      clicks: parseNumber(row[clicksIndex] || ''),
      impressions: parseNumber(row[impressionsIndex] || ''),
      ctr: parseCtr(row[ctrIndex] || ''),
      position: parseNumber(row[positionIndex] || ''),
    }))
    .filter((row) => row.page);
}

function isValidSnapshotRow(value: unknown): value is SeoLandingGscSnapshotRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Partial<SeoLandingGscSnapshotRow>;
  const pageTypeValid = row.pageType === 'platform' || row.pageType === 'topic';

  return (
    typeof row.key === 'string' &&
    typeof row.landingPage === 'string' &&
    pageTypeValid &&
    typeof row.platformName === 'string' &&
    (typeof row.topicName === 'string' || row.topicName === null) &&
    typeof row.clicks === 'number' &&
    Number.isFinite(row.clicks) &&
    typeof row.impressions === 'number' &&
    Number.isFinite(row.impressions) &&
    typeof row.ctr === 'number' &&
    Number.isFinite(row.ctr) &&
    typeof row.position === 'number' &&
    Number.isFinite(row.position)
  );
}

export function serializeSeoLandingGscSnapshot(snapshot: SeoLandingGscSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseSeoLandingGscSnapshot(input: string): SeoLandingGscSnapshot | null {
  if (!input.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(input) as Partial<SeoLandingGscSnapshot>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.uploadedAt !== 'string' ||
      (typeof parsed.sourceLabel !== 'string' && parsed.sourceLabel !== null) ||
      !Array.isArray(parsed.rows) ||
      !parsed.rows.every((row) => isValidSnapshotRow(row))
    ) {
      return null;
    }

    return {
      uploadedAt: parsed.uploadedAt,
      sourceLabel: parsed.sourceLabel ?? null,
      rows: parsed.rows,
    };
  } catch {
    return null;
  }
}
