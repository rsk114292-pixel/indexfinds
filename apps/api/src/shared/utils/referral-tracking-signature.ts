import { createHmac, timingSafeEqual } from 'crypto';

export const REFERRAL_TRACKING_SIGNATURE_HEADER = 'x-referral-track-signature';
export const REFERRAL_TRACKING_TIMESTAMP_HEADER = 'x-referral-track-ts';
const REFERRAL_TRACKING_SIGNATURE_TTL_MS = 5 * 60 * 1000;

export interface ReferralTrackingPayload {
  timestamp: string;
  code: string;
  sessionId?: string;
  landingPage?: string;
  redirectTo?: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
}

function normalizePart(value?: string): string {
  return value?.trim() || '';
}

function serializePayload(payload: ReferralTrackingPayload): string {
  return [
    normalizePart(payload.timestamp),
    normalizePart(payload.code).toUpperCase(),
    normalizePart(payload.sessionId),
    normalizePart(payload.landingPage),
    normalizePart(payload.redirectTo),
    normalizePart(payload.ip),
    normalizePart(payload.userAgent),
    normalizePart(payload.referer),
  ].join('\n');
}

export function getReferralTrackingSecret(): string {
  return (
    process.env.REFERRAL_TRACKING_SECRET || process.env.REVALIDATE_SECRET || ''
  );
}

export function signReferralTrackingPayload(
  payload: ReferralTrackingPayload,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(serializePayload(payload))
    .digest('hex');
}

export function verifyReferralTrackingPayload(
  payload: ReferralTrackingPayload,
  signature: string | undefined,
): boolean {
  const secret = getReferralTrackingSecret();
  if (!secret || !signature) {
    return false;
  }

  const timestamp = parseInt(payload.timestamp, 10);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (Math.abs(Date.now() - timestamp) > REFERRAL_TRACKING_SIGNATURE_TTL_MS) {
    return false;
  }

  const expected = signReferralTrackingPayload(payload, secret);
  const provided = signature.trim();
  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
