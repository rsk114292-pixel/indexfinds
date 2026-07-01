/**
 * 登录后自动同步本地数据到服务端
 * 监听 useAuthStore 的状态变化，登录时触发同步
 *
 * 关键：登录前数据存在 browsing_history_guest / search_history_guest，
 * 登录后 getCurrentUserId() 返回真实 userId，需要先迁移 guest 数据。
 */

import { useAuthStore } from '@/stores/useAuthStore';
import { syncToServer, syncFromServer } from './browsing-history';
import {
  syncSearchHistoryToServer,
  syncSearchHistoryFromServer,
} from './search-history';
import { getCurrentUserId } from './user-storage';
import { get } from './api';
import { useCurrencyStore, type CurrencyCode, SUPPORTED_CURRENCIES } from '@/stores/useCurrencyStore';
import { usePlatformStore } from '@/stores/usePlatformStore';

let initialized = false;

/**
 * 将 guest key 下的数据迁移到当前用户 key 下
 * 解决登录前数据存在 guest key、登录后读取 userId key 为空的问题
 */
function migrateGuestData(): void {
  if (typeof window === 'undefined') return;

  const userId = getCurrentUserId();
  if (userId === 'guest') return;

  // 迁移浏览历史
  migrateKey('browsing_history_guest', `browsing_history_${userId}`, (guest, user) => {
    const seen = new Set(user.map((i: { productId: string }) => i.productId));
    return [...user, ...guest.filter((i: { productId: string }) => !seen.has(i.productId))];
  });

  // 迁移搜索历史
  migrateKey('search_history_guest', `search_history_${userId}`, (guest: string[], user: string[]) => {
    const seen = new Set(user);
    return [...user, ...guest.filter((q) => !seen.has(q))];
  });
}

function migrateKey(
  guestKey: string,
  userKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  merge: (guest: any[], user: any[]) => unknown[],
): void {
  try {
    const guestRaw = localStorage.getItem(guestKey);
    if (!guestRaw) return;

    const guestData = JSON.parse(guestRaw);
    if (!Array.isArray(guestData) || guestData.length === 0) {
      localStorage.removeItem(guestKey);
      return;
    }

    const userRaw = localStorage.getItem(userKey);
    const userData = userRaw ? JSON.parse(userRaw) : [];
    const merged = merge(guestData, Array.isArray(userData) ? userData : []);

    localStorage.setItem(userKey, JSON.stringify(merged));
    localStorage.removeItem(guestKey);
  } catch {
    // 静默失败
  }
}

export function initSyncOnLogin(): void {
  if (initialized) return;
  initialized = true;

  useAuthStore.subscribe((state, prevState) => {
    // 刚登录（从未认证变为已认证）
    if (!prevState.isAuthenticated && state.isAuthenticated) {
      // 0. 先迁移 guest 数据到用户 key 下
      migrateGuestData();

      // 1. 同步浏览历史和搜索历史
      Promise.all([syncToServer(), syncSearchHistoryToServer()])
        .then(() =>
          Promise.all([syncFromServer(), syncSearchHistoryFromServer()]),
        )
        .catch(() => {});

      // 2. 从服务端恢复偏好设置
      restorePreferencesFromServer();
    }
  });
}

async function restorePreferencesFromServer(): Promise<void> {
  try {
    const profile = await get<{
      preferredCurrency?: string;
      preferredPlatform?: string;
    }>('/auth/me');

    if (
      profile.preferredCurrency &&
      SUPPORTED_CURRENCIES.includes(profile.preferredCurrency as CurrencyCode)
    ) {
      const currentCurrency = useCurrencyStore.getState().currency;
      if (currentCurrency !== profile.preferredCurrency) {
        useCurrencyStore.setState({ currency: profile.preferredCurrency as CurrencyCode });
      }
    }

    if (profile.preferredPlatform) {
      const currentPlatform = usePlatformStore.getState().platformKey;
      if (currentPlatform !== profile.preferredPlatform) {
        usePlatformStore.setState({ platformKey: profile.preferredPlatform });
      }
    }
  } catch {
    // 静默失败
  }
}
