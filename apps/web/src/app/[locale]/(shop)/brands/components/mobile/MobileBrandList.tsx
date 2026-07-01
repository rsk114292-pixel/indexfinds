'use client';

import { useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import useSWR from 'swr';
import { Link } from '@/i18n/navigation';
import { fetcher } from '@/lib/api';
import { SkeletonBlock } from '@/components/mobile/ui/MobileSkeleton';
import BrandLogo from '@/components/brands/BrandLogo';
import type { Brand, ApiListResponse } from '@/types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * 移动端品牌列表页
 *
 * 线框：
 * ┌───────────────────────┐
 * │ ⭐ 热门品牌 [横向滚动]   │
 * │ [Nike] [Adidas] [Zara]│
 * ├───────────────────────┤
 * │ A                     │  ← 字母索引
 * │ [Adidas] [ASOS]       │
 * │ B                     │     右侧悬浮字母快捷栏
 * │ [Burberry]            │    （类似手机通讯录）
 * │ ...                   │  [A][B][C]...
 * └───────────────────────┘
 */
export default function MobileBrandList() {
  const t = useTranslations('brands');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: brandsData, isLoading } = useSWR<ApiListResponse<Brand>>(
    '/brands?status=active&hasProducts=true&limit=0',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  const brands = useMemo(() => brandsData?.data || [], [brandsData?.data]);

  // 精选品牌（单独请求，确保拿全）
  const { data: featuredData } = useSWR<ApiListResponse<Brand>>(
    '/brands?status=active&isFeatured=true&limit=50',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  const featuredBrands = featuredData?.data || [];

  // 按字母分组
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

  // 有品牌的字母
  const activeLetters = useMemo(() => {
    const letters: string[] = [];
    [...ALPHABET, '#'].forEach((letter) => {
      if (brandsByLetter[letter]?.length > 0) {
        letters.push(letter);
      }
    });
    return letters;
  }, [brandsByLetter]);

  // 滚动到字母
  const scrollToLetter = useCallback((letter: string) => {
    const el = document.getElementById(`mobile-letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (isLoading) return <MobileBrandListSkeleton />;
  if (brands.length === 0) return null;

  return (
    <div ref={scrollContainerRef} className="min-h-dvh bg-background relative">
      {/* 热门品牌横滑 */}
          {featuredBrands.length > 0 && (
            <section className="py-4">
              <div className="flex items-center gap-1.5 px-4 mb-3">
                <Star className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('featuredBrands')}
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
                {featuredBrands.map((brand) => (
                  <MobileFeaturedBrandItem key={brand.id} brand={brand} />
                ))}
              </div>
            </section>
          )}

          {/* A-Z 品牌列表 */}
          <section className="px-4 pb-20">
            {[...ALPHABET, '#'].map((letter) => {
              const letterBrands = brandsByLetter[letter];
              if (letterBrands.length === 0) return null;

              return (
                <div key={letter} id={`mobile-letter-${letter}`} className="scroll-mt-24">
                  {/* 字母分隔 */}
                  <div className="flex items-center gap-2 py-2 sticky top-[6.5rem] z-[5] bg-background">
                    <span className="text-sm font-bold text-primary w-6 text-center">
                      {letter}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* 品牌列表 */}
                  <div className="space-y-1.5 pl-1 rtl:pr-1 rtl:pl-0">
                    {letterBrands.map((brand) => (
                      <MobileBrandItem key={brand.id} brand={brand} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* 右侧字母快捷栏 */}
      {/* 右侧字母快捷栏 */}
      <AlphabetSidebar
        activeLetters={activeLetters}
        onSelect={scrollToLetter}
      />
    </div>
  );
}

/* ─── 品牌项 ─── */

function MobileBrandItem({ brand }: { brand: Brand }) {
  const t = useTranslations('brands');
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="flex items-center gap-3 py-2.5 px-2 rounded-lg active:bg-gray-50 transition-colors duration-150"
    >
      <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-foreground truncate">
          {brand.name}
        </h4>
        {(brand.productCount ?? 0) > 0 && (
          <p className="text-xs text-muted">
            {t('productCount', { count: brand.productCount ?? 0 })}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ─── 热门品牌项 ─── */

function MobileFeaturedBrandItem({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 active:scale-95 transition-transform duration-150"
    >
      <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size="sm" />
      <span className="text-[11px] text-foreground text-center leading-tight line-clamp-1 w-full">
        {brand.name}
      </span>
    </Link>
  );
}

/* ─── 右侧字母快捷栏 ─── */

function AlphabetSidebar({
  activeLetters,
  onSelect,
}: {
  activeLetters: string[];
  onSelect: (letter: string) => void;
}) {
  const allLetters = [...ALPHABET, '#'];
  const activeSet = new Set(activeLetters);

  return (
    <div className="fixed right-0.5 rtl:left-0.5 rtl:right-auto top-1/2 -translate-y-1/2 z-20 flex flex-col items-center py-1">
      {allLetters.map((letter) => {
        const isActive = activeSet.has(letter);
        return (
          <button
            key={letter}
            type="button"
            disabled={!isActive}
            onClick={() => onSelect(letter)}
            className={`w-5 h-[18px] flex items-center justify-center text-[10px] font-medium rounded-sm transition-colors ${
              isActive
                ? 'text-primary active:bg-primary active:text-white'
                : 'text-gray-300'
            }`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

/* ─── 骨架屏 ─── */

function MobileBrandListSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      {/* 热门品牌骨架 */}
      <div className="py-4">
        <div className="px-4 mb-3">
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <div className="flex gap-3 px-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SkeletonBlock className="w-10 h-10 rounded-xl" />
              <SkeletonBlock className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
      {/* 品牌列表骨架 */}
      <div className="px-4 space-y-4">
        {['A', 'B', 'C', 'D'].map((letter) => (
          <div key={letter}>
            <SkeletonBlock className="h-4 w-6 mb-2" />
            <div className="space-y-2 pl-1 rtl:pr-1 rtl:pl-0">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <SkeletonBlock className="w-10 h-10 rounded-xl" />
                  <div className="flex-1">
                    <SkeletonBlock className="h-4 w-24 mb-1" />
                    <SkeletonBlock className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
