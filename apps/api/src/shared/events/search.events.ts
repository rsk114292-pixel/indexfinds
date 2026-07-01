/**
 * 搜索模块相关事件定义
 */

export const SearchEvents = {
  // 索引更新
  INDEX_PRODUCT: 'search.index.product',
  INDEX_BATCH: 'search.index.batch',
  REMOVE_PRODUCT: 'search.remove.product',

  // Embedding 生成
  GENERATE_EMBEDDING_REQUEST: 'search.embedding.request',
  GENERATE_EMBEDDING_COMPLETED: 'search.embedding.completed',

  // 搜索日志
  SEARCH_LOGGED: 'search.logged',
  HOT_SEARCH_UPDATED: 'search.hot.updated',

  // 外跳追踪
  OUTBOUND_CLICK_RECORDED: 'search.outbound.click.recorded',
} as const;

// ===== 事件载荷类型 =====

export interface SearchIndexProductEvent {
  productId: string;
  title: string;
  brandName?: string;
  categoryName?: string;
  attributes?: Record<string, unknown>;
  action: 'create' | 'update';
}

export interface SearchIndexBatchEvent {
  productIds: string[];
  action: 'create' | 'update' | 'delete';
}

export interface SearchRemoveProductEvent {
  productId: string;
}

export interface SearchGenerateEmbeddingRequestEvent {
  requestId: string;
  productId: string;
  imageUrl: string;
}

export interface SearchGenerateEmbeddingCompletedEvent {
  requestId: string;
  productId: string;
  success: boolean;
  error?: string;
}

export interface SearchLoggedEvent {
  query: string;
  userId?: string;
  resultsCount: number;
  timestamp: Date;
}

export interface SearchHotUpdatedEvent {
  period: 'daily' | 'weekly';
  keywords: Array<{ keyword: string; count: number }>;
}

export interface OutboundClickRecordedEvent {
  productId: string;
}
