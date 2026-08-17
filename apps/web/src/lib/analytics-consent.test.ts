import {
  canUseAnalyticsTracking,
  hasAnalyticsConsent,
} from './analytics-consent';

describe('analytics consent', () => {
  beforeEach(() => {
    document.cookie = 'cookie_consent=; path=/; max-age=0';
  });

  it('only treats an explicit acceptance as consent', () => {
    expect(hasAnalyticsConsent('accepted')).toBe(true);
    expect(hasAnalyticsConsent('rejected')).toBe(false);
    expect(hasAnalyticsConsent('pending')).toBe(false);
    expect(hasAnalyticsConsent(undefined)).toBe(false);
  });

  it('reads the browser consent cookie without creating identifiers', () => {
    expect(canUseAnalyticsTracking()).toBe(false);
    document.cookie = 'cookie_consent=accepted; path=/';
    expect(canUseAnalyticsTracking()).toBe(true);
  });
});
