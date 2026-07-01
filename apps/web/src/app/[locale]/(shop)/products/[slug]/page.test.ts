/**
 * @jest-environment node
 */

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(),
}));

jest.mock('./ProductPageClient', () => () => null);
jest.mock('@/components/seo', () => ({
  ProductJsonLd: () => null,
  BreadcrumbJsonLd: () => null,
}));
jest.mock('@/lib/seo', () => ({
  defaultGoogleBot: {},
  generateAlternates: jest.fn(),
  getOgLocale: jest.fn(),
  getProductMetadataKeywords: jest.fn(() => []),
}));

import { dynamic } from './page';

describe('products/[slug] page build mode', () => {
  it('forces dynamic rendering to avoid build-time pre-generation', () => {
    expect(dynamic).toBe('force-dynamic');
  });
});
