import { createHash } from 'crypto';
import type { Request } from 'express';

export const TRUSTED_VISITOR_COOKIE = 'mf_vid';
const VISIT_BUCKET_MS = 30 * 60 * 1000;

export interface AnalyticsRequestContext {
  userId?: string;
  trustedVisitorId: string;
  visitId?: string;
  ipAddress: string;
  countryCode?: string;
  userAgent: string;
}

function getOptionalHeader(
  req: Request,
  headerName: string,
): string | undefined {
  const value = req.headers[headerName];
  if (typeof value === 'string') return value || undefined;
  if (Array.isArray(value)) return value[0] || undefined;
  return undefined;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function getRequestIp(req: Request): string {
  const cloudflareIp = getOptionalHeader(req, 'cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwarded = getOptionalHeader(req, 'x-forwarded-for') || '';

  return (
    forwarded.split(',')[0]?.trim() ||
    req.ip ||
    getOptionalHeader(req, 'x-real-ip') ||
    'unknown'
  );
}

export function getRequestCountryCode(req: Request): string | undefined {
  const countryCode = getOptionalHeader(req, 'cf-ipcountry')
    ?.trim()
    .toUpperCase();

  if (!countryCode || countryCode === 'XX') return undefined;
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined;
}

export function getRequestUserAgent(req: Request): string {
  const ua = req.headers['user-agent'];
  return Array.isArray(ua) ? ua[0] || '' : ua || '';
}

export function resolveTrustedVisitorId(req: Request): string {
  const cookieValue = req.cookies?.[TRUSTED_VISITOR_COOKIE];
  if (cookieValue) return cookieValue;

  const fallback = sha256(`${getRequestIp(req)}|${getRequestUserAgent(req)}`);
  return `anon_${fallback.slice(0, 24)}`;
}

export function buildAnalyticsRequestContext(
  req: Request,
  userId?: string,
): AnalyticsRequestContext {
  const countryCode = getRequestCountryCode(req);

  return {
    userId,
    trustedVisitorId: resolveTrustedVisitorId(req),
    visitId: getOptionalHeader(req, 'x-visit-id'),
    ipAddress: getRequestIp(req),
    ...(countryCode ? { countryCode } : {}),
    userAgent: getRequestUserAgent(req),
  };
}

export function buildTrustedVisitId(input: {
  trustedVisitorId: string;
  landingPage: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  browserContext?: string | null;
  occurredAt?: number;
}): string {
  const bucket = Math.floor((input.occurredAt ?? Date.now()) / VISIT_BUCKET_MS);
  const payload = [
    input.trustedVisitorId,
    input.landingPage || '/',
    input.utmSource || '',
    input.utmMedium || '',
    input.utmCampaign || '',
    input.browserContext || '',
    bucket,
  ].join('|');

  return `visit_${sha256(payload).slice(0, 24)}`;
}

export function hashUserAgent(userAgent: string): string {
  return sha256(userAgent || '').slice(0, 16);
}
