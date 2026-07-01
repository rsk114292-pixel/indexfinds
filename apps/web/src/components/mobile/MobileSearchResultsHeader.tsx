'use client';

import { useState, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import MobileSearchEntry from './MobileSearchEntry';
import MobileSearchOverlay from './MobileSearchOverlay';

interface MobileSearchResultsHeaderProps {
  query?: string;
  onQueryChange?: (q: string) => void;
}

/**
 * 搜索结果页专用 Header（48px）
 *
 * 布局：[←] [🔍 当前关键词...  📷]
 * - 复用 MobileSearchEntry 组件
 * - 内部管理 MobileSearchOverlay 的 open/close 状态
 * - 集成 useScrollDirection → 向下滚动时隐藏
 */
export default function MobileSearchResultsHeader({
  query,
}: MobileSearchResultsHeaderProps) {
  const router = useRouter();
  const tc = useTranslations('common');
  const { headerVisible } = useScrollDirection();
  const [searchOpen, setSearchOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);

  const handleBack = useCallback(() => router.back(), [router]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-20 bg-surface pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(0,0,0,0.06)] lg:hidden transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex h-12 items-center gap-1 px-1 pr-3 rtl:pl-3 rtl:pr-1">
          {/* 返回按钮 */}
          <button
            type="button"
            onClick={handleBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95 active:bg-gray-100 transition-transform duration-150"
            aria-label={tc('goBack')}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>

          {/* 搜索入口 */}
          <div className="flex-1 min-w-0">
            <MobileSearchEntry
              onTap={() => setSearchOpen(true)}
              onPhotoSearch={() => {
                setPhotoMode(true);
                setSearchOpen(true);
              }}
              query={query}
            />
          </div>
        </div>
      </header>

      {/* 全屏搜索浮层 */}
      <MobileSearchOverlay
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setPhotoMode(false);
        }}
        autoTriggerPhoto={photoMode}
        initialQuery={query}
      />
    </>
  );
}
