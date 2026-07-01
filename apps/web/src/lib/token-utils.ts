/**
 * JWT Token 工具函数
 */

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * 解析 JWT token（不验证签名，仅解码 payload）
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * 获取 token 的过期时间（毫秒时间戳）
 */
export function getTokenExpiration(token: string): number | null {
  const payload = parseJwt(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000; // JWT exp 是秒，转换为毫秒
}

/**
 * 检查 token 是否即将过期
 * @param token JWT token
 * @param bufferMs 提前多少毫秒认为即将过期，默认 2 分钟
 */
export function isTokenExpiringSoon(token: string, bufferMs = 2 * 60 * 1000): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true; // 无法解析则认为需要刷新

  return Date.now() + bufferMs >= expiration;
}

/**
 * 检查 token 是否已过期
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;

  return Date.now() >= expiration;
}

/**
 * 获取 token 剩余有效时间（毫秒）
 */
export function getTokenRemainingTime(token: string): number {
  const expiration = getTokenExpiration(token);
  if (!expiration) return 0;

  return Math.max(0, expiration - Date.now());
}
