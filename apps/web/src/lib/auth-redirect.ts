const AUTH_REDIRECT_STORAGE_KEY = 'auth_redirect_after_login';

const BLOCKED_AUTH_REDIRECTS = [
  '/login',
  '/register',
  '/forgot-password',
  '/auth/callback',
] as const;

export function buildAuthRedirectPath(
  pathname: string,
  searchParams?: { toString(): string } | null,
): string {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getSafeRedirectPath(
  redirectPath: string | null | undefined,
  fallback = '/',
): string {
  if (!redirectPath || !redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
    return fallback;
  }

  if (
    BLOCKED_AUTH_REDIRECTS.some(
      (blockedPath) =>
        redirectPath === blockedPath || redirectPath.startsWith(`${blockedPath}?`),
    )
  ) {
    return fallback;
  }

  return redirectPath;
}

export function buildLoginHref(redirectPath: string): string {
  const safeRedirectPath = getSafeRedirectPath(redirectPath, '/');
  if (safeRedirectPath === '/') {
    return '/login';
  }

  return `/login?redirect=${encodeURIComponent(safeRedirectPath)}`;
}

export function persistAuthRedirect(
  redirectPath: string,
  fallback = '/',
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    AUTH_REDIRECT_STORAGE_KEY,
    getSafeRedirectPath(redirectPath, fallback),
  );
}

export function consumeAuthRedirect(fallback = '/'): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const redirectPath = window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return getSafeRedirectPath(redirectPath, fallback);
}

export function clearPersistedAuthRedirect(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}
