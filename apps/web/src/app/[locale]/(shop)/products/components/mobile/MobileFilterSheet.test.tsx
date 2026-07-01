import { render, screen, fireEvent } from '@testing-library/react';
import { MobileFilterSheet } from './MobileFilterSheet';
import type { CategoryFacetItem } from '@/components/filters/types';

const mockReplace = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/products',
}));

let mockParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
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
    };
    if (key === 'viewItems') return `Show ${params?.count} Results`;
    return map[key] || key;
  },
  useLocale: () => 'en',
}));

// Mock MobileSheet to just render children
jest.mock('@/components/mobile/ui/MobileSheet', () => ({
  MobileSheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
}));

// Mock fetcher for preview
jest.mock('@/lib/api', () => ({
  fetcher: jest.fn().mockResolvedValue({ meta: { total: 10 } }),
}));

const mockCategories: CategoryFacetItem[] = [
  {
    id: '1',
    name: 'Shoes',
    slug: 'shoes',
    level: 0,
    count: 20,
    children: [
      { id: '1-1', name: 'Sneakers', slug: 'sneakers', level: 1, count: 12 },
      { id: '1-2', name: 'Boots', slug: 'boots', level: 1, count: 8 },
    ],
  },
  { id: '2', name: 'Bags', slug: 'bags', level: 0, count: 10 },
];

const mockBrands = [
  { label: 'Nike', value: 'nike', count: 15 },
];

describe('MobileFilterSheet', () => {
  beforeEach(() => {
    mockParams = new URLSearchParams();
    mockReplace.mockClear();
  });

  it('categories 有数据时显示顶级分类 chip', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        categories={mockCategories}
        brands={mockBrands}
      />,
    );

    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Shoes')).toBeInTheDocument();
    expect(screen.getByText('Bags')).toBeInTheDocument();
    // 子分类默认不显示
    expect(screen.queryByText('Sneakers')).not.toBeInTheDocument();
    expect(screen.queryByText('Boots')).not.toBeInTheDocument();
  });

  it('选中顶级分类后展开子分类', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        categories={mockCategories}
      />,
    );

    // 点击 Shoes
    fireEvent.click(screen.getByText('Shoes'));

    // 子分类应出现
    expect(screen.getByText('Sneakers')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
  });

  it('选中子分类后父分类取消选中', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        categories={mockCategories}
      />,
    );

    // 先选 Shoes（展开子分类）
    fireEvent.click(screen.getByText('Shoes'));
    // 再选 Sneakers（子分类）
    fireEvent.click(screen.getByText('Sneakers'));

    // 子分类区域仍然可见（因为 Sneakers 被选中）
    expect(screen.getByText('Boots')).toBeInTheDocument();
  });

  it('categories 为空时不显示分类区块', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        categories={[]}
        brands={mockBrands}
      />,
    );

    expect(screen.queryByText('Category')).not.toBeInTheDocument();
    expect(screen.getByText('Brands')).toBeInTheDocument();
  });

  it('不传 categories 时不显示分类区块', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        brands={mockBrands}
      />,
    );

    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('点击 Clear All 重置所有筛选', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        categories={mockCategories}
      />,
    );

    fireEvent.click(screen.getByText('Shoes'));
    // Shoes 选中后子分类展开
    expect(screen.getByText('Sneakers')).toBeInTheDocument();

    const clearBtn = screen.getByText('Clear All');
    fireEvent.click(clearBtn);

    // Clear All 清除选中状态，但 Shoes 的 checkbox 不再 checked
    const allCheckboxes = screen.getAllByRole('checkbox');
    expect(allCheckboxes[0]).not.toBeChecked(); // Shoes
  });

  it('分类排在品牌之前', () => {
    render(
      <MobileFilterSheet
        open={true}
        onClose={jest.fn()}
        categories={mockCategories}
        brands={mockBrands}
      />,
    );

    const categoryTitle = screen.getByText('Category');
    const brandsTitle = screen.getByText('Brands');
    expect(
      categoryTitle.compareDocumentPosition(brandsTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
