'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  LayoutGrid,
  Shirt,
  Footprints,
  Briefcase,
  Watch,
  Cpu,
  Tag,
} from 'lucide-react';
import { FadeIn } from '@/components/ui/FadeIn';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetcher } from '@/lib/api';
import { cn, getLocalizedName } from '@/lib/utils';
import type { Category } from '@/types';
import Image from 'next/image';
import { getImageReferrerPolicy, getImageVariant } from '@/lib/image-utils';

/* ─── Types ─── */
type CategoriesResponse = Category[] | { data: Category[] };

function normalizeCategories(data: CategoriesResponse | undefined): Category[] | undefined {
  if (!data) return undefined;
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as { data?: unknown }).data)) return (data as { data: Category[] }).data;
  return undefined;
}

const CATEGORY_PRIORITY = ['clothing', 'shoes', 'bags', 'accessories', 'electronics'];

/* ─── Category mesh-gradient config ─── */
type CategoryConfig = {
  icon: typeof Shirt;
  base: string;          // dark base bg
  blobs: string[];       // gradient blobs (position + size + color + blur + opacity)
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  clothing: {
    icon: Shirt,
    base: 'bg-rose-950',
    blobs: [
      '-top-10 -left-10 w-48 h-48 bg-rose-400 blur-3xl opacity-60',
      'bottom-0 right-0 w-56 h-56 bg-pink-500 blur-3xl opacity-50',
      'top-1/2 left-1/3 w-36 h-36 bg-red-300 blur-2xl opacity-40',
    ],
  },
  shoes: {
    icon: Footprints,
    base: 'bg-indigo-950',
    blobs: [
      '-top-10 right-0 w-48 h-48 bg-blue-500 blur-3xl opacity-60',
      'bottom-10 -left-10 w-56 h-56 bg-indigo-400 blur-3xl opacity-50',
      'top-1/3 left-1/2 w-40 h-40 bg-sky-300 blur-2xl opacity-40',
    ],
  },
  bags: {
    icon: Briefcase,
    base: 'bg-amber-950',
    blobs: [
      '-top-10 -left-10 w-52 h-52 bg-amber-400 blur-3xl opacity-60',
      'bottom-0 right-0 w-48 h-48 bg-orange-500 blur-3xl opacity-50',
      'top-1/2 right-1/4 w-36 h-36 bg-yellow-300 blur-2xl opacity-35',
    ],
  },
  accessories: {
    icon: Watch,
    base: 'bg-purple-950',
    blobs: [
      'top-0 right-0 w-48 h-48 bg-purple-400 blur-3xl opacity-60',
      'bottom-0 -left-10 w-56 h-56 bg-violet-500 blur-3xl opacity-50',
      'top-1/3 left-1/2 w-40 h-40 bg-fuchsia-300 blur-2xl opacity-35',
    ],
  },
  electronics: {
    icon: Cpu,
    base: 'bg-teal-950',
    blobs: [
      '-top-10 left-0 w-52 h-52 bg-emerald-400 blur-3xl opacity-55',
      'bottom-0 right-0 w-48 h-48 bg-teal-500 blur-3xl opacity-50',
      'top-1/2 left-1/2 w-36 h-36 bg-cyan-300 blur-2xl opacity-35',
    ],
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  icon: Tag,
  base: 'bg-slate-900',
  blobs: [
    '-top-10 -left-10 w-48 h-48 bg-slate-500 blur-3xl opacity-50',
    'bottom-0 right-0 w-48 h-48 bg-gray-400 blur-3xl opacity-40',
  ],
};

/* ─── Single Category Card ─── */
function CategoryCard({
  category,
  index,
  t,
}: {
  category: Category;
  index: number;
  t: ReturnType<typeof useTranslations<'home'>>;
}) {
  const locale = useLocale();
  const config = CATEGORY_CONFIG[category.slug] || DEFAULT_CONFIG;
  const IconComponent = config.icon;

  const totalCount = category.productCount || 0;
  const heroImage = category.coverImage || category.heroImage;
  const children = category.children || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.06 * index, ease: 'easeOut' }}
    >
      <Link
        href={`/categories/${category.slug}`}
        className="group relative block w-full overflow-hidden rounded-2xl cursor-pointer aspect-[3/4]"
      >
        {/* Background: product image or mesh gradient fallback */}
        {heroImage ? (
          <>
            <Image
              src={getImageVariant(heroImage, 480)}
              alt=""
              fill
              sizes="(min-width: 768px) 20vw, 45vw"
              className="object-cover object-[center_top] transition-transform duration-500 group-hover:scale-105"
              referrerPolicy={getImageReferrerPolicy(heroImage)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/5" />
          </>
        ) : (
          <div className={cn('absolute inset-0', config.base)}>
            {config.blobs.map((blob, i) => (
              <div key={i} className={cn('absolute rounded-full', blob)} />
            ))}
            <IconComponent className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-white/[0.07]" />
          </div>
        )}

        {/* Frosted bottom bar */}
        <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-md px-4 py-3 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm md:text-base truncate">
                {getLocalizedName(category, locale)}
              </h3>
              {totalCount > 0 && (
                <p className="text-[11px] md:text-xs text-white/60 mt-0.5">
                  {t('popularCategories.items', { count: totalCount.toLocaleString() })}
                </p>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all duration-200 flex-shrink-0" />
          </div>

          {/* Subcategory chips — visible on hover */}
          {children.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
              {children.slice(0, 3).map((child) => (
                <span
                  key={child.id}
                  className="px-2 py-0.5 text-[11px] font-medium text-white/90 bg-white/15 rounded-full"
                >
                  {getLocalizedName(child, locale)}
                </span>
              ))}
              {children.length > 3 && (
                <span className="px-2 py-0.5 text-[11px] text-white/40">
                  +{children.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Skeleton ─── */
function CategorySkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4] min-w-[200px] flex-1 rounded-2xl" />
      ))}
    </div>
  );
}

/* ─── Main Section ─── */
interface CategoriesBentoSectionProps {
  initialData?: CategoriesResponse;
}

export default function CategoriesBentoSection({
  initialData,
}: CategoriesBentoSectionProps) {
  const { data, isLoading } = useSWR<CategoriesResponse>('/categories/home', fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    revalidateIfStale: !initialData,
    revalidateOnMount: !initialData,
    dedupingInterval: 60000,
  });

  const categories = useMemo(() => {
    const raw = normalizeCategories(data);
    if (!raw) return [];
    const priorityMap = new Map(CATEGORY_PRIORITY.map((slug, i) => [slug, i]));
    return [...raw]
      .sort((a, b) => (priorityMap.get(a.slug) ?? 999) - (priorityMap.get(b.slug) ?? 999))
      .slice(0, 10);
  }, [data]);

  const t = useTranslations('home');
  const tc = useTranslations('common');

  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      {/* Section Header */}
      <FadeIn>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('popularCategories.title')}
            </h2>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-medium text-sm transition-colors duration-200"
          >
            {tc('viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </FadeIn>

      {/* Category Grid — horizontal scroll with peek on overflow */}
      {isLoading ? (
        <CategorySkeleton />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
          {categories.map((category, index) => (
            <div key={category.id} className="min-w-[160px] w-[45%] sm:w-[30%] md:w-auto flex-shrink-0 snap-start">
              <CategoryCard category={category} index={index} t={t} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
