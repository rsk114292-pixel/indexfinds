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
jest.mock('@/components/seo/ItemListJsonLd', () => ({
  ItemListJsonLd: () => null,
}));
jest.mock('@/components/ProductCard', () => () => null);
jest.mock('@/lib/seo', () => ({
  generateAlternates: jest.fn(),
  getOgLocale: jest.fn(),
}));

import { locales } from '@/i18n/config';
import { ALL_PLATFORM_LANDING_PAGES, PLATFORM_LANDING_INTENTS } from '@/lib/platform-landings';
import { generateStaticParams } from './page';

describe('platform intent landing generateStaticParams', () => {
  it('generates all locale, platform and intent combinations', async () => {
    const params = await generateStaticParams();

    expect(params).toHaveLength(
      locales.length * ALL_PLATFORM_LANDING_PAGES.length * PLATFORM_LANDING_INTENTS.length,
    );
    expect(params).toContainEqual({
      locale: 'en',
      platformSlug: 'kakobuy-spreadsheet',
      intentSlug: 'shoes',
    });
    expect(params).toContainEqual({
      locale: 'zh',
      platformSlug: 'cnfans-spreadsheet',
      intentSlug: 'jewelry',
    });
  });
});
