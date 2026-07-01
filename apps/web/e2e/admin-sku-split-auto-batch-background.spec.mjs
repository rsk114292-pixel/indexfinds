import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
});

function seedAdminSession(page) {
  return page.addInitScript(() => {
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
}

test('auto batch keeps progressing after leaving the batch page', async ({
  page,
}) => {
  await seedAdminSession(page);

  let listCallCount = 0;
  const submittedPayloads = [];

  await page.route('**/api/products/sku-split/prefetch', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        itemId: '7712370033',
        variantCount: 2,
        cached: false,
      }),
    });
  });

  await page.route('**/api/products/sku-split/preview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        weidianItemId: '7712370033',
        weidianTitle: 'LV Trainer Fixture',
        splitDimension: '颜色',
        totalVariants: 2,
        variants: [
          {
            attrId: 101,
            value: '黑色',
            imageUrl:
              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            price: 199,
            skuCount: 5,
            sizes: ['40', '41'],
          },
          {
            attrId: 102,
            value: '白色',
            imageUrl:
              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
            price: 199,
            skuCount: 5,
            sizes: ['40', '41'],
          },
        ],
      }),
    });
  });

  await page.route('**/api/products/sku-split/batch/auto', async (route) => {
    submittedPayloads.push(route.request().postDataJSON());
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        batchId: 'auto-batch-1',
        totalUrls: 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/products/sku-split?page=*', async (route) => {
    listCallCount += 1;
    const status = listCallCount >= 2 ? 'completed' : 'processing';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            type: 'batch',
            entryId: 'auto-batch-1',
            batchKind: 'auto_batch',
            progressUnit: 'urls',
            jobCount: 2,
            totalVariants: 2,
            successCount: status === 'completed' ? 2 : 0,
            failedCount: 0,
            duplicateCount: 0,
            skippedCount: 0,
            cancelledCount: 0,
            processedCount: status === 'completed' ? 2 : 0,
            actionableFailureCount: 0,
            publishDecisionStats: { active: 0, pendingReview: 0 },
            failureReasonStats: [],
            status,
            createdAt: new Date().toISOString(),
            completedAt:
              status === 'completed' ? new Date().toISOString() : undefined,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      }),
    });
  });

  await page.route('**/api/admin/products/hot**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        summary: {
          withoutQc: 0,
          qcLessThan3: 0,
          featuredWithoutQc: 0,
          highHeatWithoutQc: 0,
        },
      }),
    });
  });

  await page.goto('/admin/products/sku-split/batch');

  await page.locator('textarea').fill(
    '7712370033\n7715377988',
  );
  await page.getByRole('button', { name: /开始分析/ }).click();

  await expect(page.getByRole('button', { name: '全部自动' })).toBeVisible();

  await page.getByRole('button', { name: '全部自动' }).click();

  await expect(page).toHaveURL(/\/admin\/products\/sku-split$/);
  await expect(page.getByText('后台自动')).toBeVisible();

  expect(submittedPayloads).toHaveLength(1);
  expect(submittedPayloads[0]).toEqual({
    weidianUrls: ['7712370033', '7715377988'],
  });

  await page.goto('/admin/products/hot');
  await expect(
    page.getByRole('heading', { name: '热门商品管理' }),
  ).toBeVisible();

  await page.goto('/admin/products/sku-split');
  await expect(page.getByText('已完成').first()).toBeVisible();
});
