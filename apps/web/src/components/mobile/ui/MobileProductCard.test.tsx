import { render, screen } from '@testing-library/react';
import { MobileProductCard } from './MobileProductCard';
import type { ProductListItem } from '@/types';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/FavoriteButton', () => ({
  __esModule: true,
  default: () => <button data-testid="favorite-btn" />,
}));

jest.mock('@/lib/image-utils', () => ({
  getProductCardThumbnail: (url: string) => url,
  getImageReferrerPolicy: () => 'no-referrer',
}));

jest.mock('@/lib/search-tracking', () => ({
  recordSearchClick: jest.fn().mockResolvedValue(null),
  getCurrentTrackingIdentity: jest.fn(() => ({
    deviceId: 'sess_test_device',
    visitId: 'visit_test_123',
  })),
  setPageSource: jest.fn(),
  OutboundSource: { DIRECT: 'direct' },
}));

jest.mock('@/stores/useCurrencyStore', () => ({
  useCurrencyStore: () => ({ currency: 'CNY', rates: {} }),
}));

jest.mock('@/lib/ga-events', () => ({
  trackGA4Event: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  formatPriceRange: (min: number, max: number) =>
    min === max ? `¥${min}` : `¥${min} - ¥${max}`,
  convertPrice: (amount: number) => amount,
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true });

const mockProduct: ProductListItem = {
  id: 'prod-1',
  title: 'Test Mobile Product',
  slug: 'test-mobile-product',
  price: { min: 100, max: 200, currency: 'CNY' },
  mainImage: 'https://example.com/image.jpg',
  brand: { id: 'b1', name: 'Nike', slug: 'nike' },
  primaryCategory: { id: 'c1', name: 'Shoes', slug: 'shoes' },
};

describe('MobileProductCard', () => {
  it('isHot 为 true 时显示 Hot badge', () => {
    render(<MobileProductCard product={mockProduct} isHot />);
    expect(screen.getByText('hot')).toBeInTheDocument();
  });

  it('isHot 为 false 时不显示 Hot badge', () => {
    render(<MobileProductCard product={mockProduct} isHot={false} />);
    expect(screen.queryByText('hot')).not.toBeInTheDocument();
  });

  it('默认不显示 Hot badge', () => {
    render(<MobileProductCard product={mockProduct} />);
    expect(screen.queryByText('hot')).not.toBeInTheDocument();
  });

  it('渲染商品标题和品牌', () => {
    render(<MobileProductCard product={mockProduct} />);
    expect(screen.getByText('Test Mobile Product')).toBeInTheDocument();
    expect(screen.getByText('Nike')).toBeInTheDocument();
  });

  it('渲染价格', () => {
    render(<MobileProductCard product={mockProduct} />);
    expect(screen.getByText('¥100 - ¥200')).toBeInTheDocument();
  });
});
