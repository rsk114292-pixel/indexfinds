'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowRight, Crown } from 'lucide-react';
import FeaturedBrandCard from '@/components/brands/FeaturedBrandCard';
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

  if (!isLoading && brands.length === 0) return null;

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
          {brands.map((brand) => (
            <motion.div key={brand.id} variants={staggerItemVariants}>
              <FeaturedBrandCard brand={brand} compact />
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
