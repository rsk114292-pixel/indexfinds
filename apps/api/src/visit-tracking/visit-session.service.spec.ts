import * as geoip from 'geoip-lite';
import { VisitSessionService } from './visit-session.service';

jest.mock('geoip-lite', () => ({
  lookup: jest.fn(),
}));

describe('VisitSessionService', () => {
  let service: VisitSessionService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    merge: jest.Mock;
    update: jest.Mock;
    query: jest.Mock;
  };
  let referralClickRepo: {
    count: jest.Mock;
  };
  let referralService: {
    parseAttributionCookie: jest.Mock;
  };
  let analyticsDedupService: {
    claim: jest.Mock;
  };
  let trafficDefenseService: {
    shouldBlockProductPathVisit: jest.Mock;
    createAutomaticTemporaryBlock: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      create: jest.fn((input) => input),
      save: jest.fn().mockResolvedValue({ id: 'visit-row-1' }),
      findOne: jest.fn(),
      merge: jest.fn((entity, patch) => ({ ...entity, ...patch })),
      update: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
    };
    referralClickRepo = {
      count: jest.fn().mockResolvedValue(0),
    };
    referralService = {
      parseAttributionCookie: jest.fn(),
    };
    analyticsDedupService = {
      claim: jest.fn().mockResolvedValue(true),
    };
    trafficDefenseService = {
      shouldBlockProductPathVisit: jest.fn().mockResolvedValue(false),
      createAutomaticTemporaryBlock: jest.fn().mockResolvedValue({
        id: 'auto-block-1',
      }),
    };

    (geoip.lookup as jest.Mock).mockReturnValue({
      country: 'US',
      city: 'San Francisco',
    });

    service = new VisitSessionService(
      repo as any,
      referralClickRepo as any,
      referralService as any,
      analyticsDedupService as any,
      trafficDefenseService as any,
    );
  });

  it('stores referral cookie attribution, diagnostics, and visit identity on create', async () => {
    referralService.parseAttributionCookie.mockReturnValue({
      clickId: '11111111-1111-4111-8111-111111111111',
      code: 'ABC123',
      timestamp: Date.now(),
    });

    const result = await service.create(
      {
        sessionId: 'sess_123',
        deviceId: 'sess_123',
        visitId: 'visit_123',
        refClickId: '22222222-2222-4222-8222-222222222222',
        referralCode: 'FALLBACK',
        referrer: 'https://google.com/search?q=finds',
        utmSource: 'referral_link',
        utmMedium: 'referral',
        utmCampaign: 'referral_invite',
        landingPage: '/en/products/test?utm_source=referral_link',
        language: 'en-US',
        timezone: 'Asia/Shanghai',
        consentStatus: 'accepted',
        gaStatus: 'ready',
        gaTrackingEnabled: true,
        gaRequested: true,
        gaScriptLoaded: true,
        gaConfiguredTarget: 'ga',
        gaFirstPageviewSent: true,
        gaEventCount: 3,
        gaFailedReason: undefined,
        isInAppBrowser: true,
        browserContext: 'telegram_webview',
      } as any,
      '203.0.113.9',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'ref_click_id=11111111-1111-4111-8111-111111111111&referral_code=ABC123&exp=9999999999999',
      'vid_test',
    );

    expect(referralService.parseAttributionCookie).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess_123',
        deviceId: 'vid_test',
        visitId: expect.stringMatching(/^visit_/),
        refClickId: '11111111-1111-4111-8111-111111111111',
        referralCode: 'ABC123',
        channelType: 'referral',
        consentStatus: 'accepted',
        gaStatus: 'ready',
        gaTrackingEnabled: true,
        gaRequested: true,
        gaScriptLoaded: true,
        gaConfiguredTarget: 'ga',
        gaFirstPageviewSent: true,
        gaEventCount: 3,
        gaFailedReason: null,
        isInAppBrowser: true,
        browserContext: 'telegram_webview',
        country: 'US',
        city: 'San Francisco',
      }),
    );
    expect(result).toEqual({ id: 'visit-row-1' });
  });

  it('stores Cloudflare country code ahead of local geo lookup country', async () => {
    await service.create(
      {
        sessionId: 'sess_cf',
        landingPage: '/en',
      } as any,
      '194.14.30.164',
      'Mozilla/5.0',
      undefined,
      'vid_test',
      'SE',
    );

    expect(geoip.lookup).toHaveBeenCalledWith('194.14.30.164');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '194.14.30.164',
        country: 'SE',
        city: 'San Francisco',
      }),
    );
  });

  it('falls back to dto referral fields when no attribution cookie is present', async () => {
    await service.create(
      {
        sessionId: 'sess_456',
        referralCode: 'DTO123',
        refClickId: '33333333-3333-4333-8333-333333333333',
        landingPage: '/en',
      } as any,
      '198.51.100.10',
      'Mozilla/5.0',
      undefined,
      'vid_test',
    );

    expect(referralService.parseAttributionCookie).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess_456',
        deviceId: 'vid_test',
        visitId: expect.stringMatching(/^visit_/),
        referralCode: 'DTO123',
        refClickId: '33333333-3333-4333-8333-333333333333',
      }),
    );
  });

  it('skips bot traffic without writing a visit row', async () => {
    const result = await service.create(
      {
        sessionId: 'sess_bot',
        landingPage: '/en',
      } as any,
      '127.0.0.1',
      'facebookexternalhit/1.1',
      undefined,
      'vid_test',
    );

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toEqual({ id: '' });
  });

  it('drops traffic-defense blocked product visits before writing', async () => {
    trafficDefenseService.shouldBlockProductPathVisit.mockResolvedValue(true);

    const result = await service.create(
      {
        sessionId: 'sess_blocked_defense',
        landingPage: '/en/products/test',
      } as any,
      '198.51.100.10',
      'Mozilla/5.0',
      undefined,
      'vid_test',
    );

    expect(
      trafficDefenseService.shouldBlockProductPathVisit,
    ).toHaveBeenCalledWith('198.51.100.10', '/en/products/test');
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(analyticsDedupService.claim).not.toHaveBeenCalled();
    expect(result).toEqual({ id: '' });
  });

  it('drops same-IP visit floods with too many devices before writing', async () => {
    for (let i = 0; i < 12; i++) {
      await service.create(
        {
          sessionId: `sess_${i}`,
          landingPage: '/fr/products/test',
        } as any,
        '203.0.113.50',
        'Mozilla/5.0',
        undefined,
        `vid_${i}`,
      );
    }

    const result = await service.create(
      {
        sessionId: 'sess_blocked',
        landingPage: '/fr/products/test',
      } as any,
      '203.0.113.50',
      'Mozilla/5.0',
      undefined,
      'vid_blocked',
    );

    expect(result).toEqual({ id: '' });
    expect(repo.save).toHaveBeenCalledTimes(12);
    expect(analyticsDedupService.claim).toHaveBeenCalledTimes(12);
    expect(
      trafficDefenseService.createAutomaticTemporaryBlock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        target: '203.0.113.50',
        reason: 'same_ip_visit_rotation',
        ttlHours: 1,
      }),
    );
  });

  it('drops direct product visit floods from the same IPv4 network before writing', async () => {
    for (let i = 1; i <= 24; i++) {
      await service.create(
        {
          sessionId: `sess_${i}`,
          landingPage: '/fr/products/test',
        } as any,
        `198.51.100.${i}`,
        'Mozilla/5.0',
        undefined,
        `vid_${i}`,
      );
    }

    const result = await service.create(
      {
        sessionId: 'sess_blocked',
        landingPage: '/fr/products/test',
      } as any,
      '198.51.100.200',
      'Mozilla/5.0',
      undefined,
      'vid_blocked',
    );

    expect(result).toEqual({ id: '' });
    expect(repo.save).toHaveBeenCalledTimes(24);
    expect(analyticsDedupService.claim).toHaveBeenCalledTimes(24);
    expect(
      trafficDefenseService.createAutomaticTemporaryBlock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        target: '198.51.100.0/24',
        reason: 'direct_product_network_rotation',
        ttlHours: 1,
      }),
    );
  });

  it('drops chained product from URLs before writing', async () => {
    const result = await service.create(
      {
        sessionId: 'sess_chained_from',
        landingPage:
          '/fr/products/test?from=%2Fproducts%2Fold%3Ffrom%3D%252Fproducts%252Fseed',
      } as any,
      '203.0.113.70',
      'Mozilla/5.0',
      undefined,
      'vid_chained_from',
    );

    expect(result).toEqual({ id: '' });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(analyticsDedupService.claim).not.toHaveBeenCalled();
    expect(
      trafficDefenseService.createAutomaticTemporaryBlock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        target: '203.0.113.70',
        reason: 'chained_product_from',
        ttlHours: 1,
      }),
    );
  });

  it('updates the latest visit row by visitId when diagnostics arrive later', async () => {
    repo.findOne.mockResolvedValue({
      id: 'visit-row-1',
      visitId: 'visit_123',
      sessionId: 'sess_123',
      gaStatus: 'loading',
    });
    repo.save.mockResolvedValue({
      id: 'visit-row-1',
      gaStatus: 'blocked',
      gaScriptLoaded: false,
    });

    const result = await service.updateDiagnostics(
      {
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
      } as any,
      {
        userId: undefined,
        trustedVisitorId: 'vid_test',
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
      },
    );

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { sessionId: 'sess_123', deviceId: 'vid_test' },
      order: { createdAt: 'DESC' },
    });
    expect(repo.merge).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'visit-row-1' }),
      expect.objectContaining({
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
        lastActivityAt: expect.any(Date),
      }),
    );
    expect(result).toEqual({ updated: true });
  });

  it('drops diagnostics floods before querying visit rows', async () => {
    for (let i = 0; i < 20; i++) {
      await service.updateDiagnostics(
        {
          sessionId: `sess_${i}`,
          visitId: `visit_${i}`,
          gaStatus: 'blocked',
        } as any,
        {
          trustedVisitorId: `vid_${i}`,
          ipAddress: '203.0.113.60',
          userAgent: 'Mozilla/5.0',
        },
      );
    }

    repo.findOne.mockClear();

    const result = await service.updateDiagnostics(
      {
        sessionId: 'sess_blocked',
        visitId: 'visit_blocked',
        gaStatus: 'blocked',
      } as any,
      {
        trustedVisitorId: 'vid_blocked',
        ipAddress: '203.0.113.60',
        userAgent: 'Mozilla/5.0',
      },
    );

    expect(result).toEqual({ updated: false });
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('increments engagement duration on the scoped latest visit', async () => {
    repo.findOne.mockResolvedValue({
      id: 'visit-row-1',
      visitId: 'visit_123',
      sessionId: 'sess_123',
      deviceId: 'vid_test',
    });
    repo.query.mockResolvedValue([{ id: 'visit-row-1' }]);

    const result = await service.updateEngagement(
      {
        sessionId: 'sess_123',
        visitId: 'visit_123',
        activeDeltaMs: 45000,
        totalDeltaMs: 90000,
        eventCount: 1,
        occurredAt: '2026-05-20T10:00:00.000Z',
        reason: 'outbound',
      } as any,
      {
        userId: undefined,
        trustedVisitorId: 'vid_test',
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
      },
    );

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { sessionId: 'sess_123', deviceId: 'vid_test' },
      order: { createdAt: 'DESC' },
    });
    expect(repo.query).toHaveBeenCalledWith(expect.any(String), [
      'visit-row-1',
      30000,
      60000,
      1,
      'outbound',
      new Date('2026-05-20T10:00:00.000Z'),
      new Date('2026-05-20T10:00:00.000Z'),
    ]);
    expect(repo.query.mock.calls[0][0]).toContain(
      'last_engagement_at = $6::timestamptz',
    );
    expect(repo.query.mock.calls[0][0]).toContain(
      'last_activity_at = $7::timestamptz',
    );
    expect(repo.query.mock.calls[0][0]).toContain(
      'active_duration_before_first_outbound_ms',
    );
    expect(result).toEqual({ updated: true });
  });

  it('drops engagement floods before querying visit rows', async () => {
    for (let i = 0; i < 20; i++) {
      await service.updateEngagement(
        {
          sessionId: `sess_${i}`,
          visitId: `visit_${i}`,
          activeDeltaMs: 1000,
          totalDeltaMs: 1000,
        } as any,
        {
          trustedVisitorId: `vid_${i}`,
          ipAddress: '203.0.113.61',
          userAgent: 'Mozilla/5.0',
        },
      );
    }

    repo.findOne.mockClear();

    const result = await service.updateEngagement(
      {
        sessionId: 'sess_blocked',
        visitId: 'visit_blocked',
        activeDeltaMs: 1000,
        totalDeltaMs: 1000,
      } as any,
      {
        trustedVisitorId: 'vid_blocked',
        ipAddress: '203.0.113.61',
        userAgent: 'Mozilla/5.0',
      },
    );

    expect(result).toEqual({ updated: false });
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.query).not.toHaveBeenCalled();
  });

  it('ignores empty engagement heartbeats', async () => {
    repo.findOne.mockResolvedValue({
      id: 'visit-row-1',
      visitId: 'visit_123',
      sessionId: 'sess_123',
      deviceId: 'vid_test',
    });

    const result = await service.updateEngagement(
      {
        sessionId: 'sess_123',
        visitId: 'visit_123',
        activeDeltaMs: 0,
        totalDeltaMs: 0,
        eventCount: 0,
      } as any,
      {
        userId: undefined,
        trustedVisitorId: 'vid_test',
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
      },
    );

    expect(repo.query).not.toHaveBeenCalled();
    expect(result).toEqual({ updated: false });
  });

  it('returns existing visit row when landing is duplicated inside the dedup window', async () => {
    analyticsDedupService.claim.mockResolvedValue(false);
    repo.findOne.mockResolvedValue({ id: 'visit-row-existing' });

    const result = await service.create(
      {
        sessionId: 'sess_123',
        landingPage: '/en',
      } as any,
      '203.0.113.9',
      'Mozilla/5.0',
      undefined,
      'vid_test',
    );

    expect(repo.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'visit-row-existing' });
  });

  it('fails closed when landing dedup cannot be acquired and no existing row is found', async () => {
    analyticsDedupService.claim.mockResolvedValue(false);
    repo.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        sessionId: 'sess_fail_closed',
        landingPage: '/en',
      } as any,
      '203.0.113.9',
      'Mozilla/5.0',
      undefined,
      'vid_test',
    );

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toEqual({ id: '' });
  });

  it('computes capture diagnostics rates from aggregated query results', async () => {
    repo.query.mockResolvedValue([
      {
        totalVisits: 200,
        consentAccepted: 120,
        consentRejected: 30,
        consentPending: 50,
        gaEligibleVisits: 100,
        gaRequested: 98,
        gaLoaded: 92,
        gaReady: 88,
        gaFirstPageviewSent: 84,
        gaEventCountTotal: 240,
        gaBlocked: 7,
        gaFailed: 5,
        gaDisabled: 20,
        inAppBrowserVisits: 44,
      },
    ]);

    const result = await service.getCaptureDiagnosticsOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      totalVisits: 200,
      consentAccepted: 120,
      consentRejected: 30,
      consentPending: 50,
      gaEligibleVisits: 100,
      gaRequested: 98,
      gaLoaded: 92,
      gaReady: 88,
      gaFirstPageviewSent: 84,
      gaEventCountTotal: 240,
      gaBlocked: 7,
      gaFailed: 5,
      gaDisabled: 20,
      inAppBrowserVisits: 44,
      overallCaptureRate: 42,
      eligibleCaptureRate: 84,
    });
  });

  it('uses deduped visit rollup SQL for capture diagnostics', async () => {
    repo.query.mockResolvedValue([
      {
        totalVisits: 1,
        consentAccepted: 1,
        consentRejected: 0,
        consentPending: 0,
        gaEligibleVisits: 1,
        gaRequested: 1,
        gaLoaded: 1,
        gaReady: 1,
        gaFirstPageviewSent: 1,
        gaEventCountTotal: 2,
        gaBlocked: 0,
        gaFailed: 0,
        gaDisabled: 0,
        inAppBrowserVisits: 0,
      },
    ]);

    await service.getCaptureDiagnosticsOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(repo.query.mock.calls[0][0]).toMatchInlineSnapshot(`
     "
           WITH capture_visits AS (
             SELECT
               COALESCE(vs.visit_id, vs.session_id) AS visit_key,
               BOOL_OR(vs.consent_status = 'accepted') AS consent_accepted,
               BOOL_OR(vs.consent_status = 'rejected') AS consent_rejected,
               BOOL_OR(
                 vs.consent_status IS NULL OR vs.consent_status = 'pending'
               ) AS consent_pending,
               BOOL_OR(COALESCE(vs.ga_tracking_enabled, false)) AS ga_tracking_enabled,
               BOOL_OR(vs.ga_configured_target IS NOT NULL) AS ga_configured_target,
               BOOL_OR(COALESCE(vs.ga_requested, false)) AS ga_requested,
               BOOL_OR(COALESCE(vs.ga_script_loaded, false)) AS ga_loaded,
               BOOL_OR(vs.ga_status = 'ready') AS ga_ready,
               BOOL_OR(vs.ga_status = 'loading') AS ga_loading,
               BOOL_OR(COALESCE(vs.ga_first_pageview_sent, false)) AS ga_first_pageview_sent,
               MAX(COALESCE(vs.ga_event_count, 0))::int AS ga_event_count,
               BOOL_OR(vs.ga_status = 'blocked') AS ga_blocked,
               BOOL_OR(vs.ga_status = 'failed') AS ga_failed,
               MAX(vs.ga_failed_reason) FILTER (
                 WHERE vs.ga_status = 'failed' AND vs.ga_failed_reason IS NOT NULL
               ) AS ga_failed_reason,
               BOOL_OR(vs.ga_status = 'disabled') AS ga_disabled_status,
               BOOL_OR(COALESCE(vs.is_in_app_browser, false)) AS is_in_app_browser
             FROM visit_sessions vs
             WHERE vs.created_at BETWEEN $1 AND $2
           AND vs.channel_type <> 'internal'
           AND NOT EXISTS (
             SELECT 1
             FROM users internal_user
             WHERE internal_user.id = vs.user_id
               AND internal_user.role IN ('admin', 'super_admin')
           )
             GROUP BY COALESCE(vs.visit_id, vs.session_id)
           )
           SELECT
             COUNT(*)::int AS "totalVisits",
             COUNT(*) FILTER (WHERE cv.consent_accepted)::int AS "consentAccepted",
             COUNT(*) FILTER (
               WHERE NOT cv.consent_accepted AND cv.consent_rejected
             )::int AS "consentRejected",
             COUNT(*) FILTER (
               WHERE NOT cv.consent_accepted AND NOT cv.consent_rejected
             )::int AS "consentPending",
             COUNT(*) FILTER (
               WHERE cv.consent_accepted
                 AND cv.ga_tracking_enabled
                 AND cv.ga_configured_target
             )::int AS "gaEligibleVisits",
             COUNT(*) FILTER (WHERE cv.ga_requested)::int AS "gaRequested",
             COUNT(*) FILTER (WHERE cv.ga_loaded)::int AS "gaLoaded",
             COUNT(*) FILTER (WHERE cv.ga_ready)::int AS "gaReady",
             COUNT(*) FILTER (WHERE cv.ga_first_pageview_sent)::int AS "gaFirstPageviewSent",
             COALESCE(SUM(cv.ga_event_count), 0)::int AS "gaEventCountTotal",
             COUNT(*) FILTER (WHERE cv.ga_blocked)::int AS "gaBlocked",
             COUNT(*) FILTER (WHERE cv.ga_failed)::int AS "gaFailed",
             COUNT(*) FILTER (
               WHERE cv.ga_disabled_status OR NOT cv.ga_tracking_enabled
             )::int AS "gaDisabled",
             COUNT(*) FILTER (WHERE cv.is_in_app_browser)::int AS "inAppBrowserVisits"
           FROM capture_visits cv"
    `);
  });

  it('computes loss breakdown percentages from grouped query results', async () => {
    repo.query.mockResolvedValue([
      { reason: 'captured', count: 50 },
      { reason: 'ready_but_no_pageview', count: 30 },
      { reason: 'ga_failed:script_load_timeout', count: 20 },
    ]);

    const result = await service.getCaptureLossBreakdown(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual([
      { reason: 'captured', count: 50, percentage: 50 },
      { reason: 'ready_but_no_pageview', count: 30, percentage: 30 },
      { reason: 'ga_failed:script_load_timeout', count: 20, percentage: 20 },
    ]);
  });

  it('builds reconciliation funnel counts across referral clicks and visits', async () => {
    referralClickRepo.count.mockResolvedValue(150);
    repo.query.mockResolvedValue([
      {
        landingVisits: 96,
        firstPartyVisits: 110,
        matchedReferralClicks: 96,
        gaCaptures: 88,
      },
    ]);

    const result = await service.getReconciliationOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      referralClicks: 150,
      landingVisits: 96,
      firstPartyVisits: 110,
      unmatchedFirstPartyVisits: 14,
      gaCaptures: 88,
      clickToLandingRate: 64,
      landingToFirstPartyRate: 87.27,
      gaCaptureRate: 80,
    });
  });

  it('uses distinct closed-loop SQL for reconciliation overview', async () => {
    referralClickRepo.count.mockResolvedValue(10);
    repo.query.mockResolvedValue([
      {
        landingVisits: 8,
        firstPartyVisits: 9,
        matchedReferralClicks: 7,
        gaCaptures: 4,
      },
    ]);

    await service.getReconciliationOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(repo.query.mock.calls[0][0]).toMatchInlineSnapshot(`
     "SELECT
               COUNT(DISTINCT CASE
                 WHEN rc.id IS NOT NULL THEN COALESCE(vs.visit_id, vs.session_id)
               END)::int AS "landingVisits",
               COUNT(DISTINCT COALESCE(vs.visit_id, vs.session_id))::int AS "firstPartyVisits",
               COUNT(DISTINCT CASE
                 WHEN rc.id IS NOT NULL THEN rc.id
               END)::int AS "matchedReferralClicks",
               COUNT(DISTINCT CASE
                 WHEN COALESCE(vs.ga_first_pageview_sent, false) = true
                 THEN COALESCE(vs.visit_id, vs.session_id)
               END)::int AS "gaCaptures"
             FROM visit_sessions vs
             LEFT JOIN referral_clicks rc
               ON rc.id = vs.ref_click_id
              AND rc."createdAt" BETWEEN $1 AND $2
             WHERE vs.created_at BETWEEN $1 AND $2
           AND vs.channel_type <> 'internal'
           AND NOT EXISTS (
             SELECT 1
             FROM users internal_user
             WHERE internal_user.id = vs.user_id
               AND internal_user.role IN ('admin', 'super_admin')
           )
               AND (vs.ref_click_id IS NOT NULL OR vs.referral_code IS NOT NULL)"
    `);
  });

  it('builds a dimension breakdown for referred capture diagnostics', async () => {
    repo.query.mockResolvedValue([
      {
        dimension: 'browserContext',
        value: 'telegram_webview',
        firstPartyVisits: 40,
        gaCaptures: 24,
        blockedOrFailed: 10,
        pendingConsent: 4,
        inAppBrowserVisits: 40,
      },
    ]);

    const result = await service.getCaptureDiagnosticsBreakdown(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      'browserContext',
    );

    expect(result).toEqual([
      {
        dimension: 'browserContext',
        value: 'telegram_webview',
        firstPartyVisits: 40,
        gaCaptures: 24,
        blockedOrFailed: 10,
        pendingConsent: 4,
        inAppBrowserVisits: 40,
        captureRate: 60,
      },
    ]);
  });

  it('builds attribution quality overview from distinct visit counts', async () => {
    repo.query.mockResolvedValue([
      {
        totalVisits: 80,
        attributedVisits: 58,
        utmTaggedVisits: 34,
        referrerTaggedVisits: 28,
        directVisits: 22,
        referralShareUnattributedVisits: 8,
        webviewReferrerLossVisits: 6,
        likelyAutomatedDirectVisits: 4,
        trueDirectVisits: 5,
        otherUnattributedVisits: 3,
      },
    ]);

    const result = await service.getAttributionQualityOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      totalVisits: 80,
      attributedVisits: 58,
      attributedRate: 72.5,
      utmTaggedVisits: 34,
      utmCoverageRate: 42.5,
      referrerTaggedVisits: 28,
      referrerCoverageRate: 35,
      directVisits: 22,
      directRate: 27.5,
      referralShareUnattributedVisits: 8,
      referralShareUnattributedRate: 10,
      webviewReferrerLossVisits: 6,
      webviewReferrerLossRate: 7.5,
      likelyAutomatedDirectVisits: 4,
      likelyAutomatedDirectRate: 5,
      trueDirectVisits: 5,
      trueDirectRate: 6.25,
      otherUnattributedVisits: 3,
      otherUnattributedRate: 3.75,
    });
  });

  it('builds direct breakdown shares against direct and total traffic', async () => {
    repo.query
      .mockResolvedValueOnce([
        {
          reason: 'likely_automated_direct',
          rawCount: 5,
          count: 4,
          uniqueVisitors: 4,
        },
        {
          reason: 'referral_share_unattributed',
          rawCount: 10,
          count: 8,
          uniqueVisitors: 7,
        },
        {
          reason: 'webview_referrer_loss',
          rawCount: 8,
          count: 6,
          uniqueVisitors: 5,
        },
      ])
      .mockResolvedValueOnce([{ totalVisits: 80 }]);

    const result = await service.getDirectBreakdown(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual([
      {
        reason: 'likely_automated_direct',
        rawCount: 5,
        count: 4,
        uniqueVisitors: 4,
        shareOfDirect: 22.22,
        shareOfTotal: 5,
      },
      {
        reason: 'referral_share_unattributed',
        rawCount: 10,
        count: 8,
        uniqueVisitors: 7,
        shareOfDirect: 44.44,
        shareOfTotal: 10,
      },
      {
        reason: 'webview_referrer_loss',
        rawCount: 8,
        count: 6,
        uniqueVisitors: 5,
        shareOfDirect: 33.33,
        shareOfTotal: 7.5,
      },
    ]);
    expect(repo.query.mock.calls[0][0]).toContain("ds.country IN ('SG', 'JP')");
    expect(repo.query.mock.calls[0][0]).not.toContain('browser_distribution');
    expect(repo.query.mock.calls[0][0]).not.toContain('automation_clusters');
  });

  it('builds external source quality diagnostics for a referral source', async () => {
    repo.query.mockResolvedValue([
      {
        rawCount: 55,
        visits: 44,
        uniqueVisitors: 40,
        outboundVisits: 12,
        effectiveUsers: 2,
        oneVisitDevices: 34,
        topDeviceVisits: 3,
        topIpVisits: 5,
        topBrowser: 'chrome',
        topBrowserVisits: 22,
        distinctIpAddresses: 30,
        distinctBrowsers: 12,
        avgProductViewsPerVisitor: 1.875,
        landingPages: [
          { landingPage: '/en/products/demo', visits: 20 },
          { landingPage: '/en/search', visits: 10 },
        ],
      },
    ]);

    const result = await service.getSourceQualityDiagnostics(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      'LoloBuySpreadsheets.com',
    );

    expect(result).toEqual({
      source: 'lolobuyspreadsheets.com',
      rawCount: 55,
      visits: 44,
      uniqueVisitors: 40,
      repeatVisitRate: 20,
      outboundVisits: 12,
      outboundRate: 27.27,
      effectiveUsers: 2,
      effectiveUserRate: 4.55,
      avgProductViewsPerVisitor: 1.88,
      oneVisitDeviceRate: 85,
      concentration: {
        distinctDevices: 40,
        distinctIpAddresses: 30,
        distinctBrowsers: 12,
        topDeviceShare: 6.82,
        topIpShare: 11.36,
        topBrowser: 'chrome',
        topBrowserShare: 50,
      },
      landingPages: [
        { landingPage: '/en/products/demo', visits: 20, share: 45.45 },
        { landingPage: '/en/search', visits: 10, share: 22.73 },
      ],
    });
    expect(repo.query.mock.calls[0][0]).toContain('product_interaction_events');
    expect(repo.query.mock.calls[0][0]).not.toContain('MAX(user_id)');
    expect(repo.query.mock.calls[0][0]).toContain('ARRAY_AGG(user_id)');
    expect(repo.query.mock.calls[0][0]).not.toContain(
      'COUNT(DISTINCT device_key)',
    );
    expect(repo.query.mock.calls[0][0]).toContain(
      'COUNT(DISTINCT sv.device_key)',
    );
    expect(repo.query.mock.calls[0][1][2]).toBe('lolobuyspreadsheets.com');
  });

  it('includes effective user metrics in source breakdown', async () => {
    repo.query.mockResolvedValue([
      {
        source: 'telegram',
        rawCount: 50,
        count: 40,
        uniqueVisitors: 32,
        outboundClicks: 12,
        effectiveUsers: 4,
      },
    ]);

    const result = await service.getBySource(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      20,
    );

    expect(result).toEqual([
      {
        source: 'telegram',
        rawCount: 50,
        count: 40,
        uniqueVisitors: 32,
        suspiciousVisits: 10,
        suspiciousRate: 20,
        outboundVisits: 12,
        outboundClicks: 12,
        outboundRate: 30,
        effectiveUsers: 4,
        effectiveUserRate: 10,
        measuredVisits: 0,
        avgActiveDurationMs: 0,
        shortStayRate: 0,
        engaged10sRate: 0,
        engaged30sRate: 0,
        avgActiveBeforeOutboundMs: 0,
      },
    ]);
    expect(repo.query.mock.calls[0][0]).toContain(
      "internal_user.role IN ('admin', 'super_admin')",
    );
    expect(repo.query.mock.calls[0][0]).not.toContain('ip_address NOT IN');
    expect(repo.query.mock.calls[0][0]).not.toContain('blacklist');
  });

  it('excludes logged-in admin visits from engagement duration rollups', async () => {
    repo.query.mockResolvedValue([
      {
        totalVisits: 10,
        measuredVisits: 8,
        avgActiveDurationMs: 12000,
        medianActiveDurationMs: 9000,
        shortStayVisits: 1,
        engaged10sVisits: 4,
        engaged30sVisits: 2,
        avgActiveBeforeOutboundMs: 7000,
      },
    ]);

    const result = await service.getEngagementOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      totalVisits: 10,
      measuredVisits: 8,
      measurementCoverageRate: 80,
      avgActiveDurationMs: 12000,
      medianActiveDurationMs: 9000,
      shortStayVisits: 1,
      shortStayRate: 12.5,
      engaged10sVisits: 4,
      engaged10sRate: 50,
      engaged30sVisits: 2,
      engaged30sRate: 25,
      avgActiveBeforeOutboundMs: 7000,
    });
    expect(repo.query.mock.calls[0][0]).toContain(
      "internal_user.role IN ('admin', 'super_admin')",
    );
    expect(repo.query.mock.calls[0][0]).not.toContain('ip_address NOT IN');
  });

  it('computes behavior diagnostics from direct aggregate counts', async () => {
    repo.query.mockResolvedValue([
      {
        visits: 3441,
        registrations: 30,
        verifiedUsers: 24,
        productViewReadyUsers: 18,
        actionReadyUsers: 20,
        effectiveUsers: 15,
      },
    ]);

    const result = await service.getBehaviorFunnelOverview(
      new Date('2026-04-06T16:00:00.000Z'),
      new Date('2026-04-07T15:59:59.999Z'),
    );

    expect(result).toEqual({
      visits: 3441,
      registrations: 30,
      verifiedUsers: 24,
      productViewReadyUsers: 18,
      actionReadyUsers: 20,
      effectiveUsers: 15,
      visitToRegistrationRate: 0.87,
      registrationToVerificationRate: 80,
      verificationToProductViewRate: 75,
      productViewToEffectiveRate: 83.33,
      visitToEffectiveRate: 0.44,
      blockers: {
        anonymousOrUnregisteredVisits: 3411,
        unverifiedUsers: 6,
        insufficientProductViews: 6,
        missingAction: 3,
      },
    });
  });

  it('includes effective user metrics in campaign breakdown', async () => {
    repo.query.mockResolvedValue([
      {
        campaign: 'referral_invite',
        source: 'telegram',
        medium: 'social',
        rawCount: 50,
        count: 40,
        uniqueVisitors: 32,
        outboundClicks: 12,
        effectiveUsers: 4,
      },
    ]);

    const result = await service.getByCampaign(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual([
      {
        campaign: 'referral_invite',
        source: 'telegram',
        medium: 'social',
        rawCount: 50,
        count: 40,
        uniqueVisitors: 32,
        suspiciousVisits: 10,
        suspiciousRate: 20,
        outboundVisits: 12,
        outboundClicks: 12,
        outboundRate: 30,
        effectiveUsers: 4,
        effectiveUserRate: 10,
      },
    ]);
  });

  it('includes effective user metrics in landing page breakdown', async () => {
    repo.query.mockResolvedValue([
      {
        landingPage: '/en/products/test',
        rawCount: 50,
        count: 40,
        uniqueVisitors: 32,
        outboundClicks: 12,
        effectiveUsers: 4,
      },
    ]);

    const result = await service.getByLandingPage(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      20,
    );

    expect(result).toEqual([
      {
        landingPage: '/en/products/test',
        rawCount: 50,
        count: 40,
        uniqueVisitors: 32,
        suspiciousVisits: 10,
        suspiciousRate: 20,
        outboundVisits: 12,
        outboundClicks: 12,
        outboundRate: 30,
        effectiveUsers: 4,
        effectiveUserRate: 10,
      },
    ]);
  });

  it('counts overview effective users directly from the behavior-qualified users', async () => {
    repo.query.mockResolvedValue([
      {
        visits: 160,
        effectiveUsers: 96,
      },
    ]);

    const result = await (service as any).getEffectiveUserSummary(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      effectiveUsers: 96,
      effectiveUserRate: 60,
    });
    expect(repo.query).toHaveBeenCalledWith(
      expect.stringContaining(
        '(SELECT COUNT(*)::int FROM effective_users) AS "effectiveUsers"',
      ),
      expect.any(Array),
    );
    expect(repo.query.mock.calls[0][0]).not.toContain(
      'COUNT(DISTINCT CASE WHEN eu.user_id IS NOT NULL THEN vs.user_id END)',
    );
  });

  it('counts activated users without restricting them to new registrations', async () => {
    repo.query.mockResolvedValue([
      {
        visits: 160,
        activatedUsers: 120,
      },
    ]);

    const result = await (service as any).getActivatedUserSummary(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      activatedUsers: 120,
      activatedUserRate: 75,
    });
    expect(repo.query).toHaveBeenCalledWith(
      expect.stringContaining(
        '(SELECT COUNT(*)::int FROM activated_users) AS "activatedUsers"',
      ),
      expect.any(Array),
    );
    expect(repo.query.mock.calls[0][0]).toContain('u.email_verified_at <= $2');
    expect(repo.query.mock.calls[0][0]).not.toContain(
      'WHERE u."createdAt" BETWEEN $1 AND $2',
    );
  });

  it('counts high-intent visitors from anonymous and logged-in visitor behavior', async () => {
    repo.query.mockResolvedValue([
      {
        visits: 200,
        highIntentVisitors: 60,
      },
    ]);

    const result = await (service as any).getHighIntentVisitorSummary(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      highIntentVisitors: 60,
      highIntentVisitorRate: 30,
    });
    expect(repo.query).toHaveBeenCalledWith(
      expect.stringContaining(
        '(SELECT COUNT(*)::int FROM high_intent_visitors) AS "highIntentVisitors"',
      ),
      expect.any(Array),
    );
    expect(repo.query.mock.calls[0][0]).toContain('product_interaction_events');
    expect(repo.query.mock.calls[0][0]).toContain('user_favorites');
    expect(repo.query.mock.calls[0][0]).toContain('outbound_clicks');
    expect(repo.query.mock.calls[0][0]).toContain(
      "internal_user.role IN ('admin', 'super_admin')",
    );
  });

  it('builds behavior funnel overview across registration and activation stages', async () => {
    repo.query.mockResolvedValue([
      {
        visits: 80,
        registrations: 10,
        verifiedUsers: 8,
        productViewReadyUsers: 5,
        actionReadyUsers: 6,
        effectiveUsers: 4,
      },
    ]);

    const result = await service.getBehaviorFunnelOverview(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
    );

    expect(result).toEqual({
      visits: 80,
      registrations: 10,
      verifiedUsers: 8,
      productViewReadyUsers: 5,
      actionReadyUsers: 6,
      effectiveUsers: 4,
      visitToRegistrationRate: 12.5,
      registrationToVerificationRate: 80,
      verificationToProductViewRate: 62.5,
      productViewToEffectiveRate: 80,
      visitToEffectiveRate: 5,
      blockers: {
        anonymousOrUnregisteredVisits: 70,
        unverifiedUsers: 2,
        insufficientProductViews: 3,
        missingAction: 1,
      },
    });
    expect(repo.query).toHaveBeenCalledWith(
      expect.stringContaining(
        '(SELECT COUNT(*)::int FROM effective_users) AS "effectiveUsers"',
      ),
      expect.any(Array),
    );
    expect(repo.query.mock.calls[0][0]).not.toContain(
      'COUNT(DISTINCT CASE WHEN eu.user_id IS NOT NULL THEN vs.user_id END)',
    );
    expect(repo.query.mock.calls[0][0]).toContain(
      "u.role NOT IN ('admin', 'super_admin')",
    );
    expect(repo.query.mock.calls[0][0]).toContain(
      "internal_user.role IN ('admin', 'super_admin')",
    );
  });

  it('builds behavior funnel source breakdown with stage rates', async () => {
    repo.query.mockResolvedValue([
      {
        source: 'telegram',
        visits: 40,
        registrations: 8,
        verifiedUsers: 6,
        productViewReadyUsers: 4,
        actionReadyUsers: 5,
        effectiveUsers: 3,
      },
    ]);

    const result = await service.getBehaviorFunnelBySource(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      20,
    );

    expect(result).toEqual([
      {
        source: 'telegram',
        visits: 40,
        registrations: 8,
        verifiedUsers: 6,
        productViewReadyUsers: 4,
        actionReadyUsers: 5,
        effectiveUsers: 3,
        visitToRegistrationRate: 20,
        registrationToEffectiveRate: 37.5,
        visitToEffectiveRate: 7.5,
      },
    ]);
  });

  it('builds behavior funnel campaign breakdown with stage rates', async () => {
    repo.query.mockResolvedValue([
      {
        dimension: 'campaign',
        value: 'referral_invite',
        visits: 40,
        registrations: 8,
        verifiedUsers: 6,
        productViewReadyUsers: 4,
        actionReadyUsers: 5,
        effectiveUsers: 3,
      },
    ]);

    const result = await service.getBehaviorFunnelByCampaign(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      20,
    );

    expect(result).toEqual([
      {
        dimension: 'campaign',
        value: 'referral_invite',
        visits: 40,
        registrations: 8,
        verifiedUsers: 6,
        productViewReadyUsers: 4,
        actionReadyUsers: 5,
        effectiveUsers: 3,
        visitToRegistrationRate: 20,
        registrationToEffectiveRate: 37.5,
        visitToEffectiveRate: 7.5,
      },
    ]);
  });

  it('builds behavior funnel landing page breakdown with stage rates', async () => {
    repo.query.mockResolvedValue([
      {
        dimension: 'landingPage',
        value: '/en/products/test',
        visits: 40,
        registrations: 8,
        verifiedUsers: 6,
        productViewReadyUsers: 4,
        actionReadyUsers: 5,
        effectiveUsers: 3,
      },
    ]);

    const result = await service.getBehaviorFunnelByLandingPage(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      20,
    );

    expect(result).toEqual([
      {
        dimension: 'landingPage',
        value: '/en/products/test',
        visits: 40,
        registrations: 8,
        verifiedUsers: 6,
        productViewReadyUsers: 4,
        actionReadyUsers: 5,
        effectiveUsers: 3,
        visitToRegistrationRate: 20,
        registrationToEffectiveRate: 37.5,
        visitToEffectiveRate: 7.5,
      },
    ]);
  });

  it('builds source samples with blocker labels', async () => {
    repo.query.mockResolvedValue([
      {
        userId: 'user-1',
        email: 'a@example.com',
        latestVisitAt: '2026-03-20T12:00:00.000Z',
        landingPage: '/en/products/test',
        campaign: 'referral_invite',
        emailVerified: true,
        productViews: 2,
        actionReady: false,
        effectiveUser: false,
      },
      {
        userId: 'user-2',
        email: 'b@example.com',
        latestVisitAt: '2026-03-21T12:00:00.000Z',
        landingPage: '/en/products/test-2',
        campaign: null,
        emailVerified: true,
        productViews: 4,
        actionReady: true,
        effectiveUser: true,
      },
    ]);

    const result = await service.getBehaviorFunnelSamplesBySource(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      'telegram',
      20,
    );

    expect(result).toEqual([
      {
        userId: 'user-1',
        email: 'a@example.com',
        latestVisitAt: '2026-03-20T12:00:00.000Z',
        landingPage: '/en/products/test',
        campaign: 'referral_invite',
        registered: true,
        emailVerified: true,
        productViews: 2,
        actionReady: false,
        effectiveUser: false,
        blocker: 'insufficient_product_views',
      },
      {
        userId: 'user-2',
        email: 'b@example.com',
        latestVisitAt: '2026-03-21T12:00:00.000Z',
        landingPage: '/en/products/test-2',
        campaign: null,
        registered: true,
        emailVerified: true,
        productViews: 4,
        actionReady: true,
        effectiveUser: true,
        blocker: 'effective',
      },
    ]);
  });

  it('builds campaign samples with blocker labels', async () => {
    repo.query.mockResolvedValue([
      {
        userId: 'user-3',
        email: 'c@example.com',
        latestVisitAt: '2026-03-22T12:00:00.000Z',
        landingPage: '/en/products/campaign',
        campaign: 'referral_invite',
        emailVerified: false,
        productViews: 1,
        actionReady: false,
        effectiveUser: false,
      },
    ]);

    const result = await service.getBehaviorFunnelSamplesByCampaign(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      'referral_invite',
      20,
    );

    expect(result).toEqual([
      {
        userId: 'user-3',
        email: 'c@example.com',
        latestVisitAt: '2026-03-22T12:00:00.000Z',
        landingPage: '/en/products/campaign',
        campaign: 'referral_invite',
        registered: true,
        emailVerified: false,
        productViews: 1,
        actionReady: false,
        effectiveUser: false,
        blocker: 'unverified',
      },
    ]);
  });

  it('builds landing page samples with blocker labels', async () => {
    repo.query.mockResolvedValue([
      {
        userId: 'user-4',
        email: 'd@example.com',
        latestVisitAt: '2026-03-23T12:00:00.000Z',
        landingPage: '/en/products/test',
        campaign: null,
        emailVerified: true,
        productViews: 4,
        actionReady: false,
        effectiveUser: false,
      },
    ]);

    const result = await service.getBehaviorFunnelSamplesByLandingPage(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-31T23:59:59.999Z'),
      '/en/products/test',
      20,
    );

    expect(result).toEqual([
      {
        userId: 'user-4',
        email: 'd@example.com',
        latestVisitAt: '2026-03-23T12:00:00.000Z',
        landingPage: '/en/products/test',
        campaign: null,
        registered: true,
        emailVerified: true,
        productViews: 4,
        actionReady: false,
        effectiveUser: false,
        blocker: 'missing_action',
      },
    ]);
  });
});
