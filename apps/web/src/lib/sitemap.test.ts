/**
 * @jest-environment node
 */

import {
  buildUrlSetXml,
  getTenantSitemapOptions,
  getSitemapEntriesByChunk,
  getSitemapChunkIds,
} from './sitemap';
import { getSiteUrl } from './site-config';
import {
  getTenantConfigByHost,
  isTenantReleasedForIndexing,
} from './tenant-config';
import { SUBSITE_GUIDES } from './subsite-guides';

const SITE_URL = getSiteUrl();
const mockFetch = jest.fn();

global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

async function expectTenantSitemap(
  domain: string,
  reviewedPaths: readonly string[],
) {
  const tenant = getTenantConfigByHost(domain);
  expect(tenant).toBeDefined();

  const released = isTenantReleasedForIndexing(tenant!);
  const paths = released ? reviewedPaths : [];
  const options = getTenantSitemapOptions(tenant);

  expect(options).toEqual(
    expect.objectContaining({
      siteUrl: `https://${domain}`,
      includeCatalog: false,
      staticPaths: paths,
    }),
  );
  await expect(getSitemapChunkIds(options)).resolves.toEqual(
    released ? [0] : [],
  );
  const entries = await getSitemapEntriesByChunk(0, options);
  expect(entries.map((entry) => entry.url)).toEqual(
    paths.map((path) => `https://${domain}/en${path}`),
  );
  expect(mockFetch).not.toHaveBeenCalled();
}

describe('sitemap', () => {
  it('chunks reviewed product canonicals without locale multiplication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 8001, reviewedOnly: true }),
    });

    await expect(getSitemapChunkIds()).resolves.toEqual([0, 1, 2, 3, 4]);
  });

  it('does not advertise an empty product sitemap chunk', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 0, reviewedOnly: true }),
    });

    await expect(getSitemapChunkIds()).resolves.toEqual([0]);
  });

  it('submits only English canonical URLs for reviewed products', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        slugs: ['reviewed-product'],
        reviewedOnly: true,
      }),
    });

    await expect(getSitemapEntriesByChunk(1)).resolves.toEqual([
      expect.objectContaining({
        url: `${SITE_URL}/en/products/reviewed-product`,
        alternates: {
          en: `${SITE_URL}/en/products/reviewed-product`,
          'x-default': `${SITE_URL}/en/products/reviewed-product`,
        },
      }),
    ]);
  });

  it('fails closed when an older API cannot prove the slug review filter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 77973 }),
    });

    await expect(getSitemapChunkIds()).resolves.toEqual([0]);
  });

  it('adds locale alternates to generated entries', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slugs: ['shoes'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slugs: ['nike'] }),
      });

    const entries = await getSitemapEntriesByChunk(0);
    const zhHome = entries.find((entry) => entry.url === `${SITE_URL}/zh`);

    expect(zhHome).toBeDefined();
    expect(zhHome?.alternates?.en).toBe(`${SITE_URL}/en`);
    expect(zhHome?.alternates?.zh).toBe(`${SITE_URL}/zh`);
    expect(zhHome?.alternates?.['x-default']).toBe(`${SITE_URL}/en`);
  });

  it('excludes invalid and duplicate API slugs from indexable sitemap URLs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slugs: ['shoes', ' shoes ', '', null, 'null'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          slugs: ['nike', ' nike ', 'null', 'undefined', null],
        }),
      });

    const entries = await getSitemapEntriesByChunk(0);
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${SITE_URL}/en/categories/shoes`);
    expect(urls).toContain(`${SITE_URL}/en/brands/nike`);
    expect(urls.filter((url) => url.endsWith('/categories/shoes'))).toHaveLength(
      8,
    );
    expect(urls.filter((url) => url.endsWith('/brands/nike'))).toHaveLength(8);
    expect(urls.some((url) => /\/(?:null|undefined)$/.test(url))).toBe(false);
  });

  it('keeps tenant sitemaps limited to reviewed unique English pages', async () => {
    await expectTenantSitemap('usfansindex.net', [
      '',
      '/categories',
      '/usfans-spreadsheet',
      '/source-check',
      '/qc-record',
      '/parcel-guide',
      '/faq',
    ]);
  });

  it('publishes the reviewed iTaoBuy evidence guides', async () => {
    await expectTenantSitemap('itaobuyindex.com', [
      '',
      '/categories',
      '/site-guide',
      '/source-ledger',
      '/qc-evidence',
      '/parcel-record',
      '/faq',
    ]);
  });

  it('publishes only the reviewed ACBuy research allowlist', async () => {
    const options = getTenantSitemapOptions(
      getTenantConfigByHost('acbuyindex.com'),
    );

    expect(options).toEqual(
      expect.objectContaining({
        siteUrl: 'https://acbuyindex.com',
        includeCatalog: false,
        staticPaths: [
          '',
          '/categories',
          '/directory',
          '/platform-guide',
          '/category-research',
          '/safety-research',
          '/faq',
        ],
      }),
    );
    await expect(getSitemapChunkIds(options)).resolves.toEqual([0]);
    await expect(getSitemapEntriesByChunk(0, options)).resolves.toEqual([
      expect.objectContaining({ url: 'https://acbuyindex.com/en' }),
      expect.objectContaining({ url: 'https://acbuyindex.com/en/categories' }),
      expect.objectContaining({ url: 'https://acbuyindex.com/en/directory' }),
      expect.objectContaining({
        url: 'https://acbuyindex.com/en/platform-guide',
      }),
      expect.objectContaining({
        url: 'https://acbuyindex.com/en/category-research',
      }),
      expect.objectContaining({
        url: 'https://acbuyindex.com/en/safety-research',
      }),
      expect.objectContaining({ url: 'https://acbuyindex.com/en/faq' }),
    ]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('publishes the reviewed AllChinaBuy index record allowlist', async () => {
    const options = getTenantSitemapOptions(
      getTenantConfigByHost('allchinabuyindex.com'),
    );

    expect(options).toEqual(
      expect.objectContaining({
        siteUrl: 'https://allchinabuyindex.com',
        includeCatalog: false,
        staticPaths: [
          '',
          '/categories',
          '/guide',
          '/shipping-checklist',
          '/research-log',
          '/regions',
          '/faq',
        ],
      }),
    );
    await expect(getSitemapChunkIds(options)).resolves.toEqual([0]);
    await expect(getSitemapEntriesByChunk(0, options)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://allchinabuyindex.com/en' }),
        expect.objectContaining({
          url: 'https://allchinabuyindex.com/en/categories',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyindex.com/en/guide',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyindex.com/en/shipping-checklist',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyindex.com/en/research-log',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyindex.com/en/regions',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyindex.com/en/faq',
        }),
      ]),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('publishes the reviewed AllChinaBuy finder allowlist', async () => {
    const options = getTenantSitemapOptions(
      getTenantConfigByHost('allchinabuyfinder.com'),
    );

    expect(options).toEqual(
      expect.objectContaining({
        siteUrl: 'https://allchinabuyfinder.com',
        includeCatalog: false,
        staticPaths: [
          '',
          '/categories',
          '/finder-guide',
          '/search-ideas',
          '/product-checklist',
          '/faq',
        ],
      }),
    );
    await expect(getSitemapChunkIds(options)).resolves.toEqual([0]);
    await expect(getSitemapEntriesByChunk(0, options)).resolves.toHaveLength(6);
    await expect(getSitemapEntriesByChunk(0, options)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://allchinabuyfinder.com/en' }),
        expect.objectContaining({
          url: 'https://allchinabuyfinder.com/en/categories',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyfinder.com/en/finder-guide',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyfinder.com/en/search-ideas',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyfinder.com/en/product-checklist',
        }),
        expect.objectContaining({
          url: 'https://allchinabuyfinder.com/en/faq',
        }),
      ]),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      'bbdbuyeufinds.com',
      [
        '',
        '/categories',
        '/eu-finds',
        '/eu-guide',
        '/qc-checklist',
        '/shipping-planner',
        '/faq',
      ],
    ],
    [
      'bbdbuyeus.com',
      [
        '',
        '/categories',
        '/search-guide',
        '/order-workflow',
        '/parcel-checklist',
        '/us-shipping',
        '/faq',
      ],
    ],
    [
      'bbdbuyeusheet.com',
      ['', '/categories', '/eu-sheet', '/checklist', '/faq'],
    ],
  ])('publishes only the reviewed %s research paths', async (domain, paths) => {
    await expectTenantSitemap(domain, paths);
  });

  it.each([
    [
      'cssbuyitems.com',
      [
        '',
        '/categories',
        '/cssbuy-score',
        '/guide',
        '/safety',
        '/search-ideas',
        '/shipping',
        '/faq',
      ],
    ],
    [
      'cssbuyindex.com',
      [
        '',
        '/categories',
        '/cssbuy-score',
        '/guide',
        '/forwarding',
        '/safety',
        '/search-ideas',
        '/faq',
      ],
    ],
    [
      'cssbuycatalog.com',
      [
        '',
        '/categories',
        '/spreadsheet',
        '/guide',
        '/forwarding',
        '/usa',
        '/safety',
        '/faq',
      ],
    ],
  ])('publishes only the reviewed %s research paths', async (domain, paths) => {
    await expectTenantSitemap(domain, paths);
  });

  it.each([
    ['kakobuyindex.net'],
    ['kakobuyitems.com'],
  ])('publishes only the reviewed %s research paths', async (domain) => {
    const paths = [
      '',
      '/categories',
      '/guide',
      '/kakobuy-score',
      '/safety',
      '/search-ideas',
      '/shipping',
      '/faq',
    ];
    await expectTenantSitemap(domain, paths);
  });

  it.each([
    [
      'litbuyindex.com',
      [
        '',
        '/categories',
        '/codes-coupons',
        '/faq',
        '/guide',
        '/safety',
        '/search-ideas',
        '/shipping',
        '/freight-estimator',
      ],
    ],
    [
      'litbuyitems.com',
      [
        '',
        '/categories',
        '/coupons',
        '/faq',
        '/guide',
        '/haul-review',
        '/safety',
        '/shipping',
      ],
    ],
    [
      'litbuyproducts.com',
      [
        '',
        '/categories',
        '/coupons',
        '/faq',
        '/guide',
        '/invitation-code',
        '/safety',
        '/shipping',
        '/spreadsheet',
      ],
    ],
  ])('publishes only the reviewed %s research paths', async (domain, paths) => {
    await expectTenantSitemap(domain, paths);
  });

  it.each([
    [
      'loongbuys.net',
      ['', '/categories', '/guide', '/shipping-calculator', '/reviews', '/safety', '/faq'],
    ],
    [
      'lovegobuyindex.com',
      [
        '',
        '/categories',
        '/faq',
        '/guide',
        '/is-lovegobuy-legit',
        '/lovegobuy-coupon-code',
        '/lovegobuy-spreadsheet',
        '/refund-lovegobuy-order',
      ],
    ],
  ])('publishes only the reviewed %s research paths', async (domain, paths) => {
    await expectTenantSitemap(domain, paths);
  });

  it.each([
    [
      'mulebuyindex.net',
      [
        '',
        '/categories',
        '/mulebuy-spreadsheet',
        '/spreadsheet-checklist',
        '/search-ideas',
        '/order-status-guide',
        '/buyer-safety',
        '/shipping-weight-guide',
        '/tracking',
        '/faq',
      ],
    ],
    [
      'mulebuyitems.com',
      [
        '',
        '/categories',
        '/mulebuy-spreadsheet',
        '/spreadsheet-checklist',
        '/search-ideas',
        '/buyer-safety',
        '/shipping-weight-guide',
        '/faq',
      ],
    ],
  ])('publishes only the reviewed %s research paths', async (domain, paths) => {
    await expectTenantSitemap(domain, paths);
  });

  it.each([
    [
      '1to1finds.cloud',
      ['', '/categories', '/evidence-cloud', '/link-ledger', '/image-review', '/decision-handoff', '/faq'],
    ],
    [
      '1to1finds.com',
      ['', '/categories', '/finds-method', '/search-vocabulary', '/source-check', '/qc-questions', '/faq'],
    ],
    [
      '1to1reps.com',
      ['', '/categories', '/finds', '/qc-checklist', '/agent-guide', '/source-safety', '/faq'],
    ],
    [
      '1to1spreadsheet.com',
      ['', '/categories', '/spreadsheet-method', '/source-fields', '/qc-record', '/handoff-checklist', '/faq'],
    ],
    [
      'cnshopperindex.com',
      ['', '/categories', '/cnshopper-products', '/category-map', '/source-checklist', '/order-handoff', '/faq'],
    ],
    [
      'boonbuyindex.com',
      ['', '/categories', '/boonbuy-products', '/query-method', '/source-checklist', '/route-boundaries', '/faq'],
    ],
    [
      'eastmallbuyindex.com',
      ['', '/guide', '/categories', '/spreadsheet', '/reddit', '/legit', '/referral-code', '/faq'],
    ],
    [
      'fishgooindex.com',
      ['', '/guide', '/categories', '/fishgoo-checklist', '/search-ideas', '/shipping', '/safety', '/faq'],
    ],
    [
      'oopbuyindex.net',
      ['', '/guide', '/categories', '/oopbuy-score', '/search-ideas', '/shipping', '/safety', '/faq'],
    ],
    [
      'orientdigindex.com',
      ['', '/orientdig-spreadsheet', '/categories', '/orientdig-qc-photos-guide', '/orientdig-shoes-spreadsheet', '/orientdig-hoodies-spreadsheet', '/orientdig-bags-spreadsheet', '/orientdig-electronics-spreadsheet', '/search-ideas', '/spreadsheet-checklist', '/orient-score-methodology', '/shipping-weight-guide', '/buyer-safety', '/faq'],
    ],
    [
      'parcelupindex.com',
      ['', '/categories', '/getting-started', '/fees-and-budgeting', '/shipping-and-warehouse', '/tracking', '/qc-checklist', '/product-index-method', '/official-sources', '/methodology', '/about-parcel-up-index'],
    ],
    [
      'sugargooindex.net',
      ['', '/sugargoo-spreadsheet', '/categories', '/sugargoo-qc-guide', '/sugargoo-shipping-guide', '/sugargoo-buying-guide', '/tracking', '/faq'],
    ],
    [
      'superbuydeals.com',
      ['', '/superbuy-spreadsheet', '/categories', '/spreadsheet-checklist', '/shipping-weight-guide', '/faq'],
    ],
    [
      'superbuyindex.com',
      ['', '/superbuy-spreadsheet', '/categories', '/search-ideas', '/spreadsheet-checklist', '/shipping-weight-guide', '/buyer-safety', '/faq'],
    ],
    [
      'superbuyitems.com',
      ['', '/superbuy-items', '/superbuy-product-links', '/superbuy-qc', '/superbuy-shipping', '/superbuy-review', '/categories', '/faq'],
    ],
    [
      'ydaexpress.net',
      ['', '/categories', '/parcel-brief', '/warehouse-checklist', '/consolidation-planner', '/tracking-handoff', '/faq'],
    ],
    [
      'ydaexpress.org',
      ['', '/categories', '/service-map', '/terms-checklist', '/shopping-agent-vs-forwarding', '/quote-evidence', '/faq'],
    ],
    [
      'yoybuyindex.com',
      ['', '/spreadsheet', '/categories', '/qc-checklist', '/search-ideas', '/shipping', '/safety', '/faq'],
    ],
  ])('publishes only the reviewed %s evidence paths', async (domain, paths) => {
    await expectTenantSitemap(domain, paths);
  });

  it('keeps any unreleased tenants out of sitemap output', async () => {
    const unreleased = SUBSITE_GUIDES.filter((guide) => {
      const tenant = getTenantConfigByHost(guide.domain);
      return tenant && !isTenantReleasedForIndexing(tenant);
    });

    for (const guide of unreleased) {
      const options = getTenantSitemapOptions(
        getTenantConfigByHost(guide.domain),
      );
      expect(options).toEqual(
        expect.objectContaining({
          siteUrl: `https://${guide.domain}`,
          includeCatalog: false,
          staticPaths: [],
        }),
      );
      await expect(getSitemapChunkIds(options)).resolves.toEqual([]);
      await expect(getSitemapEntriesByChunk(0, options)).resolves.toEqual([]);
    }
  });

  it('renders xhtml hreflang links in urlset xml', () => {
    const xml = buildUrlSetXml([
      {
        url: `${SITE_URL}/fr/products`,
        alternates: {
          en: `${SITE_URL}/en/products`,
          fr: `${SITE_URL}/fr/products`,
          'x-default': `${SITE_URL}/en/products`,
        },
      },
    ]);

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/products" />`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}/fr/products" />`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/products" />`,
    );
  });
});
