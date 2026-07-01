import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ArrayMinSize,
} from 'class-validator';

// ========== Preview ==========

export class SkuSplitPreviewDto {
  @IsNotEmpty()
  @IsString()
  weidianUrl: string; // 微店链接或 itemId
}

export interface VariantDuplicateInfo {
  matchType: 'variant_key' | 'visual_similarity' | 'weidian_id';
  matchedProductId: string;
  matchedProductTitle?: string;
  matchedProductImage?: string;
  matchedShopName?: string;
  similarity?: number; // 0-100，仅 visual_similarity 时有值
}

export interface SkuVariantPreview {
  attrId: number;
  value: string;
  imageUrl: string;
  imageSource?:
    | 'attr_image'
    | 'sku_image'
    | 'main_fallback'
    | 'detail_fallback';
  imageConfidence?: 'high' | 'low';
  price: number;
  skuCount: number;
  sizes: string[];
  duplicateInfo?: VariantDuplicateInfo;
}

export interface SkuSplitPlanResponse {
  weidianItemId: string;
  weidianTitle?: string;
  splitDimension: string;
  totalVariants: number;
  variants: SkuVariantPreview[];
  duplicateCount?: number;
}

// ========== Execute ==========

export class SkuSplitExecuteDto {
  @IsNotEmpty()
  @IsString()
  weidianItemId: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectedAttrIds?: number[]; // 选择性拆分（不传则全部）

  @IsOptional()
  @IsString()
  batchId?: string; // 批量拆分的批次 ID
}

export class SkuSplitAutoBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  weidianUrls: string[];
}

export interface SkuSplitJobResponse {
  jobId: string;
  productGroupId: string;
  totalVariants: number;
  status: string;
}

// ========== Job Status ==========

export interface ProcessingLogEntry {
  ts: string;
  event: string;
  data?: Record<string, unknown>;
}

export interface SkuSplitPublishDecisionStats {
  active: number;
  pendingReview: number;
}

export interface SkuSplitFailureReasonStat {
  code: string;
  label: string;
  count: number;
  actionableCount: number;
}

export interface SkuSplitItemResponse {
  id: string;
  attrId: number;
  variantValue: string;
  imageUrl: string;
  price: number;
  skuCount: number;
  status: string;
  productId?: string;
  errorMessage?: string;
  publishDecision?: 'active' | 'pending_review' | null;
  actionable?: boolean;
  failureReasonCode?: string;
  failureReasonLabel?: string;
  suggestedAction?: string;
  processingLog?: ProcessingLogEntry[];
}

// ========== List (grouped) ==========

export interface SkuSplitListEntry {
  type: 'batch' | 'single';
  entryId: string; // batchId or jobId
  batchKind?: 'legacy_job_group' | 'auto_batch';
  progressUnit?: 'variants' | 'urls';
  jobCount: number;
  totalVariants: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  skippedCount?: number;
  cancelledCount?: number;
  processedCount: number;
  actionableFailureCount: number;
  publishDecisionStats: SkuSplitPublishDecisionStats;
  failureReasonStats: SkuSplitFailureReasonStat[];
  status: string;
  createdAt: string;
  completedAt?: string;
  // single only
  weidianItemId?: string;
  weidianTitle?: string;
  splitDimension?: string;
  sourceUrl?: string;
  productGroupId?: string;
}

export interface SkuSplitListResponse {
  data: SkuSplitListEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SkuSplitAutoBatchResponse {
  batchId: string;
  totalUrls: number;
  status: string;
  createdAt: string;
}

export interface SkuSplitAutoBatchRetryResponse {
  batchId: string;
  retryCount: number;
  status: string;
}

export interface SkuSplitAutoBatchItemResponse {
  id: string;
  sourceUrl: string;
  status: string;
  weidianItemId?: string;
  splitJobId?: string;
  splitJobStatus?: string;
  splitJobTitle?: string;
  selectedCount: number;
  errorMessage?: string;
  actionable?: boolean;
  failureStage?: 'preview' | 'create_job' | 'split_job';
  failureReasonCode?: string;
  failureReasonLabel?: string;
  failureReasonStats?: SkuSplitFailureReasonStat[];
  suggestedAction?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface SkuSplitAutoBatchDetailResponse {
  id: string;
  status: string;
  totalUrls: number;
  processedUrls: number;
  successUrls: number;
  failedUrls: number;
  skippedUrls: number;
  cancelledUrls: number;
  createdAt: string;
  completedAt?: string;
  items: SkuSplitAutoBatchItemResponse[];
}

export interface SkuSplitJobDetailResponse {
  id: string;
  status: string;
  weidianItemId: string;
  weidianTitle?: string;
  splitDimension: string;
  sourceUrl?: string;
  productGroupId: string;
  totalVariantCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  actionableFailureCount: number;
  publishDecisionStats: SkuSplitPublishDecisionStats;
  failureReasonStats: SkuSplitFailureReasonStat[];
  createdAt: string;
  completedAt?: string;
  items: SkuSplitItemResponse[];
}
