'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReferralActivationProgressData } from '@/components/account/ReferralActivationGuide';
import { getCurrentUserId } from '@/lib/user-storage';

export type ReferralActivationSurface =
  | 'account'
  | 'product'
  | 'verify_email';

const STORAGE_PREFIX = 'referral_activation_dismissed';

function buildDismissKey(
  surface: ReferralActivationSurface,
  userId: string,
): string {
  return `${STORAGE_PREFIX}:${surface}:${userId}`;
}

export function getReferralActivationSignature(
  data: ReferralActivationProgressData | null | undefined,
): string {
  if (!data?.isReferred) return 'not_referred';

  return [
    data.status,
    data.progress.emailVerified ? '1' : '0',
    Math.min(data.progress.productViews, data.progress.requiredProductViews),
    data.progress.hasAction ? '1' : '0',
  ].join(':');
}

export function useReferralActivationVisibility({
  data,
  surface,
  userId,
}: {
  data: ReferralActivationProgressData | null | undefined;
  surface: ReferralActivationSurface;
  userId?: string | null;
}) {
  const resolvedUserId = userId || getCurrentUserId();
  const signature = useMemo(
    () => getReferralActivationSignature(data),
    [data],
  );
  const storageKey = useMemo(
    () => buildDismissKey(surface, resolvedUserId),
    [resolvedUserId, surface],
  );
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissedSignature(localStorage.getItem(storageKey));
    } catch {
      setDismissedSignature(null);
    }
  }, [storageKey]);

  const dismiss = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, signature);
      setDismissedSignature(signature);
    } catch {}
  };

  const reset = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
      setDismissedSignature(null);
    } catch {}
  };

  return {
    dismissed: dismissedSignature === signature,
    dismiss,
    reset,
    signature,
  };
}
