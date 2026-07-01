'use client';

import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { convertPrice } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface PriceRangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function PriceRangeFilter({ min, max, value, onChange }: PriceRangeFilterProps) {
  const { currency, rates } = useCurrencyStore();
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  // CNY → 展示货币
  const toDisplay = (v: number) => Math.round(convertPrice(v, 'CNY', currency, rates));
  // 展示货币 → CNY
  const toCNY = (v: number) => Math.round(convertPrice(v, currency, 'CNY', rates));

  const displayMin = toDisplay(min);
  const displayMax = toDisplay(max);
  const displayValMin = toDisplay(value[0]);
  const displayValMax = toDisplay(value[1]);

  const handleSliderChange = (newValue: number[]) => {
    onChange([toCNY(newValue[0]), toCNY(newValue[1])]);
  };

  const handleMinChange = (newMin: number | null) => {
    if (newMin !== null) {
      onChange([toCNY(newMin), value[1]]);
    }
  };

  const handleMaxChange = (newMax: number | null) => {
    if (newMax !== null) {
      onChange([value[0], toCNY(newMax)]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Range slider */}
      <div className="flex flex-col gap-1 px-1">
        <input
          type="range"
          min={displayMin}
          max={displayMax}
          value={displayValMin}
          onChange={(e) =>
            handleSliderChange([Math.min(Number(e.target.value), displayValMax), displayValMax])
          }
          aria-label="Minimum price"
          className="w-full h-2 cursor-pointer min-h-[44px]"
          style={{ accentColor: 'var(--color-primary)' }}
        />
        <input
          type="range"
          min={displayMin}
          max={displayMax}
          value={displayValMax}
          onChange={(e) =>
            handleSliderChange([displayValMin, Math.max(Number(e.target.value), displayValMin)])
          }
          aria-label="Maximum price"
          className="w-full h-2 cursor-pointer min-h-[44px]"
          style={{ accentColor: 'var(--color-primary)' }}
        />
      </div>

      {/* Number inputs */}
      <div className="flex items-center gap-2 w-full justify-between">
        <div className="relative">
          <span className="absolute left-2 rtl:right-2 rtl:left-auto top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
            {symbol}
          </span>
          <input
            type="number"
            min={displayMin}
            max={displayValMax}
            value={displayValMin}
            onChange={(e) => handleMinChange(e.target.value ? Number(e.target.value) : null)}
            aria-label="Minimum price input"
            className="h-[44px] px-2 pl-6 rtl:pr-6 rtl:pl-2 text-sm border border-border rounded-md w-24 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors duration-200"
          />
        </div>
        <span className="text-gray-400">&ndash;</span>
        <div className="relative">
          <span className="absolute left-2 rtl:right-2 rtl:left-auto top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
            {symbol}
          </span>
          <input
            type="number"
            min={displayValMin}
            max={displayMax}
            value={displayValMax}
            onChange={(e) => handleMaxChange(e.target.value ? Number(e.target.value) : null)}
            aria-label="Maximum price input"
            className="h-[44px] px-2 pl-6 rtl:pr-6 rtl:pl-2 text-sm border border-border rounded-md w-24 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors duration-200"
          />
        </div>
      </div>
    </div>
  );
}
