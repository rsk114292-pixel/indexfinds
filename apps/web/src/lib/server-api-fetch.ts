import { API_BASE_URL } from "@/lib/constants";

type NextFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
  /** Hard deadline for the upstream request. */
  timeoutMs?: number;
  /** Maximum age of the last successful response used when upstream fails. */
  staleIfErrorMs?: number;
  /** Number of extra attempts for transient upstream failures. */
  retryCount?: number;
  /** Surface non-404 upstream failures to the nearest route error boundary. */
  throwOnError?: boolean;
};

interface FallbackCacheEntry {
  storedAt: number;
  value: unknown;
}

const DEFAULT_TIMEOUT_MS = 4_500;
const DEFAULT_STALE_IF_ERROR_MS = 15 * 60 * 1000;
const MAX_FALLBACK_ENTRIES = 120;
const INTERNAL_API_HEADER = "x-indexfinds-internal-token";

const fallbackCache = (() => {
  const sharedGlobal = globalThis as typeof globalThis & {
    __indexfindsServerApiFallbackCache?: Map<string, FallbackCacheEntry>;
  };
  sharedGlobal.__indexfindsServerApiFallbackCache ??= new Map();
  return sharedGlobal.__indexfindsServerApiFallbackCache;
})();

function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function isLocalApiUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function shouldSkipServerApiFetch(input: string) {
  const url = input.startsWith("http") ? input : `${API_BASE_URL}${input}`;
  return isBuildPhase() && isLocalApiUrl(url);
}

export function buildServerTrackingHeaders(input?: {
  trustedVisitorId?: string;
  sessionId?: string;
  visitId?: string;
}): HeadersInit {
  const headers: Record<string, string> = {};
  const cookieParts = [
    input?.trustedVisitorId ? `mf_vid=${input.trustedVisitorId}` : null,
    input?.sessionId ? `session_id=${input.sessionId}` : null,
    input?.visitId ? `mf_visit=${input.visitId}` : null,
  ].filter(Boolean);

  if (cookieParts.length > 0) {
    headers.cookie = cookieParts.join("; ");
  }

  if (input?.visitId) {
    headers["x-visit-id"] = input.visitId;
  }

  return headers;
}

function canUseSharedFallback(url: string, init: RequestInit) {
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" || init.cache === "no-store") return false;

  const headerNames = new Set<string>();
  const headers = init.headers;
  if (Array.isArray(headers)) {
    headers.forEach(([name]) => headerNames.add(name.toLowerCase()));
  } else if (headers && typeof (headers as Headers).forEach === "function") {
    (headers as Headers).forEach((_value, name) =>
      headerNames.add(name.toLowerCase()),
    );
  } else if (headers) {
    Object.keys(headers).forEach((name) => headerNames.add(name.toLowerCase()));
  }

  return (
    !["authorization", "cookie", "x-visit-id", "x-api-key"].some((name) =>
      headerNames.has(name),
    ) && url.startsWith(API_BASE_URL)
  );
}

function withInternalApiToken(
  url: string,
  headersInit: HeadersInit | undefined,
): HeadersInit | undefined {
  const token = process.env.INDEXFINDS_INTERNAL_API_TOKEN?.trim();
  if (!token) return headersInit;

  try {
    if (new URL(url).origin !== new URL(API_BASE_URL).origin)
      return headersInit;
  } catch {
    return headersInit;
  }

  const headers = new Headers(headersInit);
  headers.set(INTERNAL_API_HEADER, token);
  return headers;
}

function readFallback<T>(key: string, maxAgeMs: number): T | null {
  const entry = fallbackCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > maxAgeMs) {
    fallbackCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function writeFallback(key: string, value: unknown) {
  fallbackCache.delete(key);
  fallbackCache.set(key, { storedAt: Date.now(), value });

  while (fallbackCache.size > MAX_FALLBACK_ENTRIES) {
    const oldestKey = fallbackCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    fallbackCache.delete(oldestKey);
  }
}

function createDeadlineSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const abortFromUpstream = () => controller.abort(signal?.reason);

  if (signal?.aborted) {
    abortFromUpstream();
  } else {
    signal?.addEventListener("abort", abortFromUpstream, { once: true });
  }

  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("Upstream request timed out", "TimeoutError"),
      ),
    Math.max(1, timeoutMs),
  );

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abortFromUpstream);
    },
  };
}

export function __resetServerApiFallbackCacheForTests() {
  fallbackCache.clear();
}

export async function fetchServerApiJson<T>(
  input: string,
  init?: NextFetchOptions,
): Promise<T | null> {
  const url = input.startsWith("http") ? input : `${API_BASE_URL}${input}`;

  if (shouldSkipServerApiFetch(url)) {
    return null;
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    staleIfErrorMs = DEFAULT_STALE_IF_ERROR_MS,
    retryCount = 0,
    throwOnError = false,
    ...requestInit
  } = init || {};
  const fallbackEnabled =
    staleIfErrorMs > 0 && canUseSharedFallback(url, requestInit);

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const deadline = createDeadlineSignal(requestInit.signal, timeoutMs);

    try {
      const response = await fetch(url, {
        ...requestInit,
        headers: withInternalApiToken(url, requestInit.headers),
        signal: deadline.signal,
      });

      if (response.ok) {
        const value = (await response.json()) as T;
        if (fallbackEnabled) writeFallback(url, value);
        return value;
      }

      const fallback = fallbackEnabled
        ? readFallback<T>(url, staleIfErrorMs)
        : null;
      if (fallback !== null) return fallback;

      const isMissing = response.status === 404 || response.status === 410;
      if (isMissing) return null;
      if (attempt < retryCount && response.status >= 500) continue;
      if (throwOnError) {
        throw new Error(
          `Upstream request failed with status ${response.status}`,
        );
      }
      return null;
    } catch (error) {
      const fallback = fallbackEnabled
        ? readFallback<T>(url, staleIfErrorMs)
        : null;
      if (fallback !== null) return fallback;
      if (attempt < retryCount) continue;
      if (throwOnError) throw error;
      return null;
    } finally {
      deadline.cleanup();
    }
  }

  return null;
}
