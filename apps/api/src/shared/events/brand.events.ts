/**
 * 品牌相关事件定义
 */

export const BrandEvents = {
  // 品牌生命周期事件
  CREATED: 'brand.created',
  UPDATED: 'brand.updated',
  DELETED: 'brand.deleted',

  // 品牌合并事件
  MERGED: 'brand.merged',

  // 品牌审核事件
  APPROVED: 'brand.approved',
  REJECTED: 'brand.rejected',

  // 响应事件
  MATCH_RESPONSE: 'brand.match.response',
} as const;

// ===== 事件载荷类型 =====

export interface BrandCreatedEvent {
  brandId: string;
  name: string;
  slug: string;
  tier: number;
  createdAt: Date;
}

export interface BrandUpdatedEvent {
  brandId: string;
  changes: Record<string, unknown>;
  updatedAt: Date;
}

export interface BrandMergedEvent {
  sourceBrandId: string;
  targetBrandId: string;
  mergedAt: Date;
}

export interface BrandApprovedEvent {
  brandId: string;
  approvedBy?: string;
  approvedAt: Date;
}

export interface BrandRejectedEvent {
  brandId: string;
  reason?: string;
  rejectedBy?: string;
  rejectedAt: Date;
}
