import { MULTI_SELECT_FILTER_KEYS } from '@/components/filters/constants';
import type { CategoryFacetItem } from '@/components/filters/types';

/**
 * 计算当前 URL 中已激活的筛选数量
 * @param searchParams URL 搜索参数
 * @param excludeKeys  需要排除的 key（如品牌页排除 'brands'）
 */
export function countActiveFilters(
  searchParams: URLSearchParams,
  excludeKeys?: string[],
): number {
  let count = 0;
  const keys = excludeKeys
    ? MULTI_SELECT_FILTER_KEYS.filter((k) => !excludeKeys.includes(k))
    : MULTI_SELECT_FILTER_KEYS;

  keys.forEach((key) => {
    const val = searchParams.get(key);
    if (val) count += val.split(',').filter(Boolean).length;
  });

  if (searchParams.get('minPrice')) count++;
  if (searchParams.get('maxPrice')) count++;
  return count;
}

/**
 * 将树状 CategoryFacetItem[] 扁平化为 { label, value, count }[] 供移动端 chip 筛选使用
 */
export function flattenCategories(
  items: CategoryFacetItem[],
): Array<{ label: string; value: string; count: number }> {
  const result: Array<{ label: string; value: string; count: number }> = [];
  const walk = (nodes: CategoryFacetItem[]) => {
    for (const c of nodes) {
      result.push({ label: c.name, value: c.slug, count: c.count });
      if (c.children) walk(c.children);
    }
  };
  walk(items);
  return result;
}
