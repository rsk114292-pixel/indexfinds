'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import BrandLogo from './BrandLogo';
import type { Brand } from '@/types';

interface FeaturedBrandCardProps {
  brand: Brand;
  className?: string;
  compact?: boolean;
  priority?: boolean;
}

export default memo(function FeaturedBrandCard({
  brand,
  className,
  compact = false,
  priority = false,
}: FeaturedBrandCardProps) {
  const t = useTranslations('brands');

  return (
    <Link href={`/brands/${brand.slug}`} prefetch={false}>
      <div
        className={cn(
          'group flex flex-col items-center justify-center rounded-xl border border-border bg-surface',
          'hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer',
          compact
            ? 'min-h-[152px] gap-2 px-4 py-4 rounded-2xl hover:-translate-y-0.5'
            : 'aspect-square gap-2.5 p-5',
          className,
        )}
      >
        <BrandLogo
          name={brand.name}
          logoUrl={brand.logoUrl}
          size="xl"
          priority={priority}
          className={cn(
            'transition-transform duration-200 group-hover:scale-105',
            compact && 'shadow-sm',
          )}
        />
        <div className="text-center min-w-0 w-full">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {brand.name}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {t('productCount', { count: brand.productCount || 0 })}
          </p>
        </div>
      </div>
    </Link>
  );
});
