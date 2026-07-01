'use client';

import { List, LayoutGrid, Grid3X3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ViewMode = 'grid' | 'list' | 'compact';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

type ViewTKey = 'listView' | 'gridView' | 'compactView';

const viewConfigs: Array<{ mode: ViewMode; tKey: ViewTKey; Icon: typeof List }> = [
  { mode: 'list', tKey: 'listView', Icon: List },
  { mode: 'grid', tKey: 'gridView', Icon: LayoutGrid },
  { mode: 'compact', tKey: 'compactView', Icon: Grid3X3 },
];

export default function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  const t = useTranslations('product');
  return (
    <div className={`inline-flex items-center rounded-md border border-border ${className || ''}`}>
      {viewConfigs.map(({ mode, tKey, Icon }) => {
        const label = t(tKey);
        return (
        <button
          key={mode}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onChange(mode)}
          className={`
            inline-flex h-[44px] w-[44px] items-center justify-center
            cursor-pointer transition-colors duration-200
            first:rounded-l-md last:rounded-r-md rtl:first:rounded-r-md rtl:first:rounded-l-none rtl:last:rounded-l-md rtl:last:rounded-r-none
            ${
              value === mode
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
            }
          `}
        >
          <Icon className="w-4 h-4" />
        </button>
        );
      })}
    </div>
  );
}
