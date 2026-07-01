'use client';

import { Flame } from 'lucide-react';

interface MobileHotSearchesProps {
  items: { keyword: string; count: number }[];
  onSearch: (keyword: string) => void;
  label: string;
}

const RANK_BADGE_CLASSES = [
  'bg-red-500 text-white',
  'bg-orange-500 text-white',
  'bg-amber-400 text-white',
];

export function MobileHotSearches({ items, onSearch, label }: MobileHotSearchesProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
        <Flame className="w-4 h-4 text-red-500" />
        {label}
      </h3>
      <div className="space-y-0.5">
        {items.map((item, index) => (
          <button
            key={item.keyword}
            type="button"
            onClick={() => onSearch(item.keyword)}
            className="flex items-center gap-3 w-full px-2 py-2.5 rounded-lg active:bg-gray-50 transition-colors"
          >
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0 ${RANK_BADGE_CLASSES[index] || 'bg-gray-200 text-gray-500'}`}
            >
              {index + 1}
            </span>
            <span className={`text-sm text-foreground ${index < 3 ? 'font-medium' : ''}`}>
              {item.keyword}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
