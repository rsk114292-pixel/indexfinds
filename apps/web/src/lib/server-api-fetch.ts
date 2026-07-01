import { API_BASE_URL } from '@/lib/constants';

type NextFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

function isLocalApiUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function shouldSkipServerApiFetch(input: string) {
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`;
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
    headers.cookie = cookieParts.join('; ');
  }

  if (input?.visitId) {
    headers['x-visit-id'] = input.visitId;
  }

  return headers;
}

export async function fetchServerApiJson<T>(
  input: string,
  init?: NextFetchOptions,
): Promise<T | null> {
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input}`;

  if (shouldSkipServerApiFetch(url)) {
    return null;
  }

  try {
    const response = await fetch(url, init);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}
