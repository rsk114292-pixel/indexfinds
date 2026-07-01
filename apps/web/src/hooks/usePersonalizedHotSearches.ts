'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export interface PersonalizedHotSearchItem {
  keyword: string;
  count: number;
}

const PERSONALIZED_HOT_SEARCHES_KEY =
  '/products/hot-searches/personalized?limit=10';
const HOT_SEARCHES_SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 300000,
} as const;

interface UsePersonalizedHotSearchesOptions {
  enabled?: boolean;
  limit?: number;
}

export function usePersonalizedHotSearches({
  enabled = true,
  limit = 10,
}: UsePersonalizedHotSearchesOptions = {}) {
  const { data, error, isLoading } = useSWR<PersonalizedHotSearchItem[]>(
    enabled ? PERSONALIZED_HOT_SEARCHES_KEY : null,
    fetcher,
    HOT_SEARCHES_SWR_OPTIONS,
  );

  const items = useMemo(() => {
    if (!data?.length) {
      return [];
    }

    return data.slice(0, limit);
  }, [data, limit]);

  return {
    items,
    error,
    isLoading,
  };
}
