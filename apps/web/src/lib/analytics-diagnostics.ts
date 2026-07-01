import type { ConsentStatus } from '@/components/CookieConsent';

export type GAStatus =
  | 'unknown'
  | 'waiting_for_consent'
  | 'loading'
  | 'ready'
  | 'blocked'
  | 'disabled'
  | 'failed';

export interface AnalyticsDiagnosticsState {
  consentStatus: ConsentStatus;
  gaStatus: GAStatus;
  gaRequested?: boolean;
  gaTrackingEnabled?: boolean;
  gaScriptLoaded?: boolean;
  gaConfiguredTarget?: 'ga' | 'gtm';
  gaFirstPageviewSent?: boolean;
  gaEventCount?: number;
  gaFailedReason?: string;
  isInAppBrowser?: boolean;
  browserContext?: string;
}

const STORAGE_KEY = 'analytics_diagnostics_v1';

const DEFAULT_STATE: AnalyticsDiagnosticsState = {
  consentStatus: 'pending',
  gaStatus: 'unknown',
  gaRequested: false,
  gaFirstPageviewSent: false,
  gaEventCount: 0,
};

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function getAnalyticsDiagnostics(): AnalyticsDiagnosticsState {
  if (!canUseSessionStorage()) return DEFAULT_STATE;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_STATE;

  try {
    return {
      ...DEFAULT_STATE,
      ...(JSON.parse(raw) as Partial<AnalyticsDiagnosticsState>),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function updateAnalyticsDiagnostics(
  patch: Partial<AnalyticsDiagnosticsState>,
): AnalyticsDiagnosticsState {
  const nextState = {
    ...getAnalyticsDiagnostics(),
    ...patch,
  };

  if (canUseSessionStorage()) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  return nextState;
}

export function recordAnalyticsEvent(
  eventName: string,
): AnalyticsDiagnosticsState {
  const current = getAnalyticsDiagnostics();
  const nextEventCount = (current.gaEventCount || 0) + 1;

  return updateAnalyticsDiagnostics({
    gaEventCount: nextEventCount,
    gaFirstPageviewSent:
      current.gaFirstPageviewSent || eventName === 'page_view',
    gaFailedReason: undefined,
  });
}

export function recordAnalyticsConfig(): AnalyticsDiagnosticsState {
  const current = getAnalyticsDiagnostics();

  if (current.gaConfiguredTarget !== 'ga') {
    return current;
  }

  return updateAnalyticsDiagnostics({
    gaFirstPageviewSent: true,
    gaFailedReason: undefined,
  });
}

export function detectBrowserContext(userAgent?: string): {
  isInAppBrowser: boolean;
  browserContext: string;
} {
  const ua =
    (userAgent ||
      (typeof navigator !== 'undefined' ? navigator.userAgent : '')).toLowerCase();

  if (!ua) {
    return { isInAppBrowser: false, browserContext: 'unknown' };
  }

  if (ua.includes('micromessenger')) {
    return { isInAppBrowser: true, browserContext: 'wechat_webview' };
  }
  if (ua.includes('telegram')) {
    return { isInAppBrowser: true, browserContext: 'telegram_webview' };
  }
  if (ua.includes('instagram')) {
    return { isInAppBrowser: true, browserContext: 'instagram_webview' };
  }
  if (ua.includes('fbav') || ua.includes('fban')) {
    return { isInAppBrowser: true, browserContext: 'facebook_webview' };
  }
  if (ua.includes('line/')) {
    return { isInAppBrowser: true, browserContext: 'line_webview' };
  }

  return { isInAppBrowser: false, browserContext: 'standard_browser' };
}
