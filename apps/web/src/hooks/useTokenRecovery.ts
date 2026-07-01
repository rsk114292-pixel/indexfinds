'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { performTokenRefresh } from '@/lib/api';

/**
 * 页面刷新后自动恢复 Access Token
 *
 * 由于 Access Token 不再持久化到 localStorage（安全），
 * 页面刷新后 token 为空，需通过 HttpOnly Cookie 中的 Refresh Token
 * 调用 /auth/refresh 重新获取。
 *
 * 使用全局 performTokenRefresh() 确保与 401 拦截器 / useTokenRefresh 共享同一个刷新锁，
 * 避免并发 refresh 请求导致 token rotation 竞态。
 *
 * 流程：
 * 1. Zustand 从 localStorage 恢复 user + isAuthenticated（_hasHydrated = true）
 * 2. 检测到 isAuthenticated=true 但 token=null → 说明刚刷新页面
 * 3. 调用 performTokenRefresh()（Cookie 自动携带）
 * 4. 成功 → token 已由 performTokenRefresh 写入 store
 * 5. 失败 → 重试最多 3 次（指数退避），全部失败后才 logout
 */
export function useTokenRecovery() {
  const { token, isAuthenticated, _hasHydrated, setAuth, logout } =
    useAuthStore();
  const isRecoveringRef = useRef(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isAuthenticated && !token && !isRecoveringRef.current) {
      isRecoveringRef.current = true;

      const attemptRecovery = async (retriesLeft: number, delay: number): Promise<void> => {
        try {
          const data = await performTokenRefresh();
          if (data?.accessToken) {
            if (data.user) {
              setAuth(data.user, data.accessToken);
            }
            return; // 恢复成功
          }

          // performTokenRefresh 返回 null 但没有抛异常
          // 可能是临时错误（500、网络波动）或确定性失败（401 已触发 logout）
          if (retriesLeft > 0 && useAuthStore.getState().isAuthenticated) {
            // 如果 performTokenRefresh 内部已经 logout 了，就不再重试
            await new Promise(r => setTimeout(r, delay));
            // 检查其他机制是否已恢复 token（如 401 拦截器或 useTokenRefresh）
            if (useAuthStore.getState().token) return;
            return attemptRecovery(retriesLeft - 1, delay * 2);
          }

          // 所有重试都失败了，检查是否已被 performTokenRefresh 登出
          if (useAuthStore.getState().isAuthenticated) {
            logout();
          }
        } catch {
          if (retriesLeft > 0 && useAuthStore.getState().isAuthenticated) {
            await new Promise(r => setTimeout(r, delay));
            // 检查其他机制是否已恢复 token（如 401 拦截器或 useTokenRefresh）
            if (useAuthStore.getState().token) return;
            return attemptRecovery(retriesLeft - 1, delay * 2);
          }
          if (useAuthStore.getState().isAuthenticated) {
            logout();
          }
        }
      };

      // 3 次重试，较短指数退避（0.5s → 1s → 2s），避免后台刷新时长时间白屏。
      attemptRecovery(3, 500).finally(() => {
        isRecoveringRef.current = false;
      });
    }
  }, [_hasHydrated, isAuthenticated, token, setAuth, logout]);
}
