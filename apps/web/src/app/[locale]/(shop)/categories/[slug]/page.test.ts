/**
 * @jest-environment node
 *
 * generateStaticParams 测试
 * 验证构建时预生成分类详情页的静态参数
 */

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
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

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { generateStaticParams } from './page';

beforeEach(() => {
  jest.clearAllMocks();
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
