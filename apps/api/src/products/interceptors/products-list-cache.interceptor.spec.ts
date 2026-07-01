import { shouldBypassProductsListCache } from './products-list-cache.interceptor';

describe('shouldBypassProductsListCache', () => {
  it('bypasses cache for search requests', () => {
    expect(shouldBypassProductsListCache({ search: 'nike' })).toBe(true);
    expect(shouldBypassProductsListCache({ q: 'jordan' })).toBe(true);
  });

  it('keeps cache for non-search product listings', () => {
    expect(shouldBypassProductsListCache({ page: '1', limit: '20' })).toBe(
      false,
    );
    expect(
      shouldBypassProductsListCache({ categories: 'shoes', sortBy: 'popular' }),
    ).toBe(false);
  });
});
