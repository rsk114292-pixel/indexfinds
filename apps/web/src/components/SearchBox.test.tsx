import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SearchBox from './SearchBox';

// Mock next/dynamic to render ImageSearchUploader inline
jest.mock('next/dynamic', () => {
  return () => {
    // Return a simple stub component
    return function DynamicStub() {
      return <div data-testid="image-search-uploader" />;
    };
  };
});

// Mock the search module
const mockFetchSearchSuggestions = jest.fn();
jest.mock('@/lib/search', () => ({
  fetchSearchSuggestions: (...args: unknown[]) => mockFetchSearchSuggestions(...args),
}));

const mockUseDebounce = jest.fn<string, [string, number?]>(() => '');
// Mock useDebounce to be controllable per test
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string, delay?: number) => mockUseDebounce(value, delay),
}));

jest.mock('@/hooks/useCategoryLabelResolver', () => ({
  useCategoryLabelResolver: () => ({
    getCategoryLabel: (_slug: string, fallbackLabel?: string | null) =>
      fallbackLabel || _slug,
  }),
}));

// Track router.push calls
const mockPush = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <a {...props}>{children}</a>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SearchBox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetchSearchSuggestions.mockReset();
    mockUseDebounce.mockImplementation(() => '');
  });

  it('renders search input', () => {
    render(<SearchBox />);
    expect(
      screen.getByRole('combobox', { name: 'placeholder' }),
    ).toBeInTheDocument();
  });

  it('renders image search uploader', () => {
    render(<SearchBox />);
    expect(screen.getByTestId('image-search-uploader')).toBeInTheDocument();
  });

  it('renders explicit search button in default variant', () => {
    render(<SearchBox />);
    expect(screen.getByRole('button', { name: 'search' })).toBeInTheDocument();
  });

  it('navigates to search page on Enter', () => {
    render(<SearchBox />);
    const input = screen.getByPlaceholderText('placeholder');

    fireEvent.change(input, { target: { value: 'nike shoes' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith('/search?q=nike%20shoes');
  });

  it('does not navigate on empty search', () => {
    render(<SearchBox />);
    const input = screen.getByPlaceholderText('placeholder');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to search page on Search button click', () => {
    render(<SearchBox />);
    const input = screen.getByPlaceholderText('placeholder');

    fireEvent.change(input, { target: { value: 'nike shoes' } });
    fireEvent.click(screen.getByRole('button', { name: 'search' }));

    expect(mockPush).toHaveBeenCalledWith('/search?q=nike%20shoes');
  });

  it('saves search query to localStorage history', () => {
    render(<SearchBox />);
    const input = screen.getByPlaceholderText('placeholder');

    fireEvent.change(input, { target: { value: 'adidas' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'search_history_guest',
      expect.stringContaining('adidas'),
    );
  });

  it('fetches suggestions when input length >= 2', async () => {
    mockUseDebounce.mockImplementation((value: string) => value);
    let resolveSuggestions:
      | ((value: { brands: []; categories: []; products: [] }) => void)
      | undefined;
    mockFetchSearchSuggestions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSuggestions = resolve;
        }),
    );

    render(<SearchBox />);
    const input = screen.getByPlaceholderText('placeholder');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'ni' } });
    });

    await waitFor(() => {
      expect(mockFetchSearchSuggestions).toHaveBeenCalledWith(
        'ni',
        expect.any(AbortSignal),
      );
    });

    await act(async () => {
      resolveSuggestions?.({
        brands: [],
        categories: [],
        products: [],
      });
    });
  });

  it('does not fetch suggestions when input length < 2', async () => {
    mockUseDebounce.mockImplementation((value: string) => value);
    render(<SearchBox />);
    const input = screen.getByPlaceholderText('placeholder');

    fireEvent.change(input, { target: { value: 'n' } });

    // Give it a tick to see if it tries to fetch
    await waitFor(() => {
      expect(mockFetchSearchSuggestions).not.toHaveBeenCalled();
    });
  });

  it('loads search history from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(['prev search']));
    render(<SearchBox />);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('search_history_guest');
  });
});
