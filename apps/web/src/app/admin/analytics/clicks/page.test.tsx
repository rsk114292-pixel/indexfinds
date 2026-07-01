import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import ClicksAnalyticsPage from './page';

const mockGet = jest.fn();
const mockReadSessionCache = jest.fn();
const mockWriteSessionCache = jest.fn();
const mockExportClicksToCsv = jest.fn();

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-section" />,
}));

jest.mock('@/lib/api', () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock('@/lib/session-cache', () => ({
  readSessionCache: (...args: unknown[]) => mockReadSessionCache(...args),
  writeSessionCache: (...args: unknown[]) => mockWriteSessionCache(...args),
}));

jest.mock('@/app/admin/useAdminAuthReady', () => ({
  useAdminAuthReady: () => ({ isReady: true }),
}));

jest.mock('./clicks-export', () => ({
  exportClicksToCsv: (...args: unknown[]) => mockExportClicksToCsv(...args),
}));

jest.mock('../../components/PageSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton" />,
}));

jest.mock('../../components/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title?: ReactNode;
    description?: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const passthrough = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );

  return {
    Alert: ({
      message,
      description,
    }: {
      message?: ReactNode;
      description?: ReactNode;
    }) => (
      <div>
        <div>{message}</div>
        <div>{description}</div>
      </div>
    ),
    App: {
      useApp: () => ({
        message: {
          success: jest.fn(),
          warning: jest.fn(),
          error: jest.fn(),
        },
      }),
    },
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children?: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Card: ({
      title,
      extra,
      children,
    }: {
      title?: ReactNode;
      extra?: ReactNode;
      children?: ReactNode;
    }) => (
      <section>
        <div>{title}</div>
        <div>{extra}</div>
        <div>{children}</div>
      </section>
    ),
    Col: passthrough,
    DatePicker: {
      RangePicker: () => <div data-testid="range-picker" />,
    },
    Image: ({ alt }: { alt?: string }) => <img alt={alt} />,
    Input: {
      Search: ({
        placeholder,
        value,
        onChange,
        onSearch,
      }: {
        placeholder?: string;
        value?: string;
        onChange?: (event: { target: { value: string } }) => void;
        onSearch?: (value: string) => void;
      }) => (
        <div>
          <input
            aria-label={placeholder}
            value={value}
            onChange={(event) => onChange?.({ target: { value: event.target.value } })}
          />
          <button type="button" onClick={() => onSearch?.(value || '')}>
            search
          </button>
        </div>
      ),
    },
    Progress: ({ percent }: { percent?: number }) => <div>progress:{percent}</div>,
    Row: passthrough,
    Segmented: ({
      value,
      onChange,
      options,
    }: {
      value: string;
      onChange?: (value: string) => void;
      options: Array<{ label: string; value: string }>;
    }) => (
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ),
    Select: ({
      placeholder,
      value,
      options,
      onChange,
    }: {
      placeholder?: string;
      value?: string;
      options?: Array<{ value: string; label: string }>;
      onChange?: (value?: string) => void;
    }) => (
      <select
        aria-label={placeholder}
        value={value || ''}
        onChange={(event) => onChange?.(event.target.value || undefined)}
      >
        <option value="">全部</option>
        {(options || []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Statistic: ({
      title,
      value,
      suffix,
    }: {
      title?: ReactNode;
      value?: ReactNode;
      suffix?: ReactNode;
    }) => (
      <div>
        <div>{title}</div>
        <div>
          {value}
          {suffix}
        </div>
      </div>
    ),
    Table: ({
      dataSource,
      pagination,
    }: {
      dataSource?: Array<{ id?: string; productId?: string; productName?: string }>;
      pagination?: false | {
        current?: number;
        pageSize?: number;
        onChange?: (page: number, pageSize: number) => void;
      };
    }) => (
      <div>
        {(dataSource || []).map((item) => (
          <div key={item.id || item.productId}>{item.productName}</div>
        ))}
        {pagination ? (
          <button
            type="button"
            onClick={() => pagination.onChange?.(2, pagination.pageSize || 20)}
          >
            next
          </button>
        ) : null}
      </div>
    ),
    Tooltip: passthrough,
  };
});

jest.mock('@ant-design/icons', () => ({
  AppstoreOutlined: () => <span>appstore</span>,
  ArrowDownOutlined: () => <span>down</span>,
  ArrowUpOutlined: () => <span>up</span>,
  BranchesOutlined: () => <span>branches</span>,
  DownloadOutlined: () => <span>download</span>,
  RiseOutlined: () => <span>rise</span>,
  SearchOutlined: () => <span>search</span>,
  ShoppingOutlined: () => <span>shopping</span>,
}));

const sampleData = {
  summary: {
    total: 12,
    rawTotal: 15,
    productIntentTotal: 10,
    productIntentChange: 10,
    prevProductIntentTotal: 8,
    platformSelectionTotal: 12,
    platformSelectionChange: 20,
    prevPlatformSelectionTotal: 10,
    platformSelectionRate: 120,
    multiPlatformIntentCount: 2,
    multiPlatformIntentChange: 100,
    prevMultiPlatformIntentCount: 1,
    multiPlatformIntentRate: 20,
    suspiciousClicks: 3,
    suspiciousRate: 20,
    totalChange: 10,
    uniqueProducts: 4,
    uniqueProductsChange: 1,
    prevTotal: 8,
    prevRawTotal: 10,
    prevUniqueProducts: 3,
  },
  bySource: { telegram: 12 },
  byPlatform: { superbuy: 12 },
  byPageType: { product_detail: 12 },
  byLocale: { en: 12 },
  byViewportDeviceType: { mobile: 12 },
  byButtonVariant: { primary: 12 },
  byDate: [{ date: '2026-04-01', count: 5 }],
  prevByDate: [{ date: '2026-03-25', count: 4 }],
  topProducts: [
    {
      productId: 'prod-1',
      productName: 'Cached Sneaker',
      productImage: null,
      count: 12,
    },
  ],
  topQueries: [{ key: 'shoe', count: 3 }],
  topPages: [{ key: '/products/cached-sneaker', count: 3 }],
  records: [
    {
      id: 'click-1',
      productId: 'prod-1',
      productName: 'Cached Sneaker',
      productImage: null,
      platform: 'superbuy',
      source: 'telegram',
      pageType: 'product_detail',
      pagePath: '/products/cached-sneaker',
      query: 'shoe',
      buttonVariant: 'primary',
      locale: 'en',
      viewportDeviceType: 'mobile',
      createdAt: '2026-04-01T00:00:00.000Z',
    },
  ],
  pagination: {
    total: 1,
    page: 1,
    limit: 20,
  },
  filters: {
    source: null,
    platform: null,
    productKeyword: null,
  },
  period: {
    current: {
      start: '2026-03-27T00:00:00.000Z',
      end: '2026-04-03T23:59:59.999Z',
    },
    previous: {
      start: '2026-03-20T00:00:00.000Z',
      end: '2026-03-26T23:59:59.999Z',
    },
  },
};

describe('ClicksAnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(sampleData);
    mockReadSessionCache.mockReturnValue(null);
  });

  it('renders cached data when session cache hits', async () => {
    mockReadSessionCache.mockReturnValue(sampleData);

    render(<ClicksAnalyticsPage />);

    expect(mockReadSessionCache).toHaveBeenCalled();
    expect(await screen.findByText('Cached Sneaker')).toBeInTheDocument();
  });

  it('defaults the initial request to today only', async () => {
    render(<ClicksAnalyticsPage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    const params = mockGet.mock.calls[0][1] as {
      startDate: string;
      endDate: string;
    };
    const today = dayjs().format('YYYY-MM-DD');

    expect(dayjs(params.startDate).format('YYYY-MM-DD')).toBe(today);
    expect(dayjs(params.endDate).format('YYYY-MM-DD')).toBe(today);
  });

  it('refetches when source filter changes', async () => {
    render(<ClicksAnalyticsPage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('来源'), {
      target: { value: 'search' },
    });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith('/admin/analytics/clicks', {
      startDate: expect.any(String),
      endDate: expect.any(String),
      page: 1,
      limit: 20,
      source: 'search',
      platform: undefined,
      productKeyword: undefined,
      scope: 'customer',
    });
  });

  it('refetches when product keyword search is submitted', async () => {
    render(<ClicksAnalyticsPage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('商品名或商品 ID'), {
      target: { value: 'cached sneaker' },
    });
    fireEvent.click(screen.getByText('search'));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith('/admin/analytics/clicks', {
      startDate: expect.any(String),
      endDate: expect.any(String),
      page: 1,
      limit: 20,
      source: undefined,
      platform: undefined,
      productKeyword: 'cached sneaker',
      scope: 'customer',
    });
  });

  it('refetches with raw scope when the scope switch changes', async () => {
    render(<ClicksAnalyticsPage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '原始口径' }));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith('/admin/analytics/clicks', {
      startDate: expect.any(String),
      endDate: expect.any(String),
      page: 1,
      limit: 20,
      source: undefined,
      platform: undefined,
      productKeyword: undefined,
      scope: 'raw',
    });
    expect(
      screen.getByText(/包含管理员测试外跳和内部访问/),
    ).toBeInTheDocument();
  });
});
