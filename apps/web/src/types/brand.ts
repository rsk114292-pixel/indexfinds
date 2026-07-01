/**
 * 品牌相关类型
 */

export type BrandStatus =
  | 'active'
  | 'inactive'
  | 'pending_review'
  | 'merged'
  | 'rejected';

// tier: 1=核心品牌, 2=热门品牌, 0/3=长尾品牌
export type BrandTier = number;

export interface BrandFeaturedProduct {
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  priceMin: number;
  priceMax: number;
  currency: string;
}

export interface Brand {
  id: string;
  name: string; // 品牌标准名称
  slug: string;
  aliases?: string[];
  status: BrandStatus;
  tier: BrandTier; // 1=核心品牌, 2=热门品牌, 0/3=长尾品牌
  logoUrl?: string;
  description?: string;
  productCount?: number; // 关联商品数量（由后端动态计算）
  featuredProducts?: BrandFeaturedProduct[]; // 精选产品（前4个有图产品）
  metadata?: {
    aiConfidence?: number; // AI 识别置信度 (0-1)
    aiSource?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
    rejectReason?: string;
  };
  mergedIntoId?: string; // 合并目标品牌 ID
  mergedIntoName?: string; // 合并目标品牌名称
  parentId?: string;
  parent?: Brand;
  children?: Brand[];
  isIndependent?: boolean;
  isFeatured?: boolean; // 是否在首页精选位展示
  featuredSort?: number; // 精选排序，数字越小越靠前
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandSimple {
  id: string;
  name: string;
  slug: string;
}

export interface BrandCandidate {
  id: string;
  rawBrandName: string;
  normalizedBrandName: string;
  candidateKey: string;
  reviewStatus: string;
  confidence?: number | null;
  source?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  suggestedBrandId?: string | null;
  suggestedBrand?: Brand | null;
  suggestedRelationType?: string | null;
  hitCount: number;
  sampleProductCount: number;
  lastSeenAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandCandidateSignalBucket {
  label: string;
  count: number;
}

export interface BrandCandidateSampleProduct {
  id: string;
  title: string;
  slug: string;
  status: string;
  mainImage?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string | null;
  aiBrandName?: string | null;
  brandConfidence?: number | null;
  weidianShopName?: string | null;
  sourceUrl?: string | null;
  primaryCategory?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
  } | null;
  brand?: BrandSimple | null;
  matchConfidence?: number | null;
  candidateItemCreatedAt?: string;
}

export interface BrandCandidateDetail extends BrandCandidate {
  averageMatchConfidence?: number | null;
  riskFlags: string[];
  topCategories: BrandCandidateSignalBucket[];
  topShops: BrandCandidateSignalBucket[];
  sampleProducts: BrandCandidateSampleProduct[];
}
