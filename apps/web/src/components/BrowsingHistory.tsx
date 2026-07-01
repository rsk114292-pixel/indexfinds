/**
 * 浏览历史组件
 * 显示用户最近浏览的商品，支持清空历史
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { App } from "antd";
import { History, Trash2, Settings } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Empty } from "@/components/ui";
import {
  getBrowsingHistory,
  clearBrowsingHistory,
  getUserPreferences,
  getHistoryMaxSize,
  setHistoryMaxSize,
  syncFromServer,
  type BrowsingHistoryItem,
} from "@/lib/browsing-history";
import { getImageReferrerPolicy, getProductCardThumbnail } from "@/lib/image-utils";
import { fetcher } from "@/lib/api";
import { formatPrice, convertPrice } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import type { Product } from "@/types";
import { buildReturnTo, withReturnTo } from "@/lib/return-to";
import { saveReturnScroll } from "@/lib/return-scroll";

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp: number, t: (key: string, values?: Record<string, string | number | Date>) => string, locale: string): string {
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
  return new Date(timestamp).toLocaleDateString(locale);
}

export default function BrowsingHistory() {
  const t = useTranslations('account');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const { message } = App.useApp();
  const [history, setHistory] = useState<BrowsingHistoryItem[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [maxSize, setMaxSize] = useState(50);

  // 加载浏览历史：已登录时从服务端同步，否则从 localStorage 读取
  useEffect(() => {
    setMaxSize(getHistoryMaxSize());

    syncFromServer()
      .then((items) => {
        setHistory(items);
        setProductIds(items.map((item) => item.productId));
      })
      .catch(() => {
        const items = getBrowsingHistory();
        setHistory(items);
        setProductIds(items.map((item) => item.productId));
      });
  }, []);

  // 处理最大记录数变更
  const handleMaxSizeChange = (value: number) => {
    setHistoryMaxSize(value);
    setMaxSize(value);
    message.success(t('historyLimitSet', { value }));
  };

  // 根据 productIds 批量获取商品详情
  const { data: productsData, mutate } = useSWR<{ data: Product[] }>(
    productIds.length > 0
      ? `/products?ids=${productIds.join(",")}&limit=${maxSize}`
      : null,
    fetcher,
  );

  // 合并浏览历史和商品数据
  const products =
    productsData?.data?.map((product) => {
      const historyItem = history.find((h) => h.productId === product.id);
      return {
        ...product,
        viewedAt: historyItem?.viewedAt || 0,
      };
    }) || [];

  // 按浏览时间排序
  const sortedProducts = products.sort((a, b) => b.viewedAt - a.viewedAt);

  // 清空历史
  const handleClearHistory = () => {
    clearBrowsingHistory();
    setHistory([]);
    setProductIds([]);
    mutate();
    message.success(t('historyCleared'));
  };

  // 获取用户偏好
  const preferences = getUserPreferences();
  const returnTo = buildReturnTo(pathname, searchParams);

  return (
    <div className="bg-surface rounded-lg border border-border">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-muted" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">{t('browsingHistory')}</h3>
          <span className="text-sm font-normal text-muted">
            ({history.length}/{maxSize})
          </span>
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
              aria-label={t('historyLimitLabel')}
              className="min-h-[44px] pl-7 pr-3 rtl:pl-3 rtl:pr-7 text-sm bg-surface border border-border rounded-md
                         cursor-pointer transition-colors duration-200
                         hover:border-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={50}>{t('itemsOption', { count: 50 })}</option>
              <option value={100}>{t('itemsOption', { count: 100 })}</option>
            </select>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              aria-label={t('clearHistoryLabel')}
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

      {/* Card body */}
      <div className="p-4">
        {history.length === 0 ? (
          <Empty
            title={t('noBrowsingHistory')}
            className="py-8"
          />
        ) : (
          <>
            {/* 偏好统计 */}
            {preferences.historyCount > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted">
                  {t('yourPreferences')}
                  {preferences.preferredBrandSlugs.length > 0 && (
                    <span className="ml-2 rtl:mr-2 rtl:ml-0">
                      {t('prefBrands', { brands: preferences.preferredBrandSlugs.slice(0, 3).join(", ") })}
                    </span>
                  )}
                  {preferences.preferredCategorySlugs.length > 0 && (
                    <span className="ml-2 rtl:mr-2 rtl:ml-0">
                      {t('prefCategories', { categories: preferences.preferredCategorySlugs.slice(0, 3).join(", ") })}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* 商品列表 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sortedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={withReturnTo(`/products/${product.slug}`, returnTo)}
                  onClick={() => saveReturnScroll(returnTo)}
                >
                  <div className="group cursor-pointer">
                    {/* 商品图片 */}
                    <div className="relative aspect-square mb-2 overflow-hidden rounded-lg bg-gray-100">
                      {product.images && product.images[0] ? (
                        <Image
                          src={getProductCardThumbnail(product.images[0])}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          referrerPolicy={getImageReferrerPolicy(getProductCardThumbnail(product.images[0]))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {t('noImage')}
                        </div>
                      )}
                    </div>

                    {/* 商品信息 */}
                    <div>
                      <p
                        className="text-sm text-foreground line-clamp-2 group-hover:text-blue-600 transition-colors duration-200"
                        title={product.title}
                      >
                        {product.title}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-semibold text-red-600">
                          {product.priceMin != null ? formatPrice(convertPrice(Number(product.priceMin), product.currency || 'CNY', displayCurrency, rates), displayCurrency) : '-'}
                        </span>
                        <span className="text-xs text-muted">
                          {formatRelativeTime(product.viewedAt, t, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted">
                {t('historySaved', { max: maxSize })}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
