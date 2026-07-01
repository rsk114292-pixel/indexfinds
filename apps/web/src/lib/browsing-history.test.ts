import {
  getBrowsingHistory,
  recordProductView,
  clearBrowsingHistory,
  pruneInactiveHistory,
  getHistoryMaxSize,
  setHistoryMaxSize,
} from './browsing-history';

const mockPost = jest.fn();
const mockDel = jest.fn();
const mockGet = jest.fn();
const mockAuthGetState = jest.fn(() => ({
  _hasHydrated: false,
  isAuthenticated: false,
  token: null,
}));

jest.mock('./api', () => ({
  post: (...args: unknown[]) => mockPost(...args),
  del: (...args: unknown[]) => mockDel(...args),
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: () => mockAuthGetState(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  mockPost.mockReset();
  mockDel.mockReset();
  mockGet.mockReset();
  mockAuthGetState.mockReturnValue({
    _hasHydrated: false,
    isAuthenticated: false,
    token: null,
  });
});

describe('browsing-history', () => {
  describe('pruneInactiveHistory', () => {
    it('should remove inactive product IDs from history', () => {
      // Seed history with 5 items
      recordProductView({ productId: 'p1' });
      recordProductView({ productId: 'p2' });
      recordProductView({ productId: 'p3' });
      recordProductView({ productId: 'p4' });
      recordProductView({ productId: 'p5' });

      expect(getBrowsingHistory()).toHaveLength(5);

      // Only p1, p3, p5 are active
      const pruned = pruneInactiveHistory(['p1', 'p3', 'p5']);

      expect(pruned).toHaveLength(3);
      expect(pruned.map((item) => item.productId)).toEqual(['p5', 'p3', 'p1']);

      // localStorage should also be updated
      expect(getBrowsingHistory()).toHaveLength(3);
    });

    it('should not modify history when all products are active', () => {
      recordProductView({ productId: 'p1' });
      recordProductView({ productId: 'p2' });

      const pruned = pruneInactiveHistory(['p1', 'p2']);

      expect(pruned).toHaveLength(2);
      expect(getBrowsingHistory()).toHaveLength(2);
    });

    it('should return empty array when no products are active', () => {
      recordProductView({ productId: 'p1' });
      recordProductView({ productId: 'p2' });

      const pruned = pruneInactiveHistory(['p99']);

      expect(pruned).toHaveLength(0);
      expect(getBrowsingHistory()).toHaveLength(0);
    });

    it('should handle empty history gracefully', () => {
      const pruned = pruneInactiveHistory(['p1', 'p2']);
      expect(pruned).toHaveLength(0);
    });
  });

  describe('recordProductView', () => {
    it('should add a product to history', () => {
      recordProductView({ productId: 'p1', brandSlug: 'nike' });
      const history = getBrowsingHistory();
      expect(history).toHaveLength(1);
      expect(history[0].productId).toBe('p1');
      expect(history[0].brandSlug).toBe('nike');
      expect(history[0].viewedAt).toBeGreaterThan(0);
    });

    it('should move duplicate product to front with updated timestamp', () => {
      recordProductView({ productId: 'p1' });
      recordProductView({ productId: 'p2' });
      recordProductView({ productId: 'p1' });

      const history = getBrowsingHistory();
      expect(history).toHaveLength(2);
      expect(history[0].productId).toBe('p1');
      expect(history[1].productId).toBe('p2');
    });

    it('should not sync to server before auth token is available', () => {
      mockAuthGetState.mockReturnValue({
        _hasHydrated: true,
        isAuthenticated: true,
        token: null,
      });

      recordProductView({ productId: 'p1' });

      expect(mockPost).not.toHaveBeenCalledWith(
        '/users/browsing-history',
        expect.anything(),
      );
    });
  });

  describe('clearBrowsingHistory', () => {
    it('should clear all history', () => {
      recordProductView({ productId: 'p1' });
      recordProductView({ productId: 'p2' });
      expect(getBrowsingHistory()).toHaveLength(2);

      clearBrowsingHistory();
      expect(getBrowsingHistory()).toHaveLength(0);
    });
  });

  describe('historyMaxSize', () => {
    it('should default to 50', () => {
      expect(getHistoryMaxSize()).toBe(50);
    });

    it('should persist user setting', () => {
      setHistoryMaxSize(100);
      expect(getHistoryMaxSize()).toBe(100);
    });

    it('should clamp to valid range', () => {
      setHistoryMaxSize(200);
      expect(getHistoryMaxSize()).toBe(100);

      setHistoryMaxSize(10);
      expect(getHistoryMaxSize()).toBe(50);
    });
  });
});
