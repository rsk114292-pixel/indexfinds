import {
  ProcessingStrategy,
  ComprehensiveProductAnalysis,
} from '../../ai/ai.types';
import type { ProductStatus } from '../../products/product-status';

/**
 * 微店抓取的原始数据结构
 * 存储在 BatchJobItem.sourceData
 */
export interface WeidianSourceData {
  // 基本信息
  title?: string;
  mainImage?: string;
  images?: string[];
  detailImages?: string[];

  // 价格信息
  priceMin?: number;
  priceMax?: number;

  // SKU 信息
  skus?: WeidianSkuData[];
  rawSkuInfo?: unknown;
  rawDetailDesc?: unknown;

  // 店铺信息
  shopId?: string;
  shopName?: string;
}

/**
 * 微店 SKU 数据
 */
export interface WeidianSkuData {
  skuId?: string;
  weidianSkuId?: string;
  attrIds?: number[];
  attributes?: Record<string, string>;
  skuKey?: string;
  price?: number;
  stock?: number;
  image?: string;
}

/**
 * AI 生成的数据结构
 * 存储在 BatchJobItem.aiGeneratedData
 */
export interface AiGeneratedData {
  // 基本信息
  title?: string;
  slug?: string;
  description?: string;

  // 品牌信息
  brandId?: string;
  brandName?: string;
  aiBrandName?: string;

  // 分类信息
  category?: string;
  primaryCategoryId?: string;

  // AI 属性
  attributes?: Record<string, unknown>;
  confidence?: number;

  // v2.1 混合商品检测信息
  isMixedProduct?: boolean;
  mixednessScore?: number;
  processingStrategy?: ProcessingStrategy;
  suggestedGroupCount?: number;
  comprehensiveAnalysis?: ComprehensiveProductAnalysis;

  // 主图 embedding（去重阶段缓存，供产品创建后同步写入）
  mainImageEmbedding?: number[];

  // 视觉去重结果
  duplicateOf?: {
    productId: string;
    title?: string;
    slug?: string;
    mainImage?: string;
    similarity: number;
  };
}

/**
 * 最终数据结构（用户编辑后）
 * 存储在 BatchJobItem.finalData
 */
export interface FinalProductData {
  // 基本信息
  title?: string;
  slug?: string;
  description?: string;

  // 品牌信息
  brandId?: string;
  brandName?: string;

  // 分类信息
  primaryCategoryId?: string;
  secondaryCategoryIds?: string[];

  // 属性
  attributes?: Record<string, unknown>;
  aiAttributes?: Record<string, unknown>;

  // 状态
  status?: string;
}

/**
 * 从批量导入项创建商品的输入参数
 * 复用 WeidianSourceData / AiGeneratedData，收窄创建时的必填字段
 */
export interface CreateFromBatchItemInput {
  sourceUrl: string;
  sourceData: WeidianSourceData;
  aiData: AiGeneratedData & { title: string; primaryCategoryId: string };
  status?: ProductStatus;
}

/**
 * 批量任务项状态更新数据
 */
export interface BatchItemUpdateData {
  productId?: string;
  errorMessage?: string;
  sourceData?: WeidianSourceData;
  aiGeneratedData?: AiGeneratedData;
  finalData?: FinalProductData;
  weidianItemId?: string;
}
