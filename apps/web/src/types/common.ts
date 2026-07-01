/**
 * 通用类型定义
 */

// API 响应包装类型
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
  totalPages?: number; // 部分 API 返回 totalPages 而非 lastPage
  searchLogId?: string; // 搜索追踪ID，用于记录曝光和点击
  usedFallback?: boolean; // 搜索回退标记，表示未命中精确结果
}

// API 错误类型
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      reason: string;
    }>;
  };
}

// 价格类型
export interface Price {
  min: number;
  max: number;
  currency: string;
}

// 图片类型
export interface Image {
  url: string;
  isMain: boolean;
}

// 多语言翻译类型
export interface Translations {
  [locale: string]: {
    name?: string;
    description?: string;
  };
}

/** 仪表盘统计数据 */
export interface DashboardStats {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
  totalUsers: number;
  pendingReviews: number;
  todayImports: number;
  recentProducts: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

/** 数据分析概览（外跳 + 推荐码） */
export interface OverviewData {
  clicks: { total: number; todayCount: number };
  referrals: {
    totalCodes: number;
    totalClicks: number;
    totalConversions: number;
  };
}
