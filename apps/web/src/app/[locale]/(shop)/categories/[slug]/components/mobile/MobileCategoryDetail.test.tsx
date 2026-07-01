import { render, screen, fireEvent } from '@testing-library/react';
import type { CategoryFacetItem } from '@/components/filters/types';

/* ─── IntersectionObserver polyfill ─── */
beforeAll(() => {
  (global as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

/* ─── Mocks ─── */

const mockReplace = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/categories/shoes',
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      filters: 'Filters',
      category: 'Category',
      brands: 'Brands',
      colors: 'Colors',
      gender: 'Gender',
      priceRange: 'Price Range',
      clearAll: 'Clear All',
      showResults: 'Show Results',
      minPrice: 'Min Price',
      maxPrice: 'Max Price',
      allProducts: 'All Products',
      noProducts: 'No Products',
      noProductsDesc: 'No products found.',
      loading: 'Loading...',
    };
    if (key === 'productCount') return `${params?.count} products`;
    if (key === 'viewItems') return `Show ${params?.count} Results`;
    return map[key] || key;
  },
  useLocale: () => 'en',
}));

jest.mock('next/dynamic', () => () => {
  // Mock MobileSortBar
  return function MockSortBar({ onOpenFilter }: { onOpenFilter: () => void }) {
    return (
      <div data-testid="sort-bar">
        <button type="button" onClick={onOpenFilter}>Filters</button>
      </div>
    );
  };
});

jest.mock('@/components/mobile/ui/MobileSheet', () => ({
  MobileSheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
}));

jest.mock('@/components/mobile/MobileSearchOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/mobile/ui/MobileProductCard', () => ({
  MobileProductCard: () => <div data-testid="product-card" />,
}));

jest.mock('@/components/mobile/ui/MobileSkeleton', () => ({
  MobileProductGridSkeleton: () => null,
}));

jest.mock('@/components/mobile/ui/MobileBackToTop', () => ({
  MobileBackToTop: () => null,
}));

jest.mock('@/components/mobile/MobileSubPageHeader', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="header">{title}</div>,
}));

jest.mock('@/components/ui/Empty', () => ({
  Empty: () => null,
}));

jest.mock('../../../../products/components/mobile/MobileActiveFilters', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/lib/api', () => ({
  fetcher: jest.fn().mockResolvedValue({ meta: { total: 10 } }),
}));

jest.mock('@/lib/filter-utils', () => ({
  countActiveFilters: () => 0,
}));

jest.mock('@/lib/utils', () => ({
  getLocalizedName: (obj: { name: string }) => obj.name,
  computeHotThreshold: () => Infinity,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatPriceRange: () => '¥0',
  convertPrice: (v: number) => v,
}));

// Mock SWR — return facets with categories
const mockFacetsCategories: CategoryFacetItem[] = [
  {
    id: 'sub-1',
    name: 'Sneakers',
    slug: 'sneakers',
    level: 1,
    count: 15,
    children: [
      { id: 'sub-1-1', name: 'Running Shoes', slug: 'running-shoes', level: 2, count: 5 },
    ],
  },
  { id: 'sub-2', name: 'Boots', slug: 'boots', level: 1, count: 10 },
  { id: 'sub-3', name: 'Sandals', slug: 'sandals', level: 1, count: 8 },
];

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: string | null) => {
    if (!key) return { data: undefined };
    if (key.includes('/products/facets')) {
      return {
        data: {
          categories: mockFacetsCategories,
          brands: [{ id: 'b1', name: 'Nike', slug: 'nike', count: 12 }],
          colors: [],
          genders: [],
          styles: [],
          occasions: [],
          seasons: [],
          priceRange: { min: 0, max: 5000 },
        },
      };
    }
    return { data: undefined };
  },
}));

jest.mock('swr/infinite', () => ({
  __esModule: true,
  default: () => ({
    data: [{ data: [], meta: { total: 0 } }],
    error: null,
    size: 1,
    setSize: jest.fn(),
    isLoading: false,
    isValidating: false,
  }),
}));

import MobileCategoryDetail from './MobileCategoryDetail';

/* ─── Tests ─── */

describe('MobileCategoryDetail', () => {
  const defaultProps = {
    slug: 'shoes',
    initialCategory: {
      id: 'cat-1',
      name: 'Shoes',
      slug: 'shoes',
      level: 0,
      children: [],
    } as unknown as import('@/types').Category,
  };

  it('筛选 Sheet 中显示子分类', () => {
    render(<MobileCategoryDetail {...defaultProps} />);

    // 打开筛选 Sheet
    fireEvent.click(screen.getByText('Filters'));

    // 应显示 Category 区块和子分类
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
    expect(screen.getByText('Sandals')).toBeInTheDocument();
  });

  it('子分类有层级结构（3 级默认折叠）', () => {
    render(<MobileCategoryDetail {...defaultProps} />);

    fireEvent.click(screen.getByText('Filters'));

    // 一级子分类可见
    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
    // 二级子分类默认折叠
    expect(screen.queryByText('Running Shoes')).not.toBeInTheDocument();
  });

  it('分类区块在品牌区块之前', () => {
    render(<MobileCategoryDetail {...defaultProps} />);

    fireEvent.click(screen.getByText('Filters'));

    const categoryTitle = screen.getByText('Category');
    const brandsTitle = screen.getByText('Brands');
    expect(
      categoryTitle.compareDocumentPosition(brandsTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('facets 无分类数据时不显示 Category 区块', () => {
    // Override SWR to return empty categories
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swr = require('swr');
    const originalDefault = swr.default;
    swr.default = (key: string | null) => {
      if (!key) return { data: undefined };
      if (key.includes('/products/facets')) {
        return {
          data: {
            categories: [],
            brands: [{ id: 'b1', name: 'Nike', slug: 'nike', count: 12 }],
            colors: [],
            genders: [],
            styles: [],
            occasions: [],
            seasons: [],
            priceRange: { min: 0, max: 5000 },
          },
        };
      }
      return { data: undefined };
    };

    render(<MobileCategoryDetail {...defaultProps} />);
    fireEvent.click(screen.getByText('Filters'));

    expect(screen.queryByText('Category')).not.toBeInTheDocument();
    expect(screen.getByText('Brands')).toBeInTheDocument();

    // Restore
    swr.default = originalDefault;
  });
});
