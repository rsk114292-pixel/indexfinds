import { detectBrowserContext } from '@/lib/analytics-diagnostics';
import { getOrCreateDeviceId, getOrCreateVisitId } from '@/lib/referral';

function buildCampaignKey(params: URLSearchParams): string {
  return [
    params.get('utm_source') || '',
    params.get('utm_medium') || '',
    params.get('utm_campaign') || '',
    params.get('utm_term') || '',
    params.get('utm_content') || '',
  ].join('|');
}

export function getCurrentTrackingIdentity(): {
  deviceId: string;
  visitId: string;
} {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const browserContext = detectBrowserContext().browserContext;
  const deviceId = getOrCreateDeviceId();
  const visitId = getOrCreateVisitId({
    campaignKey: buildCampaignKey(params),
    browserContext,
  });

  return { deviceId, visitId };
}

export function getClientTrackingHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const { visitId } = getCurrentTrackingIdentity();
  return { 'x-visit-id': visitId };
}
