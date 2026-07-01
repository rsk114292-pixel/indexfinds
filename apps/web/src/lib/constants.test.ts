describe('buildApiUrl', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  it('routes backend API paths to the configured API origin', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.lolobuyspreadsheets.com';
    const { buildApiUrl } = await import('./constants');

    expect(buildApiUrl('/products?search=bag')).toBe(
      'https://api.lolobuyspreadsheets.com/products?search=bag',
    );
    expect(buildApiUrl('/api/products/123/buy-link')).toBe(
      'https://api.lolobuyspreadsheets.com/products/123/buy-link',
    );
  });
});
