'use client';

import { useState } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ChevronDown, SlidersHorizontal, List, LayoutGrid, Grid3X3, Share2 } from 'lucide-react';
import { MobileSortSheet } from '@/components/mobile/ui/MobileSortSheet';
import { useScrollDirection } from '@/hooks/useScrollDirection';

export type ViewMode = 'list' | 'grid' | 'compact';

const SORT_OPTIONS = [
  { value: 'popular', tKey: 'popular' },
  { value: 'newest', tKey: 'newest' },
  { value: 'price_asc', tKey: 'priceAsc' },
  { value: 'price_desc', tKey: 'priceDesc' },
] as const;

const VIEW_CONFIGS: Array<{ mode: ViewMode; Icon: typeof List }> = [
  { mode: 'list', Icon: List },
  { mode: 'grid', Icon: LayoutGrid },
  { mode: 'compact', Icon: Grid3X3 },
];

interface MobileSortBarProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  filterCount?: number;
  onOpenFilter?: () => void;
  onOpenShare?: () => void;
  stickyTop?: string;
  stickyTopHidden?: string;
}

/**
 * 移动端 sticky 工具栏（Sort 按钮 + 视图切换 + Filter 按钮）
 *
 * 必须通过 next/dynamic ssr:false 加载，避免浏览器扩展注入 DOM 导致 hydration mismatch。
 */
export default function MobileSortBar({
  viewMode,
  onViewChange,
  filterCount = 0,
  onOpenFilter,
  onOpenShare,
  stickyTop = '6.5rem',
  stickyTopHidden = '3.5rem',
}: MobileSortBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('sort');
  const tf = useTranslations('filter');
  const ts = useTranslations('share');
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
        style={{ top: headerVisible ? stickyTop : stickyTopHidden }}
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
              {t('sortBy')}: <span className="font-medium">{currentLabel ? t(currentLabel.tKey) : t('popular')}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>

          <div className="flex items-center gap-2">
            {onOpenShare && (
              <button
                type="button"
                onClick={onOpenShare}
                aria-label={ts('title')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground active:bg-gray-50 transition-colors duration-150"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
            {/* 视图切换 */}
            <div className="inline-flex items-center rounded-lg border border-border">
              {VIEW_CONFIGS.map(({ mode, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewChange(mode)}
                  className={`inline-flex h-8 w-8 items-center justify-center transition-colors duration-150 first:rounded-l-lg last:rounded-r-lg rtl:first:rounded-r-lg rtl:first:rounded-l-none rtl:last:rounded-l-lg rtl:last:rounded-r-none ${
                    viewMode === mode
                      ? 'bg-primary text-white'
                      : 'text-muted active:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

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
