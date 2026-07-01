export interface VariantDuplicateInfo {
  matchType: 'variant_key' | 'visual_similarity' | 'weidian_id';
  matchedProductId: string;
  matchedProductTitle?: string;
  matchedProductImage?: string;
  matchedShopName?: string;
  similarity?: number;
}

export interface SkuVariant {
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

export interface SplitPreview {
  weidianItemId: string;
  weidianTitle?: string;
  splitDimension: string;
  totalVariants: number;
  variants: SkuVariant[];
  duplicateCount?: number;
}

export const matchTypeLabels: Record<string, string> = {
  variant_key: '变体键匹配',
  visual_similarity: '视觉相似',
  weidian_id: '微店 ID 匹配',
};
