/**
 * 以图搜图结果页
 * URL: /search/visual
 *
 * CSS 双 div 分发（模式 B）：
 * - PC 端：hidden lg:block → Upload + FilterSidebar + 商品网格（与搜索页同布局）
 * - 移动端：lg:hidden → MobileVisualSearch（原生文件选择器 + 筛选 + MobileProductCard）
 *
 * 筛选方案：客户端筛选（50 条结果本地聚合 facets、本地过滤排序，不发额外 API 请求）
 */
'use client';

import { API_BASE_URL } from '@/lib/constants';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, App } from 'antd';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import type { RcFile } from 'antd/es/upload';
import { Camera, X, RefreshCw, Inbox, Clipboard, Scissors, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import ProductCard from '@/components/ProductCard';
import ImageCropper from '@/components/ImageCropper';
import { BrandFilter } from '@/components/filters/BrandFilter';
import { ColorFilter } from '@/components/filters/ColorFilter';
import { TagFilter } from '@/components/filters/TagFilter';
import { PriceRangeFilter } from '@/components/filters/PriceRangeFilter';
import { useVisualSearchFilters, type VisualSearchSortBy } from '@/hooks/useVisualSearchFilters';
import { useCategoryLabelResolver } from '@/hooks/useCategoryLabelResolver';
import MobileVisualSearch from '../components/mobile/MobileVisualSearch';
import MobileProductBasedVisualSearch from '../components/mobile/MobileProductBasedVisualSearch';
import { fetcher } from '@/lib/api';
import {
  DESKTOP_PRODUCT_GRID_CLASS,
  DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS,
  DESKTOP_PRODUCT_SIDEBAR_CLASS,
} from '@/lib/product-list-layout';
import {
  mapVisualSearchResults,
  type VisualSearchResultItem,
} from '../components/visualSearchShared';

export default function VisualSearchPageClient() {
  return (
    <Suspense fallback={<div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} flex justify-center py-8`}><Spinner size="lg" /></div>}>
      <VisualSearchContent />
    </Suspense>
  );
}

function VisualSearchContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');

  if (productId) {
    return (
      <>
        <div className="hidden lg:block">
          <ProductBasedVisualSearch productId={productId} />
        </div>
        <div className="lg:hidden">
          <MobileProductBasedVisualSearch productId={productId} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <DesktopVisualSearch />
      </div>
      <div className="lg:hidden">
        <MobileVisualSearch />
      </div>
    </>
  );
}

/* ================================================================== */
/*  基于商品 ID 的视觉搜索                                              */
/* ================================================================== */

function ProductBasedVisualSearch({ productId }: { productId: string }) {
  const t = useTranslations('visualSearch');

  const { data, isLoading } = useSWR<{ results: VisualSearchResultItem[]; total: number }>(
    `/visual-search/by-product/${productId}?limit=50&minSimilarity=25`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  const allProducts = useMemo(
    () => mapVisualSearchResults(data?.results || []),
    [data?.results],
  );
  const filters = useVisualSearchFilters(allProducts);

  return (
    <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Camera className="w-6 h-6" />
          {t('title')}
        </h2>
        <p className="text-muted">
          {isLoading ? t('searching') : t('resultsCount', { count: allProducts.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : allProducts.length > 0 ? (
        <VisualSearchResultsLayout filters={filters} />
      ) : (
        <Empty title={t('noResults')} description={t('noResultsHint')} />
      )}
    </div>
  );
}

/* ================================================================== */
/*  PC 端上传图片以图搜图                                               */
/* ================================================================== */

function DesktopVisualSearch() {
  const { message } = App.useApp();
  const t = useTranslations('visualSearch');
  const [loading, setLoading] = useState(false);
  const [searchImage, setSearchImage] = useState<string | null>(null);
  const [results, setResults] = useState<VisualSearchResultItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  // sessionStorage 恢复
  useEffect(() => {
    const savedImage = sessionStorage.getItem('visualSearchImage');
    const savedResults = sessionStorage.getItem('visualSearchResults');
    if (savedImage && savedResults) {
      setSearchImage(savedImage);
      try { setResults(JSON.parse(savedResults)); } catch { /* ignore */ }
    }
    setInitialized(true);
  }, []);

  const performSearch = useCallback(async (imageDataUrl: string) => {
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('image', blob, 'search-image.jpg');

      const searchResponse = await fetch(
        `${API_BASE_URL}/visual-search/search?limit=50&minSimilarity=25`,
        { method: 'POST', body: formData },
      );

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        throw new Error(errorData.message || t('searchFailed', { status: searchResponse.status }));
      }

      const data = await searchResponse.json();
      const newResults = data.results || [];
      setResults(newResults);
      sessionStorage.setItem('visualSearchImage', imageDataUrl);
      sessionStorage.setItem('visualSearchResults', JSON.stringify(newResults));
      if (newResults.length === 0) message.info(t('noSimilarProducts'));
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : t('searchError'));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { message.error(t('invalidFileType')); return; }
    if (file.size > 5 * 1024 * 1024) { message.error(t('fileTooLarge')); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setSearchImage(imageDataUrl);
      performSearch(imageDataUrl);
    };
    reader.readAsDataURL(file);
  }, [performSearch, message, t]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (loading) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImage(file);
        break;
      }
    }
  }, [loading, processImage]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleUpload = useCallback((file: RcFile) => { processImage(file); return false; }, [processImage]);

  const clearSearch = () => {
    setSearchImage(null);
    setResults([]);
    setShowCropper(false);
    sessionStorage.removeItem('visualSearchImage');
    sessionStorage.removeItem('visualSearchResults');
  };

  const handleCropComplete = useCallback((croppedImage: string) => {
    setShowCropper(false);
    setSearchImage(croppedImage);
    performSearch(croppedImage);
  }, [performSearch]);

  const reSearch = () => { if (searchImage) performSearch(searchImage); };

  const allProducts = useMemo(() => mapVisualSearchResults(results), [results]);
  const filters = useVisualSearchFilters(allProducts);

  if (!initialized) {
    return <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} flex justify-center py-8`}><Spinner size="lg" /></div>;
  }

  return (
    <div className={`${DESKTOP_PRODUCT_PAGE_CONTAINER_CLASS} py-6`}>
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Camera className="w-6 h-6" />
          {t('title')}
        </h2>
        <p className="text-muted">{t('description')}</p>
      </div>

      {/* 搜索图片区域 */}
      <div className="mb-6">
        {searchImage ? (
          <div className="flex flex-wrap items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="relative shrink-0">
              { }
              <img src={searchImage} alt={t('searchImage')} className="h-32 w-32 rounded-lg object-cover border shadow-sm" />
              <button type="button" onClick={clearSearch} className="absolute -top-2 -right-2 rtl:right-auto rtl:-left-2 w-6 h-6 bg-white rounded-full shadow-md hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors" aria-label="Clear search">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col justify-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2 text-muted"><Spinner size="sm" /><span>{t('searching')}</span></div>
              ) : (
                <>
                  <div className="text-lg text-foreground">
                    {t('resultsCount', { count: results.length })}
                    {filters.filterCount > 0 && (
                      <span className="text-sm text-muted ml-2">
                        ({filters.products.length} filtered)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={reSearch} disabled={loading}>{t('reSearch')}</Button>
                    <Button variant="secondary" size="sm" icon={<Scissors className="w-4 h-4" />} onClick={() => setShowCropper(true)} disabled={loading}>{t('cropAndSearch')}</Button>
                    <Upload accept="image/jpeg,image/png,image/webp,image/gif" showUploadList={false} beforeUpload={handleUpload} disabled={loading}>
                      <Button variant="secondary" size="sm" icon={<Camera className="w-4 h-4" />} disabled={loading}>{t('changeImage')}</Button>
                    </Upload>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <Upload.Dragger accept="image/jpeg,image/png,image/webp,image/gif" showUploadList={false} beforeUpload={handleUpload} disabled={loading} className="max-w-2xl mx-auto">
            <p className="ant-upload-drag-icon"><Inbox className="w-12 h-12 text-primary mx-auto" /></p>
            <p className="ant-upload-text">{t('uploadHint')}</p>
            <p className="ant-upload-hint">{t('formatHint')}</p>
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
              <p className="text-muted text-sm flex items-center justify-center gap-1">
                <Clipboard className="w-4 h-4" /><span>{t('pasteHint')}</span>
              </p>
            </div>
          </Upload.Dragger>
        )}
      </div>

      {/* 搜索结果区域（FilterSidebar + ProductGrid 布局） */}
      {searchImage && !loading && (
        <>
          {allProducts.length > 0 ? (
            <VisualSearchResultsLayout filters={filters} />
          ) : (
            <Empty
              title={t('noResults')}
              description={t('noResultsHint')}
              action={
                <div className="flex flex-col gap-2 items-center">
                  <Button variant="primary" icon={<Scissors className="w-4 h-4" />} onClick={() => setShowCropper(true)}>{t('cropAndSearchAgain')}</Button>
                  <Button variant="secondary" onClick={clearSearch}>{t('uploadAnother')}</Button>
                </div>
              }
            />
          )}
        </>
      )}

      {!searchImage && initialized && (
        <div className="text-center py-8"><p className="text-muted">{t('uploadToSearch')}</p></div>
      )}

      {searchImage && (
        <ImageCropper visible={showCropper} imageUrl={searchImage} onCropComplete={handleCropComplete} onCancel={() => setShowCropper(false)} />
      )}
    </div>
  );
}

/* ================================================================== */
/*  共享布局：FilterSidebar (左) + SortBar + ProductGrid (右)          */
/* ================================================================== */

function VisualSearchResultsLayout({
  filters,
}: {
  filters: ReturnType<typeof useVisualSearchFilters>;
}) {
  const t = useTranslations('visualSearch');

  return (
    <div className="flex gap-6">
      {/* 左侧筛选器 */}
      <div className={DESKTOP_PRODUCT_SIDEBAR_CLASS}>
        <LocalFilterSidebar filters={filters} />
      </div>

      {/* 右侧商品列表 */}
      <div className="flex-1">
        {/* 工具栏 */}
        <div className="flex items-center mb-4">
          {filters.filterCount > 0 && (
            <button
              type="button"
              onClick={filters.clearAll}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t('clearFilters')}
            </button>
          )}
          <div className="ml-auto rtl:mr-auto rtl:ml-0">
            <LocalSortSelect value={filters.sortBy} onChange={filters.setSortBy} />
          </div>
        </div>

        {/* 商品网格 */}
        {filters.products.length > 0 ? (
          <div className={DESKTOP_PRODUCT_GRID_CLASS}>
            {filters.products.map((product) => (
              <div key={product.id} className="relative">
                <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {t('similarity', { value: product.similarity })}
                </div>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted">{t('noFilterResults')}</p>
            <button
              type="button"
              onClick={filters.clearAll}
              className="mt-2 text-sm text-primary hover:underline"
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  本地筛选侧栏（不操作 URL，纯客户端状态）                             */
/* ================================================================== */

function LocalFilterSidebar({ filters }: { filters: ReturnType<typeof useVisualSearchFilters> }) {
  const t = useTranslations('filter');
  const { getCategoryLabel } = useCategoryLabelResolver();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    price: true,
    colors: false,
    genders: false,
  });

  const togglePanel = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpand = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const localizedCategoryFacets = useMemo(
    () =>
      filters.facets.categories.map((category) => ({
        ...category,
        label: getCategoryLabel(category.value, category.label),
      })),
    [filters.facets.categories, getCategoryLabel],
  );

  const sections = [
    localizedCategoryFacets.length > 0 && {
      key: 'categories',
      label: t('category'),
      count: filters.selectedCategories.length,
      children: (
        <TagFilter
          items={localizedCategoryFacets}
          selectedValues={filters.selectedCategories}
          onChange={filters.setSelectedCategories}
        />
      ),
    },
    filters.facets.brands.length > 0 && {
      key: 'brands',
      label: t('brands'),
      count: filters.selectedBrands.length,
      children: (
        <BrandFilter
          brands={filters.facets.brands}
          selectedBrands={filters.selectedBrands}
          onChange={filters.setSelectedBrands}
          expanded={expandedSections['brands']}
          onToggleExpand={() => toggleExpand('brands')}
        />
      ),
    },
    {
      key: 'price',
      label: t('priceRange'),
      count: 0,
      children: (
        <PriceRangeFilter
          min={filters.facets.priceRange.min}
          max={filters.facets.priceRange.max}
          value={filters.priceRange}
          onChange={filters.setPriceRange}
        />
      ),
    },
    filters.facets.colors.length > 0 && {
      key: 'colors',
      label: t('colors'),
      count: filters.selectedColors.length,
      children: (
        <ColorFilter
          colors={filters.facets.colors}
          selectedColors={filters.selectedColors}
          onChange={filters.setSelectedColors}
          expanded={expandedSections['colors']}
          onToggleExpand={() => toggleExpand('colors')}
        />
      ),
    },
    filters.facets.genders.length > 0 && {
      key: 'genders',
      label: t('gender'),
      count: filters.selectedGenders.length,
      children: (
        <TagFilter
          items={filters.facets.genders}
          selectedValues={filters.selectedGenders}
          onChange={filters.setSelectedGenders}
        />
      ),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; count: number; children: React.ReactNode }>;

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          <span className="font-medium">{t('filters')}</span>
          {filters.filterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-primary text-white rounded-full">
              {filters.filterCount}
            </span>
          )}
        </div>
        {filters.filterCount > 0 && (
          <button
            type="button"
            onClick={filters.clearAll}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-200 min-h-[44px] min-w-[44px] justify-center"
          >
            <X className="h-3.5 w-3.5" />
            {t('clearAll')}
          </button>
        )}
      </div>

      {/* Filter Panels */}
      <div className="divide-y">
        {sections.map((item) => {
          const isOpen = openPanels[item.key] ?? false;
          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => togglePanel(item.key)}
                aria-expanded={isOpen}
                className="flex items-center justify-between w-full px-4 py-3 text-left rtl:text-right cursor-pointer transition-colors duration-200 hover:bg-gray-50 min-h-[44px]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  {item.count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-primary text-white rounded-full">
                      {item.count}
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <div className="px-4 pb-4">{item.children}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  本地排序下拉（不操作 URL）                                           */
/* ================================================================== */

const SORT_OPTIONS: Array<{ value: VisualSearchSortBy; tKey: string }> = [
  { value: 'similarity', tKey: 'sortBySimilarity' },
  { value: 'price_asc', tKey: 'priceAsc' },
  { value: 'price_desc', tKey: 'priceDesc' },
];

function LocalSortSelect({
  value,
  onChange,
}: {
  value: VisualSearchSortBy;
  onChange: (v: VisualSearchSortBy) => void;
}) {
  const t = useTranslations('visualSearch');
  const ts = useTranslations('sort');
  const [open, setOpen] = useState(false);

  const getLabel = (v: VisualSearchSortBy) => {
    if (v === 'similarity') return t('sortBySimilarity');
    if (v === 'price_asc') return ts('priceAsc');
    return ts('priceDesc');
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sort-select]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div data-sort-select className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between h-10 w-[180px] rounded-md border border-border bg-white px-3 text-sm text-foreground cursor-pointer transition-colors duration-200 hover:border-gray-400"
      >
        <span className="truncate">{getLabel(value)}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1 w-[200px] rounded-lg border border-border bg-white shadow-lg py-1 z-50">
          {SORT_OPTIONS.map((option) => {
            const isActive = option.value === value;
            return (
              <li
                key={option.value}
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150 ${
                  isActive ? 'text-primary font-medium bg-primary/5' : 'text-foreground hover:bg-gray-50'
                }`}
              >
                <Check className={`w-4 h-4 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                <span>{getLabel(option.value)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
