import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

test('renders first-party traffic diagnostics in admin traffic dashboard', async ({
  page,
}) => {
  await page.addInitScript(() => {
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
          token: 'e2e-admin-token',
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
  });

  const trafficResponses = new Map([
    [
      '**/api/admin/analytics/traffic/overview**',
      {
        total: 120,
        totalChange: 20,
        uniqueSessions: 80,
        uniqueSessionsChange: 15,
        uniqueVisitors: 65,
        uniqueVisitorsChange: 10,
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
      '**/api/admin/analytics/traffic/by-channel**',
      [{ channel: 'referral', count: 80, percentage: 66.67 }],
    ],
    [
      '**/api/admin/analytics/traffic/by-source**',
      [{ source: 'telegram', count: 40, outboundClicks: 12, conversionRate: 30 }],
    ],
    [
      '**/api/admin/analytics/traffic/by-campaign**',
      [
        {
          campaign: 'referral_invite',
          source: 'telegram',
          medium: 'social',
          count: 40,
          outboundClicks: 12,
          conversionRate: 30,
        },
      ],
    ],
    [
      '**/api/admin/analytics/traffic/by-landing-page**',
      [
        {
          landingPage: '/en/products/test',
          count: 40,
          outboundClicks: 12,
          conversionRate: 30,
        },
      ],
    ],
    ['**/api/admin/analytics/traffic/trends**', [{ period: '2026-03-29', count: 20 }]],
    ['**/api/admin/analytics/traffic/geo**', [{ country: 'US', count: 30, percentage: 25 }]],
    ['**/api/admin/analytics/traffic/devices**', [{ deviceType: 'mobile', count: 70, percentage: 58.33 }]],
    [
      '**/api/admin/analytics/traffic/capture-diagnostics/overview**',
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
      '**/api/admin/analytics/traffic/reconciliation/overview**',
      {
        referralClicks: 150,
        landingVisits: 120,
        firstPartyVisits: 110,
        gaCaptures: 88,
        clickToLandingRate: 80,
        landingToFirstPartyRate: 91.67,
        gaCaptureRate: 80,
      },
    ],
    [
      '**/api/admin/analytics/traffic/capture-diagnostics/breakdown**',
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
      '**/api/admin/analytics/traffic/capture-diagnostics/loss-breakdown**',
      [
        { reason: 'captured', count: 60, percentage: 50 },
        { reason: 'consent_pending', count: 20, percentage: 16.67 },
        { reason: 'ready_but_no_pageview', count: 12, percentage: 10 },
        { reason: 'ga_failed:script_load_timeout', count: 8, percentage: 6.67 },
      ],
    ],
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
  await expect(page.getByText('本页展示的是首方流量数据')).toBeVisible();
  await expect(page.getByText('运营解读')).toBeVisible();
  await expect(page.getByText(/35 次内置浏览器访问/)).toBeVisible();
  await expect(page.getByRole('button', { name: '查看指标口径' })).toBeVisible();
  await expect(page.getByText('推荐短链点击')).toBeVisible();
  await expect(page.getByText('150')).toBeVisible();
  await expect(page.getByText('整体 GA 捕获率')).toBeVisible();
  await expect(page.locator('.ant-statistic-content-value', { hasText: '50%' }).first()).toBeVisible();
  await expect(page.getByText('可追踪捕获率')).toBeVisible();
  await expect(page.locator('.ant-statistic-content-value', { hasText: '75%' }).first()).toBeVisible();
  await expect(page.getByText('首次页面浏览已发出')).toBeVisible();
  await expect(page.getByText('GA4 捕获 / 丢失原因', { exact: true })).toBeVisible();
  await expect(page.getByText('推荐流量捕获分布', { exact: true })).toBeVisible();
  await expect(page.locator('td', { hasText: 'Telegram' }).first()).toBeVisible();
  await expect(page.getByText('已捕获')).toBeVisible();
  await expect(page.getByText('未同意 / 尚未选择统计同意')).toBeVisible();
  await expect(page.getByText('GA 已就绪但未观察到首次页面浏览')).toBeVisible();
  await expect(page.getByText('GA 初始化失败: 脚本加载超时')).toBeVisible();
});
