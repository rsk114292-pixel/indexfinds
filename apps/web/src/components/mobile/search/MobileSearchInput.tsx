'use client';

import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface MobileSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onClose: () => void;
  onClear: () => void;
  placeholder: string;
  cancelLabel: string;
}

export const MobileSearchInput = forwardRef<HTMLInputElement, MobileSearchInputProps>(
  function MobileSearchInput({ value, onChange, onSearch, onClose, onClear, placeholder, cancelLabel }, ref) {
    return (
      <div className="flex items-center gap-2 px-4 h-12 shrink-0">
        <div className="flex-1 flex items-center gap-2 h-10 rounded-lg bg-gray-100 px-3">
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch(value);
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted outline-none"
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="search"
          />
          {value && (
            <button type="button" onClick={onClear} aria-label={cancelLabel} className="p-0.5">
              <X className="h-4 w-4 text-muted" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-foreground shrink-0 px-1 active:opacity-70"
        >
          {cancelLabel}
        </button>
      </div>
    );
  },
);
