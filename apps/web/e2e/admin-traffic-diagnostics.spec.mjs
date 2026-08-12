import { test, expect } from '@playwright/test';
import {
  E2E_ADMIN_TOKEN,
  stubAdminRefresh,
} from './api-route.mjs';

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

test('renders first-party traffic diagnostics in admin traffic dashboard', async ({
  page,
}) => {
  await page.addInitScript((adminToken) => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            username: 'admin',
            avatar: null,
            role: 'admin',
            emailVerified: true,
          },
          token: adminToken,
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
  }, E2E_ADMIN_TOKEN);

  await stubAdminRefresh(page);

  const trafficResponses = new Map([
    [
      '**/admin/analytics/traffic/overview**',
      {
        total: 120,
        totalChange: 20,
        uniqueSessions: 80,
        uniqueSessionsChange: 15,
        uniqueVisitors: 65,
        uniqueVisitorsChange: 10,
        totalOutboundVisits: 12,
        totalOutboundVisitsChange: 5,
        outboundVisitRate: 15,
        highIntentVisitors: 18,
        highIntentVisitorsChange: 12,
        highIntentVisitorRate: 22.5,
        activatedUsers: 12,
        activatedUsersChange: 9,
        activatedUserRate: 15,
        effectiveNewUsers: 4,
        effectiveNewUsersChange: 20,
        effectiveNewUserRate: 5,
        effectiveUsers: 4,
        effectiveUsersChange: 20,
        effectiveUserRate: 5,
        suspiciousVisitRecords: 3,
        suspiciousVisitRate: 2.5,
        topChannel: 'referral',
        topSource: 'telegram',
        period: {
          current: {
            start: new Date(Date.now() - 7 * 86400000).toISOString(),
            end: new Date().toISOString(),
          },
          previous: {
            start: new Date(Date.now() - 14 * 86400000).toISOString(),
            end: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        },
      },
    ],
    [
      '**/admin/analytics/traffic/engagement/overview**',
      {
        totalVisits: 120,
        measuredVisits: 80,
        measurementCoverageRate: 66.67,
        avgActiveDurationMs: 18000,
        medianActiveDurationMs: 12000,
        shortStayVisits: 10,
        shortStayRate: 12.5,
        engaged10sVisits: 52,
        engaged10sRate: 65,
        engaged30sVisits: 24,
        engaged30sRate: 30,
        avgActiveBeforeOutboundMs: 15000,
      },
    ],
    [
      '**/admin/analytics/traffic/by-channel**',
      [{ channel: 'referral', count: 80, percentage: 66.67 }],
    ],
    [
      '**/admin/analytics/traffic/by-source**',
      [{ source: 'telegram', rawCount: 50, count: 40, uniqueVisitors: 32, suspiciousVisits: 3, suspiciousRate: 7.5, outboundVisits: 12, outboundClicks: 12, outboundRate: 30, effectiveUsers: 4, effectiveUserRate: 10, measuredVisits: 30, avgActiveDurationMs: 18000, shortStayRate: 12.5, engaged10sRate: 65, engaged30sRate: 30, avgActiveBeforeOutboundMs: 15000 }],
    ],
    [
      '**/admin/analytics/traffic/by-campaign**',
      [
        {
          campaign: 'referral_invite',
          source: 'telegram',
          medium: 'social',
          rawCount: 50,
          count: 40,
          uniqueVisitors: 32,
          suspiciousVisits: 3,
          suspiciousRate: 7.5,
          outboundVisits: 12,
          outboundClicks: 12,
          outboundRate: 30,
          effectiveUsers: 4,
          effectiveUserRate: 10,
        },
      ],
    ],
    [
      '**/admin/analytics/traffic/by-landing-page**',
      [
        {
          landingPage: '/en/products/test',
          rawCount: 50,
          count: 40,
          uniqueVisitors: 32,
          suspiciousVisits: 3,
          suspiciousRate: 7.5,
          outboundVisits: 12,
          outboundClicks: 12,
          outboundRate: 30,
          effectiveUsers: 4,
          effectiveUserRate: 10,
        },
      ],
    ],
    ['**/admin/analytics/traffic/trends**', [{ period: '2026-03-29', count: 20 }]],
    ['**/admin/analytics/traffic/geo**', [{ country: 'US', count: 30, percentage: 25 }]],
    ['**/admin/analytics/traffic/devices**', [{ deviceType: 'mobile', count: 70, percentage: 58.33 }]],
    [
      '**/admin/analytics/traffic/capture-diagnostics/overview**',
      {
        totalVisits: 120,
        consentAccepted: 90,
        consentRejected: 10,
        consentPending: 20,
        gaEligibleVisits: 80,
        gaRequested: 78,
        gaLoaded: 72,
        gaReady: 64,
        gaFirstPageviewSent: 60,
        gaEventCountTotal: 120,
        gaBlocked: 8,
        gaFailed: 4,
        gaDisabled: 14,
        inAppBrowserVisits: 35,
        overallCaptureRate: 50,
        eligibleCaptureRate: 75,
      },
    ],
    [
      '**/admin/analytics/traffic/reconciliation/overview**',
      {
        referralClicks: 150,
        landingVisits: 120,
        firstPartyVisits: 110,
        unmatchedFirstPartyVisits: 0,
        gaCaptures: 88,
        clickToLandingRate: 80,
        landingToFirstPartyRate: 91.67,
        gaCaptureRate: 80,
      },
    ],
    [
      '**/admin/analytics/traffic/capture-diagnostics/breakdown**',
      [
        {
          dimension: 'source',
          value: 'telegram',
          firstPartyVisits: 40,
          gaCaptures: 28,
          blockedOrFailed: 8,
          pendingConsent: 4,
          inAppBrowserVisits: 20,
          captureRate: 70,
        },
        {
          dimension: 'source',
          value: 'wechat',
          firstPartyVisits: 20,
          gaCaptures: 8,
          blockedOrFailed: 6,
          pendingConsent: 3,
          inAppBrowserVisits: 20,
          captureRate: 40,
        },
      ],
    ],
    [
      '**/admin/analytics/traffic/capture-diagnostics/loss-breakdown**',
      [
        { reason: 'captured', count: 60, percentage: 50 },
        { reason: 'consent_pending', count: 20, percentage: 16.67 },
        { reason: 'ready_but_no_pageview', count: 12, percentage: 10 },
        { reason: 'ga_failed:script_load_timeout', count: 8, percentage: 6.67 },
      ],
    ],
    ['**/admin/analytics/traffic/attribution-quality/overview**', null],
    ['**/admin/analytics/traffic/attribution-quality/direct-breakdown**', []],
    ['**/admin/analytics/traffic/attribution-quality/source-diagnostics**', null],
    ['**/admin/analytics/traffic/behavior-funnel/overview**', null],
  ]);

  for (const [pattern, body] of trafficResponses.entries()) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }

  await page.goto('/admin/analytics/traffic');

  await expect(page.getByRole('heading', { name: '流量来源分析' })).toBeVisible();
  await expect(page.getByText('先看经营结果，再看原因')).toBeVisible();
  await expect(
    page.getByText(/默认排除内部 channel 与已登录 admin \/ super_admin/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '查看指标口径' })).toBeVisible();
  await expect(page.getByText('全部去重访问')).toBeVisible();
  await expect(page.locator('td', { hasText: 'Telegram' }).first()).toBeVisible();

  await page.getByRole('button', { name: '采集对账' }).click();
  await expect(page.getByText('采集速览')).toBeVisible();
  await expect(page.getByText(/35 次访问来自内置浏览器/)).toBeVisible();
  await expect(page.getByText('推荐短链点击')).toBeVisible();
  await expect(page.getByText('150')).toBeVisible();
});
