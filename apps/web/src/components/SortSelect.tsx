'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const DEFAULT_SORT = 'popular';

const sortOptions = [
  { value: 'popular', tKey: 'popular' },
  { value: 'newest', tKey: 'newest' },
  { value: 'price_asc', tKey: 'priceAsc' },
  { value: 'price_desc', tKey: 'priceDesc' },
] as const;

interface SortSelectProps {
  className?: string;
}

export default function SortSelect({ className }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('sort');
  const currentSort = searchParams.get('sortBy') || DEFAULT_SORT;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);
      if (value === currentSort) {
        // 点击当前选项 → 回到默认排序
        const params = new URLSearchParams(searchParams.toString());
        params.delete('sortBy');
        params.set('page', '1');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_SORT) {
        params.delete('sortBy');
      } else {
        params.set('sortBy', value);
      }
      params.set('page', '1');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [currentSort, pathname, router, searchParams],
  );

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const currentLabel =
    sortOptions.find((o) => o.value === currentSort)?.tKey ?? 'popular';

  return (
    <div ref={containerRef} className={`relative inline-block ${className || ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('label')}
        className="flex items-center justify-between h-10 w-[180px] rounded-md border border-border bg-white px-3 text-sm text-foreground cursor-pointer transition-colors duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <span className="truncate">{t(currentLabel)}</span>
        <ChevronDown
          className={`w-4 h-4 ml-2 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          aria-activedescendant={`sort-option-${currentSort}`}
          className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1 w-[200px] rounded-lg border border-border bg-white shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {sortOptions.map((option) => {
            const isActive = option.value === currentSort;
            return (
              <li
                key={option.value}
                id={`sort-option-${option.value}`}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'text-primary font-medium bg-primary/5'
                    : 'text-foreground hover:bg-gray-50'
                }`}
              >
                <Check
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                />
                <span>{t(option.tKey)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
