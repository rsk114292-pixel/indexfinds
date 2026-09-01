'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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
 * 移动端首页分类横滑区域
 *
 * 线框：
 * 🔥热门分类 [查看全部 >]
 * [👗] [👟] [👜] [⌚] →    ← 圆形封面图 + 分类名，可左右滑
 */
export default function MobileCategoryScroll({
  initialData,
}: {
  initialData?: CategoriesResponse;
}) {
  const t = useTranslations('home');
  const tc = useTranslations('common');

  const { data, isLoading } = useSWR<CategoriesResponse>('/categories/home', fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    revalidateIfStale: !initialData,
    revalidateOnMount: !initialData,
    dedupingInterval: 60000,
  });

  const categories = useMemo(() => {
    const raw = normalizeCategories(data);
    if (!raw) return [];
    const priorityMap = new Map(CATEGORY_PRIORITY.map((slug, i) => [slug, i]));
    return [...raw]
      .sort((a, b) => (priorityMap.get(a.slug) ?? 999) - (priorityMap.get(b.slug) ?? 999))
      .slice(0, 8);
  }, [data]);

  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="py-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-semibold text-foreground">
          {t('popularCategories.title')}
        </h2>
        <Link
          href="/categories"
            className="flex items-center gap-0.5 text-xs font-semibold text-red-700"
        >
          {tc('viewAll')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 横向滚动 */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <CategoryItemSkeleton key={i} />)
          : categories.map((cat) => <CategoryItem key={cat.id} category={cat} />)}
      </div>
    </section>
  );
}

function CategoryItem({ category }: { category: Category }) {
  const locale = useLocale();
  const coverImage = category.coverImage || category.heroImage;
  const localName = getLocalizedName(category, locale);

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="flex flex-col items-center gap-1.5 shrink-0 w-16 active:scale-95 transition-transform duration-150"
    >
      <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-border">
        {coverImage ? (
          <Image
            src={getProductCardThumbnail(coverImage)}
            alt=""
            width={56}
            height={56}
            className="object-cover w-full h-full"
            loading="lazy"
            referrerPolicy={getImageReferrerPolicy(getProductCardThumbnail(coverImage))}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
      </div>
      <span className="text-xs text-foreground text-center leading-tight line-clamp-1 w-full">
        {localName}
      </span>
    </Link>
  );
}

function CategoryItemSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 w-16">
      <SkeletonBlock className="w-14 h-14 rounded-full" />
      <SkeletonBlock className="h-3 w-10" />
    </div>
  );
}
