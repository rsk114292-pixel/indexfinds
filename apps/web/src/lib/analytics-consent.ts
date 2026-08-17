export const ANALYTICS_CONSENT_COOKIE = 'cookie_consent';

export function hasAnalyticsConsent(value?: string | null): boolean {
  return value === 'accepted';
}

export function readAnalyticsConsentCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ANALYTICS_CONSENT_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function canUseAnalyticsTracking(): boolean {
  return hasAnalyticsConsent(readAnalyticsConsentCookie());
}
