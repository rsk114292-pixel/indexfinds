'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getColorStyle, DEFAULT_COLOR_SHOW_COUNT } from './constants';
import type { FacetItem } from './types';

interface ColorFilterProps {
  colors: FacetItem[];
  selectedColors: string[];
  onChange: (colors: string[]) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  showCount?: number;
}

export function ColorFilter({
  colors,
  selectedColors,
  onChange,
  expanded = false,
  onToggleExpand,
  showCount = DEFAULT_COLOR_SHOW_COUNT,
}: ColorFilterProps) {
  const t = useTranslations('filter');
  const displayColors = expanded ? colors : colors.slice(0, showCount);
  const hasMore = colors.length > showCount;

  const handleColorClick = (colorValue: string) => {
    if (selectedColors.includes(colorValue)) {
      onChange(selectedColors.filter((c) => c !== colorValue));
    } else {
      onChange([...selectedColors, colorValue]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 流式标签布局 */}
      <div
        className={`flex flex-wrap gap-2 ${
          expanded
            ? 'max-h-72 overflow-y-auto overscroll-contain pr-1'
            : ''
        }`}
      >
        {displayColors.map((color) => {
          const isSelected = selectedColors.includes(color.value);
          return (
            <button
              key={color.value}
              onClick={() => handleColorClick(color.value)}
              aria-label={`Filter by color ${color.label || color.value}`}
              aria-pressed={isSelected}
              className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs min-h-[44px]
                border transition-colors duration-200 cursor-pointer
                ${isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span style={getColorStyle(color.value)} />
              <span>{color.label || color.value}</span>
              <span className="ml-1 rtl:mr-1 rtl:ml-0 text-slate-600">({color.count})</span>
            </button>
          );
        })}
      </div>

      {/* 展开/收起按钮 */}
      {hasMore && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Show less colors' : 'Show more colors'}
          className="flex items-center gap-1 text-primary text-sm cursor-pointer min-h-[44px] self-start transition-colors duration-200 hover:text-primary/80"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {expanded ? t('showLess') : t('showMoreCount', { count: colors.length - showCount })}
        </button>
      )}
    </div>
  );
}
