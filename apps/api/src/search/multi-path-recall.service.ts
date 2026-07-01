import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { escapeIlike } from './utils/query-validator';
import {
  SemanticSearchService,
  SemanticSearchFilters,
} from './semantic-search.service';
import { BM25RankingService } from './bm25-ranking.service';
import { AnalyzedQuery } from './keyword-analysis.service';
import {
  RecallCandidate,
  RecallResult,
  RecallSource,
  RecallConfig,
  DEFAULT_RECALL_CONFIG,
} from './dto/recall.dto';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import { FilterApplier } from './utils/filter-applier';
import { SearchFilters } from './dto/search-filters.dto';

/**
 * 多路召回服务
 * 实现并行多路召回策略：关键词搜索 + 语义搜索 + 分类召回 + 兜底
 */
@Injectable()
export class MultiPathRecallService {
  private readonly logger = new Logger(MultiPathRecallService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly bm25RankingService: BM25RankingService,
    private readonly productQueryFacade: ProductQueryFacadeService,
  ) {}

  /**
   * 主入口：并行执行多路召回
   */
  async recall(
    query: string,
    analyzedQuery: AnalyzedQuery | null,
    filters: SearchFilters,
    config: Partial<RecallConfig> = {},
  ): Promise<RecallResult> {
    const startTime = Date.now();
    const mergedConfig = { ...DEFAULT_RECALL_CONFIG, ...config };

    const timing = {
      keywordMs: 0,
      semanticMs: 0,
      categoryMs: 0,
      mergeMs: 0,
      totalMs: 0,
    };

    // 构建语义搜索过滤器（从 filters 和 analyzedQuery 合并）
    const semanticFilters: SemanticSearchFilters = {};
    if (filters.genders) {
      semanticFilters.genders = filters.genders;
    } else if (analyzedQuery?.genders?.length) {
      semanticFilters.genders = analyzedQuery.genders.join(',');
    }

    // 并行执行多路召回（带超时控制）
    const results = await Promise.allSettled([
      this.withTimeout(
        this.timedExecution(
          () =>
            this.keywordRecall(
              query,
              analyzedQuery,
              filters,
              mergedConfig.keywordLimit,
            ),
          (ms) => (timing.keywordMs = ms),
        ),
        3000,
        'keyword',
      ),
      this.withTimeout(
        this.timedExecution(
          () =>
            this.semanticRecall(
              query,
              mergedConfig.semanticLimit,
              mergedConfig.semanticMinSimilarity,
              semanticFilters,
            ),
          (ms) => (timing.semanticMs = ms),
        ),
        5000,
        'semantic',
      ),
      this.withTimeout(
        this.timedExecution(
          () =>
            this.categoryRecall(
              analyzedQuery,
              filters,
              mergedConfig.categoryLimit,
            ),
          (ms) => (timing.categoryMs = ms),
        ),
        3000,
        'category',
      ),
    ]);

    // 提取成功的结果，失败/超时的路径返回空数组
    const keywordResult =
      results[0].status === 'fulfilled' ? results[0].value : [];
    const semanticResult =
      results[1].status === 'fulfilled' ? results[1].value : [];
    const categoryResult =
      results[2].status === 'fulfilled' ? results[2].value : [];

    // 记录失败的路径
    if (results[0].status === 'rejected') {
      this.logger.warn(`Keyword recall failed: ${results[0].reason}`);
    }
    if (results[1].status === 'rejected') {
      this.logger.warn(`Semantic recall failed: ${results[1].reason}`);
    }
    if (results[2].status === 'rejected') {
      this.logger.warn(`Category recall failed: ${results[2].reason}`);
    }

    // 合并去重
    const mergeStart = Date.now();
    let candidates = this.mergeAndDedupe([
      keywordResult,
      semanticResult,
      categoryResult,
    ]);
    timing.mergeMs = Date.now() - mergeStart;

    // 记录来源统计
    const sources: Record<RecallSource, number> = {
      keyword: keywordResult.length,
      semantic: semanticResult.length,
      category: categoryResult.length,
      fallback: 0,
    };

    // 如果所有路径都返回空，使用兜底策略
    let usedFallback = false;
    if (candidates.length === 0) {
      this.logger.log(`所有召回路径返回空，启用兜底策略`);
      const fallbackResult = await this.fallbackRecall(
        mergedConfig.fallbackLimit,
      );
      candidates = fallbackResult;
      sources.fallback = fallbackResult.length;
      usedFallback = true;
    }

    timing.totalMs = Date.now() - startTime;

    this.logger.log(
      `多路召回完成: keyword=${sources.keyword}, semantic=${sources.semantic}, ` +
        `category=${sources.category}, fallback=${sources.fallback}, ` +
        `merged=${candidates.length}, time=${timing.totalMs}ms`,
    );

    return {
      candidates,
      sources,
      timing,
      isEmpty: candidates.length === 0,
      usedFallback,
    };
  }

  /**
   * 创建带标准 JOIN 的基础查询构建器
   */
  private createBaseQueryBuilder() {
    return this.productQueryFacade
      .createProductQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .where('product.status = :status', { status: 'active' });
  }

  /**
   * 获取分类及其所有子分类的 ID 列表
   */
  private async getCategoryIds(slug: string): Promise<string[]> {
    const categoryEntity = await this.categoryRepository.findOne({
      where: { slug },
    });
    if (!categoryEntity) return [];

    const treeRepo =
      this.categoryRepository.manager.getTreeRepository(Category);
    const descendants = await treeRepo.findDescendants(categoryEntity);
    return [categoryEntity.id, ...descendants.map((c: Category) => c.id)];
  }

  /**
   * 关键词召回：基于文本匹配的搜索
   */
  private async keywordRecall(
    query: string,
    analyzedQuery: AnalyzedQuery | null,
    filters: SearchFilters,
    limit: number,
  ): Promise<RecallCandidate[]> {
    if (!query) return [];

    try {
      const queryBuilder = this.createBaseQueryBuilder();

      // 应用筛选条件（使用统一的 FilterApplier）
      if (filters.brands) {
        FilterApplier.applyBrandFilter(queryBuilder, filters.brands);
      }
      if (filters.category) {
        const categoryIds = await this.getCategoryIds(filters.category);
        if (categoryIds.length > 0) {
          queryBuilder.andWhere(
            'product.primaryCategoryId IN (:...categoryIds)',
            { categoryIds },
          );
        }
      }
      if (filters.colors) {
        FilterApplier.applyColorFilter(queryBuilder, filters.colors);
      }
      if (filters.genders) {
        FilterApplier.applyGenderFilter(queryBuilder, filters.genders);
      }
      if (filters.seasons) {
        FilterApplier.applySeasonFilter(queryBuilder, filters.seasons);
      }

      // 文本搜索：使用剩余关键词
      const searchKeywords = analyzedQuery?.keywords?.length
        ? analyzedQuery.keywords
        : [query];

      if (searchKeywords.length > 0) {
        const searchConditions = searchKeywords
          .map(
            (_, i) =>
              `(product.title ILIKE :search${i} OR product.originalTitle ILIKE :search${i})`,
          )
          .join(' OR ');
        const searchParams = Object.fromEntries(
          searchKeywords.map((term, i) => [
            `search${i}`,
            `%${escapeIlike(term)}%`,
          ]),
        );
        queryBuilder.andWhere(`(${searchConditions})`, searchParams);
      }

      queryBuilder.orderBy('product.viewCount', 'DESC').take(limit);

      const products = await queryBuilder.getMany();

      // 计算 BM25 分数
      return products.map((product) => {
        const score = this.bm25RankingService.calculateRelevance(
          product,
          searchKeywords,
        );
        return {
          productId: product.id,
          source: 'keyword' as RecallSource,
          score,
          product,
        };
      });
    } catch (error) {
      this.logger.error(`关键词召回失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 语义召回：基于向量相似度的搜索
   */
  private async semanticRecall(
    query: string,
    limit: number,
    minSimilarity: number,
    filters?: SemanticSearchFilters,
  ): Promise<RecallCandidate[]> {
    if (!query) return [];

    // 检查语义服务是否可用
    if (!this.semanticSearchService.isAvailable()) {
      this.logger.debug('语义搜索服务不可用，跳过语义召回');
      return [];
    }

    try {
      const semanticResults = await this.semanticSearchService.semanticSearch(
        query,
        limit,
        minSimilarity,
        filters,
      );

      return semanticResults.map((result) => ({
        productId: result.productId,
        source: 'semantic' as RecallSource,
        score: result.similarity,
        product: result.product as Product | undefined,
      }));
    } catch (error) {
      this.logger.error(`语义召回失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 属性召回：基于提取的分类、性别、品牌等属性进行召回
   * 支持：分类 + 性别、仅性别、仅品牌等多种组合
   */
  private async categoryRecall(
    analyzedQuery: AnalyzedQuery | null,
    filters: SearchFilters,
    limit: number,
  ): Promise<RecallCandidate[]> {
    if (!analyzedQuery) return [];

    // 提取属性
    const categories = analyzedQuery.categories || [];
    const genders = analyzedQuery.genders || [];
    const brands = analyzedQuery.brands || [];
    const seasons = analyzedQuery.seasons || [];

    // 至少需要一个有效的属性筛选条件
    const hasCategory = categories.length > 0;
    const hasGender = genders.length > 0;
    const hasBrand = brands.length > 0;
    const hasSeason = seasons.length > 0 || !!filters.seasons;

    if (!hasCategory && !hasGender && !hasBrand && !hasSeason) {
      return [];
    }

    try {
      const queryBuilder = this.createBaseQueryBuilder();

      // 应用分类筛选
      if (hasCategory) {
        const categoryIds = await this.getCategoryIds(categories[0]);
        if (categoryIds.length > 0) {
          queryBuilder.andWhere(
            'product.primaryCategoryId IN (:...catCategoryIds)',
            { catCategoryIds: categoryIds },
          );
        }
      }

      // 应用性别筛选
      if (hasGender) {
        FilterApplier.applyGenderFilter(queryBuilder, genders, 'cat');
      }

      // 应用品牌筛选
      if (hasBrand) {
        queryBuilder.andWhere('brand.slug IN (:...brandSlugs)', {
          brandSlugs: brands,
        });
      }

      // 应用季节筛选
      const effectiveSeasons = filters.seasons || seasons.join(',');
      if (effectiveSeasons) {
        FilterApplier.applySeasonFilter(
          queryBuilder,
          effectiveSeasons,
          'catSeason',
        );
      }

      const products = await queryBuilder
        .orderBy('product.viewCount', 'DESC')
        .take(limit)
        .getMany();

      // 分类/属性召回的分数基于浏览量归一化
      const maxViews = Math.max(...products.map((p) => p.viewCount || 1), 1);
      return products.map((product) => ({
        productId: product.id,
        source: 'category' as RecallSource,
        score: ((product.viewCount || 0) / maxViews) * 0.8,
        product,
      }));
    } catch (error) {
      this.logger.error(`属性召回失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 兜底召回：返回热门/推荐商品
   */
  private async fallbackRecall(limit: number): Promise<RecallCandidate[]> {
    try {
      // 策略1: 精选商品
      const featuredProducts = await this.createBaseQueryBuilder()
        .andWhere('product.isFeatured = :featured', { featured: true })
        .orderBy('product.viewCount', 'DESC')
        .take(Math.ceil(limit / 2))
        .getMany();

      // 策略2: 热门商品（按浏览量）
      const hotProducts = await this.createBaseQueryBuilder()
        .orderBy('product.viewCount', 'DESC')
        .addOrderBy('product.createdAt', 'DESC')
        .take(Math.ceil(limit / 2))
        .getMany();

      // 合并去重
      const seenIds = new Set<string>();
      const allProducts: Product[] = [];

      for (const product of [...featuredProducts, ...hotProducts]) {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          allProducts.push(product);
        }
      }

      // 兜底商品分数较低
      return allProducts.slice(0, limit).map((product, index) => ({
        productId: product.id,
        source: 'fallback' as RecallSource,
        score: 0.3 - index * 0.01, // 递减分数
        product,
      }));
    } catch (error) {
      this.logger.error(`兜底召回失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 合并去重多路召回结果
   * 策略：保留最高分数的来源
   */
  private mergeAndDedupe(results: RecallCandidate[][]): RecallCandidate[] {
    const candidateMap = new Map<string, RecallCandidate>();

    for (const candidates of results) {
      for (const candidate of candidates) {
        const existing = candidateMap.get(candidate.productId);
        if (!existing || candidate.score > existing.score) {
          candidateMap.set(candidate.productId, candidate);
        }
      }
    }

    // 按分数降序排序
    return Array.from(candidateMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * 计时执行辅助函数
   */
  private async timedExecution<T>(
    fn: () => Promise<T>,
    onComplete: (ms: number) => void,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      onComplete(Date.now() - start);
      return result;
    } catch (error) {
      onComplete(Date.now() - start);
      throw error;
    }
  }

  /**
   * 带超时控制的 Promise 包装器
   *
   * @param promise 要执行的 Promise
   * @param timeoutMs 超时时间（毫秒）
   * @param pathName 路径名称（用于日志）
   * @returns Promise 结果
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    pathName: string,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${pathName} recall timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });
  }
}
