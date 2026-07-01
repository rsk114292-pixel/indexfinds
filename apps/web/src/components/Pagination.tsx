'use client';

/**
 * 分页组件
 * Pure Tailwind pagination with URL sync support
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange?: (page: number, pageSize: number) => void;
  className?: string;
}

/**
 * Compute the page numbers to display, inserting -1 as ellipsis markers.
 * Always shows first page, last page, and up to 2 siblings around current.
 */
function getPageNumbers(current: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const siblings = 1;
  const left = Math.max(2, current - siblings);
  const right = Math.min(totalPages - 1, current + siblings);

  pages.push(1);

  if (left > 2) {
    pages.push(-1); // ellipsis
  }

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) {
    pages.push(-1); // ellipsis
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export default function Pagination({
  current,
  total,
  pageSize,
  onChange,
  className,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('product');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleChange = (page: number, newPageSize: number) => {
    if (page < 1 || page > totalPages) return;

    // 如果提供了自定义 onChange，使用它
    if (onChange) {
      onChange(page, newPageSize);
      return;
    }

    // 否则更新 URL 参数
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    if (newPageSize !== pageSize) {
      params.set('limit', String(newPageSize));
    }
    router.push(`?${params.toString()}`);
  };

  const pages = getPageNumbers(current, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col items-center gap-3 py-8 ${className || ''}`}>
      {/* Total info */}
      <span className="text-sm text-muted-foreground">
        {t('totalItems', { count: total })}
      </span>

      {/* Page buttons */}
      <nav aria-label={t('pagination')} className="flex items-center gap-1">
        {/* Previous */}
        <button
          type="button"
          onClick={() => handleChange(current - 1, pageSize)}
          disabled={current <= 1}
          aria-label={t('previousPage')}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-colors duration-200 text-foreground hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page numbers */}
        {pages.map((page, index) => {
          if (page === -1) {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex items-center justify-center w-10 h-10 text-muted-foreground select-none"
                aria-hidden="true"
              >
                &hellip;
              </span>
            );
          }

          const isActive = page === current;
          return (
            <button
              key={page}
              type="button"
              onClick={() => handleChange(page, pageSize)}
              aria-label={t('page', { page })}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-foreground hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          type="button"
          onClick={() => handleChange(current + 1, pageSize)}
          disabled={current >= totalPages}
          aria-label={t('nextPage')}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-colors duration-200 text-foreground hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </nav>
    </div>
  );
}
