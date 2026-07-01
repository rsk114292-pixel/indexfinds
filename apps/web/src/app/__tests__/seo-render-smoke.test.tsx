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
        agentsTitle:
          locale === 'zh'
            ? '全部代购平台 Spreadsheet 指南'
            : 'All agent spreadsheet guides',
        agentsDescription:
          locale === 'zh'
            ? '在 Findsindex 一次查看全部代购平台 spreadsheet 指南'
            : 'Browse every purchasing-agent spreadsheet guide',
      };

      return dict[key] || key;
    };
  }

  if (namespace === 'agentsPage') {
    return (key: string) =>
      ({
        listName: '全部代购平台 Spreadsheet 指南',
        eyebrow: '代购平台目录',
        heading: '全部代购平台 spreadsheet 指南',
        body: '你可以先浏览主推平台，再继续查看完整的平台列表，在一个页面里把全部入口看完。',
        featuredTitle: '主推指南',
        featuredDescription: '这些是站内重点展示的主推平台指南。',
        growthTitle: '更多平台',
        growthDescription: '如果你想继续扩展平台范围，可以从这里往下浏览更多平台。',
        topicTitle: '热门主题指南',
        topicDescription: '这些快捷入口方便你更快进入最常用的主题页面。',
        directoryTitle: '按字母浏览全部平台',
        directoryDescription: '通过字母索引快速跳转到完整的平台列表。',
        statsTitle: '覆盖概览',
        totalPlatforms: '平台指南',
        featuredPlatforms: '主推平台',
        growthPlatforms: '更多平台',
        longTailPlatforms: '补充平台',
        topicRoutes: '主题页面',
        directoryEyebrow: '全量覆盖',
        directoryHint: '首页保留的是精选入口，这个目录把全部平台集中在一起，方便继续浏览。',
        jumpTo: '跳转到',
        groupCountLabel: '个平台',
        featuredBadge: '主推',
        growthBadge: '更多',
        longTailBadge: '补充',
        cardSuffix: 'spreadsheet、yupoo、links',
      })[key] || key;
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
  it('renders localized agents directory HTML and ItemList JSON-LD', async () => {
    const pageModule = await import('../[locale]/(shop)/agents/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'zh' }),
    });
    const html = renderToStaticMarkup(element);
    const scripts = getJsonLdScripts(html);
    const itemList = scripts.find((script) => script['@type'] === 'ItemList');

    expect(html).toContain('全部代购平台 spreadsheet 指南');
    expect(html).toContain('返回顶部');
    expect(itemList?.name).toBe('全部代购平台 Spreadsheet 指南');
  });

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

  it('renders localized platform landing breadcrumb and item list JSON-LD', async () => {
    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/brands?status=active&isFeatured=true')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ id: 1, name: 'Nike', slug: 'nike', productCount: 12 }],
          }),
        };
      }

      if (url.includes('/categories/home')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'shoes',
                name: '鞋子',
                nameEn: 'Shoes',
                productCount: 100,
                translations: { zh: { name: '鞋子' } },
                children: [],
              },
            ],
          }),
        };
      }

      if (url.includes('/products?sortBy=popular')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'sample-product',
                title: '示例商品',
                mainImage: '/sample.jpg',
                priceMin: 99,
                priceMax: 99,
                currency: 'CNY',
              },
            ],
          }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    const pageModule = await import('../[locale]/(shop)/[platformSlug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'zh', platformSlug: 'kakobuy' }),
    });
    const html = renderToStaticMarkup(element);
    const scripts = getJsonLdScripts(html);
    const breadcrumbSchema = scripts.find((script) => script['@type'] === 'BreadcrumbList');
    const itemListSchema = scripts.find((script) => script['@type'] === 'ItemList');

    expect(html).toContain('首页');
    expect(html).toContain('Kakobuy');
    expect(breadcrumbSchema?.itemListElement?.[0]?.name).toBe('首页');
    expect(breadcrumbSchema?.itemListElement?.[1]?.item).toContain('/zh/products');
    expect(itemListSchema?.itemListElement?.length).toBeGreaterThan(0);
  });

  it('renders platform landing coverage copy in non-default locales', async () => {
    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/brands?status=active&isFeatured=true')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ id: 1, name: 'Nike', slug: 'nike', productCount: 12 }],
          }),
        };
      }

      if (url.includes('/categories/home')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'shoes',
                name: 'Chaussures',
                nameEn: 'Shoes',
                productCount: 100,
                translations: { fr: { name: 'Chaussures' } },
                children: [],
              },
            ],
          }),
        };
      }

      if (url.includes('/products?sortBy=popular')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'sample-product',
                title: 'Produit exemple',
                mainImage: '/sample.jpg',
                priceMin: 99,
                priceMax: 99,
                currency: 'CNY',
              },
            ],
          }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    const pageModule = await import('../[locale]/(shop)/[platformSlug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'fr', platformSlug: 'kakobuy' }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('Ce que vous pouvez parcourir ici');
    expect(html).toContain('Contenus populaires');
    expect(html).toContain('Voir direct');
  });

  it('renders localized intent landing breadcrumb, item list and faq JSON-LD', async () => {
    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/categories/home')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'shoes',
                name: '鞋子',
                nameEn: 'Shoes',
                productCount: 100,
                translations: { zh: { name: '鞋子' } },
                children: [],
              },
            ],
          }),
        };
      }

      if (url.includes('/products?sortBy=popular')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'sample-product',
                title: '示例商品',
                mainImage: '/sample.jpg',
                priceMin: 99,
                priceMax: 99,
                currency: 'CNY',
              },
            ],
          }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    const pageModule = await import('../[locale]/(shop)/[platformSlug]/[intentSlug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'zh', platformSlug: 'kakobuy', intentSlug: 'shoes' }),
    });
    const html = renderToStaticMarkup(element);
    const scripts = getJsonLdScripts(html);
    const breadcrumbSchema = scripts.find((script) => script['@type'] === 'BreadcrumbList');
    const itemListSchema = scripts.find((script) => script['@type'] === 'ItemList');
    const faqSchema = scripts.find((script) => script['@type'] === 'FAQPage');

    expect(html).toContain('Kakobuy');
    expect(breadcrumbSchema?.itemListElement?.[0]?.name).toBe('首页');
    expect(breadcrumbSchema?.itemListElement?.[1]?.item).toContain('/zh/products');
    expect(breadcrumbSchema?.itemListElement?.[2]?.item).toContain('/zh/kakobuy-spreadsheet');
    expect(breadcrumbSchema?.itemListElement?.[3]?.item).toContain('/zh/kakobuy-spreadsheet/shoes');
    expect(itemListSchema?.itemListElement?.length).toBeGreaterThan(0);
    expect(faqSchema?.mainEntity?.length).toBeGreaterThan(0);
  });

  it('renders localized fallback copy for non-narrative intent pages', async () => {
    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/categories/home')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'shoes',
                name: 'Chaussures',
                nameEn: 'Shoes',
                productCount: 100,
                translations: { fr: { name: 'Chaussures' } },
                children: [],
              },
            ],
          }),
        };
      }

      if (url.includes('/products?sortBy=popular')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                slug: 'sample-product',
                title: 'Produit exemple',
                mainImage: '/sample.jpg',
                priceMin: 99,
                priceMax: 99,
                currency: 'CNY',
              },
            ],
          }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    const pageModule = await import('../[locale]/(shop)/[platformSlug]/[intentSlug]/page');
    const element = await pageModule.default({
      params: Promise.resolve({ locale: 'fr', platformSlug: 'kakobuy', intentSlug: 'shoes' }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('Ouvrir le guide complet Kakobuy');
    expect(html).toContain('Comparer shoes sur ACBuy');
    expect(html).toContain('Quand ouvrir la page Kakobuy Shoes');
    expect(html).not.toContain('Open the full Kakobuy guide');
  });
});
