import { act } from 'react';

// Mock API module
const mockPost = jest.fn();
const mockDel = jest.fn();
jest.mock('@/lib/api', () => ({
  post: (...args: unknown[]) => mockPost(...args),
  del: (...args: unknown[]) => mockDel(...args),
}));

// Mock useAuthStore — define subscribe inside the factory (avoids hoisting issue)
jest.mock('../useAuthStore', () => ({
  useAuthStore: {
    subscribe: jest.fn(() => jest.fn()),
    getState: () => ({ isAuthenticated: true, token: 'mock-token' }),
  },
}));

// Access the mock subscribe via the imported module
import { useAuthStore } from '../useAuthStore';
const mockSubscribe = useAuthStore.subscribe as jest.Mock;

import { useFavoriteStore } from '../useFavoriteStore';

/** Helper: fire all registered auth subscribers to simulate logout */
function simulateLogout() {
  mockSubscribe.mock.calls.forEach(([fn]: [(...args: unknown[]) => void]) => {
    fn({ isAuthenticated: false }, { isAuthenticated: true });
  });
}

describe('useFavoriteStore', () => {
  beforeEach(() => {
    act(() => useFavoriteStore.getState().clearCache());
    mockPost.mockReset();
    mockDel.mockReset();
  });

  // ─── checkFavorite ──────────────────────────────────────
  describe('checkFavorite', () => {
    it('batches and caches favorite status', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });

      const result = await useFavoriteStore.getState().checkFavorite('p1');

      expect(result).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/favorites/check-batch', {
        productIds: ['p1'],
      });
      expect(useFavoriteStore.getState().favorites['p1']).toBe(true);
    });

    it('returns cached value without API call', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });
      await useFavoriteStore.getState().checkFavorite('p1');
      mockPost.mockClear();

      const result = await useFavoriteStore.getState().checkFavorite('p1');

      expect(result).toBe(true);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('batches concurrent requests into one API call', async () => {
      mockPost.mockResolvedValueOnce({
        favorites: { p1: true, p2: false, p3: true },
      });

      const [r1, r2, r3] = await Promise.all([
        useFavoriteStore.getState().checkFavorite('p1'),
        useFavoriteStore.getState().checkFavorite('p2'),
        useFavoriteStore.getState().checkFavorite('p3'),
      ]);

      expect(r1).toBe(true);
      expect(r2).toBe(false);
      expect(r3).toBe(true);
      // All merged into a single POST call
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith('/favorites/check-batch', {
        productIds: expect.arrayContaining(['p1', 'p2', 'p3']),
      });
    });

    it('deduplicates same productId in one batch', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p2: false } });

      const [r1, r2] = await Promise.all([
        useFavoriteStore.getState().checkFavorite('p2'),
        useFavoriteStore.getState().checkFavorite('p2'),
      ]);

      expect(r1).toBe(false);
      expect(r2).toBe(false);
      // Only one unique ID in the batch
      expect(mockPost).toHaveBeenCalledWith('/favorites/check-batch', {
        productIds: ['p2'],
      });
    });

    it('returns false on API error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network'));

      const result = await useFavoriteStore.getState().checkFavorite('p3');
      expect(result).toBe(false);
    });

    it('returns false without API call when not authenticated', async () => {
      // Temporarily override getState to simulate no token
      const original = useAuthStore.getState;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAuthStore as any).getState = () => ({ isAuthenticated: true, token: null });

      const result = await useFavoriteStore.getState().checkFavorite('p-noauth');

      expect(result).toBe(false);
      expect(mockPost).not.toHaveBeenCalled();

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAuthStore as any).getState = original;
    });
  });

  // ─── toggleFavorite ─────────────────────────────────────
  describe('toggleFavorite', () => {
    it('adds favorite (false → true)', async () => {
      mockPost
        .mockResolvedValueOnce({}) // for POST /favorites/p1
        ;

      const result = await useFavoriteStore.getState().toggleFavorite('p1');

      expect(result).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/favorites/p1');
      expect(useFavoriteStore.getState().favorites['p1']).toBe(true);
    });

    it('removes favorite (true → false)', async () => {
      // Seed cache with true
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });
      await useFavoriteStore.getState().checkFavorite('p1');
      mockDel.mockResolvedValueOnce({});

      const result = await useFavoriteStore.getState().toggleFavorite('p1');

      expect(result).toBe(false);
      expect(mockDel).toHaveBeenCalledWith('/favorites/p1');
    });

    it('rolls back on API failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('500'));

      await expect(
        useFavoriteStore.getState().toggleFavorite('p5'),
      ).rejects.toThrow('Failed to update favorite');

      expect(useFavoriteStore.getState().favorites['p5']).toBe(false);
    });
  });

  // ─── clearCache ─────────────────────────────────────────
  describe('clearCache', () => {
    it('clears all state', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });
      await useFavoriteStore.getState().checkFavorite('p1');

      act(() => useFavoriteStore.getState().clearCache());

      expect(useFavoriteStore.getState().favorites).toEqual({});
    });
  });

  // ─── isFavorited ────────────────────────────────────────
  describe('isFavorited', () => {
    it('returns undefined for unchecked product', () => {
      expect(useFavoriteStore.getState().isFavorited('x')).toBeUndefined();
    });

    it('returns boolean for checked product', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });
      await useFavoriteStore.getState().checkFavorite('p1');

      expect(useFavoriteStore.getState().isFavorited('p1')).toBe(true);
    });
  });

  // ─── Auth logout subscription ───────────────────────────
  describe('auth logout clears cache', () => {
    it('registers a subscriber on useAuthStore', () => {
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(typeof mockSubscribe.mock.calls[0][0]).toBe('function');
    });

    it('clears favorites when auth changes to logged out', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });
      await useFavoriteStore.getState().checkFavorite('p1');
      expect(useFavoriteStore.getState().favorites['p1']).toBe(true);

      act(() => simulateLogout());

      expect(useFavoriteStore.getState().favorites).toEqual({});
    });

    it('does NOT clear on login (false → true)', async () => {
      mockPost.mockResolvedValueOnce({ favorites: { p1: true } });
      await useFavoriteStore.getState().checkFavorite('p1');

      act(() => {
        mockSubscribe.mock.calls.forEach(([fn]: [(...args: unknown[]) => void]) => {
          fn({ isAuthenticated: true }, { isAuthenticated: false });
        });
      });

      expect(useFavoriteStore.getState().favorites['p1']).toBe(true);
    });
  });
});
