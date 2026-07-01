'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { performTokenRefresh } from '@/lib/api';
import { isTokenExpiringSoon, isTokenExpired, getTokenRemainingTime } from '@/lib/token-utils';

// 提前刷新的时间（2 分钟）
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
// 最小检查间隔（30 秒）
const MIN_CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Token 静默刷新 Hook
 * 在 token 即将过期时自动刷新，用户无感知
 * 页面重新可见时立即检查（防止挂起的定时器导致 token 过期）
 *
 * 使用全局 performTokenRefresh() 确保与 401 拦截器 / useTokenRecovery 共享同一个刷新锁，
 * 避免并发 refresh 请求导致 token rotation 竞态。
 */
export function useTokenRefresh() {
  const { token, isAuthenticated } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const doRefresh = useCallback(async () => {
    try {
      await performTokenRefresh();
    } catch {
      // 静默刷新失败不登出，等用户下次操作时触发 401 刷新
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const scheduleRefresh = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const remainingTime = getTokenRemainingTime(token);
      const nextCheckIn = Math.max(
        remainingTime - REFRESH_BUFFER_MS,
        MIN_CHECK_INTERVAL_MS
      );

      timerRef.current = setTimeout(async () => {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken || !isTokenExpiringSoon(currentToken, REFRESH_BUFFER_MS)) {
          scheduleRefresh();
          return;
        }
        await doRefresh();
      }, nextCheckIn);
    };

    // 页面重新可见时立即检查 token
    // 解决浏览器挂起定时器导致 token 过期的问题
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const currentToken = useAuthStore.getState().token;

      if (!currentToken) {
        // Token 丢失（长时间休眠后内存可能被回收），尝试恢复
        if (useAuthStore.getState().isAuthenticated) {
          doRefresh();
        }
        return;
      }

      if (isTokenExpired(currentToken) || isTokenExpiringSoon(currentToken, REFRESH_BUFFER_MS)) {
        doRefresh();
      } else {
        // token 仍有效，重新调度定时器
        scheduleRefresh();
      }
    };

    scheduleRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, isAuthenticated, doRefresh]);
}
