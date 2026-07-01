interface SessionCacheEnvelope<T> {
  timestamp: number;
  value: T;
}

export function readSessionCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SessionCacheEnvelope<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > maxAgeMs) return null;

    return parsed.value;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: SessionCacheEnvelope<T> = {
      timestamp: Date.now(),
      value,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / serialization failures for non-critical admin caches.
  }
}
