/**
 * @jest-environment node
 *
 * Category route tests
 * The response is host-specific and must stay dynamic across tenants.
 */

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  permanentRedirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

// Mock next-intl/server
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

// Mock child components
jest.mock('./CategoryPageClient', () => () => null);
jest.mock('@/components/seo', () => ({
  BreadcrumbJsonLd: () => null,
}));
jest.mock('@/components/ui/Spinner', () => ({
  Spinner: () => null,
}));
jest.mock('@/lib/seo', () => ({
  generateAlternates: jest.fn(),
  defaultGoogleBot: {},
  getOgLocale: jest.fn(),
}));
jest.mock('@/lib/request-site-identity', () => ({
  getRequestSiteIdentity: jest.fn().mockResolvedValue({
    tenant: null,
    siteUrl: 'https://indexfinds.com',
    siteName: 'IndexFinds',
  }),
  buildSiteAlternates: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import CategoryPage, { dynamic } from './page';
import { __resetServerApiFallbackCacheForTests } from '@/lib/server-api-fetch';
import { permanentRedirect } from 'next/navigation';

const mockPermanentRedirect = jest.mocked(permanentRedirect);

beforeEach(() => {
  jest.clearAllMocks();
  __resetServerApiFallbackCacheForTests();
});

it('renders category responses dynamically for host-specific tenants', () => {
  expect(dynamic).toBe('force-dynamic');
});

describe('CategoryPage', () => {
  it('permanently redirects a legacy alias to the canonical slug', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: '卫衣', slug: 'hoodie' }),
    });

    await expect(
      CategoryPage({
        params: Promise.resolve({ locale: 'en', slug: 'hoodies' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      '/en/categories/hoodie',
    );
  });

  it('loads the first product page and facets on the server for canonical routes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: '鞋靴', slug: 'shoes' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'p-1' }], meta: { total: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: [], brands: [] }),
      });

    await CategoryPage({
      params: Promise.resolve({ locale: 'en', slug: 'shoes' }),
    });

    const requestUrls = mockFetch.mock.calls.map(([url]) => String(url));
    expect(requestUrls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /\/products\?category=shoes&page=1&limit=\d+&sortBy=popular$/,
        ),
        expect.stringMatching(/\/products\/facets\?category=shoes$/),
      ]),
    );
  });

  it('retries a transient category API failure instead of rendering a false 404', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: '鞋靴', slug: 'shoes' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { total: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: [], brands: [] }),
      });

    await CategoryPage({
      params: Promise.resolve({ locale: 'en', slug: 'shoes' }),
    });

    const categoryRequests = mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith('/categories/slug/shoes'),
    );
    expect(categoryRequests).toHaveLength(2);
  });
});
