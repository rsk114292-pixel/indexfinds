"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import {
  ArrowUpRight,
  Clock3,
  Eye,
  Flame,
  Images,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ProductListItem } from "@/types";
import { formatPriceRange, convertPrice, cn } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import {
  getImageReferrerPolicy,
  getProductCardThumbnail,
} from "@/lib/image-utils";
import {
  recordSearchClick,
  setPageSource,
  OutboundSource,
  getCurrentTrackingIdentity,
} from "@/lib/search-tracking";
import { trackGA4Event } from "@/lib/ga-events";
import { useFavoriteStore } from "@/stores/useFavoriteStore";
import FavoriteButton from "./FavoriteButton";
import { buildLoginHref } from "@/lib/auth-redirect";
import { buildReturnTo, withReturnTo } from "@/lib/return-to";
import { saveReturnScroll } from "@/lib/return-scroll";
import { DESKTOP_PRODUCT_IMAGE_SIZES } from "@/lib/product-list-layout";
import { post } from "@/lib/api";
import {
  PRODUCT_IMAGE_FALLBACK,
  TENANT_PRODUCT_IMAGE_FALLBACK,
} from "@/components/ui/ImageWithFallback";
import { usePlatformStore } from "@/stores/usePlatformStore";
import { useTenant } from "@/components/TenantProvider";
import {
  getProductCardImageCandidates,
  getProductSourceLabel,
} from "@/lib/product-card-images";

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
  imagePriority?: boolean;
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
  imagePriority = false,
}: ProductCardBodyProps) {
  const t = useTranslations("product");
  const locale = useLocale();
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const isFavorited = useFavoriteStore((s) => s.favorites[product.id] ?? false);
  const agentCount = usePlatformStore((state) => state.platforms.length);
  const tenant = useTenant();
  const [imageIndex, setImageIndex] = useState(0);
  const [hoverImageFailed, setHoverImageFailed] = useState(false);
  const priceMin = product.price?.min ?? product.priceMin;
  const priceMax = product.price?.max ?? product.priceMax;
  const sourceCurrency = product.price?.currency ?? product.currency ?? "CNY";
  const convertedMin = convertPrice(
    priceMin,
    sourceCurrency,
    displayCurrency,
    rates,
  );
  const convertedMax = convertPrice(
    priceMax,
    sourceCurrency,
    displayCurrency,
    rates,
  );
  const isConverted = displayCurrency !== sourceCurrency;
  const priceText =
    (isConverted ? "≈ " : "") +
    formatPriceRange(convertedMin, convertedMax, displayCurrency);
  const imageCandidates = useMemo(
    () =>
      getProductCardImageCandidates(product)
        .filter(
          (candidate) =>
            !tenant || !candidate.includes("/images/product-placeholder.svg"),
        )
        .map(getProductCardThumbnail),
    [product, tenant],
  );
  const mainImageSrc =
    imageCandidates[imageIndex] ||
    (tenant ? TENANT_PRODUCT_IMAGE_FALLBACK : PRODUCT_IMAGE_FALLBACK);
  const secondImageSrc = imageCandidates[imageIndex + 1];
  const sourceLabel = getProductSourceLabel(product.sourceUrl);
  const originalPriceText = isConverted
    ? formatPriceRange(priceMin, priceMax, sourceCurrency)
    : null;
  const updatedDate = useMemo(() => {
    if (!product.updatedAt) return null;
    const parsed = new Date(product.updatedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(parsed);
  }, [locale, product.updatedAt]);
  const detailHref = withReturnTo(
    `/products/${product.slug}`,
    effectiveReturnTo,
  );
  const favoriteLoginHref = buildLoginHref(effectiveReturnTo);

  const handleClick = useCallback(() => {
    saveReturnScroll(effectiveReturnTo, window.scrollY, page);
    fetch(`/api/products/${product.id}/click`, { method: "POST" }).catch(
      () => {},
    );
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
    trackGA4Event("select_item", {
      product_id: product.id,
      product_name: product.title,
      list_name: source,
      position,
    });
  }, [
    effectiveReturnTo,
    product.id,
    product.title,
    searchLogId,
    searchQuery,
    position,
    page,
    source,
  ]);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg",
        className,
      )}
    >
      <Link
        href={detailHref}
        prefetch={false}
        onClick={handleClick}
        className="block"
      >
        <div className="relative aspect-square overflow-hidden animate-shimmer">
          <>
            <Image
              key={mainImageSrc}
              src={mainImageSrc}
              alt={product.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                secondImageSrc && !hoverImageFailed
                  ? "group-hover:opacity-0"
                  : "group-hover:scale-105 transition-transform duration-300",
              )}
              sizes={imageSizes}
              loading={imagePriority ? "eager" : "lazy"}
              priority={imagePriority}
              fetchPriority={imagePriority ? "high" : undefined}
              referrerPolicy={getImageReferrerPolicy(mainImageSrc)}
              onError={() => {
                setHoverImageFailed(false);
                setImageIndex((current) => current + 1);
              }}
            />
            {secondImageSrc && !hoverImageFailed && (
              <Image
                src={secondImageSrc}
                alt={product.title}
                fill
                className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                sizes={imageSizes}
                loading="lazy"
                referrerPolicy={getImageReferrerPolicy(secondImageSrc)}
                onError={() => setHoverImageFailed(true)}
              />
            )}
          </>
          {isHot && (
            <span className="absolute top-2 left-2 rtl:right-2 rtl:left-auto z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-700 text-white shadow-sm">
              <Flame className="w-3 h-3" />
              {t("hot")}
            </span>
          )}
          <div
            className={cn(
              "absolute top-2 right-2 rtl:left-2 rtl:right-auto z-10 transition-opacity duration-200",
              isFavorited ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteButton
              productId={product.id}
              variant="icon"
              loginHref={favoriteLoginHref}
            />
          </div>
        </div>

        <div className="p-3">
          <div className="mb-2 flex min-h-5 flex-wrap items-center gap-1.5">
            {(product.brand?.name || product.aiBrandName) && (
              <span className="inline-flex rounded-full bg-brand-indigo/10 px-2 py-0.5 text-[11px] font-semibold text-brand-indigo">
                {product.brand?.name || product.aiBrandName}
              </span>
            )}
            {product.primaryCategory?.name && (
              <span className="truncate text-[11px] font-medium text-muted">
                {product.primaryCategory.name}
              </span>
            )}
          </div>

          <h3 className="mb-1.5 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground line-clamp-2">
            {product.title}
          </h3>

          <span className="block text-base font-extrabold leading-none text-primary">
            {priceText}
          </span>

          {(originalPriceText || sourceLabel || updatedDate) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
              {originalPriceText && <span>{originalPriceText}</span>}
              {sourceLabel && (
                <span className="inline-flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  {sourceLabel}
                </span>
              )}
              {updatedDate && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {t("updatedValue", { date: updatedDate })}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            {agentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5 text-brand-indigo" />
                {t("agentReady", { count: agentCount })}
              </span>
            )}
            {(product.qcPhotoCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Images className="h-3.5 w-3.5" />
                {t("qcPhotosCount", { count: product.qcPhotoCount ?? 0 })}
              </span>
            )}
            {(product.viewCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {t("viewCount", { count: product.viewCount ?? 0 })}
              </span>
            )}
            {(product.salesCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("salesValue", { count: product.salesCount ?? 0 })}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-auto grid grid-cols-2 border-t border-border/80 bg-gray-50/60">
        <Link
          href={detailHref}
          prefetch={false}
          onClick={handleClick}
          className="flex h-10 items-center justify-center text-xs font-semibold text-foreground transition-colors hover:bg-white hover:text-primary"
        >
          {t("viewDetails")}
        </Link>
        <Link
          href={`${detailHref}#buy`}
          prefetch={false}
          onClick={handleClick}
          className="flex h-10 items-center justify-center gap-1 border-l border-border/80 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {t("buyWithAgent")}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

const AutoReturnToProductCard = memo(function AutoReturnToProductCard(
  props: ProductCardProps,
) {
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
