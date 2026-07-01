import { VisitSessionController } from './visit-session.controller';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

describe('VisitSessionController', () => {
  let controller: VisitSessionController;
  let visitSessionService: {
    create: jest.Mock;
    updateDiagnostics: jest.Mock;
    updateEngagement: jest.Mock;
    associateUser: jest.Mock;
  };

  beforeEach(() => {
    visitSessionService = {
      create: jest.fn().mockResolvedValue({ id: 'visit-row-1' }),
      updateDiagnostics: jest.fn().mockResolvedValue({ updated: true }),
      updateEngagement: jest.fn().mockResolvedValue({ updated: true }),
      associateUser: jest.fn().mockResolvedValue(undefined),
    };

    controller = new VisitSessionController(visitSessionService as any);
  });

  it('passes client headers and referral cookie to create', async () => {
    const dto = {
      sessionId: 'sess_123',
      deviceId: 'sess_123',
      visitId: 'visit_123',
      landingPage: '/en/products/test?utm_source=referral_link',
      consentStatus: 'accepted',
      gaStatus: 'ready',
    };

    const request = {
      headers: {
        'x-forwarded-for': '203.0.113.9, 10.0.0.1',
        'user-agent': 'Mozilla/5.0',
      },
      ip: '127.0.0.1',
      cookies: {
        mf_vid: 'vid_test',
        mf_ref_attrib:
          'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
      },
    } as any;

    const result = await controller.create(dto as any, request);

    expect(visitSessionService.create).toHaveBeenCalledWith(
      dto,
      '203.0.113.9',
      'Mozilla/5.0',
      'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
      'vid_test',
      undefined,
    );
    expect(result).toEqual({ id: 'visit-row-1' });
  });

  it('passes Cloudflare visitor IP and country to create', async () => {
    const dto = {
      sessionId: 'sess_cf',
      landingPage: '/en',
    };

    await controller.create(
      dto as any,
      {
        headers: {
          'cf-connecting-ip': '194.14.30.164',
          'cf-ipcountry': 'SE',
          'x-forwarded-for': '172.69.235.147, 10.0.0.1',
          'user-agent': 'Mozilla/5.0',
        },
        ip: '172.69.235.147',
        cookies: { mf_vid: 'vid_test' },
      } as any,
    );

    expect(visitSessionService.create).toHaveBeenCalledWith(
      dto,
      '194.14.30.164',
      'Mozilla/5.0',
      undefined,
      'vid_test',
      'SE',
    );
  });

  it('falls back to req.ip when x-forwarded-for is missing', async () => {
    await controller.create(
      {
        sessionId: 'sess_123',
        landingPage: '/en',
      } as any,
      {
        headers: {},
        ip: '198.51.100.10',
        cookies: { mf_vid: 'vid_test' },
      } as any,
    );

    expect(visitSessionService.create).toHaveBeenCalledWith(
      expect.any(Object),
      '198.51.100.10',
      '',
      undefined,
      'vid_test',
      undefined,
    );
  });

  it('forwards diagnostics payload to the service', async () => {
    const dto = {
      sessionId: 'sess_123',
      visitId: 'visit_123',
      consentStatus: 'accepted',
      gaStatus: 'blocked',
      gaTrackingEnabled: true,
      gaRequested: true,
      gaScriptLoaded: false,
      gaConfiguredTarget: 'ga',
      gaFirstPageviewSent: false,
      gaEventCount: 1,
      gaFailedReason: 'script_load_timeout',
      isInAppBrowser: true,
      browserContext: 'telegram_webview',
    };

    const result = await controller.updateDiagnostics(
      dto as any,
      {
        headers: {},
        ip: '198.51.100.10',
        cookies: { mf_vid: 'vid_test' },
      } as any,
    );

    expect(visitSessionService.updateDiagnostics).toHaveBeenCalledWith(dto, {
      userId: undefined,
      trustedVisitorId: 'vid_test',
      visitId: undefined,
      ipAddress: '198.51.100.10',
      userAgent: '',
    });
    expect(result).toEqual({ updated: true });
  });

  it('forwards engagement PATCH payload with analytics request context', async () => {
    const dto = {
      sessionId: 'sess_123',
      visitId: 'visit_123',
      activeDeltaMs: 10000,
      totalDeltaMs: 10000,
      eventCount: 0,
      occurredAt: '2026-05-21T10:00:00.000Z',
      pagePath: '/en/products/test',
      reason: 'milestone',
    };

    const result = await controller.updateEngagement(
      dto as any,
      {
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'Mozilla/5.0',
        },
        cookies: { mf_vid: 'vid_test' },
      } as any,
    );

    expect(visitSessionService.updateEngagement).toHaveBeenCalledWith(dto, {
      userId: undefined,
      trustedVisitorId: 'vid_test',
      visitId: undefined,
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0',
    });
    expect(result).toEqual({ updated: true });
  });

  it('forwards engagement POST beacon payload to the same service path', async () => {
    const dto = {
      sessionId: 'sess_123',
      visitId: 'visit_123',
      activeDeltaMs: 30000,
      totalDeltaMs: 30000,
      eventCount: 0,
      reason: 'pagehide',
    };

    const result = await controller.updateEngagementBeacon(
      dto as any,
      {
        headers: {},
        ip: '198.51.100.12',
        cookies: { mf_vid: 'vid_test' },
      } as any,
    );

    expect(visitSessionService.updateEngagement).toHaveBeenCalledWith(dto, {
      userId: undefined,
      trustedVisitorId: 'vid_test',
      visitId: undefined,
      ipAddress: '198.51.100.12',
      userAgent: '',
    });
    expect(result).toEqual({ updated: true });
  });

  it('associates the visit when an authenticated user id exists', async () => {
    await controller.associateUser({ sessionId: 'sess_123' }, {
      user: { id: 'user-1' },
    } as any);

    expect(visitSessionService.associateUser).toHaveBeenCalledWith(
      'sess_123',
      'user-1',
    );
  });

  it('skips association when the request has no authenticated user id', async () => {
    await controller.associateUser({ sessionId: 'sess_123' }, {
      user: undefined,
    } as any);

    expect(visitSessionService.associateUser).not.toHaveBeenCalled();
  });

  it('only marks the public endpoints as public metadata', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, VisitSessionController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        VisitSessionController.prototype.create,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        VisitSessionController.prototype.updateDiagnostics,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        VisitSessionController.prototype.updateEngagement,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        VisitSessionController.prototype.updateEngagementBeacon,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        VisitSessionController.prototype.associateUser,
      ),
    ).toBeUndefined();
  });
});
