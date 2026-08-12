import { fireEvent, render, screen } from '@testing-library/react';
import ProductsPageClient from './ProductsPageClient';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string, values?: { count?: number }) => {
    if (ns === 'products') {
      const map: Record<string, string> = {
        allProducts: 'All Products',
        productCount: `${values?.count ?? 0} products`,
        noProducts: 'No products found',
        noProductsDesc: 'Try removing some filters',
        errorLoading: 'Error Loading Products',
      };
      return map[key] || key;
    }

    if (ns === 'common') {
      return key === 'loading' ? 'Loading' : key;
    }

    if (ns === 'share') {
      return key === 'title' ? 'Share' : key;
    }

    return key;
  },
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn((key: string | null) => {
    if (!key) return { data: undefined, error: undefined, isLoading: false };

    if (key.startsWith('/products?')) {
      return {
        data: {
          data: [],
          meta: { total: 0 },
        },
        error: undefined,
        isLoading: false,
      };
    }

    if (key === '/products/facets') {
      return {
        data: {
          categories: [],
          brands: [],
          colors: [],
          genders: [],
          styles: [],
          occasions: [],
          seasons: [],
          priceRange: { min: 0, max: 1000 },
        },
        error: undefined,
        isLoading: false,
      };
    }

    return { data: undefined, error: undefined, isLoading: false };
  }),
}));

jest.mock('@/hooks/useLgUp', () => ({
  useLgUp: () => true,
}));

jest.mock('@/i18n/navigation', () => ({
  usePathname: () => '/products',
}));

jest.mock('@/hooks/useReturnScrollRestoration', () => ({
  useReturnScrollRestoration: () => {},
}));

jest.mock('@/components/share/LazyShareModal', () => ({
  __esModule: true,
  default: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div>{`Share Modal: ${title}`}</div> : null,
}));

jest.mock('./components/mobile/MobileProductList', () => () => null);

describe('ProductsPageClient', () => {
  it('桌面端显示分享按钮并可打开分享弹窗', () => {
    render(<ProductsPageClient />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(screen.getByText('Share Modal: All Products')).toBeInTheDocument();
  });
});
