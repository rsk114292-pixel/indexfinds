'use client';

import { useEffect } from 'react';
import { useCookieConsent } from './CookieConsent';
import { updateAnalyticsDiagnostics } from '@/lib/analytics-diagnostics';
import {
  recordVisitSession,
  startVisitEngagementTracking,
  syncVisitDiagnostics,
} from '@/lib/visit-tracking';

export function VisitTracker() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateAnalyticsDiagnostics({ consentStatus: consent });
    void syncVisitDiagnostics();
    void recordVisitSession(consent).finally(() => {
      startVisitEngagementTracking();
    });
  }, [consent]);

  return null;
}
