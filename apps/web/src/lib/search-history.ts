/**
 * 搜索历史管理工具
 * 数据存储在 localStorage，按用户 ID 隔离
 * 已登录用户会异步同步到服务端，实现跨设备同步
 */

import { getCurrentUserId } from './user-storage';
import { useAuthStore } from '@/stores/useAuthStore';
import { post, del, get as apiGet, request } from './api';

const STORAGE_KEY_PREFIX = 'search_history';
const MAX_SEARCH_HISTORY = 10;

function getStorageKey(): string {
  return `${STORAGE_KEY_PREFIX}_${getCurrentUserId()}`;
}

/**
 * 读取搜索历史
 */
export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = localStorage.getItem(getStorageKey());
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q: unknown) => typeof q === 'string' && q.length > 0 && q.length < 200)
      .slice(0, MAX_SEARCH_HISTORY);
  } catch {
    return [];
  }
}

/**
 * 保存搜索词到历史（最新的排最前，去重）
 * 已登录用户异步同步到服务端
 */
export function saveSearchHistory(query: string): string[] {
  if (typeof window === 'undefined') return [];

  const history = getSearchHistory();
  const newHistory = [query, ...history.filter((q) => q !== query)].slice(0, MAX_SEARCH_HISTORY);
  localStorage.setItem(getStorageKey(), JSON.stringify(newHistory));

  // 异步同步到服务端
  syncSearchToServer(query);

  return newHistory;
}

/**
 * 删除单条搜索历史
 */
export function removeSearchHistoryItem(query: string): string[] {
  if (typeof window === 'undefined') return [];

  const history = getSearchHistory();
  const newHistory = history.filter((q) => q !== query);
  localStorage.setItem(getStorageKey(), JSON.stringify(newHistory));

  // 异步从服务端删除
  removeSearchFromServer(query);

  return newHistory;
}

/**
 * 清空搜索历史
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getStorageKey());

  // 异步清除服务端
  clearServerSearchHistory();
}

/**
 * 从服务端拉取搜索历史并合并到本地
 */
export async function syncSearchHistoryFromServer(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  if (!isLoggedIn()) return getSearchHistory();

  try {
    const result = await apiGet<{ data: string[] }>(
      '/users/search-history',
      { limit: MAX_SEARCH_HISTORY },
    );

    const data = result?.data;
    if (!Array.isArray(data) || data.length === 0) return getSearchHistory();

    const localHistory = getSearchHistory();
    const serverSet = new Set(data);
    const localOnly = localHistory.filter((q) => !serverSet.has(q));
    const merged = [...data, ...localOnly].slice(0, MAX_SEARCH_HISTORY);

    localStorage.setItem(getStorageKey(), JSON.stringify(merged));
    return merged;
  } catch {
    return getSearchHistory();
  }
}

/**
 * 将本地搜索历史上传到服务端
 */
export async function syncSearchHistoryToServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isLoggedIn()) return;

  const history = getSearchHistory();
  if (history.length === 0) return;

  try {
    await post('/users/search-history/sync', { items: history });
  } catch (err) {
    console.warn('[SearchHistory] syncSearchHistoryToServer failed:', (err as Error)?.message || err);
  }
}

// ============ 内部工具 ============

function isLoggedIn(): boolean {
  return !!useAuthStore.getState().isAuthenticated;
}

function syncSearchToServer(query: string): void {
  if (!isLoggedIn()) return;
  post('/users/search-history', { query }).catch((err) => {
    console.warn('[SearchHistory] syncSearchToServer failed:', err?.message || err);
  });
}

function removeSearchFromServer(query: string): void {
  if (!isLoggedIn()) return;
  request('/users/search-history/item', {
    method: 'DELETE',
    body: JSON.stringify({ query }),
  }).catch(() => {});
}

function clearServerSearchHistory(): void {
  if (!isLoggedIn()) return;
  del('/users/search-history').catch(() => {});
}
