/**
 * 访问来源追踪模块
 *
 * 触发时机: 用户首次访问网站时（sessionStorage 中无 visit_session_recorded 标记）
 * 存储方式: sessionStorage（浏览器关闭后清除，下次访问重新记录）
 *
 * 与现有 search-tracking 的关系:
 * - search-tracking: 追踪站内行为（搜索→点击→外跳）
 * - visit-tracking: 追踪外部来源（用户从哪里来的）
 * - 两者通过 sessionId（localStorage 中的 sess_xxx）关联
 */

import { getOrCreateDeviceId, getOrCreateVisitId } from './referral';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ConsentStatus } from '@/components/CookieConsent';
import {
  detectBrowserContext,
  getAnalyticsDiagnostics,
} from './analytics-diagnostics';
import { buildApiUrl } from './constants';

const VISIT_RECORDED_KEY = 'visit_session_recorded_id';
const VISIT_RECORD_TIMEOUT_MS = 800;
const DIAGNOSTICS_MIN_SYNC_INTERVAL_MS = 1000;
const ENGAGEMENT_HEARTBEAT_MS = 15000;
const ENGAGEMENT_MILESTONES_MS = [10000, 30000] as const;
const MIN_ENGAGEMENT_DELTA_MS = 1000;
const MAX_ACTIVE_DELTA_MS = 30000;
const MAX_TOTAL_DELTA_MS = 60000;

interface VisitData {
  sessionId: string;
  deviceId: string;
  visitId: string;
  referralCode?: string | null;
  refClickId?: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  landingPage: string;
  language: string;
  timezone: string;
  consentStatus: ConsentStatus;
  gaStatus: string;
  gaRequested?: boolean;
  gaTrackingEnabled?: boolean;
  gaScriptLoaded?: boolean;
  gaConfiguredTarget?: 'ga' | 'gtm';
  gaFirstPageviewSent?: boolean;
  gaEventCount?: number;
  gaFailedReason?: string;
  isInAppBrowser: boolean;
  browserContext: string;
}

let diagnosticsSyncTimeoutId: number | null = null;
let diagnosticsSyncInFlight = false;
let lastDiagnosticsSyncStartedAt = 0;
let inFlightVisitRecord:
  | {
      visitId: string;
      promise: Promise<boolean>;
    }
  | null = null;
let engagementTracker:
  | {
      sessionId: string;
      visitId: string;
      lastTickAt: number;
      isVisible: boolean;
      activeDurationMs: number;
      milestoneTimeoutIds: number[];
      recordedMilestones: Set<number>;
      intervalId: number;
      started: boolean;
    }
  | null = null;

function buildCampaignKey(params: URLSearchParams): string {
  return [
    params.get('utm_source') || '',
    params.get('utm_medium') || '',
    params.get('utm_campaign') || '',
    params.get('utm_term') || '',
    params.get('utm_content') || '',
  ].join('|');
}

function getCurrentVisitContext() {
  const params = new URLSearchParams(window.location.search);
  const browserContextInfo = detectBrowserContext();

  return {
    params,
    browserContextInfo,
    campaignKey: buildCampaignKey(params),
  };
}

function isVisitAlreadyRecorded(visitId: string): boolean {
  return (
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem(VISIT_RECORDED_KEY) === visitId
  );
}

async function waitForVisitRecord(
  promise: Promise<boolean>,
  timeoutMs: number,
): Promise<boolean> {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<boolean>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function recordVisitSession(
  consentStatus: ConsentStatus = 'pending',
): Promise<boolean> {
  const { params, browserContextInfo, campaignKey } = getCurrentVisitContext();
  const deviceId = getOrCreateDeviceId();
  const visitId = getOrCreateVisitId({
    campaignKey,
    browserContext: browserContextInfo.browserContext,
  });

  if (isVisitAlreadyRecorded(visitId)) return true;
  if (inFlightVisitRecord?.visitId === visitId) {
    return inFlightVisitRecord.promise;
  }

  const diagnostics = getAnalyticsDiagnostics();

  const visitData: VisitData = {
    sessionId: deviceId,
    deviceId,
    visitId,
    referralCode: params.get('referral_code'),
    refClickId: params.get('ref_click_id'),
    referrer: document.referrer || null,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
    landingPage: window.location.pathname + window.location.search,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    consentStatus,
    gaStatus: diagnostics.gaStatus,
    gaRequested: diagnostics.gaRequested,
    gaTrackingEnabled: diagnostics.gaTrackingEnabled,
    gaScriptLoaded: diagnostics.gaScriptLoaded,
    gaConfiguredTarget: diagnostics.gaConfiguredTarget,
    gaFirstPageviewSent: diagnostics.gaFirstPageviewSent,
    gaEventCount: diagnostics.gaEventCount,
    gaFailedReason: diagnostics.gaFailedReason,
    isInAppBrowser:
      diagnostics.isInAppBrowser ?? browserContextInfo.isInAppBrowser,
    browserContext:
      diagnostics.browserContext ?? browserContextInfo.browserContext,
  };

  const recordPromise = (async () => {
    try {
      const response = await fetch(buildApiUrl('/visit-sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitData),
        keepalive: true,
        signal: AbortSignal.timeout(VISIT_RECORD_TIMEOUT_MS),
      });
      if (!response.ok) return false;
      sessionStorage.setItem(VISIT_RECORDED_KEY, visitId);
      void syncVisitDiagnostics(deviceId, visitId);
      return true;
    } catch {
      return false;
    } finally {
      if (inFlightVisitRecord?.visitId === visitId) {
        inFlightVisitRecord = null;
      }
    }
  })();

  inFlightVisitRecord = { visitId, promise: recordPromise };
  return recordPromise;
}

export async function ensureVisitSessionRecorded(
  consentStatus: ConsentStatus = 'pending',
  timeoutMs = VISIT_RECORD_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { campaignKey, browserContextInfo } = getCurrentVisitContext();
  const visitId = getOrCreateVisitId({
    campaignKey,
    browserContext: browserContextInfo.browserContext,
  });

  if (isVisitAlreadyRecorded(visitId)) return true;

  const pendingRecord =
    inFlightVisitRecord?.visitId === visitId
      ? inFlightVisitRecord.promise
      : recordVisitSession(consentStatus);

  return waitForVisitRecord(pendingRecord, timeoutMs);
}

export function scheduleVisitDiagnosticsSync(delayMs = 250): void {
  if (typeof window === 'undefined') return;

  if (diagnosticsSyncTimeoutId !== null) {
    window.clearTimeout(diagnosticsSyncTimeoutId);
  }

  diagnosticsSyncTimeoutId = window.setTimeout(() => {
    diagnosticsSyncTimeoutId = null;
    void syncVisitDiagnostics();
  }, delayMs);
}

export async function syncVisitDiagnostics(
  providedSessionId?: string,
  providedVisitId?: string,
): Promise<void> {
  const now = Date.now();
  const elapsedMs = now - lastDiagnosticsSyncStartedAt;

  if (
    diagnosticsSyncInFlight ||
    (lastDiagnosticsSyncStartedAt > 0 &&
      elapsedMs < DIAGNOSTICS_MIN_SYNC_INTERVAL_MS)
  ) {
    scheduleVisitDiagnosticsSync(
      diagnosticsSyncInFlight
        ? DIAGNOSTICS_MIN_SYNC_INTERVAL_MS
        : DIAGNOSTICS_MIN_SYNC_INTERVAL_MS - elapsedMs,
    );
    return;
  }

  const { browserContextInfo, campaignKey } = getCurrentVisitContext();
  const sessionId = providedSessionId || getOrCreateDeviceId();
  const visitId =
    providedVisitId ||
    getOrCreateVisitId({
      campaignKey,
      browserContext: browserContextInfo.browserContext,
    });
  if (!sessionId) return;

  const diagnostics = getAnalyticsDiagnostics();

  diagnosticsSyncInFlight = true;
  lastDiagnosticsSyncStartedAt = now;

  try {
    await fetch(buildApiUrl('/visit-sessions/diagnostics'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        visitId,
        consentStatus: diagnostics.consentStatus,
        gaStatus: diagnostics.gaStatus,
        gaRequested: diagnostics.gaRequested,
        gaTrackingEnabled: diagnostics.gaTrackingEnabled,
        gaScriptLoaded: diagnostics.gaScriptLoaded,
        gaConfiguredTarget: diagnostics.gaConfiguredTarget,
        gaFirstPageviewSent: diagnostics.gaFirstPageviewSent,
        gaEventCount: diagnostics.gaEventCount,
        gaFailedReason: diagnostics.gaFailedReason,
        isInAppBrowser:
          diagnostics.isInAppBrowser ?? browserContextInfo.isInAppBrowser,
        browserContext:
          diagnostics.browserContext ?? browserContextInfo.browserContext,
      }),
      keepalive: true,
    });
  } catch {
    // 静默失败
  } finally {
    diagnosticsSyncInFlight = false;
  }
}

type EngagementReason =
  | 'heartbeat'
  | 'milestone'
  | 'visibility_hidden'
  | 'pagehide'
  | 'outbound';

function getCurrentEngagementIdentity(): {
  sessionId: string;
  visitId: string;
} {
  const { campaignKey, browserContextInfo } = getCurrentVisitContext();
  const sessionId = getOrCreateDeviceId();
  const visitId = getOrCreateVisitId({
    campaignKey,
    browserContext: browserContextInfo.browserContext,
  });
  return { sessionId, visitId };
}

function buildEngagementPayload(reason: EngagementReason) {
  if (!engagementTracker || typeof document === 'undefined') return null;

  const now = Date.now();
  const elapsedMs = Math.max(now - engagementTracker.lastTickAt, 0);
  engagementTracker.lastTickAt = now;

  const wasVisible = engagementTracker.isVisible;
  const activeDeltaMs =
    wasVisible || reason === 'outbound'
      ? Math.min(elapsedMs, MAX_ACTIVE_DELTA_MS)
      : 0;
  const totalDeltaMs = Math.min(elapsedMs, MAX_TOTAL_DELTA_MS);
  engagementTracker.activeDurationMs += activeDeltaMs;
  for (const milestone of ENGAGEMENT_MILESTONES_MS) {
    if (engagementTracker.activeDurationMs >= milestone) {
      engagementTracker.recordedMilestones.add(milestone);
    }
  }

  if (
    reason === 'heartbeat' &&
    activeDeltaMs < MIN_ENGAGEMENT_DELTA_MS &&
    totalDeltaMs < MIN_ENGAGEMENT_DELTA_MS
  ) {
    return null;
  }

  return {
    sessionId: engagementTracker.sessionId,
    visitId: engagementTracker.visitId,
    activeDeltaMs: Math.round(activeDeltaMs),
    totalDeltaMs: Math.round(totalDeltaMs),
    eventCount: reason === 'outbound' ? 1 : 0,
    occurredAt: new Date(now).toISOString(),
    pagePath: window.location.pathname + window.location.search,
    reason,
  };
}

function sendEngagementPayload(
  payload: ReturnType<typeof buildEngagementPayload>,
  useBeacon = false,
): void {
  if (!payload) return;

  const body = JSON.stringify(payload);

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(buildApiUrl('/visit-sessions/engagement'), blob)) {
      return;
    }
  }

  fetch(buildApiUrl('/visit-sessions/engagement'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

function clearEngagementMilestoneTimers(): void {
  if (!engagementTracker || typeof window === 'undefined') return;

  for (const timeoutId of engagementTracker.milestoneTimeoutIds) {
    window.clearTimeout(timeoutId);
  }
  engagementTracker.milestoneTimeoutIds = [];
}

function scheduleEngagementMilestones(): void {
  if (
    !engagementTracker ||
    typeof window === 'undefined' ||
    !engagementTracker.isVisible
  ) {
    return;
  }

  clearEngagementMilestoneTimers();

  for (const milestone of ENGAGEMENT_MILESTONES_MS) {
    if (
      engagementTracker.recordedMilestones.has(milestone) ||
      engagementTracker.activeDurationMs >= milestone
    ) {
      continue;
    }

    const delayMs = Math.max(
      milestone - engagementTracker.activeDurationMs,
      MIN_ENGAGEMENT_DELTA_MS,
    );
    const timeoutId = window.setTimeout(() => {
      if (!engagementTracker || !engagementTracker.isVisible) return;
      if (engagementTracker.recordedMilestones.has(milestone)) return;
      flushVisitEngagement('milestone');
      scheduleEngagementMilestones();
    }, delayMs);
    engagementTracker.milestoneTimeoutIds.push(timeoutId);
  }
}

export function flushVisitEngagement(reason: EngagementReason = 'heartbeat') {
  const payload = buildEngagementPayload(reason);
  sendEngagementPayload(payload, reason !== 'heartbeat');
}

export function startVisitEngagementTracking(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (engagementTracker?.started) return;

  const { sessionId, visitId } = getCurrentEngagementIdentity();
  engagementTracker = {
    sessionId,
    visitId,
    lastTickAt: Date.now(),
    isVisible: document.visibilityState === 'visible',
    activeDurationMs: 0,
    milestoneTimeoutIds: [],
    recordedMilestones: new Set<number>(),
    intervalId: window.setInterval(() => {
      flushVisitEngagement('heartbeat');
    }, ENGAGEMENT_HEARTBEAT_MS),
    started: true,
  };
  scheduleEngagementMilestones();

  const handleVisibilityChange = () => {
    if (!engagementTracker) return;

    if (document.visibilityState === 'hidden') {
      flushVisitEngagement('visibility_hidden');
      clearEngagementMilestoneTimers();
      if (engagementTracker) {
        engagementTracker.isVisible = false;
      }
      return;
    }

    engagementTracker.isVisible = true;
    engagementTracker.lastTickAt = Date.now();
    scheduleEngagementMilestones();
  };

  const handlePageHide = () => {
    flushVisitEngagement('pagehide');
    clearEngagementMilestoneTimers();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
}

/**
 * 用户登录后回填 userId
 * 调用位置: 登录成功的回调中
 */
export async function associateVisitWithUser(): Promise<void> {
  const sessionId = getOrCreateDeviceId();
  if (!sessionId) return;

  const { token } = useAuthStore.getState();
  if (!token) return;

  try {
    await fetch(buildApiUrl('/visit-sessions/associate'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // 静默失败
  }
}
