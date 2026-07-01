export interface SkuGroupMapping {
  skuId: string;
  groupKey: string;
}

export interface SuggestedGroup {
  groupKey: string;
  brand: string;
  model: string;
  suggestedTitle: string;
  skuIds: string[];
  imageIndexes: number[];
}

export interface SplitPreview {
  sourceProduct: {
    id: string;
    title: string;
    weidianItemId: string;
    skuCount: number;
  };
  aiAnalysis: {
    overview: {
      totalImages: number;
      mixednessScore: {
        brandDiversity: number;
        modelDiversity: number;
        visualConsistency: number;
        overallScore: number;
      };
      isRecommendedToSplit: boolean;
      splitReason?: string;
      detectedBrands: string[];
      detectedModels: string[];
    };
    overallConfidence: number;
  };
  suggestedMappings: SkuGroupMapping[];
  groups: SuggestedGroup[];
}

export interface MixedProductDetail {
  product: {
    id: string;
    title: string;
    originalTitle?: string;
    mainImage?: string;
    images?: string[];
    mixednessScore?: number;
    sourceUrl?: string;
  };
  skus: Array<{
    id: string;
    attributes: Record<string, string>;
    price?: number;
    stock?: number;
    image?: string;
  }>;
  splitMetadata: SplitPreview['aiAnalysis'] | null;
}

export interface ImageGroup {
  imageUrl: string;
  skuIds: string[];
  sizeCount: number;
  colorAttr: string;
  price?: number;
  currentGroupKey?: string;
}

export interface SplitResult {
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

export type GroupMode = 'byModel' | 'byBrand';

export interface MergedGroup extends SuggestedGroup {
  originalGroupKeys: string[];
  mergedFrom?: string[];
  isCustom?: boolean;
}

export interface CustomGroup {
  groupKey: string;
  brand: string;
  model: string;
  suggestedTitle: string;
}
