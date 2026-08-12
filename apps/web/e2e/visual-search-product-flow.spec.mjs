import { test, expect } from '@playwright/test';

test('navigates from product entry to mobile visual-search results shell', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route(
    /\/visual-search\/by-product\/e2e-product\?limit=50&minSimilarity=25/,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sourceProduct: {
            id: 'e2e-product',
            title: 'Fixture Adidas Slides',
            slug: 'fixture-adidas-slides',
            mainImage: 'https://example.com/source.jpg',
          },
          total: 2,
          results: [
            {
              similarity: 96,
              product: {
                id: 'similar-1',
                title: 'Adidas Similar Slipper',
                slug: 'adidas-similar-slipper',
                mainImage: 'https://example.com/similar-1.jpg',
                images: ['https://example.com/similar-1.jpg'],
                priceMin: 22.91,
                priceMax: 22.91,
                currency: 'USD',
                brand: { id: 'brand-adidas', name: 'Adidas', slug: 'adidas' },
              },
            },
            {
              similarity: 88,
              product: {
                id: 'similar-2',
                title: 'Nike Similar Slide',
                slug: 'nike-similar-slide',
                mainImage: 'https://example.com/similar-2.jpg',
                images: ['https://example.com/similar-2.jpg'],
                priceMin: 18.5,
                priceMax: 31,
                currency: 'USD',
                brand: { id: 'brand-nike', name: 'Nike', slug: 'nike' },
              },
            },
          ],
        }),
      });
    },
  );

  await page.goto('/en/e2e/visual-search-product-flow');

  const findSimilarButton = page.getByTestId('find-similar-button');
  await expect(findSimilarButton).toBeEnabled();
  await Promise.all([
    page.waitForURL(/\/en\/search\/visual\?productId=e2e-product/, {
      timeout: 30_000,
    }),
    findSimilarButton.click(),
  ]);
  await expect(page.getByTestId('visual-search-source-panel')).toContainText(
    'Fixture Adidas Slides',
  );
  await expect(page.getByTestId('mobile-visual-search-sort-bar')).toBeVisible();
  await expect(page.getByTestId('mobile-visual-search-filter-button')).toBeVisible();
  await expect(page.getByTestId('mobile-visual-search-grid')).toContainText(
    'Adidas Similar Slipper',
  );
  await expect(page.getByTestId('mobile-visual-search-grid')).toContainText(
    'Nike Similar Slide',
  );
});
