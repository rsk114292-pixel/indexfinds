import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { SemanticSearchService } from '../search/semantic-search.service';
import { MultiPathRecallService } from '../search/multi-path-recall.service';
import { DEFAULT_RANKING_WEIGHTS } from '../search/dto/recall.dto';
import type { AnalyzedQuery } from '../search/keyword-analysis.service';
import type {
  SearchFilters,
  MultiPathRecallResult,
} from './dto/search-enhancer.types';

@Injectable()
export class SearchRecallEnhancerService {
  private readonly logger = new Logger(SearchRecallEnhancerService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly multiPathRecallService: MultiPathRecallService,
  ) {}

  async tryMultiPathRecall(
    searchQuery: string,
    analyzedQuery: AnalyzedQuery | null,
    filters: SearchFilters,
    intentSortBy: string,
    intentSortApplied: boolean,
    limit: number,
    skip: number = 0,
  ): Promise<MultiPathRecallResult | null> {
    try {
      this.logger.log(`关键词搜索无结果，启用多路召回: "${searchQuery}"`);

      const recallResult = await this.multiPathRecallService.recall(
        searchQuery,
        analyzedQuery,
        filters,
      );

      if (recallResult.isEmpty) {
        return null;
      }

      const candidateProductIds = recallResult.candidates
        .filter((c) => c.productId)
        .map((c) => c.productId);

      if (candidateProductIds.length === 0) {
        return null;
      }

      let recalledProducts = await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
        .where('product.id IN (:...ids)', { ids: candidateProductIds })
        .andWhere('product.status = :status', { status: 'active' })
        .getMany();

      const scoreMap = new Map(
        recallResult.candidates.map((c) => [c.productId, c.score]),
      );
      recalledProducts.sort(
        (a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0),
      );

      if (filters.category && recalledProducts.length > 0) {
        recalledProducts = await this.filterByCategory(
          recalledProducts,
          filters.category,
        );
      }

      if (filters.brands && recalledProducts.length > 0) {
        recalledProducts = this.filterByBrands(
          recalledProducts,
          filters.brands,
        );
      }

      if (recalledProducts.length === 0) {
        return null;
      }

      recalledProducts = this.applyIntentSort(
        recalledProducts,
        intentSortBy,
        intentSortApplied,
      );

      if (!intentSortApplied && this.semanticSearchService.isAvailable()) {
        const keywordResults = recallResult.candidates
          .filter((c) => c.source === 'keyword')
          .map((c) => ({ productId: c.productId, score: c.score }));

        if (keywordResults.length > 0) {
          const hybridResults = await this.semanticSearchService.hybridSearch(
            keywordResults,
            searchQuery,
            DEFAULT_RANKING_WEIGHTS.keyword,
            DEFAULT_RANKING_WEIGHTS.semantic,
          );

          const hybridScoreMap = new Map(
            hybridResults.map((r) => [r.productId, r.combinedScore]),
          );
          recalledProducts.sort(
            (a, b) =>
              (hybridScoreMap.get(b.id) || 0) - (hybridScoreMap.get(a.id) || 0),
          );
        }
      }

      this.logger.log(
        `多路召回成功: keyword=${recallResult.sources.keyword}, ` +
          `semantic=${recallResult.sources.semantic}, ` +
          `category=${recallResult.sources.category}, ` +
          `fallback=${recallResult.sources.fallback}`,
      );

      return {
        products: recalledProducts.slice(skip, skip + limit),
        total: recalledProducts.length,
        usedFallback: recallResult.usedFallback,
      };
    } catch (error) {
      this.logger.error(`多路召回失败: ${error.message}`);
      return null;
    }
  }

  async trySemanticEnhance(
    currentData: Product[],
    searchQuery: string,
    limit: number,
  ): Promise<Product[]> {
    if (!this.semanticSearchService.isAvailable()) {
      return currentData;
    }

    if (!this.semanticSearchService.shouldUseSemanticSearch(searchQuery)) {
      return currentData;
    }

    try {
      const semanticResults = await this.semanticSearchService.semanticSearch(
        searchQuery,
        limit,
        0.3,
      );

      if (semanticResults.length === 0) {
        return currentData;
      }

      const existingIds = new Set(currentData.map((p) => p.id));
      const newProductIds = semanticResults
        .filter((r) => !existingIds.has(r.productId))
        .map((r) => r.productId)
        .slice(0, Math.max(0, limit - currentData.length));

      if (newProductIds.length === 0) {
        return currentData;
      }

      const additionalProducts = await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
        .where('product.id IN (:...ids)', { ids: newProductIds })
        .andWhere('product.status = :status', { status: 'active' })
        .getMany();

      const similarityMap = new Map(
        semanticResults.map((r) => [r.productId, r.similarity]),
      );
      additionalProducts.sort(
        (a, b) =>
          (similarityMap.get(b.id) || 0) - (similarityMap.get(a.id) || 0),
      );

      this.logger.log(
        `语义搜索增强: 添加了 ${additionalProducts.length} 个相关商品`,
      );

      return [...currentData, ...additionalProducts];
    } catch (error) {
      this.logger.warn(`语义搜索增强失败: ${error.message}`);
      return currentData;
    }
  }

  private async filterByCategory(
    products: Product[],
    categorySlug: string,
  ): Promise<Product[]> {
    const categoryEntity = await this.categoryRepository.findOne({
      where: { slug: categorySlug },
    });

    if (!categoryEntity) {
      return products;
    }

    const treeRepo =
      this.categoryRepository.manager.getTreeRepository(Category);
    const descendants = await treeRepo.findDescendants(categoryEntity);
    const categoryIds = new Set([
      categoryEntity.id,
      ...descendants.map((c) => c.id),
    ]);

    return products.filter(
      (p) => p.primaryCategoryId && categoryIds.has(p.primaryCategoryId),
    );
  }

  private filterByBrands(products: Product[], brands: string): Product[] {
    const brandSlugs = new Set(
      brands.split(',').map((b) => b.trim().toLowerCase()),
    );
    return products.filter(
      (p) => p.brand && brandSlugs.has(p.brand.slug?.toLowerCase()),
    );
  }

  private applyIntentSort(
    products: Product[],
    intentSortBy: string,
    intentSortApplied: boolean,
  ): Product[] {
    if (!intentSortApplied || !intentSortBy) {
      return products;
    }

    const sorted = [...products];

    if (intentSortBy === 'price_asc') {
      sorted.sort(
        (a, b) => (Number(a.priceMin) || 0) - (Number(b.priceMin) || 0),
      );
    } else if (intentSortBy === 'price_desc') {
      sorted.sort(
        (a, b) => (Number(b.priceMin) || 0) - (Number(a.priceMin) || 0),
      );
    } else if (intentSortBy === 'newest') {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (intentSortBy === 'popular') {
      sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }

    return sorted;
  }
}
