import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SearchProductRequestPrompt } from './SearchProductRequestPrompt';

const mockPush = jest.fn();
const mockPost = jest.fn();
const mockRequest = jest.fn();
const mockMessage = {
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};

const mockAuthState = {
  isAuthenticated: false,
  _hasHydrated: true,
};

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/hooks/useLgUp', () => ({
  useLgUp: () => true,
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockAuthState,
}));

jest.mock('@/lib/api', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
  post: (...args: unknown[]) => mockPost(...args),
}));

jest.mock('@/components/mobile/ui/MobileSheet', () => ({
  MobileSheet: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const Button = ({
    children,
    onClick,
    loading,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    loading?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={loading}>
      {children}
    </button>
  );

  const Input = ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder || 'input'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );

  const TextArea = ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder || 'textarea'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
  TextArea.displayName = 'TextArea';
  Input.TextArea = TextArea;

  const InputNumber = ({
    value,
    onChange,
    placeholder,
  }: {
    value?: number;
    onChange?: (value: number | null) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder || 'number-input'}
      placeholder={placeholder}
      type="number"
      value={value ?? ''}
      onChange={(event) =>
        onChange?.(
          event.target.value === '' ? null : Number(event.target.value),
        )
      }
    />
  );

  const Modal = ({
    open,
    children,
  }: {
    open?: boolean;
    children?: React.ReactNode;
  }) => (open ? <div>{children}</div> : null);

  const Upload = ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div>{children}</div>;
  Upload.LIST_IGNORE = Symbol('LIST_IGNORE');

  return {
    App: {
      useApp: () => ({ message: mockMessage }),
    },
    Button,
    Input,
    InputNumber,
    Modal,
    Upload,
  };
});

describe('SearchProductRequestPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.isAuthenticated = false;
    mockAuthState._hasHydrated = true;
  });

  it('redirects unauthenticated users to login', () => {
    render(
      <SearchProductRequestPrompt
        query="nike shox"
        locale="en"
        redirectPath="/en/search?q=nike+shox"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'button' }));

    expect(mockPush).toHaveBeenCalledWith(
      '/login?redirect=%2Fen%2Fsearch%3Fq%3Dnike%2Bshox',
    );
  });

  it('submits a sourcing request for authenticated users', async () => {
    mockAuthState.isAuthenticated = true;
    mockPost.mockResolvedValue({});

    render(
      <SearchProductRequestPrompt
        query="nike shox"
        locale="en"
        redirectPath="/en/search?q=nike+shox"
        searchLogId="550e8400-e29b-41d4-a716-446655440000"
        filtersSnapshot={{ q: 'nike shox' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'button' }));

    fireEvent.change(
      screen.getByLabelText('productNamePlaceholder'),
      { target: { value: 'Nike Shox TL Black' } },
    );
    fireEvent.change(
      screen.getByLabelText('descriptionPlaceholder'),
      { target: { value: 'Need the black colorway with silver cage.' } },
    );

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/product-sourcing-requests', {
        searchQuery: 'nike shox',
        productName: 'Nike Shox TL Black',
        description: 'Need the black colorway with silver cage.',
        referenceUrl: undefined,
        imageUrls: [],
        budgetMin: undefined,
        budgetMax: undefined,
        locale: 'en',
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        filtersSnapshot: { q: 'nike shox' },
      });
    });

    expect(mockMessage.success).toHaveBeenCalledWith('success');
  });

  it('validates the reference URL before submitting', async () => {
    mockAuthState.isAuthenticated = true;

    render(
      <SearchProductRequestPrompt
        query="nike shox"
        locale="en"
        redirectPath="/en/search?q=nike+shox"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'button' }));

    fireEvent.change(screen.getByLabelText('referenceUrlPlaceholder'), {
      target: { value: 'not-a-url' },
    });
    fireEvent.change(screen.getByLabelText('descriptionPlaceholder'), {
      target: { value: 'Need this product' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockMessage.warning).toHaveBeenCalledWith('referenceUrlInvalid');
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows a localized fallback when submit fails', async () => {
    mockAuthState.isAuthenticated = true;
    mockPost.mockRejectedValue(new Error('Internal server error'));

    render(
      <SearchProductRequestPrompt
        query="nike shox"
        locale="en"
        redirectPath="/en/search?q=nike+shox"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'button' }));

    fireEvent.change(screen.getByLabelText('descriptionPlaceholder'), {
      target: { value: 'Need this product' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('submitFailed');
    });
  });
});
