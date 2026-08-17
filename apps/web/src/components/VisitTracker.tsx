'use client';

import { useEffect } from 'react';
import { useCookieConsent } from './CookieConsent';
import { updateAnalyticsDiagnostics } from '@/lib/analytics-diagnostics';
import {
  recordVisitSession,
  startVisitEngagementTracking,
  stopVisitEngagementTracking,
  syncVisitDiagnostics,
} from '@/lib/visit-tracking';
import { clearAnalyticsTrackingIdentifiers } from '@/lib/referral';

export function VisitTracker() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateAnalyticsDiagnostics({ consentStatus: consent });
    if (consent !== 'accepted') {
      stopVisitEngagementTracking();
      if (consent === 'rejected') {
        clearAnalyticsTrackingIdentifiers();
      }
      return;
    }

    void syncVisitDiagnostics();
    void recordVisitSession(consent).finally(() => {
      startVisitEngagementTracking();
    });
  }, [consent]);

  return null;
}
