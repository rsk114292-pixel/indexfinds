import { render, screen } from '@testing-library/react';
import ActiveFilters from './ActiveFilters';

// Mock currency store
let mockCurrency = 'USD';
const mockRates = { CNY: 1, USD: 0.14, EUR: 0.13, GBP: 0.11 };

jest.mock('@/stores/useCurrencyStore', () => ({
  useCurrencyStore: () => ({ currency: mockCurrency, rates: mockRates }),
}));

const mockPush = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/products',
}));

let mockParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ActiveFilters - 价格标签货币显示', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCurrency = 'USD';
  });

  it('无筛选时不渲染', () => {
    mockParams = new URLSearchParams();
    const { container } = render(<ActiveFilters />);
    expect(container.firstChild).toBeNull();
  });

  it('USD 时价格标签显示 $ 和转换后的值', () => {
    mockParams = new URLSearchParams('minPrice=100&maxPrice=500');
    render(<ActiveFilters />);
    // CNY 100 * 0.14 = 14, CNY 500 * 0.14 = 70
    expect(screen.getByText('minPrice: $14')).toBeInTheDocument();
    expect(screen.getByText('maxPrice: $70')).toBeInTheDocument();
  });

  it('CNY 时价格标签显示 ¥ 和原始值', () => {
    mockCurrency = 'CNY';
    mockParams = new URLSearchParams('minPrice=100&maxPrice=500');
    render(<ActiveFilters />);
    expect(screen.getByText('minPrice: ¥100')).toBeInTheDocument();
    expect(screen.getByText('maxPrice: ¥500')).toBeInTheDocument();
  });

  it('EUR 时价格标签显示 € 和转换后的值', () => {
    mockCurrency = 'EUR';
    mockParams = new URLSearchParams('minPrice=1000');
    render(<ActiveFilters />);
    // CNY 1000 * 0.13 = 130
    expect(screen.getByText('minPrice: €130')).toBeInTheDocument();
  });

  it('不影响非价格筛选标签的显示', () => {
    mockParams = new URLSearchParams('brands=nike&minPrice=200');
    render(<ActiveFilters />);
    expect(screen.getByText('brand: nike')).toBeInTheDocument();
    // CNY 200 * 0.14 = 28
    expect(screen.getByText('minPrice: $28')).toBeInTheDocument();
  });
});
