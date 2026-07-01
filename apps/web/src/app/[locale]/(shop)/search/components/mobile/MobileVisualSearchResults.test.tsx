import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MobileVisualSearchResults from './MobileVisualSearchResults';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      filters: 'Filters',
      noFilterResults: 'No filtered results',
      clearFilters: 'Clear filters',
      noResults: 'No results',
      clearAll: 'Clear all',
      apply: 'Apply',
      category: 'Category',
      brands: 'Brands',
      colors: 'Colors',
      gender: 'Gender',
      priceRange: 'Price range',
      minPrice: 'Min price',
      maxPrice: 'Max price',
    };
    return map[key] || key;
  },
}));

jest.mock('@/components/mobile/MobileSearchResultsHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-search-results-header" />,
}));

jest.mock('@/components/mobile/ui/MobileProductCard', () => ({
  MobileProductCard: ({ product }: { product: { title: string } }) => (
    <div data-testid="mobile-product-card">{product.title}</div>
  ),
}));

jest.mock('@/components/mobile/ui/MobileSkeleton', () => ({
  MobileProductGridSkeleton: () => <div data-testid="mobile-grid-skeleton" />,
}));

jest.mock('@/components/mobile/ui/MobileSheet', () => ({
  MobileSheet: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
  }) => (open ? <div data-testid="mobile-sheet">{title}{children}</div> : null),
}));

jest.mock(
  '@/app/[locale]/(shop)/products/components/mobile/MobileFilterComponents',
  () => ({
    AccordionSection: ({
      children,
      title,
    }: {
      children: React.ReactNode;
      title: string;
    }) => (
      <section>
        <h3>{title}</h3>
        {children}
      </section>
    ),
    ExpandableChipList: ({
      items,
    }: {
      items: Array<{ value: string; label: string; count?: number }>;
    }) => (
      <div>
        {items.map((item) => (
          <span key={item.value}>{item.label}</span>
        ))}
      </div>
    ),
  }),
);

jest.mock('@/hooks/useScrollDirection', () => ({
  useScrollDirection: () => ({ headerVisible: true }),
}));

jest.mock('@/hooks/useCategoryLabelResolver', () => ({
  useCategoryLabelResolver: () => ({
    getCategoryLabel: (slug: string, fallbackLabel?: string | null) =>
      slug === 'slides' ? 'Sandales' : fallbackLabel || slug,
  }),
}));

function createFilters(overrides: Partial<ReturnType<typeof baseFilters>> = {}) {
  return { ...baseFilters(), ...overrides };
}

function baseFilters() {
  return {
    products: [
      {
        id: '1',
        title: 'Nike Slides',
        slug: 'nike-slides',
        mainImage: '/shoe.jpg',
        images: [],
        price: { min: 10, max: 20, currency: 'USD' },
        similarity: 91,
      },
      {
        id: '2',
        title: 'Adidas Slides',
        slug: 'adidas-slides',
        mainImage: '/shoe-2.jpg',
        images: [],
        price: { min: 12, max: 24, currency: 'USD' },
        similarity: 82,
      },
    ],
    sortBy: 'similarity',
    setSortBy: jest.fn(),
    filterCount: 0,
    clearAll: jest.fn(),
    priceRange: [0, 1000] as [number, number],
    setPriceRange: jest.fn(),
    facets: {
      categories: [{ value: 'slides', label: 'Slides', count: 1 }],
      brands: [{ value: 'nike', label: 'Nike', count: 1 }],
      colors: [],
      genders: [],
      priceRange: { min: 0, max: 1000 },
    },
    selectedCategories: [],
    setSelectedCategories: jest.fn(),
    selectedBrands: [],
    setSelectedBrands: jest.fn(),
    selectedColors: [],
    setSelectedColors: jest.fn(),
    selectedGenders: [],
    setSelectedGenders: jest.fn(),
  };
}

describe('MobileVisualSearchResults', () => {
  it('renders shared mobile result shell and routes sort/filter actions through filters', () => {
    const filters = createFilters();

    render(
      <MobileVisualSearchResults
        loading={false}
        hasSource={true}
        totalCount={2}
        filters={filters as never}
        sortOptions={[
          { value: 'similarity', label: 'Similarity' },
          { value: 'price_asc', label: 'Price: Low to High' },
        ]}
        sourcePanel={<div>Source Panel</div>}
      />,
    );

    expect(screen.getByTestId('mobile-search-results-header')).toBeInTheDocument();
    expect(screen.getByText('Source Panel')).toBeInTheDocument();
    expect(screen.getByText('Nike Slides')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Price: Low to High'));
    expect(filters.setSortBy).toHaveBeenCalledWith('price_asc');

    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByTestId('mobile-sheet')).toBeInTheDocument();
    expect(screen.getByText('Sandales')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Max price'), { target: { value: '500' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(filters.setPriceRange).toHaveBeenCalledWith([100, 500]);
  });

  it('renders provided empty state when source exists but there are no results', () => {
    const filters = createFilters({
      products: [],
      facets: {
        categories: [],
        brands: [],
        colors: [],
        genders: [],
        priceRange: { min: 0, max: 1000 },
      },
    });

    render(
      <MobileVisualSearchResults
        loading={false}
        hasSource={true}
        totalCount={0}
        filters={filters as never}
        sortOptions={[{ value: 'similarity', label: 'Similarity' }]}
        emptyState={<div>Custom Empty</div>}
      />,
    );

    expect(screen.getByText('Custom Empty')).toBeInTheDocument();
  });
});
