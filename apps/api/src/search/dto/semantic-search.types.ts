/**
 * 语义搜索过滤器
 */
export interface SemanticSearchFilters {
  genders?: string;
  brands?: string;
  category?: string;
}

/**
 * 语义搜索结果
 */
export interface SemanticSearchResult {
  productId: string;
  similarity: number;
  product?: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    priceMin: number;
    priceMax: number;
  };
}

/**
 * 混合搜索结果
 */
export interface HybridSearchResult {
  productId: string;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
}

/**
 * 向量生成统计
 */
export interface EmbeddingGenerationStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

/**
 * 商品文本构建参数
 */
export interface ProductTextInput {
  title: string;
  description?: string;
  brand?: { name: string } | null;
  primaryCategory?: { name: string } | null;
  aiBrandName?: string;
  aiAttributes?: {
    colors?: string[];
    styles?: string[];
    occasions?: string[];
    seasons?: string[];
    gender?: string;
  } | null;
}
