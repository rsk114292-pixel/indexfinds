/**
 * @jest-environment node
 */

import { defaultGoogleBot } from '@/lib/seo';
import { getHomeSeoCopy } from '@/lib/home-seo';
import { getSiteName, getSiteUrl } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

const mockHeaders = jest.fn();
const mockGetTranslations = jest.fn();
const mockGetMessages = jest.fn();
const mockFetch = jest.fn();

global.fetch = mockFetch as typeof fetch;

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
  getMessages: (...args: unknown[]) => mockGetMessages(...args),
}));

jest.mock('@/components/seo', () => ({
  OrganizationJsonLd: () => null,
}));

jest.mock('@/components/VisitTracker', () => ({
  VisitTracker: () => null,
}));

jest.mock('@/components/ConditionalGA', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/CookieConsent', () => ({
  __esModule: true,
  default: () => null,
  CookieConsentProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../[locale]/(shop)/products/ProductsPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../[locale]/(shop)/search/visual/VisualSearchPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

function createHeaders(pathname: string) {
  return {
    get(name: string) {
      return name === 'x-pathname' ? pathname : null;
    },
  };
}

function createTranslator(namespace: string, locale = 'en') {
  if (namespace === 'auth') {
    return (key: string) =>
      ({
        signIn: 'Sign in',
        createAccount: 'Create account',
        forgotYourPassword: 'Forgot your password',
        resetPassword: 'Reset password',
        verifyingEmail: 'Verifying email',
      })[key] || key;
  }

  if (namespace === 'account') {
    return (key: string) =>
      ({
        overview: 'Overview',
        favorites: 'Favorites',
        browsingHistory: 'Browsing history',
        referralProgram: 'Referral program',
        security: 'Security',
        points: 'Points',
        withdrawPoints: 'Withdraw points',
        withdrawalRecords: 'Withdrawal records',
      })[key] || key;
  }

  if (namespace === 'metadata') {
    return (key: string, values?: { query?: string; name?: string; title?: string; siteName?: string }) => {
      const query = values?.query || '';
      const name = values?.name || '';
      const title = values?.title || '';
      const dict: Record<string, string> = {
        productsTitle: 'All products',
        productsDescription: 'Browse all products',
        productFallbackDescription:
          locale === 'zh'
            ? `在 IndexFinds 购买 ${title}`
            : `Shop ${title} from IndexFinds`,
        brandTitle: locale === 'fr' ? `${name} - Acheter des produits` : `${name} - Shop Products`,
        brandFallbackDescription:
          locale === 'fr'
            ? `Parcourez les produits ${name} sur IndexFinds`
            : `Browse ${name} products on IndexFinds`,
        searchDefaultTitle: 'Search',
        searchDefaultDescription: 'Search products',
        searchTitle: `Search: ${query}`,
        searchDescription: `Results for ${query}`,
      };

      return dict[key] || key;
    };
  }

  if (namespace === 'visualSearch') {
    return (key: string) =>
      ({
        imageSearch: 'Image search',
        uploadToSearch: 'Upload an image to search',
      })[key] || key;
  }

  return (key: string) => key;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockGetMessages.mockResolvedValue({});
  mockFetch.mockReset();
  mockGetTranslations.mockImplementation(
    async ({ namespace, locale }: { namespace: string; locale?: string }) =>
      createTranslator(namespace, locale),
  );
});

describe('SEO guards', () => {
  it('locale layout metadata keeps home defaults and locale-aware alternates in sync', async () => {
    mockHeaders.mockResolvedValue(createHeaders('/fr/products'));

    const { generateMetadata } = await import('../[locale]/layout');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr' }),
      children: null as never,
    });
    const homeSeo = getHomeSeoCopy('fr');

    expect(metadata.title).toEqual({
      default: homeSeo.title,
      template: `%s | ${getSiteName()}`,
    });
    expect(metadata.description).toBe(homeSeo.description);
    expect(metadata.metadataBase?.href).toBe(`${SITE_URL}/`);
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/fr/products`);
    expect(metadata.alternates?.languages?.en).toBe(`${SITE_URL}/en/products`);
    expect(metadata.alternates?.languages?.ar).toBe(`${SITE_URL}/ar/products`);
    expect(metadata.alternates?.languages?.['x-default']).toBe(`${SITE_URL}/en/products`);
    expect(metadata.openGraph?.locale).toBe('fr_FR');
  });

  it('auth and account layouts remain noindex and map route titles correctly', async () => {
    mockHeaders.mockResolvedValue(createHeaders('/en/login'));
    const authModule = await import('../[locale]/(auth)/layout');
    const authMetadata = await authModule.generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      children: null as never,
    });

    expect(authMetadata.title).toBe('Sign in');
    expect(authMetadata.robots).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });

    mockHeaders.mockResolvedValue(createHeaders('/en/account/points/withdraw'));
    const accountModule = await import('../[locale]/(shop)/account/layout');
    const accountMetadata = await accountModule.generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      children: null as never,
    });

    expect(accountMetadata.title).toBe('Withdraw points');
    expect(accountMetadata.robots).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
  });

  it('products page stays indexable with alternates and default google bot directives', async () => {
    const { generateMetadata } = await import('../[locale]/(shop)/products/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'pt' }),
    });

    expect(metadata.title).toBe('All products');
    expect(metadata.description).toBe('Browse all products');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/pt/products`);
    expect(metadata.alternates?.languages?.zh).toBe(`${SITE_URL}/zh/products`);
    expect(metadata.openGraph?.locale).toBe('pt_BR');
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
      googleBot: defaultGoogleBot,
    });
  });

  it('product detail metadata keeps locale-aware keywords and alternates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        slug: 'sample-product',
        title: 'Sample Product',
        brand: { name: 'Nike' },
        primaryCategory: {
          name: '鞋子',
          nameEn: 'Shoes',
          translations: { zh: { name: '鞋子' } },
        },
      }),
    });

    const { generateMetadata } = await import('../[locale]/(shop)/products/[slug]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'zh', slug: 'sample-product' }),
    });

    expect(metadata.keywords).toEqual([
      'Nike',
      '鞋子',
      '中国商品',
      '代购',
      'Weidian',
      'Taobao',
      '1688',
    ]);
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/zh/products/sample-product`);
    expect(metadata.openGraph?.locale).toBe('zh_CN');
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
      googleBot: defaultGoogleBot,
    });
  });

  it('brand detail metadata stays indexable with default google bot directives', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Nike',
        slug: 'nike',
      }),
    });

    const { generateMetadata } = await import('../[locale]/(shop)/brands/[slug]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug: 'nike' }),
    });

    expect(metadata.title).toBe('Nike - Acheter des produits');
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/fr/brands/nike`);
    expect(metadata.openGraph?.locale).toBe('fr_FR');
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
      googleBot: defaultGoogleBot,
    });
  });

  it('missing brand metadata is noindex to avoid soft-404 indexing', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    const { generateMetadata } = await import('../[locale]/(shop)/brands/[slug]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: 'fear-of-god' }),
    });

    expect(metadata.title).toBe('brandNotFound');
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });

  it('search result pages remain noindex and query-aware', async () => {
    const { generateMetadata } = await import('../[locale]/(shop)/search/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({ q: 'nike' }),
    });

    expect(metadata.title).toBe('Search: nike');
    expect(metadata.description).toBe('Results for nike');
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
    expect(metadata.alternates).toBeUndefined();
  });

  it('visual search pages remain noindex tool pages', async () => {
    const { generateMetadata } = await import('../[locale]/(shop)/search/visual/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en' }),
    });

    expect(metadata.title).toBe('Image search');
    expect(metadata.description).toBe('Upload an image to search');
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
  });
});
