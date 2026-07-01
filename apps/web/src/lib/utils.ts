/**
 * 通用工具函数
 */

/**
 * 货币对应的 Intl locale 映射
 */
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  CNY: 'zh-CN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

/**
 * 根据货币获取合适的 Intl locale
 */
function getLocaleForCurrency(
  currency: string,
  locale?: string
): string {
  if (locale) return locale;
  return CURRENCY_LOCALE_MAP[currency] || 'en-US';
}

/**
 * 格式化价格（缓存 Intl.NumberFormat 实例避免重复创建）
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatPrice(
  price: number,
  currency: string = 'CNY',
  locale?: string
): string {
  const intlLocale = getLocaleForCurrency(currency, locale);
  const key = `${intlLocale}:${currency}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatterCache.set(key, fmt);
  }
  return fmt.format(price);
}

/** 默认汇率（以 CNY 为基准） */
export const DEFAULT_RATES: Record<string, number> = {
  CNY: 1,
  USD: 0.14,
  EUR: 0.13,
  GBP: 0.11,
  CAD: 0.19,
  AUD: 0.22,
};

/**
 * 汇率换算
 */
export function convertPrice(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = DEFAULT_RATES
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}

/**
 * 格式化价格区间
 */
export function formatPriceRange(
  min: number,
  max: number,
  currency: string = 'CNY',
  locale?: string
): string {
  if (min === max) {
    return formatPrice(min, currency, locale);
  }
  return `${formatPrice(min, currency, locale)} - ${formatPrice(max, currency, locale)}`;
}

/**
 * 构建筛选 URL
 */
export function buildFilterURL(
  basePath: string,
  params: Record<string, string | string[] | number | undefined | null>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          searchParams.set(key, value.join(','));
        }
      } else {
        searchParams.set(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * 从 URL 参数解析筛选条件
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): Record<string, string | string[] | number> {
  const filters: Record<string, string | string[] | number> = {};

  searchParams.forEach((value, key) => {
    // 数组参数（逗号分隔）
    if (['categories', 'brands', 'series', 'genders', 'colors', 'styles', 'occasions', 'seasons'].includes(key)) {
      filters[key] = value.split(',').filter(Boolean);
    }
    // 数字参数
    else if (['minPrice', 'maxPrice', 'page', 'limit'].includes(key)) {
      filters[key] = Number(value);
    }
    // 其他字符串参数
    else {
      filters[key] = value;
    }
  });

  return filters;
}

/**
 * 类名合并工具（简化版 clsx）
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 根据当前 locale 获取实体的本地化名称
 *
 * 优先级：translations[locale].name → nameEn (英文) → translations.en.name (非中文回退英文) → name
 */
export function getLocalizedName(
  entity: { name: string; nameEn?: string; translations?: Record<string, { name?: string }> | null },
  locale: string,
): string {
  if (entity.translations?.[locale]?.name) {
    return entity.translations[locale].name!;
  }
  if (locale === 'en' && entity.nameEn) {
    return entity.nameEn;
  }
  if (locale !== 'zh') {
    return entity.translations?.en?.name || entity.nameEn || entity.name;
  }
  return entity.name;
}

const IMMERSIVE_PATH_RE = /\/products\/[^/]+(?:\/.*)?\/?$/;
const HEADER_HIDDEN_PATH_RE = /\/(account|search)(\/.*)?$|\/(brands|categories)\/[^/]+/;
const SEARCH_PATH_RE = /\/search(?:\/visual)?\/?$/;
const SUB_PAGE_PATH_RE = /\/(brands|categories)\/[^/]+(?:\/.*)?\/?$/;
const SCROLL_HIDE_HEADER_RE = /\/products\/?$/;

/**
 * 判断给定路径是否为沉浸式页面（如商品详情页）
 * 沉浸式页面隐藏 Header + TabBar
 */
export function isImmersivePath(pathname: string): boolean {
  return IMMERSIVE_PATH_RE.test(pathname);
}

/**
 * 判断给定路径是否需要隐藏全局 MobileHeader（但保留 TabBar）
 * 匹配：/account、/search、/brands/[slug]、/categories/[slug]
 */
export function isHeaderHiddenPath(pathname: string): boolean {
  return HEADER_HIDDEN_PATH_RE.test(pathname);
}

/** 搜索页路径（/search, /search/visual） */
export function isSearchPath(pathname: string): boolean {
  return SEARCH_PATH_RE.test(pathname);
}

/** 子页面路径（品牌详情、分类详情）— 使用 SubPageHeader 48px */
export function isSubPagePath(pathname: string): boolean {
  return SUB_PAGE_PATH_RE.test(pathname);
}

/** 需要滚动隐藏 MobileHeader 的路径（首页 + /products 列表页） */
export function isScrollHideHeaderPath(pathname: string): boolean {
  return SCROLL_HIDE_HEADER_RE.test(pathname) || /^\/[a-z]{2}\/?$/.test(pathname);
}

/**
 * 计算 Hot badge 阈值：取 popularityScore 前 20% 的分界值
 * 返回 Infinity 表示没有商品可标为 Hot
 */
export function computeHotThreshold(scores: number[]): number {
  const positive = scores.filter((s) => s > 0);
  if (positive.length === 0) return Infinity;
  positive.sort((a, b) => b - a);
  return positive[Math.floor(positive.length * 0.2)] ?? Infinity;
}
