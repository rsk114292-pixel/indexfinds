import { Injectable, Logger } from '@nestjs/common';
import { SimilarProductsService } from './similar-products.service';
import { CompleteTheLookService } from './complete-the-look.service';
import { Product } from '../products/entities/product.entity';

type RecommendationResult = {
  data: Product[];
  meta: { count: number; algorithm: string };
};

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly RECOMMENDATION_CACHE_TTL = 10 * 60 * 1000;
  private readonly MAX_RECOMMENDATION_CACHE_ENTRIES = 500;
  private readonly MAX_ACTIVE_RECOMMENDATION_LOADS = 2;
  private readonly RECOMMENDATION_LOAD_SHED_MS = 30 * 1000;
  private readonly recommendationCache = new Map<
    string,
    { expiresAt: number; result: RecommendationResult }
  >();
  private readonly pendingRecommendationLoads = new Map<
    string,
    Promise<RecommendationResult>
  >();
  private activeRecommendationLoads = 0;
  private shedRecommendationLoadsUntil = 0;

  constructor(
    private readonly similarProductsService: SimilarProductsService,
    private readonly completeTheLookService: CompleteTheLookService,
  ) {}

  async getSimilarProducts(
    productId: string,
    limit: number,
  ): Promise<RecommendationResult> {
    return this.loadRecommendation(
      `similar:${productId}:${limit}`,
      'multi-signal-mmr',
      () => this.similarProductsService.findSimilar(productId, limit),
    );
  }

  async getCompleteTheLook(
    productId: string,
    limit: number,
  ): Promise<RecommendationResult> {
    return this.loadRecommendation(
      `complete:${productId}:${limit}`,
      'category-complement',
      () => this.completeTheLookService.findComplements(productId, limit),
    );
  }

  private async loadRecommendation(
    cacheKey: string,
    algorithm: string,
    loadProducts: () => Promise<Product[]>,
  ): Promise<RecommendationResult> {
    const now = Date.now();
    const cached = this.recommendationCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.result;
    }

    const pending = this.pendingRecommendationLoads.get(cacheKey);
    if (pending) {
      return pending;
    }

    if (now < this.shedRecommendationLoadsUntil) {
      if (cached) {
        return cached.result;
      }

      return this.emptyResult(algorithm);
    }

    if (
      this.activeRecommendationLoads >= this.MAX_ACTIVE_RECOMMENDATION_LOADS
    ) {
      this.shedRecommendationLoadsUntil =
        now + this.RECOMMENDATION_LOAD_SHED_MS;

      if (cached) {
        return cached.result;
      }

      this.logger.warn(
        `Recommendation load limit reached; returning empty result for ${cacheKey}`,
      );
      return this.emptyResult(algorithm);
    }

    this.activeRecommendationLoads++;
    const loadPromise = loadProducts()
      .then((products) => {
        const result = {
          data: products,
          meta: { count: products.length, algorithm },
        };

        if (
          this.recommendationCache.size >= this.MAX_RECOMMENDATION_CACHE_ENTRIES
        ) {
          this.recommendationCache.clear();
        }

        this.recommendationCache.set(cacheKey, {
          expiresAt: Date.now() + this.RECOMMENDATION_CACHE_TTL,
          result,
        });

        return result;
      })
      .catch((error) => {
        this.logger.warn(
          `Recommendation load failed for ${cacheKey}: ${error instanceof Error ? error.message : error}`,
        );
        return cached?.result ?? this.emptyResult(algorithm);
      })
      .finally(() => {
        this.activeRecommendationLoads--;
        this.pendingRecommendationLoads.delete(cacheKey);
      });

    this.pendingRecommendationLoads.set(cacheKey, loadPromise);
    return loadPromise;
  }

  private emptyResult(algorithm: string): RecommendationResult {
    return {
      data: [],
      meta: { count: 0, algorithm },
    };
  }
}
