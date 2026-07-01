'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { COLOR_MAP, LIGHT_COLORS } from '@/components/filters/constants';
import type { FacetItem, CategoryFacetItem } from '@/components/filters/types';

export type { FacetItem };

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLLAPSED_LIMIT = 8;

/* ------------------------------------------------------------------ */
/*  Color Swatch                                                       */
/* ------------------------------------------------------------------ */

function ColorSwatch({ name }: { name: string }) {
  const color = COLOR_MAP[name];
  const isLight = LIGHT_COLORS.includes(name.toLowerCase());
  const isGradient = color?.startsWith('linear-gradient');

  return (
    <span
      className="inline-block w-4 h-4 rounded-full shrink-0"
      style={{
        background: color || '#ccc',
        border: isLight ? '1px solid #d9d9d9' : isGradient ? 'none' : '1px solid transparent',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Tag chip for filter options                                        */
/* ------------------------------------------------------------------ */

export function FilterChip({
  label,
  count,
  selected,
  onToggle,
  colorSwatch,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
  colorSwatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
        border transition-all duration-150
        ${selected
          ? 'border-foreground bg-foreground text-white'
          : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
        }
      `}
    >
      {selected && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
      {colorSwatch && <ColorSwatch name={colorSwatch} />}
      <span>{label}</span>
      <span className={selected ? 'text-white/70' : 'text-gray-400'}>({count})</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Accordion section                                                  */
/* ------------------------------------------------------------------ */

export function AccordionSection({
  title,
  selectedCount,
  defaultOpen = false,
  children,
}: {
  title: string;
  selectedCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (selectedCount > 0) setIsOpen(true);
  }, [selectedCount]);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3.5 text-left rtl:text-right"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold bg-foreground text-white rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expandable chip list (Show more / Show less)                       */
/* ------------------------------------------------------------------ */

export function ExpandableChipList({
  items,
  selectedValues,
  onToggle,
  limit = COLLAPSED_LIMIT,
  useColorSwatch = false,
}: {
  items: FacetItem[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  limit?: number;
  useColorSwatch?: boolean;
}) {
  const t = useTranslations('filter');
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label || item.value}
            count={item.count}
            selected={selectedValues.includes(item.value)}
            onToggle={() => onToggle(item.value)}
            colorSwatch={useColorSwatch ? item.value : undefined}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-gray-500 self-start py-1"
        >
          {expanded ? t('showLess') : t('moreCount', { count: items.length - limit })}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category filter: recursive tree with checkboxes (mobile-optimised)*/
/* ------------------------------------------------------------------ */

function getLocalizedCategoryName(item: CategoryFacetItem, locale: string): string {
  return item.translations?.[locale]?.name || item.name;
}

function getAllCategorySlugs(node: CategoryFacetItem): string[] {
  const slugs = [node.slug];
  if (node.children) {
    for (const child of node.children) slugs.push(...getAllCategorySlugs(child));
  }
  return slugs;
}

/** 检查节点或其子孙中是否有被选中的 */
function hasSelectedDescendant(node: CategoryFacetItem, selectedValues: string[]): boolean {
  if (node.children) {
    for (const child of node.children) {
      if (selectedValues.includes(child.slug)) return true;
      if (hasSelectedDescendant(child, selectedValues)) return true;
    }
  }
  return false;
}

/**
 * 移动端分类树节点（递归）
 */
function MobileCategoryNode({
  node,
  selectedValues,
  onChange,
  locale,
  depth = 0,
  ancestorSlugs = [],
}: {
  node: CategoryFacetItem;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  locale: string;
  depth?: number;
  ancestorSlugs?: string[];
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedValues.includes(node.slug);
  // 自动展开：自身选中 或 子孙有选中
  const [expanded, setExpanded] = useState(
    isSelected || hasSelectedDescendant(node, selectedValues),
  );

  const handleToggle = () => {
    if (isSelected) {
      const descendantSlugs = getAllCategorySlugs(node);
      onChange(selectedValues.filter((v) => !descendantSlugs.includes(v)));
    } else {
      const descendantSlugs = getAllCategorySlugs(node);
      const toRemove = new Set([...ancestorSlugs, ...descendantSlugs]);
      onChange([...selectedValues.filter((v) => !toRemove.has(v)), node.slug]);
      if (hasChildren) setExpanded(true);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: depth * 20 }}
      >
        {/* 展开/折叠箭头 */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center w-8 h-8 flex-shrink-0 text-gray-400 active:text-gray-600 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expanded ? '' : '-rotate-90'
              }`}
            />
          </button>
        ) : (
          <span className="w-8 flex-shrink-0" />
        )}

        {/* Checkbox + 名称 */}
        <label className="flex items-center gap-2.5 flex-1 min-h-[44px] rounded-lg px-1.5 -mx-1 active:bg-gray-50 transition-colors duration-150">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            className="w-[18px] h-[18px] rounded border-gray-300 text-primary accent-primary flex-shrink-0"
          />
          <span className="text-sm flex-1">{getLocalizedCategoryName(node, locale)}</span>
          <span className="text-xs text-gray-400 tabular-nums pr-1">{node.count}</span>
        </label>
      </div>

      {/* 子节点 */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <MobileCategoryNode
              key={child.id}
              node={child}
              selectedValues={selectedValues}
              onChange={onChange}
              locale={locale}
              depth={depth + 1}
              ancestorSlugs={[...ancestorSlugs, node.slug]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const MOBILE_CATEGORY_DEFAULT_VISIBLE = 6;

/**
 * 移动端分类筛选：递归树形 checkbox，支持任意层级。
 *
 * 选择逻辑与 PC 端 CategoryFilter 一致：
 * - 选父 → 移除已选的子孙
 * - 选子 → 移除已选的祖先
 * - 取消 → 同时取消自身和所有子孙
 */
export function MobileCategoryFilter({
  categories,
  selectedValues,
  onChange,
}: {
  categories: CategoryFacetItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}) {
  const locale = useLocale();
  const t = useTranslations('filter');
  const [showAll, setShowAll] = useState(false);

  if (categories.length === 0) return null;

  const visible = showAll ? categories : categories.slice(0, MOBILE_CATEGORY_DEFAULT_VISIBLE);
  const hasMore = categories.length > MOBILE_CATEGORY_DEFAULT_VISIBLE;

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((cat) => (
        <MobileCategoryNode
          key={cat.id}
          node={cat}
          selectedValues={selectedValues}
          onChange={onChange}
          locale={locale}
        />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-gray-500 self-start py-2 pl-9"
        >
          {showAll
            ? t('showLess')
            : t('moreCount', { count: categories.length - MOBILE_CATEGORY_DEFAULT_VISIBLE })}
        </button>
      )}
    </div>
  );
}
