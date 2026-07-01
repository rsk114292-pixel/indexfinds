/**
 * 积分系统常量配置
 * 汇率：10 积分 = $1
 */

// ── 一次性奖励 ──────────────────────────────────────────
export const POINT_REWARDS = {
  /** 新用户注册（非推荐） */
  REGISTRATION: 5,
  /** 普通邮箱验证 */
  EMAIL_VERIFICATION: 5,
  /** 兼容旧事件：被推荐注册基础奖励，与 REGISTRATION 保持一致 */
  REFERRED_REGISTRATION: 5,
  /** 被推荐用户完成邮箱验证后补发奖励 */
  REFERRED_EMAIL_VERIFICATION: 5,
  /** 完善个人资料 */
  COMPLETE_PROFILE: 2,
  /** 首次高意图动作（兼容 legacy action: first_favorite） */
  FIRST_FAVORITE: 2,
  /** 首次分享商品 */
  FIRST_SHARE: 3,
} as const;

export const SHARE_REWARD_CHANNELS = [
  'whatsapp',
  'telegram',
  'twitter',
  'reddit',
  'email',
  'pinterest',
  'discord',
  'tiktok',
] as const;

export type ShareRewardChannel = (typeof SHARE_REWARD_CHANNELS)[number];

export function isShareRewardChannel(
  value: string,
): value is ShareRewardChannel {
  return SHARE_REWARD_CHANNELS.includes(value as ShareRewardChannel);
}

// ── 日常奖励 ────────────────────────────────────────────
export const DAILY_REWARDS = {
  /** 每日签到基础积分 */
  CHECKIN: 1,
  /** 连续第 7 天签到（替代基础，不叠加） */
  CHECKIN_STREAK_7: 5,
  /** 连续第 30 天签到（替代基础，不叠加） */
  CHECKIN_STREAK_30: 20,
  /** 每日浏览 5 个不同商品 */
  BROWSE_5_PRODUCTS: 1,
  /** 每日收藏 1 个商品 */
  FAVORITE_PRODUCT: 1,
  /** 分享商品 */
  SHARE_PRODUCT: 1,
  /** 分享每日上限 */
  SHARE_DAILY_LIMIT: SHARE_REWARD_CHANNELS.length,
} as const;

// ── 推荐阶梯奖励（按累计推荐人数，无上限） ─────────────
export const REFERRAL_TIERS = [
  { min: 1, max: 10, reward: 20 },
  { min: 11, max: 50, reward: 30 },
  { min: 51, max: 200, reward: 50 },
  { min: 201, max: Infinity, reward: 80 },
] as const;

// ── 里程碑奖励（一次性 bonus） ──────────────────────────
export const REFERRAL_MILESTONES = [
  { threshold: 10, bonus: 50 },
  { threshold: 50, bonus: 200 },
  { threshold: 100, bonus: 500 },
  { threshold: 500, bonus: 2000 },
] as const;

// ── 提现规则 ────────────────────────────────────────────
export const WITHDRAWAL_RULES = {
  /** 首次提现最低积分 */
  FIRST_MIN_AMOUNT: 50,
  /** 后续提现最低积分 */
  MIN_AMOUNT: 100,
  /** 每月最多提现次数 */
  MONTHLY_LIMIT: 2,
} as const;

// ── 积分过期 ────────────────────────────────────────────
export const POINTS_EXPIRY_MONTHS = 12;
