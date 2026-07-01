import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

function getRecoveringAdminStorageState() {
  return {
    state: {
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        avatar: null,
        role: 'admin',
        emailVerified: true,
      },
      isAuthenticated: true,
    },
    version: 0,
  };
}

async function seedRecoveringAdminSession(page) {
  await page.addInitScript((storageValue) => {
    localStorage.setItem('auth-storage', JSON.stringify(storageValue));
  }, getRecoveringAdminStorageState());
}

async function stubRefreshThenProtectedEndpoint(page, endpointPattern, responseBody) {
  let refreshResolved = false;
  let refreshCallCount = 0;
  let unauthorizedRequestCount = 0;
  let protectedRequestBeforeRefresh = false;
  const authHeaders = [];

  await page.route('**/api/auth/refresh', async (route) => {
    refreshCallCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 300));
    refreshResolved = true;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'recovered-admin-token',
        user: getRecoveringAdminStorageState().state.user,
      }),
    });
  });

  await page.route(endpointPattern, async (route) => {
    const authorization = route.request().headers().authorization ?? null;
    authHeaders.push(authorization);

    if (!refreshResolved) {
      protectedRequestBeforeRefresh = true;
    }

    if (authorization !== 'Bearer recovered-admin-token') {
      unauthorizedRequestCount += 1;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthorized',
          statusCode: 401,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });

  return {
    get refreshCallCount() {
      return refreshCallCount;
    },
    get unauthorizedRequestCount() {
      return unauthorizedRequestCount;
    },
    get protectedRequestBeforeRefresh() {
      return protectedRequestBeforeRefresh;
    },
    get authHeaders() {
      return authHeaders;
    },
  };
}

test('hard refresh on hot products waits for token recovery before first protected request', async ({
  page,
}) => {
  await seedRecoveringAdminSession(page);

  const requestTracker = await stubRefreshThenProtectedEndpoint(
    page,
    '**/api/admin/products/hot**',
    {
      data: [
        {
          id: 'product-1',
          title: 'Recovered Hot Product',
          slug: 'recovered-hot-product',
          mainImage: 'https://example.com/product-1.jpg',
          popularityScore: 0.82,
          viewCount: 180,
          clickCount: 90,
          salesCount: 8,
          favoriteCount: 11,
          ctr: 0.5,
          isFeatured: true,
          featuredSort: 1,
          qcPhotoCount: 0,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      summary: {
        withoutQc: 1,
        qcLessThan3: 0,
        featuredWithoutQc: 1,
        highHeatWithoutQc: 1,
      },
    },
  );

  await page.goto('/admin/products/hot');

  await expect(page.getByRole('heading', { name: '热门商品管理' })).toBeVisible();
  await expect(page.getByText('Recovered Hot Product')).toBeVisible();

  expect(requestTracker.refreshCallCount).toBe(1);
  expect(requestTracker.protectedRequestBeforeRefresh).toBe(false);
  expect(requestTracker.unauthorizedRequestCount).toBe(0);
  expect(requestTracker.authHeaders.length).toBeGreaterThan(0);
  expect(
    requestTracker.authHeaders.every(
      (authorization) => authorization === 'Bearer recovered-admin-token',
    ),
  ).toBe(true);
});

test('hard refresh on dashboard waits for token recovery before stats request', async ({
  page,
}) => {
  await seedRecoveringAdminSession(page);

  const requestTracker = await stubRefreshThenProtectedEndpoint(
    page,
    '**/api/admin/dashboard/stats',
    {
      totalProducts: 128,
      totalBrands: 32,
      totalCategories: 14,
      totalUsers: 2048,
      pendingReviews: 6,
      todayImports: 3,
      recentProducts: [
        {
          id: 'recent-1',
          title: 'Recovered Dashboard Product',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
    },
  );

  await page.goto('/admin/dashboard');

  await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible();
  await expect(page.getByText('Recovered Dashboard Product')).toBeVisible();

  expect(requestTracker.refreshCallCount).toBe(1);
  expect(requestTracker.protectedRequestBeforeRefresh).toBe(false);
  expect(requestTracker.unauthorizedRequestCount).toBe(0);
  expect(requestTracker.authHeaders.length).toBeGreaterThan(0);
  expect(
    requestTracker.authHeaders.every(
      (authorization) => authorization === 'Bearer recovered-admin-token',
    ),
  ).toBe(true);
});
