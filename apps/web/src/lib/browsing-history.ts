/**
 * 浏览历史管理工具
 * 用于记录用户浏览的商品，支持个性化搜索
 *
 * 数据存储在 localStorage，默认保留 50 条记录，用户可配置到 100 条
 * 已登录用户使用用户 ID 作为 key 后缀，实现用户隔离
 * 未登录用户使用 guest 作为 key 后缀
 *
 * 已登录用户会异步同步到服务端，实现跨设备同步
 */

import { getCurrentUserId } from './user-storage';
import { useAuthStore } from '@/stores/useAuthStore';
import { post, del, get as apiGet } from './api';

const STORAGE_KEY_PREFIX = "browsing_history";
const SETTINGS_KEY = "browsing_history_settings";
const DEFAULT_HISTORY_SIZE = 50;
const MAX_HISTORY_SIZE = 100;

/**
 * 获取当前用户的存储 key
 */
function getStorageKey(): string {
  return `${STORAGE_KEY_PREFIX}_${getCurrentUserId()}`;
}

/**
 * 获取用户配置的历史记录数量上限
 */
export function getHistoryMaxSize(): number {
  if (typeof window === "undefined") return DEFAULT_HISTORY_SIZE;

  try {
    const settings = localStorage.getItem(SETTINGS_KEY);
    if (!settings) return DEFAULT_HISTORY_SIZE;

    const parsed = JSON.parse(settings);
    const size = parsed?.maxSize;
    if (typeof size === "number" && size >= DEFAULT_HISTORY_SIZE && size <= MAX_HISTORY_SIZE) {
      return size;
    }
    return DEFAULT_HISTORY_SIZE;
  } catch {
    return DEFAULT_HISTORY_SIZE;
  }
}

/**
 * 设置历史记录数量上限（50-100）
 */
export function setHistoryMaxSize(size: number): void {
  if (typeof window === "undefined") return;

  const validSize = Math.max(DEFAULT_HISTORY_SIZE, Math.min(MAX_HISTORY_SIZE, size));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ maxSize: validSize }));
}

/**
 * 浏览记录条目
 */
export interface BrowsingHistoryItem {
  productId: string;
  brandId?: string;
  brandSlug?: string;
  categoryId?: string;
  categorySlug?: string;
  viewedAt: number; // timestamp
}

/**
 * 用户偏好统计
 */
export interface UserPreferences {
  /** 偏好品牌 ID 列表（按频率排序，最多5个） */
  preferredBrandIds: string[];
  /** 偏好品牌 Slug 列表 */
  preferredBrandSlugs: string[];
  /** 偏好分类 ID 列表（按频率排序，最多5个） */
  preferredCategoryIds: string[];
  /** 偏好分类 Slug 列表 */
  preferredCategorySlugs: string[];
  /** 历史记录数量 */
  historyCount: number;
}

/**
 * 获取浏览历史
 */
export function getBrowsingHistory(): BrowsingHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(getStorageKey());
    if (!data) return [];
    return JSON.parse(data) as BrowsingHistoryItem[];
  } catch {
    return [];
  }
}

/**
 * 记录商品浏览
 * 如果商品已存在，更新时间戳并移到最前
 * 已登录用户会异步同步到服务端
 */
export function recordProductView(
  item: Omit<BrowsingHistoryItem, "viewedAt">,
): void {
  if (typeof window === "undefined") return;
  if (!item.productId) return;

  try {
    const history = getBrowsingHistory();

    // 移除已存在的相同商品
    const filtered = history.filter((h) => h.productId !== item.productId);

    // 添加到最前面
    const newItem: BrowsingHistoryItem = {
      ...item,
      viewedAt: Date.now(),
    };
    filtered.unshift(newItem);

    // 限制数量（使用用户配置的上限）
    const maxSize = getHistoryMaxSize();
    const trimmed = filtered.slice(0, maxSize);

    localStorage.setItem(getStorageKey(), JSON.stringify(trimmed));

    // 异步同步到服务端（fire-and-forget）
    syncViewToServer({
      productId: item.productId,
      brandId: item.brandId,
      categoryId: item.categoryId,
    });
  } catch {
    // 静默失败 — localStorage 写入异常不应影响用户体验
  }
}

/**
 * 计算用户偏好
 * 基于浏览历史统计品牌和分类偏好
 */
export function getUserPreferences(): UserPreferences {
  const history = getBrowsingHistory();

  if (history.length === 0) {
    return {
      preferredBrandIds: [],
      preferredBrandSlugs: [],
      preferredCategoryIds: [],
      preferredCategorySlugs: [],
      historyCount: 0,
    };
  }

  // 统计品牌频率
  const brandIdCounts = new Map<string, number>();
  const brandSlugMap = new Map<string, string>(); // id -> slug

  // 统计分类频率
  const categoryIdCounts = new Map<string, number>();
  const categorySlugMap = new Map<string, string>(); // id -> slug

  for (const item of history) {
    if (item.brandId) {
      brandIdCounts.set(
        item.brandId,
        (brandIdCounts.get(item.brandId) || 0) + 1,
      );
      if (item.brandSlug) {
        brandSlugMap.set(item.brandId, item.brandSlug);
      }
    }

    if (item.categoryId) {
      categoryIdCounts.set(
        item.categoryId,
        (categoryIdCounts.get(item.categoryId) || 0) + 1,
      );
      if (item.categorySlug) {
        categorySlugMap.set(item.categoryId, item.categorySlug);
      }
    }
  }

  // 按频率排序，取前5个
  const topBrandIds = [...brandIdCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topCategoryIds = [...categoryIdCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  return {
    preferredBrandIds: topBrandIds,
    preferredBrandSlugs: topBrandIds
      .map((id) => brandSlugMap.get(id) || "")
      .filter(Boolean),
    preferredCategoryIds: topCategoryIds,
    preferredCategorySlugs: topCategoryIds
      .map((id) => categorySlugMap.get(id) || "")
      .filter(Boolean),
    historyCount: history.length,
  };
}

/**
 * 获取搜索请求的偏好参数
 * 用于传递给后端 API
 */
export function getSearchPreferenceParams(): {
  preferredBrands?: string;
  preferredCategories?: string;
} {
  const prefs = getUserPreferences();

  const params: { preferredBrands?: string; preferredCategories?: string } = {};

  if (prefs.preferredBrandIds.length > 0) {
    params.preferredBrands = prefs.preferredBrandIds.join(",");
  }

  if (prefs.preferredCategoryIds.length > 0) {
    params.preferredCategories = prefs.preferredCategoryIds.join(",");
  }

  return params;
}

/**
 * 清除浏览历史
 * 已登录用户同时清除服务端数据
 */
export function clearBrowsingHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey());

  // 异步清除服务端历史
  clearServerHistory();
}

/**
 * 清理已失效的浏览记录（商品已下架/删除）
 * 只保留 activeIds 中存在的记录
 */
export function pruneInactiveHistory(activeIds: string[]): BrowsingHistoryItem[] {
  if (typeof window === "undefined") return [];

  const history = getBrowsingHistory();
  const activeSet = new Set(activeIds);
  const pruned = history.filter((item) => activeSet.has(item.productId));

  if (pruned.length !== history.length) {
    localStorage.setItem(getStorageKey(), JSON.stringify(pruned));
  }

  return pruned;
}

/**
 * 获取最近浏览的商品 ID 列表
 */
export function getRecentProductIds(limit = 10): string[] {
  return getBrowsingHistory()
    .slice(0, limit)
    .map((item) => item.productId);
}

// ============ 服务端同步工具 ============

function isLoggedIn(): boolean {
  const authState = useAuthStore.getState();
  return !!(authState._hasHydrated && authState.isAuthenticated && authState.token);
}

/**
 * 异步同步单次浏览到服务端（fire-and-forget）
 */
function syncViewToServer(data: {
  productId: string;
  brandId?: string;
  categoryId?: string;
}): void {
  if (!isLoggedIn()) return;

  post('/users/browsing-history', data).catch((err) => {
    console.warn('[BrowsingHistory] syncViewToServer failed:', err?.message || err);
  });
}

/**
 * 异步清除服务端历史
 */
function clearServerHistory(): void {
  if (!isLoggedIn()) return;

  del('/users/browsing-history').catch(() => {});
}

/**
 * 从服务端拉取浏览历史并合并到本地
 */
export async function syncFromServer(): Promise<BrowsingHistoryItem[]> {
  if (typeof window === 'undefined') return [];
  if (!isLoggedIn()) return getBrowsingHistory();

  try {
    const maxSize = getHistoryMaxSize();
    const result = await apiGet<{ data: { productId: string; brandId?: string; categoryId?: string; viewedAt: string }[] }>(
      '/users/browsing-history',
      { limit: maxSize },
    );

    const data = result?.data;
    if (!Array.isArray(data) || data.length === 0) return getBrowsingHistory();

    const localHistory = getBrowsingHistory();
    const serverItems: BrowsingHistoryItem[] = data.map((item) => ({
      productId: item.productId,
      brandId: item.brandId || undefined,
      categoryId: item.categoryId || undefined,
      viewedAt: new Date(item.viewedAt).getTime(),
    }));

    const seen = new Set(serverItems.map((i) => i.productId));
    const localOnly = localHistory.filter((i) => !seen.has(i.productId));
    const merged = [...serverItems, ...localOnly]
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, maxSize);

    localStorage.setItem(getStorageKey(), JSON.stringify(merged));
    return merged;
  } catch {
    return getBrowsingHistory();
  }
}

/**
 * 将本地历史上传到服务端（登录时调用）
 */
export async function syncToServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isLoggedIn()) return;

  const history = getBrowsingHistory();
  if (history.length === 0) return;

  try {
    await post('/users/browsing-history/sync', {
      items: history.map((item) => ({
        productId: item.productId,
        brandId: item.brandId,
        categoryId: item.categoryId,
        viewedAt: item.viewedAt,
      })),
    });
  } catch (err) {
    console.warn('[BrowsingHistory] syncToServer failed:', (err as Error)?.message || err);
  }
}
