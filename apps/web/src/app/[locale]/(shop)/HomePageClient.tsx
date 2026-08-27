"use client";

/**
 * 前台首页客户端组件
 *
 * CSS 双 div 分发（模式 B）：
 * - PC 端：hidden lg:block → 原有 6 个 Section（dynamic import 减少移动端包体积）
 * - 移动端：lg:hidden → MobileHome
 * - 两套 SSR 都输出 HTML，CSS 即时隐藏不可见的一套，零闪烁
 *
 * Phase 4.6 性能优化：
 * - PC 端 6 个 Section 使用 next/dynamic 动态导入，移动端不会加载这些 JS
 * - MobileHome 保持静态导入（移动端首屏关键路径）
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import MobileHome from "./components/mobile/MobileHome";
import { useTenant } from "@/components/TenantProvider";
import type {
  ApiListResponse,
  Brand,
  Category,
  ProductListItem,
} from "@/types";

interface HotSearchItem {
  keyword: string;
  count: number;
}

const HeroSection = dynamic(() => import("@/components/home/HeroSection"));
const FeaturedBrandsSection = dynamic(
  () => import("@/components/home/FeaturedBrandsSection"),
);
const CategoriesBentoSection = dynamic(
  () => import("@/components/home/CategoriesBentoSection"),
);
const ProductShowcaseSection = dynamic(
  () => import("@/components/home/ProductShowcaseSection"),
);
const HowItWorksSection = dynamic(
  () => import("@/components/home/HowItWorksSection"),
);
const CtaSection = dynamic(() => import("@/components/home/CtaSection"));
const UsfansQuickStart = dynamic(
  () => import("@/components/home/UsfansQuickStart"),
);
const ItaobuyResearchArchive = dynamic(
  () => import("@/components/home/ItaobuyResearchArchive"),
);
const ItaobuyOfficialPromotion = dynamic(
  () => import("@/components/tenant/ItaobuyOfficialPromotion"),
);

interface HomePageClientProps {
  initialViewport: "desktop" | "mobile";
  initialHotSearches?: HotSearchItem[];
  initialFeaturedBrands?: ApiListResponse<Brand>;
  initialCategories?: Category[] | { data: Category[] };
  initialNewestProducts?: ApiListResponse<ProductListItem>;
}

export default function HomePageClient({
  initialViewport,
  initialHotSearches,
  initialFeaturedBrands,
  initialCategories,
  initialNewestProducts,
}: HomePageClientProps) {
  const tenant = useTenant();
  const homeVariant = tenant?.branding?.editorial.homeVariant;
  const [viewport, setViewport] = useState<"desktop" | "mobile">(
    initialViewport,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateViewport = (matches: boolean) => {
      setViewport(matches ? "desktop" : "mobile");
    };

    updateViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateViewport(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  if (viewport === "mobile") {
    return (
      <>
        {tenant?.domain === "itaobuyindex.com" && (
          <ItaobuyOfficialPromotion />
        )}
        <MobileHome
          initialCategories={initialCategories}
          initialHotSearches={initialHotSearches}
        />
      </>
    );
  }

  if (tenant?.domain === "goatedbuyindex.com") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <UsfansQuickStart />
        <CategoriesBentoSection initialData={initialCategories} />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <CtaSection />
      </>
    );
  }

  if (tenant?.domain === "gtbuyindex.com") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <UsfansQuickStart />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <CtaSection />
      </>
    );
  }

  if (tenant?.domain === "hipobuyindex.com") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <UsfansQuickStart />
        <FeaturedBrandsSection initialData={initialFeaturedBrands} />
        <HowItWorksSection />
        <CtaSection />
      </>
    );
  }

  if (tenant?.domain === "hoobuyindex.net") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <UsfansQuickStart />
        <CategoriesBentoSection initialData={initialCategories} />
        <CtaSection />
      </>
    );
  }

  if (homeVariant === "index") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <UsfansQuickStart />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <CategoriesBentoSection initialData={initialCategories} />
        <FeaturedBrandsSection initialData={initialFeaturedBrands} />
        <HowItWorksSection />
        <CtaSection />
      </>
    );
  }

  if (homeVariant === "catalog") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <UsfansQuickStart />
        <CategoriesBentoSection initialData={initialCategories} />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <FeaturedBrandsSection initialData={initialFeaturedBrands} />
        <HowItWorksSection />
        <CtaSection />
      </>
    );
  }

  if (homeVariant === "items") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <UsfansQuickStart />
        <CategoriesBentoSection initialData={initialCategories} />
        <FeaturedBrandsSection initialData={initialFeaturedBrands} />
        <HowItWorksSection />
        <CtaSection />
      </>
    );
  }

  if (homeVariant === "guide") {
    return (
      <>
        <HeroSection initialHotSearches={initialHotSearches} />
        <UsfansQuickStart />
        <HowItWorksSection />
        <FeaturedBrandsSection initialData={initialFeaturedBrands} />
        <CategoriesBentoSection initialData={initialCategories} />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <CtaSection />
      </>
    );
  }

  if (homeVariant === "archive") {
    return (
      <>
        {tenant?.domain === "itaobuyindex.com" && (
          <ItaobuyOfficialPromotion />
        )}
        <HeroSection initialHotSearches={initialHotSearches} />
        <ItaobuyResearchArchive />
        <CategoriesBentoSection initialData={initialCategories} />
        <ProductShowcaseSection initialNewestData={initialNewestProducts} />
        <FeaturedBrandsSection initialData={initialFeaturedBrands} />
        <CtaSection />
      </>
    );
  }

  return (
    <>
      <HeroSection initialHotSearches={initialHotSearches} />
      <FeaturedBrandsSection initialData={initialFeaturedBrands} />
      <CategoriesBentoSection initialData={initialCategories} />
      <ProductShowcaseSection initialNewestData={initialNewestProducts} />
      <HowItWorksSection />
      <CtaSection />
    </>
  );
}
