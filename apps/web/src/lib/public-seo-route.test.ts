import { isPublicSeoRoute } from './public-seo-route';

describe('isPublicSeoRoute', () => {
  it.each(['/robots.txt', '/sitemap.xml', '/sitemaps/0'])('%s bypasses locale redirects', (pathname) => {
    expect(isPublicSeoRoute(pathname)).toBe(true);
  });

  it.each(['/en', '/en/products', '/favicon.ico', '/sitemaps'])('%s keeps normal middleware handling', (pathname) => {
    expect(isPublicSeoRoute(pathname)).toBe(false);
  });
});
