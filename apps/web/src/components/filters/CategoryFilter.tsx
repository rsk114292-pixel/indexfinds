'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
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
        className="flex items-center gap-1 group"
        style={{ paddingLeft: depth * 16 }}
      >
        {/* 展开/折叠箭头 */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center w-5 h-5 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Checkbox + 名称 */}
        <label className="flex items-center gap-2 flex-1 min-h-[36px] cursor-pointer rounded px-1 -mx-1 transition-colors duration-200 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
          />
          <span className="text-sm flex-1">
            {getLocalizedName(node, locale)}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">
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
