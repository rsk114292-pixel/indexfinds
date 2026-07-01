import {
  getSearchHistory,
  saveSearchHistory,
  removeSearchHistoryItem,
  clearSearchHistory,
} from './search-history';

// Mock api module to prevent actual network calls
jest.mock('./api', () => ({
  post: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ data: [] }),
  request: jest.fn().mockResolvedValue(undefined),
}));

// Mock useAuthStore — not logged in by default
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: false, token: null }),
    subscribe: jest.fn(),
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
});

describe('search-history', () => {
  describe('user isolation', () => {
    it('should use guest key when not logged in', () => {
      saveSearchHistory('test query');
      expect(localStorageMock.getItem('search_history_guest')).toContain('test query');
    });

    it('should use user-specific key when logged in', () => {
      // Simulate logged-in user
      localStorageMock.setItem(
        'auth-storage',
        JSON.stringify({ state: { user: { id: 'user-123' }, isAuthenticated: true } }),
      );

      saveSearchHistory('logged in search');
      expect(localStorageMock.getItem('search_history_user-123')).toContain('logged in search');
      // Guest key should not have this search
      expect(localStorageMock.getItem('search_history_guest')).toBeNull();
    });

    it('should isolate history between different users', () => {
      // User A
      localStorageMock.setItem(
        'auth-storage',
        JSON.stringify({ state: { user: { id: 'user-a' }, isAuthenticated: true } }),
      );
      saveSearchHistory('user a search');

      // User B
      localStorageMock.setItem(
        'auth-storage',
        JSON.stringify({ state: { user: { id: 'user-b' }, isAuthenticated: true } }),
      );
      saveSearchHistory('user b search');

      // User B should not see User A's history
      const historyB = getSearchHistory();
      expect(historyB).toEqual(['user b search']);
      expect(historyB).not.toContain('user a search');

      // Switch back to User A
      localStorageMock.setItem(
        'auth-storage',
        JSON.stringify({ state: { user: { id: 'user-a' }, isAuthenticated: true } }),
      );
      const historyA = getSearchHistory();
      expect(historyA).toEqual(['user a search']);
    });
  });

  describe('getSearchHistory', () => {
    it('should return empty array when no history', () => {
      expect(getSearchHistory()).toEqual([]);
    });

    it('should return stored history', () => {
      localStorageMock.setItem(
        'search_history_guest',
        JSON.stringify(['query1', 'query2']),
      );
      expect(getSearchHistory()).toEqual(['query1', 'query2']);
    });

    it('should filter out invalid entries', () => {
      localStorageMock.setItem(
        'search_history_guest',
        JSON.stringify(['valid', '', 123, null, 'also valid']),
      );
      expect(getSearchHistory()).toEqual(['valid', 'also valid']);
    });

    it('should limit to 10 entries', () => {
      const items = Array.from({ length: 15 }, (_, i) => `query${i}`);
      localStorageMock.setItem('search_history_guest', JSON.stringify(items));
      expect(getSearchHistory()).toHaveLength(10);
    });
  });

  describe('saveSearchHistory', () => {
    it('should add query to front of history', () => {
      saveSearchHistory('first');
      saveSearchHistory('second');
      expect(getSearchHistory()).toEqual(['second', 'first']);
    });

    it('should deduplicate and move to front', () => {
      saveSearchHistory('a');
      saveSearchHistory('b');
      saveSearchHistory('a');
      expect(getSearchHistory()).toEqual(['a', 'b']);
    });

    it('should limit to 10 entries', () => {
      for (let i = 0; i < 12; i++) {
        saveSearchHistory(`query${i}`);
      }
      expect(getSearchHistory()).toHaveLength(10);
      expect(getSearchHistory()[0]).toBe('query11');
    });
  });

  describe('removeSearchHistoryItem', () => {
    it('should remove specific query', () => {
      saveSearchHistory('keep');
      saveSearchHistory('remove');
      removeSearchHistoryItem('remove');
      expect(getSearchHistory()).toEqual(['keep']);
    });

    it('should handle removing non-existent item', () => {
      saveSearchHistory('exists');
      removeSearchHistoryItem('not-exists');
      expect(getSearchHistory()).toEqual(['exists']);
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear all history', () => {
      saveSearchHistory('a');
      saveSearchHistory('b');
      clearSearchHistory();
      expect(getSearchHistory()).toEqual([]);
    });
  });
});
