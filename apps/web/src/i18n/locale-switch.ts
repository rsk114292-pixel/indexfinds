'use client';

type SearchParamsLike = {
  toString(): string;
};

export function buildLocaleSwitchHref(
  pathname: string,
  searchParams?: SearchParamsLike | null,
  hash?: string | null,
): string {
  const queryString = searchParams?.toString() || '';
  const normalizedHash = hash
    ? hash.startsWith('#')
      ? hash
      : `#${hash}`
    : '';

  return `${pathname}${queryString ? `?${queryString}` : ''}${normalizedHash}`;
}

export function getCurrentHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash || '';
}
