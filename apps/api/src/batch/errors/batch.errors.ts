/**
 * 批量处理错误码
 */
export enum BatchErrorCode {
  // 抓取阶段
  FETCH_FAILED = 'FETCH_FAILED',
  FETCH_TIMEOUT = 'FETCH_TIMEOUT',
  INVALID_URL = 'INVALID_URL',

  // AI 分析阶段
  AI_ANALYSIS_FAILED = 'AI_ANALYSIS_FAILED',
  AI_RESPONSE_TRUNCATED = 'AI_RESPONSE_TRUNCATED',
  AI_TIMEOUT = 'AI_TIMEOUT',

  // 商品创建阶段
  PRODUCT_CREATE_FAILED = 'PRODUCT_CREATE_FAILED',
  SKU_CREATE_FAILED = 'SKU_CREATE_FAILED',
  DUPLICATE_PRODUCT = 'DUPLICATE_PRODUCT',

  // 发布阶段
  PUBLISH_FAILED = 'PUBLISH_FAILED',
  MISSING_REQUIRED_DATA = 'MISSING_REQUIRED_DATA',

  // 验证阶段
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  BRAND_NOT_FOUND = 'BRAND_NOT_FOUND',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * 批量处理错误
 */
export class BatchProcessingError extends Error {
  constructor(
    message: string,
    public readonly itemId: string,
    public readonly code: BatchErrorCode,
    public readonly retryable: boolean = true,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BatchProcessingError';

    // 确保 instanceof 正常工作
    Object.setPrototypeOf(this, BatchProcessingError.prototype);
  }

  /**
   * 创建一个可重试的错误
   */
  static retryable(
    message: string,
    itemId: string,
    code: BatchErrorCode,
    details?: Record<string, unknown>,
  ): BatchProcessingError {
    return new BatchProcessingError(message, itemId, code, true, details);
  }

  /**
   * 创建一个不可重试的错误
   */
  static fatal(
    message: string,
    itemId: string,
    code: BatchErrorCode,
    details?: Record<string, unknown>,
  ): BatchProcessingError {
    return new BatchProcessingError(message, itemId, code, false, details);
  }

  /**
   * 转换为可序列化对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      itemId: this.itemId,
      code: this.code,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

/**
 * 失败项详情
 */
export interface FailedItem {
  id: string;
  error: string;
  code?: BatchErrorCode;
  retryable?: boolean;
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof BatchProcessingError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 不可重试的错误模式（优先检查）
    const nonRetryablePatterns = [
      'invalid url',
      'invalid parameter',
      'validation failed',
      'not found in database',
      'duplicate',
      'already exists',
      'unauthorized',
      '401',
      '403',
      '400',
      'bad request',
    ];

    if (nonRetryablePatterns.some((pattern) => message.includes(pattern))) {
      return false;
    }

    // 可重试的错误模式
    const retryablePatterns = [
      'timeout',
      'econnrefused',
      'econnreset',
      'enotfound',
      'rate limit',
      'too many requests',
      'service unavailable',
      'temporarily unavailable',
      '503',
      '502',
      '504',
      '429',
      'network error',
      'fetch failed',
      'socket hang up',
      'aborted',
      // 锁竞争
      '无法获取锁',
      'lock',
      // AI API 特定错误
      'finish_reason=null',
      '响应被截断',
      'api 调用超时',
      'qwen vl api',
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  return false;
}

/**
 * 从错误中提取错误码
 */
export function extractErrorCode(error: unknown): BatchErrorCode {
  if (error instanceof BatchProcessingError) {
    return error.code;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 超时相关
    if (message.includes('timeout') || message.includes('aborted')) {
      if (message.includes('ai') || message.includes('qwen')) {
        return BatchErrorCode.AI_TIMEOUT;
      }
      return BatchErrorCode.FETCH_TIMEOUT;
    }

    // AI 分析相关
    if (
      message.includes('finish_reason=null') ||
      message.includes('响应被截断') ||
      message.includes('truncated')
    ) {
      return BatchErrorCode.AI_RESPONSE_TRUNCATED;
    }
    if (
      message.includes('ai') ||
      message.includes('qwen') ||
      message.includes('analysis')
    ) {
      return BatchErrorCode.AI_ANALYSIS_FAILED;
    }

    // 限流
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    ) {
      return BatchErrorCode.RATE_LIMITED;
    }

    // 网络
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return BatchErrorCode.NETWORK_ERROR;
    }

    // 重复
    if (message.includes('duplicate') || message.includes('already exists')) {
      return BatchErrorCode.DUPLICATE_PRODUCT;
    }

    // 验证
    if (message.includes('not found') || message.includes('validation')) {
      return BatchErrorCode.VALIDATION_FAILED;
    }

    // 无效 URL
    if (
      message.includes('invalid url') ||
      message.includes('invalid weidian')
    ) {
      return BatchErrorCode.INVALID_URL;
    }

    // 缺少数据
    if (message.includes('missing') || message.includes('required')) {
      return BatchErrorCode.MISSING_REQUIRED_DATA;
    }
  }

  return BatchErrorCode.UNKNOWN_ERROR;
}
