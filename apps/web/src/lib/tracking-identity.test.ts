import {
  getClientTrackingHeaders,
  getCurrentTrackingIdentity,
} from './tracking-identity';
import { getOrCreateDeviceId, getOrCreateVisitId } from './referral';

jest.mock('./referral', () => ({
  getOrCreateDeviceId: jest.fn(() => 'device-1'),
  getOrCreateVisitId: jest.fn(() => 'visit-1'),
}));

jest.mock('./analytics-diagnostics', () => ({
  detectBrowserContext: jest.fn(() => ({ browserContext: 'standard_browser' })),
}));

describe('tracking identity consent gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = 'cookie_consent=; path=/; max-age=0';
  });

  it('does not create identifiers or headers before consent', () => {
    expect(getCurrentTrackingIdentity()).toEqual({ deviceId: '', visitId: '' });
    expect(getClientTrackingHeaders()).toEqual({});
    expect(getOrCreateDeviceId).not.toHaveBeenCalled();
    expect(getOrCreateVisitId).not.toHaveBeenCalled();
  });

  it('creates tracking identity after explicit consent', () => {
    document.cookie = 'cookie_consent=accepted; path=/';
    expect(getCurrentTrackingIdentity()).toEqual({
      deviceId: 'device-1',
      visitId: 'visit-1',
    });
    expect(getClientTrackingHeaders()).toEqual({ 'x-visit-id': 'visit-1' });
  });
});
