/**
 * 搜索追踪工具
 * 用于记录搜索曝光、点击和外跳
 *
 * 漏斗：搜索 → 曝光 → 点击(进入商品页) → 外跳(点击购买按钮)
 * 注意："外跳"不等于"购买"，我们无法追踪用户在代购平台的实际下单行为
 */
import { useAuthStore } from '@/stores/useAuthStore';
import { getCurrentTrackingIdentity } from '@/lib/tracking-identity';
import { buildApiUrl } from '@/lib/constants';

/**
 * 外跳来源类型
 */
export enum OutboundSource {
  SEARCH = 'search', // 搜索结果页
  IMAGE_SEARCH = 'image_search', // 图搜结果
  HOME = 'home', // 首页
  CATEGORY = 'category', // 分类页
  RECOMMENDATION = 'recommendation', // 相关推荐
  DIRECT = 'direct', // 直接访问
}

export enum OutboundPageType {
  HOME = 'home',
  SEARCH = 'search',
  PRODUCT = 'product',
  CATEGORY = 'category',
  BRAND = 'brand',
  PLATFORM_LANDING = 'platform_landing',
  OTHER = 'other',
}

export enum OutboundViewportDeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

export { getCurrentTrackingIdentity };

/**
 * 记录搜索曝光（批量）
 * 在搜索结果渲染后调用
 */
export async function recordImpressions(
  searchLogId: string,
  impressions: Array<{ productId: string; position: number }>,
  page: number = 1
): Promise<void> {
  if (!searchLogId || impressions.length === 0) return;

  try {
    await fetch(buildApiUrl('/search/tracking/impressions'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchLogId, impressions, page }),
    });
  } catch {
    // 静默失败 — 追踪不应影响用户体验
  }
}

/**
 * 记录搜索点击
 * 在用户点击商品（进入商品详情页）时调用
 * 同时将 clickId 存储到 sessionStorage 以便后续标记外跳
 */
export async function recordSearchClick(params: {
  searchLogId: string;
  query: string;
  productId: string;
  position: number;
  page?: number;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  visitId?: string;
}): Promise<string | null> {
  if (!params.searchLogId || !params.productId) return null;

  try {
    const response = await fetch(buildApiUrl('/search/tracking/click'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        page: params.page || 1,
        deviceId: params.deviceId || params.sessionId || undefined,
        visitId: params.visitId || params.sessionId || undefined,
      }),
    });
    const data = await response.json();
    const clickId = data.clickId || null;

    // 存储 clickId 到 sessionStorage，关联商品 ID
    if (clickId && typeof window !== 'undefined') {
      const key = `search_click_${params.productId}`;
      sessionStorage.setItem(key, clickId);
      sessionStorage.setItem(`search_query_${params.productId}`, params.query);
    }

    return clickId;
  } catch {
    return null;
  }
}

/**
 * 获取某个商品的搜索点击 ID
 * 用于在外跳时关联搜索点击
 */
export function getSearchClickId(productId: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = `search_click_${productId}`;
  return sessionStorage.getItem(key);
}

/**
 * 清除某个商品的搜索点击 ID
 */
export function clearSearchClickId(productId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`search_click_${productId}`);
  sessionStorage.removeItem(`search_query_${productId}`);
}

export function getSearchClickQuery(productId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(`search_query_${productId}`);
}

/**
 * 标记外跳（API 字段名为 conversion，实际含义是外跳到代购平台）
 * 在用户点击"立即购买"跳转到代购平台时调用
 * 注意：这不代表用户真正购买了商品
 */
export async function markOutbound(searchClickId: string): Promise<void> {
  if (!searchClickId) return;

  try {
    await fetch(buildApiUrl('/search/tracking/conversion'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchClickId }),
    });
  } catch {
    // 静默失败
  }
}

/**
 * 记录外跳点击（独立于搜索追踪）
 * 统计所有来源的外跳行为，用于业务总览
 */
export async function recordOutboundClick(params: {
  productId: string;
  platformType: string;
  platformUrl?: string;
  source?: OutboundSource;
  searchClickId?: string;
  pageType?: OutboundPageType;
  pagePath?: string;
  query?: string;
  buttonVariant?: string;
  locale?: string;
  viewportDeviceType?: OutboundViewportDeviceType;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  visitId?: string;
}): Promise<string | null> {
  if (!params.productId || !params.platformType) return null;

  try {
    const token =
      typeof window !== 'undefined' ? useAuthStore.getState().token : null;
    const response = await fetch(buildApiUrl('/outbound/click'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...params,
        source: params.source || OutboundSource.DIRECT,
        deviceId: params.deviceId || params.sessionId || undefined,
        visitId: params.visitId || params.sessionId || undefined,
      }),
    });
    const data = await response.json();
    return data.outboundId || null;
  } catch {
    return null;
  }
}

/**
 * 存储当前页面的来源
 */
export function setPageSource(source: OutboundSource): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('page_source', source);
}

/**
 * 获取当前页面的来源
 */
export function getPageSource(): OutboundSource {
  if (typeof window === 'undefined') return OutboundSource.DIRECT;
  const source = sessionStorage.getItem('page_source');
  return (source as OutboundSource) || OutboundSource.DIRECT;
}

export function detectOutboundPageType(pathname: string): OutboundPageType {
  if (pathname === '/' || /^\/[a-z]{2}$/.test(pathname)) {
    return OutboundPageType.HOME;
  }
  if (pathname.includes('/search')) {
    return OutboundPageType.SEARCH;
  }
  if (pathname.includes('/products/')) {
    return OutboundPageType.PRODUCT;
  }
  if (pathname.includes('/categories/')) {
    return OutboundPageType.CATEGORY;
  }
  if (pathname.includes('/brands/')) {
    return OutboundPageType.BRAND;
  }
  if (/\/[a-z]{2}\/[a-z0-9-]+-spreadsheet$/.test(pathname)) {
    return OutboundPageType.PLATFORM_LANDING;
  }
  return OutboundPageType.OTHER;
}

export function detectOutboundViewportDeviceType(): OutboundViewportDeviceType {
  if (typeof window === 'undefined') return OutboundViewportDeviceType.UNKNOWN;
  const width = window.innerWidth;
  if (width <= 767) return OutboundViewportDeviceType.MOBILE;
  if (width <= 1024) return OutboundViewportDeviceType.TABLET;
  return OutboundViewportDeviceType.DESKTOP;
}

export function detectLocaleFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/i);
  return match?.[1] || null;
}
