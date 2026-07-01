'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { fetcher } from '@/lib/api';
import {
  buildCategorySlugMap,
  normalizeCategoriesResponse,
  resolveLocalizedCategoryLabel,
  type CategoriesResponse,
} from '@/lib/category-labels';

export function useCategoryLabelResolver() {
  const locale = useLocale();
  const { data } = useSWR<CategoriesResponse>(
    '/categories?flat=true&includeLegacy=true',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60 * 60 * 1000,
    },
  );

  const categoriesBySlug = useMemo(
    () => buildCategorySlugMap(normalizeCategoriesResponse(data)),
    [data],
  );

  const getCategoryLabel = useCallback(
    (slug: string, fallbackLabel?: string | null) =>
      resolveLocalizedCategoryLabel({
        slug,
        locale,
        categoriesBySlug,
        fallbackLabel,
      }),
    [categoriesBySlug, locale],
  );

  return {
    categoriesBySlug,
    getCategoryLabel,
  };
}
