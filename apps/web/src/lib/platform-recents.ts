const RECENT_PLATFORM_STORAGE_KEY = 'indexfinds_recent_platforms';
const MAX_RECENT_PLATFORMS = 6;

export function readRecentPlatformKeys(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(RECENT_PLATFORM_STORAGE_KEY) || '[]',
    );
    return Array.isArray(stored)
      ? stored.filter((key): key is string => typeof key === 'string')
      : [];
  } catch {
    return [];
  }
}

export function rememberRecentPlatform(key: string): string[] {
  const next = [
    key,
    ...readRecentPlatformKeys().filter((storedKey) => storedKey !== key),
  ].slice(0, MAX_RECENT_PLATFORMS);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      RECENT_PLATFORM_STORAGE_KEY,
      JSON.stringify(next),
    );
  }

  return next;
}
