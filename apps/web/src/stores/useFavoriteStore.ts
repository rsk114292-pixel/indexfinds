import { create } from 'zustand';
import { post, del } from '@/lib/api';
import { useAuthStore } from './useAuthStore';

interface FavoriteState {
  /** productId → isFavorited */
  favorites: Record<string, boolean>;

  /** Check favorite status via API (batched automatically) */
  checkFavorite: (productId: string) => Promise<boolean>;
  /** Toggle favorite status (optimistic UI) */
  toggleFavorite: (productId: string) => Promise<boolean>;
  /** Read cached status (undefined = not yet checked) */
  isFavorited: (productId: string) => boolean | undefined;
  /** Clear all cache (call on logout) */
  clearCache: () => void;
}

/**
 * Microtask batching for checkFavorite calls.
 *
 * When multiple ProductCards mount simultaneously, each calls checkFavorite().
 * Instead of N individual GET requests (which triggers 429 rate limiting),
 * we collect all productIds within one microtask tick and send a single
 * POST /favorites/check-batch request.
 */
let batchQueue: string[] = [];
let batchPromise: Promise<Record<string, boolean>> | null = null;
let batchResolve: ((value: Record<string, boolean>) => void) | null = null;

function scheduleBatchFlush(): Promise<Record<string, boolean>> {
  if (!batchPromise) {
    batchPromise = new Promise<Record<string, boolean>>((resolve) => {
      batchResolve = resolve;
      // Use queueMicrotask to collect all sync calls in this tick
      queueMicrotask(flushBatch);
    });
  }
  return batchPromise;
}

async function flushBatch() {
  const ids = [...new Set(batchQueue)];
  const resolve = batchResolve!;

  // Reset for next batch
  batchQueue = [];
  batchPromise = null;
  batchResolve = null;

  if (ids.length === 0) {
    resolve({});
    return;
  }

  try {
    const data = await post<{ favorites: Record<string, boolean> }>(
      '/favorites/check-batch',
      { productIds: ids },
    );
    const result = data.favorites || {};

    // Update store cache
    useFavoriteStore.setState((s) => ({
      favorites: { ...s.favorites, ...result },
    }));

    resolve(result);
  } catch {
    // On failure, resolve with empty (all false) — don't break UI
    const fallback: Record<string, boolean> = {};
    ids.forEach((id) => { fallback[id] = false; });
    resolve(fallback);
  }
}

export const useFavoriteStore = create<FavoriteState>()((set, getState) => ({
  favorites: {},

  isFavorited: (productId: string) => {
    return getState().favorites[productId];
  },

  checkFavorite: async (productId: string) => {
    // Not logged in → skip
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.token) {
      return false;
    }

    // Return cached value
    const state = getState();
    if (productId in state.favorites) {
      return state.favorites[productId];
    }

    // Add to batch queue
    batchQueue.push(productId);
    const result = await scheduleBatchFlush();
    return result[productId] ?? false;
  },

  toggleFavorite: async (productId: string) => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.token) {
      throw new Error('Not authenticated');
    }

    const currentStatus = getState().favorites[productId] ?? false;
    const newStatus = !currentStatus;

    // Optimistic update
    set((s) => ({
      favorites: { ...s.favorites, [productId]: newStatus },
    }));

    try {
      if (newStatus) {
        await post(`/favorites/${productId}`);
      } else {
        await del(`/favorites/${productId}`);
      }
      return newStatus;
    } catch {
      // Rollback on failure
      set((s) => ({
        favorites: { ...s.favorites, [productId]: currentStatus },
      }));
      throw new Error('Failed to update favorite');
    }
  },

  clearCache: () => {
    set({ favorites: {} });
  },
}));

// Auto-clear favorites cache when user logs out
useAuthStore.subscribe((state, prevState) => {
  if (prevState.isAuthenticated && !state.isAuthenticated) {
    useFavoriteStore.getState().clearCache();
  }
});
