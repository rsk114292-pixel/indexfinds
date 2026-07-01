const RETURN_SCROLL_PREFIX = 'return-scroll:';

function getReturnScrollKey(returnTo: string) {
  return `${RETURN_SCROLL_PREFIX}${returnTo}`;
}

interface ReturnScrollState {
  y: number;
  page?: number;
}

function parseReturnScrollState(rawValue: string | null): ReturnScrollState | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as ReturnScrollState;
    if (typeof parsed?.y === 'number' && Number.isFinite(parsed.y) && parsed.y >= 0) {
      return {
        y: parsed.y,
        page:
          typeof parsed.page === 'number' &&
          Number.isFinite(parsed.page) &&
          parsed.page > 0
            ? Math.floor(parsed.page)
            : undefined,
      };
    }
  } catch {
    const targetY = Number(rawValue);
    if (Number.isFinite(targetY) && targetY >= 0) {
      return { y: targetY };
    }
  }

  return null;
}

export function readReturnScroll(returnTo: string): ReturnScrollState | null {
  if (typeof window === 'undefined') return null;

  try {
    return parseReturnScrollState(sessionStorage.getItem(getReturnScrollKey(returnTo)));
  } catch {
    return null;
  }
}

export function clearReturnScroll(returnTo: string) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(getReturnScrollKey(returnTo));
  } catch {
    // Ignore storage failures.
  }
}

export function saveReturnScroll(
  returnTo: string,
  scrollY = window.scrollY,
  page?: number,
) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(
      getReturnScrollKey(returnTo),
      JSON.stringify({
        y: scrollY,
        page:
          typeof page === 'number' && Number.isFinite(page) && page > 0
            ? Math.floor(page)
            : undefined,
      }),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function restoreReturnScroll(returnTo: string) {
  if (typeof window === 'undefined') return false;

  const state = readReturnScroll(returnTo);
  if (!state) {
    clearReturnScroll(returnTo);
    return false;
  }
  const targetY = state.y;

  let attempts = 0;
  const maxAttempts = 12;

  const tryRestore = () => {
    const maxScrollableY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const reachedEnoughHeight = maxScrollableY >= targetY || attempts >= maxAttempts;
    const nextY = Math.min(targetY, maxScrollableY);

    if (reachedEnoughHeight) {
      window.scrollTo({ top: nextY, behavior: 'auto' });
      clearReturnScroll(returnTo);
      return;
    }

    attempts += 1;
    window.setTimeout(() => {
      window.requestAnimationFrame(tryRestore);
    }, 120);
  };

  window.requestAnimationFrame(tryRestore);
  return true;
}
