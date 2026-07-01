/**
 * 用户存储工具
 * 提供当前用户 ID，用于 localStorage key 隔离
 */

/**
 * 获取当前用户 ID
 * 从 auth-storage 中读取，未登录返回 'guest'
 */
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'guest';

  try {
    const authData = localStorage.getItem('auth-storage');
    if (!authData) return 'guest';

    const parsed = JSON.parse(authData);
    const userId = parsed?.state?.user?.id;
    return userId || 'guest';
  } catch {
    return 'guest';
  }
}
