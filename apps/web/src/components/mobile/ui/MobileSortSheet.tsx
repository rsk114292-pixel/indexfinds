'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { MobileSheet } from './MobileSheet';

interface MobileSortSheetProps {
  open: boolean;
  onClose: () => void;
  currentSort: string;
  onSortChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; tKey: string }>;
}

export function MobileSortSheet({
  open,
  onClose,
  currentSort,
  onSortChange,
  options,
}: MobileSortSheetProps) {
  const t = useTranslations('sort');

  const handleSelect = (value: string) => {
    onSortChange(value);
    onClose();
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={t('label')} maxHeight="50vh">
      <ul role="listbox" aria-label={t('label')} className="pb-2">
        {options.map((option) => {
          const isActive = currentSort === option.value;
          return (
            <li key={option.value} role="option" aria-selected={isActive}>
              <button
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center justify-between px-2 py-3.5 rounded-lg text-[15px] transition-colors duration-150 active:bg-gray-50 ${
                  isActive ? 'text-primary font-medium' : 'text-foreground'
                }`}
              >
                {t(option.tKey)}
                {isActive && <Check className="w-5 h-5 text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </MobileSheet>
  );
}
