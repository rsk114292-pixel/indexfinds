/**
 * API 基础封装
 * 统一的请求处理、错误处理、认证
 */

import { ApiError, parseApiError, toApiError } from './api-error';
import { useAuthStore, type User } from '@/stores/useAuthStore';
import { API_BASE_URL, buildApiUrl } from './constants';
import { getClientTrackingHeaders } from './tracking-identity';

// Re-export for consumer convenience
export { API_BASE_URL };

// 重新导出错误相关工具
export { ApiError, getErrorMessage, toApiError } from './api-error';

/**
 * 获取存储的 token（从 Zustand store 内存中读取）
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

/**
 * 从当前 URL 中提取 locale 前缀，构建带 locale 的登录路径
 * admin 路由跳转到 /admin/login
 */
function getLoginPath(): string {
  if (typeof window === 'undefined') return '/login';
  if (window.location.pathname.startsWith('/admin')) {
    return '/admin/login';
  }
  const locales = ['en', 'zh', 'fr', 'de', 'es', 'it', 'pt'];
  const firstSegment = window.location.pathname.split('/')[1];
  if (firstSegment && locales.includes(firstSegment)) {
    return `/${firstSegment}/login`;
  }
  return '/login';
}

/**
 * 解码 JWT payload（不验证签名，仅读取过期时间）
 */
function decodeTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

/**
 * 检查 token 是否即将过期（剩余不足 5 分钟）
 */
function isTokenExpiringSoon(token: string, bufferMs = 5 * 60 * 1000): boolean {
  const exp = decodeTokenExp(token);
  if (!exp) return true;
  return exp * 1000 - Date.now() < bufferMs;
}

/**
 * 确保 token 有效（用于长时间操作前调用）
 * 如果 token 即将过期，先刷新再返回
 */
export async function ensureFreshToken(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  if (isTokenExpiringSoon(token)) {
    await performTokenRefresh();
  }
}

function resolveApiUrl(url: string): string {
  return buildApiUrl(url);
}

/**
 * 构建请求头
 * @param isFormData 为 true 时不设 Content-Type，让浏览器自动设置 multipart boundary
 */
function buildHeaders(options?: {
  includeAuth?: boolean;
  isFormData?: boolean;
  method?: string;
}): HeadersInit {
  const headers: Record<string, string> = {};
  const method = options?.method?.toUpperCase() || 'GET';

  if (!options?.isFormData && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  if (options?.includeAuth !== false) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  Object.assign(headers, getClientTrackingHeaders());

  return headers;
}

/**
 * 全局唯一的 Token 刷新锁
 * 所有刷新机制（401 拦截器、useTokenRefresh、useTokenRecovery）必须通过此函数，
 * 确保同一时刻只有一个 refresh 请求发出，避免 refresh token rotation 竞态导致 token theft 误判。
 */
let refreshPromise: Promise<{ accessToken: string; user?: User } | null> | null = null;

export async function performTokenRefresh(): Promise<{ accessToken: string; user?: User } | null> {
  if (refreshPromise) return refreshPromise;
  const refreshUrl = resolveApiUrl('/auth/refresh');

  refreshPromise = (async () => {
    let retried = false;
    try {
      let response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // 429 限流：等待后重试一次
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '3', 10);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        response = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        retried = true;
      }

      if (!response.ok) {
        // 401/403 可能是多标签页竞态（另一个标签页已刷新 cookie）
        // 等待 1 秒后重试一次，此时 cookie 可能已被其他标签页更新
        if (response.status === 401 || response.status === 403) {
          if (!retried) {
            await new Promise(r => setTimeout(r, 1000));
            const retryResponse = await fetch(refreshUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              if (retryData.accessToken) {
                useAuthStore.getState().setToken(retryData.accessToken);
                return retryData;
              }
            }
          }
          // 重试后仍然 401/403 = refresh token 确实无效，需要重新登录
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            window.location.href = getLoginPath();
          }
        }
        // 其他错误（500、网络问题等）= 临时问题，不登出
        return null;
      }
      const data = await response.json();
      if (data.accessToken) {
        useAuthStore.getState().setToken(data.accessToken);
        return data;
      }
      return null;
    } catch {
      // 网络错误，不登出，保持现有状态
      return null;
    }
  })().finally(() => {
    // 保持锁 2 秒，防止刚刚刷新完又立即触发刷新
    setTimeout(() => { refreshPromise = null; }, 2000);
  });

  return refreshPromise;
}

async function request<T>(
  url: string,
  options: RequestInit & { includeAuth?: boolean; _retry?: boolean } = {}
): Promise<T> {
  const { includeAuth, _retry, ...fetchOptions } = options;
  const fullUrl = resolveApiUrl(url);
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  const method = fetchOptions.method || 'GET';

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      credentials: 'include',
      headers: {
        ...buildHeaders({ includeAuth, isFormData, method }),
        ...(isFormData ? {} : fetchOptions.headers),
      },
    });

    if (!response.ok) {
      // 401 且非重试：尝试刷新一次 token
      if (response.status === 401 && !_retry && !fullUrl.includes('/auth/')) {
        const result = await performTokenRefresh();
        if (result?.accessToken) {
          return request<T>(url, { ...options, _retry: true });
        }
        // 仅在确定性认证失败时登出（refresh token 无效/过期）
        // 网络错误等临时问题不应强制登出
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          // performTokenRefresh 返回 null 可能是网络问题，不立即登出
          // 让用户下次操作时再试
          console.warn('[Auth] Token refresh failed, will retry on next request');
        }
      }

      throw await parseApiError(response);
    }

    // 204 No Content 或空 body — 用于 POST/PUT/DELETE 等无返回值场景
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw toApiError(error);
  }
}

/** 导出 request 供 auth-api.ts 内部使用（FormData 上传等特殊场景） */
export { request };

/**
 * 基础 fetcher 函数（用于 SWR）
 */
export async function fetcher<T>(url: string): Promise<T> {
  return request<T>(url);
}

/**
 * 带参数的 GET 请求
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  options?: { includeAuth?: boolean; signal?: AbortSignal }
): Promise<T> {
  const baseOrigin =
    typeof window !== 'undefined' ? window.location.origin : API_BASE_URL;
  const url = new URL(resolveApiUrl(endpoint), baseOrigin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            url.searchParams.append(key, value.join(','));
          }
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
  }

  return request<T>(url.toString(), { method: 'GET', ...options });
}

/**
 * POST 请求
 */
export async function post<T>(
  endpoint: string,
  body?: unknown,
  options?: { includeAuth?: boolean }
): Promise<T> {
  return request<T>(resolveApiUrl(endpoint), {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
}

/**
 * PUT 请求
 */
export async function put<T>(
  endpoint: string,
  body?: unknown,
  options?: { includeAuth?: boolean }
): Promise<T> {
  return request<T>(resolveApiUrl(endpoint), {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
}

/**
 * PATCH 请求
 */
export async function patch<T>(
  endpoint: string,
  body?: unknown,
  options?: { includeAuth?: boolean }
): Promise<T> {
  return request<T>(resolveApiUrl(endpoint), {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
}

/**
 * DELETE 请求
 */
export async function del<T>(
  endpoint: string,
  options?: { includeAuth?: boolean }
): Promise<T> {
  return request<T>(resolveApiUrl(endpoint), {
    method: 'DELETE',
    ...options,
  });
}
