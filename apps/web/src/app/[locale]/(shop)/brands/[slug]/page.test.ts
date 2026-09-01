/**
 * @jest-environment node
 */

// Mock next/navigation
const mockRedirect = jest.fn();
const mockNotFound = jest.fn();
jest.mock('next/navigation', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redirect: (...args: any[]) => {
    mockRedirect(...args);
    // Next.js redirect() throws NEXT_REDIRECT internally
    throw new Error('NEXT_REDIRECT');
  },
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// Mock next-intl/server
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue(
    (key: string) => key,
  ),
}));

// Mock child components
jest.mock('./BrandPageClient', () => () => null);
jest.mock('@/components/seo', () => ({
  BreadcrumbJsonLd: () => null,
}));
jest.mock('@/lib/seo', () => ({
  generateAlternates: jest.fn(),
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

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import BrandPage, { dynamic } from './page';
import { __resetServerApiFallbackCacheForTests } from '@/lib/server-api-fetch';
import { isTenantSafeBrandDescription } from '@/lib/tenant-brand-description';

beforeEach(() => {
  jest.clearAllMocks();
  __resetServerApiFallbackCacheForTests();
});

it('renders brand responses dynamically for host-specific tenants', () => {
  expect(dynamic).toBe('force-dynamic');
});

it('rejects generic or placeholder brand descriptions for tenant metadata', () => {
  expect(
    isTenantSafeBrandDescription(
      'Browse Air Jordan product listings on IndexFinds.',
    ),
  ).toBe(false);
  expect(isTenantSafeBrandDescription('search_term_string')).toBe(false);
  expect(
    isTenantSafeBrandDescription(
      'Review the available Air Jordan listing evidence before choosing a route.',
    ),
  ).toBe(true);
});

describe('BrandPage merged brand redirect', () => {
  it('should redirect to target brand when brand is merged', async () => {
    const mergedBrand = {
      id: 'old-id',
      name: 'OldNike',
      slug: 'old-nike',
      status: 'merged',
      mergedIntoId: 'target-id',
    };
    const targetBrand = {
      id: 'target-id',
      name: 'Nike',
      slug: 'nike',
      status: 'active',
    };

    mockFetch
      // First call: getBrand(slug)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mergedBrand,
      })
      // Second call: fetch target brand by ID
      .mockResolvedValueOnce({
        ok: true,
        json: async () => targetBrand,
      });

    const params = Promise.resolve({ locale: 'en', slug: 'old-nike' });

    await expect(BrandPage({ params })).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/en/brands/nike');
  });

  it('should NOT redirect for active brands', async () => {
    const activeBrand = {
      id: 'b1',
      name: 'Nike',
      slug: 'nike',
      status: 'active',
      tier: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => activeBrand,
    });

    const params = Promise.resolve({ locale: 'en', slug: 'nike' });

    // Should not throw (no redirect)
    await BrandPage({ params });

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should NOT redirect if target brand fetch fails', async () => {
    const mergedBrand = {
      id: 'old-id',
      name: 'OldBrand',
      slug: 'old-brand',
      status: 'merged',
      mergedIntoId: 'gone-id',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mergedBrand,
      })
      // Target brand fetch fails
      .mockResolvedValueOnce({
        ok: false,
      });

    const params = Promise.resolve({ locale: 'en', slug: 'old-brand' });

    // Should not throw — gracefully renders current page
    await BrandPage({ params });

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should NOT redirect if brand not found (null)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const params = Promise.resolve({ locale: 'en', slug: 'nonexistent' });

    await expect(BrandPage({ params })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNotFound).toHaveBeenCalled();
  });
});
