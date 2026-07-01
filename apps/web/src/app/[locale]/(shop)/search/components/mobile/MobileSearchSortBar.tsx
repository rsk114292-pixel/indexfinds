'use client';

import { useState } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { MobileSortSheet } from '@/components/mobile/ui/MobileSortSheet';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const SORT_OPTIONS = [
  { value: 'popular', tKey: 'popular' },
  { value: 'newest', tKey: 'newest' },
  { value: 'price_asc', tKey: 'priceAsc' },
  { value: 'price_desc', tKey: 'priceDesc' },
] as const;

interface MobileSearchSortBarProps {
  filterCount?: number;
  onOpenFilter?: () => void;
}

/**
 * 移动端搜索结果排序栏（Sort 按钮 + Filter 按钮）
 *
 * 线框：
 * ┌─────────────────────────────────────┐
 * │ [↕ Sort: Relevance ▾]  [🎚 Filter] │
 * └─────────────────────────────────────┘
 */
export default function MobileSearchSortBar({ filterCount = 0, onOpenFilter }: MobileSearchSortBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('sort');
  const tf = useTranslations('filter');
  const currentSort = searchParams.get('sortBy') || 'popular';
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const { headerVisible } = useScrollDirection();

  const currentLabel = SORT_OPTIONS.find((o) => o.value === currentSort);

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div
        className="sticky z-[15] bg-surface border-b border-border transition-[top] duration-300"
        style={{ top: headerVisible ? '3rem' : '0px' }}
      >
        <div className="flex items-center justify-between px-3 h-11">
          {/* Sort 按钮 */}
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            className="flex items-center gap-1.5 h-9 pl-2.5 pr-2 rtl:pl-2 rtl:pr-2.5 rounded-lg text-sm text-foreground active:bg-gray-50 transition-colors duration-150"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
            <span>
              {t('sortBy')}: <span className="font-medium">{currentLabel ? t(currentLabel.tKey) : t('relevance')}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>

          {/* Filter 按钮 */}
          {onOpenFilter && (
            <button
              type="button"
              onClick={onOpenFilter}
              className="relative flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-foreground active:bg-gray-50 transition-colors duration-150"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {tf('filters')}
              {filterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium bg-primary text-white rounded-full">
                  {filterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <MobileSortSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        currentSort={currentSort}
        onSortChange={handleSort}
        options={SORT_OPTIONS}
      />
    </>
  );
}
