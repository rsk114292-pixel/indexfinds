/**
 * Auth 模块安全参数集中配置
 *
 * - ConfigService 管理的参数（运维可调）：默认值在此定义，运行时通过环境变量覆盖
 * - 内部实现常量：直接在此定义，不暴露为环境变量
 */

// ============ ConfigService 默认值（可通过环境变量覆盖） ============

/** 密码 bcrypt 加密轮次 — env: BCRYPT_ROUNDS */
export const DEFAULT_BCRYPT_ROUNDS = 10;

/** 邮箱验证 Token 有效期（秒）— env: EMAIL_VERIFY_TOKEN_TTL */
export const DEFAULT_EMAIL_VERIFY_TOKEN_TTL = 86400; // 24 hours

/** 密码重置 Token 有效期（秒）— env: PASSWORD_RESET_TOKEN_TTL */
export const DEFAULT_PASSWORD_RESET_TOKEN_TTL = 3600; // 1 hour

/** OAuth 一次性 Code 有效期（秒）— env: OAUTH_CODE_TTL */
export const DEFAULT_OAUTH_CODE_TTL = 300; // 5 minutes

// ============ 内部实现常量（不暴露为环境变量） ============

/** OAuth State Token 有效期（秒） */
export const OAUTH_STATE_TTL = 600; // 10 minutes

/** Token 盗用检测：宽限期（毫秒），此时间内的复用视为并发竞态 */
export const TOKEN_THEFT_GRACE_PERIOD_MS = 10_000; // 10 seconds

/** Token 盗用检测：revoke-all 操作节流间隔（毫秒） */
export const TOKEN_THEFT_REVOKE_THROTTLE_MS = 60_000; // 1 minute

/** Token 盗用检测：日志记录节流间隔（毫秒） */
export const TOKEN_THEFT_LOG_THROTTLE_MS = 5 * 60_000; // 5 minutes

/** Access Token 黑名单 TTL 额外缓冲（秒） */
export const BLACKLIST_TTL_BUFFER_SECONDS = 10 * 60; // 10 minutes

/** Redis 黑名单检查超时（毫秒） */
export const REDIS_BLACKLIST_CHECK_TIMEOUT_MS = 1500; // 1.5 seconds

/** 内部日志节流 Map 最大条目数 */
export const THROTTLE_MAP_MAX_SIZE = 5000;

/** 内部日志节流 Map 清理阈值（毫秒），超过此时间的条目会被清理 */
export const THROTTLE_MAP_PRUNE_AGE_MS = 60 * 60_000; // 1 hour

/** 内部日志节流 Map 定时清理间隔（毫秒） */
export const THROTTLE_MAP_PRUNE_INTERVAL_MS = 10 * 60_000; // 10 minutes

/** Redis 断路器阈值：连续失败次数超过此值后跳过 Redis 检查 */
export const REDIS_CIRCUIT_OPEN_THRESHOLD = 3;

/** Redis 断路器重置时间（毫秒） */
export const REDIS_CIRCUIT_RESET_MS = 30_000; // 30 seconds

/** 登录统计时间窗口（毫秒） */
export const LOGIN_STATS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Refresh Token 滑动会话 idle 超时（天）— 用户不活跃超过此天数则过期 */
export const REFRESH_TOKEN_IDLE_DAYS = 14;

/** Access Token 默认过期时间 */
export const DEFAULT_ACCESS_TOKEN_EXPIRATION = '30m';

// ============ Rate Limit 常量（@Throttle 装饰器需要编译时常量） ============

export const RATE_LIMIT = {
  REGISTER: { ttl: 3600000, limit: 5 }, // 5 requests / 1 hour
  LOGIN: { ttl: 60000, limit: 5 }, // 5 requests / 1 minute
  FORGOT_PASSWORD: { ttl: 600000, limit: 3 }, // 3 requests / 10 minutes
} as const;

// ============ Redis 连接配置常量 ============

export const REDIS_CONFIG = {
  MAX_RETRIES: 5,
  MAX_RETRIES_PER_REQUEST: 3,
  CONNECT_TIMEOUT_MS: 10000,
  KEEP_ALIVE_MS: 30000,
} as const;
