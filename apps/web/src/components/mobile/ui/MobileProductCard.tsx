"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight, Clock3, Flame, ShoppingBag, Store } from "lucide-react";
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
import FavoriteButton from "@/components/FavoriteButton";
import { buildLoginHref } from "@/lib/auth-redirect";
import { buildReturnTo, withReturnTo } from "@/lib/return-to";
import { saveReturnScroll } from "@/lib/return-scroll";
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
  /** Eagerly fetch an above-the-fold image to improve LCP. */
  imagePriority?: boolean;
  /** Keep card headings in the page's semantic outline. */
  headingLevel?: 2 | 3;
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
  imagePriority = false,
  headingLevel = 3,
}: MobileProductCardProps) {
  const t = useTranslations("product");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const agentCount = usePlatformStore((state) => state.platforms.length);
  const tenant = useTenant();
  const [imageIndex, setImageIndex] = useState(0);

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
  const pricePrefix = isConverted ? "≈ " : "";
  const priceText =
    convertedMax > convertedMin
      ? t("fromPrice", {
          price:
            pricePrefix +
            formatPriceRange(convertedMin, convertedMin, displayCurrency),
        })
      : pricePrefix +
        formatPriceRange(convertedMin, convertedMax, displayCurrency);
  const imageCandidates = useMemo(
    () =>
      getProductCardImageCandidates(product)
        .slice(0, 3)
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
  const effectiveReturnTo = useMemo(
    () => returnTo ?? buildReturnTo(pathname, searchParams),
    [returnTo, pathname, searchParams],
  );
  const detailHref = withReturnTo(
    `/products/${product.slug}`,
    effectiveReturnTo,
  );
  const favoriteLoginHref = buildLoginHref(effectiveReturnTo);
  const Heading = headingLevel === 2 ? "h2" : "h3";

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
        "flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-surface shadow-sm transition-transform duration-150 active:scale-[0.98]",
        className,
      )}
    >
      <Link href={detailHref} prefetch={false} onClick={handleClick}>
        {/* 图片区域 — 1:1 */}
        <div className="relative aspect-square overflow-hidden rounded-t-xl animate-shimmer">
          <Image
            key={mainImageSrc}
            src={mainImageSrc}
            alt={product.title}
            fill
            className="object-cover"
            sizes="50vw"
            loading={imagePriority ? "eager" : "lazy"}
            priority={imagePriority}
            fetchPriority={imagePriority ? "high" : undefined}
            referrerPolicy={getImageReferrerPolicy(mainImageSrc)}
            onError={() => setImageIndex((current) => current + 1)}
          />
          {/* Hot badge — 左上角 */}
          {isHot && (
            <span className="absolute top-1.5 left-1.5 rtl:right-1.5 rtl:left-auto z-[1] inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-red-700 text-white shadow-sm">
              <Flame className="w-3 h-3" />
              {t("hot")}
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
            <FavoriteButton
              productId={product.id}
              variant="icon"
              loginHref={favoriteLoginHref}
            />
          </div>
        </div>

        {/* 信息区域 */}
        <div className="p-3">
          {/* 品牌标签 */}
          {(product.brand?.name || product.aiBrandName) && (
            <span className="mb-1.5 inline-block rounded-full bg-brand-indigo/10 px-2 py-0.5 text-xs font-semibold text-brand-indigo">
              {product.brand?.name || product.aiBrandName}
            </span>
          )}

          {/* 标题 — 2 行截断 */}
          <Heading className="text-[15px] font-semibold text-foreground line-clamp-2 leading-snug mb-1.5">
            {product.title}
          </Heading>

          {/* 价格 */}
          <span className="block truncate text-lg font-extrabold text-primary">
            {priceText}
          </span>

          {(originalPriceText || sourceLabel || updatedDate) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
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

          {agentCount > 0 && (
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted">
              <ShoppingBag className="h-3.5 w-3.5 text-brand-indigo" />
              {t("agentReady", { count: agentCount })}
            </span>
          )}
        </div>
      </Link>

      <Link
        href={`${detailHref}#buy`}
        prefetch={false}
        onClick={handleClick}
        className="mt-auto flex min-h-11 items-center justify-center gap-1 border-t border-border bg-gray-50 px-3 text-xs font-semibold text-red-700"
      >
        {t("buyWithAgent")}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
});
