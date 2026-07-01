import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductSourcingRequestsPage from './page';

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockAdminAuthState = {
  isReady: true,
};
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  patch: (...args: unknown[]) => mockPatch(...args),
}));

jest.mock('@/app/admin/useAdminAuthReady', () => ({
  useAdminAuthReady: () => mockAdminAuthState,
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const Card = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Space = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Tag = ({ children }: { children?: React.ReactNode }) => <span>{children}</span>;

  const Button = ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );

  const InputBase = ({
    placeholder,
    value,
    onChange,
    onPressEnter,
  }: {
    placeholder?: string;
    value?: string | null;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPressEnter?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  }) => (
    <input
      aria-label={placeholder || 'input'}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={onChange}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onPressEnter?.(event);
      }}
    />
  );

  const TextArea = ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string;
    value?: string | null;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => (
    <textarea
      aria-label={placeholder || 'textarea'}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={onChange}
    />
  );

  const Input = Object.assign(InputBase, { TextArea });

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
      aria-label={placeholder || 'select'}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value || undefined)}
    >
      <option value="">--</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const Table = ({
    columns,
    dataSource,
  }: {
    columns: Array<{
      title: React.ReactNode;
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, record: Record<string, unknown>, index: number) => React.ReactNode;
    }>;
    dataSource: Array<Record<string, unknown>>;
  }) => (
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
  );

  const Drawer = ({
    open,
    title,
    extra,
    children,
  }: {
    open?: boolean;
    title?: React.ReactNode;
    extra?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div>
        <div>{title}</div>
        <div>{extra}</div>
        <div>{children}</div>
      </div>
    ) : null;

  const Descriptions = Object.assign(
    ({
      children,
    }: {
      children?: React.ReactNode;
    }) => <div>{children}</div>,
    {
      Item: ({
        label,
        children,
      }: {
        label?: React.ReactNode;
        children?: React.ReactNode;
      }) => (
        <div>
          <strong>{label}</strong>
          <span>{children}</span>
        </div>
      ),
    },
  );

  const Image = ({
    src,
    alt,
  }: {
    src?: string;
    alt?: string;
  }) => <img src={src} alt={alt} />;

  return {
    App: {
      useApp: () => ({ message: mockMessage }),
    },
    Button,
    Card,
    Descriptions,
    Drawer,
    Image,
    Input,
    Select,
    Space,
    Table,
    Tag,
  };
});

describe('ProductSourcingRequestsPage', () => {
  const baseItem = {
    id: 'req-1',
    searchQuery: 'jordan 4',
    productName: 'Air Jordan 4 Black Cat',
    description: 'Need a black pair in good condition.',
    referenceUrl: 'https://example.com/product',
    imageUrls: ['https://example.com/image-1.jpg'],
    budgetMin: '100.00',
    budgetMax: '180.00',
    locale: 'en',
    searchLogId: 'search-log-1',
    filtersSnapshot: { q: 'jordan 4', sortBy: 'popular' },
    status: 'new' as const,
    adminNotes: null,
    linkedProductId: null,
    createdAt: '2026-03-23T08:00:00.000Z',
    updatedAt: '2026-03-23T08:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'buyer@example.com',
      username: 'buyer',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminAuthState.isReady = true;
  });

  it('does not fetch requests before admin auth is ready', () => {
    mockAdminAuthState.isReady = false;

    render(<ProductSourcingRequestsPage />);

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('loads requests and lets admins update the handling result', async () => {
    mockGet.mockResolvedValue({
      items: [baseItem],
      total: 1,
    });
    mockPatch.mockResolvedValue({
      ...baseItem,
      status: 'planned',
      adminNotes: 'Source next batch',
      linkedProductId: 'prod-123',
    });

    render(<ProductSourcingRequestsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/product-sourcing-requests', {
        page: 1,
        limit: 20,
        search: undefined,
        status: undefined,
        hasImages: undefined,
      });
    });

    expect(
      await screen.findByText((content) => content.includes('Air Jordan 4 Black Cat')),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('查看详情'));

    fireEvent.change(screen.getAllByRole('combobox')[2], {
      target: { value: 'planned' },
    });
    fireEvent.change(screen.getByLabelText('可选：填入已上架商品 ID'), {
      target: { value: 'prod-123' },
    });
    fireEvent.change(screen.getByLabelText('记录是否准备上架、找货渠道、处理结果等'), {
      target: { value: 'Source next batch' },
    });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/admin/product-sourcing-requests/req-1',
        {
          status: 'planned',
          adminNotes: 'Source next batch',
          linkedProductId: 'prod-123',
        },
      );
    });

    expect(mockMessage.success).toHaveBeenCalledWith('找货需求已更新');
  });
});
