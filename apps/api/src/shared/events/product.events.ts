/**
 * 商品相关事件定义
 * 用于模块间解耦通信
 */

// ===== 事件名称常量 =====

export const ProductEvents = {
  // 商品生命周期事件
  CREATED: 'product.created',
  UPDATED: 'product.updated',
  DELETED: 'product.deleted',

  // 状态变更事件
  STATUS_CHANGED: 'product.status.changed',
  PUBLISHED: 'product.published',
  UNPUBLISHED: 'product.unpublished',

  // 导入事件
  IMPORT_STARTED: 'product.import.started',
  IMPORT_COMPLETED: 'product.import.completed',
  IMPORT_FAILED: 'product.import.failed',

  // 请求事件（用于跨模块数据获取）
  REQUEST_BRAND_MATCH: 'product.request.brand_match',
  REQUEST_AI_ANALYSIS: 'product.request.ai_analysis',
} as const;

// ===== 事件载荷类型 =====

export interface ProductCreatedEvent {
  productId: string;
  title: string;
  brandId?: string;
  primaryCategoryId: string;
  weidianItemId?: string;
  createdAt: Date;
}

export interface ProductUpdatedEvent {
  productId: string;
  changes: Record<string, unknown>;
  updatedAt: Date;
}

export interface ProductDeletedEvent {
  productId: string;
  deletedAt: Date;
}

export interface ProductStatusChangedEvent {
  productId: string;
  previousStatus: string;
  newStatus: string;
  action: string;
  changedAt: Date;
}

export interface ProductImportStartedEvent {
  importId: string;
  source: 'weidian' | 'taobao' | 'manual';
  sourceUrl?: string;
  sourceItemId?: string;
  startedAt: Date;
}

export interface ProductImportCompletedEvent {
  importId: string;
  productId: string;
  source: 'weidian' | 'taobao' | 'manual';
  skuCount: number;
  completedAt: Date;
}

export interface ProductImportFailedEvent {
  importId: string;
  source: 'weidian' | 'taobao' | 'manual';
  error: string;
  failedAt: Date;
}

// ===== 请求/响应事件（用于跨模块数据获取）=====

export interface BrandMatchRequestEvent {
  requestId: string;
  brandName: string;
  confidence?: number;
}

export interface BrandMatchResponseEvent {
  requestId: string;
  brandId?: string;
  brandName?: string;
  isNew: boolean;
}

export interface AIAnalysisRequestEvent {
  requestId: string;
  title: string;
  images: string[];
  description?: string;
}

export interface AIAnalysisResponseEvent {
  requestId: string;
  suggestedTitle?: string;
  suggestedCategorySlug?: string;
  suggestedBrandName?: string;
  attributes?: Record<string, unknown>;
}
