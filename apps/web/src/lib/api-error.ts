/**
 * API 错误处理工具
 * 提供统一的错误类型和友好的错误消息
 */

// API 错误码到用户友好消息的映射
const ERROR_MESSAGES: Record<string, string> = {
  // 认证相关
  UNAUTHORIZED: '请先登录',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_NOT_FOUND: '用户不存在',
  EMAIL_EXISTS: '邮箱已被注册',
  USERNAME_EXISTS: '用户名已被使用',

  // 商品相关
  PRODUCT_NOT_FOUND: '商品不存在或已下架',
  PRODUCT_OUT_OF_STOCK: '商品已售罄',
  SKU_NOT_FOUND: '该规格不存在',
  INVALID_PRODUCT_DATA: '商品数据无效',

  // 品牌相关
  BRAND_NOT_FOUND: '品牌不存在',
  BRAND_EXISTS: '品牌已存在',

  // 分类相关
  CATEGORY_NOT_FOUND: '分类不存在',

  // 收藏相关
  FAVORITE_EXISTS: '已经收藏过了',
  FAVORITE_NOT_FOUND: '收藏不存在',

  // 导入相关
  IMPORT_FAILED: '导入失败，请检查链接是否正确',
  INVALID_WEIDIAN_URL: '无效的微店链接',
  WEIDIAN_FETCH_FAILED: '获取微店数据失败，请稍后重试',

  // 通用错误
  BAD_REQUEST: '请求参数错误',
  FORBIDDEN: '没有权限执行此操作',
  NOT_FOUND: '请求的资源不存在',
  INTERNAL_ERROR: '服务器错误，请稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络',
  TIMEOUT: '请求超时，请稍后重试',
};

// HTTP 状态码到默认错误码的映射
const STATUS_TO_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  408: 'TIMEOUT',
  500: 'INTERNAL_ERROR',
  502: 'INTERNAL_ERROR',
  503: 'INTERNAL_ERROR',
  504: 'TIMEOUT',
};

/**
 * API 错误类
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /**
   * 获取用户友好的错误消息
   */
  get userMessage(): string {
    return ERROR_MESSAGES[this.code] || this.message || '发生未知错误';
  }

  /**
   * 是否是认证相关错误
   */
  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'TOKEN_EXPIRED';
  }

  /**
   * 是否是网络错误
   */
  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

/**
 * 从 Response 解析错误
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let code = STATUS_TO_CODE[response.status] || 'INTERNAL_ERROR';
  let message = response.statusText;
  let details: Record<string, unknown> | undefined;

  try {
    const data = await response.json();
    // 后端返回的结构化错误
    if (data.code) {
      code = data.code;
    }
    if (data.message) {
      message = data.message;
    }
    if (data.details) {
      details = data.details;
    }
  } catch {
    // JSON 解析失败，使用默认错误
  }

  return new ApiError(code, message, response.status, details);
}

/**
 * 从异常创建 ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new ApiError('NETWORK_ERROR', 'Network request failed', 0);
  }

  if (error instanceof Error) {
    return new ApiError('INTERNAL_ERROR', error.message, 500);
  }

  return new ApiError('INTERNAL_ERROR', String(error), 500);
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  return apiError.userMessage;
}
