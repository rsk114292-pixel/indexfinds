/**
 * 品牌列表页 - 客户端组件
 * 从 page.tsx 迁移，保留全部交互逻辑
 *
 * CSS 双 div 分发（模式 A — Client Component）：
 * - PC 端：hidden lg:block → 原有搜索 + Featured + A-Z 列表
 * - 移动端：lg:hidden → MobileBrandList（字母索引 + 横滑热门品牌）
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search, Sparkles, Star, X } from 'lucide-react';
import useSWR from 'swr';
import { Alert } from '@/components/ui/Alert';
import { Empty } from '@/components/ui/Empty';
import { fetcher } from '@/lib/api';
import FeaturedBrandCard from '@/components/brands/FeaturedBrandCard';
import BrandCard from '@/components/brands/BrandCard';
import type { Brand, ApiListResponse } from '@/types';
import MobileBrandList from './components/mobile/MobileBrandList';
import ProductCard from '@/components/ProductCard';
import { Link } from '@/i18n/navigation';
import { OutboundSource } from '@/lib/search-tracking';
import type { ProductListItem } from '@/types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function BrandsPageClient() {
  const t = useTranslations('brands');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: brandsData,
    error,
    isLoading,
  } = useSWR<ApiListResponse<Brand>>(
    '/brands?status=active&hasProducts=true&limit=0',
    fetcher,
  );

  const brands = useMemo(() => brandsData?.data || [], [brandsData?.data]);

  // 精选品牌（单独请求，确保拿全）
  const { data: featuredData } = useSWR<ApiListResponse<Brand>>(
    '/brands?status=active&isFeatured=true&limit=50',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  const featuredBrands = useMemo(
    () => featuredData?.data || [],
    [featuredData?.data],
  );
  const spotlightBrands = useMemo(
    () =>
      featuredBrands.length > 0
        ? featuredBrands
        : [...brands]
            .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
            .slice(0, 6),
    [brands, featuredBrands],
  );
  const isColdStart = brands.length < 12;

  const { data: discoveryProductsData } = useSWR<ApiListResponse<ProductListItem>>(
    isColdStart ? '/products?sortBy=popular&limit=4' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  const discoveryProducts = discoveryProductsData?.data || [];

  // 按字母分组（全部品牌）
  const brandsByLetter = useMemo(() => {
    const grouped: Record<string, Brand[]> = {};
    ALPHABET.forEach((letter) => {
      grouped[letter] = [];
    });
    grouped['#'] = [];

    brands.forEach((brand) => {
      const firstChar = brand.name.charAt(0).toUpperCase();
      if (ALPHABET.includes(firstChar)) {
        grouped[firstChar].push(brand);
      } else {
        grouped['#'].push(brand);
      }
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [brands]);

  // 有品牌的字母列表
  const activeLetters = useMemo(() => {
    const letters = new Set<string>();
    brands.forEach((brand) => {
      const firstChar = brand.name.charAt(0).toUpperCase();
      if (ALPHABET.includes(firstChar)) {
        letters.add(firstChar);
      } else {
        letters.add('#');
      }
    });
    return letters;
  }, [brands]);
  const displayedLetters = useMemo(
    () => [...ALPHABET, '#'].filter((letter) => activeLetters.has(letter)),
    [activeLetters],
  );

  // 搜索过滤
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.aliases?.some((alias) => alias.toLowerCase().includes(query)),
    );
  }, [brands, searchQuery]);

  // 滚动到字母区域
  const scrollToLetter = useCallback((letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const isSearching = filteredBrands !== null;

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        {/* Error state */}
        {error ? (
          <div className="container mx-auto px-4 py-8">
            <Alert type="error" title={t('errorLoading')} description={error.message} />
          </div>
        ) : isLoading ? (
          <div className="container mx-auto px-4 py-8">
            {/* 页面标题骨架 */}
            <div className="mb-8">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-5 w-64 bg-gray-100 rounded animate-pulse" />
            </div>

            {/* 搜索框骨架 */}
            <div className="h-10 max-w-md bg-gray-100 rounded-lg animate-pulse mb-8" />

            {/* Featured 骨架 */}
            <div className="mb-12">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center gap-2.5 p-5 rounded-xl border border-border bg-surface aspect-square">
                    <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse" />
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* A-Z 骨架 */}
            <div className="space-y-6">
              {['A', 'B', 'C'].map((letter) => (
                <div key={letter}>
                  <div className="h-6 w-8 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : brands.length === 0 ? (
          <div className="container mx-auto px-4 py-8">
            <Empty title={t('noBrands')} />
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            {/* === 页面标题 === */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-1">{t('title')}</h1>
              <p className="text-muted text-sm">
                {t('discoverCount', { count: brands.length })}
              </p>
            </div>

            {/* === 搜索栏 === */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* === 搜索结果模式 === */}
            {isSearching ? (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {t('searchResults', { count: filteredBrands!.length })}
                </h2>
                {filteredBrands!.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredBrands!.map((brand) => (
                      <BrandCard key={brand.id} brand={brand} />
                    ))}
                  </div>
                ) : (
                  <Empty title={t('noSearchResults')} />
                )}
              </div>
            ) : (
              <>
                {/* === 字母导航横条 === */}
                <div className="mb-8 sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {displayedLetters.map((letter) => {
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => scrollToLetter(letter)}
                          className="h-8 min-w-8 rounded-md px-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-white"
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* === Featured Brands === */}
                {spotlightBrands.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center gap-2 mb-5">
                      <Star className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">
                        {t('featuredBrands')}
                      </h2>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {spotlightBrands.map((brand) => (
                        <FeaturedBrandCard key={brand.id} brand={brand} />
                      ))}
                    </div>
                  </section>
                )}

                {isColdStart && (
                  <section className="mb-12 overflow-hidden rounded-2xl border border-border bg-white">
                    <div className="grid items-center gap-6 bg-secondary px-6 py-7 text-white md:grid-cols-[1fr_auto]">
                      <div>
                        <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                          IndexFinds
                        </span>
                        <h2 className="text-xl font-bold">
                          {t('collectionGrowingTitle')}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                          {t('collectionGrowingDesc')}
                        </p>
                      </div>
                      <Link
                        href="/products"
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-white"
                      >
                        {t('exploreProducts')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                    {discoveryProducts.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
                        {discoveryProducts.map((product, index) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            source={OutboundSource.DIRECT}
                            position={index + 1}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* === All Brands A-Z === */}
                <section>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-foreground">
                      {t('allBrands')}
                    </h2>
                    <span className="text-sm text-muted">
                      {t('brandCount', { count: brands.length })}
                    </span>
                  </div>

                  <div className="space-y-8">
                    {displayedLetters.map((letter) => {
                      const letterBrands = brandsByLetter[letter];
                      if (letterBrands.length === 0) return null;

                      return (
                        <div key={letter} id={`letter-${letter}`} className="scroll-mt-16">
                          {/* 字母分隔线 */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl font-bold text-primary w-8 text-center">
                              {letter}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted">
                              {letterBrands.length}
                            </span>
                          </div>

                          {/* 品牌小卡片网格 */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 pl-11 rtl:pr-11 rtl:pl-0">
                            {letterBrands.map((brand) => (
                              <BrandCard key={brand.id} brand={brand} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden">
        <MobileBrandList />
      </div>
    </>
  );
}
