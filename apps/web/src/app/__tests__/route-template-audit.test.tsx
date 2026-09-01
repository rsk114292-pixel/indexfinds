/**
 * @jest-environment node
 */

import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';

const mockNotFound = jest.fn();
const mockRedirect = jest.fn();
const mockPermanentRedirect = jest.fn();
const mockHeaders = jest.fn();
const mockGetTranslations = jest.fn();
const mockFetch = jest.fn();
const renderNull = (props: unknown) => {
  void props;
  return null;
};
const mockHomePageClient = jest.fn(renderNull);
const mockProductsPageClient = jest.fn(renderNull);
const mockBrandPageClient = jest.fn(renderNull);
const mockCategoryPageClient = jest.fn(renderNull);
const mockProductPageClient = jest.fn(renderNull);
const mockItemListJsonLd = jest.fn(renderNull);

global.fetch = mockFetch as typeof fetch;

jest.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
  permanentRedirect: (...args: unknown[]) => {
    mockPermanentRedirect(...args);
    throw new Error('NEXT_PERMANENT_REDIRECT');
  },
}));

jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));

jest.mock('../[locale]/(shop)/HomePageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockHomePageClient(props);
    return null;
  },
}));

jest.mock('../[locale]/(shop)/products/ProductsPageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockProductsPageClient(props);
    return null;
  },
}));

jest.mock('../[locale]/(shop)/brands/[slug]/BrandPageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockBrandPageClient(props);
    return null;
  },
}));

jest.mock('../[locale]/(shop)/categories/[slug]/CategoryPageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockCategoryPageClient(props);
    return null;
  },
}));

jest.mock('../[locale]/(shop)/products/[slug]/ProductPageClient', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockProductPageClient(props);
    return null;
  },
}));

jest.mock('../[locale]/(shop)/brands/BrandsPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../[locale]/(shop)/categories/CategoriesPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/seo', () => ({
  BreadcrumbJsonLd: () => null,
  ProductJsonLd: () => null,
}));

jest.mock('@/components/seo/ItemListJsonLd', () => ({
  ItemListJsonLd: (props: unknown) => {
    mockItemListJsonLd(props);
    return null;
  },
}));

jest.mock('@/components/seo/BreadcrumbJsonLd', () => ({
  BreadcrumbJsonLd: () => null,
}));

jest.mock('@/components/seo/FAQPageJsonLd', () => ({
  FAQPageJsonLd: () => null,
}));

jest.mock('@/components/ProductCard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/brands/BrandCard', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/Spinner', () => ({
  Spinner: () => null,
}));

function createHeaders(userAgent = 'Mozilla/5.0') {
  return {
    get(name: string) {
      return name === 'user-agent' ? userAgent : null;
    },
  };
}

function createTranslator(namespace: string) {
  if (namespace === 'metadata') {
    return (key: string, values?: { name?: string; title?: string; siteName?: string; query?: string }) => {
      const name = values?.name || '';
      const title = values?.title || '';
      const query = values?.query || '';

      const dict: Record<string, string> = {
        brandsTitle: 'Brands',
        brandsDescription: 'Browse all brands',
        categoriesTitle: 'Categories',
        categoriesDescription: 'Browse all categories',
        productsTitle: 'All Products',
        productsDescription: 'Browse all products',
        brandTitle: `${name} - Shop Products`,
        brandFallbackDescription: `Browse ${name} products on IndexFinds`,
        brandNotFound: 'Brand not found',
        categoryTitle: `${name} - Shop Category`,
        categoryDescription: `Browse ${name} on IndexFinds`,
        categoryNotFound: 'Category not found',
        productNotFound: 'Product not found',
        productFallbackDescription: `Shop ${title} from IndexFinds`,
        searchTitle: `Search: ${query}`,
        searchDescription: `Results for ${query}`,
        searchDefaultTitle: 'Search',
        searchDefaultDescription: 'Search products',
      };

      return dict[key] || key;
    };
  }

  if (namespace === 'common') {
    return (key: string) =>
      ({
        home: 'Home',
      })[key] || key;
  }

  if (namespace === 'brands') {
    return (key: string) =>
      ({
        title: 'Brands',
      })[key] || key;
  }

  return (key: string) => key;
}

function mockJsonResponse(data: unknown, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = 'https://indexfinds.com';
  process.env.NEXT_PUBLIC_SITE_NAME = 'IndexFinds';
  process.env.NEXT_PUBLIC_API_URL = 'https://api.indexfinds.com';
  process.env.NEXT_PUBLIC_API_HOSTNAME = 'api.indexfinds.com';
  mockHeaders.mockReturnValue(createHeaders());
  mockGetTranslations.mockImplementation(
    async ({ namespace }: { namespace: string; locale?: string }) =>
      createTranslator(namespace),
  );
});

describe('route template audit', () => {
  it('slug routes that must fail closed do not opt into route-level streaming fallbacks', () => {
    expect(
      existsSync(`${process.cwd()}/src/app/[locale]/(shop)/brands/loading.tsx`),
    ).toBe(false);
    expect(
      existsSync(`${process.cwd()}/src/app/[locale]/(shop)/categories/loading.tsx`),
    ).toBe(false);
  });

  it('home page preloads SSR data into the route shell', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse([{ keyword: 'nike', count: 12 }]))
      .mockResolvedValueOnce(mockJsonResponse({ data: [{ name: 'Nike', slug: 'nike' }] }))
      .mockResolvedValueOnce(mockJsonResponse([{ name: 'Shoes', slug: 'shoes' }]))
      .mockResolvedValueOnce(mockJsonResponse({ data: [{ id: 'p1', title: 'Sample Product', slug: 'sample-product' }] }));

    const pageModule = await import('../[locale]/(shop)/page');
    const element = await pageModule.default();
    renderToStaticMarkup(element);

    expect(mockHomePageClient).toHaveBeenCalledWith(
      expect.objectContaining({
        initialViewport: 'desktop',
        initialHotSearches: [{ keyword: 'nike', count: 12 }],
        initialFeaturedBrands: { data: [{ name: 'Nike', slug: 'nike' }] },
        initialCategories: [{ name: 'Shoes', slug: 'shoes' }],
        initialNewestProducts: { data: [{ id: 'p1', title: 'Sample Product', slug: 'sample-product' }] },
      }),
    );
  });

  it('products list page preloads first-page products and facets for SSR', async () => {
    const initialProductsData = {
      data: [{ id: 'p1', title: 'Sample Product', slug: 'sample-product' }],
      meta: { total: 1, page: 1, limit: 24 },
    };
    const initialFacetsData = {
      categories: [],
      brands: [],
      colors: [],
      genders: [],
      styles: [],
      occasions: [],
      seasons: [],
      priceRange: { min: 0, max: 1000 },
    };

    mockFetch
      .mockResolvedValueOnce(mockJsonResponse(initialProductsData))
      .mockResolvedValueOnce(mockJsonResponse(initialFacetsData));

    const pageModule = await import('../[locale]/(shop)/products/page');
    const element = await pageModule.default({
      searchParams: Promise.resolve({ sortBy: 'popular' }),
    });
    renderToStaticMarkup(element);

    expect(mockProductsPageClient).toHaveBeenCalledWith(
      expect.objectContaining({
        initialProductsData,
        initialFacetsData,
      }),
    );
  });

  it('product detail route returns a real 404 for missing products', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(null, false));

    const pageModule = await import('../[locale]/(shop)/products/[slug]/page');

    await expect(
      pageModule.default({
        params: Promise.resolve({ locale: 'en', slug: 'missing-product' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  it('detail routes emit one shared page-level H1', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: 'p1',
        title: 'Sample Product',
        slug: 'sample-product',
        seoIndexable: false,
      }),
    );

    const productPageModule = await import('../[locale]/(shop)/products/[slug]/page');
    const productElement = await productPageModule.default({
      params: Promise.resolve({ locale: 'en', slug: 'sample-product' }),
    });
    const productMarkup = renderToStaticMarkup(productElement);

    expect(productMarkup.match(/<h1\b/g)).toHaveLength(1);

    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        id: 'b1',
        name: 'Nike',
        slug: 'nike',
        status: 'active',
      }),
    );

    const brandPageModule = await import('../[locale]/(shop)/brands/[slug]/page');
    const brandElement = await brandPageModule.default({
      params: Promise.resolve({ locale: 'en', slug: 'nike' }),
    });
    const brandMarkup = renderToStaticMarkup(brandElement);

    expect(brandMarkup.match(/<h1\b/g)).toHaveLength(1);
  });

  it('brand detail route returns a real 404 for missing brands', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(null, false));

    const pageModule = await import('../[locale]/(shop)/brands/[slug]/page');

    await expect(
      pageModule.default({
        params: Promise.resolve({ locale: 'en', slug: 'missing-brand' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  it('category detail route returns a real 404 for missing categories', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse(null, false));

    const pageModule = await import('../[locale]/(shop)/categories/[slug]/page');

    await expect(
      pageModule.default({
        params: Promise.resolve({ locale: 'en', slug: 'missing-category' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  it('brand and category list routes emit canonical item-list URLs', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: [{ name: 'Nike', slug: 'nike' }] }),
    );

    const brandsPageModule = await import('../[locale]/(shop)/brands/page');
    const brandsElement = await brandsPageModule.default({
      params: Promise.resolve({ locale: 'en' }),
    });
    renderToStaticMarkup(brandsElement);

    expect(mockItemListJsonLd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Brands',
        items: [{ name: 'Nike', url: 'https://indexfinds.com/en/brands/nike' }],
      }),
    );

    mockItemListJsonLd.mockClear();
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse([{ name: 'Shoes', slug: 'shoes' }]),
    );

    const categoriesPageModule = await import('../[locale]/(shop)/categories/page');
    const categoriesElement = await categoriesPageModule.default({
      params: Promise.resolve({ locale: 'en' }),
    });
    renderToStaticMarkup(categoriesElement);

    expect(mockItemListJsonLd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Categories',
        items: [{ name: 'Shoes', url: 'https://indexfinds.com/en/categories/shoes' }],
      }),
    );
  });
});
