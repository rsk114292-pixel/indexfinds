'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { AutoComplete, Input } from 'antd';
import { Search, Clock, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchSearchSuggestions, type SearchSuggestions } from '@/lib/search';
import { useCategoryLabelResolver } from '@/hooks/useCategoryLabelResolver';
import type { DefaultOptionType } from 'antd/es/select';
import { useTranslations, useLocale } from 'next-intl';
import { getImageReferrerPolicy, getImageVariant } from '@/lib/image-utils';
import {
  getSearchHistory as loadSearchHistory,
  saveSearchHistory,
  removeSearchHistoryItem,
  clearSearchHistory,
} from '@/lib/search-history';
import { useSearchParams } from 'next/navigation';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { usePersonalizedHotSearches } from '@/hooks/usePersonalizedHotSearches';

// 动态导入，禁用 SSR 以避免 hydration 不匹配
const ImageSearchUploader = dynamic(() => import('./ImageSearchUploader'), {
  ssr: false,
});

interface SearchBoxProps {
  /** large: Hero 区域放大样式；default: header 紧凑分段搜索框 */
  size?: 'default' | 'large';
}

export default function SearchBox({ size = 'default' }: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('search');
  const tc = useTranslations('common');
  const th = useTranslations('header');
  const locale = useLocale();
  const { getCategoryLabel } = useCategoryLabelResolver();
  const returnTo = useMemo(() => buildReturnTo(pathname, searchParams), [pathname, searchParams]);
  const [searchValue, setSearchValue] = useState('');
  const hasSearchValue = searchValue.trim().length > 0;
  const [options, setOptions] = useState<DefaultOptionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [shouldLoadHotSearches, setShouldLoadHotSearches] = useState(false);

  // 获取热搜词（个性化）
  const { items: hotSearches } = usePersonalizedHotSearches({
    enabled: shouldLoadHotSearches,
    limit: 3,
  });

  // 从localStorage读取搜索历史（按用户隔离）
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadSearchHistory());

  // 防抖处理
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // 排名徽章颜色：#1 红、#2 橙、#3 黄，其余灰
  const rankBadgeClass = (index: number) => {
    const colors = [
      'bg-red-500 text-white',
      'bg-orange-500 text-white',
      'bg-amber-400 text-white',
    ];
    return colors[index] || 'bg-gray-200 text-gray-500';
  };

  // 删除单条搜索历史
  const removeFromHistory = useCallback((query: string) => {
    const updated = removeSearchHistoryItem(query);
    setSearchHistory(updated);
  }, []);

  // 清除全部搜索历史
  const clearAllHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  // 搜索框为空时的默认选项（热搜 + 历史）
  const defaultOptions = useMemo(() => {
    const groups: DefaultOptionType[] = [];
    const hotKeywords = new Set<string>();

    // 热搜词（排在前面）
    if (hotSearches && hotSearches.length > 0) {
      hotSearches.forEach(item => hotKeywords.add(item.keyword));
      groups.push({
        label: <div className="font-semibold text-gray-500">{t('hotSearches')}</div>,
        options: hotSearches.map((item, index) => ({
          key: `hot_${item.keyword}`,
          value: item.keyword,
          label: (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${rankBadgeClass(index)}`}
              >
                {index + 1}
              </span>
              <span className={index === 0 ? 'font-semibold' : ''}>{item.keyword}</span>
            </div>
          ),
          type: 'history',
        })),
      });
    }

    // 搜索历史（排除已在热搜中出现的词，限制 5 条）
    const filteredHistory = searchHistory.filter(q => !hotKeywords.has(q)).slice(0, 5);
    if (filteredHistory.length > 0) {
      groups.push({
        label: (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-500">{t('searchHistory')}</span>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAllHistory();
              }}
            >
              {tc('clearAll')}
            </button>
          </div>
        ),
        options: filteredHistory.map(query => ({
          key: `history_${query}`,
          value: query,
          label: (
            <div className="flex items-center justify-between group/item">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span className="truncate">{query}</span>
              </div>
              <button
                type="button"
                className="opacity-0 group-hover/item:opacity-100 p-0.5 text-gray-300 hover:text-red-500 cursor-pointer transition-all"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFromHistory(query);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ),
          type: 'history',
        })),
      });
    }

    return groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchHistory, hotSearches]);

  // 格式化搜索建议为Ant Design的选项格式
  const formatSuggestions = useCallback((data: SearchSuggestions): DefaultOptionType[] => {
    const formatted: DefaultOptionType[] = [];

    // 品牌建议
    if (data.brands && data.brands.length > 0) {
      formatted.push({
        label: <div className="font-semibold text-gray-500">{t('brands')}</div>,
        options: data.brands.map(brand => ({
          value: brand.slug,
          label: (
            <div className="flex items-center justify-between">
              <span className="font-medium">{brand.name}</span>
              {brand.productCount !== undefined && (
                <span className="text-gray-400 text-sm">{t('itemCount', { count: brand.productCount })}</span>
              )}
            </div>
          ),
          type: 'brand',
          slug: brand.slug,
        })),
      });
    }

    // 分类建议
    if (data.categories.length > 0) {
      formatted.push({
        label: <div className="font-semibold text-gray-500">{t('categories')}</div>,
        options: data.categories.map(category => ({
          value: category.slug,
          label: (
            <div className="flex items-center justify-between">
              <span>
                <strong>{getCategoryLabel(
                  category.slug,
                  locale === 'zh' ? (category.chineseName || category.name) : category.name,
                )}</strong>{' '}
                {locale === 'zh' ? (category.chineseName !== category.name ? category.name : '') : (category.chineseName || '')}
              </span>
              {category.productCount !== undefined && (
                <span className="text-gray-400 text-sm">{t('productCount', { count: category.productCount })}</span>
              )}
            </div>
          ),
          type: 'category',
          slug: category.slug,
        })),
      });
    }

    // 商品建议
    if (data.products.length > 0) {
      formatted.push({
        label: <div className="font-semibold text-gray-500">{t('products')}</div>,
        options: data.products.map(product => ({
          value: product.slug,
          label: (
            <div className="flex items-center gap-2">
              {product.images?.[0] && (
                 
                <img
                  src={getImageVariant(product.images[0], 80)}
                  alt={product.title}
                  className="w-10 h-10 object-cover rounded"
                  referrerPolicy={getImageReferrerPolicy(getImageVariant(product.images[0], 80))}
                />
              )}
              <div className="flex-1">
                <div className="font-medium">{product.title}</div>
                <div className="text-sm text-gray-500">{product.chineseTitle}</div>
              </div>
            </div>
          ),
          type: 'product',
          slug: product.slug,
        })),
      });
    }

    return formatted;
  }, [getCategoryLabel, locale, t]);

  // 当防抖后的搜索词变化时，获取建议
  useEffect(() => {
    const controller = new AbortController();

    const loadSuggestions = async () => {
      if (!debouncedSearchValue || debouncedSearchValue.length < 2) {
        if (!debouncedSearchValue) {
          setOptions(prev => (prev === defaultOptions ? prev : defaultOptions));
        } else {
          setOptions(prev => (prev.length === 0 ? prev : []));
        }
        return;
      }

      setLoading(true);
      try {
        const data = await fetchSearchSuggestions(debouncedSearchValue);
        if (controller.signal.aborted) return;
        const formattedOptions = formatSuggestions(data);
        setOptions(formattedOptions);
      } catch {
        if (controller.signal.aborted) return;
        setOptions(prev => (prev.length === 0 ? prev : []));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSuggestions();
    return () => controller.abort();
  }, [debouncedSearchValue, defaultOptions, formatSuggestions]);

  // 选择建议项
  const handleSelect = (value: string, option: DefaultOptionType) => {
    const type = option.type as string;
    const slug = option.slug as string;

    switch (type) {
      case 'brand':
        // 跳转到搜索页面，按品牌筛选
        router.push(`/search?q=${encodeURIComponent(slug)}&brands=${slug}`);
        break;
      case 'category':
        router.push(`/categories/${slug}`);
        break;
      case 'product':
        saveReturnScroll(returnTo);
        router.push(withReturnTo(`/products/${slug}`, returnTo));
        break;
      case 'history':
        // 从历史记录搜索
        handleSearch(value);
        return;
      default:
        // 默认执行搜索
        handleSearch(value);
    }

    setSearchValue('');
    setOptions([]);
  };

  // 保存搜索历史
  const saveToHistory = (query: string) => {
    const updated = saveSearchHistory(query);
    setSearchHistory(updated);
  };

  // 执行搜索（按回车或点击搜索按钮）
  const handleSearch = (value: string) => {
    if (value.trim()) {
      saveToHistory(value.trim());
      router.push(`/search?q=${encodeURIComponent(value)}`);
      setSearchValue('');
      setOptions([]);
    }
  };

  const autoComplete = (
    <AutoComplete
      value={searchValue}
      options={options}
      onSelect={handleSelect}
      onSearch={setSearchValue}
      onChange={setSearchValue}
      notFoundContent={loading ? t('searching') : debouncedSearchValue.length >= 2 ? t('noResults') : null}
      rootClassName={size === 'default' ? 'header-search-autocomplete' : 'hero-search-autocomplete'}
      classNames={{
        popup: {
          root:
            size === 'large'
              ? 'search-suggestions-dropdown hero-search-suggestions-dropdown'
              : 'search-suggestions-dropdown',
        },
      }}
      style={{ width: '100%' }}
      listHeight={400}
    >
      <Input
        size={size === 'large' ? 'large' : 'middle'}
        placeholder={t('placeholder')}
        prefix={<Search className="w-4 h-4 text-gray-400" />}
        className={size === 'large' ? 'hero-search-input' : ''}
        onFocus={() => setShouldLoadHotSearches(true)}
        onKeyDown={(e) => {
          // 按 Enter 时直接执行搜索，阻止 AutoComplete 的默认选择行为
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSearch(searchValue);
          }
        }}
      />
    </AutoComplete>
  );

  if (size === 'large') {
    return (
      <div className="hero-command-bar relative overflow-visible rounded-[30px] p-[1.5px] md:rounded-full">
        <div aria-hidden className="hero-command-ambient" />
        <div aria-hidden className="hero-command-rim" />
        <div className="hero-command-bar-panel flex flex-col gap-2 overflow-hidden rounded-[28px] p-2 md:flex-row md:items-stretch md:rounded-full">
          <div className="hero-command-input min-w-0 flex-1 rounded-[22px] md:rounded-full">
            {autoComplete}
          </div>

          <div className="flex shrink-0 items-center gap-2 md:pr-1">
            <button
              type="button"
              onClick={() => handleSearch(searchValue)}
              className="hero-command-search inline-flex h-11 min-w-[96px] items-center justify-center rounded-full px-5 text-sm font-semibold"
              disabled={!hasSearchValue}
            >
              {th('search')}
            </button>
            <ImageSearchUploader
              variant="icon"
              className="hero-command-camera h-11 w-11 rounded-full text-white/80 shadow-none"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="header-command-bar flex w-full items-center gap-2 rounded-[26px] px-2 py-1.5">
      <div className="header-command-input min-w-0 flex-1 rounded-[22px]">
        {autoComplete}
      </div>

      <button
        type="button"
        onClick={() => handleSearch(searchValue)}
        disabled={!hasSearchValue}
        className="header-command-search inline-flex h-10 min-w-[72px] xl:min-w-[84px] items-center justify-center rounded-[20px] px-3.5 xl:px-4 text-sm font-semibold"
      >
        {th('search')}
      </button>

      <div className="hidden xl:block" onMouseDown={(e) => e.stopPropagation()}>
        <ImageSearchUploader
          variant="icon"
          className="header-command-camera h-10 w-10 rounded-[20px] p-0"
        />
      </div>
    </div>
  );
}
