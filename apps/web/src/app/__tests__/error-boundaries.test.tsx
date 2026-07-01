import { act, fireEvent, render, screen } from '@testing-library/react';

const mockRouterReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockRouterReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

// Mock @/i18n/navigation for Link component
jest.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock antd for admin error boundary
jest.mock('antd', () => ({
  Result: ({ title, subTitle, extra }: { status: string; title: string; subTitle: string; extra: React.ReactNode[] }) => (
    <div data-testid="antd-result">
      <div data-testid="result-title">{title}</div>
      <div data-testid="result-subtitle">{subTitle}</div>
      <div data-testid="result-extra">{extra}</div>
    </div>
  ),
  Button: ({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string; type?: string; key?: string }) => (
    href
      ? <a href={href}>{children}</a>
      : <button onClick={onClick}>{children}</button>
  ),
  Spin: ({ size }: { size: string }) => (
    <div data-testid="antd-spin" data-size={size}>Loading...</div>
  ),
}));

// ─── Global Error ───────────────────────────────────────────
describe('GlobalError', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const GlobalError = require('../global-error').default;
  const mockReset = jest.fn();
  const mockError = new Error('test') as Error & { digest?: string };
  const renderGlobalError = () => {
    const element = GlobalError({ error: mockError, reset: mockReset });
    return render(element.props.children.props.children);
  };

  beforeEach(() => {
    mockReset.mockClear();
  });

  it('renders error title and description', () => {
    renderGlobalError();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('calls reset when Try Again is clicked', () => {
    renderGlobalError();
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

describe('RootNotFound', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { headers, cookies } = require('next/headers');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RootNotFound = require('../not-found').default;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockRouterReplace.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { name: 'Nike', slug: 'nike' },
          { name: 'Adidas', slug: 'adidas' },
        ],
      }),
    }) as jest.Mock;
    headers.mockResolvedValue({
      get: jest.fn(() => '/en/missing-page'),
    });
    cookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    });
  });

  it('renders localized content for the active locale in pathname', async () => {
    render(await RootNotFound());

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText("The page you're looking for doesn't exist or has been moved.")).toBeInTheDocument();
    expect(screen.getByText('Redirecting to the home page automatically in a few seconds.')).toBeInTheDocument();
    expect(screen.getByText('Back to Home (3s)').closest('a')).toHaveAttribute('href', '/en');
    expect(screen.getByPlaceholderText('Search products, brands, or categories').closest('form')).toHaveAttribute('action', '/en/search');
    expect(screen.getByText('Popular Brands')).toBeInTheDocument();
    expect(screen.getByText('Nike').closest('a')).toHaveAttribute('href', '/en/brands/nike');
  });

  it('falls back to locale cookie when pathname has no locale prefix', async () => {
    headers.mockResolvedValue({
      get: jest.fn(() => '/missing-page'),
    });
    cookies.mockResolvedValue({
      get: jest.fn(() => ({ value: 'zh' })),
    });

    render(await RootNotFound());

    expect(screen.getByText('页面未找到')).toBeInTheDocument();
    expect(screen.getByText('返回首页 (3s)').closest('a')).toHaveAttribute('href', '/zh');
    expect(screen.getByPlaceholderText('搜索商品、品牌或分类').closest('form')).toHaveAttribute('action', '/zh/search');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
});

describe('NotFoundRedirectLink', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NotFoundRedirectLink = require('../../components/NotFoundRedirectLink').default;

  beforeEach(() => {
    mockRouterReplace.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('redirects automatically after the default delay', async () => {
    render(<NotFoundRedirectLink href="/en">Back to Home</NotFoundRedirectLink>);

    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Back to Home (3s)')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Back to Home (2s)')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockRouterReplace).toHaveBeenCalledWith('/en');
  });
});

// ─── Admin Error ────────────────────────────────────────────
describe('AdminError', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdminError = require('../admin/error').default;
  const mockReset = jest.fn();
  const mockError = new Error('test') as Error & { digest?: string };

  beforeEach(() => {
    mockReset.mockClear();
  });

  it('renders error result with Chinese text', () => {
    render(<AdminError error={mockError} reset={mockReset} />);
    expect(screen.getByTestId('result-title')).toHaveTextContent('页面出错了');
    expect(screen.getByTestId('result-subtitle')).toHaveTextContent('发生了意外错误');
  });

  it('calls reset when retry button is clicked', () => {
    render(<AdminError error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByText('重试'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('has a link back to dashboard', () => {
    render(<AdminError error={mockError} reset={mockReset} />);
    const link = screen.getByText('返回仪表盘');
    expect(link).toHaveAttribute('href', '/admin/dashboard');
  });
});

// ─── Shop Error ─────────────────────────────────────────────
describe('ShopError', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ShopError = require('../[locale]/(shop)/error').default;
  const mockReset = jest.fn();
  const mockError = new Error('test') as Error & { digest?: string };

  beforeEach(() => {
    mockReset.mockClear();
  });

  it('renders translated error keys', () => {
    render(<ShopError error={mockError} reset={mockReset} />);
    // useTranslations mock returns key directly
    expect(screen.getByText('errorTitle')).toBeInTheDocument();
    expect(screen.getByText('errorDesc')).toBeInTheDocument();
  });

  it('calls reset on try again click', () => {
    render(<ShopError error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByText('tryAgain'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('has a back button', () => {
    render(<ShopError error={mockError} reset={mockReset} />);
    expect(screen.getByText('backHome')).toBeInTheDocument();
  });
});

// ─── Account Error ──────────────────────────────────────────
describe('AccountError', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AccountError = require('../[locale]/(shop)/account/error').default;
  const mockReset = jest.fn();
  const mockError = new Error('test') as Error & { digest?: string };

  beforeEach(() => {
    mockReset.mockClear();
  });

  it('renders translated error keys', () => {
    render(<AccountError error={mockError} reset={mockReset} />);
    expect(screen.getByText('errorTitle')).toBeInTheDocument();
    expect(screen.getByText('errorDesc')).toBeInTheDocument();
  });

  it('calls reset on try again click', () => {
    render(<AccountError error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByText('tryAgain'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

// ─── Product Detail Error ───────────────────────────────────
describe('ProductDetailError', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ProductDetailError = require('../[locale]/(shop)/products/[slug]/error').default;
  const mockReset = jest.fn();
  const mockError = new Error('test') as Error & { digest?: string };

  beforeEach(() => {
    mockReset.mockClear();
  });

  it('renders translated error keys', () => {
    render(<ProductDetailError error={mockError} reset={mockReset} />);
    expect(screen.getByText('errorTitle')).toBeInTheDocument();
    expect(screen.getByText('errorDesc')).toBeInTheDocument();
  });

  it('calls reset on try again click', () => {
    render(<ProductDetailError error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByText('tryAgain'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('has a link to products page', () => {
    render(<ProductDetailError error={mockError} reset={mockReset} />);
    const link = screen.getByText('backHome');
    expect(link.closest('a')).toHaveAttribute('href', '/products');
  });
});

// ─── Loading States ─────────────────────────────────────────
describe('AdminLoading', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdminLoading = require('../admin/loading').default;

  it('renders a spinner', () => {
    render(<AdminLoading />);
    expect(screen.getByTestId('antd-spin')).toBeInTheDocument();
  });
});

describe('AccountLoading', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AccountLoading = require('../[locale]/(shop)/account/loading').default;

  it('renders a spinner', () => {
    render(<AccountLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
