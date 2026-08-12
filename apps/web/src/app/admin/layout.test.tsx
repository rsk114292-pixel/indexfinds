import { render, screen, waitFor } from '@testing-library/react';
import AdminLayout from './layout';

const mockReplace = jest.fn();
const mockMessage = {
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
};

const mockAuthReady = jest.fn();
const mockLogout = jest.fn();
const mockPathname = jest.fn(() => '/admin/products/hot');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => mockPathname(),
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    Layout: Object.assign(passthrough, {
      Header: passthrough,
      Sider: passthrough,
      Content: passthrough,
    }),
    Menu: passthrough,
    Avatar: () => <div data-testid="avatar" />,
    Dropdown: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Drawer: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
      <div data-open={open ? 'true' : 'false'}>{children}</div>
    ),
    Button: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
    Spin: () => <div>Loading admin...</div>,
    App: {
      useApp: () => ({ message: mockMessage }),
    },
  };
});

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    logout: mockLogout,
  }),
}));

jest.mock('@/lib/api', () => ({
  post: jest.fn(),
}));

jest.mock('./route-config', () => ({
  adminMenuItems: [],
  getSelectedKeys: () => [],
  getOpenKeys: () => [],
}));

jest.mock('@/lib/site-config', () => ({
  getSiteName: () => 'IndexFinds',
}));

jest.mock('@/components/AntdProvider', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./components/AdminBreadcrumb', () => ({
  __esModule: true,
  default: () => <div data-testid="admin-breadcrumb" />,
}));

jest.mock('./components/GlobalSearch', () => ({
  __esModule: true,
  default: () => <div data-testid="global-search" />,
}));

jest.mock('./useAdminAuthReady', () => ({
  useAdminAuthReady: () => mockAuthReady(),
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/admin/products/hot');
  });

  it('blocks admin children while access token is still recovering', () => {
    mockAuthReady.mockReturnValue({
      status: 'recovering_token',
      user: {
        id: 'u1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
      },
      isReady: false,
    });

    render(
      <AdminLayout>
        <div>Secret Admin Page</div>
      </AdminLayout>,
    );

    expect(screen.getByText('Loading admin...')).toBeInTheDocument();
    expect(screen.queryByText('Secret Admin Page')).not.toBeInTheDocument();
  });

  it('renders admin children once auth is ready', () => {
    mockAuthReady.mockReturnValue({
      status: 'ready',
      user: {
        id: 'u1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
      },
      isReady: true,
    });

    render(
      <AdminLayout>
        <div>Secret Admin Page</div>
      </AdminLayout>,
    );

    expect(screen.getByText('Secret Admin Page')).toBeInTheDocument();
    expect(screen.getByTestId('global-search')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to admin login', async () => {
    mockAuthReady.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      isReady: false,
    });

    render(
      <AdminLayout>
        <div>Secret Admin Page</div>
      </AdminLayout>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    });
  });
});
