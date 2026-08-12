/**
 * 商品相关类型
 */
import type { Price } from './common';
import type { CategorySimple, Breadcrumb } from './category';
import type { BrandSimple } from './brand';
import type { SKU } from './sku';

/** AI 属性（从产品 AI 分析中提取） */
export interface AIAttributes {
  colors?: string[];
  styles?: string[];
  genders?: string[];
  gender?: string;
  occasions?: string[];
  seasons?: string[];
  sizes?: string[];
}

export type ProductQcMediaType = 'image' | 'video';

export interface ProductQcMedia {
  id?: string;
  type: ProductQcMediaType;
  url: string;
  posterUrl?: string | null;
  mimeType?: string | null;
  duration?: number | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductQcPhoto = ProductQcMedia;

export interface Product {
  id: string;
  title: string;
  slug: string;
  description?: string;
  images: string[];  // API 返回的是字符串数组
  mainImage: string;
  detailImages?: string[];  // 微店详情描述图片
  qcMedia?: ProductQcMedia[];
  qcPhotos?: ProductQcPhoto[];
  price?: Price;
  brand?: BrandSimple | null;  // 品牌关联（归一化后）
  brandId?: string;
  aiBrandName?: string;  // AI 识别的原始品牌名（用于追溯）
  brandConfidence?: number;  // AI 品牌识别置信度
  primaryCategory?: CategorySimple;
  secondaryCategories?: CategorySimple[];
  breadcrumbs?: Breadcrumb[];
  attributes?: Record<string, string> | null;
  aiAttributes?: AIAttributes | null;
  skus?: SKU[];
  sourceUrl?: string;
  viewCount?: number;
  salesCount?: number;
  popularityScore?: number;
  qcPhotoCount?: number;
  isFeatured?: boolean;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  originalTitle?: string;
  status?: string;
  primaryCategoryId?: string;
  secondaryCategoryIds?: string[];
  hasEmbedding?: boolean;
  weidianShopName?: string;
  weidianShopId?: string;
  weidianItemId?: string;
  createdAt?: string;
  updatedAt?: string;

  // SKU 拆分支持
  productGroupId?: string;
  isFromSplit?: boolean;
  skuVariantKey?: string;
  splitSourceWeidianId?: string;
}

export interface AdminProductShopOption {
  shopId: string;
  shopName: string;
  productCount: number;
  pendingReviewCount: number;
  withoutQcCount: number;
  deadLinkCount: number;
}

export interface AdminProductShopOverview {
  data: AdminProductShopOption[];
  meta: {
    totalProducts: number;
    totalShops: number;
    missingProductCount: number;
    pendingReviewCount: number;
    withoutQcCount: number;
    deadLinkCount: number;
  };
}

export interface ProductListItem {
  id: string;
  title: string;
  slug: string;
  price: Price;
  mainImage: string;
  secondImage?: string;  // 第二张图（桌面端 hover 切换用）
  images?: string[];
  popularityScore?: number;  // 热门分数（Hot badge 用）
  isFeatured?: boolean;  // 推荐商品（自动带 Hot 标）
  brand?: BrandSimple | null;  // 品牌关联
  aiBrandName?: string;  // AI 识别的原始品牌名
  primaryCategory?: CategorySimple;  // 可选，visual search 等场景可能没有
  qcPhotoCount?: number;
  viewCount?: number;
  salesCount?: number;
  weidianShopName?: string;
  sourceUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated Use price.min instead */
  priceMin?: number;
  /** @deprecated Use price.max instead */
  priceMax?: number;
  /** @deprecated Use price.currency instead */
  currency?: string;
}

/** 收藏列表项（带 favoriteId） */
export interface FavoriteItem extends ProductListItem {
  favoriteId?: string;
}

/** 收藏 API 响应中的合集 */
export interface CollectionResponse {
  id: string;
  name: string;
  itemCount?: number;
}

/** 以图搜图结果 */
export interface VisualSearchResult {
  product: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    images: string[];
    priceMin: number;
    priceMax: number;
    currency?: string;
  };
  similarity: number;
  matchedImage?: string;
}

/** 产品表单数据（Ant Design Form 提交格式） */
export interface ProductFormData {
  slug?: string;
  title: string;
  originalTitle?: string;
  description?: string;
  brandId?: string;
  primaryCategoryId?: string;
  secondaryCategoryIds?: string[];
  images: string[];
  qcMedia?: ProductQcMedia[];
  qcPhotos?: ProductQcPhoto[];
  priceMin?: number;
  priceMax?: number;
  status?: string;
  aiAttributes?: AIAttributes | null;
  weidianShopName?: string;
  weidianShopId?: string;
  weidianItemId?: string;
  splitSourceWeidianId?: string;
  sourceUrl?: string;
}

/** 处理日志条目 */
export interface ProcessingLogEntry {
  ts: string;
  event: string;
  data?: Record<string, unknown>;
}

/** 批量导入单条项目 */
export interface BatchItem {
  id: string;
  sourceUrl: string;
  status: string;
  errorMessage?: string | null;
  weidianItemId?: string | null;
  processedAt?: string | null;
  processingLog?: ProcessingLogEntry[] | null;
}

/** 批量导入任务 */
export interface BatchJob {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  inProgressItems?: number;
  createdAt?: string;
  completedAt?: string | null;
  items?: BatchItem[];
  activeItems?: BatchItem[];
  recentItems?: BatchItem[];
}

/** 审核项目数据块（半结构化 JSON） */
export interface ReviewItemData {
  title?: string;
  slug?: string;
  description?: string;
  aiBrandName?: string;
  brandName?: string;
  primaryCategoryId?: string;
  images?: string[];
  attributes?: {
    colors?: string[];
    styles?: string[];
    occasions?: string[];
    seasons?: string[];
    gender?: string;
  };
  duplicateOf?: {
    productId: string;
    title: string;
    slug: string;
    mainImage: string;
    similarity: number;
  };
  [key: string]: unknown;
}

/** AI 审核项目 */
export interface ReviewItem {
  id: string;
  status: string;
  sourceUrl: string;
  sourceData?: ReviewItemData;
  aiGeneratedData?: ReviewItemData;
  finalData?: ReviewItemData;
  aiBrandName?: string;
  brandConfidence?: number;
}

/** 混合产品（含多品牌） */
export interface MixedProduct {
  id: string;
  title: string;
  originalTitle?: string;
  mainImage?: string;
  images?: string[];
  mixednessScore?: number;
  status: string;
  sourceUrl?: string;
  weidianItemId?: string;
  aiBrandName?: string;
  splitMetadata?: {
    suggestedGroups?: Array<{
      groupKey: string;
      brand: string;
      model: string;
    }>;
    overallConfidence?: number;
  };
  brand?: { id: string; name: string; slug: string };
  primaryCategory?: { id: string; name: string; slug: string };
  createdAt: string;
}

/** 混合产品列表 API 响应 */
export interface MixedProductsResponse {
  items: MixedProduct[];
  total: number;
  page: number;
  limit: number;
}
