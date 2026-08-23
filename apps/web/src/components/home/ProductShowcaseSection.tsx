"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Clock } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { fetcher } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  HOME_SHOWCASE_GRID_CLASS,
  HOME_SHOWCASE_LIMIT,
} from "@/lib/home-showcase";
import type { ApiListResponse, ProductListItem } from "@/types";
import { OutboundSource } from "@/lib/search-tracking";
import { useTenant } from "@/components/TenantProvider";

const HOME_SHOWCASE_IMAGE_SIZES =
  "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw";

/* ─── Tab Config ─── */
const TABS = [
  {
    key: "newest",
    labelKey: "showcase.newArrivals",
    icon: Clock,
    query: (limit: number) => `/products?sortBy=newest&limit=${limit}`,
    viewAllHref: "/products?sortBy=newest",
  },
  {
    key: "popular",
    labelKey: "showcase.popular",
    icon: TrendingUp,
    query: (limit: number) => `/products?sortBy=popular&limit=${limit}`,
    viewAllHref: "/products?sortBy=popular",
  },
  {
    key: "trending",
    labelKey: "showcase.trending",
    icon: Sparkles,
    query: (limit: number) =>
      `/products?sortBy=popular&limit=${limit}&page=2`,
    viewAllHref: "/search?sortBy=popular",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface ProductShowcaseSectionProps {
  initialNewestData?: ApiListResponse<ProductListItem>;
}

/* ─── Product Grid with animation ─── */
function ProductGrid({
  products,
  isLoading,
  tabKey,
  noProductsText,
  showcaseLimit,
}: {
  products: ProductListItem[];
  isLoading: boolean;
  tabKey: string;
  noProductsText: string;
  showcaseLimit: number;
}) {
  if (isLoading) {
    return (
      <div className={HOME_SHOWCASE_GRID_CLASS}>
        {Array.from({ length: showcaseLimit }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <div className="text-center py-16 text-muted">{noProductsText}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={HOME_SHOWCASE_GRID_CLASS}
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            imageSizes={HOME_SHOWCASE_IMAGE_SIZES}
            source={OutboundSource.HOME}
            position={index + 1}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Section ─── */
export default function ProductShowcaseSection({
  initialNewestData,
}: ProductShowcaseSectionProps) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const tenant = useTenant();
  const showcaseLimit = tenant ? 12 : HOME_SHOWCASE_LIMIT;
  const [activeTab, setActiveTab] = useState<TabKey>("newest");
  const currentTab = TABS.find((tab) => tab.key === activeTab)!;
  const currentQuery = currentTab.query(showcaseLimit);
  const fallbackData = activeTab === "newest" ? initialNewestData : undefined;

  // Fetch data for the active tab
  const { data, isLoading } = useSWR<ApiListResponse<ProductListItem>>(
    currentQuery,
    fetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      revalidateIfStale: !fallbackData,
      revalidateOnMount: !fallbackData,
      dedupingInterval: 30000,
    },
  );

  const products = data?.data || [];

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      {/* Header with tabs */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative flex min-h-11 items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer",
                    isActive
                      ? "text-white"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-secondary rounded-lg"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.4,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    {t(tab.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View All link */}
          <Link
            href={currentTab.viewAllHref}
            className="inline-flex min-h-11 items-center gap-1 text-primary hover:text-primary-hover font-medium text-sm transition-colors duration-200"
          >
            {tc("viewAll")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </FadeIn>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        isLoading={isLoading}
        tabKey={activeTab}
        noProductsText={t("showcase.noProducts")}
        showcaseLimit={showcaseLimit}
      />

      {!isLoading && products.length > 0 && (
        <FadeIn>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted">
              {t("showcase.browseMoreLabel")}
            </p>
            <Link href={currentTab.viewAllHref}>
              <Button
                size="lg"
                className="rounded-full px-7 shadow-[0_12px_24px_rgba(255,115,77,0.18)]"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                {t("showcase.browseMoreCta", {
                  tab: t(currentTab.labelKey),
                })}
              </Button>
            </Link>
          </div>
        </FadeIn>
      )}
    </section>
  );
}
