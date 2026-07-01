'use client';

import { memo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { App } from 'antd';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';

interface FavoriteButtonProps {
  productId: string;
  size?: 'small' | 'middle' | 'large';
  /** 'default' = full button with text; 'icon' = circular heart icon only */
  variant?: 'default' | 'icon';
  /** Override wrapper className for the icon variant */
  className?: string;
  loginHref?: string;
  onStatusChange?: (isFavorited: boolean) => void;
}

const sizeClasses = {
  small: 'h-8 px-3 text-xs',
  middle: 'h-10 px-4 text-sm',
  large: 'h-11 px-5 text-sm',
} as const;

interface FavoriteButtonBodyProps extends FavoriteButtonProps {
  resolvedLoginHref: string;
}

function FavoriteButtonBody({
  productId,
  size = 'middle',
  variant = 'default',
  className,
  resolvedLoginHref,
  onStatusChange,
}: FavoriteButtonBodyProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const { isAuthenticated } = useAuthStore();
  const t = useTranslations('product');
  const [loading, setLoading] = useState(false);

  const isFavorited = useFavoriteStore((s) => s.favorites[productId] ?? false);
  const { checkFavorite, toggleFavorite } = useFavoriteStore();

  // 已登录时检查收藏状态（store 内部处理缓存和防重复）
  useEffect(() => {
    if (isAuthenticated && productId) {
      checkFavorite(productId);
    }
  }, [isAuthenticated, productId, checkFavorite]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      message.warning(t('pleaseLoginFirst'));
      router.push(resolvedLoginHref);
      return;
    }

    setLoading(true);
    try {
      const newStatus = await toggleFavorite(productId);
      onStatusChange?.(newStatus);
      message.success(newStatus ? t('addedToFavorites') : t('removedFromFavorites'));
    } catch {
      message.error(t('failedToUpdateFavorite'));
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label={isFavorited ? t('removeFromFavorites') : t('addToFavorites')}
        disabled={loading}
        onClick={handleToggleFavorite}
        className={className || "inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-transform duration-150 active:scale-90 disabled:opacity-50"}
      >
        <Heart
          className={`w-4 h-4 transition-colors duration-200 ${
            isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
          }`}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={isFavorited ? t('removeFromFavorites') : t('addToFavorites')}
      disabled={loading}
      onClick={handleToggleFavorite}
      className={`
        inline-flex items-center gap-2 rounded-md font-medium
        cursor-pointer transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${
          isFavorited
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'border border-border text-foreground hover:bg-gray-50'
        }
      `}
    >
      <Heart
        className={`w-4 h-4 ${isFavorited ? 'fill-white' : ''}`}
      />
      {isFavorited ? t('favorited') : t('favorite')}
    </button>
  );
}

const AutoFavoriteButton = memo(function AutoFavoriteButton(props: FavoriteButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedLoginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  return <FavoriteButtonBody {...props} resolvedLoginHref={resolvedLoginHref} />;
});

const StaticFavoriteButton = memo(function StaticFavoriteButton(
  props: FavoriteButtonProps & { loginHref: string },
) {
  return <FavoriteButtonBody {...props} resolvedLoginHref={props.loginHref} />;
});

export default memo(function FavoriteButton(props: FavoriteButtonProps) {
  if (props.loginHref) {
    return <StaticFavoriteButton {...props} loginHref={props.loginHref} />;
  }

  return <AutoFavoriteButton {...props} />;
});
