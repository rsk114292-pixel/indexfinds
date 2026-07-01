'use client';

import { useState, useCallback } from 'react';

/**
 * 轻量 API 请求 Hook，封装 loading/error 状态
 * 基于 @/lib/api 的请求函数使用
 *
 * @example
 * const { execute, loading, error } = useApiRequest(
 *   () => post<Product>('/products', formData)
 * );
 * await execute();
 */
export function useApiRequest<T>(apiFn: () => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn();
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return { execute, loading, error };
}
