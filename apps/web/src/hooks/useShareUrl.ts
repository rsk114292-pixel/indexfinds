import useSWR from 'swr';
import { useAuthStore } from '@/stores/useAuthStore';
import { fetcher } from '@/lib/api';
import { generateShareUrl } from '@/lib/referral';

function isReferralWrappedUrl(url: URL): boolean {
  return url.pathname.startsWith('/r/') || url.searchParams.has('ref');
}

/**
 * 根据登录状态返回分享 URL：
 * - 已登录且为站内页面 → /r/{code}?redirect={目标页面}（统一走推荐归因入口）
 * - 已登录但已是推荐链接 / 外链 → 保持原值
 * - 未登录 → 目标页面原始 URL
 *
 * 使用 SWR 缓存：同 key 去重 + 5 分钟内不重复请求
 */
export function useShareUrl(targetUrl?: string | null): string | null {
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const canFetchReferralCode = _hasHydrated && isAuthenticated && !!token;

  const { data } = useSWR<{ code: string }>(
    canFetchReferralCode ? '/referral/my-code' : null,
    fetcher,
    { dedupingInterval: 300_000 },
  );

  if (typeof window === 'undefined') return null;

  const rawUrl = targetUrl || window.location.href;

  try {
    const resolvedUrl = new URL(rawUrl, window.location.origin);

    if (!data?.code) {
      return resolvedUrl.toString();
    }

    if (resolvedUrl.origin !== window.location.origin || isReferralWrappedUrl(resolvedUrl)) {
      return resolvedUrl.toString();
    }

    const redirect = `${resolvedUrl.pathname}${resolvedUrl.search}`;
    return generateShareUrl(data.code, redirect);
  } catch {
    return rawUrl;
  }

}
