'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { ProductListItem } from '@/types';

interface RecommendationResponse {
  data: ProductListItem[];
  meta: { count: number; algorithm: string };
}

export function useCompleteTheLook(productId: string, limit = 12) {
  const { data, isLoading } = useSWR<RecommendationResponse>(
    productId
      ? `/products/${productId}/recommendations/complete-the-look?limit=${limit}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  return {
    products: data?.data || [],
    isLoading,
    algorithm: data?.meta?.algorithm,
  };
}

export function useSimilarProducts(productId: string, limit = 12) {
  const { data, isLoading } = useSWR<RecommendationResponse>(
    productId
      ? `/products/${productId}/recommendations/similar?limit=${limit}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  return {
    products: data?.data || [],
    isLoading,
    algorithm: data?.meta?.algorithm,
  };
}
