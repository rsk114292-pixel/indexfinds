/**
 * sync-on-login guest data migration tests
 *
 * 验证登录时 guest key 下的数据能正确迁移到用户 key 下
 * 使用内部导出的 migrateGuestData 来隔离测试
 */

// Mock useAuthStore before importing
const mockGetState = jest.fn().mockReturnValue({ isAuthenticated: false, token: null });
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: mockGetState,
    subscribe: jest.fn(),
  },
}));

// Mock api calls
jest.mock('./api', () => ({
  post: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({}),
}));

// Mock user-storage to return controllable userId
let mockUserId = 'guest';
jest.mock('./user-storage', () => ({
  getCurrentUserId: () => mockUserId,
}));

// We need to test migrateGuestData directly.
// Since it's not exported, we test it indirectly via the subscribe callback behavior.
// But for unit test clarity, we replicate the migration logic here and test the actual module's effect.

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    _store: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('guest data migration on login', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockUserId = 'guest';
    jest.resetModules();
  });

  it('should migrate browsing history from guest key to user key', async () => {
    // Seed guest browsing history
    const guestData = [
      { productId: 'p1', brandId: 'b1', viewedAt: 1000 },
      { productId: 'p2', brandId: 'b2', viewedAt: 2000 },
    ];
    localStorageMock.setItem('browsing_history_guest', JSON.stringify(guestData));

    // Simulate login: userId changes to real user
    mockUserId = 'user-123';

    // Import fresh module to get migrateGuestData via initSyncOnLogin
    const { initSyncOnLogin } = await import('./sync-on-login');
    const { useAuthStore } = await import('@/stores/useAuthStore');

    // Get the subscribe callback
    const subscribeFn = (useAuthStore.subscribe as jest.Mock).mock.calls[0]?.[0];

    // If initSyncOnLogin hasn't been called yet (due to module caching), call it
    if (!subscribeFn) {
      initSyncOnLogin();
    }

    const callback = (useAuthStore.subscribe as jest.Mock).mock.calls[0][0];

    // Simulate login state change
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });
    callback(
      { isAuthenticated: true },
      { isAuthenticated: false },
    );

    // Guest data should be migrated to user key
    const userKey = 'browsing_history_user-123';
    const migrated = JSON.parse(localStorageMock.getItem(userKey) || '[]');
    expect(migrated).toHaveLength(2);
    expect(migrated[0].productId).toBe('p1');
    expect(migrated[1].productId).toBe('p2');

    // Guest key should be removed
    expect(localStorageMock.getItem('browsing_history_guest')).toBeNull();
  });

  it('should migrate search history from guest key to user key', async () => {
    localStorageMock.setItem('search_history_guest', JSON.stringify(['nike', 'adidas']));

    mockUserId = 'user-123';
    jest.resetModules();

    const { initSyncOnLogin } = await import('./sync-on-login');
    const { useAuthStore } = await import('@/stores/useAuthStore');
    initSyncOnLogin();

    const callback = (useAuthStore.subscribe as jest.Mock).mock.calls[0][0];
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });
    callback({ isAuthenticated: true }, { isAuthenticated: false });

    const migrated = JSON.parse(localStorageMock.getItem('search_history_user-123') || '[]');
    expect(migrated).toEqual(['nike', 'adidas']);
    expect(localStorageMock.getItem('search_history_guest')).toBeNull();
  });

  it('should merge guest data with existing user data (user data takes priority)', async () => {
    // User already has some browsing history on server (pulled previously)
    localStorageMock.setItem(
      'browsing_history_user-123',
      JSON.stringify([{ productId: 'p1', brandId: 'b1-updated', viewedAt: 3000 }]),
    );
    // Guest has overlapping + new data
    localStorageMock.setItem(
      'browsing_history_guest',
      JSON.stringify([
        { productId: 'p1', brandId: 'b1-old', viewedAt: 1000 },
        { productId: 'p3', brandId: 'b3', viewedAt: 2000 },
      ]),
    );

    mockUserId = 'user-123';
    jest.resetModules();

    const { initSyncOnLogin } = await import('./sync-on-login');
    const { useAuthStore } = await import('@/stores/useAuthStore');
    initSyncOnLogin();

    const callback = (useAuthStore.subscribe as jest.Mock).mock.calls[0][0];
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });
    callback({ isAuthenticated: true }, { isAuthenticated: false });

    const migrated = JSON.parse(localStorageMock.getItem('browsing_history_user-123') || '[]');
    // p1 should keep user's version, p3 should be added from guest
    expect(migrated).toHaveLength(2);
    expect(migrated[0].productId).toBe('p1');
    expect(migrated[0].brandId).toBe('b1-updated'); // user data takes priority
    expect(migrated[1].productId).toBe('p3');
  });

  it('should not fail when guest key is empty or missing', async () => {
    mockUserId = 'user-123';
    jest.resetModules();

    const { initSyncOnLogin } = await import('./sync-on-login');
    const { useAuthStore } = await import('@/stores/useAuthStore');
    initSyncOnLogin();

    const callback = (useAuthStore.subscribe as jest.Mock).mock.calls[0][0];
    mockGetState.mockReturnValue({ isAuthenticated: true, token: 'tok' });

    // Should not throw
    expect(() => {
      callback({ isAuthenticated: true }, { isAuthenticated: false });
    }).not.toThrow();
  });
});
