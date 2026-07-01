import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductEditPage from './page';

const mockPush = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};

let mockRouteId = 'product-1';
let mockFrom: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: mockRouteId }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'from' ? mockFrom : null),
  }),
}));

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
  patch: (...args: unknown[]) => mockPatch(...args),
}));

jest.mock('@/app/admin/useAdminAuthReady', () => ({
  useAdminAuthReady: () => ({
    isReady: true,
  }),
}));

jest.mock('../../components/PageSkeleton', () => ({
  FormSkeleton: () => <div>loading</div>,
}));

jest.mock('../components/ProductForm', () => ({
  ProductForm: ({
    onSubmit,
    initialData,
  }: {
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    initialData?: { title?: string };
  }) => (
    <div>
      <div>{initialData?.title || 'empty-product'}</div>
      <button
        type="button"
        onClick={() =>
          void onSubmit({
            title: 'Updated Product',
            description: 'Updated description',
            status: 'active',
          })
        }
      >
        mock-save
      </button>
    </div>
  ),
}));

jest.mock('antd', () => ({
  App: {
    useApp: () => ({ message: mockMessage }),
  },
  Button: ({
    children,
    onClick,
    icon,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
  }) => (
    <button type="button" onClick={onClick}>
      {icon}
      {children}
    </button>
  ),
  Breadcrumb: ({
    items,
  }: {
    items: Array<{ title: string }>;
  }) => (
    <nav>
      {items.map((item) => (
        <span key={item.title}>{item.title}</span>
      ))}
    </nav>
  ),
}));

const productResponse = {
  id: 'product-1',
  title: 'Loaded Product',
  slug: 'loaded-product',
  brand: { id: 'brand-1', name: 'Brand' },
  primaryCategory: { id: 'category-1', name: 'Shoes' },
  aiAttributes: {},
  weidianShopName: 'Shop',
  weidianShopId: 'shop-1',
  weidianItemId: 'wd-1',
  splitSourceWeidianId: null,
  sourceUrl: 'https://example.com',
};

describe('ProductEditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteId = 'product-1';
    mockFrom = null;
    mockGet.mockResolvedValue(productResponse);
    mockPost.mockResolvedValue({});
    mockPatch.mockResolvedValue({});
  });

  it('returns to hot page when opened from hot products', async () => {
    mockFrom = 'hot';

    render(<ProductEditPage />);

    expect(await screen.findByText('Loaded Product')).toBeInTheDocument();
    expect(screen.getByText('热门管理')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /返回/ }));
    expect(mockPush).toHaveBeenCalledWith('/admin/products/hot');

    fireEvent.click(screen.getByRole('button', { name: 'mock-save' }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/products/product-1',
        expect.objectContaining({ title: 'Updated Product' }),
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/admin/products/hot');
  });

  it('falls back to product list when no source is provided', async () => {
    render(<ProductEditPage />);

    expect(await screen.findByText('Loaded Product')).toBeInTheDocument();
    expect(screen.getByText('产品管理')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /返回/ }));
    expect(mockPush).toHaveBeenCalledWith('/admin/products');
  });
});
