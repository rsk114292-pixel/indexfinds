/**
 * 搜索系统统一错误处理
 *
 * 提供标准化的错误类型和错误码，便于：
 * 1. 日志记录和监控
 * 2. 前端错误展示
 * 3. 自动恢复策略
 */

/**
 * 搜索错误码枚举
 */
export enum SearchErrorCode {
  // 服务相关错误 (1xxx)
  EMBEDDING_SERVICE_UNAVAILABLE = 'SEARCH_1001',
  EMBEDDING_GENERATION_FAILED = 'SEARCH_1002',
  EMBEDDING_TIMEOUT = 'SEARCH_1003',

  // 查询相关错误 (2xxx)
  INVALID_QUERY = 'SEARCH_2001',
  QUERY_TOO_LONG = 'SEARCH_2002',
  QUERY_TOO_SHORT = 'SEARCH_2003',

  // 数据库相关错误 (3xxx)
  DATABASE_ERROR = 'SEARCH_3001',
  DATABASE_TIMEOUT = 'SEARCH_3002',
  DATABASE_CONNECTION_FAILED = 'SEARCH_3003',

  // 超时相关错误 (4xxx)
  SEARCH_TIMEOUT = 'SEARCH_4001',
  RECALL_TIMEOUT = 'SEARCH_4002',
  RANKING_TIMEOUT = 'SEARCH_4003',

  // 配置相关错误 (5xxx)
  INVALID_CONFIG = 'SEARCH_5001',
  MISSING_CONFIG = 'SEARCH_5002',

  // 限流相关错误 (6xxx)
  RATE_LIMIT_EXCEEDED = 'SEARCH_6001',

  // 未知错误 (9xxx)
  UNKNOWN = 'SEARCH_9999',
}

/**
 * 搜索错误严重级别
 */
export enum SearchErrorSeverity {
  /** 警告：可降级处理，不影响主流程 */
  WARNING = 'warning',
  /** 错误：需要降级或重试 */
  ERROR = 'error',
  /** 严重：系统级问题，需要立即处理 */
  CRITICAL = 'critical',
}

/**
 * 搜索错误基类
 */
export class SearchError extends Error {
  /** 错误码 */
  public readonly code: SearchErrorCode;
  /** 是否可恢复（用于决定是否重试或降级） */
  public readonly recoverable: boolean;
  /** 严重级别 */
  public readonly severity: SearchErrorSeverity;
  /** 附加上下文信息 */
  public readonly context?: Record<string, unknown>;
  /** 原始错误 */
  public readonly cause?: Error;

  constructor(
    message: string,
    code: SearchErrorCode,
    options: {
      recoverable?: boolean;
      severity?: SearchErrorSeverity;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
    this.recoverable = options.recoverable ?? true;
    this.severity = options.severity ?? SearchErrorSeverity.ERROR;
    this.context = options.context;
    this.cause = options.cause;

    // 保持正确的原型链
    Object.setPrototypeOf(this, SearchError.prototype);
  }

  /**
   * 转换为 JSON 格式（用于日志和 API 响应）
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Embedding 服务不可用错误
 */
export class EmbeddingServiceUnavailableError extends SearchError {
  constructor(
    message = 'Embedding service is unavailable',
    context?: Record<string, unknown>,
  ) {
    super(message, SearchErrorCode.EMBEDDING_SERVICE_UNAVAILABLE, {
      recoverable: true,
      severity: SearchErrorSeverity.WARNING,
      context,
    });
    this.name = 'EmbeddingServiceUnavailableError';
  }
}

/**
 * Embedding 生成失败错误
 */
export class EmbeddingGenerationError extends SearchError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(message, SearchErrorCode.EMBEDDING_GENERATION_FAILED, {
      recoverable: true,
      severity: SearchErrorSeverity.ERROR,
      cause,
      context,
    });
    this.name = 'EmbeddingGenerationError';
  }
}

/**
 * 无效查询错误
 */
export class InvalidQueryError extends SearchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, SearchErrorCode.INVALID_QUERY, {
      recoverable: false,
      severity: SearchErrorSeverity.WARNING,
      context,
    });
    this.name = 'InvalidQueryError';
  }
}

/**
 * 数据库错误
 */
export class SearchDatabaseError extends SearchError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(message, SearchErrorCode.DATABASE_ERROR, {
      recoverable: true,
      severity: SearchErrorSeverity.ERROR,
      cause,
      context,
    });
    this.name = 'SearchDatabaseError';
  }
}

/**
 * 搜索超时错误
 */
export class SearchTimeoutError extends SearchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, SearchErrorCode.SEARCH_TIMEOUT, {
      recoverable: true,
      severity: SearchErrorSeverity.ERROR,
      context,
    });
    this.name = 'SearchTimeoutError';
  }
}

/**
 * 限流错误
 */
export class RateLimitError extends SearchError {
  constructor(
    message = 'Rate limit exceeded',
    context?: Record<string, unknown>,
  ) {
    super(message, SearchErrorCode.RATE_LIMIT_EXCEEDED, {
      recoverable: true,
      severity: SearchErrorSeverity.WARNING,
      context,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * 错误处理工具函数
 */
export const SearchErrorUtils = {
  /**
   * 判断错误是否为搜索错误
   */
  isSearchError(error: unknown): error is SearchError {
    return error instanceof SearchError;
  },

  /**
   * 判断错误是否可恢复
   */
  isRecoverable(error: unknown): boolean {
    if (error instanceof SearchError) {
      return error.recoverable;
    }
    return false;
  },

  /**
   * 从普通错误创建搜索错误
   */
  fromError(
    error: Error,
    code: SearchErrorCode = SearchErrorCode.UNKNOWN,
  ): SearchError {
    return new SearchError(error.message, code, {
      cause: error,
      recoverable: true,
    });
  },

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(error: SearchError): string {
    switch (error.code) {
      case SearchErrorCode.EMBEDDING_SERVICE_UNAVAILABLE:
        return '搜索服务暂时不可用，请稍后重试';
      case SearchErrorCode.INVALID_QUERY:
        return '搜索词无效，请修改后重试';
      case SearchErrorCode.SEARCH_TIMEOUT:
        return '搜索超时，请稍后重试';
      case SearchErrorCode.RATE_LIMIT_EXCEEDED:
        return '请求过于频繁，请稍后重试';
      default:
        return '搜索出现问题，请稍后重试';
    }
  },
};
