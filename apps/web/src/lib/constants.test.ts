describe('buildApiUrl', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  it('routes browser API paths through the same-origin proxy', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lolobuyspreadsheets.com';
    const { buildApiUrl } = await import('./constants');

    expect(buildApiUrl('/products?search=bag')).toBe(
      '/api/products?search=bag',
    );
    expect(buildApiUrl('/api/products/123/buy-link')).toBe(
      '/api/products/123/buy-link',
    );
  });
});
