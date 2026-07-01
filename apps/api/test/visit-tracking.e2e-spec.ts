import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Visit Tracking (e2e)', () => {
  let app: INestApplication;
  let adminToken: string | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    try {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'admin' });
      adminToken = login.body.accessToken;
    } catch {
      console.log(
        'Admin login failed, admin traffic assertions will be skipped',
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a visit session and accepts later diagnostics updates', async () => {
    const sessionId = `sess_e2e_${Date.now()}`;
    const visitId = `visit_e2e_${Date.now()}`;
    const cookieClickId = '11111111-1111-4111-8111-111111111111';

    const createRes = await request(app.getHttpServer())
      .post('/visit-sessions')
      .set(
        'Cookie',
        `mf_ref_attrib=ref_click_id=${cookieClickId}&referral_code=ABC123&exp=9999999999999`,
      )
      .set(
        'User-Agent',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      )
      .send({
        sessionId,
        deviceId: sessionId,
        visitId,
        landingPage:
          '/en/products/test?utm_source=referral_link&utm_medium=referral',
        referrer: 'https://google.com/search?q=finds',
        utmSource: 'referral_link',
        utmMedium: 'referral',
        utmCampaign: 'referral_invite',
        language: 'en-US',
        timezone: 'Asia/Shanghai',
        consentStatus: 'pending',
        gaStatus: 'loading',
        gaTrackingEnabled: true,
        gaScriptLoaded: false,
        gaConfiguredTarget: 'ga',
        isInAppBrowser: true,
        browserContext: 'telegram_webview',
      })
      .expect(201);

    expect(createRes.body.id).toBeDefined();

    const patchRes = await request(app.getHttpServer())
      .patch('/visit-sessions/diagnostics')
      .send({
        sessionId,
        visitId,
        consentStatus: 'accepted',
        gaStatus: 'ready',
        gaTrackingEnabled: true,
        gaScriptLoaded: true,
        gaConfiguredTarget: 'ga',
        isInAppBrowser: true,
        browserContext: 'telegram_webview',
      })
      .expect(200);

    expect(patchRes.body).toEqual({ updated: true });
  });

  it('returns admin traffic diagnostics when an admin token is available', async () => {
    if (!adminToken) {
      console.log(
        'No admin token, skipping admin traffic diagnostics assertion',
      );
      return;
    }

    const startDate = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const endDate = new Date().toISOString();

    const overviewRes = await request(app.getHttpServer())
      .get('/admin/analytics/traffic/capture-diagnostics/overview')
      .query({ startDate, endDate })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(overviewRes.body).toHaveProperty('totalVisits');
    expect(overviewRes.body).toHaveProperty('overallCaptureRate');
    expect(overviewRes.body).toHaveProperty('eligibleCaptureRate');

    const lossRes = await request(app.getHttpServer())
      .get('/admin/analytics/traffic/capture-diagnostics/loss-breakdown')
      .query({ startDate, endDate })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(lossRes.body)).toBe(true);
  });
});
