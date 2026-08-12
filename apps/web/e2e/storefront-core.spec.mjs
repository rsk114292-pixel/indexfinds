import { test, expect } from '@playwright/test';

const PRODUCT_SLUG = 'adidas-ultraboost-running-shoes-black-white';
const PRODUCT_TITLE = 'Adidas Ultraboost Running Shoes Black White';

async function silenceOptionalTracking(page) {
  await page.route('**/visit-sessions**', (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route('**/referral/track-view', (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route('**/products/*/view', (route) =>
    route.fulfill({ status: 204 }),
  );
}

test.describe('storefront core journeys', () => {
  test('critical public routes render without server errors', async ({ page }) => {
    test.setTimeout(90_000);

    for (const route of [
      '/en',
      '/en/products',
      '/en/brands',
      '/en/agents',
      '/en/agents/compare',
      '/en/help',
    ]) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `${route} should return a document response`).not.toBeNull();
      expect(response.status(), `${route} should not return a server error`).toBeLessThan(500);
      await expect(page.locator('main').first()).toBeVisible();
    }
  });

  test.describe('desktop', () => {
    test.use({
      viewport: { width: 1440, height: 1000 },
      isMobile: false,
      hasTouch: false,
    });

    test('searches, opens a product, changes agent, and opens sharing', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await silenceOptionalTracking(page);
      await page.goto('/en');

      const heroSearch = page.locator('.hero-command-bar');
      await expect(heroSearch).toBeVisible();
      const search = heroSearch.getByRole('combobox');
      await expect(search).toHaveAttribute(
        'placeholder',
        'Search products, brands or categories...',
      );
      const searchButton = heroSearch.getByRole('button', {
        name: 'Search',
        exact: true,
      });
      await expect(async () => {
        await search.fill('');
        await search.fill('Adidas');
        await expect(search).toHaveValue('Adidas');
        await expect(searchButton).toBeEnabled({ timeout: 1_000 });
      }).toPass({ timeout: 20_000 });
      await searchButton.click();
      await expect(page).toHaveURL(/\/en\/search\?q=Adidas/, {
        timeout: 20_000,
      });
      const productCard = page.locator(`article:has(a[href*="/products/${PRODUCT_SLUG}"])`);
      await expect(productCard).toContainText(PRODUCT_TITLE);
      await productCard.getByRole('link', { name: 'View details', exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`/en/products/${PRODUCT_SLUG}`), {
        timeout: 20_000,
      });
      await expect(page.getByRole('heading', { name: PRODUCT_TITLE })).toBeVisible({
        timeout: 20_000,
      });

      const agentSelector = page.getByRole('button', { name: /select platform/i }).first();
      await agentSelector.click();
      const agentPopoverId = await agentSelector.getAttribute('aria-controls');
      expect(agentPopoverId).toBeTruthy();
      const agentPopover = page.locator(`[id="${agentPopoverId}"]`);
      await expect(agentPopover).toContainText(/Choose.*buying agent/);
      await agentPopover.getByRole('button', { name: /Kakobuy/i }).click();

      await page.getByRole('button', { name: 'Share', exact: true }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText(/Share|Copy link/i);
    });
  });

  test('mobile home keeps one primary search and can open image search', async ({
    page,
  }) => {
    await page.goto('/en');

    const primarySearch = page.locator('input[role="combobox"]:visible');
    await expect(primarySearch).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Find Chinese products',
    );

    const imageSearch = page.getByRole('button', {
      name: /image search|search by image/i,
    });
    await imageSearch.click();
    const dialog = page.getByRole('dialog', { name: 'Visual Search' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Click or drag an image here');
  });
});
