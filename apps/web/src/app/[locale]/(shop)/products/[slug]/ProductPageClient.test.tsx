import { render } from '@testing-library/react';
import useSWR from 'swr';
import ProductPageClient from './ProductPageClient';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Product } from '@/types';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<unknown>) => {
    const source = loader.toString();
    if (source.includes('SKUSelector')) {
      return function MockSkuSelector() {
        return <div data-testid="desktop-sku-selector" />;
      };
    }
    if (source.includes('BuyButton')) {
      return function MockBuyButton() {
        return <div data-testid="desktop-buy-button" />;
      };
    }
    if (source.includes('ImageMagnifier')) {
      return function MockImageMagnifier() {
        return <div data-testid="desktop-image-magnifier" />;
      };
    }
    return () => null;
  },
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined,
    mutate: jest.fn(),
  })),
}));

jest.mock('antd', () => ({
  App: {
    useApp: () => ({
      message: {
        success: jest.fn(),
        error: jest.fn(),
      },
    }),
  },
}));

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/components/FavoriteButton', () => () => null);
jest.mock('@/hooks/useShareUrl', () => ({
  useShareUrl: () => 'https://indexfinds.com/en/products/test-product',
}));
jest.mock('@/components/share/ShareModal', () => ({
  ShareModal: () => null,
}));
jest.mock('@/components/rewards/ProductShareEarnCard', () => () => null);
jest.mock('./components/mobile/MobileProductDetail', () => () => null);
jest.mock('@/components/product/recommendations/ProductRecommendations', () => () => null);
jest.mock('@/components/product/recommendations/FindSimilarButton', () => () => null);
jest.mock('@/components/ui/Tag', () => ({
  Tag: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
jest.mock('@/components/ui/Alert', () => ({
  Alert: () => null,
}));
jest.mock('@/components/ui/Skeleton', () => ({
  SkeletonImage: () => null,
}));
jest.mock('@/components/account/ReferralActivationNudge', () => ({
  ReferralActivationNudge: () => null,
}));
jest.mock('@/components/account/MobileReferralProgressBanner', () => ({
  MobileReferralProgressBanner: () => null,
}));
jest.mock('@/lib/browsing-history', () => ({
  recordProductView: jest.fn(),
}));
jest.mock('@/lib/ga-events', () => ({
  trackGA4Event: jest.fn(),
}));
jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
  post: jest.fn(() => Promise.resolve(undefined)),
}));
jest.mock('@/lib/auth-api', () => ({
  sendVerificationEmail: jest.fn(),
}));
jest.mock('@/stores/useCurrencyStore', () => ({
  useCurrencyStore: () => ({
    currency: 'USD',
    rates: { CNY: 1, USD: 0.1472 },
  }),
}));
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('@/hooks/useLgUp', () => ({
  useLgUp: () => true,
}));
jest.mock('@/lib/return-to', () => ({
  resolveSafeReturnTo: () => null,
}));
jest.mock('@/hooks/useReferralActivationVisibility', () => ({
  useReferralActivationVisibility: () => ({
    dismissed: false,
    dismiss: jest.fn(),
  }),
}));

const product: Product = {
  id: 'product-1',
  title: 'Test Product',
  slug: 'test-product',
  description: 'Test description',
  images: ['https://example.com/image.jpg'],
  mainImage: 'https://example.com/image.jpg',
  priceMin: 100,
  priceMax: 100,
  currency: 'CNY',
  sourceUrl: 'https://example.com/source',
  skus: [],
  brand: { id: 'brand-1', name: 'Nike', slug: 'nike' },
  primaryCategory: { id: 'category-1', name: 'Shoes', slug: 'shoes' },
};

function getActivationSwrKey(): unknown {
  const call = (useSWR as jest.Mock).mock.calls.find(
    ([, , options]) => options?.dedupingInterval === 30_000,
  );
  return call?.[0];
}

describe('ProductPageClient referral activation fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not request activation progress while the access token is still recovering', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      token: null,
      user: { id: 'user-1' },
    });

    render(<ProductPageClient initialProduct={product} slug={product.slug} />);

    expect(getActivationSwrKey()).toBeNull();
  });

  it('requests activation progress only after an access token is available', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      token: 'access-token',
      user: { id: 'user-1' },
    });

    render(<ProductPageClient initialProduct={product} slug={product.slug} />);

    expect(getActivationSwrKey()).toBe('/referral/my-activation');
  });

  it('keeps the gallery visible and places SKU choices before the non-sticky buy panel', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      token: null,
      user: null,
    });

    const { getByTestId } = render(
      <ProductPageClient initialProduct={product} slug={product.slug} />,
    );
    const gallery = getByTestId('desktop-product-gallery');
    const skuSelector = getByTestId('desktop-sku-selector');
    const buyPanel = getByTestId('desktop-buy-panel');

    expect(gallery).toHaveClass('sticky', 'top-24', 'self-start');
    expect(buyPanel).not.toHaveClass('sticky');
    expect(
      skuSelector.compareDocumentPosition(buyPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

});
