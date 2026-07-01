import { render, screen } from '@testing-library/react';
import { FilterSidebar } from './FilterSidebar';

// Mock CategoryFilter
jest.mock('./CategoryFilter', () => ({
  CategoryFilter: ({ categories }: { categories: { slug: string; name: string }[] }) => (
    <div data-testid="category-filter">
      {categories.map((c) => (
        <span key={c.slug}>{c.name}</span>
      ))}
    </div>
  ),
}));

// Mock sub-filter components
jest.mock('./BrandFilter', () => ({
  BrandFilter: ({ brands, selectedBrands, onChange }: { brands: { value: string; label: string; count: number }[]; selectedBrands: string[]; onChange: (v: string[]) => void }) => (
    <div data-testid="brand-filter">
      {brands.map((b) => (
        <button
          key={b.value}
          data-testid={`brand-${b.value}`}
          onClick={() =>
            onChange(
              selectedBrands.includes(b.value)
                ? selectedBrands.filter((v: string) => v !== b.value)
                : [...selectedBrands, b.value],
            )
          }
        >
          {b.label} ({b.count})
        </button>
      ))}
    </div>
  ),
}));

jest.mock('./ColorFilter', () => ({
  ColorFilter: ({ colors }: { colors: { value: string }[] }) => (
    <div data-testid="color-filter">
      {colors.map((c) => (
        <span key={c.value}>{c.value}</span>
      ))}
    </div>
  ),
}));

jest.mock('./PriceRangeFilter', () => ({
  PriceRangeFilter: ({ min, max }: { min: number; max: number }) => (
    <div data-testid="price-filter">
      {min} - {max}
    </div>
  ),
}));

jest.mock('./CheckboxFilter', () => ({
  CheckboxFilter: ({ items }: { items: { value: string }[] }) => (
    <div data-testid="checkbox-filter">
      {items.map((i) => (
        <span key={i.value}>{i.value}</span>
      ))}
    </div>
  ),
}));

jest.mock('./TagFilter', () => ({
  TagFilter: ({ items }: { items: { value: string }[] }) => (
    <div data-testid="tag-filter">
      {items.map((i) => (
        <span key={i.value}>{i.value}</span>
      ))}
    </div>
  ),
}));

// Mock useFilterState hook
const mockApplyFilters = jest.fn();
const mockClearAll = jest.fn();
const mockSetSelectedBrands = jest.fn();

jest.mock('./hooks/useFilterState', () => ({
  useFilterState: () => ({
    selectedCategories: [],
    selectedBrands: [],
    selectedColors: [],
    selectedGenders: [],
    selectedStyles: [],
    selectedOccasions: [],
    selectedSeasons: [],
    selectedPriceRange: [0, 10000] as [number, number],
    expandedSections: {},
    priceChanged: false,
    setSelectedCategories: jest.fn(),
    setSelectedBrands: mockSetSelectedBrands,
    setSelectedColors: jest.fn(),
    setSelectedGenders: jest.fn(),
    setSelectedStyles: jest.fn(),
    setSelectedOccasions: jest.fn(),
    setSelectedSeasons: jest.fn(),
    setSelectedPriceRange: jest.fn(),
    toggleExpand: jest.fn(),
    applyFilters: mockApplyFilters,
    clearAll: mockClearAll,
  }),
}));

const defaultBrands = [
  { label: 'Nike', value: 'nike', count: 50 },
  { label: 'Adidas', value: 'adidas', count: 30 },
];

const defaultColors = [
  { value: 'red', count: 10 },
  { value: 'blue', count: 20 },
];

const defaultGenders = [
  { value: 'male', count: 40 },
  { value: 'female', count: 35 },
];

describe('FilterSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Filters header', () => {
    render(<FilterSidebar />);
    expect(screen.getByText('filters')).toBeInTheDocument();
  });

  it('renders brand filter when brands are provided', () => {
    render(<FilterSidebar brands={defaultBrands} />);
    expect(screen.getByText('brands')).toBeInTheDocument();
  });

  it('does not render brand filter when brands are empty', () => {
    render(<FilterSidebar brands={[]} />);
    expect(screen.queryByText('brands')).not.toBeInTheDocument();
  });

  it('renders price range filter by default', () => {
    render(<FilterSidebar />);
    expect(screen.getByText('priceRange')).toBeInTheDocument();
  });

  it('renders color filter when colors are provided', () => {
    render(<FilterSidebar colors={defaultColors} />);
    expect(screen.getByText('colors')).toBeInTheDocument();
  });

  it('renders gender filter when genders are provided', () => {
    render(<FilterSidebar genders={defaultGenders} />);
    expect(screen.getByText('gender')).toBeInTheDocument();
  });

  it('does not render gender filter when genders are empty', () => {
    render(<FilterSidebar genders={[]} />);
    expect(screen.queryByText('gender')).not.toBeInTheDocument();
  });

  it('renders styles filter when styles are provided', () => {
    const styles = [{ value: 'casual', count: 25 }];
    render(<FilterSidebar styles={styles} />);
    expect(screen.getByText('styles')).toBeInTheDocument();
  });

  it('renders seasons filter when seasons are provided', () => {
    const seasons = [{ value: 'summer', count: 20 }];
    render(<FilterSidebar seasons={seasons} />);
    expect(screen.getByText('seasons')).toBeInTheDocument();
  });

  it('does not show Clear all button when nothing is selected', () => {
    render(<FilterSidebar brands={defaultBrands} />);
    expect(screen.queryByText('clearAll')).not.toBeInTheDocument();
  });

  it('传入 categories 时渲染分类筛选面板', () => {
    const categories = [
      { id: '1', name: 'Shoes', slug: 'shoes', level: 0, count: 10 },
      { id: '2', name: 'Clothing', slug: 'clothing', level: 0, count: 5 },
    ];
    render(<FilterSidebar categories={categories} />);
    expect(screen.getByText('category')).toBeInTheDocument();
  });

  it('categories 为空数组时不渲染分类筛选面板', () => {
    render(<FilterSidebar categories={[]} />);
    expect(screen.queryByText('category')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<FilterSidebar className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
