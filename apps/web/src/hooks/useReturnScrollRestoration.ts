'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { buildReturnTo } from '@/lib/return-to';
import { restoreReturnScroll } from '@/lib/return-scroll';

export function useReturnScrollRestoration(
  enabled = true,
  returnToOverride?: string,
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = useMemo(
    () => returnToOverride ?? buildReturnTo(pathname, searchParams),
    [pathname, returnToOverride, searchParams],
  );

  useEffect(() => {
    if (!enabled) return;
    restoreReturnScroll(returnTo);
  }, [enabled, returnTo]);
}
