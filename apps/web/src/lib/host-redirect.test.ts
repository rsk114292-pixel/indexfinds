describe('host-redirect', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lolobuyspreadsheets.com';
    process.env.LEGACY_SITE_URLS = 'https://weidiango.xyz, https://www.weidiango.xyz';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./host-redirect') as typeof import('./host-redirect');
  }

  it('redirects legacy apex domain traffic to the canonical domain', () => {
    const { getLegacyHostRedirectUrl } = loadModule();

    expect(
      getLegacyHostRedirectUrl(
        'https://weidiango.xyz/en/products/nike?ref=abc',
        'weidiango.xyz',
      ),
    ).toBe('https://lolobuyspreadsheets.com/en/products/nike?ref=abc');
  });

  it('redirects legacy www traffic and strips any incoming port', () => {
    const { getLegacyHostRedirectUrl } = loadModule();

    expect(
      getLegacyHostRedirectUrl(
        'https://www.weidiango.xyz/zh/brands',
        'www.weidiango.xyz:443',
      ),
    ).toBe('https://lolobuyspreadsheets.com/zh/brands');
  });

  it('does not redirect requests that already use the canonical host', () => {
    const { getLegacyHostRedirectUrl } = loadModule();

    expect(
      getLegacyHostRedirectUrl('https://lolobuyspreadsheets.com/en', 'lolobuyspreadsheets.com'),
    ).toBeNull();
  });

  it('does not redirect unknown hosts', () => {
    const { getLegacyHostRedirectUrl } = loadModule();

    expect(
      getLegacyHostRedirectUrl('https://example.org/en', 'example.org'),
    ).toBeNull();
  });

  it('supports raw hostnames in LEGACY_SITE_URLS', () => {
    process.env.LEGACY_SITE_URLS = 'weidiango.xyz www.weidiango.xyz';
    const { getLegacyHostRedirectUrl } = loadModule();

    expect(
      getLegacyHostRedirectUrl('https://weidiango.xyz/fr/help', 'weidiango.xyz'),
    ).toBe('https://lolobuyspreadsheets.com/fr/help');
  });

  it('fails closed when NEXT_PUBLIC_SITE_URL is invalid', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'not-a-url';
    const { getLegacyHostRedirectUrl } = loadModule();

    expect(
      getLegacyHostRedirectUrl('https://weidiango.xyz/en', 'weidiango.xyz'),
    ).toBeNull();
  });
});
