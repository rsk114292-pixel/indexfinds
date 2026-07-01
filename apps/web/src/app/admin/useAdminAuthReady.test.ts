import { renderHook } from '@testing-library/react';
import { useAdminAuthReady } from './useAdminAuthReady';

const mockAuthState = {
  user: null as
    | {
        id: string;
        email: string;
        username: string | null;
        avatar: string | null;
        role: string;
        emailVerified: boolean;
      }
    | null,
  token: null as string | null,
  isAuthenticated: false,
  _hasHydrated: false,
};

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockAuthState,
}));

describe('useAdminAuthReady', () => {
  beforeEach(() => {
    mockAuthState.user = null;
    mockAuthState.token = null;
    mockAuthState.isAuthenticated = false;
    mockAuthState._hasHydrated = false;
  });

  it('returns hydrating before auth store hydration completes', () => {
    const { result } = renderHook(() => useAdminAuthReady());

    expect(result.current.status).toBe('hydrating');
    expect(result.current.isReady).toBe(false);
    expect(result.current.isBlocking).toBe(true);
  });

  it('returns recovering_token for an authenticated admin without an access token', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 'admin-1',
      email: 'admin@example.com',
      username: 'Admin',
      avatar: null,
      role: 'admin',
      emailVerified: true,
    };

    const { result } = renderHook(() => useAdminAuthReady());

    expect(result.current.status).toBe('recovering_token');
    expect(result.current.isReady).toBe(false);
    expect(result.current.isBlocking).toBe(true);
  });

  it('returns ready only when hydration, admin role, and token are all present', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'access-token';
    mockAuthState.user = {
      id: 'admin-1',
      email: 'admin@example.com',
      username: 'Admin',
      avatar: null,
      role: 'super_admin',
      emailVerified: true,
    };

    const { result } = renderHook(() => useAdminAuthReady());

    expect(result.current.status).toBe('ready');
    expect(result.current.isReady).toBe(true);
    expect(result.current.isBlocking).toBe(false);
  });

  it('returns forbidden for authenticated non-admin users', () => {
    mockAuthState._hasHydrated = true;
    mockAuthState.isAuthenticated = true;
    mockAuthState.token = 'access-token';
    mockAuthState.user = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'User',
      avatar: null,
      role: 'user',
      emailVerified: true,
    };

    const { result } = renderHook(() => useAdminAuthReady());

    expect(result.current.status).toBe('forbidden');
    expect(result.current.isReady).toBe(false);
    expect(result.current.isBlocking).toBe(false);
  });
});
