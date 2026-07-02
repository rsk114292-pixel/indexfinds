import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mockGetTranslations = jest.fn();
const mockFetch = jest.fn();

global.fetch = mockFetch as typeof fetch;

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('../[locale]/(shop)/products/[slug]/ProductPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../[locale]/(shop)/brands/[slug]/BrandPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../[locale]/(shop)/categories/[slug]/CategoryPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/brands/BrandCard', () => ({
  __esModule: true,
  default: ({ brand }: { brand: { name: string } }) => <div>{brand.name}</div>,
}));

jest.mock('@/components/ProductCard', () => ({
  __esModule: true,
  default: ({ product }: { product: { title: string } }) => <div>{product.title}</div>,
}));

function createTranslator(namespace: string, locale = 'en') {
  if (namespace === 'common') {
    return (key: string) =>
      ({
        home: locale === 'zh' ? '首页' : 'Home',
        backToTop: locale === 'zh' ? '返回顶部' : 'Back to top',
      })[key] || key;
  }

  if (namespace === 'metadata') {
    return (key: string, values?: { title?: string }) => {
      const title = values?.title || '';
      const dict: Record<string, string> = {
        productFallbackDescription:
          locale === 'zh' ? `在 Findsindex 购买 ${title}` : `Shop ${title} from Findsindex`,
      };

      return dict[key] || key;
    };
  }

  if (namespace === 'brands') {
    return (key: string) =>
      ({
        title: locale === 'zh' ? '品牌' : 'Brands',
      })[key] || key;
  }

  return (key: string) => key;
}

function getJsonLdScripts(html: string) {
  document.body.innerHTML = html;
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
    (script) => JSON.parse(script.textContent || '{}'),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockGetTranslations.mockImplementation(
    async ({ namespace, locale }: { namespace: string; locale?: string }) =>
      createTranslator(namespace, locale),
  );
});

describe('SEO render smoke tests', () => {
  it('renders localized product JSON-LD and breadcrumb HTML signals', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        slug: 'sample-product',
        title: '示例商品',
        description: '',
        currency: 'CNY',
        primaryCategory: {
          slug: 'shoes',
          name: '鞋子',
          nameEn: 'Shoes',
          translations: { zh: { name: '鞋子' } },
        },
      }),
    });

    const pageModule = await import('../[locale]/(shop)/products/[slug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'zh', slug: 'sample-product' }),
    });
    const html = renderToStaticMarkup(element);
    const scripts = getJsonLdScripts(html);
    const productSchema = scripts.find((script) => script['@type'] === 'Product');
    const breadcrumbSchema = scripts.find((script) => script['@type'] === 'BreadcrumbList');

    expect(productSchema?.description).toBe('在 Findsindex 购买 示例商品');
    expect(productSchema?.url).toContain('/zh/products/sample-product');
    expect(breadcrumbSchema?.itemListElement?.[0]?.name).toBe('首页');
    expect(breadcrumbSchema?.itemListElement?.[1]?.item).toContain('/zh/categories/shoes');
  });

  it('renders localized brand breadcrumb JSON-LD', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: '耐克',
        slug: 'nike',
      }),
    });

    const pageModule = await import('../[locale]/(shop)/brands/[slug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'zh', slug: 'nike' }),
    });
    const html = renderToStaticMarkup(element);
    const scripts = getJsonLdScripts(html);
    const breadcrumbSchema = scripts.find((script) => script['@type'] === 'BreadcrumbList');

    expect(breadcrumbSchema?.itemListElement?.[0]?.name).toBe('首页');
    expect(breadcrumbSchema?.itemListElement?.[1]?.name).toBe('品牌');
    expect(breadcrumbSchema?.itemListElement?.[1]?.item).toContain('/zh/brands');
    expect(breadcrumbSchema?.itemListElement?.[2]?.name).toBe('耐克');
  });

  it('renders localized category breadcrumb JSON-LD', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        slug: 'shoes',
        name: '鞋子',
        nameEn: 'Shoes',
        translations: { zh: { name: '鞋子' } },
      }),
    });

    const pageModule = await import('../[locale]/(shop)/categories/[slug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'zh', slug: 'shoes' }),
    });
    const html = renderToStaticMarkup(element);
    const scripts = getJsonLdScripts(html);
    const breadcrumbSchema = scripts.find((script) => script['@type'] === 'BreadcrumbList');

    expect(breadcrumbSchema?.itemListElement?.[0]?.name).toBe('首页');
    expect(breadcrumbSchema?.itemListElement?.[1]?.name).toBe('鞋子');
  });
});
