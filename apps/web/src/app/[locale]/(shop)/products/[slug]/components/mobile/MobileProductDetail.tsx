"use client";

import type { ReactNode } from "react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Share2,
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
} from "lucide-react";
import MobileSearchOverlay from "@/components/mobile/MobileSearchOverlay";
import MobileImageSwiper from "./MobileImageSwiper";
import MobileSKUSheet from "./MobileSKUSheet";
import MobileBuyBar from "./MobileBuyBar";
import { MobileDescription } from "./MobileDescription";
import { MobileInlineSKU } from "./MobileInlineSKU";
import PlatformSelectModal from "../PlatformSelectModal";
import ProductRecommendations from "@/components/product/recommendations/ProductRecommendations";
import dynamic from "next/dynamic";

const ColorVariants = dynamic(() => import("../ColorVariants"));
import FindSimilarButton from "@/components/product/recommendations/FindSimilarButton";
import ProductShareEarnCard from "@/components/rewards/ProductShareEarnCard";
import ProductSourceMeta from "@/components/product/ProductSourceMeta";
import ShippingEstimator from "@/components/product/ShippingEstimator";
import { formatPrice, convertPrice, getLocalizedName } from "@/lib/utils";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import { useBuyProduct } from "@/hooks/useBuyProduct";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { parseSkuAttributes } from "@/lib/sku-utils";
import { getImageVariant, getProductDetailThumbnail } from "@/lib/image-utils";
import type { Product, SKU } from "@/types";

const VIDEO_PREVIEW_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><rect width='240' height='240' rx='28' fill='%23eef2f7'/><circle cx='120' cy='120' r='42' fill='white' fill-opacity='0.96'/><path d='M109 98l35 22-35 22z' fill='%231f2937'/></svg>";

interface MobileProductDetailProps {
  product: Product;
  enabled?: boolean;
  onShareOpen?: () => void;
  returnHref?: string | null;
  activationNudge?: ReactNode;
  onReferralActionComplete?: () => void;
}

/**
 * 移动端商品详情页主组件（Section 6.3）
 *
 * 线框（自顶向下）：
 * ┌───────────────────────┐
 * │ ← 返回  [分享] [收藏]  │  ← 透明顶栏（滚动后变白）
 * ├───────────────────────┤
 * │   商品大图轮播           │  ← MobileImageSwiper
 * │    ● ○ ○ ○ ○          │
 * ├───────────────────────┤
 * │ ¥199.00               │  ← 价格区域
 * │ 商品标题（最多两行）      │
 * │ [品牌Tag] [分类Tag]     │
 * ├───────────────────────┤
 * │ 规格  红色/L  >         │  ← 点击弹出 SKU Sheet
 * ├───────────────────────┤
 * │ 商品详情               │  ← 属性 + 描述
 * ├═══════════════════════┤
 * │ [❤️收藏] [🛒去购买]      │  ← MobileBuyBar
 * └───────────────────────┘
 */
export default function MobileProductDetail({
  product,
  enabled = true,
  onShareOpen,
  returnHref,
  activationNudge,
  onReferralActionComplete,
}: MobileProductDetailProps) {
  const router = useRouter();
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { currency: displayCurrency, rates } = useCurrencyStore();

  // State
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [skuSheetOpen, setSkuSheetOpen] = useState(false);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [qcPreviewIndex, setQcPreviewIndex] = useState<number | null>(null);
  const [qcPreviewImageLoaded, setQcPreviewImageLoaded] = useState(false);
  const qcThumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const qcPreviewTouchStart = useRef<{ x: number; y: number } | null>(null);
  useBodyScrollLock(qcPreviewIndex !== null);

  // 根据选择的属性匹配 SKU
  const matchedSku = useMemo(() => {
    if (!product?.skus || Object.keys(selectedAttributes).length === 0)
      return null;
    return product.skus.find((sku) => {
      const attrs = parseSkuAttributes(sku.attributes);
      if (Object.keys(attrs).length === 0) return false;
      return Object.entries(selectedAttributes).every(
        ([key, value]) => attrs[key] === value,
      );
    });
  }, [product?.skus, selectedAttributes]);

  useEffect(() => {
    setSelectedSku(matchedSku ?? null);
  }, [matchedSku]);

  // 滚动监听：透明→白色顶栏
  const headerOpacityRef = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // 在 0~200px 区间内从透明渐变到不透明
      // 量化到 0.01 精度，避免高频 setState
      const opacity = Math.round(Math.min(scrollY / 200, 1) * 100) / 100;
      if (opacity !== headerOpacityRef.current) {
        headerOpacityRef.current = opacity;
        setHeaderOpacity(opacity);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  const normalizedQcMedia = useMemo(
    () =>
      (product.qcMedia || product.qcPhotos || [])
        .filter((media) => Boolean(media?.url))
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((media) => ({
          ...media,
          type: media.type === "video" ? "video" : "image",
          previewUrl:
            media.type === "video"
              ? media.posterUrl
                ? getImageVariant(media.posterUrl, 320)
                : VIDEO_PREVIEW_PLACEHOLDER
              : getImageVariant(media.url, 320),
          modalUrl:
            media.type === "video"
              ? media.url
              : getImageVariant(media.url, 1200),
          thumbnailUrl:
            media.type === "video"
              ? media.posterUrl
                ? getProductDetailThumbnail(media.posterUrl)
                : VIDEO_PREVIEW_PLACEHOLDER
              : getProductDetailThumbnail(media.url),
        })),
    [product.qcMedia, product.qcPhotos],
  );

  useEffect(() => {
    if (qcPreviewIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setQcPreviewIndex(null);
        return;
      }

      if (normalizedQcMedia.length <= 1) return;

      if (event.key === "ArrowLeft") {
        setQcPreviewIndex((prev) =>
          prev === null
            ? 0
            : prev === 0
              ? normalizedQcMedia.length - 1
              : prev - 1,
        );
      }

      if (event.key === "ArrowRight") {
        setQcPreviewIndex((prev) =>
          prev === null
            ? 0
            : prev === normalizedQcMedia.length - 1
              ? 0
              : prev + 1,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [qcPreviewIndex, normalizedQcMedia.length]);

  useEffect(() => {
    if (qcPreviewIndex === null) return;
    const activeThumbnail = qcThumbnailRefs.current[qcPreviewIndex];
    if (
      !activeThumbnail ||
      typeof activeThumbnail.scrollIntoView !== "function"
    ) {
      return;
    }

    activeThumbnail.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [qcPreviewIndex]);

  useEffect(() => {
    if (qcPreviewIndex === null) {
      setQcPreviewImageLoaded(false);
      return;
    }

    setQcPreviewImageLoaded(false);
  }, [qcPreviewIndex]);

  useEffect(() => {
    if (qcPreviewIndex === null || normalizedQcMedia.length <= 1) {
      return;
    }

    const previousIndex =
      qcPreviewIndex === 0 ? normalizedQcMedia.length - 1 : qcPreviewIndex - 1;
    const nextIndex =
      qcPreviewIndex === normalizedQcMedia.length - 1 ? 0 : qcPreviewIndex + 1;

    [
      normalizedQcMedia[previousIndex]?.modalUrl,
      normalizedQcMedia[nextIndex]?.modalUrl,
    ]
      .filter((url): url is string => Boolean(url))
      .forEach((url) => {
        if (
          url.endsWith(".mp4") ||
          url.endsWith(".webm") ||
          url.endsWith(".mov")
        ) {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.src = url;
          return;
        }

        const image = new window.Image();
        image.decoding = "async";
        image.src = url;
      });
  }, [qcPreviewIndex, normalizedQcMedia]);

  const showPreviousQcPreview = () => {
    setQcPreviewIndex((prev) =>
      prev === null ? 0 : prev === 0 ? normalizedQcMedia.length - 1 : prev - 1,
    );
  };

  const showNextQcPreview = () => {
    setQcPreviewIndex((prev) =>
      prev === null ? 0 : prev === normalizedQcMedia.length - 1 ? 0 : prev + 1,
    );
  };

  const handleQcPreviewTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    qcPreviewTouchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleQcPreviewTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = qcPreviewTouchStart.current;
    qcPreviewTouchStart.current = null;
    if (!start || normalizedQcMedia.length <= 1) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      showNextQcPreview();
      return;
    }

    showPreviousQcPreview();
  };

  // 计算价格
  const currentPrice = selectedSku
    ? parseFloat(String(selectedSku.price))
    : (product.priceMin ?? 0);
  const currency = product.currency || "CNY";
  const isConverted = displayCurrency !== currency;
  const approx = isConverted ? "≈ " : "";
  const converted = convertPrice(
    currentPrice,
    currency,
    displayCurrency,
    rates,
  );
  const priceMax = product.priceMax ?? 0;
  const convertedMax = convertPrice(priceMax, currency, displayCurrency, rates);

  const canBuy = !!product?.sourceUrl;

  const { buyWithPlatform, loading: buyLoading } = useBuyProduct({
    productId: product.id,
    buttonVariant: "mobile_buy_bar",
    onSuccess: onReferralActionComplete,
  });

  const handlePlatformSelect = useCallback(
    async (platformKey: string) => {
      await buyWithPlatform(platformKey);
      setPlatformModalOpen(false);
    },
    [buyWithPlatform],
  );
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (returnHref) {
      router.replace(returnHref);
      return;
    }

    router.push("/products");
  }, [returnHref, router]);

  // 处理属性变更
  const handleAttributeChange = (attrName: string, value: string) => {
    setSelectedAttributes((prev) => ({ ...prev, [attrName]: value }));
  };

  // 商品属性
  const productAttributes = product.attributes;

  return (
    <>
      {/* 透明渐变顶栏 — 覆盖在图片上，z-30 覆盖 Layout 的 MobileHeader (z-20) */}
      <div
        className={`fixed inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)] transition-shadow duration-200 ${headerOpacity > 0.8 ? "shadow-[0_1px_0_rgba(0,0,0,0.06)]" : ""}`}
        style={{ backgroundColor: `rgba(255,255,255,${headerOpacity})` }}
      >
        <div className="flex h-12 items-center px-2">
          {/* 返回按钮 */}
          <button
            aria-label={tc("goBack")}
            onClick={handleBack}
            className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-95 transition-all duration-150 ${headerOpacity < 0.5 ? "bg-black/30" : "bg-transparent"}`}
          >
            <ArrowLeft
              className={`h-5 w-5 transition-colors duration-150 ${headerOpacity < 0.5 ? "text-white" : "text-foreground"}`}
            />
          </button>

          {/* 标题 — 滚动过图片后渐显 */}
          <h2
            className="flex-1 text-sm font-medium text-foreground truncate px-2 transition-opacity duration-200"
            style={{ opacity: headerOpacity >= 0.9 ? 1 : 0 }}
          >
            {product.title}
          </h2>

          {/* 右侧按钮组 */}
          <div className="flex items-center">
            {/* 搜索 */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-95 transition-all duration-150 ${headerOpacity < 0.5 ? "bg-black/30" : "bg-transparent"}`}
            >
              <Search
                className={`h-5 w-5 transition-colors duration-150 ${headerOpacity < 0.5 ? "text-white" : "text-foreground"}`}
              />
            </button>

            {/* 分享 */}
            <button
              aria-label={t("share")}
              onClick={() => onShareOpen?.()}
              className={`flex h-11 w-11 items-center justify-center rounded-full active:scale-95 transition-all duration-150 ${headerOpacity < 0.5 ? "bg-black/30" : "bg-transparent"}`}
            >
              <Share2
                className={`h-5 w-5 transition-colors duration-150 ${headerOpacity < 0.5 ? "text-white" : "text-foreground"}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 页面内容 — 需要负 margin 让图片顶到透明顶栏下方 */}
      <div className="-mt-12">
        {/* 图片轮播 */}
        <MobileImageSwiper
          images={(product.images || []).map((img) => img)}
          alt={product.title}
          mainImageUrl={product.mainImage}
          selectedIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
        />

        {/* 价格区域 */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">
              {approx}
              {formatPrice(converted, displayCurrency)}
            </span>
            {!selectedSku && convertedMax > converted && (
              <span className="text-sm text-muted">
                - {formatPrice(convertedMax, displayCurrency)}
              </span>
            )}
          </div>
        </div>

        {/* 标题 + 标签 */}
        <div className="px-4 pb-3">
          <h2 className="text-[17px] font-semibold text-foreground leading-snug line-clamp-2 mb-2">
            {product.title}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {product.primaryCategory && (
              <Link
                href={`/categories/${product.primaryCategory.slug}`}
                className="inline-flex min-h-11 items-center active:scale-95 transition-transform"
              >
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                  {getLocalizedName(product.primaryCategory, locale)}
                </span>
              </Link>
            )}
            {product.brand?.name ? (
              <Link
                href={`/brands/${product.brand.slug}`}
                className="inline-flex min-h-11 items-center active:scale-95 transition-transform"
              >
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent/15 text-amber-700">
                  {product.brand.name}
                </span>
              </Link>
            ) : product.aiBrandName ? (
              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent/15 text-amber-700">
                {product.aiBrandName}
              </span>
            ) : null}
            <FindSimilarButton productId={product.id} capsule />
          </div>
        </div>

        <div className="px-4 pb-3">
          <ProductSourceMeta
            sourceUrl={product.sourceUrl}
            shopName={product.weidianShopName}
            viewCount={product.viewCount}
            salesCount={product.salesCount}
            updatedAt={product.updatedAt}
            productId={product.id}
            productTitle={product.title}
            compact
          />
        </div>

        {activationNudge && <div className="px-4 pb-3">{activationNudge}</div>}

        <div className="px-4 pb-3">
          <ProductShareEarnCard compact onShare={() => onShareOpen?.()} />
        </div>

        {/* 分隔线 */}
        <div className="h-2 bg-gray-50" />

        {/* 同款配色切换（SKU 拆分产品） */}
        {product.isFromSplit && product.productGroupId && (
          <div className="px-4 py-3">
            <ColorVariants
              productGroupId={product.productGroupId}
              currentProductId={product.id}
            />
          </div>
        )}

        {/* 内联 SKU 选择器 */}
        {product.skus && product.skus.length > 0 && (
          <MobileInlineSKU
            skus={product.skus}
            productImages={product.isFromSplit ? [] : product.images || []}
            selectedAttributes={selectedAttributes}
            onAttributeChange={handleAttributeChange}
            onImageSelect={setCurrentImageIndex}
            onOpenSheet={() => setSkuSheetOpen(true)}
            currentImageIndex={currentImageIndex}
            sizeOnly={product.isFromSplit}
          />
        )}

        <div className="px-4 py-4">
          <ShippingEstimator compact />
        </div>

        {/* 分隔线 */}
        <div className="h-2 bg-gray-50" />

        {/* QC Photos */}
        {normalizedQcMedia.length > 0 && (
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("tabQcPhotos")}{" "}
                  <span className="text-muted">{normalizedQcMedia.length}</span>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {tc("viewAll")} {normalizedQcMedia.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQcPreviewIndex(0)}
                className="min-h-11 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                {tc("viewAll")}
              </button>
            </div>

            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {normalizedQcMedia.map((media, index) => (
                <button
                  key={`${media.url}-${index}`}
                  type="button"
                  onClick={() => setQcPreviewIndex(index)}
                  className="relative block w-[42vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                >
                  {media.type === "video" ? (
                    <>
                      <video
                        src={media.modalUrl}
                        poster={media.posterUrl || media.previewUrl}
                        preload="metadata"
                        muted
                        playsInline
                        className="aspect-square w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img
                      src={media.previewUrl}
                      alt={`QC Photo ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 商品属性 */}
        {productAttributes && Object.keys(productAttributes).length > 0 && (
          <div className="px-4 py-4">
            <h2 className="text-base font-semibold text-foreground mb-3">
              {t("productDetails")}
            </h2>
            <div className="space-y-2">
              {Object.entries(productAttributes).map(([key, value]) => (
                <div key={key} className="flex text-sm">
                  <span className="text-muted w-24 flex-shrink-0">{key}</span>
                  <span className="text-foreground">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 商品描述 — 默认 3 行截断，可展开 */}
        {product.description && (
          <MobileDescription description={product.description} />
        )}

        {/* 推荐模块 */}
        <ProductRecommendations productId={product.id} mobile />

        {/* 底部安全间距（为 BuyBar 留空） */}
        <div className="h-20" />
      </div>

      {/* SKU Sheet */}
      <MobileSKUSheet
        open={skuSheetOpen}
        onClose={() => setSkuSheetOpen(false)}
        skus={product.skus}
        productImages={product.images || []}
        mainImage={product.mainImage}
        selectedAttributes={selectedAttributes}
        onAttributeChange={handleAttributeChange}
        onImageSelect={setCurrentImageIndex}
        currentImageIndex={currentImageIndex}
        selectedSku={selectedSku}
        currentPrice={currentPrice}
        currency={currency}
        sizeOnly={product.isFromSplit}
      />

      {/* 底部操作栏 */}
      <MobileBuyBar
        productId={product.id}
        price={currentPrice}
        sourceCurrency={currency}
        disabled={!canBuy}
        loading={buyLoading}
        onOpenPlatformSelect={() => setPlatformModalOpen(true)}
        onBuyPreferred={handlePlatformSelect}
        onFavoriteChange={onReferralActionComplete}
      />

      {/* 平台选择弹窗 */}
      <PlatformSelectModal
        open={platformModalOpen}
        onClose={() => setPlatformModalOpen(false)}
        onSelect={handlePlatformSelect}
      />

      {/* 搜索浮层 */}
      <MobileSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {qcPreviewIndex !== null && normalizedQcMedia[qcPreviewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setQcPreviewIndex(null);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setQcPreviewIndex(null)}
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
            aria-label="Close QC preview"
          >
            <X className="h-5 w-5" />
          </button>

          {normalizedQcMedia.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPreviousQcPreview}
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
                aria-label={t("previousImage")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={showNextQcPreview}
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
                aria-label={t("nextImage")}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] z-10 rounded-full bg-black/40 px-3 py-1 text-sm text-white">
            {qcPreviewIndex + 1} / {normalizedQcMedia.length}
          </div>

          {normalizedQcMedia[qcPreviewIndex].type === "video" ? (
            <video
              key={normalizedQcMedia[qcPreviewIndex].modalUrl}
              src={normalizedQcMedia[qcPreviewIndex].modalUrl}
              poster={
                normalizedQcMedia[qcPreviewIndex].posterUrl ||
                normalizedQcMedia[qcPreviewIndex].previewUrl
              }
              controls
              autoPlay
              playsInline
              preload="metadata"
              onLoadedData={() => setQcPreviewImageLoaded(true)}
              onTouchStart={handleQcPreviewTouchStart}
              onTouchEnd={handleQcPreviewTouchEnd}
              className={`max-h-[72vh] max-w-[90vw] object-contain transition-opacity duration-200 ${
                qcPreviewImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <img
              key={normalizedQcMedia[qcPreviewIndex].modalUrl}
              src={normalizedQcMedia[qcPreviewIndex].modalUrl}
              alt={`QC Photo ${qcPreviewIndex + 1}`}
              decoding="async"
              onLoad={() => setQcPreviewImageLoaded(true)}
              onTouchStart={handleQcPreviewTouchStart}
              onTouchEnd={handleQcPreviewTouchEnd}
              className={`max-h-[72vh] max-w-[90vw] object-contain transition-opacity duration-200 ${
                qcPreviewImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {normalizedQcMedia.length > 1 && (
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+12px)] left-1/2 z-10 w-[92vw] -translate-x-1/2">
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl bg-black/35 px-3 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {normalizedQcMedia.map((media, index) => (
                  <button
                    key={`${media.url}-mobile-thumb-${index}`}
                    ref={(node) => {
                      qcThumbnailRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => setQcPreviewIndex(index)}
                    className={`shrink-0 snap-start overflow-hidden rounded-xl border transition-all ${
                      qcPreviewIndex === index
                        ? "border-white shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
                        : "border-white/15 opacity-70"
                    }`}
                    aria-label={`QC thumbnail ${index + 1}`}
                  >
                    {media.type === "video" ? (
                      <div className="relative">
                        <video
                          src={media.modalUrl}
                          poster={media.posterUrl || media.thumbnailUrl}
                          preload="metadata"
                          muted
                          playsInline
                          className="h-14 w-14 object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                        </span>
                      </div>
                    ) : (
                      <img
                        src={media.thumbnailUrl}
                        alt={`QC thumbnail ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
