/**
 * 搜索查询验证工具
 * 防止 SQL 注入、XSS、超长查询等安全风险
 */

export interface QueryValidationResult {
  valid: boolean;
  sanitizedQuery: string;
  error?: string;
}

export interface PublicSearchRiskResult {
  risky: boolean;
  sanitizedQuery: string;
  reason?: string;
}

/** 查询最大长度 */
const MAX_QUERY_LENGTH = 500;

const MAX_PUBLIC_SEARCH_LENGTH = 120;
const MAX_PUBLIC_SEARCH_TOKENS = 12;

/** 查询最小长度 */
const MIN_QUERY_LENGTH = 1;

/** Token 最大数量 */
export const MAX_TOKENS = 50;

/** 允许的字符白名单：字母、数字、空格、中日韩文、基本标点 */
const ALLOWED_CHARS =
  /^[\p{L}\p{N}\s\-_.,'&+/()@#!?:;""''「」【】（）、，。！？]+$/u;

/** 危险的 SQL 关键字模式（全文匹配，非仅行首） */
const SQL_INJECTION_PATTERN =
  /\b(DROP|DELETE|INSERT|UPDATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION\s+SELECT)\b/i;

/** HTML/Script 标签模式 */
const XSS_PATTERN = /<\s*script|<\s*\/script|javascript:|on\w+\s*=/i;

const URL_OR_PROTOCOL_PATTERN =
  /\b(?:https?:\/\/|www\.|ftp:\/\/|file:\/\/|data:|localhost|127\.0\.0\.1)\b/i;

const CODE_OR_AUTOMATION_PATTERN =
  /\b(?:curl|wget|python|node|npm|yarn|pnpm|bash|powershell|cmd\.exe|docker|kubectl|api|graphql|wp-admin|phpmyadmin|login|password)\b/i;

const STATIC_ASSET_PATH_PATTERN =
  /(?:^|[/?\s])(?:_next|static|chunks|webpack|assets)(?:[/?\s]|$)|\.(?:js|css|map)(?:[?#\s]|$)/i;

const QUESTION_SEARCH_PATTERN =
  /^(?:what|when|where|why|who|whose|which|how|is|are|can|could|do|does|did|will|would|should)\b/i;

const NON_COMMERCE_PATTERN =
  /\b(?:weather|maintenance|tomorrow|yesterday|today|news|score|scores|election|president|homework|essay|recipe|lyrics|movie|torrent)\b/i;

/**
 * 验证搜索查询
 */
export function validateSearchQuery(query: string): QueryValidationResult {
  // 空查询
  if (!query || !query.trim()) {
    return { valid: false, sanitizedQuery: '', error: 'Query cannot be empty' };
  }

  const trimmed = query.trim();

  // 长度检查
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { valid: false, sanitizedQuery: '', error: 'Query too short' };
  }

  if (trimmed.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      sanitizedQuery: '',
      error: `Query exceeds max length of ${MAX_QUERY_LENGTH}`,
    };
  }

  // 白名单字符校验
  if (!ALLOWED_CHARS.test(trimmed)) {
    // 包含不允许的字符，清理后再检查
    const cleaned = trimmed
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[<>"\\`{}|^~[\]]/g, '')
      .trim();
    if (!cleaned) {
      return {
        valid: false,
        sanitizedQuery: '',
        error: 'Invalid query format',
      };
    }
    // 对清理后的字符串继续检查 SQL 注入和 XSS
    if (SQL_INJECTION_PATTERN.test(cleaned) || XSS_PATTERN.test(cleaned)) {
      return {
        valid: false,
        sanitizedQuery: '',
        error: 'Invalid query format',
      };
    }
    return { valid: true, sanitizedQuery: cleaned };
  }

  // SQL 注入检测（冗余防线，白名单已排除大多数注入字符）
  if (SQL_INJECTION_PATTERN.test(trimmed)) {
    return { valid: false, sanitizedQuery: '', error: 'Invalid query format' };
  }

  // XSS 检测
  if (XSS_PATTERN.test(trimmed)) {
    return { valid: false, sanitizedQuery: '', error: 'Invalid query format' };
  }

  // 清理：移除控制字符，保留常规 Unicode（中文、日文等）
  const sanitized = trimmed
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  return { valid: true, sanitizedQuery: sanitized };
}

export function assessPublicSearchRisk(query: string): PublicSearchRiskResult {
  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    return {
      risky: true,
      sanitizedQuery: '',
      reason: validation.error || 'invalid_query',
    };
  }

  const sanitizedQuery = validation.sanitizedQuery;
  const normalized = sanitizedQuery.replace(/\s+/g, ' ').trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (normalized.length > MAX_PUBLIC_SEARCH_LENGTH) {
    return {
      risky: true,
      sanitizedQuery: normalized,
      reason: 'public_search_too_long',
    };
  }

  if (tokens.length > MAX_PUBLIC_SEARCH_TOKENS) {
    return {
      risky: true,
      sanitizedQuery: normalized,
      reason: 'public_search_too_many_tokens',
    };
  }

  if (URL_OR_PROTOCOL_PATTERN.test(normalized)) {
    return {
      risky: true,
      sanitizedQuery: normalized,
      reason: 'public_search_url_or_protocol',
    };
  }

  if (CODE_OR_AUTOMATION_PATTERN.test(normalized)) {
    return {
      risky: true,
      sanitizedQuery: normalized,
      reason: 'public_search_automation_term',
    };
  }

  if (STATIC_ASSET_PATH_PATTERN.test(normalized)) {
    return {
      risky: true,
      sanitizedQuery: normalized,
      reason: 'public_search_static_asset_path',
    };
  }

  if (
    tokens.length >= 4 &&
    (QUESTION_SEARCH_PATTERN.test(normalized) ||
      NON_COMMERCE_PATTERN.test(normalized))
  ) {
    return {
      risky: true,
      sanitizedQuery: normalized,
      reason: 'public_search_non_commerce_phrase',
    };
  }

  return {
    risky: false,
    sanitizedQuery: normalized,
  };
}

/**
 * 限制 token 数量，防止内存溢出
 */
export function limitTokens(
  tokens: string[],
  max: number = MAX_TOKENS,
): string[] {
  return tokens.length > max ? tokens.slice(0, max) : tokens;
}

/**
 * 转义 ILIKE 通配符，防止用户注入 % 或 _ 导致全表扫描
 */
export function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}
