'use client';

import { memo, useCallback } from 'react';
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
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import FavoriteButton from './FavoriteButton';
import { buildLoginHref } from '@/lib/auth-redirect';
import { buildReturnTo, withReturnTo } from '@/lib/return-to';
import { saveReturnScroll } from '@/lib/return-scroll';
import { DESKTOP_PRODUCT_IMAGE_SIZES } from '@/lib/product-list-layout';
import { post } from '@/lib/api';

interface ProductCardProps {
  product: ProductListItem;
  className?: string;
  imageSizes?: string;
  searchLogId?: string;
  searchQuery?: string;
  position?: number;
  page?: number;
  source?: OutboundSource;
  isHot?: boolean;
  returnTo?: string;
}

interface ProductCardBodyProps extends ProductCardProps {
  effectiveReturnTo: string;
}

function ProductCardBody({
  product,
  className,
  imageSizes = DESKTOP_PRODUCT_IMAGE_SIZES,
  searchLogId,
  searchQuery,
  position,
  page = 1,
  source = OutboundSource.DIRECT,
  isHot = false,
  effectiveReturnTo,
}: ProductCardBodyProps) {
  const t = useTranslations('product');
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const isFavorited = useFavoriteStore((s) => s.favorites[product.id] ?? false);
  const priceMin = product.price?.min ?? product.priceMin;
  const priceMax = product.price?.max ?? product.priceMax;
  const sourceCurrency = product.price?.currency ?? product.currency ?? 'CNY';
  const convertedMin = convertPrice(priceMin, sourceCurrency, displayCurrency, rates);
  const convertedMax = convertPrice(priceMax, sourceCurrency, displayCurrency, rates);
  const isConverted = displayCurrency !== sourceCurrency;
  const priceText = (isConverted ? '≈ ' : '') + formatPriceRange(convertedMin, convertedMax, displayCurrency);
  const secondImageSrc = product.secondImage ? getProductCardThumbnail(product.secondImage) : null;
  const mainImageSrc = getProductCardThumbnail(product.mainImage);
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
    <Link href={detailHref} prefetch={false} onClick={handleClick}>
      <div
        className={cn(
          'group h-full cursor-pointer overflow-hidden rounded-lg border border-border bg-surface transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md',
          className,
        )}
      >
        <div className="relative aspect-square overflow-hidden animate-shimmer">
          <Image
            src={mainImageSrc}
            alt={product.title}
            fill
            className={cn(
              'object-cover transition-opacity duration-300',
              secondImageSrc ? 'group-hover:opacity-0' : 'group-hover:scale-105 transition-transform duration-300',
            )}
            sizes={imageSizes}
            loading="lazy"
            referrerPolicy={getImageReferrerPolicy(mainImageSrc)}
          />
          {secondImageSrc && (
            <Image
              src={secondImageSrc}
              alt={product.title}
              fill
              className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              sizes={imageSizes}
              loading="lazy"
              referrerPolicy={getImageReferrerPolicy(secondImageSrc)}
            />
          )}
          {isHot && (
            <span className="absolute top-2 left-2 rtl:right-2 rtl:left-auto z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white shadow-sm">
              <Flame className="w-3 h-3" />
              {t('hot')}
            </span>
          )}
          <div
            className={cn(
              'absolute top-2 right-2 rtl:left-2 rtl:right-auto z-10 transition-opacity duration-200',
              isFavorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteButton productId={product.id} variant="icon" loginHref={favoriteLoginHref} />
          </div>
        </div>

        <div className="p-2.5">
          {(product.brand?.name || product.aiBrandName) && (
            <span className="mb-1.5 inline-block rounded-full bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              {product.brand?.name || product.aiBrandName}
            </span>
          )}

          <h3 className="mb-1.5 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground line-clamp-2">
            {product.title}
          </h3>

          <span className="text-base font-bold leading-none text-accent">
            {priceText}
          </span>
        </div>
      </div>
    </Link>
  );
}

const AutoReturnToProductCard = memo(function AutoReturnToProductCard(props: ProductCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const effectiveReturnTo = buildReturnTo(pathname, searchParams);

  return <ProductCardBody {...props} effectiveReturnTo={effectiveReturnTo} />;
});

const StaticReturnToProductCard = memo(function StaticReturnToProductCard(
  props: ProductCardProps & { returnTo: string },
) {
  return <ProductCardBody {...props} effectiveReturnTo={props.returnTo} />;
});

export default memo(function ProductCard({
  imageSizes = DESKTOP_PRODUCT_IMAGE_SIZES,
  page = 1,
  source = OutboundSource.DIRECT,
  isHot = false,
  ...props
}: ProductCardProps) {
  if (props.returnTo) {
    const { returnTo, ...restProps } = props;
    return (
      <StaticReturnToProductCard
        {...restProps}
        imageSizes={imageSizes}
        page={page}
        source={source}
        isHot={isHot}
        returnTo={returnTo}
      />
    );
  }

  return (
    <AutoReturnToProductCard
      {...props}
      imageSizes={imageSizes}
      page={page}
      source={source}
      isHot={isHot}
    />
  );
});
