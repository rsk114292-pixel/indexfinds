import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingGenerationService } from './embedding-generation.service';
import { GenderFilterBuilder } from './utils/gender-filter.builder';

// Re-export types for backward compatibility
export type {
  SemanticSearchFilters,
  SemanticSearchResult,
  HybridSearchResult,
  EmbeddingGenerationStats,
  ProductTextInput,
} from './dto/semantic-search.types';

import type {
  SemanticSearchFilters,
  SemanticSearchResult,
  HybridSearchResult,
  EmbeddingGenerationStats,
  ProductTextInput,
} from './dto/semantic-search.types';

/**
 * SemanticSearchService - Facade 服务
 *
 * 聚合以下子服务：
 * - EmbeddingGenerationService: 向量生成
 */
@Injectable()
export class SemanticSearchService implements OnModuleInit {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingGenerationService,
  ) {}

  /**
   * 模块初始化 — 仅做健康检查和表存在性验证
   * DDL（CREATE TABLE / CREATE INDEX）已迁移至 migrations/search-system-ddl.sql
   */
  async onModuleInit() {
    await this.embeddingService.checkServiceHealth();
    await this.verifyTableExists();
    this.logger.log(
      `Semantic search service initialized, embedding available: ${this.embeddingService.isAvailable()}`,
    );
  }

  private async verifyTableExists(): Promise<void> {
    try {
      await this.dataSource.query(
        `SELECT 1 FROM product_text_embeddings LIMIT 0`,
      );
    } catch {
      this.logger.warn(
        'product_text_embeddings table not found. Please run migrations/search-system-ddl.sql',
      );
    }
  }

  // ============================================================
  // 委托给 EmbeddingGenerationService
  // ============================================================

  /**
   * 检查 embedding 服务是否可用
   * @returns true 表示服务可用，可以生成向量
   */
  isAvailable(): boolean {
    return this.embeddingService.isAvailable();
  }

  /**
   * 刷新 embedding 服务可用性状态
   * 主动发送健康检查请求，更新服务状态
   * @returns 最新的服务可用性状态
   */
  async refreshServiceAvailability(): Promise<boolean> {
    return this.embeddingService.checkServiceHealth();
  }

  /**
   * 构建商品的文本表示（用于生成向量）
   * 格式："{title} {brand} {category} {description}"
   * @param product 商品信息
   * @returns 合并后的文本字符串
   */
  buildProductText(product: ProductTextInput): string {
    return this.embeddingService.buildProductText(product);
  }

  /**
   * 为单个文本生成 embedding 向量
   * @param text 输入文本
   * @returns 向量数组（384维），失败返回 null
   */
  async generateTextEmbedding(text: string): Promise<number[] | null> {
    return this.embeddingService.generateTextEmbedding(text);
  }

  /**
   * 批量为多个文本生成 embedding 向量
   * 适用于需要一次性处理多个查询或商品文本的场景
   * @param texts 输入文本数组
   * @returns 向量数组，每个元素对应一个输入文本的向量（384维），失败的文本返回 null
   * @example
   * ```typescript
   * const texts = ['red dress', 'blue jeans', 'white shirt'];
   * const embeddings = await service.batchGenerateTextEmbeddings(texts);
   * // embeddings[0] 是 'red dress' 的向量，embeddings[1] 是 'blue jeans' 的向量
   * ```
   */
  async batchGenerateTextEmbeddings(
    texts: string[],
  ): Promise<(number[] | null)[]> {
    return this.embeddingService.batchGenerateTextEmbeddings(texts);
  }

  /**
   * 为单个商品生成 embedding 向量
   * @param productId 商品ID
   * @returns true 表示生成成功
   */
  async generateProductEmbedding(productId: string): Promise<boolean> {
    return this.embeddingService.generateProductEmbedding(productId);
  }

  /**
   * 批量生成商品 embedding 向量
   * @param limit 每批处理数量，默认100
   * @param forceRegenerate 是否强制重新生成已有向量，默认false
   * @returns 生成统计信息（总数、成功、失败、跳过）
   */
  async batchGenerateEmbeddings(
    limit = 100,
    forceRegenerate = false,
  ): Promise<EmbeddingGenerationStats> {
    return this.embeddingService.batchGenerateEmbeddings(
      limit,
      forceRegenerate,
    );
  }

  // ============================================================
  // 搜索方法
  // ============================================================

  /**
   * 语义搜索
   * @param skipHealthCheck 跳过健康检查（内部调用时使用，避免重复检查）
   */
  async semanticSearch(
    query: string,
    limit = 20,
    minSimilarity = 0.3,
    filters?: SemanticSearchFilters,
    maxRetries = 2,
    skipHealthCheck = false,
  ): Promise<SemanticSearchResult[]> {
    if (!skipHealthCheck && !this.embeddingService.isAvailable()) {
      const refreshed = await this.embeddingService.checkServiceHealth();
      if (!refreshed) return [];
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeSemanticSearch(
          query,
          limit,
          minSimilarity,
          filters,
        );
      } catch (error) {
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 100;
          this.logger.warn(
            `Semantic search attempt ${attempt + 1} failed, retrying in ${backoffMs}ms`,
          );
          await new Promise((r) => setTimeout(r, backoffMs));
        } else {
          this.logger.error(
            `Semantic search failed after ${maxRetries + 1} attempts: ${error.message}`,
          );
        }
      }
    }
    return [];
  }

  /**
   * 执行语义搜索（内部方法）
   * 将查询文本转换为向量，然后在数据库中进行向量相似度搜索
   * @param query 搜索查询文本
   * @param limit 返回结果数量上限
   * @param minSimilarity 最小相似度阈值（0-1之间），低于此值的结果将被过滤
   * @param filters 可选的搜索过滤条件（如性别筛选）
   * @returns 搜索结果数组，包含商品信息和相似度分数
   * @throws 当向量生成或数据库查询失败时抛出异常
   */
  private async executeSemanticSearch(
    query: string,
    limit: number,
    minSimilarity: number,
    filters?: SemanticSearchFilters,
  ): Promise<SemanticSearchResult[]> {
    const queryEmbedding =
      await this.embeddingService.generateTextEmbedding(query);
    if (!queryEmbedding) {
      this.logger.warn(
        `语义搜索: 无法生成查询向量, query="${query}", embeddingAvailable=${this.embeddingService.isAvailable()}`,
      );
      return [];
    }
    this.logger.debug(
      `语义搜索: 查询向量生成成功, query="${query}", dim=${queryEmbedding.length}`,
    );

    const conditions: string[] = [
      "p.status = 'active'",
      '1 - (pte.embedding <=> $1::vector) >= $2',
    ];
    const params: (string | number)[] = [
      `[${queryEmbedding.join(',')}]`,
      minSimilarity,
      limit,
    ];
    let paramIndex = 4;

    if (filters?.genders) {
      const genderFilter = GenderFilterBuilder.buildRawSqlCondition(
        filters.genders,
        paramIndex,
        'p',
      );
      if (genderFilter.sql) {
        conditions.push(genderFilter.sql);
        params.push(...genderFilter.params);
        paramIndex = genderFilter.nextParamIndex;
      }
    }

    const sql = `
      SELECT pte.product_id, 1 - (pte.embedding <=> $1::vector) as similarity,
             p.id, p.title, p.slug, p."mainImage", p."priceMin", p."priceMax"
      FROM product_text_embeddings pte
      JOIN products p ON p.id = pte.product_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pte.embedding <=> $1::vector
      LIMIT $3
    `;

    const results = await this.dataSource.query(sql, params);

    this.logger.debug(
      `语义搜索: query="${query}", minSimilarity=${minSimilarity}, 结果数=${results.length}`,
    );

    return results.map(
      (row: {
        product_id: string;
        similarity: string;
        id: string;
        title: string;
        slug: string;
        mainImage: string;
        priceMin: string;
        priceMax: string;
      }) => ({
        productId: row.product_id,
        similarity: parseFloat(row.similarity),
        product: {
          id: row.id,
          title: row.title,
          slug: row.slug,
          mainImage: row.mainImage,
          priceMin: parseFloat(row.priceMin),
          priceMax: parseFloat(row.priceMax),
        },
      }),
    );
  }

  /**
   * 混合搜索 - 结合关键词搜索和语义搜索结果
   * 通过加权融合两种搜索方式，提供更准确和全面的搜索结果
   * @param keywordResults 关键词搜索结果数组，包含商品ID和分数
   * @param query 原始搜索查询文本
   * @param keywordWeight 关键词搜索权重，默认 0.7
   * @param semanticWeight 语义搜索权重，默认 0.3
   * @returns 混合搜索结果数组，按综合分数降序排序，包含以下字段：
   *   - productId: 商品ID
   *   - keywordScore: 归一化后的关键词分数（0-1）
   *   - semanticScore: 语义相似度分数（0-1）
   *   - combinedScore: 加权综合分数
   * @example
   * ```typescript
   * const keywordResults = [
   *   { productId: 'p1', score: 10.5 },
   *   { productId: 'p2', score: 8.3 }
   * ];
   * const results = await service.hybridSearch(
   *   keywordResults,
   *   'comfortable shoes for running',
   *   0.6,  // 关键词权重
   *   0.4   // 语义权重
   * );
   * ```
   */
  async hybridSearch(
    keywordResults: Array<{ productId: string; score: number }>,
    query: string,
    keywordWeight = 0.7,
    semanticWeight = 0.3,
  ): Promise<HybridSearchResult[]> {
    if (!this.embeddingService.isAvailable()) {
      await this.embeddingService.checkServiceHealth();
    }

    if (!this.embeddingService.isAvailable()) {
      return keywordResults.map((r) => ({
        productId: r.productId,
        keywordScore: r.score,
        semanticScore: 0,
        combinedScore: r.score,
      }));
    }

    try {
      // 跳过健康检查，因为上面已经检查过了
      const semanticResults = await this.semanticSearch(
        query,
        50,
        0.2,
        undefined,
        2,
        true,
      );
      const semanticScoreMap = new Map<string, number>();
      for (const result of semanticResults) {
        semanticScoreMap.set(result.productId, result.similarity);
      }

      const maxKeywordScore = Math.max(
        ...keywordResults.map((r) => r.score),
        1,
      );
      const hybridResults: HybridSearchResult[] = [];
      const seenProductIds = new Set<string>();

      for (const result of keywordResults) {
        const normalizedKeywordScore = result.score / maxKeywordScore;
        const semanticScore = semanticScoreMap.get(result.productId) || 0;
        const combinedScore =
          normalizedKeywordScore * keywordWeight +
          semanticScore * semanticWeight;

        hybridResults.push({
          productId: result.productId,
          keywordScore: normalizedKeywordScore,
          semanticScore,
          combinedScore,
        });
        seenProductIds.add(result.productId);
      }

      for (const result of semanticResults) {
        if (!seenProductIds.has(result.productId)) {
          hybridResults.push({
            productId: result.productId,
            keywordScore: 0,
            semanticScore: result.similarity,
            combinedScore: result.similarity * semanticWeight,
          });
        }
      }

      hybridResults.sort((a, b) => b.combinedScore - a.combinedScore);
      return hybridResults;
    } catch (error) {
      this.logger.error(`Hybrid search failed: ${error.message}`);
      return keywordResults.map((r) => ({
        productId: r.productId,
        keywordScore: r.score,
        semanticScore: 0,
        combinedScore: r.score,
      }));
    }
  }

  /**
   * 判断查询是否适合使用语义搜索
   * 检查条件：
   * 1. embedding 服务可用
   * 2. 查询包含3个以上单词
   * 3. 包含自然语言模式（for, to, with, like 等）
   * @param query 搜索查询字符串
   * @returns true 表示适合使用语义搜索，false 表示建议使用关键词搜索
   * @example
   * ```typescript
   * shouldUseSemanticSearch('red dress'); // false (只有2个词)
   * shouldUseSemanticSearch('dress for wedding party'); // true (包含自然语言模式 'for')
   * shouldUseSemanticSearch('something casual to wear'); // true (包含 'something', 'to', 'casual')
   * ```
   */
  shouldUseSemanticSearch(query: string): boolean {
    if (!this.embeddingService.isAvailable()) return false;

    const words = query.trim().split(/\s+/);
    if (words.length <= 2) return false;

    const naturalLanguagePatterns = [
      /\bfor\b/i,
      /\bto\b/i,
      /\bwith\b/i,
      /\blike\b/i,
      /\bsomething\b/i,
      /\boutfit\b/i,
      /\blook\b/i,
      /\bstyle\b/i,
      /\bwear\b/i,
      /\bgoing\b/i,
      /\bvacation\b/i,
      /\bparty\b/i,
      /\bwedding\b/i,
      /\bcasual\b/i,
      /\bformal\b/i,
    ];

    return naturalLanguagePatterns.some((pattern) => pattern.test(query));
  }

  /**
   * 获取语义搜索统计信息
   * 返回当前系统中商品向量的生成情况和服务状态
   * @returns 统计对象，包含以下字段：
   *   - totalProducts: 活跃商品总数
   *   - productsWithEmbedding: 已生成向量的商品数
   *   - coverageRate: 向量覆盖率（0-1之间的小数）
   *   - serviceAvailable: embedding 服务是否可用
   * @example
   * ```typescript
   * const stats = await service.getStats();
   * console.log(`向量覆盖率: ${(stats.coverageRate * 100).toFixed(2)}%`);
   * console.log(`已处理: ${stats.productsWithEmbedding} / ${stats.totalProducts}`);
   * ```
   */
  async getStats(): Promise<{
    totalProducts: number;
    productsWithEmbedding: number;
    coverageRate: number;
    serviceAvailable: boolean;
  }> {
    try {
      const [totalResult] = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM products WHERE status = 'active'`,
      );
      const [embeddingResult] = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM product_text_embeddings pte
        INNER JOIN products p ON pte.product_id = p.id WHERE p.status = 'active'
      `);

      const totalProducts = parseInt(totalResult.count, 10);
      const productsWithEmbedding = parseInt(embeddingResult.count, 10);

      return {
        totalProducts,
        productsWithEmbedding,
        coverageRate:
          totalProducts > 0 ? productsWithEmbedding / totalProducts : 0,
        serviceAvailable: this.embeddingService.isAvailable(),
      };
    } catch {
      return {
        totalProducts: 0,
        productsWithEmbedding: 0,
        coverageRate: 0,
        serviceAvailable: this.embeddingService.isAvailable(),
      };
    }
  }
}
