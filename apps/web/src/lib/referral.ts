import { appendReferralInviteUTMParams, type ShareChannel } from './utm';

// 推荐码相关工具函数


/**
 * 生成分享链接
 */
export function generateShareUrl(code: string, redirect?: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  let url = `${baseUrl}/r/${code}`;
  if (redirect) {
    url += `?redirect=${encodeURIComponent(redirect)}`;
  }
  return url;
}

/**
 * 生成带推荐邀请 UTM 的分享链接
 */
export function generateTrackedShareUrl(
  code: string,
  redirect?: string,
  channel?: ShareChannel,
): string {
  return appendReferralInviteUTMParams(generateShareUrl(code, redirect), channel);
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

const SESSION_COOKIE_NAME = 'session_id';
const VISIT_COOKIE_NAME = 'mf_visit';
const VISIT_META_STORAGE_KEY = 'visit_meta_v1';
const VISIT_TIMEOUT_MS = 30 * 60 * 1000;
const VISIT_COOKIE_MAX_AGE_SEC = 24 * 60 * 60;

interface VisitMeta {
  id: string;
  lastTouchedAt: number;
  campaignKey: string;
  browserContext: string;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

/**
 * 获取或创建 Session ID
 * 优先级: Cookie > localStorage > 新建
 * 新建后同时写入 Cookie（主存储）+ localStorage（fallback）
 */
export function getOrCreateSessionId(): string {
  const isBrowser = typeof document !== 'undefined';
  const hasStorage = typeof localStorage !== 'undefined';

  // 1. 优先读 Cookie（服务端 route.ts 也能通过请求 Cookie 读到同一个值）
  const fromCookie = isBrowser ? getCookie(SESSION_COOKIE_NAME) : null;
  if (fromCookie) {
    // 同步到 localStorage 作为 fallback
    if (hasStorage) localStorage.setItem(SESSION_COOKIE_NAME, fromCookie);
    return fromCookie;
  }

  // 2. Cookie 没有，查 localStorage
  if (hasStorage) {
    const fromStorage = localStorage.getItem(SESSION_COOKIE_NAME);
    if (fromStorage) {
      // 回写 Cookie（可能是之前 Cookie 过期或被清除）
      setCookie(SESSION_COOKIE_NAME, fromStorage, 365 * 24 * 60 * 60);
      return fromStorage;
    }
  }

  // 3. 都没有，新建
  const sessionId = 'sess_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  if (isBrowser) setCookie(SESSION_COOKIE_NAME, sessionId, 365 * 24 * 60 * 60);
  if (hasStorage) localStorage.setItem(SESSION_COOKIE_NAME, sessionId);
  return sessionId;
}

function createVisitId(): string {
  return 'visit_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

function readVisitMeta(): VisitMeta | null {
  if (!canUseSessionStorage()) return null;

  const raw = sessionStorage.getItem(VISIT_META_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as VisitMeta;
  } catch {
    return null;
  }
}

function writeVisitMeta(meta: VisitMeta): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(VISIT_META_STORAGE_KEY, JSON.stringify(meta));
}

export function getOrCreateDeviceId(): string {
  return getOrCreateSessionId();
}

export function getOrCreateVisitId(options?: {
  campaignKey?: string;
  browserContext?: string;
}): string {
  const now = Date.now();
  const campaignKey = options?.campaignKey || '';
  const browserContext = options?.browserContext || 'standard_browser';
  const existing = readVisitMeta();
  const cookieVisitId = getCookie(VISIT_COOKIE_NAME);
  const hydratedExisting =
    existing ||
    (cookieVisitId
      ? {
          id: cookieVisitId,
          lastTouchedAt: now,
          campaignKey,
          browserContext,
        }
      : null);

  const shouldRotate =
    !hydratedExisting ||
    now - hydratedExisting.lastTouchedAt > VISIT_TIMEOUT_MS ||
    hydratedExisting.campaignKey !== campaignKey ||
    hydratedExisting.browserContext !== browserContext;

  const nextMeta: VisitMeta = shouldRotate
    ? {
        id: createVisitId(),
        lastTouchedAt: now,
        campaignKey,
        browserContext,
      }
    : {
        ...hydratedExisting,
        lastTouchedAt: now,
      };

  writeVisitMeta(nextMeta);
  setCookie(VISIT_COOKIE_NAME, nextMeta.id, VISIT_COOKIE_MAX_AGE_SEC);
  return nextMeta.id;
}
