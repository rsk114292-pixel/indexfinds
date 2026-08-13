/**
 * 商品详情页客户端组件
 * 处理所有客户端交互：SKU选择、图片切换、购买按钮等
 *
 * CSS 双 div 分发（模式 B — Server Component page.tsx 不动）：
 * - PC 端：hidden lg:block → 原有 ImageMagnifier + SKUSelector + ProductTabs
 * - 移动端：lg:hidden → MobileProductDetail（轮播 + 透明顶栏 + SKU Sheet + BuyBar）
 * - 两套 SSR 都输出 HTML，CSS 即时隐藏不可见的一套，零闪烁
 */
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Share2 } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import { useShareUrl } from "@/hooks/useShareUrl";
import ProductShareEarnCard from "@/components/rewards/ProductShareEarnCard";
import MobileProductDetail from "./components/mobile/MobileProductDetail";
import ProductRecommendations from "@/components/product/recommendations/ProductRecommendations";
import FindSimilarButton from "@/components/product/recommendations/FindSimilarButton";
import ProductSourceMeta from "@/components/product/ProductSourceMeta";
import ShippingEstimator from "@/components/product/ShippingEstimator";
import LazyShareModal from "@/components/share/LazyShareModal";
const ColorVariants = dynamic(() => import("./components/ColorVariants"));

/**
 * Phase 4.6 性能优化：
 * PC 端专用组件使用 dynamic import，移动端不加载这些 JS 模块
 */
const Breadcrumb = dynamic(() => import("@/components/Breadcrumb"));
const BuyButton = dynamic(() => import("./components/BuyButton"));
const SKUSelector = dynamic(() => import("@/components/product/SKUSelector"));
const ProductTabs = dynamic(() => import("@/components/product/ProductTabs"));
import { Link, useRouter } from "@/i18n/navigation";
import { Tag } from "@/components/ui/Tag";
import { Alert } from "@/components/ui/Alert";
import { SkeletonImage } from "@/components/ui/Skeleton";
import { ReferralActivationNudge } from "@/components/account/ReferralActivationNudge";
import { MobileReferralProgressBanner } from "@/components/account/MobileReferralProgressBanner";
import type { ReferralActivationProgressData } from "@/components/account/ReferralActivationGuide";
import { parseSkuAttributes } from "@/lib/sku-utils";
import { getProductDetailMainImage } from "@/lib/image-utils";
import { recordProductView } from "@/lib/browsing-history";
import { trackGA4Event } from "@/lib/ga-events";
import { formatPrice, convertPrice, getLocalizedName } from "@/lib/utils";
import { post, fetcher } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/auth-api";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Product, SKU } from "@/types";
import { useLgUp } from "@/hooks/useLgUp";
import { useSearchParams } from "next/navigation";
import { resolveSafeReturnTo } from "@/lib/return-to";
import { useReferralActivationVisibility } from "@/hooks/useReferralActivationVisibility";
import { cleanProductDescription } from "@/lib/product-description";
import { notice } from "@/lib/notice";

// 动态导入 ImageMagnifier，禁用 SSR 避免 hydration 问题
const ImageMagnifier = dynamic(
  () => import("@/components/product/ImageMagnifier"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <SkeletonImage className="!aspect-auto h-[400px] w-full" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonImage key={i} className="!aspect-auto w-20 h-20" />
          ))}
        </div>
      </div>
    ),
  },
);

interface ProductPageClientProps {
  initialProduct: Product;
  slug: string;
}

export default function ProductPageClient({
  initialProduct,
}: ProductPageClientProps) {
  const product = initialProduct;
  const cleanedDescription = useMemo(
    () => cleanProductDescription(product.description),
    [product.description],
  );
  const t = useTranslations("product");
  const tAccount = useTranslations("account");
  const tc = useTranslations("common");
  const locale = useLocale();
  const lgUp = useLgUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, token, user } = useAuthStore();
  const enabledMobile = lgUp === false;
  const shareUrl = useShareUrl();
  const returnHref = useMemo(
    () => resolveSafeReturnTo(searchParams.get("from")),
    [searchParams],
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
  const localizedCategoryName = useMemo(
    () =>
      product.primaryCategory
        ? getLocalizedName(product.primaryCategory, locale)
        : "",
    [locale, product.primaryCategory],
  );

  // 客户端状态（PC 端使用）
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const handleProductShareSuccess = useCallback(
    async (channelId: string) => {
      if (!product?.id) return;

      await post("/points/track-share", {
        channel: channelId,
        productId: product.id,
      }).catch(() => {
        // 分享本身已经发生；积分记录失败不打断用户操作
      });
    },
    [product?.id],
  );

  // 根据选择的属性找到对应的 SKU
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

  // 当匹配到 SKU 时更新选中的 SKU
  useEffect(() => {
    if (matchedSku) setSelectedSku(matchedSku);
  }, [matchedSku]);

  const { data: activationProgress, mutate: mutateActivationProgress } =
    useSWR<ReferralActivationProgressData>(
      isAuthenticated && token ? "/referral/my-activation" : null,
      fetcher,
      {
        revalidateOnFocus: false,
        dedupingInterval: 30_000,
      },
    );

  const refreshActivationProgress = useCallback(() => {
    if (!isAuthenticated || !token) return;
    void mutateActivationProgress();
  }, [isAuthenticated, mutateActivationProgress, token]);

  // 记录浏览历史（用于个性化搜索）+ GA4 双写 view_item 事件 + 推荐归因追踪
  useEffect(() => {
    if (product?.id) {
      // 记录本地浏览历史
      recordProductView({
        productId: product.id,
        brandId: product.brand?.id,
        brandSlug: product.brand?.slug,
        categoryId: product.primaryCategory?.id,
        categorySlug: product.primaryCategory?.slug,
      });

      // 追踪 GA4 事件
      trackGA4Event("view_item", {
        product_id: product.id,
        product_name: product.title,
        brand: product.brand?.name || product.aiBrandName || "",
        category: localizedCategoryName,
        price: product.priceMin,
        currency: product.currency || "CNY",
      });

      // 上报真实浏览量（用于热度计算）
      post(`/products/${product.id}/view`, {}).catch(() => {});

      // 追踪推荐归因（用于转化验证）— 静默失败
      post("/referral/track-view", { productId: product.id })
        .then(() => {
          refreshActivationProgress();
        })
        .catch(() => {
          // 静默失败，不影响用户体验
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    localizedCategoryName,
    product?.id,
    product?.brand?.id,
    product?.brand?.slug,
    product?.primaryCategory?.id,
    product?.primaryCategory?.slug,
    refreshActivationProgress,
  ]);

  // 拆分产品：获取 siblings 图片用于轮播（替代 detailImages）
  interface SiblingImage {
    id: string;
    mainImage: string;
  }
  const { data: siblings } = useSWR<SiblingImage[]>(
    product.isFromSplit && product.productGroupId
      ? `/products/sku-split/siblings?productGroupId=${product.productGroupId}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  // 合并所有图片来源
  const allImages = useMemo(() => {
    // 拆分产品：用 siblings 的 mainImage 替代 detailImages
    if (product.isFromSplit && siblings && siblings.length > 1) {
      // 当前产品排第一，其余按原顺序
      const currentImg = product.mainImage || product.images?.[0];
      const seen = new Set<string>();
      const merged: string[] = [];
      if (currentImg) {
        seen.add(currentImg);
        merged.push(currentImg);
      }
      for (const s of siblings) {
        if (s.id !== product.id && s.mainImage && !seen.has(s.mainImage)) {
          seen.add(s.mainImage);
          merged.push(s.mainImage);
        }
      }
      return merged;
    }

    // 普通产品：images + detailImages
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const img of product.images || []) {
      if (img && !seen.has(img)) {
        seen.add(img);
        merged.push(img);
      }
    }
    for (const img of product.detailImages || []) {
      if (img && !seen.has(img)) {
        seen.add(img);
        merged.push(img);
      }
    }
    return merged;
  }, [
    product.images,
    product.detailImages,
    product.isFromSplit,
    product.mainImage,
    product.id,
    siblings,
  ]);

  // 判断是否可以购买
  const canBuy = useMemo(() => !!product?.sourceUrl, [product?.sourceUrl]);

  // 计算当前价格
  const currentPrice = selectedSku
    ? parseFloat(String(selectedSku.price))
    : (product.priceMin ?? 0);

  const currency = product.currency || "CNY";

  // 处理属性变更
  const handleAttributeChange = (attrName: string, value: string) => {
    setSelectedAttributes((prev) => ({ ...prev, [attrName]: value }));
  };

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true);
    try {
      await sendVerificationEmail();
      notice.success(tAccount("verificationEmailSent"));
    } catch (error: unknown) {
      notice.error(
        error instanceof Error
          ? error.message
          : tAccount("failedToSendVerification"),
      );
    } finally {
      setSendingVerification(false);
    }
  };

  const showActivationNudge =
    !!activationProgress?.isReferred &&
    ["in_progress", "rejected"].includes(activationProgress.status);
  const activationNudgeUi = useReferralActivationVisibility({
    data: activationProgress,
    surface: "product",
    userId: user?.id,
  });

  const renderActivationNudge = () => {
    if (!showActivationNudge || activationNudgeUi.dismissed) return null;

    if (!lgUp) {
      return (
        <MobileReferralProgressBanner
          data={activationProgress}
          surface="product"
          onVerifyEmail={
            !activationProgress.progress.emailVerified
              ? handleSendVerificationEmail
              : undefined
          }
          verifyingEmail={sendingVerification}
          onDismiss={activationNudgeUi.dismiss}
        />
      );
    }

    return (
      <ReferralActivationNudge
        data={activationProgress}
        surface="product"
        onVerifyEmail={
          !activationProgress.progress.emailVerified
            ? handleSendVerificationEmail
            : undefined
        }
        verifyingEmail={sendingVerification}
        onDismiss={activationNudgeUi.dismiss}
      />
    );
  };

  return (
    <>
      {/* ── PC 端视图 ── */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {tc("goBack")}
          </button>

          {/* 面包屑 */}
          {product.breadcrumbs && product.breadcrumbs.length > 0 && (
            <Breadcrumb items={product.breadcrumbs} className="mb-6" />
          )}

          {/* 主要内容区 */}
          <div className="mb-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
            {/* 左侧：图片展示（带放大镜功能） */}
            <div
              className="sticky top-24 self-start"
              data-testid="desktop-product-gallery"
            >
              <ImageMagnifier
                images={allImages.map((img) => getProductDetailMainImage(img))}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                alt={product.title}
                mainImageUrl={getProductDetailMainImage(product.mainImage)}
              />
            </div>

            {/* 右侧：商品信息 */}
            <div className="space-y-6">
              {/* 标题和标签 */}
              <ProductHeader
                category={product.primaryCategory}
                brand={product.brand}
                aiBrandName={product.aiBrandName}
                title={product.title}
              />

              {/* 价格 */}
              <PriceDisplay
                currentPrice={currentPrice}
                priceMax={product.priceMax}
                currency={currency}
                selectedSku={selectedSku}
              />

              {renderActivationNudge()}

              {/* 同款配色切换（SKU 拆分产品） */}
              {product.isFromSplit && product.productGroupId && (
                <ColorVariants
                  productGroupId={product.productGroupId}
                  currentProductId={product.id}
                />
              )}

              {/* 先选择风格和尺寸，再选择代购 */}
              <SKUSelector
                skus={product.skus}
                productImages={product.isFromSplit ? [] : allImages}
                selectedAttributes={selectedAttributes}
                onAttributeChange={handleAttributeChange}
                onImageSelect={setCurrentImageIndex}
                currentImageIndex={currentImageIndex}
                selectedSku={selectedSku}
                hideStock={product.isFromSplit}
                sizeOnly={product.isFromSplit}
              />

              <div
                id="buy"
                className="scroll-mt-28 rounded-2xl border border-primary/20 bg-white p-4 shadow-lg shadow-primary/5"
                data-testid="desktop-buy-panel"
              >
                <BuyButton
                  productId={product.id}
                  price={currentPrice}
                  sourceCurrency={currency}
                  disabled={!canBuy}
                  onBuySuccess={refreshActivationProgress}
                />
                <div className="mt-3 flex items-center gap-3">
                  <FavoriteButton
                    productId={product.id}
                    variant="icon"
                    className="h-12 w-12 flex items-center justify-center rounded-lg border border-border hover:border-primary/30 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                    onStatusChange={refreshActivationProgress}
                  />
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(true)}
                    className="h-12 w-12 flex items-center justify-center rounded-lg border border-border hover:border-primary/30 hover:text-primary transition-colors duration-200 cursor-pointer"
                    aria-label={t("share")}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <FindSimilarButton
                    productId={product.id}
                    className="h-12 flex-1"
                  />
                </div>
              </div>

              {/* 产品描述（折叠展开） */}
              <ProductDescription
                description={cleanedDescription}
                isExpanded={isDescriptionExpanded}
                onToggle={() =>
                  setIsDescriptionExpanded(!isDescriptionExpanded)
                }
              />

              <ProductSourceMeta
                sourceUrl={product.sourceUrl}
                shopName={product.weidianShopName}
                viewCount={product.viewCount}
                salesCount={product.salesCount}
                updatedAt={product.updatedAt}
                productId={product.id}
                productTitle={product.title}
              />

              <ShippingEstimator />

              {/* 操作按钮 */}
              <ProductShareEarnCard onShare={() => setShareModalOpen(true)} />

              {/* 说明文字 */}
              <Alert
                type="info"
                title={t("purchaseInfo")}
                description={t("purchaseInfoDesc")}
              />
            </div>
          </div>

          {/* 商品详细信息 Tabs */}
          <ProductTabs
            description={cleanedDescription}
            attributes={product.attributes}
            qcMedia={product.qcMedia ?? product.qcPhotos}
          />

          {/* 推荐模块 */}
          <ProductRecommendations productId={product.id} />
        </div>
      </div>

      {/* ── 移动端视图 ── */}
      <div className="lg:hidden -mt-12 -mb-14">
        <MobileProductDetail
          product={{
            ...product,
            description: cleanedDescription,
            images: allImages,
          }}
          enabled={enabledMobile}
          onShareOpen={() => setShareModalOpen(true)}
          returnHref={returnHref}
          activationNudge={renderActivationNudge()}
          onReferralActionComplete={refreshActivationProgress}
        />
      </div>

      {/* 分享弹窗 */}
      {shareModalOpen ? (
        <LazyShareModal
          open
          onClose={() => setShareModalOpen(false)}
          title={product.title}
          url={
            shareUrl ||
            (typeof window !== "undefined" ? window.location.href : "")
          }
          imageUrl={product.mainImage}
          campaign="referral_page_share"
          onShareSuccess={handleProductShareSuccess}
        />
      ) : null}
    </>
  );
}

// ============================================================
// 子组件
// ============================================================

interface ProductHeaderProps {
  category?: {
    name: string;
    slug: string;
    nameEn?: string;
    translations?: Record<string, { name?: string }> | null;
  } | null;
  brand?: { name: string; slug: string } | null;
  aiBrandName?: string | null;
  title: string;
}

function ProductHeader({
  category,
  brand,
  aiBrandName,
  title,
}: ProductHeaderProps) {
  const locale = useLocale();
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {category && (
          <Link
            href={`/categories/${category.slug}`}
            className="hover:opacity-80 transition-opacity"
          >
            <Tag color="purple" size="md">
              {getLocalizedName(category, locale)}
            </Tag>
          </Link>
        )}
        {brand?.name ? (
          <Link
            href={`/brands/${brand.slug}`}
            className="hover:opacity-80 transition-opacity"
          >
            <Tag color="blue" size="md">
              {brand.name}
            </Tag>
          </Link>
        ) : aiBrandName ? (
          <Tag color="blue" size="md">
            {aiBrandName}
          </Tag>
        ) : null}
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
    </div>
  );
}

interface PriceDisplayProps {
  currentPrice: number;
  priceMax?: number | null;
  currency: string;
  selectedSku: SKU | null;
}

function PriceDisplay({
  currentPrice,
  priceMax,
  currency,
  selectedSku,
}: PriceDisplayProps) {
  const t = useTranslations("product");
  const { currency: displayCurrency, rates } = useCurrencyStore();
  const isConverted = displayCurrency !== currency;
  const approx = isConverted ? "≈ " : "";
  const converted = convertPrice(
    currentPrice,
    currency,
    displayCurrency,
    rates,
  );
  const maxPrice = priceMax ?? 0;
  const convertedMax = convertPrice(maxPrice, currency, displayCurrency, rates);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-4xl font-bold text-accent">
        {approx}
        {formatPrice(converted, displayCurrency)}
      </div>
      {!selectedSku && convertedMax > converted && (
        <div className="text-sm text-muted mt-1">
          {t("priceRangeLabel", {
            min: approx + formatPrice(converted, displayCurrency),
            max: formatPrice(convertedMax, displayCurrency),
          })}
        </div>
      )}
    </div>
  );
}

interface ProductDescriptionProps {
  description?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function ProductDescription({
  description,
  isExpanded,
  onToggle,
}: ProductDescriptionProps) {
  const t = useTranslations("product");
  if (!description) return null;

  const plainText = description.replace(/<[^>]*>/g, "");
  const shouldTruncate = plainText.length > 150;
  const displayText =
    isExpanded || !shouldTruncate ? plainText : plainText.slice(0, 150) + "...";

  return (
    <div className="text-muted leading-relaxed">
      <p>{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={onToggle}
          className="text-primary hover:text-primary-hover hover:underline text-sm mt-1 cursor-pointer"
        >
          {isExpanded ? t("showLess") : t("readMore")}
        </button>
      )}
    </div>
  );
}
