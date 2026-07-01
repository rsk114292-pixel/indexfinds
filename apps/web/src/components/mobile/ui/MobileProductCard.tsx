'use client';

import { memo, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import { Flame } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { ProductListItem } from '@/types';
import { formatPriceRange, convertPrice, cn } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { getImageReferrerPolicy, getProductCardThumbnail } from '@/lib/image-utils';
import {
  recordSearchClick,
  setPageSource,
  OutboundSource,
  getCurrentTrackingIdentity,
} from '@/lib/search-tracking';
import { trackGA4Event } from '@/lib/ga-events';
import FavoriteButton from '@/components/FavoriteButton';
import { buildLoginHref } from '@/lib/auth-redirect';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { post } from '@/lib/api';

interface MobileProductCardProps {
  product: ProductListItem;
  className?: string;
  /** 搜索日志 ID，用于搜索点击追踪 */
  searchLogId?: string;
  /** 搜索关键词 */
  searchQuery?: string;
  /** 列表中的位置（从 0 开始） */
  position?: number;
  /** 页码 */
  page?: number;
  /** 流量来源 */
  source?: OutboundSource;
  /** 是否显示 Hot badge */
  isHot?: boolean;
  returnTo?: string;
}

/**
 * 移动端商品卡片（Section 3.7 MobileProductCard 规格）
 *
 * 布局：
 * ┌─────────────┐
 * │   图片 1:1  ♡│  aspect-square / rounded-xl / 右上角收藏
 * ├─────────────┤
 * │ [品牌标签]     │  药丸形 / accent/15
 * │ 商品标题两行    │  17px / semibold / line-clamp-2
 * │ ¥199         │  18px / bold / accent
 * └─────────────┘
 *
 * 触控：active:scale-[0.98] 150ms
 */
export const MobileProductCard = memo(function MobileProductCard({
  product,
  className,
  searchLogId,
  searchQuery,
  position,
  page = 1,
  source = OutboundSource.DIRECT,
  isHot = false,
  returnTo,
}: MobileProductCardProps) {
  const t = useTranslations('product');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency: displayCurrency, rates } = useCurrencyStore();

  const priceMin = product.price?.min ?? product.priceMin;
  const priceMax = product.price?.max ?? product.priceMax;
  const sourceCurrency = product.price?.currency ?? product.currency ?? 'CNY';
  const convertedMin = convertPrice(priceMin, sourceCurrency, displayCurrency, rates);
  const convertedMax = convertPrice(priceMax, sourceCurrency, displayCurrency, rates);
  const isConverted = displayCurrency !== sourceCurrency;
  const priceText =
    (isConverted ? '≈ ' : '') +
    formatPriceRange(convertedMin, convertedMax, displayCurrency);
  const mainImageSrc = getProductCardThumbnail(product.mainImage);
  const effectiveReturnTo = useMemo(
    () => returnTo ?? buildReturnTo(pathname, searchParams),
    [returnTo, pathname, searchParams],
  );
  const detailHref = withReturnTo(`/products/${product.slug}`, effectiveReturnTo);
  const favoriteLoginHref = buildLoginHref(effectiveReturnTo);

  const handleClick = useCallback(() => {
    saveReturnScroll(effectiveReturnTo, window.scrollY, page);
    fetch(`/api/products/${product.id}/click`, { method: 'POST' }).catch(() => {});
    void post(`/products/${product.id}/view`, {}).catch(() => {});
    setPageSource(source);
    if (searchLogId && searchQuery && position !== undefined) {
      const { deviceId, visitId } = getCurrentTrackingIdentity();
      recordSearchClick({
        searchLogId,
        query: searchQuery,
        productId: product.id,
        position,
        page,
        sessionId: deviceId,
        deviceId,
        visitId,
      }).catch(() => {});
    }
    trackGA4Event('select_item', {
      product_id: product.id,
      product_name: product.title,
      list_name: source,
      position,
    });
  }, [effectiveReturnTo, product.id, product.title, searchLogId, searchQuery, position, page, source]);

  return (
    <Link
      href={detailHref}
      prefetch={false}
      onClick={handleClick}
      className={cn(
        'block rounded-xl bg-surface shadow-sm overflow-hidden active:scale-[0.98] transition-transform duration-150',
        className,
      )}
    >
      {/* 图片区域 — 1:1 */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl animate-shimmer">
        <Image
          src={mainImageSrc}
          alt={product.title}
          fill
          className="object-cover"
          sizes="50vw"
          loading="lazy"
          referrerPolicy={getImageReferrerPolicy(mainImageSrc)}
        />
        {/* Hot badge — 左上角 */}
        {isHot && (
          <span className="absolute top-1.5 left-1.5 rtl:right-1.5 rtl:left-auto z-[1] inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-red-500 text-white shadow-sm">
            <Flame className="w-3 h-3" />
            {t('hot')}
          </span>
        )}
        {/* 收藏按钮 — 右上角悬浮 */}
        <div
          className="absolute top-2 right-2 rtl:left-2 rtl:right-auto z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <FavoriteButton productId={product.id} variant="icon" loginHref={favoriteLoginHref} />
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-3">
        {/* 品牌标签 */}
        {(product.brand?.name || product.aiBrandName) && (
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent/15 text-amber-700 mb-1.5">
            {product.brand?.name || product.aiBrandName}
          </span>
        )}

        {/* 标题 — 2 行截断 */}
        <h3 className="text-[15px] font-semibold text-foreground line-clamp-2 leading-snug mb-1.5">
          {product.title}
        </h3>

        {/* 价格 */}
        <span className="text-lg font-bold text-accent truncate block">
          {priceText}
        </span>
      </div>
    </Link>
  );
});
