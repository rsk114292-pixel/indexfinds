export const REFERRAL_TRACKING_SIGNATURE_HEADER = 'x-referral-track-signature';
export const REFERRAL_TRACKING_TIMESTAMP_HEADER = 'x-referral-track-ts';

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

function getReferralTrackingSecret(): string {
  return (
    process.env.REFERRAL_TRACKING_SECRET ||
    process.env.REVALIDATE_SECRET ||
    ''
  );
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

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildReferralTrackingHeaders(
  payload: Omit<ReferralTrackingPayload, 'timestamp'>,
): Promise<Record<string, string>> {
  const secret = getReferralTrackingSecret();
  if (!secret) {
    return {};
  }

  const timestamp = Date.now().toString();
  const serialized = serializePayload({
    ...payload,
    timestamp,
  });
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(serialized),
  );
  const signature = toHex(signatureBuffer);

  return {
    [REFERRAL_TRACKING_TIMESTAMP_HEADER]: timestamp,
    [REFERRAL_TRACKING_SIGNATURE_HEADER]: signature,
  };
}
