'use client';

import { X } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MULTI_SELECT_FILTER_KEYS } from '@/components/filters/constants';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { convertPrice } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

type FilterLabelKey =
  | 'category'
  | 'brand'
  | 'color'
  | 'gender'
  | 'style'
  | 'season'
  | 'occasions'
  | 'minPrice'
  | 'maxPrice';

const FILTER_LABEL_KEYS: Record<string, FilterLabelKey> = {
  categories: 'category',
  brands: 'brand',
  colors: 'color',
  genders: 'gender',
  styles: 'style',
  seasons: 'season',
  occasions: 'occasions',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
};



/**
 * 移动端已选筛选标签条
 *
 * 线框：
 * ┌──────────────────────────────────┐
 * │ [品牌:Nike ✕] [颜色:Red ✕] [清空] │  ← 横向滚动
 * └──────────────────────────────────┘
 *
 * - 横向可滚动，超出隐藏
 * - 每个标签可单独删除
 * - 最右侧有"清空"按钮
 * - 无筛选时不渲染
 */
export default function MobileActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('filter');
  const { currency, rates } = useCurrencyStore();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const toDisplay = (v: number) => Math.round(convertPrice(v, 'CNY', currency, rates));

  // 解析已选筛选
  const activeFilters: Array<{ key: string; value: string; label: string }> = [];

  MULTI_SELECT_FILTER_KEYS.forEach((param) => {
    const value = searchParams.get(param);
    if (value) {
      value.split(',').forEach((v) => {
        const labelKey = FILTER_LABEL_KEYS[param];
        activeFilters.push({
          key: param,
          value: v,
          label: `${t(labelKey)}: ${v}`,
        });
      });
    }
  });

  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  if (minPrice) {
    activeFilters.push({
      key: 'minPrice',
      value: minPrice,
      label: `${t('minPrice')}: ${symbol}${toDisplay(Number(minPrice))}`,
    });
  }
  if (maxPrice) {
    activeFilters.push({
      key: 'maxPrice',
      value: maxPrice,
      label: `${t('maxPrice')}: ${symbol}${toDisplay(Number(maxPrice))}`,
    });
  }

  if (activeFilters.length === 0) return null;

  const handleRemove = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if ((MULTI_SELECT_FILTER_KEYS as readonly string[]).includes(key)) {
      const current = params.get(key)?.split(',') || [];
      const updated = current.filter((v) => v !== value);
      if (updated.length > 0) {
        params.set(key, updated.join(','));
      } else {
        params.delete(key);
      }
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    [...MULTI_SELECT_FILTER_KEYS, 'minPrice', 'maxPrice'].forEach((p) => {
      params.delete(p);
    });
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
      {activeFilters.map((filter, index) => (
        <span
          key={`${filter.key}-${filter.value}-${index}`}
          className="inline-flex items-center gap-1 shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-foreground"
        >
          {filter.label}
          <button
            type="button"
            aria-label={t('removeFilter', { label: filter.label })}
            onClick={() => handleRemove(filter.key, filter.value)}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 transition-colors duration-150"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={handleClearAll}
        className="shrink-0 text-xs text-primary active:opacity-70 transition-opacity duration-150"
      >
        {t('clearAll')}
      </button>
    </div>
  );
}
