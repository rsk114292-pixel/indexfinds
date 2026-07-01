/**
 * 分类相关事件定义
 */

export const CategoryEvents = {
  CREATED: 'category.created',
  UPDATED: 'category.updated',
  DELETED: 'category.deleted',
} as const;

// ===== 事件载荷类型 =====

export interface CategoryUpdatedEvent {
  categoryId: string;
  changes: Record<string, unknown>;
  updatedAt: Date;
}
