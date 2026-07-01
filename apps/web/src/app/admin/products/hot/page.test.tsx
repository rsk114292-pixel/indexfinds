import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HotProductsPage from './page';

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPush = jest.fn();
const mockAdminAuthState = {
  isReady: true,
};
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  put: (...args: unknown[]) => mockPut(...args),
}));

jest.mock('@/app/admin/useAdminAuthReady', () => ({
  useAdminAuthReady: () => mockAdminAuthState,
}));

jest.mock('../components/AdminQcImageEditor', () => ({
  AdminQcImageEditor: () => <div data-testid="qc-editor" />,
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const Card = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Space = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Tag = ({ children }: { children?: React.ReactNode }) => <span>{children}</span>;

  const Button = ({
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
  );

  const Input = ({
    placeholder,
    value,
    onChange,
    onPressEnter,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPressEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  }) => (
    <input
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onPressEnter?.(event);
      }}
    />
  );

  const Select = ({
    placeholder,
    value,
    onChange,
    options = [],
  }: {
    placeholder?: string;
    value?: string;
    onChange?: (value?: string) => void;
    options?: Array<{ label: string; value: string }>;
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value || undefined)}
    >
      {options.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const InputNumber = ({
    defaultValue,
    onBlur,
    onPressEnter,
  }: {
    defaultValue?: number;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onPressEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  }) => (
    <input
      type="number"
      defaultValue={defaultValue}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onPressEnter?.(event);
      }}
    />
  );

  const Image = ({
    src,
    alt,
    preview,
    fallback,
  }: {
    src?: string;
    alt?: string;
    preview?: false | { src?: string };
    fallback?: string;
  }) => (
    <div>
      <img alt={alt} src={src || fallback} />
      {preview && typeof preview === 'object' ? (
        <span data-testid={`preview-${alt}`}>{preview.src}</span>
      ) : null}
    </div>
  );

  const Table = ({
    columns,
    dataSource,
    pagination,
  }: {
    columns: Array<{
      title: React.ReactNode;
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, record: Record<string, unknown>, index: number) => React.ReactNode;
    }>;
    dataSource: Array<Record<string, unknown>>;
    pagination?: { showTotal?: (total: number) => string; total?: number };
  }) => (
    <div>
      {pagination?.showTotal ? <div>{pagination.showTotal(pagination.total || 0)}</div> : null}
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column.key || String(column.dataIndex) || index}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record, rowIndex) => (
            <tr key={String(record.id ?? rowIndex)}>
              {columns.map((column, columnIndex) => {
                const value = column.dataIndex ? record[column.dataIndex] : undefined;
                return (
                  <td key={column.key || String(column.dataIndex) || columnIndex}>
                    {column.render ? column.render(value, record, rowIndex) : (value as React.ReactNode)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return {
    Card,
    Table,
    App: {
      useApp: () => ({ message: mockMessage }),
    },
    Button,
    Tag,
    Image,
    Space,
    Input,
    InputNumber,
    Select,
  };
});

const baseResponse = {
  data: [
    {
      id: 'p1',
      title: 'Featured No QC',
      slug: 'featured-no-qc',
      mainImage: 'https://si.geilicdn.com/featured.jpg?imageView2/2/w/80/h/80',
      popularityScore: 0.72,
      viewCount: 120,
      clickCount: 60,
      salesCount: 3,
      favoriteCount: 5,
      ctr: 0.5,
      isFeatured: true,
      featuredSort: 1,
      qcPhotoCount: 0,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'p2',
      title: 'QC To Improve',
      slug: 'qc-to-improve',
      mainImage: 'https://si.geilicdn.com/improve.jpg',
      popularityScore: 0.35,
      viewCount: 80,
      clickCount: 20,
      salesCount: 1,
      favoriteCount: 2,
      ctr: 0.25,
      isFeatured: false,
      featuredSort: 0,
      qcPhotoCount: 2,
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: 'p3',
      title: 'Complete QC',
      slug: 'complete-qc',
      mainImage: 'https://si.geilicdn.com/complete.jpg',
      popularityScore: 0.22,
      viewCount: 60,
      clickCount: 10,
      salesCount: 0,
      favoriteCount: 1,
      ctr: 0.16,
      isFeatured: false,
      featuredSort: 0,
      qcPhotoCount: 4,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
  ],
  meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
  summary: {
    withoutQc: 1,
    qcLessThan3: 1,
    featuredWithoutQc: 1,
    highHeatWithoutQc: 1,
  },
};

describe('HotProductsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminAuthState.isReady = true;
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/admin/products/hot/summary'
          ? baseResponse.summary
          : baseResponse,
      ),
    );
    mockPut.mockResolvedValue({ isFeatured: true });
  });

  it('does not fetch protected data until admin auth is ready', async () => {
    mockAdminAuthState.isReady = false;

    const { rerender } = render(<HotProductsPage />);

    expect(mockGet).not.toHaveBeenCalled();

    mockAdminAuthState.isReady = true;
    rerender(<HotProductsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/products/hot', {
        page: 1,
        limit: 20,
        includeSummary: false,
      });
    });
  });

  it('renders summary, priority labels, and image preview source', async () => {
    render(<HotProductsPage />);

    expect(await screen.findByText('筛选结果 3 条')).toBeInTheDocument();
    expect(screen.getByText('全部页统计')).toBeInTheDocument();
    expect(screen.getByText('当前页统计')).toBeInTheDocument();
    expect(screen.getByText('无 QC 1 条')).toBeInTheDocument();
    expect(screen.getByText('QC 1-2 张 1 条')).toBeInTheDocument();
    expect(screen.getByText('本页 QC 1-2 张 1 条')).toBeInTheDocument();
    expect(screen.getByText('推荐但无 QC 1 条')).toBeInTheDocument();
    expect(screen.getByText('高热无 QC 1 条')).toBeInTheDocument();

    expect(screen.getByText('高优先级')).toBeInTheDocument();
    expect(screen.getByText('推荐缺 QC')).toBeInTheDocument();
    expect(screen.getByText('QC 待补')).toBeInTheDocument();
    expect(screen.getByText('低优先级')).toBeInTheDocument();

    expect(screen.getByTestId('preview-Featured No QC')).toHaveTextContent(
      'https://si.geilicdn.com/featured.jpg',
    );
  });

  it('requests backend filters for hot-without-qc and qc-less-than-3 quick filters', async () => {
    render(<HotProductsPage />);
    await screen.findByText('筛选结果 3 条');

    mockGet.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '高热无 QC' }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/products/hot',
        expect.objectContaining({
          page: 1,
          limit: 20,
          includeSummary: false,
          qcState: 'without',
          minPopularityScore: 0.6,
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'QC 1-2 张' }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/products/hot',
        expect.objectContaining({
          page: 1,
          limit: 20,
          includeSummary: false,
          qcState: 'with',
          qcLevel: 'lt3',
        }),
      );
    });
  });

  it('filters current page rows when toggling current-page-without-qc', async () => {
    render(<HotProductsPage />);
    await screen.findByText('Featured No QC');
    expect(screen.getByText('QC To Improve')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '本页无 QC (1)' }));

    await waitFor(() => {
      expect(screen.queryByText('QC To Improve')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Featured No QC')).toBeInTheDocument();
    expect(screen.getByText(/当前仅筛选本页无 QC/)).toBeInTheDocument();
  });

  it('navigates to product edit from title and action button', async () => {
    render(<HotProductsPage />);
    await screen.findByText('Featured No QC');

    fireEvent.click(screen.getByRole('button', { name: 'Featured No QC' }));
    expect(mockPush).toHaveBeenCalledWith('/admin/products/p1?from=hot');

    fireEvent.click(screen.getAllByRole('button', { name: /编辑/ })[0]);
    expect(mockPush).toHaveBeenCalledWith('/admin/products/p1?from=hot');
  });
});
