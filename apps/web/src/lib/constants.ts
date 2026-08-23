/**
 * 常量定义
 */

// Server rendering calls the configured API directly. Browser requests use the
// same-origin Next.js proxy so local previews and tenant domains do not require
// an ever-growing CORS allowlist.
const CONFIGURED_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4101';
export const API_BASE_URL = CONFIGURED_API_BASE_URL;

export function buildApiUrl(path: string): string {
  if (path.startsWith('http')) return path;

  const apiBase = (
    typeof window === 'undefined' ? API_BASE_URL : '/api'
  ).replace(/\/$/, '');
  if (path.startsWith('/api/')) return `${apiBase}${path.slice(4)}`;
  if (path.startsWith('/')) return `${apiBase}${path}`;
  return `${apiBase}/${path}`;
}

// 应用配置
import { getSiteName } from './site-config';
export const APP_NAME = getSiteName();
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3101';

// 分页配置
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

// 排序选项 (display labels via useTranslations('sort'))
export const SORT_OPTIONS = [
  { value: 'relevance', tKey: 'relevance' },
  { value: 'price_asc', tKey: 'priceAsc' },
  { value: 'price_desc', tKey: 'priceDesc' },
  { value: 'newest', tKey: 'newest' },
  { value: 'popular', tKey: 'popular' },
] as const;

// 性别选项 (display labels via useTranslations('filter'))
export const GENDER_OPTIONS = [
  { value: 'men', tKey: 'men' },
  { value: 'women', tKey: 'women' },
  { value: 'unisex', tKey: 'unisex' },
  { value: 'kids', tKey: 'kids' },
] as const;

// 季节选项 (display labels via useTranslations('filter'))
export const SEASON_OPTIONS = [
  { value: 'spring', tKey: 'spring' },
  { value: 'summer', tKey: 'summer' },
  { value: 'fall', tKey: 'fall' },
  { value: 'winter', tKey: 'winter' },
] as const;

// 品牌状态
export const BRAND_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING_REVIEW: 'pending_review',
  MERGED: 'merged',
} as const;

// 货币符号
export const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: '$',
  AUD: '$',
};
