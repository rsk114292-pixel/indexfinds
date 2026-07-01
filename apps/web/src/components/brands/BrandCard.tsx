'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import BrandLogo from './BrandLogo';
import type { Brand } from '@/types';

interface BrandCardProps {
  brand: Brand;
  className?: string;
}

export default memo(function BrandCard({ brand, className }: BrandCardProps) {
  const t = useTranslations('brands');
  return (
    <Link href={`/brands/${brand.slug}`} prefetch={false}>
      <div
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer',
          className,
        )}
      >
        <BrandLogo name={brand.name} logoUrl={brand.logoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {brand.name}
          </h4>
          {(brand.productCount ?? 0) > 0 && (
            <p className="text-xs text-muted">
              {t('productCount', { count: brand.productCount ?? 0 })}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
});
