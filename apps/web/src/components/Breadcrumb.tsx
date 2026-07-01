'use client';

/**
 * 面包屑组件
 * 用于显示页面层级导航
 */
import { Link } from '@/i18n/navigation';
import { Home, ChevronRight } from 'lucide-react';
import type { Breadcrumb as BreadcrumbType } from '@/types';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/utils';

interface BreadcrumbProps {
  items: BreadcrumbType[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  const t = useTranslations('product');
  const tc = useTranslations('common');
  const locale = useLocale();
  return (
    <nav aria-label={t('breadcrumb')} className={className}>
      <ol className="flex items-center gap-1 text-sm">
        {/* Home */}
        <li>
          <Link
            href="/"
            aria-label={tc('home')}
            className="inline-flex h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground cursor-pointer transition-colors duration-200 hover:text-foreground"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.slug || index} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {isLast ? (
                <span className="text-foreground font-medium px-1">{getLocalizedName(item, locale)}</span>
              ) : (
                <Link
                  href={`/categories/${item.slug}`}
                  className="px-1 text-muted-foreground cursor-pointer transition-colors duration-200 hover:text-foreground"
                >
                  {getLocalizedName(item, locale)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
