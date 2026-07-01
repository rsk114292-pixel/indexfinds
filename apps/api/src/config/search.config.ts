/**
 * 搜索系统配置
 *
 * 集中管理搜索相关的配置常量，支持通过环境变量覆盖
 */

/** 安全解析浮点数，NaN 时回退到默认值 */
function safeParseFloat(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** 安全解析整数，NaN 时回退到默认值 */
function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * BM25 算法配置
 */
export const BM25_CONFIG = {
  /** 词频饱和参数，通常 1.2-2.0，值越大对高频词的惩罚越小 */
  k1: safeParseFloat(process.env.BM25_K1, 1.5),
  /** 文档长度归一化参数，通常 0.75，值越大对长文档的惩罚越大 */
  b: safeParseFloat(process.env.BM25_B, 0.75),
} as const;

/**
 * 语义搜索配置
 */
export const SEMANTIC_CONFIG = {
  /** 向量维度（需与 embedding 模型匹配） */
  vectorDimensions: safeParseInt(process.env.VECTOR_DIMENSIONS, 384),
  /** 最小相似度阈值 */
  minSimilarity: safeParseFloat(process.env.SEMANTIC_MIN_SIMILARITY, 0.3),
  /** embedding 服务超时时间（毫秒） */
  embeddingTimeout: safeParseInt(process.env.EMBEDDING_TIMEOUT, 10000),
  /** 批量 embedding 超时时间（毫秒） */
  batchEmbeddingTimeout: safeParseInt(
    process.env.BATCH_EMBEDDING_TIMEOUT,
    30000,
  ),
} as const;

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  /** 默认每页数量 */
  defaultLimit: safeParseInt(process.env.DEFAULT_PAGE_LIMIT, 20),
  /** 最大每页数量 */
  maxLimit: safeParseInt(process.env.MAX_PAGE_LIMIT, 100),
  /** 最大页码（500 × 20 = 10000 条，已覆盖 Meilisearch maxTotalHits） */
  maxPage: safeParseInt(process.env.MAX_PAGE, 500),
} as const;

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  /** 分类树缓存 TTL（毫秒） */
  categoryTreeTTL: safeParseInt(process.env.CATEGORY_TREE_CACHE_TTL, 3600000), // 1小时
  /** CTR 缓存 TTL（毫秒） */
  ctrCacheTTL: safeParseInt(process.env.CTR_CACHE_TTL, 1800000), // 30分钟
  /** BM25 统计刷新间隔（毫秒） */
  bm25RefreshInterval: safeParseInt(process.env.BM25_REFRESH_INTERVAL, 1800000), // 30分钟
} as const;

/**
 * 召回配置
 */
export const RECALL_CONFIG = {
  /** 关键词召回数量 */
  keywordRecallLimit: safeParseInt(process.env.KEYWORD_RECALL_LIMIT, 100),
  /** 语义召回数量 */
  semanticRecallLimit: safeParseInt(process.env.SEMANTIC_RECALL_LIMIT, 50),
  /** 分类召回数量 */
  categoryRecallLimit: safeParseInt(process.env.CATEGORY_RECALL_LIMIT, 50),
  /** 兜底召回数量 */
  fallbackRecallLimit: safeParseInt(process.env.FALLBACK_RECALL_LIMIT, 20),
} as const;

/**
 * 混合搜索权重配置
 */
export const HYBRID_SEARCH_CONFIG = {
  /** 关键词搜索权重 */
  keywordWeight: safeParseFloat(process.env.KEYWORD_WEIGHT, 0.7),
  /** 语义搜索权重 */
  semanticWeight: safeParseFloat(process.env.SEMANTIC_WEIGHT, 0.3),
} as const;

/**
 * 热搜配置
 */
export const HOT_SEARCH_CONFIG = {
  /** 热搜展示数量 */
  displayLimit: safeParseInt(process.env.HOT_SEARCH_LIMIT, 10),
  /** 移动平均系数（用于平滑搜索次数统计） */
  movingAverageAlpha: safeParseFloat(process.env.HOT_SEARCH_MA_ALPHA, 0.1),
} as const;

/**
 * 搜索日志配置
 */
export const SEARCH_LOG_CONFIG = {
  /** 日志保留天数 */
  retentionDays: safeParseInt(process.env.SEARCH_LOG_RETENTION_DAYS, 90),
} as const;

/**
 * 搜索排名权重配置
 */
export const RANKING_WEIGHTS_CONFIG = {
  /** 相关性权重 */
  relevance: safeParseFloat(process.env.RANKING_RELEVANCE_WEIGHT, 0.6),
  /** CTR 权重 */
  ctr: safeParseFloat(process.env.RANKING_CTR_WEIGHT, 0.2),
  /** 新鲜度权重 */
  newness: safeParseFloat(process.env.RANKING_NEWNESS_WEIGHT, 0.2),
  /** 新鲜度半衰期（天） */
  newnessHalfLifeDays: safeParseInt(process.env.NEWNESS_HALF_LIFE_DAYS, 30),
} as const;

/**
 * 全文搜索配置
 */
export const FULL_TEXT_SEARCH_CONFIG = {
  /** pg_trgm 相似度阈值 */
  similarityThreshold: safeParseFloat(
    process.env.FTS_SIMILARITY_THRESHOLD,
    0.3,
  ),
  /** 建议词最大返回数量 */
  suggestionLimit: safeParseInt(process.env.FTS_SUGGESTION_LIMIT, 5),
} as const;

/**
 * 汇总导出
 */
export const SEARCH_CONFIG = {
  bm25: BM25_CONFIG,
  semantic: SEMANTIC_CONFIG,
  pagination: PAGINATION_CONFIG,
  cache: CACHE_CONFIG,
  recall: RECALL_CONFIG,
  hybridSearch: HYBRID_SEARCH_CONFIG,
  hotSearch: HOT_SEARCH_CONFIG,
  searchLog: SEARCH_LOG_CONFIG,
  rankingWeights: RANKING_WEIGHTS_CONFIG,
  fullTextSearch: FULL_TEXT_SEARCH_CONFIG,
} as const;

export type SearchConfig = typeof SEARCH_CONFIG;

/**
 * 校验配置有效性
 * 在应用启动时调用，确保配置参数合理
 */
export function validateSearchConfig(): void {
  const errors: string[] = [];

  // 校验排名权重之和应约等于 1.0（允许 ±0.01 误差）
  const { relevance, ctr, newness } = RANKING_WEIGHTS_CONFIG;
  const weightSum = relevance + ctr + newness;
  const tolerance = 0.01;

  if (Math.abs(weightSum - 1.0) > tolerance) {
    errors.push(
      `Ranking weights sum (${weightSum.toFixed(3)}) should be approximately 1.0 ` +
        `(relevance: ${relevance}, ctr: ${ctr}, newness: ${newness})`,
    );
  }

  // 校验权重值范围 [0, 1]
  if (relevance < 0 || relevance > 1) {
    errors.push(`Relevance weight (${relevance}) must be between 0 and 1`);
  }
  if (ctr < 0 || ctr > 1) {
    errors.push(`CTR weight (${ctr}) must be between 0 and 1`);
  }
  if (newness < 0 || newness > 1) {
    errors.push(`Newness weight (${newness}) must be between 0 and 1`);
  }

  // 校验 BM25 参数范围
  const { k1, b } = BM25_CONFIG;
  if (k1 < 0 || k1 > 3) {
    errors.push(`BM25 k1 parameter (${k1}) should be between 0 and 3`);
  }
  if (b < 0 || b > 1) {
    errors.push(`BM25 b parameter (${b}) must be between 0 and 1`);
  }

  // 校验分页参数
  const { defaultLimit, maxLimit } = PAGINATION_CONFIG;
  if (defaultLimit > maxLimit) {
    errors.push(
      `Default page limit (${defaultLimit}) cannot exceed max limit (${maxLimit})`,
    );
  }
  if (defaultLimit < 1) {
    errors.push(`Default page limit (${defaultLimit}) must be at least 1`);
  }

  // 如果有错误，抛出异常
  if (errors.length > 0) {
    throw new Error(
      `Search configuration validation failed:\n  - ${errors.join('\n  - ')}`,
    );
  }
}
