'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_SHOW_COUNT } from './constants';
import type { FacetItem } from './types';

interface CheckboxFilterProps {
  items: FacetItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  showCount?: number;
}

export function CheckboxFilter({
  items,
  selectedValues,
  onChange,
  expanded = false,
  onToggleExpand,
  showCount = DEFAULT_SHOW_COUNT,
}: CheckboxFilterProps) {
  const t = useTranslations('filter');
  const displayItems = expanded ? items : items.slice(0, showCount);
  const hasMore = items.length > showCount;

  const handleCheckboxChange = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {displayItems.map((item) => (
          <label
            key={item.value}
            className="flex items-center gap-2 min-h-[44px] cursor-pointer transition-colors duration-200 hover:bg-gray-50 rounded px-1 -mx-1"
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(item.value)}
              onChange={() => handleCheckboxChange(item.value)}
              aria-label={`Filter by ${item.label || item.value}`}
              className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
            />
            <span className="text-sm">
              {item.label || item.value} ({item.count})
            </span>
          </label>
        ))}
      </div>
      {hasMore && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Show less options' : 'Show more options'}
          className="flex items-center gap-1 mt-2 text-primary text-sm cursor-pointer min-h-[44px] transition-colors duration-200 hover:text-primary/80"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {expanded ? t('showLess') : t('showMoreCount', { count: items.length - showCount })}
        </button>
      )}
    </>
  );
}
