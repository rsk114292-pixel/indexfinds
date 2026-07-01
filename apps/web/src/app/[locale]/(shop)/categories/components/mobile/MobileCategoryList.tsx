'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { ChevronRight } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { getImageReferrerPolicy, getProductCardThumbnail } from '@/lib/image-utils';
import { getLocalizedName } from '@/lib/utils';
import { SkeletonBlock } from '@/components/mobile/ui/MobileSkeleton';
import type { Category } from '@/types';

type CategoriesResponse = Category[] | { data: Category[] };

function normalizeCategories(data: CategoriesResponse | undefined): Category[] | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as { data?: unknown }).data)) return (data as { data: Category[] }).data;
  return undefined;
}

const CATEGORY_PRIORITY = ['clothing', 'shoes', 'bags', 'accessories', 'electronics'];

/**
 * 移动端分类列表页 — 左右分栏布局
 *
 * 线框：
 * ┌──────────┬────────────────┐
 * │ > 服装    │  连衣裙  T恤    │
 * │   鞋靴    │  卫衣   外套    │
 * │   箱包    │  裤装   ...    │
 * │   配饰    │               │
 * │   数码    │               │
 * └──────────┴────────────────┘
 */
export default function MobileCategoryList() {
  const t = useTranslations('categories');
  const tc = useTranslations('common');
  const locale = useLocale();

  const { data, isLoading } = useSWR<CategoriesResponse>('/categories', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const categories = useMemo(() => {
    const raw = normalizeCategories(data);
    if (!raw) return [];
    const priorityMap = new Map(CATEGORY_PRIORITY.map((slug, i) => [slug, i]));
    return [...raw].sort(
      (a, b) => (priorityMap.get(a.slug) ?? 999) - (priorityMap.get(b.slug) ?? 999),
    );
  }, [data]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeCategory = categories[activeIndex] || null;

  if (isLoading) return <MobileCategoryListSkeleton />;
  if (categories.length === 0) return null;

  return (
    <div className="flex min-h-[calc(100dvh-theme(spacing.12)-theme(spacing.14))] bg-background">
      {/* 左侧一级分类 */}
      <aside className="w-[88px] shrink-0 overflow-y-auto bg-gray-50 border-r border-border">
        {categories.map((cat, idx) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`w-full text-left rtl:text-right px-3 py-3.5 text-[13px] leading-tight transition-colors duration-150 ${
              idx === activeIndex
                ? 'bg-white text-primary font-semibold border-l-[3px] border-primary rtl:border-l-0 rtl:border-r-[3px]'
                : 'text-foreground border-l-[3px] border-transparent active:bg-gray-100 rtl:border-l-0 rtl:border-r-[3px]'
            }`}
          >
            {getLocalizedName(cat, locale)}
          </button>
        ))}
      </aside>

      {/* 右侧子分类内容 */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeCategory && (
          <SubcategoryGrid
            category={activeCategory}
            viewAllLabel={tc('viewAll')}
            emptyLabel={t('noCategories')}
          />
        )}
      </main>
    </div>
  );
}

/* ─── 子分类网格 ─── */

function SubcategoryGrid({
  category,
  viewAllLabel,
  emptyLabel,
}: {
  category: Category;
  viewAllLabel: string;
  emptyLabel: string;
}) {
  const locale = useLocale();
  const children = category.children || [];

  return (
    <div>
      {/* 分类标题行 */}
      <Link
        href={`/categories/${category.slug}`}
        className="flex items-center justify-between mb-4"
      >
        <h2 className="text-base font-semibold text-foreground">{getLocalizedName(category, locale)}</h2>
        <div className="flex items-center gap-0.5 text-xs text-primary font-medium">
          <span>{viewAllLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </Link>

      {/* 子分类网格 */}
      {children.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {children.map((child) => (
            <SubcategoryItem key={child.id} category={child} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted py-8 text-center">{emptyLabel}</p>
      )}
    </div>
  );
}

/* ─── 单个子分类项 ─── */

function SubcategoryItem({ category }: { category: Category }) {
  const locale = useLocale();
  const coverImage = category.coverImage || category.heroImage;
  const localName = getLocalizedName(category, locale);

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform duration-150"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-border">
        {coverImage ? (
          <Image
            src={getProductCardThumbnail(coverImage)}
            alt={localName}
            width={64}
            height={64}
            className="object-cover w-full h-full"
            loading="lazy"
            referrerPolicy={getImageReferrerPolicy(getProductCardThumbnail(coverImage))}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
      </div>
      <span className="text-xs text-foreground text-center leading-tight line-clamp-2 w-full">
        {localName}
      </span>
    </Link>
  );
}

/* ─── 骨架屏 ─── */

function MobileCategoryListSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-theme(spacing.12)-theme(spacing.14))] bg-background">
      <aside className="w-[88px] shrink-0 bg-gray-50 border-r border-border">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="px-3 py-3.5">
            <SkeletonBlock className="h-4 w-full" />
          </div>
        ))}
      </aside>
      <main className="flex-1 p-4">
        <SkeletonBlock className="h-5 w-24 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SkeletonBlock className="w-16 h-16 rounded-xl" />
              <SkeletonBlock className="h-3 w-12" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
