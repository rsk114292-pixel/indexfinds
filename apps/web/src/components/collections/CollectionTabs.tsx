'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, MoreHorizontal } from 'lucide-react';

export interface CollectionTab {
  id: string;
  name: string;
  itemCount?: number;
}

interface CollectionTabsProps {
  collections: CollectionTab[];
  activeId: string | null; // null = "All Favorites"
  onChange: (id: string | null) => void;
  onCreateClick: () => void;
  onManageClick?: (collection: CollectionTab) => void;
}

export default function CollectionTabs({
  collections,
  activeId,
  onChange,
  onCreateClick,
  onManageClick,
}: CollectionTabsProps) {
  const t = useTranslations('account');
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = activeRef.current;
      const left = tab.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeId]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 px-1"
      >
        {/* All Favorites tab */}
        <TabButton
          ref={activeId === null ? activeRef : undefined}
          active={activeId === null}
          onClick={() => onChange(null)}
          label={t('allFavorites')}
        />

        {/* Collection tabs */}
        {collections.map((col) => (
          <div key={col.id} className="relative flex items-center group">
            <TabButton
              ref={activeId === col.id ? activeRef : undefined}
              active={activeId === col.id}
              onClick={() => onChange(col.id)}
              label={col.name}
              count={col.itemCount}
            />
            {onManageClick && activeId === col.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick(col);
                }}
                className="ml-1 rtl:mr-1 rtl:ml-0 p-1 rounded-full text-muted hover:text-foreground hover:bg-muted/20 transition-colors"
                aria-label={t('manageCollection')}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Create new collection button */}
        <button
          type="button"
          onClick={onCreateClick}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-muted text-muted text-sm hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('createCollection')}</span>
        </button>
      </div>
    </div>
  );
}

/* ── Tab Button ── */

import { forwardRef } from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}

const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(
  ({ active, onClick, label, count }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          active
            ? 'bg-primary text-white'
            : 'bg-muted/10 text-muted hover:bg-muted/20 hover:text-foreground'
        }`}
      >
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span
            className={`text-xs ${active ? 'text-white/70' : 'text-muted'}`}
          >
            {count}
          </span>
        )}
      </button>
    );
  },
);

TabButton.displayName = 'TabButton';
