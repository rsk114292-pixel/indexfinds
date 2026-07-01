'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

export type AdminAuthStatus =
  | 'hydrating'
  | 'unauthenticated'
  | 'forbidden'
  | 'recovering_token'
  | 'ready';

function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function useAdminAuthReady() {
  const { user, token, isAuthenticated, _hasHydrated } = useAuthStore();

  return useMemo(() => {
    let status: AdminAuthStatus;

    if (!_hasHydrated) {
      status = 'hydrating';
    } else if (!isAuthenticated) {
      status = 'unauthenticated';
    } else if (!user) {
      status = token ? 'forbidden' : 'recovering_token';
    } else if (!isAdminRole(user.role)) {
      status = 'forbidden';
    } else if (!token) {
      status = 'recovering_token';
    } else {
      status = 'ready';
    }

    return {
      status,
      user,
      token,
      isAuthenticated,
      isReady: status === 'ready',
      isBlocking: status === 'hydrating' || status === 'recovering_token',
    };
  }, [_hasHydrated, isAuthenticated, token, user]);
}
