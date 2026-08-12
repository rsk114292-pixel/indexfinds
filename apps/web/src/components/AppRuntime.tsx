'use client';

import { useEffect, useRef } from 'react';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useTokenRecovery } from '@/hooks/useTokenRecovery';
import { initSyncOnLogin } from '@/lib/sync-on-login';
import { associateVisitWithUser } from '@/lib/visit-tracking';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Authentication/session effects shared by every route.
 *
 * Keep this separate from Ant Design so public routes do not need to load the
 * Ant Design provider, locale packs and CSS-in-JS runtime just to recover a
 * session.
 */
export default function AppRuntime() {
  const { _hasHydrated, isAuthenticated, token, user } = useAuthStore();
  const lastAssociatedUserIdRef = useRef<string | null>(null);

  useTokenRecovery();
  useTokenRefresh();
  initSyncOnLogin();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token || !user?.id) {
      if (!isAuthenticated) {
        lastAssociatedUserIdRef.current = null;
      }
      return;
    }

    if (lastAssociatedUserIdRef.current === user.id) {
      return;
    }

    lastAssociatedUserIdRef.current = user.id;
    void associateVisitWithUser();
  }, [_hasHydrated, isAuthenticated, token, user?.id]);

  return null;
}
