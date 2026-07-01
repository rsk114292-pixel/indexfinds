'use client';

import useSWR from 'swr';
import { fetcher, post } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

export type ReferralRewardsVariant = 'control' | 'rewards_push';

interface ReferralExperimentAssignment {
  experimentKey: string;
  variantId: ReferralRewardsVariant;
}

interface TrackReferralExperimentParams {
  eventType: 'modal_exposure' | 'hub_exposure' | 'copy_link' | 'share_invite';
  placement?: string;
  channelId?: string;
  onceKey?: string;
}

export function useReferralRewardsExperiment(): ReferralExperimentAssignment | null {
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const canFetch = _hasHydrated && isAuthenticated && !!token;

  const { data } = useSWR<ReferralExperimentAssignment>(
    canFetch ? '/referral/experiment' : null,
    fetcher,
    { dedupingInterval: 300_000 },
  );

  return data ?? null;
}

export async function trackReferralExperimentEvent({
  eventType,
  placement,
  channelId,
  onceKey,
}: TrackReferralExperimentParams): Promise<void> {
  const { token } = useAuthStore.getState();
  if (!token) return;

  if (onceKey && typeof window !== 'undefined') {
    const storageKey = `referral-exp:${onceKey}`;
    if (sessionStorage.getItem(storageKey) === '1') return;
    sessionStorage.setItem(storageKey, '1');
  }

  try {
    await post('/referral/experiment/event', {
      eventType,
      placement,
      channelId,
    });
  } catch {
    // best-effort only
  }
}
