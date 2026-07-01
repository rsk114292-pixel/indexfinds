'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FavoriteButton from '@/components/FavoriteButton';

interface MobileBuyBarProps {
  productId: string;
  disabled?: boolean;
  loading?: boolean;
  onOpenPlatformSelect: () => void;
  onFavoriteChange?: (isFavorited: boolean) => void;
}

/**
 * 移动端固定底部操作栏（Section 6.3）
 *
 * 线框：
 * ├═══════════════════════┤
 * │ [❤️收藏] [🛒去购买]      │  ← 固定底部操作栏
 * └───────────────────────┘
 */
export default function MobileBuyBar({
  productId,
  disabled,
  loading,
  onOpenPlatformSelect,
  onFavoriteChange,
}: MobileBuyBarProps) {
  const t = useTranslations('buy');

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-border px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
      <div className="flex items-center gap-3">
        {/* 收藏按钮 */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton
            productId={productId}
            size="middle"
            onStatusChange={onFavoriteChange}
          />
        </div>

        {/* 购买按钮 */}
        <button
          onClick={onOpenPlatformSelect}
          disabled={disabled || loading}
          className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary text-white font-semibold rounded-xl active:scale-[0.98] transition-transform duration-150 disabled:opacity-50 disabled:active:scale-100"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{loading ? '...' : t('buyNow')}</span>
        </button>
      </div>
    </div>
  );
}
