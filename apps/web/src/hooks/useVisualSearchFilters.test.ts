import { renderHook, act } from '@testing-library/react';
import { useVisualSearchFilters, type VisualSearchProduct } from './useVisualSearchFilters';

const mockProducts: VisualSearchProduct[] = [
  {
    id: '1',
    title: 'Nike Air Max',
    slug: 'nike-air-max',
    mainImage: '/img1.jpg',
    price: { min: 599, max: 799, currency: 'CNY' },
    similarity: 92,
    brand: { id: 'b1', name: 'Nike', slug: 'nike' },
    category: { name: 'Sneakers', slug: 'sneakers' },
    gender: 'Women',
    colors: ['Black', 'White'],
  },
  {
    id: '2',
    title: 'Adidas Superstar',
    slug: 'adidas-superstar',
    mainImage: '/img2.jpg',
    price: { min: 399, max: 499, currency: 'CNY' },
    similarity: 85,
    brand: { id: 'b2', name: 'Adidas', slug: 'adidas' },
    category: { name: 'Sneakers', slug: 'sneakers' },
    gender: 'Men',
    colors: ['White'],
  },
  {
    id: '3',
    title: 'Nike Dunk',
    slug: 'nike-dunk',
    mainImage: '/img3.jpg',
    price: { min: 899, max: 999, currency: 'CNY' },
    similarity: 78,
    brand: { id: 'b1', name: 'Nike', slug: 'nike' },
    category: { name: 'Boots', slug: 'boots' },
    gender: 'Women',
    colors: ['Red'],
  },
  {
    id: '4',
    title: 'Unknown Brand Shoe',
    slug: 'unknown-shoe',
    mainImage: '/img4.jpg',
    price: { min: 199, max: 299, currency: 'CNY' },
    similarity: 70,
  },
];

describe('useVisualSearchFilters', () => {
  it('默认返回全部产品，按相似度排序', () => {
    const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
    expect(result.current.products).toHaveLength(4);
    expect(result.current.products[0].id).toBe('1'); // similarity 92
    expect(result.current.products[3].id).toBe('4'); // similarity 70
    expect(result.current.filterCount).toBe(0);
  });

  describe('Facets 聚合', () => {
    it('正确聚合分类 facets，按数量降序', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      expect(result.current.facets.categories).toEqual([
        { label: 'Sneakers', value: 'sneakers', count: 2 },
        { label: 'Boots', value: 'boots', count: 1 },
      ]);
    });

    it('正确聚合品牌 facets，按数量降序', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      expect(result.current.facets.brands).toEqual([
        { label: 'Nike', value: 'nike', count: 2 },
        { label: 'Adidas', value: 'adidas', count: 1 },
      ]);
    });

    it('正确聚合颜色 facets', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      const colorValues = result.current.facets.colors.map((c) => c.value);
      expect(colorValues).toContain('White');
      expect(colorValues).toContain('Black');
      expect(colorValues).toContain('Red');
      // White 出现 2 次（产品 1 和 2），应排在前面
      expect(result.current.facets.colors[0]).toEqual({ value: 'White', count: 2 });
    });

    it('正确聚合性别 facets', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      expect(result.current.facets.genders).toEqual([
        { value: 'Women', count: 2 },
        { value: 'Men', count: 1 },
      ]);
    });

    it('正确计算价格范围', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      expect(result.current.facets.priceRange.min).toBe(199);
      expect(result.current.facets.priceRange.max).toBe(999);
    });

    it('空数组返回空 facets', () => {
      const { result } = renderHook(() => useVisualSearchFilters([]));
      expect(result.current.facets.brands).toEqual([]);
      expect(result.current.facets.colors).toEqual([]);
      expect(result.current.facets.genders).toEqual([]);
      expect(result.current.facets.priceRange).toEqual({ min: 0, max: 100000 });
    });
  });

  describe('分类筛选', () => {
    it('选择 Sneakers 只返回 Sneakers 产品', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedCategories(['sneakers']));
      expect(result.current.products).toHaveLength(2);
      expect(result.current.products.every((p) => p.category?.slug === 'sneakers')).toBe(true);
      expect(result.current.filterCount).toBe(1);
    });

    it('无分类的产品在分类筛选时被排除', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedCategories(['boots']));
      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].id).toBe('3');
    });
  });

  describe('品牌筛选', () => {
    it('选择 Nike 只返回 Nike 产品', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedBrands(['nike']));
      expect(result.current.products).toHaveLength(2);
      expect(result.current.products.every((p) => p.brand?.slug === 'nike')).toBe(true);
      expect(result.current.filterCount).toBe(1);
    });

    it('无品牌的产品在品牌筛选时被排除', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedBrands(['adidas']));
      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].id).toBe('2');
    });
  });

  describe('颜色筛选', () => {
    it('选择 White 返回含 White 的产品', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedColors(['White']));
      expect(result.current.products).toHaveLength(2);
      const ids = result.current.products.map((p) => p.id);
      expect(ids).toContain('1'); // Black, White
      expect(ids).toContain('2'); // White
    });

    it('选择 Red 只返回含 Red 的产品', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedColors(['Red']));
      expect(result.current.products).toHaveLength(1);
      expect(result.current.products[0].id).toBe('3');
    });
  });

  describe('性别筛选', () => {
    it('选择 Women 返回 Women 产品', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSelectedGenders(['Women']));
      expect(result.current.products).toHaveLength(2);
      expect(result.current.products.every((p) => p.gender === 'Women')).toBe(true);
    });
  });

  describe('价格筛选', () => {
    it('设置价格范围过滤结果', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setPriceRange([300, 600]));
      // product 1: min 599 max 799 → 599 <= 600 && 799 >= 300 → yes
      // product 2: min 399 max 499 → 399 <= 600 && 499 >= 300 → yes
      // product 3: min 899 max 999 → 899 > 600 → no
      // product 4: min 199 max 299 → 299 < 300 → no
      expect(result.current.products).toHaveLength(2);
      const ids = result.current.products.map((p) => p.id);
      expect(ids).toContain('1');
      expect(ids).toContain('2');
    });
  });

  describe('组合筛选', () => {
    it('品牌 + 性别组合筛选', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => {
        result.current.setSelectedBrands(['nike']);
        result.current.setSelectedGenders(['Women']);
      });
      expect(result.current.products).toHaveLength(2); // Nike + Women
      expect(result.current.filterCount).toBe(2);
    });
  });

  describe('排序', () => {
    it('price_asc 按价格升序排列', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSortBy('price_asc'));
      expect(result.current.products[0].id).toBe('4'); // min 199
      expect(result.current.products[1].id).toBe('2'); // min 399
      expect(result.current.products[2].id).toBe('1'); // min 599
      expect(result.current.products[3].id).toBe('3'); // min 899
    });

    it('price_desc 按价格降序排列', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => result.current.setSortBy('price_desc'));
      expect(result.current.products[0].id).toBe('3'); // min 899
      expect(result.current.products[3].id).toBe('4'); // min 199
    });
  });

  describe('clearAll', () => {
    it('清除所有筛选条件', () => {
      const { result } = renderHook(() => useVisualSearchFilters(mockProducts));
      act(() => {
        result.current.setSelectedCategories(['sneakers']);
        result.current.setSelectedBrands(['nike']);
        result.current.setSelectedColors(['Red']);
        result.current.setSelectedGenders(['Women']);
        result.current.setPriceRange([500, 800]);
      });
      expect(result.current.filterCount).toBe(5);

      act(() => result.current.clearAll());
      expect(result.current.filterCount).toBe(0);
      expect(result.current.products).toHaveLength(4);
      expect(result.current.selectedCategories).toEqual([]);
      expect(result.current.selectedBrands).toEqual([]);
      expect(result.current.selectedColors).toEqual([]);
      expect(result.current.selectedGenders).toEqual([]);
    });
  });
});
