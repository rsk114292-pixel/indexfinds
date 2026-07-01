import { countActiveFilters, flattenCategories } from './filter-utils';
import type { CategoryFacetItem } from '@/components/filters/types';

describe('countActiveFilters', () => {
  it('无筛选参数返回 0', () => {
    const params = new URLSearchParams('');
    expect(countActiveFilters(params)).toBe(0);
  });

  it('计算多选筛选数量', () => {
    const params = new URLSearchParams('brands=nike,adidas&colors=red');
    expect(countActiveFilters(params)).toBe(3);
  });

  it('计算价格筛选', () => {
    const params = new URLSearchParams('minPrice=100&maxPrice=500');
    expect(countActiveFilters(params)).toBe(2);
  });

  it('排除指定 key', () => {
    const params = new URLSearchParams('brands=nike&colors=red');
    expect(countActiveFilters(params, ['brands'])).toBe(1);
  });
});

describe('flattenCategories', () => {
  it('空数组返回空', () => {
    expect(flattenCategories([])).toEqual([]);
  });

  it('扁平化单层分类', () => {
    const items: CategoryFacetItem[] = [
      { id: '1', name: 'Shoes', slug: 'shoes', level: 0, count: 10 },
      { id: '2', name: 'Bags', slug: 'bags', level: 0, count: 5 },
    ];
    expect(flattenCategories(items)).toEqual([
      { label: 'Shoes', value: 'shoes', count: 10 },
      { label: 'Bags', value: 'bags', count: 5 },
    ]);
  });

  it('递归扁平化嵌套分类', () => {
    const items: CategoryFacetItem[] = [
      {
        id: '1',
        name: 'Shoes',
        slug: 'shoes',
        level: 0,
        count: 20,
        children: [
          { id: '1-1', name: 'Sneakers', slug: 'sneakers', level: 1, count: 12 },
          {
            id: '1-2',
            name: 'Boots',
            slug: 'boots',
            level: 1,
            count: 8,
            children: [
              { id: '1-2-1', name: 'Rain Boots', slug: 'rain-boots', level: 2, count: 3 },
            ],
          },
        ],
      },
      { id: '2', name: 'Bags', slug: 'bags', level: 0, count: 5 },
    ];

    expect(flattenCategories(items)).toEqual([
      { label: 'Shoes', value: 'shoes', count: 20 },
      { label: 'Sneakers', value: 'sneakers', count: 12 },
      { label: 'Boots', value: 'boots', count: 8 },
      { label: 'Rain Boots', value: 'rain-boots', count: 3 },
      { label: 'Bags', value: 'bags', count: 5 },
    ]);
  });

  it('children 为空数组时不影响结果', () => {
    const items: CategoryFacetItem[] = [
      { id: '1', name: 'Shoes', slug: 'shoes', level: 0, count: 10, children: [] },
    ];
    expect(flattenCategories(items)).toEqual([
      { label: 'Shoes', value: 'shoes', count: 10 },
    ]);
  });
});
