/**
 * @jest-environment node
 */

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  permanentRedirect: jest.fn(),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

jest.mock('@/components/seo/BreadcrumbJsonLd', () => ({
  BreadcrumbJsonLd: () => null,
}));
jest.mock('@/components/seo/FAQPageJsonLd', () => ({
  FAQPageJsonLd: () => null,
}));
jest.mock('@/components/seo/ItemListJsonLd', () => ({
  ItemListJsonLd: () => null,
}));
jest.mock('@/components/ProductCard', () => () => null);
jest.mock('@/components/brands/BrandCard', () => () => null);
jest.mock('@/lib/seo', () => ({
  generateAlternates: jest.fn(),
  getOgLocale: jest.fn(),
}));

import { locales } from '@/i18n/config';
import { ALL_PLATFORM_LANDING_PAGES } from '@/lib/platform-landings';
import { generateStaticParams } from './page';

describe('platform landing generateStaticParams', () => {
  it('generates all locale and platform combinations', async () => {
    const params = await generateStaticParams();

    expect(params).toHaveLength(locales.length * ALL_PLATFORM_LANDING_PAGES.length);
    expect(params).toContainEqual({
      locale: 'en',
      platformSlug: 'kakobuy-spreadsheet',
    });
    expect(params).toContainEqual({
      locale: 'zh',
      platformSlug: 'mulebuy-spreadsheet',
    });
  });
});
