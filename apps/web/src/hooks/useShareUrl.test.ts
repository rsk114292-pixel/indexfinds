import { renderHook, waitFor } from '@testing-library/react';
import { useShareUrl } from './useShareUrl';

// Mock SWR — 控制返回数据而非实际发请求
jest.mock('swr', () => {
  // 保存最近一次调用的 key，供断言用
  const actual = { lastKey: undefined as string | null | undefined };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const useSWR = (key: string | null, _fetcher: unknown, _opts?: unknown) => {
    actual.lastKey = key;
    // 通过内部 map 控制不同 key 的返回值
    const data = key ? useSWR.__data[key] : undefined;
    return { data, error: undefined, isLoading: false };
  };
  useSWR.__data = {} as Record<string, unknown>;
  useSWR.__actual = actual;
  return { __esModule: true, default: useSWR };
});

// Mock useAuthStore
const mockAuthState = {
  isAuthenticated: false,
  token: null as string | null,
  _hasHydrated: true,
};
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockAuthState,
}));

// 获取 mock 的 swr 引用
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockSWR = require('swr').default;

beforeEach(() => {
  mockAuthState.isAuthenticated = false;
  mockAuthState.token = null;
  mockAuthState._hasHydrated = true;
  mockSWR.__data = {};
  // jsdom 默认 window.location.href = 'http://localhost/'
});

describe('useShareUrl', () => {
  it('未登录时返回当前页面 URL，不发起 SWR 请求', () => {
    mockAuthState.isAuthenticated = false;

    const { result } = renderHook(() => useShareUrl());

    expect(result.current).toBe(window.location.href);
    expect(mockSWR.__actual.lastKey).toBeNull();
  });

  it('已登录但数据未返回时返回当前页面 URL', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    // SWR 还没有缓存数据

    const { result } = renderHook(() => useShareUrl());

    expect(result.current).toBe(window.location.href);
    expect(mockSWR.__actual.lastKey).toBe('/referral/my-code');
  });

  it('已登录且有推荐码时返回带 redirect 的 /r/ 中转链接', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    mockSWR.__data['/referral/my-code'] = { code: 'ABC123' };

    const { result } = renderHook(() => useShareUrl());

    await waitFor(() => {
      expect(result.current).toContain('/r/ABC123');
      expect(result.current).toContain(`redirect=${encodeURIComponent('/')}`);
    });
  });

  it('保留当前页面查询参数到 redirect', async () => {
    window.history.replaceState({}, '', '/products?sortBy=popular&tab=new');
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    mockSWR.__data['/referral/my-code'] = { code: 'ABC123' };

    const { result } = renderHook(() => useShareUrl());

    await waitFor(() => {
      expect(result.current).toBe(
        `${window.location.origin}/r/ABC123?redirect=${encodeURIComponent('/products?sortBy=popular&tab=new')}`,
      );
    });
  });

  it('传入目标页面 URL 时，返回对应 redirect 的推荐链接', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    mockSWR.__data['/referral/my-code'] = { code: 'ABC123' };

    const { result } = renderHook(() =>
      useShareUrl(`${window.location.origin}/brands?nike=1`),
    );

    await waitFor(() => {
      expect(result.current).toBe(
        `${window.location.origin}/r/ABC123?redirect=${encodeURIComponent('/brands?nike=1')}`,
      );
    });
  });

  it('已是推荐链接时不重复包装', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    mockSWR.__data['/referral/my-code'] = { code: 'ABC123' };

    const referralUrl = `${window.location.origin}/r/EXISTING?redirect=${encodeURIComponent('/products')}`;
    const { result } = renderHook(() => useShareUrl(referralUrl));

    await waitFor(() => {
      expect(result.current).toBe(referralUrl);
    });
  });

  it('外部链接保持原值，不强行包装推荐码', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    mockSWR.__data['/referral/my-code'] = { code: 'ABC123' };

    const externalUrl = 'https://google.com/search?q=lolobuyspreadsheets';
    const { result } = renderHook(() => useShareUrl(externalUrl));

    await waitFor(() => {
      expect(result.current).toBe(externalUrl);
    });
  });

  it('SWR key 在未登录时为 null（不发请求）', () => {
    mockAuthState.isAuthenticated = false;

    renderHook(() => useShareUrl());

    expect(mockSWR.__actual.lastKey).toBeNull();
  });

  it('SWR key 在已登录时为 /referral/my-code', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';

    renderHook(() => useShareUrl());

    expect(mockSWR.__actual.lastKey).toBe('/referral/my-code');
  });

  it('已登录但 token 未恢复时不发请求', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = null;

    renderHook(() => useShareUrl());

    expect(mockSWR.__actual.lastKey).toBeNull();
  });

  it('已登录但 hydration 未完成时不发请求', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'token';
    mockAuthState._hasHydrated = false;

    renderHook(() => useShareUrl());

    expect(mockSWR.__actual.lastKey).toBeNull();
  });
});
