import type { ComprehensiveProductAnalysis } from '../../ai/ai.types';

// ============================================================
// DTO Types for Mixed Product Service
// ============================================================

/**
 * SKU 到分组的映射
 */
export interface SkuGroupMapping {
  skuId: string;
  groupKey: string;
}

/**
 * 自定义分组（用于前端合并分组后传递）
 */
export interface CustomGroup {
  groupKey: string;
  brand: string;
  brandSlug?: string;
  model?: string;
  suggestedTitle?: string;
  originalGroupKeys?: string[]; // 被合并的原始分组键
}

/**
 * 拆分请求参数
 */
export interface SplitProductRequest {
  productId: string;
  skuMappings?: SkuGroupMapping[]; // 手动调整的 SKU 映射（可选）
  customGroups?: CustomGroup[]; // 自定义分组（合并后的分组）
  operatorId?: string; // 操作人 ID
}

/**
 * 拆分预览结果
 */
export interface SplitPreviewResult {
  sourceProduct: {
    id: string;
    title: string;
    weidianItemId: string;
    skuCount: number;
  };
  aiAnalysis: ComprehensiveProductAnalysis;
  suggestedMappings: SkuGroupMapping[];
  groups: Array<{
    groupKey: string;
    brand: string;
    brandSlug?: string;
    model: string;
    suggestedTitle: string;
    skuIds: string[];
    imageIndexes: number[];
  }>;
}

/**
 * 拆分执行结果
 */
export interface SplitExecutionResult {
  success: boolean;
  splitHistoryId: string;
  productGroupId: string;
  sourceProduct: {
    id: string;
    newStatus: string;
  };
  createdProducts: Array<{
    id: string;
    slug: string;
    title: string;
    skuCount: number;
    groupKey: string;
  }>;
  warnings: string[];
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  restoredProductId: string;
  deletedProductIds: string[];
  reason: string;
}

/**
 * 有效分组结构（内部使用）
 */
export interface ValidGroup {
  groupKey: string;
  brand: string;
  brandSlug?: string;
  model: string;
  suggestedTitle: string;
  originalGroupKeys?: string[];
  imageIndexes: number[];
}

/**
 * 混合商品详情
 */
export interface MixedProductDetail {
  product: import('../entities/product.entity').Product;
  skus: import('../entities/sku.entity').Sku[];
  splitMetadata: ComprehensiveProductAnalysis | null;
}

/**
 * 混合商品列表查询选项
 */
export interface MixedProductListOptions {
  page?: number;
  limit?: number;
  minMixednessScore?: number;
}

/**
 * 拆分历史查询选项
 */
export interface SplitHistoryListOptions {
  page?: number;
  limit?: number;
  weidianItemId?: string;
}
