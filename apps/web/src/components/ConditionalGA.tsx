'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { useCookieConsent } from './CookieConsent';
import {
  isValidTrackingId,
  normalizeTrackingId,
  type TrackingConfig,
} from '@/lib/tracking-config';
import {
  recordAnalyticsConfig,
  updateAnalyticsDiagnostics,
} from '@/lib/analytics-diagnostics';
import {
  scheduleVisitDiagnosticsSync,
  syncVisitDiagnostics,
} from '@/lib/visit-tracking';
import {
  flushQueuedGA4Events,
  resetGA4EventQueue,
  setGA4Ready,
} from '@/lib/ga-events';
import { buildApiUrl } from '@/lib/constants';

interface ConditionalGAProps {
  initialConfig: TrackingConfig | null;
}

type TrackingConfigFetchState = 'idle' | 'loading' | 'failed';

const GTAG_WRAPPED_FLAG = '__findsAnalyticsWrapped';
const DATALAYER_WRAPPED_FLAG = '__findsDataLayerWrapped';

type WrappedGtag = ((...args: unknown[]) => unknown) & {
  [GTAG_WRAPPED_FLAG]?: boolean;
};

type WrappedDataLayerPush = ((...entries: unknown[]) => number) & {
  [DATALAYER_WRAPPED_FLAG]?: boolean;
};

function wrapAnalyticsGlobals() {
  if (typeof window === 'undefined') return;

  const gtag = window.gtag as WrappedGtag | undefined;

  if (typeof gtag === 'function' && !gtag[GTAG_WRAPPED_FLAG]) {
    const wrapped = ((...args: unknown[]) => {
      if (args[0] === 'config') {
        recordAnalyticsConfig();
        scheduleVisitDiagnosticsSync();
      }

      return gtag(...args);
    }) as typeof gtag;

    wrapped[GTAG_WRAPPED_FLAG] = true;
    window.gtag = wrapped;
  }

  const dataLayer = window.dataLayer;
  const push = dataLayer?.push as WrappedDataLayerPush | undefined;

  if (!dataLayer || typeof push !== 'function' || push[DATALAYER_WRAPPED_FLAG]) {
    return;
  }

  const wrappedPush = ((...entries: unknown[]) => {
    entries.forEach((entry) => {
      if (
        entry &&
        typeof entry === 'object' &&
        'event' in entry &&
        entry.event === 'page_view'
      ) {
        recordAnalyticsConfig();
        scheduleVisitDiagnosticsSync();
      }
    });

    return push.apply(dataLayer, entries);
  }) as typeof push;

  wrappedPush[DATALAYER_WRAPPED_FLAG] = true;
  dataLayer.push = wrappedPush;
}

export default function ConditionalGA({ initialConfig }: ConditionalGAProps) {
  const { consent } = useCookieConsent();
  const [fallbackConfig, setFallbackConfig] = useState<TrackingConfig | null>(
    null,
  );
  const [fallbackConfigState, setFallbackConfigState] =
    useState<TrackingConfigFetchState>('idle');
  const fallbackFetchAttemptedRef = useRef(false);
  const fallbackFetchInFlightRef = useRef(false);
  const config = initialConfig ?? fallbackConfig;

  useEffect(() => {
    if (initialConfig) {
      setFallbackConfig(null);
      setFallbackConfigState('idle');
      fallbackFetchAttemptedRef.current = false;
      fallbackFetchInFlightRef.current = false;
    }
  }, [initialConfig]);

  useEffect(() => {
    if (consent !== 'accepted') {
      setFallbackConfig(null);
      setFallbackConfigState('idle');
      fallbackFetchAttemptedRef.current = false;
      fallbackFetchInFlightRef.current = false;
      return;
    }

    if (
      initialConfig ||
      fallbackConfig ||
      fallbackFetchAttemptedRef.current ||
      fallbackFetchInFlightRef.current
    ) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    fallbackFetchInFlightRef.current = true;
    setFallbackConfigState('loading');

    void fetch(buildApiUrl('/settings/tracking'), {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Tracking config request failed: ${response.status}`);
        }

        const data = (await response.json()) as TrackingConfig | null;
        if (
          !data ||
          typeof data.gaId !== 'string' ||
          typeof data.gtmId !== 'string' ||
          typeof data.enabled !== 'boolean'
        ) {
          throw new Error('Tracking config payload is invalid');
        }

        if (cancelled) return;
        fallbackFetchAttemptedRef.current = true;
        fallbackFetchInFlightRef.current = false;
        setFallbackConfig(data);
        setFallbackConfigState('idle');
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        fallbackFetchAttemptedRef.current = true;
        fallbackFetchInFlightRef.current = false;
        setFallbackConfigState('failed');
      });

    return () => {
      cancelled = true;
      fallbackFetchInFlightRef.current = false;
      controller.abort();
    };
  }, [consent, fallbackConfig, initialConfig]);

  useEffect(() => {
    if (consent !== 'accepted') {
      setGA4Ready(false);
      resetGA4EventQueue();
      updateAnalyticsDiagnostics({
        consentStatus: consent,
        gaRequested: false,
        gaTrackingEnabled: consent === 'rejected' ? false : undefined,
        gaScriptLoaded: consent === 'rejected' ? false : undefined,
        gaConfiguredTarget: undefined,
        gaFirstPageviewSent: false,
        gaEventCount: 0,
        gaFailedReason:
          consent === 'rejected' ? 'consent_rejected' : undefined,
        gaStatus:
          consent === 'rejected' ? 'disabled' : 'waiting_for_consent',
      });
      void syncVisitDiagnostics();
      return;
    }

    if (!config) {
      setGA4Ready(false);
      resetGA4EventQueue();

      if (fallbackConfigState === 'loading') {
        updateAnalyticsDiagnostics({
          consentStatus: consent,
          gaRequested: false,
          gaTrackingEnabled: undefined,
          gaScriptLoaded: undefined,
          gaConfiguredTarget: undefined,
          gaFirstPageviewSent: false,
          gaEventCount: 0,
          gaFailedReason: undefined,
          gaStatus: 'unknown',
        });
        void syncVisitDiagnostics();
        return;
      }

      updateAnalyticsDiagnostics({
        consentStatus: consent,
        gaRequested: false,
        gaTrackingEnabled: false,
        gaScriptLoaded: false,
        gaConfiguredTarget: undefined,
        gaFirstPageviewSent: false,
        gaEventCount: 0,
        gaFailedReason: 'missing_tracking_config',
        gaStatus: 'failed',
      });
      void syncVisitDiagnostics();
      return;
    }

    const gtmId = normalizeTrackingId(config.gtmId);
    const gaId = normalizeTrackingId(config.gaId);
    const gaConfiguredTarget = isValidTrackingId('gtm', gtmId)
      ? 'gtm'
      : isValidTrackingId('ga', gaId)
        ? 'ga'
        : undefined;
    const gaStatus = !config.enabled
      ? 'disabled'
      : gaConfiguredTarget
        ? 'loading'
        : 'failed';

    setGA4Ready(false);
    if (gaStatus !== 'loading') {
      resetGA4EventQueue();
    }

    updateAnalyticsDiagnostics({
      consentStatus: consent,
      gaRequested: gaStatus === 'loading',
      gaTrackingEnabled: config.enabled,
      gaConfiguredTarget,
      gaScriptLoaded: gaStatus === 'loading' ? false : undefined,
      gaFirstPageviewSent: false,
      gaEventCount: 0,
      gaFailedReason:
        gaStatus === 'disabled'
          ? 'tracking_disabled'
          : gaStatus === 'failed'
            ? 'invalid_tracking_id'
            : undefined,
      gaStatus,
    });
    void syncVisitDiagnostics();
  }, [config, consent, fallbackConfigState]);

  useEffect(() => {
    if (consent !== 'accepted' || !config?.enabled) return;

    const gtmId = normalizeTrackingId(config.gtmId);
    const gaId = normalizeTrackingId(config.gaId);
    const usingGtm = isValidTrackingId('gtm', gtmId);
    const usingGa = !usingGtm && isValidTrackingId('ga', gaId);

    if (!usingGtm && !usingGa) return;

    wrapAnalyticsGlobals();

    let attempts = 0;
    const maxAttempts = 50;

    const intervalId = window.setInterval(() => {
      wrapAnalyticsGlobals();

      const scriptLoaded = usingGtm
        ? Boolean(window.google_tag_manager || window.dataLayer)
        : typeof window.gtag === 'function';

      if (scriptLoaded) {
        setGA4Ready(true);
        updateAnalyticsDiagnostics({
          gaRequested: true,
          gaScriptLoaded: true,
          gaFailedReason: undefined,
          gaStatus: 'ready',
        });
        if (usingGa) {
          recordAnalyticsConfig();
        }
        flushQueuedGA4Events();
        scheduleVisitDiagnosticsSync();
        window.clearInterval(intervalId);
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        setGA4Ready(false);
        resetGA4EventQueue();
        updateAnalyticsDiagnostics({
          gaRequested: true,
          gaScriptLoaded: false,
          gaFailedReason: 'script_load_timeout',
          gaStatus: 'blocked',
        });
        scheduleVisitDiagnosticsSync();
        window.clearInterval(intervalId);
      }
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [config, consent]);

  if (consent !== 'accepted' || !config?.enabled) {
    return null;
  }

  const gtmId = normalizeTrackingId(config.gtmId);
  const gaId = normalizeTrackingId(config.gaId);

  // GTM 优先：如果配置了 GTM，GA4 应在 GTM 内部管理
  if (isValidTrackingId('gtm', gtmId)) {
    return <GoogleTagManager gtmId={gtmId} />;
  }

  // Fallback：直接使用 GA4
  if (isValidTrackingId('ga', gaId)) {
    return <GoogleAnalytics gaId={gaId} />;
  }

  return null;
}
