import { buildAnalyticsRequestContext } from './analytics-request';

describe('buildAnalyticsRequestContext', () => {
  it('reads visit id from request headers when present', () => {
    const request = {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '203.0.113.9',
        'x-visit-id': 'visit_123',
      },
      cookies: {
        mf_vid: 'vid_test',
      },
      ip: '127.0.0.1',
    } as any;

    expect(buildAnalyticsRequestContext(request)).toEqual({
      userId: undefined,
      trustedVisitorId: 'vid_test',
      visitId: 'visit_123',
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('prefers Cloudflare visitor headers over proxy chain headers', () => {
    const request = {
      headers: {
        'cf-connecting-ip': '194.14.30.164',
        'cf-ipcountry': 'se',
        'x-forwarded-for': '172.69.235.147, 10.0.0.1',
        'user-agent': 'Mozilla/5.0',
      },
      cookies: {
        mf_vid: 'vid_test',
      },
      ip: '172.69.235.147',
    } as any;

    expect(buildAnalyticsRequestContext(request)).toEqual({
      userId: undefined,
      trustedVisitorId: 'vid_test',
      visitId: undefined,
      ipAddress: '194.14.30.164',
      countryCode: 'SE',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('ignores unknown Cloudflare country placeholders', () => {
    const request = {
      headers: {
        'cf-connecting-ip': '132.184.129.175',
        'cf-ipcountry': 'XX',
        'user-agent': 'Mozilla/5.0',
      },
      cookies: {
        mf_vid: 'vid_test',
      },
      ip: '104.23.237.11',
    } as any;

    expect(buildAnalyticsRequestContext(request)).toEqual({
      userId: undefined,
      trustedVisitorId: 'vid_test',
      visitId: undefined,
      ipAddress: '132.184.129.175',
      userAgent: 'Mozilla/5.0',
    });
  });
});
