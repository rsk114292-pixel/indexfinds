'use client';

/**
 * 移动端筛选抽屉组件
 * 在移动端显示为底部面板，包含完整的筛选功能
 */
import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { FacetItem } from '@/components/filters/types';

interface FilterDrawerProps {
  brands?: Array<{ label: string; value: string; count: number }>;
  colors?: FacetItem[];
  genders?: FacetItem[];
  styles?: FacetItem[];
  occasions?: FacetItem[];
  seasons?: FacetItem[];
  priceRange?: { min: number; max: number };
}

/* ------------------------------------------------------------------ */
/*  Reusable checkbox group (replaces Ant Design Checkbox.Group)       */
/* ------------------------------------------------------------------ */
function CheckboxGroup({
  options,
  value,
  onChange,
  labelFn,
}: {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  labelFn?: (opt: { value: string; label: string }) => React.ReactNode;
}) {
  const toggle = (v: string) => {
    onChange(
      value.includes(v) ? value.filter((x) => x !== v) : [...value, v],
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const checked = value.includes(opt.value);
        return (
          <label
            key={opt.value}
            className="flex items-center gap-2.5 cursor-pointer min-h-[44px] transition-colors duration-200 hover:bg-gray-50 rounded px-1 -mx-1 select-none"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <span className="text-sm text-gray-700">
              {labelFn ? labelFn(opt) : opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function FilterDrawer({
  brands = [],
  colors = [],
  genders = [],
  styles = [],
  occasions = [],
  seasons = [],
  priceRange = { min: 0, max: 100000 },
}: FilterDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('filter');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);

  // 从 URL 初始化状态
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number]>([
    priceRange.min,
    priceRange.max,
  ]);

  // 同步 URL 参数到状态
  useEffect(() => {
    setSelectedBrands(searchParams.get('brands')?.split(',').filter(Boolean) || []);
    setSelectedColors(searchParams.get('colors')?.split(',').filter(Boolean) || []);
    setSelectedGenders(searchParams.get('genders')?.split(',').filter(Boolean) || []);
    setSelectedStyles(searchParams.get('styles')?.split(',').filter(Boolean) || []);
    setSelectedOccasions(searchParams.get('occasions')?.split(',').filter(Boolean) || []);
    setSelectedSeasons(searchParams.get('seasons')?.split(',').filter(Boolean) || []);
    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    setSelectedPriceRange([
      minP ? Number(minP) : priceRange.min,
      maxP ? Number(maxP) : priceRange.max,
    ]);
  }, [searchParams, priceRange]);

  // 计算已选筛选数量
  const filterCount =
    selectedBrands.length +
    selectedColors.length +
    selectedGenders.length +
    selectedStyles.length +
    selectedOccasions.length +
    selectedSeasons.length +
    (selectedPriceRange[0] !== priceRange.min || selectedPriceRange[1] !== priceRange.max ? 1 : 0);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    // 更新各筛选参数
    const setOrDelete = (key: string, values: string[]) => {
      if (values.length > 0) {
        params.set(key, values.join(','));
      } else {
        params.delete(key);
      }
    };

    setOrDelete('brands', selectedBrands);
    setOrDelete('colors', selectedColors);
    setOrDelete('genders', selectedGenders);
    setOrDelete('styles', selectedStyles);
    setOrDelete('occasions', selectedOccasions);
    setOrDelete('seasons', selectedSeasons);

    if (selectedPriceRange[0] !== priceRange.min) {
      params.set('minPrice', String(selectedPriceRange[0]));
    } else {
      params.delete('minPrice');
    }

    if (selectedPriceRange[1] !== priceRange.max) {
      params.set('maxPrice', String(selectedPriceRange[1]));
    } else {
      params.delete('maxPrice');
    }

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedGenders([]);
    setSelectedStyles([]);
    setSelectedOccasions([]);
    setSelectedSeasons([]);
    setSelectedPriceRange([priceRange.min, priceRange.max]);
  };

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    },
    [open],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* ---- helper: build a divider ---- */
  const Divider = () => <hr className="border-t border-gray-200" />;

  return (
    <>
      {/* FAB trigger button - only visible on mobile */}
      <div className="lg:hidden fixed bottom-4 right-4 rtl:left-4 rtl:right-auto z-30">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${t('openFilters')}${filterCount > 0 ? `, ${t('activeCount', { count: filterCount })}` : ''}`}
          className="relative flex items-center justify-center h-14 w-14 rounded-full bg-primary text-white shadow-lg cursor-pointer transition-colors duration-200 hover:opacity-90"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 rtl:right-auto rtl:-left-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* Backdrop overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Bottom panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('filterPanel')}
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-lg font-semibold">{t('filters')}</h2>
          <div className="flex items-center gap-2">
            {filterCount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-primary cursor-pointer transition-colors duration-200 hover:opacity-80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('clearAllFilters')}
              >
                {t('clearAll')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('closeFilterPanel')}
              className="flex items-center justify-center h-11 w-11 rounded-full hover:bg-gray-100 cursor-pointer transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4">
          <div className="space-y-6 py-4">
            {/* 品牌 */}
            {brands.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t('brands')}</h4>
                <CheckboxGroup
                  options={brands.slice(0, 10).map((b) => ({
                    value: b.value,
                    label: `${b.label} (${b.count})`,
                  }))}
                  value={selectedBrands}
                  onChange={setSelectedBrands}
                />
              </div>
            )}

            {brands.length > 0 && <Divider />}

            {/* 颜色 */}
            {colors.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t('colors')}</h4>
                <CheckboxGroup
                  options={colors.slice(0, 8).map((c) => ({
                    value: c.value,
                    label: `${c.value} (${c.count})`,
                  }))}
                  value={selectedColors}
                  onChange={setSelectedColors}
                />
              </div>
            )}

            {colors.length > 0 && <Divider />}

            {/* 性别 */}
            {genders.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t('gender')}</h4>
                <CheckboxGroup
                  options={genders.map((g) => ({
                    value: g.value,
                    label: `${g.value} (${g.count})`,
                  }))}
                  value={selectedGenders}
                  onChange={setSelectedGenders}
                />
              </div>
            )}

            {genders.length > 0 && <Divider />}

            {/* 材质筛选已隐藏（材质对用户筛选价值低，保留数据但不展示） */}

            {/* 风格 */}
            {styles.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t('styles')}</h4>
                <CheckboxGroup
                  options={styles.slice(0, 8).map((s) => ({
                    value: s.value,
                    label: `${s.value} (${s.count})`,
                  }))}
                  value={selectedStyles}
                  onChange={setSelectedStyles}
                />
              </div>
            )}

            {styles.length > 0 && <Divider />}

            {/* 场合 */}
            {occasions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t('occasions')}</h4>
                <CheckboxGroup
                  options={occasions.slice(0, 8).map((o) => ({
                    value: o.value,
                    label: `${o.value} (${o.count})`,
                  }))}
                  value={selectedOccasions}
                  onChange={setSelectedOccasions}
                />
              </div>
            )}

            {occasions.length > 0 && <Divider />}

            {/* 季节 */}
            {seasons.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t('seasons')}</h4>
                <CheckboxGroup
                  options={seasons.map((s) => ({
                    value: s.value,
                    label: `${s.value} (${s.count})`,
                  }))}
                  value={selectedSeasons}
                  onChange={setSelectedSeasons}
                />
              </div>
            )}

            {(seasons.length > 0 || occasions.length > 0 || styles.length > 0) && <Divider />}

            {/* 价格 */}
            <div>
              <h4 className="font-medium mb-3">{t('priceRange')}</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="price-min" className="sr-only">
                    {t('minimumPrice')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      ¥
                    </span>
                    <input
                      id="price-min"
                      type="number"
                      min={priceRange.min}
                      max={selectedPriceRange[1]}
                      value={selectedPriceRange[0]}
                      onChange={(e) =>
                        setSelectedPriceRange([
                          Math.max(priceRange.min, Number(e.target.value)),
                          selectedPriceRange[1],
                        ])
                      }
                      className="w-full pl-7 pr-3 rtl:pl-3 rtl:pr-7 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px]"
                    />
                  </div>
                </div>
                <span className="text-gray-400 text-sm">&ndash;</span>
                <div className="flex-1">
                  <label htmlFor="price-max" className="sr-only">
                    {t('maximumPrice')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      ¥
                    </span>
                    <input
                      id="price-max"
                      type="number"
                      min={selectedPriceRange[0]}
                      max={priceRange.max}
                      value={selectedPriceRange[1]}
                      onChange={(e) =>
                        setSelectedPriceRange([
                          selectedPriceRange[0],
                          Math.min(priceRange.max, Number(e.target.value)),
                        ])
                      }
                      className="w-full pl-7 pr-3 rtl:pl-3 rtl:pr-7 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-0.5">
                <span>{t('minPrice')} ¥{priceRange.min}</span>
                <span>{t('maxPrice')} ¥{priceRange.max}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t bg-white shrink-0">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-gray-50 min-h-[44px]"
          >
            {tc('cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 bg-primary text-white font-medium py-2.5 px-4 rounded-lg cursor-pointer transition-colors duration-200 hover:opacity-90 min-h-[44px]"
          >
            {t('apply')}{filterCount > 0 ? ` (${filterCount})` : ''}
          </button>
        </div>
      </div>
    </>
  );
}
