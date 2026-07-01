'use client';

import { Clock, X } from 'lucide-react';

interface MobileSearchHistoryProps {
  history: string[];
  onSearch: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
  recentLabel: string;
  clearLabel: string;
}

export function MobileSearchHistory({
  history,
  onSearch,
  onRemove,
  onClearAll,
  recentLabel,
  clearLabel,
}: MobileSearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-muted" />
          {recentLabel}
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted active:text-red-500 transition-colors"
        >
          {clearLabel}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((query) => (
          <div
            key={query}
            role="button"
            tabIndex={0}
            onClick={() => onSearch(query)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSearch(query);
              }
            }}
            className="group inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-gray-100 text-foreground active:bg-gray-200 transition-colors cursor-pointer"
          >
            <span className="truncate max-w-[140px]">{query}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(query);
              }}
              className="p-0.5 -mr-1 rtl:-ml-1 rtl:mr-0 text-gray-300 active:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
