export type TrackingIdType = 'ga' | 'gtm';

export interface TrackingConfig {
  gtmId: string;
  gaId: string;
  enabled: boolean;
}

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function normalizeTrackingId(value: string): string {
  return value.trim();
}

export function getTrackingIdError(
  type: TrackingIdType,
  rawValue: string,
): string | null {
  const value = normalizeTrackingId(rawValue);

  if (!value) {
    return null;
  }

  if (type === 'ga' && !GA_MEASUREMENT_ID_PATTERN.test(value)) {
    return 'GA4 ID 必须是 G-XXXXXXXXXX 这种 Measurement ID，不能粘贴整段脚本。';
  }

  if (type === 'gtm' && !GTM_CONTAINER_ID_PATTERN.test(value)) {
    return 'GTM ID 必须是 GTM-XXXXXXX 这种容器 ID。';
  }

  return null;
}

export function isValidTrackingId(
  type: TrackingIdType,
  rawValue: string,
): boolean {
  const value = normalizeTrackingId(rawValue);
  return value !== '' && getTrackingIdError(type, value) === null;
}
