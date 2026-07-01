'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { buildReturnTo } from '@/lib/return-to';
import { readReturnScroll, restoreReturnScroll } from '@/lib/return-scroll';

interface InfiniteReturnScrollOptions {
  enabled?: boolean;
  size: number;
  setSize: (size: number | ((_size: number) => number)) => Promise<unknown>;
  isValidating: boolean;
  ready: boolean;
}

export function useInfiniteReturnScrollRestoration({
  enabled = true,
  size,
  setSize,
  isValidating,
  ready,
}: InfiniteReturnScrollOptions) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => buildReturnTo(pathname, searchParams),
    [pathname, searchParams],
  );
  const hydratedRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    restoredRef.current = false;
  }, [returnTo]);

  useEffect(() => {
    if (!enabled || hydratedRef.current) return;

    const state = readReturnScroll(returnTo);
    if (!state?.page || state.page <= 1) {
      hydratedRef.current = true;
      return;
    }

    if (size < state.page) {
      hydratedRef.current = true;
      void setSize(state.page);
      return;
    }

    hydratedRef.current = true;
  }, [enabled, returnTo, setSize, size]);

  useEffect(() => {
    if (!enabled || restoredRef.current || !ready || isValidating) return;
    restoredRef.current = true;
    restoreReturnScroll(returnTo);
  }, [enabled, isValidating, ready, returnTo]);
}
