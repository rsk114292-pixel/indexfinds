/**
 * 用户偏好同步工具
 * 已登录时将偏好设置同步到服务端
 */

import { patch } from './api';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * 同步单个偏好到服务端（fire-and-forget）
 */
export function syncPreferenceToServer(
  key: 'preferredCurrency' | 'preferredPlatform',
  value: string,
): void {
  if (typeof window === 'undefined') return;
  if (!useAuthStore.getState().isAuthenticated) return;

  patch('/auth/me/preferences', { [key]: value }).catch(() => {
    // 静默失败
  });
}
