/**
 * 批量任务相关事件定义
 */

export const BatchEvents = {
  // 任务生命周期
  JOB_CREATED: 'batch.job.created',
  JOB_STARTED: 'batch.job.started',
  JOB_COMPLETED: 'batch.job.completed',
  JOB_FAILED: 'batch.job.failed',
  JOB_CANCELLED: 'batch.job.cancelled',

  // 项目处理
  ITEM_PROCESS_REQUEST: 'batch.item.process.request',
  ITEM_PROCESS_COMPLETED: 'batch.item.process.completed',
  ITEM_PROCESS_FAILED: 'batch.item.process.failed',

  // 发布事件
  ITEM_PUBLISH_REQUEST: 'batch.item.publish.request',
  ITEM_PUBLISH_COMPLETED: 'batch.item.publish.completed',
} as const;

// ===== 事件载荷类型 =====

export interface BatchJobCreatedEvent {
  jobId: string;
  type: 'weidian_import' | 'product_update' | 'bulk_publish';
  totalItems: number;
  createdAt: Date;
}

export interface BatchJobStartedEvent {
  jobId: string;
  startedAt: Date;
}

export interface BatchJobCompletedEvent {
  jobId: string;
  successCount: number;
  failCount: number;
  completedAt: Date;
}

export interface BatchJobFailedEvent {
  jobId: string;
  error: string;
  failedAt: Date;
}

export interface BatchItemProcessRequestEvent {
  requestId: string;
  jobId: string;
  itemId: string;
  type: 'weidian_import';
  data: {
    url?: string;
    itemId?: string;
    categoryId?: string;
  };
}

export interface BatchItemProcessCompletedEvent {
  requestId: string;
  jobId: string;
  itemId: string;
  productId?: string;
  success: boolean;
  error?: string;
}

export interface BatchItemPublishRequestEvent {
  requestId: string;
  jobId: string;
  itemId: string;
  productId: string;
}

export interface BatchItemPublishCompletedEvent {
  requestId: string;
  jobId: string;
  itemId: string;
  success: boolean;
  error?: string;
}
