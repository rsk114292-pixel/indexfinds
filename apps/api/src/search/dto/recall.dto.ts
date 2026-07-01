import { Product } from '../../products/entities/product.entity';

/**
 * 召回来源类型
 */
export type RecallSource = 'keyword' | 'semantic' | 'category' | 'fallback';

/**
 * 召回候选项
 */
export interface RecallCandidate {
  productId: string;
  source: RecallSource;
  score: number; // 0-1 归一化分数
  product?: Product;
}

/**
 * 召回配置
 */
export interface RecallConfig {
  keywordLimit: number; // 关键词召回上限
  semanticLimit: number; // 语义召回上限
  categoryLimit: number; // 分类召回上限
  fallbackLimit: number; // 兜底商品数量
  semanticMinSimilarity: number; // 语义相似度阈值
}

/**
 * 默认召回配置
 */
export const DEFAULT_RECALL_CONFIG: RecallConfig = {
  keywordLimit: 500,
  semanticLimit: 200,
  categoryLimit: 300,
  fallbackLimit: 50,
  semanticMinSimilarity: 0.25,
};

/**
 * 召回结果
 */
export interface RecallResult {
  candidates: RecallCandidate[];
  sources: Record<RecallSource, number>;
  timing: {
    keywordMs: number;
    semanticMs: number;
    categoryMs: number;
    mergeMs: number;
    totalMs: number;
  };
  isEmpty: boolean;
  usedFallback: boolean;
}

/**
 * 排序权重配置
 */
export interface RankingWeights {
  keyword: number; // 关键词匹配权重
  semantic: number; // 语义相似度权重
}

/**
 * 默认排序权重
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  keyword: 0.6,
  semantic: 0.4,
};
