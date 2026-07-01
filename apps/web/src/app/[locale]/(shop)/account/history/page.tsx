'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Trash2, Settings } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import Image from 'next/image';
import { getImageReferrerPolicy, getImageVariant } from '@/lib/image-utils';
import useSWR from 'swr';
import { Empty } from '@/components/ui';
import {
  getBrowsingHistory,
  clearBrowsingHistory,
  pruneInactiveHistory,
  getUserPreferences,
  getHistoryMaxSize,
  setHistoryMaxSize,
  type BrowsingHistoryItem,
} from '@/lib/browsing-history';
import { fetcher } from '@/lib/api';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';
import type { Product } from '@/types';

export default function AccountHistoryPage() {
  const t = useTranslations('account');
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const returnTo = useMemo(() => buildReturnTo(pathname, searchParams), [pathname, searchParams]);
  const loginHref = useMemo(
    () => buildLoginHref(buildAuthRedirectPath(pathname, searchParams)),
    [pathname, searchParams],
  );

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    if (hours < 24) return t('hoursAgo', { count: hours });
    if (days < 7) return t('daysAgo', { count: days });
    return new Date(timestamp).toLocaleDateString();
  };
  const [history, setHistory] = useState<BrowsingHistoryItem[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [maxSize, setMaxSize] = useState(50);

  useEffect(() => {
    const items = getBrowsingHistory();
    setHistory(items);
    setProductIds(items.map((item) => item.productId));
    setMaxSize(getHistoryMaxSize());
  }, []);

  const handleMaxSizeChange = (value: number) => {
    setHistoryMaxSize(value);
    setMaxSize(value);
    message.success(t('historyLimitSet', { value }));
  };

  const { data: productsData, mutate } = useSWR<{ data: Product[] }>(
    productIds.length > 0
      ? `/products?ids=${productIds.join(',')}&limit=${maxSize}`
      : null,
    fetcher,
  );

  // API 返回后自动清理已失效的记录
  useEffect(() => {
    if (productsData?.data && productsData.data.length < history.length) {
      const activeIds = productsData.data.map((p) => p.id);
      const pruned = pruneInactiveHistory(activeIds);
      setHistory(pruned);
      setProductIds(pruned.map((item) => item.productId));
    }
  }, [productsData]); // eslint-disable-line react-hooks/exhaustive-deps

  const products =
    productsData?.data?.map((product) => {
      const historyItem = history.find((h) => h.productId === product.id);
      return { ...product, viewedAt: historyItem?.viewedAt || 0 };
    }) || [];

  const sortedProducts = products.sort((a, b) => b.viewedAt - a.viewedAt);

  const handleClearHistory = () => {
    clearBrowsingHistory();
    setHistory([]);
    setProductIds([]);
    mutate();
    message.success(t('historyCleared'));
  };

  const preferences = getUserPreferences();

  return (
    <div className="space-y-4">
      {/* 移动端子页面顶栏 */}
      <MobileSubPageHeader title={t('browsingHistory')} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('browsingHistory')}</h2>
          <p className="text-sm text-muted">
            {t('historyCount', { count: sortedProducts.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center">
            <Settings
              className="absolute left-2 rtl:right-2 rtl:left-auto w-3.5 h-3.5 text-muted pointer-events-none"
              aria-hidden="true"
            />
            <select
              value={maxSize}
              onChange={(e) => handleMaxSizeChange(Number(e.target.value))}
              aria-label="History limit"
              className="min-h-[44px] pl-7 pr-3 rtl:pl-3 rtl:pr-7 text-sm bg-surface border border-border rounded-md
                         cursor-pointer transition-colors duration-200
                         hover:border-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label="Clear browsing history"
              className="inline-flex items-center gap-1 min-h-[44px] px-3 text-sm text-red-600
                         cursor-pointer transition-colors duration-200
                         hover:bg-red-50 rounded-md"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>{t('clear')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Preferences */}
      {preferences.historyCount > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-muted">
            {t('yourPreferences')}
            {preferences.preferredBrandSlugs.length > 0 && (
              <span className="ml-2 rtl:mr-2 rtl:ml-0">
                {t('prefBrands', { brands: preferences.preferredBrandSlugs.slice(0, 3).join(', ') })}
              </span>
            )}
            {preferences.preferredCategorySlugs.length > 0 && (
              <span className="ml-2 rtl:mr-2 rtl:ml-0">
                {t('prefCategories', { categories: preferences.preferredCategorySlugs.slice(0, 3).join(', ') })}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Product grid */}
      {history.length === 0 ? (
        <Empty title={t('noBrowsingHistory')} className="py-12" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedProducts.map((product) => (
              <Link
                key={product.id}
                href={withReturnTo(`/products/${product.slug}`, returnTo)}
                onClick={() => saveReturnScroll(returnTo)}
              >
                <div className="group cursor-pointer">
                  <div className="relative aspect-square mb-2 overflow-hidden rounded-lg bg-gray-100">
                    {product.images && product.images[0] ? (
                      <Image
                        src={getImageVariant(product.images[0], 300)}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        referrerPolicy={getImageReferrerPolicy(getImageVariant(product.images[0], 300))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {t('noImage')}
                      </div>
                    )}
                  </div>
                  <div>
                    <p
                      className="text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200"
                      title={product.title}
                    >
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-primary">
                        ¥{product.priceMin}
                      </span>
                      <span className="text-xs text-muted">
                        {formatRelativeTime(product.viewedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-border text-center">
            <p className="text-xs text-muted">
              {t('historySaved', { max: maxSize })}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
