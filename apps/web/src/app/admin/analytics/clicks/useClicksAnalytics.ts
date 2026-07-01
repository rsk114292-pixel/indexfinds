'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { get } from '@/lib/api';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import type { ClicksAnalyticsFilters, ClicksData } from './types';

export const CLICKS_ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;

export function buildClicksAnalyticsCacheKey({
  dateRange,
  page,
  pageSize,
  sourceFilter,
  platformFilter,
  productKeyword,
  scope,
}: ClicksAnalyticsFilters): string {
  return [
    'admin:analytics:clicks:v2',
    dateRange[0].format('YYYY-MM-DD'),
    dateRange[1].format('YYYY-MM-DD'),
    `page=${page}`,
    `limit=${pageSize}`,
    `source=${sourceFilter || ''}`,
    `platform=${platformFilter || ''}`,
    `product=${productKeyword || ''}`,
    `scope=${scope}`,
  ].join(':');
}

interface UseClicksAnalyticsOptions extends ClicksAnalyticsFilters {
  isReady: boolean;
}

export function useClicksAnalytics({
  dateRange,
  page,
  pageSize,
  sourceFilter,
  platformFilter,
  productKeyword,
  scope,
  isReady,
}: UseClicksAnalyticsOptions) {
  const [data, setData] = useState<ClicksData | null>(null);
  const [loading, setLoading] = useState(true);

  const cacheKey = useMemo(
    () =>
      buildClicksAnalyticsCacheKey({
        dateRange,
        page,
        pageSize,
        sourceFilter,
        platformFilter,
        productKeyword,
        scope,
      }),
    [dateRange, page, pageSize, platformFilter, productKeyword, scope, sourceFilter],
  );

  useEffect(() => {
    const cached = readSessionCache<ClicksData>(
      cacheKey,
      CLICKS_ANALYTICS_CACHE_TTL_MS,
    );
    if (!cached) return;

    setData(cached);
    setLoading(false);
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endOfDay = dateRange[1].endOf('day');
      const result = await get<ClicksData>('/admin/analytics/clicks', {
        startDate: dateRange[0].toISOString(),
        endDate: endOfDay.toISOString(),
        page,
        limit: pageSize,
        source: sourceFilter || undefined,
        platform: platformFilter || undefined,
        productKeyword: productKeyword || undefined,
        scope,
      });
      setData(result);
      writeSessionCache(cacheKey, result);
    } catch {
      // 加载失败时由页面显示空态
    } finally {
      setLoading(false);
    }
  }, [
    cacheKey,
    dateRange,
    page,
    pageSize,
    platformFilter,
    productKeyword,
    scope,
    sourceFilter,
  ]);

  useEffect(() => {
    if (!isReady) return;
    void fetchData();
  }, [fetchData, isReady]);

  return {
    cacheKey,
    data,
    loading,
  };
}
