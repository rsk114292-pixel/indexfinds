import {
  flushQueuedGA4Events,
  resetGA4EventQueue,
  setGA4Ready,
  trackGA4Event,
} from './ga-events';
import { getAnalyticsDiagnostics } from './analytics-diagnostics';

describe('ga-events queue', () => {
  beforeEach(() => {
    resetGA4EventQueue();
    sessionStorage.clear();
    window.gtag = undefined;
  });

  it('queues events while analytics is loading and flushes them when ready', () => {
    sessionStorage.setItem(
      'analytics_diagnostics_v1',
      JSON.stringify({
        consentStatus: 'accepted',
        gaStatus: 'loading',
        gaTrackingEnabled: true,
      }),
    );

    trackGA4Event('select_item', { item_id: 'abc' });

    window.gtag = jest.fn();
    setGA4Ready(true);
    flushQueuedGA4Events();

    expect(window.gtag).toHaveBeenCalledWith('event', 'select_item', {
      item_id: 'abc',
    });
    expect(getAnalyticsDiagnostics()).toEqual(
      expect.objectContaining({
        gaEventCount: 1,
        gaFirstPageviewSent: false,
      }),
    );
  });

  it('drops events before consent is accepted', () => {
    sessionStorage.setItem(
      'analytics_diagnostics_v1',
      JSON.stringify({
        consentStatus: 'pending',
        gaStatus: 'waiting_for_consent',
      }),
    );

    trackGA4Event('select_item', { item_id: 'abc' });

    window.gtag = jest.fn();
    setGA4Ready(true);
    flushQueuedGA4Events();

    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('marks page_view as the first observed GA pageview', () => {
    sessionStorage.setItem(
      'analytics_diagnostics_v1',
      JSON.stringify({
        consentStatus: 'accepted',
        gaStatus: 'ready',
        gaTrackingEnabled: true,
        gaConfiguredTarget: 'ga',
      }),
    );

    window.gtag = jest.fn();
    trackGA4Event('page_view', { page_path: '/en/products/test' });

    expect(getAnalyticsDiagnostics()).toEqual(
      expect.objectContaining({
        gaEventCount: 1,
        gaFirstPageviewSent: true,
      }),
    );
  });
});
