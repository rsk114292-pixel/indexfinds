/**
 * @jest-environment node
 *
 * generateStaticParams 测试
 * 验证构建时预生成分类详情页的静态参数
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

import CategoryPage, { generateStaticParams } from './page';
import { __resetServerApiFallbackCacheForTests } from '@/lib/server-api-fetch';
import { permanentRedirect } from 'next/navigation';

const mockPermanentRedirect = jest.mocked(permanentRedirect);

beforeEach(() => {
  jest.clearAllMocks();
  __resetServerApiFallbackCacheForTests();
});

describe('generateStaticParams', () => {
  it('API 返回 slugs 时生成所有 locale × slug 组合', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ slugs: ['shoes', 'jackets'] }),
    });

    const params = await generateStaticParams();

    // 8 locales × 2 slugs = 16 组合
    expect(params).toHaveLength(16);
    expect(params).toContainEqual({ locale: 'en', slug: 'shoes' });
    expect(params).toContainEqual({ locale: 'zh', slug: 'jackets' });
    expect(params).toContainEqual({ locale: 'fr', slug: 'shoes' });
  });

  it('API 请求失败时返回空数组（不阻断构建）', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const params = await generateStaticParams();

    expect(params).toEqual([]);
  });

  it('网络异常时返回空数组（不阻断构建）', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const params = await generateStaticParams();

    expect(params).toEqual([]);
  });
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
});
