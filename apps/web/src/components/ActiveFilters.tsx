'use client';

/**
 * 已选筛选条件标签组件
 * 展示当前已选的筛选条件，支持单个删除和清除全部
 */
import { X } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MULTI_SELECT_FILTER_KEYS } from '@/components/filters/constants';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { convertPrice } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface ActiveFiltersProps {
  className?: string;
}

// Translation key mapping for filter params
type FilterLabelKey = 'category' | 'brand' | 'color' | 'gender' | 'style' | 'season' | 'occasions' | 'minPrice' | 'maxPrice';

const FILTER_LABEL_KEYS: Record<string, FilterLabelKey> = {
  categories: 'category',
  brands: 'brand',
  colors: 'color',
  genders: 'gender',
  styles: 'style',
  occasions: 'occasions',
  seasons: 'season',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
};

export default function ActiveFilters({ className }: ActiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('filter');
  const { currency, rates } = useCurrencyStore();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const toDisplay = (v: number) => Math.round(convertPrice(v, 'CNY', currency, rates));

  // 解析当前的筛选条件
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

  // 价格筛选
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

  // 如果没有筛选条件，不渲染
  if (activeFilters.length === 0) {
    return null;
  }

  // 移除单个筛选条件
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

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // 清除所有筛选
  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    [...MULTI_SELECT_FILTER_KEYS, 'minPrice', 'maxPrice'].forEach((p) => {
      params.delete(p);
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      <span className="text-gray-500 text-sm">{t('filtersLabel')}</span>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter, index) => (
          <span
            key={`${filter.key}-${filter.value}-${index}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-foreground"
          >
            {filter.label}
            <button
              type="button"
              aria-label={t('removeFilter', { label: filter.label })}
              onClick={() => handleRemove(filter.key, filter.value)}
              className="ml-0.5 rtl:mr-0.5 rtl:ml-0 inline-flex h-[44px] min-w-[44px] items-center justify-center -my-1 -mr-1 rtl:-ml-1 rtl:mr-0 rounded-full cursor-pointer transition-colors duration-200 hover:bg-gray-200"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground cursor-pointer transition-colors duration-200 hover:bg-gray-200 hover:text-foreground"
        >
          {t('clearAll')}
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
