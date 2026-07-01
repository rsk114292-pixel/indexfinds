'use client';

/**
 * useUrlState - 将状态同步到 URL search params
 * 刷新页面后自动恢复筛选条件
 */
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type ParamValue = string | number | undefined;

interface UseUrlStateOptions {
  /** 不同步到 URL 的 key（保留在 URL 中但由外部管理，如 'tab'） */
  preserveKeys?: string[];
}

/**
 * 从 URL search params 读取/写入状态
 *
 * @example
 * const { params, setParams } = useUrlState({ page: 1, limit: 20, search: '' });
 * // URL: ?page=2&search=nike → params = { page: 2, limit: 20, search: 'nike' }
 */
export function useUrlState<T extends Record<string, ParamValue>>(
  defaults: T,
  options?: UseUrlStateOptions,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preserveKeys = useMemo(() => options?.preserveKeys ?? [], [options?.preserveKeys]);

  // 从 URL 读取当前状态，未设置的 key 使用默认值
  const params = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        const defaultVal = defaults[key];
        if (typeof defaultVal === 'number') {
          const num = Number(urlValue);
          (result as Record<string, ParamValue>)[key] = isNaN(num) ? defaultVal : num;
        } else {
          (result as Record<string, ParamValue>)[key] = urlValue;
        }
      }
    }
    return result;
  }, [defaults, searchParams]);

  // 更新 URL search params
  const setParams = useCallback(
    (updates: Partial<T>) => {
      const next = new URLSearchParams();

      // 保留外部管理的 keys
      for (const key of preserveKeys) {
        const val = searchParams.get(key);
        if (val !== null) next.set(key, val);
      }

      // 合并当前值和更新值
      const merged = { ...params, ...updates };
      for (const [key, value] of Object.entries(merged)) {
        if (preserveKeys.includes(key)) continue;
        // 跳过默认值和空值，保持 URL 简洁
        if (value === undefined || value === '' || value === defaults[key]) continue;
        next.set(key, String(value));
      }

      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [params, defaults, preserveKeys, searchParams, pathname, router],
  );

  return { params, setParams };
}
