'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowRight, Crown } from 'lucide-react';
import FeaturedBrandCard from '@/components/brands/FeaturedBrandCard';
import BrandLogo from '@/components/brands/BrandLogo';
import { useTenant } from '@/components/TenantProvider';
import { FadeIn, StaggerChildren, staggerItemVariants } from '@/components/ui/FadeIn';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetcher } from '@/lib/api';
import type { ApiListResponse, Brand } from '@/types';

interface FeaturedBrandsSectionProps {
  initialData?: ApiListResponse<Brand>;
}

export default function FeaturedBrandsSection({
  initialData,
}: FeaturedBrandsSectionProps) {
  const { data, isLoading } = useSWR<ApiListResponse<Brand>>(
    '/brands?status=active&isFeatured=true&limit=12',
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateIfStale: !initialData,
      revalidateOnMount: !initialData,
      dedupingInterval: 60000,
    },
  );

  // Backend already sorts by featuredSort ASC, name ASC
  const brands = data?.data ?? [];

  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tenant = useTenant();
  const editorial = tenant?.branding?.editorial;

  if (!isLoading && brands.length === 0) return null;

  if (editorial) {
    return (
      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid overflow-hidden rounded-[28px] border border-[#e5ded6] bg-[#fbfaf8] lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
          <div className="flex flex-col justify-between bg-[#111827] p-7 text-white sm:p-9">
            <div>
              <Crown className="h-6 w-6 text-accent" />
              <h2 className="mt-6 max-w-sm text-3xl font-extrabold leading-[1.06] tracking-[-0.04em] sm:text-4xl">
                {editorial.brandTitle}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
                {editorial.brandDescription}
              </p>
            </div>
            <Link
              href="/brands"
              className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#111827] transition-colors hover:bg-[#f3ede6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
            >
              View the complete brand index
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#e5ded6] bg-white px-4 py-3"
                  >
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))
              : brands.slice(0, 8).map((brand, index) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    prefetch={false}
                    className="group grid min-h-20 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[#e5ded6] bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <BrandLogo
                      name={brand.name}
                      logoUrl={brand.logoUrl}
                      size="md"
                      priority={index < 4}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#111827] group-hover:text-primary">
                        {brand.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#6b7280]">
                        {brand.productCount || 0} products
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#9a9188] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-10 md:py-12">
      {/* Section Header */}
      <FadeIn>
        <div className="mb-6 flex items-center justify-between md:mb-7">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('featuredBrands.title')}
            </h2>
          </div>
          <Link
            href="/brands"
            className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-medium text-sm transition-colors duration-200"
          >
            {tc('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </FadeIn>

      {/* Brand Logo Wall */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <BrandCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <StaggerChildren className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {brands.map((brand, index) => (
            <motion.div key={brand.id} variants={staggerItemVariants}>
              <FeaturedBrandCard brand={brand} compact priority={index < 6} />
            </motion.div>
          ))}
        </StaggerChildren>
      )}
    </section>
  );
}

/* ─── Skeleton for brand card ─── */
function BrandCardSkeleton() {
  return (
    <div className="flex min-h-[152px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-4">
      <Skeleton className="h-16 w-16 rounded-xl" />
      <div className="space-y-1.5 w-full flex flex-col items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
