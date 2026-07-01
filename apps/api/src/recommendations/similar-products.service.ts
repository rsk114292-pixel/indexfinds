import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { SemanticSearchService } from '../search/semantic-search.service';
import { VisualSearchService } from '../search/visual-search.service';

interface ScoredProduct {
  product: Product;
  score: number;
  textSimilarity: number;
  imageSimilarity: number;
}

type RecallQueryFn = (sql: string, params?: any[]) => Promise<any[]>;

@Injectable()
export class SimilarProductsService {
  private readonly logger = new Logger(SimilarProductsService.name);
  private static readonly IMAGE_RECALL_THRESHOLD_MULTIPLIER = 4;
  private static readonly MIN_IMAGE_RECALL_THRESHOLD = 24;
  private static readonly VECTOR_RECALL_TIMEOUT_MS = 6000;
  private readonly imageRecallEnabled =
    process.env.RECOMMENDATIONS_SIMILAR_IMAGE_RECALL_ENABLED === 'true';

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly visualSearchService: VisualSearchService,
  ) {}

  /**
   * 猜你喜欢：基于多信号打分 + MMR 多样性重排
   */
  async findSimilar(productId: string, limit = 12): Promise<Product[]> {
    const source = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });

    if (!source || source.status !== 'active') {
      return [];
    }

    try {
      // Phase 1: 候选集生成（属性/文本优先，图片召回按需触发）
      const candidates = await this.generateCandidates(source, limit);

      if (candidates.length === 0) {
        return this.fallbackByPopularity(source, limit);
      }

      // Phase 2: 多信号打分
      const scored = this.scoreProducts(source, candidates);

      // Phase 3: MMR 多样性重排
      const reranked = this.mmrRerank(scored, limit);

      return reranked.map((s) => s.product);
    } catch (error) {
      this.logger.error(
        `Failed to find similar products for ${productId}: ${error.message}`,
      );
      return this.fallbackByPopularity(source, limit);
    }
  }

  /**
   * Phase 1: 候选集生成 — 属性/文本优先，图片召回按需补充
   */
  private async generateCandidates(
    source: Product,
    limit: number,
  ): Promise<ScoredProduct[]> {
    const sourceGender = (source.aiAttributes as any)?.gender || null;

    const genderCondition = sourceGender
      ? `AND (p."aiAttributes"::jsonb->>'gender' IS NULL
           OR p."aiAttributes"::jsonb->>'gender' = $2
           OR p."aiAttributes"::jsonb->>'gender' = 'Unisex')`
      : '';

    // 先跑属性 + 文本召回，避免每次都触发最重的图片向量检索
    const [attrCandidates, textCandidates] = await Promise.all([
      this.recallByAttributes(source, sourceGender, genderCondition),
      this.recallByTextEmbedding(source.id, sourceGender),
    ]);

    // 合并去重
    const candidateMap = new Map<
      string,
      { textSim: number; imageSim: number }
    >();

    for (const id of attrCandidates) {
      if (!candidateMap.has(id)) {
        candidateMap.set(id, { textSim: 0, imageSim: 0 });
      }
    }
    for (const { productId, similarity } of textCandidates) {
      const existing = candidateMap.get(productId) || {
        textSim: 0,
        imageSim: 0,
      };
      existing.textSim = similarity;
      candidateMap.set(productId, existing);
    }

    candidateMap.delete(source.id);

    const imageRecallThreshold = Math.max(
      limit * SimilarProductsService.IMAGE_RECALL_THRESHOLD_MULTIPLIER,
      SimilarProductsService.MIN_IMAGE_RECALL_THRESHOLD,
    );

    if (this.imageRecallEnabled && candidateMap.size < imageRecallThreshold) {
      const imageCandidates = await this.recallByImageEmbedding(source.id);
      for (const { productId, similarity } of imageCandidates) {
        const existing = candidateMap.get(productId) || {
          textSim: 0,
          imageSim: 0,
        };
        existing.imageSim = similarity;
        candidateMap.set(productId, existing);
      }
    } else if (!this.imageRecallEnabled) {
      this.logger.debug(
        `Skip image embedding recall for ${source.id}: safe similar mode`,
      );
    } else {
      this.logger.debug(
        `Skip image embedding recall for ${source.id}: candidate pool already ${candidateMap.size}`,
      );
    }

    if (candidateMap.size === 0) return [];

    // 批量加载完整 Product
    const productIds = Array.from(candidateMap.keys());
    const products = await this.productRepository.find({
      where: { id: In(productIds), status: 'active' as any },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return Array.from(candidateMap.entries())
      .filter(([id]) => productMap.has(id))
      .map(([id, sims]) => ({
        product: productMap.get(id)!,
        score: 0,
        textSimilarity: sims.textSim,
        imageSimilarity: sims.imageSim,
      }));
  }

  /**
   * 属性召回：同品牌 OR 同品类 OR secondaryCategories 重叠
   */
  private async recallByAttributes(
    source: Product,
    sourceGender: string | null,
    genderCondition: string,
  ): Promise<string[]> {
    try {
      const params: any[] = [source.id];
      let paramIndex = 2; // $1 = source.id

      if (sourceGender) {
        params.push(sourceGender); // $2 = sourceGender
        paramIndex++;
      }

      let brandCondition: string;
      if (source.brandId) {
        brandCondition = `p."brandId" = $${paramIndex}`;
        params.push(source.brandId);
        paramIndex++;
      } else {
        brandCondition = 'FALSE';
      }

      let categoryCondition: string;
      if (source.primaryCategoryId) {
        categoryCondition = `p."primaryCategoryId" = $${paramIndex}`;
        params.push(source.primaryCategoryId);
        paramIndex++;
      } else {
        categoryCondition = 'FALSE';
      }

      // secondaryCategories 重叠
      const secondaryCatIds = (source.secondaryCategories || []).map(
        (c) => c.id,
      );
      let secondaryCondition: string;
      if (secondaryCatIds.length > 0) {
        const placeholders = secondaryCatIds.map((id) => {
          params.push(id);
          return `$${paramIndex++}`;
        });
        secondaryCondition = `EXISTS (
            SELECT 1 FROM product_secondary_categories psc
            WHERE psc."productId" = p.id
            AND psc."categoryId" IN (${placeholders.join(',')})
          )`;
      } else {
        secondaryCondition = 'FALSE';
      }

      const sql = `
        SELECT p.id FROM products p
        WHERE p.status = 'active'
          AND p.id != $1
          AND (${brandCondition} OR ${categoryCondition} OR ${secondaryCondition})
          ${genderCondition}
        LIMIT 100
      `;

      const results = await this.dataSource.query(sql, params);
      return results.map((r: any) => r.id);
    } catch (error) {
      this.logger.warn(`Attribute recall failed: ${error.message}`);
      return [];
    }
  }

  private async executeVectorRecall<T>(
    label: string,
    task: (query: RecallQueryFn) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('SET LOCAL max_parallel_workers_per_gather = 0');
      await queryRunner.query(
        `SET LOCAL statement_timeout = '${SimilarProductsService.VECTOR_RECALL_TIMEOUT_MS}ms'`,
      );

      const result = await task((sql, params = []) =>
        queryRunner.query(sql, params),
      );

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 文本嵌入近邻召回
   */
  private async recallByTextEmbedding(
    productId: string,
    sourceGender: string | null,
  ): Promise<Array<{ productId: string; similarity: number }>> {
    if (!this.semanticSearchService.isAvailable()) return [];

    try {
      return await this.executeVectorRecall(
        'Text embedding recall',
        async (query) => {
          const embeddingResult = await query(
            `SELECT embedding FROM product_text_embeddings WHERE product_id = $1`,
            [productId],
          );

          if (!embeddingResult.length || !embeddingResult[0].embedding) {
            return [];
          }

          const embedding = embeddingResult[0].embedding;
          const genderFilter = sourceGender
            ? `AND (p."aiAttributes"::jsonb->>'gender' IS NULL
                 OR p."aiAttributes"::jsonb->>'gender' = $3
                 OR p."aiAttributes"::jsonb->>'gender' = 'Unisex')`
            : '';

          const params: any[] = [embedding, productId];
          if (sourceGender) {
            params.push(sourceGender);
          }

          const results = await query(
            `
            SELECT pte.product_id, 1 - (pte.embedding <=> $1::vector) as similarity
            FROM product_text_embeddings pte
            JOIN products p ON p.id = pte.product_id
            WHERE p.status = 'active'
              AND pte.product_id != $2
              AND 1 - (pte.embedding <=> $1::vector) >= 0.3
              ${genderFilter}
            ORDER BY pte.embedding <=> $1::vector
            LIMIT 30
            `,
            params,
          );

          return results.map((r: any) => ({
            productId: r.product_id,
            similarity: parseFloat(r.similarity),
          }));
        },
      );
    } catch (error) {
      this.logger.warn(`Text embedding recall failed: ${error.message}`);
      return [];
    }
  }

  /**
   * 图片嵌入近邻召回
   */
  private async recallByImageEmbedding(
    productId: string,
  ): Promise<Array<{ productId: string; similarity: number }>> {
    if (!this.visualSearchService.isAvailable()) return [];

    try {
      return await this.executeVectorRecall(
        'Image embedding recall',
        async (query) => {
          const embeddingResult = await query(
            `SELECT embedding FROM product_image_embeddings
             WHERE product_id = $1 AND embedding IS NOT NULL
             ORDER BY image_index LIMIT 1`,
            [productId],
          );

          if (!embeddingResult.length || !embeddingResult[0].embedding) {
            return [];
          }

          const embedding = embeddingResult[0].embedding;

          const results = await query(
            `
            WITH ranked AS (
              SELECT pie.product_id,
                     1 - (pie.embedding <=> $1::vector) as similarity,
                     ROW_NUMBER() OVER (PARTITION BY pie.product_id ORDER BY pie.embedding <=> $1::vector) as rn
              FROM product_image_embeddings pie
              JOIN products p ON p.id = pie.product_id
              WHERE p.status = 'active'
                AND pie.product_id != $2
                AND pie.embedding IS NOT NULL
                AND 1 - (pie.embedding <=> $1::vector) >= 0.3
            )
            SELECT product_id, similarity FROM ranked WHERE rn = 1
            ORDER BY similarity DESC
            LIMIT 30
            `,
            [embedding, productId],
          );

          return results.map((r: any) => ({
            productId: r.product_id,
            similarity: parseFloat(r.similarity),
          }));
        },
      );
    } catch (error) {
      this.logger.warn(`Image embedding recall failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Phase 2: 多信号打分
   */
  private scoreProducts(
    source: Product,
    candidates: ScoredProduct[],
  ): ScoredProduct[] {
    const sourceAttrs = (source.aiAttributes as any) || {};
    const sourceStyles: string[] = sourceAttrs.styles || [];
    const sourceColors: string[] = sourceAttrs.colors || [];
    const sourceOccasions: string[] = sourceAttrs.occasions || [];
    const sourceSeasons: string[] = sourceAttrs.seasons || [];
    const sourcePrice = source.priceMin || 0;
    const sourceSecondaryIds = new Set(
      (source.secondaryCategories || []).map((c) => c.id),
    );

    // 归一化热度（取所有候选的最大 viewCount）
    const maxViewCount = Math.max(
      ...candidates.map((c) => c.product.viewCount || 0),
      1,
    );

    for (const candidate of candidates) {
      const p = candidate.product;
      const attrs = (p.aiAttributes as any) || {};
      let score = 0;

      // 品牌一致 (0.20)
      if (source.brandId && p.brandId === source.brandId) {
        score += 0.2;
      }

      // 品类一致 (0.18)
      if (source.primaryCategoryId && p.primaryCategoryId) {
        if (p.primaryCategoryId === source.primaryCategoryId) {
          score += 0.18; // 同 primary
        } else if (sourceSecondaryIds.has(p.primaryCategoryId)) {
          score += 0.18 * 0.7; // primary ↔ secondary
        } else {
          const candidateSecondaryIds = new Set(
            (p.secondaryCategories || []).map((c) => c.id),
          );
          const overlap = [...sourceSecondaryIds].filter((id) =>
            candidateSecondaryIds.has(id),
          );
          if (overlap.length > 0) {
            score += 0.18 * 0.5; // secondary 重叠
          }
        }
      }

      // 风格重叠 (0.15)
      const candidateStyles: string[] = attrs.styles || [];
      score += 0.15 * this.jaccard(sourceStyles, candidateStyles);

      // 文本语义 (0.12)
      score += 0.12 * candidate.textSimilarity;

      // 颜色重叠 (0.10)
      const candidateColors: string[] = attrs.colors || [];
      score += 0.1 * this.jaccard(sourceColors, candidateColors);

      // 图片视觉 (0.08)
      score += 0.08 * candidate.imageSimilarity;

      // 热度 (0.07)
      const normalizedPopularity =
        Math.log(1 + (p.viewCount || 0)) / Math.log(1 + maxViewCount);
      score += 0.07 * normalizedPopularity;

      // 价格接近 (0.05)
      const candidatePrice = p.priceMin || 0;
      if (sourcePrice > 0 && candidatePrice > 0) {
        score +=
          0.05 *
          (Math.min(sourcePrice, candidatePrice) /
            Math.max(sourcePrice, candidatePrice));
      }

      // 场景重叠 (0.03)
      const candidateOccasions: string[] = attrs.occasions || [];
      score += 0.03 * this.jaccard(sourceOccasions, candidateOccasions);

      // 季节重叠 (0.02)
      const candidateSeasons: string[] = attrs.seasons || [];
      score += 0.02 * this.jaccard(sourceSeasons, candidateSeasons);

      candidate.score = score;
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Phase 3: MMR 多样性重排 (λ=0.7)
   */
  private mmrRerank(scored: ScoredProduct[], limit: number): ScoredProduct[] {
    if (scored.length <= limit) return scored;

    // 归一化 score 到 [0,1]
    const maxScore = Math.max(...scored.map((s) => s.score), 0.001);
    for (const s of scored) {
      s.score = s.score / maxScore;
    }

    const selected: ScoredProduct[] = [];
    const remaining = new Set(scored);

    // 先选最高分的
    const best = scored[0];
    selected.push(best);
    remaining.delete(best);

    while (selected.length < limit && remaining.size > 0) {
      let bestMMR = -Infinity;
      let bestCandidate: ScoredProduct | null = null;

      for (const candidate of remaining) {
        const relevance = candidate.score;
        const maxSim = Math.max(
          ...selected.map((s) => this.pairwiseSimilarity(candidate, s)),
        );
        const mmr = 0.7 * relevance - 0.3 * maxSim;

        if (mmr > bestMMR) {
          bestMMR = mmr;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        selected.push(bestCandidate);
        remaining.delete(bestCandidate);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Pairwise similarity: brand(0.4) + category(0.3) + style_jaccard(0.3)
   */
  private pairwiseSimilarity(a: ScoredProduct, b: ScoredProduct): number {
    let sim = 0;

    // 同品牌
    if (a.product.brandId && a.product.brandId === b.product.brandId) {
      sim += 0.4;
    }

    // 同品类
    if (
      a.product.primaryCategoryId &&
      a.product.primaryCategoryId === b.product.primaryCategoryId
    ) {
      sim += 0.3;
    }

    // 风格 Jaccard
    const aStyles = ((a.product.aiAttributes as any)?.styles as string[]) || [];
    const bStyles = ((b.product.aiAttributes as any)?.styles as string[]) || [];
    sim += 0.3 * this.jaccard(aStyles, bStyles);

    return sim;
  }

  /**
   * Jaccard 相似度
   */
  private jaccard(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 0;
    const setA = new Set(a.map((s) => s.toLowerCase()));
    const setB = new Set(b.map((s) => s.toLowerCase()));
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 降级策略：按热度补充同品类商品
   */
  private async fallbackByPopularity(
    source: Product,
    limit: number,
  ): Promise<Product[]> {
    const where: any = {
      status: 'active',
    };

    if (source.primaryCategoryId) {
      where.primaryCategoryId = source.primaryCategoryId;
    }

    const products = await this.productRepository.find({
      where,
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
      order: { viewCount: 'DESC' },
      take: limit + 1,
    });

    return products.filter((p) => p.id !== source.id).slice(0, limit);
  }
}
