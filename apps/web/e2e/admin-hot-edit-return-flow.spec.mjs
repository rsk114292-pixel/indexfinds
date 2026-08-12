import { test, expect } from '@playwright/test';
import {
  E2E_ADMIN_TOKEN,
  apiRoutePattern,
  stubAdminRefresh,
} from './api-route.mjs';

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

test('navigates from hot products to edit page and back to hot page', async ({
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

  await page.route(apiRoutePattern('/admin/products/hot(?:\\?.*)?'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'product-1',
            title: 'Louis Vuitton Archlight Sneaker',
            slug: 'louis-vuitton-archlight-sneaker',
            mainImage: 'https://example.com/product-1.jpg',
            popularityScore: 0.72,
            viewCount: 120,
            clickCount: 60,
            salesCount: 5,
            favoriteCount: 8,
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
      }),
    });
  });

  await page.route(apiRoutePattern('/products/product-1'), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'product-1',
        title: 'Louis Vuitton Archlight Sneaker',
        slug: 'louis-vuitton-archlight-sneaker',
        description: 'Fixture description',
        images: ['https://example.com/product-1.jpg'],
        qcMedia: [],
        priceMin: 100,
        priceMax: 120,
        status: 'active',
        brand: { id: 'brand-1', name: 'Louis Vuitton' },
        primaryCategory: { id: 'cat-1', name: 'Sneakers' },
        aiAttributes: {},
        weidianShopName: 'Fixture Shop',
        weidianShopId: 'shop-1',
        weidianItemId: 'wd-1',
        splitSourceWeidianId: null,
        sourceUrl: 'https://example.com/item',
      }),
    });
  });

  await page.route(apiRoutePattern('/categories(?:\\?.*)?'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(apiRoutePattern('/brands(?:\\?.*)?'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto('/admin/products/hot');

  await expect(
    page.getByRole('heading', { name: '热门商品管理' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /编辑/ }).first()).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/admin\/products\/product-1\?from=hot$/, {
      timeout: 20_000,
    }),
    page.getByRole('button', { name: /编辑/ }).first().click(),
  ]);
  await expect(page.getByRole('heading', { name: '编辑产品' })).toBeVisible();
  await expect(page.getByRole('link', { name: '热门管理' })).toBeVisible();

  await page.getByRole('button', { name: /返回/ }).click();

  await expect(page).toHaveURL(/\/admin\/products\/hot$/);
  await expect(
    page.getByRole('heading', { name: '热门商品管理' }),
  ).toBeVisible();
});
