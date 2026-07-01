import {
  buildCategorySlugMap,
  normalizeCategoriesResponse,
  resolveLocalizedCategoryLabel,
} from './category-labels';
import type { Category } from '@/types';

describe('category-labels', () => {
  const categories: Category[] = [
    {
      id: '1',
      name: '跑步鞋',
      nameEn: 'Running Shoes',
      slug: 'running-shoes',
      level: 1,
      translations: {
        en: { name: 'Running Shoes' },
        fr: { name: 'Chaussures de course' },
        zh: { name: '跑步鞋' },
      },
    },
  ];

  it('normalizes wrapped category responses', () => {
    expect(normalizeCategoriesResponse({ data: categories })).toEqual(categories);
    expect(normalizeCategoriesResponse(categories)).toEqual(categories);
  });

  it('resolves localized labels by slug', () => {
    const categoriesBySlug = buildCategorySlugMap(categories);

    expect(
      resolveLocalizedCategoryLabel({
        slug: 'running-shoes',
        locale: 'fr',
        categoriesBySlug,
        fallbackLabel: '跑步鞋',
      }),
    ).toBe('Chaussures de course');
  });

  it('falls back to provided label when slug is missing', () => {
    expect(
      resolveLocalizedCategoryLabel({
        slug: 'unknown-category',
        locale: 'en',
        categoriesBySlug: new Map(),
        fallbackLabel: 'Fallback Label',
      }),
    ).toBe('Fallback Label');
  });
});
