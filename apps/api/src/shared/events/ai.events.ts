/**
 * AI 服务相关事件定义
 */

export const AIEvents = {
  // 商品分析事件
  ANALYZE_REQUEST: 'ai.analyze.request',
  ANALYZE_RESPONSE: 'ai.analyze.response',
  ANALYZE_FAILED: 'ai.analyze.failed',

  // 品牌识别事件
  BRAND_DETECT_REQUEST: 'ai.brand_detect.request',
  BRAND_DETECT_RESPONSE: 'ai.brand_detect.response',

  // 分类推荐事件
  CATEGORY_SUGGEST_REQUEST: 'ai.category_suggest.request',
  CATEGORY_SUGGEST_RESPONSE: 'ai.category_suggest.response',

  // 标题优化事件
  TITLE_OPTIMIZE_REQUEST: 'ai.title_optimize.request',
  TITLE_OPTIMIZE_RESPONSE: 'ai.title_optimize.response',
} as const;

// ===== 事件载荷类型 =====

export interface AIAnalyzeRequestEvent {
  requestId: string;
  title: string;
  images: string[];
  description?: string;
  existingBrands?: string[];
  existingCategories?: string[];
}

export interface AIAnalyzeResponseEvent {
  requestId: string;
  success: boolean;
  result?: AIAnalysisResult;
  error?: string;
}

export interface AIAnalysisResult {
  suggestedTitle?: string;
  detectedBrand?: {
    name: string;
    confidence: number;
  };
  suggestedCategory?: {
    slug: string;
    confidence: number;
  };
  attributes?: {
    colors?: string[];
    styles?: string[];
    genders?: string[];
    seasons?: string[];
  };
}

export interface AIBrandDetectRequestEvent {
  requestId: string;
  title: string;
  existingBrands?: string[];
}

export interface AIBrandDetectResponseEvent {
  requestId: string;
  brandName: string | null;
  confidence: number;
}

export interface AICategorySuggestRequestEvent {
  requestId: string;
  title: string;
  brandName?: string;
}

export interface AICategorySuggestResponseEvent {
  requestId: string;
  categorySlug: string | null;
  confidence: number;
}

export interface AITitleOptimizeRequestEvent {
  requestId: string;
  originalTitle: string;
  brandName?: string;
  categoryName?: string;
}

export interface AITitleOptimizeResponseEvent {
  requestId: string;
  optimizedTitle: string;
}
