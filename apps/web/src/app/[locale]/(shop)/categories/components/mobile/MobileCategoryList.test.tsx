import { render, screen } from '@testing-library/react';
import MobileCategoryList from './MobileCategoryList';

const swrKeys: Array<string | null> = [];

jest.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/lib/api', () => ({
  fetcher: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  getLocalizedName: (category: { name: string }) => category.name,
}));

jest.mock('@/lib/image-utils', () => ({
  getImageReferrerPolicy: () => undefined,
  getProductCardThumbnail: (src: string) => src,
}));

jest.mock('@/components/mobile/ui/MobileSkeleton', () => ({
  SkeletonBlock: ({ className }: { className?: string }) => <div className={className} />,
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: string | null) => {
    swrKeys.push(key);
    if (key === '/categories') {
      return {
        data: [
          {
            id: 'shoes',
            name: 'Shoes',
            slug: 'shoes',
            level: 0,
            children: [
              { id: 'sneakers', name: 'Sneakers', slug: 'sneakers', level: 1, productCount: 0 },
              { id: 'casual-shoes', name: 'Casual Shoes', slug: 'casual-shoes', level: 1 },
              { id: 'leather-shoes', name: 'Leather Shoes', slug: 'leather-shoes', level: 1 },
              { id: 'boots', name: 'Boots', slug: 'boots', level: 1, productCount: 0 },
              { id: 'sandals', name: 'Sandals', slug: 'sandals', level: 1 },
              { id: 'heels', name: 'Heels', slug: 'heels', level: 1 },
            ],
          },
        ],
        isLoading: false,
      };
    }
    return { data: undefined, isLoading: false };
  },
}));

describe('MobileCategoryList', () => {
  beforeEach(() => {
    swrKeys.length = 0;
  });

  it('renders taxonomy subcategory entries without product-count gating', () => {
    render(<MobileCategoryList />);

    expect(screen.getByRole('link', { name: /Sneakers/i })).toHaveAttribute('href', '/categories/sneakers');
    expect(screen.getByRole('link', { name: /Casual Shoes/i })).toHaveAttribute('href', '/categories/casual-shoes');
    expect(screen.getByRole('link', { name: /Leather Shoes/i })).toHaveAttribute('href', '/categories/leather-shoes');
    expect(screen.getByRole('link', { name: /Boots/i })).toHaveAttribute('href', '/categories/boots');
    expect(screen.getByRole('link', { name: /Sandals/i })).toHaveAttribute('href', '/categories/sandals');
    expect(screen.getByRole('link', { name: /Heels/i })).toHaveAttribute('href', '/categories/heels');
    expect(swrKeys).toEqual(['/categories']);
  });
});
