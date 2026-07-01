'use client';

import type { FacetItem } from './types';

interface TagFilterProps {
  items: FacetItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

export function TagFilter({ items, selectedValues, onChange }: TagFilterProps) {
  const handleTagClick = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isSelected = selectedValues.includes(item.value);
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => handleTagClick(item.value)}
            aria-label={`Filter by ${item.label || item.value}`}
            aria-pressed={isSelected}
            className={`
              cursor-pointer rounded-full px-3 py-1 text-sm border min-h-[44px]
              transition-colors duration-200
              ${isSelected
                ? 'bg-primary/10 text-primary border-primary'
                : 'bg-white text-foreground border-border hover:border-gray-300'
              }
            `}
          >
            {item.label || item.value} ({item.count})
          </button>
        );
      })}
    </div>
  );
}
