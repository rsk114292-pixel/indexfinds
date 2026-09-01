'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { CategoryFacetItem } from './types';

interface CategoryFilterProps {
  categories: CategoryFacetItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

function getLocalizedName(
  item: CategoryFacetItem,
  locale: string,
): string {
  if (item.translations?.[locale]?.name) {
    return item.translations[locale].name!;
  }
  return item.name;
}

/**
 * 递归渲染分类树节点
 */
function CategoryNode({
  node,
  selectedValues,
  onChange,
  locale,
  expandLabel,
  collapseLabel,
  depth = 0,
  ancestorSlugs = [],
}: {
  node: CategoryFacetItem;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  locale: string;
  expandLabel: string;
  collapseLabel: string;
  depth?: number;
  ancestorSlugs?: string[];
}) {
  const hasChildren = node.children && node.children.length > 0;
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedValues.includes(node.slug);

  const handleToggle = () => {
    if (isSelected) {
      // 取消选中：同时取消所有子孙分类
      const descendantSlugs = getAllSlugs(node);
      onChange(selectedValues.filter((v) => !descendantSlugs.includes(v)));
    } else {
      // 选中：移除所有祖先（选子去父）+ 移除所有子孙（选父去子）
      const descendantSlugs = getAllSlugs(node);
      const toRemove = new Set([...ancestorSlugs, ...descendantSlugs]);
      onChange([...selectedValues.filter((v) => !toRemove.has(v)), node.slug]);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 group"
        style={{ paddingLeft: depth * 16 }}
      >
        {/* 展开/折叠箭头 */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${expanded ? collapseLabel : expandLabel} ${getLocalizedName(node, locale)}`}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-gray-500 transition-colors hover:text-gray-700"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        ) : (
          <span className="w-6 flex-shrink-0" />
        )}

        {/* Checkbox + 名称 */}
        <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-2 rounded px-1 -mx-1 transition-colors duration-200 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            className="h-6 w-6 cursor-pointer rounded border-border text-primary accent-primary"
          />
          <span className="text-sm flex-1">
            {getLocalizedName(node, locale)}
          </span>
          <span className="text-xs text-slate-600 tabular-nums">
            {node.count}
          </span>
        </label>
      </div>

      {/* 子节点 */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              selectedValues={selectedValues}
              onChange={onChange}
              locale={locale}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
              depth={depth + 1}
              ancestorSlugs={[...ancestorSlugs, node.slug]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 获取节点及其所有子孙的 slug 列表
 */
function getAllSlugs(node: CategoryFacetItem): string[] {
  const slugs = [node.slug];
  if (node.children) {
    for (const child of node.children) {
      slugs.push(...getAllSlugs(child));
    }
  }
  return slugs;
}

const DEFAULT_VISIBLE = 5;

export function CategoryFilter({
  categories,
  selectedValues,
  onChange,
}: CategoryFilterProps) {
  const locale = useLocale();
  const t = useTranslations('filter');
  const [showAll, setShowAll] = useState(false);

  if (categories.length === 0) return null;

  const visible = showAll ? categories : categories.slice(0, DEFAULT_VISIBLE);
  const hasMore = categories.length > DEFAULT_VISIBLE;

  return (
    <div className="flex flex-col gap-0.5">
      {visible.map((cat) => (
        <CategoryNode
          key={cat.id}
          node={cat}
          selectedValues={selectedValues}
          onChange={onChange}
          locale={locale}
          expandLabel={t('expand')}
          collapseLabel={t('collapse')}
        />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-primary hover:underline mt-1 text-left pl-6"
        >
          {showAll
            ? `− ${locale === 'zh' ? '收起' : 'Show less'}`
            : `+ ${categories.length - DEFAULT_VISIBLE} ${locale === 'zh' ? '更多' : 'more'}`}
        </button>
      )}
    </div>
  );
}
