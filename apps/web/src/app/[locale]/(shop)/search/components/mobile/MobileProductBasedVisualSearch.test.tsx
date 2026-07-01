import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileProductBasedVisualSearch from './MobileProductBasedVisualSearch';

const mockFetcher = jest.fn();
const mockUseSWR = jest.fn((key: string) => {
  if (key === '/visual-search/by-product/p1?limit=50&minSimilarity=25') {
    return {
      data: {
        sourceProduct: {
          id: 'p1',
          title: 'Adidas Adilette Slipper',
          slug: 'adidas-adilette-slipper',
          mainImage: '/adidas.jpg',
          images: ['/adidas.jpg'],
        },
        results: [
          {
            similarity: 96,
            product: {
              id: 'p2',
              title: 'Adidas Similar Slipper',
              slug: 'adidas-similar-slipper',
              mainImage: '/similar.jpg',
              images: ['/similar.jpg'],
              priceMin: 22,
              priceMax: 22,
              currency: 'USD',
            },
          },
        ],
        total: 1,
      },
      isLoading: false,
      mutate: jest.fn(),
    };
  }

  return { data: undefined, isLoading: false, mutate: jest.fn() };
});

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (key === 'resultsCount') return `Found ${params?.count} similar products`;
    const map: Record<string, string> = {
      title: 'Visual Search',
      searching: 'Searching',
      reSearch: 'Re-search',
      sortBySimilarity: 'Similarity',
      priceAsc: 'Price: Low to High',
      priceDesc: 'Price: High to Low',
    };
    return map[key] || key;
  },
}));

jest.mock('@/lib/api', () => ({
  fetcher: (...args: unknown[]) => mockFetcher(...args),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: Parameters<typeof mockUseSWR>) => mockUseSWR(...args),
}));

const mockSharedResults = jest.fn(
  ({
    totalCount,
    sortOptions,
    sourcePanel,
  }: {
    totalCount: number;
    sortOptions: Array<{ label: string }>;
    sourcePanel: React.ReactNode;
  }) => (
    <div data-testid="shared-mobile-results">
      <div data-testid="shared-total-count">{totalCount}</div>
      <div data-testid="shared-sort-options">
        {sortOptions.map((option) => option.label).join('|')}
      </div>
      {sourcePanel}
    </div>
  ),
);

jest.mock('./MobileVisualSearchResults', () => ({
  __esModule: true,
  default: (props: unknown) => mockSharedResults(props as never),
}));

describe('MobileProductBasedVisualSearch', () => {
  beforeEach(() => {
    mockFetcher.mockReset();
    mockUseSWR.mockClear();
  });

  it('passes product-based source panel and mapped results into shared mobile results shell', () => {
    render(<MobileProductBasedVisualSearch productId="p1" />);

    expect(screen.getByTestId('shared-mobile-results')).toBeInTheDocument();
    expect(screen.getByTestId('shared-total-count')).toHaveTextContent('1');
    expect(screen.getByTestId('shared-sort-options')).toHaveTextContent(
      'Similarity|Price: Low to High|Price: High to Low',
    );

    expect(screen.getByText('Found 1 similar products')).toBeInTheDocument();
    expect(screen.getByText('Adidas Adilette Slipper')).toBeInTheDocument();
    expect(screen.getByText('Re-search')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Adidas Adilette Slipper' })).toBeInTheDocument();
  });

  it('requests the public by-product endpoint instead of fetching protected product details', () => {
    render(<MobileProductBasedVisualSearch productId="p1" />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/visual-search/by-product/p1?limit=50&minSimilarity=25',
      expect.any(Function),
      expect.objectContaining({
        revalidateOnFocus: false,
        dedupingInterval: 60000,
      }),
    );
    expect(mockFetcher).not.toHaveBeenCalledWith('/products/p1');
    expect(mockFetcher).not.toHaveBeenCalledWith('/api/products/p1');
  });
});
