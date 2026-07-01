import {
  buildReturnTo,
  resolveSafeReturnTo,
  withReturnTo,
} from './return-to';

describe('return-to helpers', () => {
  it('buildReturnTo preserves pathname and query', () => {
    const searchParams = new URLSearchParams('sortBy=newest&page=417');
    expect(buildReturnTo('/products', searchParams)).toBe(
      '/products?sortBy=newest&page=417',
    );
  });

  it('buildReturnTo removes stale from query params', () => {
    const searchParams = new URLSearchParams(
      'sortBy=newest&from=%2Fproducts%2Fold',
    );
    expect(buildReturnTo('/products', searchParams)).toBe(
      '/products?sortBy=newest',
    );
  });

  it('buildReturnTo returns pathname when query is empty', () => {
    const searchParams = new URLSearchParams();
    expect(buildReturnTo('/products', searchParams)).toBe('/products');
  });

  it('withReturnTo appends from to a clean detail url', () => {
    expect(withReturnTo('/products/test-slug', '/products?page=3')).toBe(
      '/products/test-slug?from=%2Fproducts%3Fpage%3D3',
    );
  });

  it('withReturnTo does not append unsafe product-detail return paths', () => {
    expect(withReturnTo('/products/next-slug', '/products/current-slug')).toBe(
      '/products/next-slug',
    );
    expect(
      withReturnTo('/products/next-slug', '/en/products/current-slug'),
    ).toBe('/products/next-slug');
  });

  it('withReturnTo preserves existing query and hash', () => {
    expect(withReturnTo('/products/test-slug?foo=1#details', '/products?page=3')).toBe(
      '/products/test-slug?foo=1&from=%2Fproducts%3Fpage%3D3#details',
    );
  });

  it('resolveSafeReturnTo accepts internal list urls', () => {
    expect(resolveSafeReturnTo('/products?sortBy=newest&page=417')).toBe(
      '/products?sortBy=newest&page=417',
    );
  });

  it('resolveSafeReturnTo rejects external urls', () => {
    expect(resolveSafeReturnTo('https://evil.example/products')).toBeNull();
    expect(resolveSafeReturnTo('//evil.example/products')).toBeNull();
  });

  it('resolveSafeReturnTo rejects product detail urls to avoid loops', () => {
    expect(resolveSafeReturnTo('/products/some-slug')).toBeNull();
    expect(resolveSafeReturnTo('/en/products/some-slug')).toBeNull();
  });

  it('resolveSafeReturnTo rejects nested from chains', () => {
    expect(
      resolveSafeReturnTo('/products?page=2&from=%2Fproducts%2Fold'),
    ).toBeNull();
  });
});
