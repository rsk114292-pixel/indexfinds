import { buildLocaleSwitchHref } from './locale-switch';

describe('buildLocaleSwitchHref', () => {
  it('preserves query string when switching locale', () => {
    const href = buildLocaleSwitchHref(
      '/search',
      new URLSearchParams('q=nike&page=2&sortBy=popular'),
    );

    expect(href).toBe('/search?q=nike&page=2&sortBy=popular');
  });

  it('preserves hash fragment when present', () => {
    const href = buildLocaleSwitchHref(
      '/products',
      new URLSearchParams('brands=nike'),
      '#filters',
    );

    expect(href).toBe('/products?brands=nike#filters');
  });

  it('handles routes without query params', () => {
    const href = buildLocaleSwitchHref('/account', null, '');

    expect(href).toBe('/account');
  });
});
