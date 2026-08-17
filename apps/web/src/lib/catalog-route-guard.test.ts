describe('catalog-route-guard', () => {
  const originalEnv = process.env;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_API_URL: 'https://api.lolobuyspreadsheets.com',
    };
    global.fetch = mockFetch as typeof fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./catalog-route-guard') as typeof import('./catalog-route-guard');
  }

  it('matches localized brand detail routes', () => {
    const { getGuardedCatalogDetailRoute } = loadModule();

    expect(
      getGuardedCatalogDetailRoute('/en/brands/fear-of-god'),
    ).toEqual({
      locale: 'en',
      entityType: 'brands',
      slug: 'fear-of-god',
    });
  });

  it('matches localized category detail routes and decodes the slug', () => {
    const { getGuardedCatalogDetailRoute } = loadModule();

    expect(
      getGuardedCatalogDetailRoute('/fr/categories/maison%20margiela'),
    ).toEqual({
      locale: 'fr',
      entityType: 'categories',
      slug: 'maison margiela',
    });
  });

  it('matches localized product detail routes', () => {
    const { getGuardedCatalogDetailRoute } = loadModule();

    expect(
      getGuardedCatalogDetailRoute('/en/products/sample-product'),
    ).toEqual({
      locale: 'en',
      entityType: 'products',
      slug: 'sample-product',
    });
  });

  it('ignores non-detail routes', () => {
    const { getGuardedCatalogDetailRoute } = loadModule();

    expect(getGuardedCatalogDetailRoute('/en/brands')).toBeNull();
    expect(getGuardedCatalogDetailRoute('/en/products')).toBeNull();
    expect(getGuardedCatalogDetailRoute('/robots.txt')).toBeNull();
  });

  it('checks guarded slugs against the API and treats 404 as missing', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const { guardedCatalogSlugExists } = loadModule();

    await expect(
      guardedCatalogSlugExists('brands', 'missing-brand'),
    ).resolves.toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.lolobuyspreadsheets.com/brands/slug/missing-brand',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
  });

  it('checks product slugs against the public product endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const { guardedCatalogSlugExists } = loadModule();

    await expect(
      guardedCatalogSlugExists('products', 'pending-product'),
    ).resolves.toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.lolobuyspreadsheets.com/products/slug/pending-product',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
  });

  it('fails open when the API probe is rate-limited or otherwise unhealthy', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    const { guardedCatalogSlugExists } = loadModule();

    await expect(
      guardedCatalogSlugExists('brands', 'chanel'),
    ).resolves.toBeNull();
  });

  it('fails open when the API check errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network failed'));
    const { guardedCatalogSlugExists } = loadModule();

    await expect(
      guardedCatalogSlugExists('categories', 'bags'),
    ).resolves.toBeNull();
  });

  it('uses a short no-store API probe for guarded slug checks', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const { guardedCatalogSlugExists } = loadModule();

    await guardedCatalogSlugExists('brands', 'chanel');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.lolobuyspreadsheets.com/brands/slug/chanel',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
