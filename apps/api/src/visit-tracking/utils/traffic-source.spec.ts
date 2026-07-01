import {
  getDomainKind,
  isInternalDomain,
  isOwnedReferralDomain,
} from './traffic-source';

describe('traffic-source', () => {
  const originalOwnedDomains = process.env.TRAFFIC_OWNED_DOMAINS;

  afterEach(() => {
    if (originalOwnedDomains === undefined) {
      delete process.env.TRAFFIC_OWNED_DOMAINS;
    } else {
      process.env.TRAFFIC_OWNED_DOMAINS = originalOwnedDomains;
    }
  });

  it('marks lolobuyspreadsheets.com as internal traffic', () => {
    expect(getDomainKind('lolobuyspreadsheets.com')).toBe('internal');
    expect(getDomainKind('www.lolobuyspreadsheets.com')).toBe('internal');
    expect(isInternalDomain('shop.lolobuyspreadsheets.com')).toBe(true);
  });

  it('treats unrelated domains as external traffic by default', () => {
    expect(getDomainKind('example-referrer.com')).toBe('external');
    expect(isOwnedReferralDomain('www.example-referrer.com')).toBe(false);
  });

  it('marks configured owned domains as owned referral traffic', () => {
    process.env.TRAFFIC_OWNED_DOMAINS = 'owned-example.com';

    expect(getDomainKind('owned-example.com')).toBe('owned');
    expect(isOwnedReferralDomain('www.owned-example.com')).toBe(true);
  });

  it('leaves other domains as external traffic', () => {
    expect(getDomainKind('google.com')).toBe('external');
    expect(getDomainKind('kakobuy.net')).toBe('external');
  });
});
