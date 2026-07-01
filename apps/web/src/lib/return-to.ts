export function buildReturnTo(
  pathname: string,
  searchParams: { toString(): string },
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete('from');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function withReturnTo(href: string, returnTo?: string): string {
  const safeReturnTo = resolveSafeReturnTo(returnTo);
  if (!safeReturnTo) return href;

  const [pathname, hash = ''] = href.split('#', 2);
  const [basePath, query = ''] = pathname.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('from', safeReturnTo);

  const nextQuery = params.toString();
  const nextPath = nextQuery ? `${basePath}?${nextQuery}` : basePath;
  return hash ? `${nextPath}#${hash}` : nextPath;
}

export function resolveSafeReturnTo(rawFrom?: string | null): string | null {
  if (!rawFrom) return null;
  if (!rawFrom.startsWith('/') || rawFrom.startsWith('//') || rawFrom.includes('\\')) {
    return null;
  }

  const path = rawFrom.split('?')[0]?.split('#')[0] ?? '';

  // Avoid looping back into another product detail page.
  if (/^\/(?:[a-z]{2}\/)?products\/[^/?#]+$/.test(path)) {
    return null;
  }

  try {
    const url = new URL(rawFrom, 'https://lolobuyspreadsheets.com');
    if (url.searchParams.has('from')) {
      return null;
    }
  } catch {
    return null;
  }

  return rawFrom;
}
