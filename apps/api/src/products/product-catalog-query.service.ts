import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { Brand } from '../brands/entities/brand.entity';
import { QueryProductDto } from './dto/query-product.dto';
import {
  KeywordAnalysisService,
  AnalyzedQuery,
} from '../search/keyword-analysis.service';
import { SearchAnalyticsService } from '../search/search-analytics.service';
import { SemanticSearchService } from '../search/semantic-search.service';
import { ProductFilterBuilderService } from './product-filter-builder.service';
import { ProductFacetService, FacetResult } from './product-facet.service';
import { ProductSearchEnhancerService } from './product-search-enhancer.service';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { ProductStatus } from './product-status';
import type { SearchContext } from '../search/dto/search-analytics.types';
import { ProductSearchRuntimeService } from './product-search-runtime.service';
import {
  validateSearchQuery,
  escapeIlike,
  assessPublicSearchRisk,
} from '../search/utils/query-validator';

// 排序配置映射
const SORT_CONFIG: Record<string, { field: string; order: 'ASC' | 'DESC' }> = {
  relevance: { field: 'createdAt', order: 'DESC' },
  newest: { field: 'createdAt', order: 'DESC' },
  price_asc: { field: 'priceMin', order: 'ASC' },
  price_desc: { field: 'priceMin', order: 'DESC' },
  popular: { field: 'popularityScore', order: 'DESC' },
  createdAt: { field: 'createdAt', order: 'DESC' },
  price: { field: 'priceMin', order: 'ASC' },
  sales: { field: 'salesCount', order: 'DESC' },
  views: { field: 'viewCount', order: 'DESC' },
};

interface ProductSearchContext {
  effectiveSearch?: string;
  analyzedQuery: AnalyzedQuery | null;
  effectiveCategory?: string;
  analyzedFilters: Record<string, string>;
  intentSortBy: string;
  intentSortApplied: boolean;
  searchKeywords: string[];
  meiliQuery: string;
  enrichedQuery: QueryProductDto;
  isPureIntentSearch: boolean;
}

type ProductListResult = {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    searchLogId?: string;
    usedFallback?: boolean;
    semanticEnhanced?: boolean;
  };
};

@Injectable()
export class ProductCatalogQueryService {
  private readonly logger = new Logger(ProductCatalogQueryService.name);
  private readonly PRODUCT_LIST_CACHE_TTL = 60 * 1000; // 1分钟
  private readonly MAX_PRODUCT_LIST_CACHE_ENTRIES = 100;
  private readonly MAX_ACTIVE_PRODUCT_LIST_LOADS = 2;
  private readonly productListCache = new Map<
    string,
    { expiresAt: number; result: ProductListResult }
  >();
  private readonly pendingProductListLoads = new Map<
    string,
    Promise<ProductListResult>
  >();
  private activeProductListLoads = 0;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly keywordAnalysisService: KeywordAnalysisService,
    private readonly searchAnalyticsService: SearchAnalyticsService,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly filterBuilderService: ProductFilterBuilderService,
    private readonly facetService: ProductFacetService,
    private readonly searchEnhancerService: ProductSearchEnhancerService,
    private readonly meilisearchService: MeilisearchService,
    private readonly runtimeService: ProductSearchRuntimeService,
  ) {}

  private async recordDegradation() {
    await this.runtimeService.recordDegradation();
  }

  private get useMeilisearch(): boolean {
    return this.runtimeService.useMeilisearch;
  }

  private shouldUseExactActiveCount(query: QueryProductDto): boolean {
    if (query.status && query.status !== ProductStatus.ACTIVE) {
      return false;
    }

    return !(
      query.q ||
      query.search ||
      query.category ||
      query.categories ||
      query.brand ||
      query.brands ||
      query.primaryCategoryId ||
      query.secondaryCategoryId ||
      query.aiBrandName ||
      query.isFeatured ||
      query.minPrice !== undefined ||
      query.maxPrice !== undefined ||
      query.color ||
      query.colors ||
      query.style ||
      query.styles ||
      query.gender ||
      query.genders ||
      query.occasions ||
      query.seasons ||
      query.ids ||
      query.deadLink
    );
  }

  private async getExactActiveProductCount(): Promise<number | null> {
    try {
      return await this.productRepository.count({
        where: { status: ProductStatus.ACTIVE },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load exact active product count: ${message}`);
      return null;
    }
  }

  /**
   * 查询商品列表（核心方法）
   */
  async findAll(
    query: QueryProductDto,
    searchContext: SearchContext = {},
  ): Promise<ProductListResult> {
    const cacheKey = this.getProductListCacheKey(query);
    if (cacheKey) {
      const cached = this.productListCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.result;
      }

      const pending = this.pendingProductListLoads.get(cacheKey);
      if (pending) {
        return pending;
      }

      if (this.activeProductListLoads >= this.MAX_ACTIVE_PRODUCT_LIST_LOADS) {
        if (cached) {
          return cached.result;
        }

        this.logger.warn(
          `Product list load limit reached; returning empty result for ${cacheKey}`,
        );
        return this.emptyProductListResult(query);
      }

      const loadPromise = this.runProductListLoad(query, searchContext)
        .then((result) => {
          if (
            this.productListCache.size >= this.MAX_PRODUCT_LIST_CACHE_ENTRIES
          ) {
            this.productListCache.clear();
          }
          this.productListCache.set(cacheKey, {
            expiresAt: Date.now() + this.PRODUCT_LIST_CACHE_TTL,
            result,
          });
          return result;
        })
        .finally(() => {
          this.pendingProductListLoads.delete(cacheKey);
        });

      this.pendingProductListLoads.set(cacheKey, loadPromise);
      return loadPromise;
    }

    if (this.activeProductListLoads >= this.MAX_ACTIVE_PRODUCT_LIST_LOADS) {
      this.logger.warn('Product list load limit reached for uncached query');
      return this.emptyProductListResult(query);
    }

    return this.runProductListLoad(query, searchContext);
  }

  private async runProductListLoad(
    query: QueryProductDto,
    searchContext: SearchContext,
  ): Promise<ProductListResult> {
    this.activeProductListLoads++;
    try {
      return await this.loadProductList(query, searchContext);
    } finally {
      this.activeProductListLoads--;
    }
  }

  private emptyProductListResult(query: QueryProductDto): ProductListResult {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);

    return {
      data: [],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
        usedFallback: true,
      },
    };
  }

  private getProductListCacheKey(query: QueryProductDto): string | null {
    if (query.q || query.search || query.ids) {
      return null;
    }

    return JSON.stringify(
      Object.entries(query ?? {})
        .filter(([, value]) => {
          if (value === undefined || value === null) return false;
          return String(value).trim().length > 0;
        })
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  private async loadProductList(
    query: QueryProductDto,
    searchContext: SearchContext = {},
  ): Promise<ProductListResult> {
    // 安全防护：公开接口强制限定 status 为 active（status=all 仅 admin 路由可用）
    if (query.status && query.status !== ProductStatus.ACTIVE) {
      query.status = undefined;
    }

    const {
      page = 1,
      limit = 20,
      q,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      gender,
      preferredBrands,
      preferredCategories,
      ids,
      ...filters
    } = query;

    // 验证搜索参数
    if (q && search && q !== search) {
      throw new BadRequestException('q 与 search 不能同时传入且值不同');
    }
    let effectiveSearch = q ?? search;
    const publicSearchRisk = this.assessPublicSearch(effectiveSearch);
    if (publicSearchRisk.risky) {
      this.logger.warn(
        `Dropping risky public product search: reason=${publicSearchRisk.reason}, query="${publicSearchRisk.sanitizedQuery}"`,
      );
      return this.emptyProductListResult(query);
    }
    if (publicSearchRisk.sanitizedQuery) {
      effectiveSearch = publicSearchRisk.sanitizedQuery;
      query.q = q ? publicSearchRisk.sanitizedQuery : undefined;
      query.search = search ? publicSearchRisk.sanitizedQuery : undefined;
    }

    // ========== 批量 ID 查询（快速路径，始终走 PostgreSQL） ==========
    if (ids) {
      return this.findByIds(ids, page, limit, sortBy, sortOrder);
    }

    // ========== Meilisearch 路径（自动降级到 PostgreSQL） ==========
    if (this.useMeilisearch) {
      try {
        return await this.searchViaMeilisearch(query, searchContext);
      } catch (error) {
        this.logger.error(
          `Meilisearch 搜索失败，降级到 PostgreSQL: ${error.message}`,
        );
        await this.recordDegradation();
      }
    }

    // ========== PostgreSQL 路径（兜底） ==========
    const {
      analyzedQuery,
      effectiveCategory,
      analyzedFilters,
      intentSortBy,
      intentSortApplied,
      searchKeywords,
      isPureIntentSearch,
    } = await this.buildSearchContext(query, {
      effectiveSearch,
      sortBy,
      filters,
      gender,
    });

    // ========== 构建查询 ==========
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .leftJoin('product.secondaryCategories', 'secondaryCategories');

    // 应用所有筛选条件
    await this.filterBuilderService.applyAllFilters(queryBuilder, query, {
      effectiveCategory,
      analyzedFilters,
    });

    // 应用文本搜索
    if (searchKeywords.length > 0) {
      this.filterBuilderService.applyTextSearchFilter(
        queryBuilder,
        searchKeywords,
      );
    }

    // ========== 排序 ==========
    const sortConfig = this.getSortConfig(intentSortBy, sortOrder);
    this.applySortConfig(queryBuilder, sortConfig);

    // ========== 分页 ==========
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    let data: Product[] = [];
    let total = 0;
    let spellCorrected = false;
    let correctedQuery = effectiveSearch;
    let semanticEnhanced = false;
    let usedFallback = false;
    let finalIntentSortApplied = intentSortApplied;

    if (isPureIntentSearch && effectiveSearch) {
      // 纯意图搜索：跳过关键词搜索，直接走多路召回
      this.logger.log(`检测到纯意图搜索: "${effectiveSearch}"，直接走多路召回`);
      const recallResult = await this.searchEnhancerService.tryMultiPathRecall(
        effectiveSearch,
        analyzedQuery,
        {
          brands: filters.brands || analyzedFilters.brands,
          category: effectiveCategory,
          colors: filters.colors || analyzedFilters.colors,
          genders: filters.genders || gender || analyzedFilters.genders,
          seasons: filters.seasons || analyzedFilters.seasons,
        },
        intentSortBy,
        finalIntentSortApplied,
        limit,
        skip,
      );

      if (recallResult) {
        data = recallResult.products;
        total = recallResult.total;
        semanticEnhanced = true;
        usedFallback = recallResult.usedFallback;
      }
    } else {
      // 常规搜索：执行关键词搜索
      [data, total] = await queryBuilder.getManyAndCount();
    }

    // ========== 搜索增强（仅对常规搜索） ==========

    // 拼写纠正降级（无结果时）
    if (total === 0 && effectiveSearch && effectiveSearch.length >= 2) {
      const correctionResult =
        await this.searchEnhancerService.trySpellCorrection(
          effectiveSearch,
          sortBy,
          SORT_CONFIG,
          skip,
          limit,
        );

      if (correctionResult && correctionResult.total > 0) {
        data = correctionResult.data;
        total = correctionResult.total;
        correctedQuery = correctionResult.correctedQuery;
        spellCorrected = true;
        finalIntentSortApplied = correctionResult.intentSortApplied;
      }
    }

    // 多路召回 Fallback（仍无结果时）
    const searchQueryForEnhance = spellCorrected
      ? correctedQuery
      : effectiveSearch;
    if (total === 0 && searchQueryForEnhance) {
      const recallResult = await this.searchEnhancerService.tryMultiPathRecall(
        searchQueryForEnhance,
        analyzedQuery,
        {
          // 优先使用 URL 参数，其次使用关键词分析提取的品牌
          brands: filters.brands || analyzedFilters.brands,
          category: effectiveCategory,
          colors: filters.colors || analyzedFilters.colors,
          genders: filters.genders || gender || analyzedFilters.genders,
          seasons: filters.seasons || analyzedFilters.seasons,
        },
        intentSortBy,
        finalIntentSortApplied,
        limit,
        skip,
      );

      if (recallResult) {
        data = recallResult.products;
        total = recallResult.total;
        semanticEnhanced = true;
        usedFallback = recallResult.usedFallback;
      }
    }

    // 语义搜索增强（有结果但较少时补充）
    if (total > 0 && data.length < limit && searchQueryForEnhance) {
      const enhancedData = await this.searchEnhancerService.trySemanticEnhance(
        data,
        searchQueryForEnhance,
        limit,
      );
      if (enhancedData.length > data.length) {
        data = enhancedData;
        total = Math.max(total, enhancedData.length);
        semanticEnhanced = true;
      }
    }

    // ========== 后处理流水线 ==========
    return this.applyPostProcessing({
      data,
      searchQuery: searchQueryForEnhance || '',
      sortBy,
      intentSortApplied: finalIntentSortApplied,
      analyzedQuery,
      gender,
      filtersGenders: filters.genders,
      analyzedGenders: analyzedFilters.genders,
      preferredBrands,
      preferredCategories,
      page,
      limit,
      total,
      semanticEnhanced,
      usedFallback,
      searchContext,
    });
  }

  /**
   * 获取筛选器 facets
   */
  async getFacets(query: QueryProductDto): Promise<FacetResult> {
    const safeQuery = this.normalizeFacetQuery(query);
    if (!safeQuery) {
      return this.emptyFacetResult();
    }

    if (this.useMeilisearch) {
      try {
        return await this.getFacetsViaMeilisearch(safeQuery);
      } catch (error) {
        this.logger.error(
          `Meilisearch facets 失败，降级到 PostgreSQL: ${error.message}`,
        );
        await this.recordDegradation();
      }
    }

    try {
      return await this.facetService.getFacets(safeQuery);
    } catch (error) {
      this.logger.error(
        `PostgreSQL facets fallback 失败，返回空结果: ${error.message}`,
      );
      return this.emptyFacetResult();
    }
  }

  /**
   * 简单搜索（用于 suggest 等场景）
   */
  async search(query: string, limit: number = 10): Promise<Product[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const publicSearchRisk = this.assessPublicSearch(query);
    if (publicSearchRisk.risky) {
      this.logger.warn(
        `Dropping risky public suggest search: reason=${publicSearchRisk.reason}, query="${publicSearchRisk.sanitizedQuery}"`,
      );
      return [];
    }

    const safeSearchQuery = publicSearchRisk.sanitizedQuery || query.trim();

    if (this.useMeilisearch) {
      try {
        const context = await this.buildSearchContext({
          search: safeSearchQuery,
          status: ProductStatus.ACTIVE,
        } as QueryProductDto);
        const result = await this.executeMeilisearchSearchPlan({
          label: 'Suggest',
          context,
          execute: (searchTerm, stage) =>
            this.meilisearchService.search(searchTerm, {
              hitsPerPage: limit,
              page: 1,
              filter: this.buildMeilisearchFilter(
                stage === 'primary'
                  ? context.enrichedQuery
                  : ({ status: ProductStatus.ACTIVE } as QueryProductDto),
              ),
            }),
          getHitCount: (searchResult) => searchResult.totalHits ?? 0,
        });
        return result.hits.map((hit) => this.mapHitToProduct(hit));
      } catch (error) {
        this.logger.error(
          `Meilisearch suggest 失败，降级到 PostgreSQL: ${error.message}`,
        );
        await this.recordDegradation();
      }
    }

    const validation = validateSearchQuery(safeSearchQuery);
    if (!validation.valid) {
      return [];
    }

    const safeQuery = escapeIlike(validation.sanitizedQuery);
    return this.productRepository.find({
      where: [
        { title: ILike(`%${safeQuery}%`) },
        { originalTitle: ILike(`%${safeQuery}%`) },
      ],
      take: limit,
      relations: ['brand', 'primaryCategory'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========== 私有方法 ==========

  private assessPublicSearch(
    query?: string | null,
  ): ReturnType<typeof assessPublicSearchRisk> {
    if (!query) {
      return { risky: false, sanitizedQuery: '' };
    }

    return assessPublicSearchRisk(query);
  }

  private normalizeFacetQuery(query: QueryProductDto): QueryProductDto | null {
    const qRisk = this.assessPublicSearch(query.q);
    if (qRisk.risky) {
      this.logger.warn(
        `Dropping risky public facets q: reason=${qRisk.reason}, query="${qRisk.sanitizedQuery}"`,
      );
      return null;
    }

    const searchRisk = this.assessPublicSearch(query.search);
    if (searchRisk.risky) {
      this.logger.warn(
        `Dropping risky public facets search: reason=${searchRisk.reason}, query="${searchRisk.sanitizedQuery}"`,
      );
      return null;
    }

    return {
      ...query,
      q: qRisk.sanitizedQuery || query.q,
      search: searchRisk.sanitizedQuery || query.search,
    };
  }

  private emptyFacetResult(): FacetResult {
    return {
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 0 },
      colors: [],
      sizes: [],
      genders: [],
      styles: [],
      occasions: [],
      seasons: [],
    };
  }

  /**
   * 批量查询商品（通过 IDs）
   */
  private async findByIds(
    ids: string,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
  ): Promise<{
    data: Product[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const productIds = ids.split(',').filter(Boolean);

    if (productIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    // 构建查询
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .leftJoinAndSelect('product.secondaryCategories', 'secondaryCategories')
      .where('product.id IN (:...ids)', { ids: productIds })
      .andWhere('product.status = :status', { status: 'active' });

    // 排序
    const sortConfig = this.getSortConfig(sortBy, sortOrder);
    this.applySortConfig(queryBuilder, sortConfig);

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 执行查询
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 分析搜索查询
   */
  private async analyzeSearchQuery(
    effectiveSearch: string | undefined,
    category: string | undefined,
    sortBy: string,
    filters: Record<string, any>,
    gender: string | undefined,
  ): Promise<{
    analyzedQuery: AnalyzedQuery | null;
    effectiveCategory: string | undefined;
    analyzedFilters: Record<string, string>;
    intentSortBy: string;
    intentSortApplied: boolean;
  }> {
    let analyzedQuery: AnalyzedQuery | null = null;
    let effectiveCategory = category;
    const analyzedFilters: Record<string, string> = {};
    let intentSortBy = sortBy;
    let intentSortApplied = false;

    if (!effectiveSearch) {
      return {
        analyzedQuery,
        effectiveCategory,
        analyzedFilters,
        intentSortBy,
        intentSortApplied,
      };
    }

    analyzedQuery =
      await this.keywordAnalysisService.analyzeAsync(effectiveSearch);

    // 合并分析结果到筛选条件（仅当用户未手动指定时）
    if (analyzedQuery.brands.length > 0 && !filters.brands) {
      analyzedFilters.brands = analyzedQuery.brands.join(',');
    }
    if (analyzedQuery.categories.length > 0 && !category) {
      effectiveCategory = analyzedQuery.categories[0];
    }
    if (analyzedQuery.genders.length > 0 && !filters.genders && !gender) {
      analyzedFilters.genders = analyzedQuery.genders.join(',');
    }
    if (analyzedQuery.seasons.length > 0 && !filters.seasons) {
      analyzedFilters.seasons = analyzedQuery.seasons.join(',');
    }
    if (analyzedQuery.colors.length > 0 && !filters.colors) {
      analyzedFilters.colors = analyzedQuery.colors.join(',');
    }
    if (analyzedQuery.styles.length > 0 && !filters.styles) {
      analyzedFilters.styles = analyzedQuery.styles.join(',');
    }
    if (analyzedQuery.occasions.length > 0 && !filters.occasions) {
      analyzedFilters.occasions = analyzedQuery.occasions.join(',');
    }

    // 意图排序
    const isDefaultSort =
      sortBy === 'createdAt' || sortBy === 'relevance' || sortBy === 'popular';
    if (analyzedQuery.intent && isDefaultSort) {
      const { priceIntent, timeIntent } = analyzedQuery.intent;
      if (priceIntent === 'budget') {
        intentSortBy = 'price_asc';
        intentSortApplied = true;
      } else if (priceIntent === 'luxury') {
        intentSortBy = 'price_desc';
        intentSortApplied = true;
      } else if (timeIntent === 'new') {
        intentSortBy = 'newest';
        intentSortApplied = true;
      } else if (timeIntent === 'trending') {
        intentSortBy = 'popular';
        intentSortApplied = true;
      }
    }

    return {
      analyzedQuery,
      effectiveCategory,
      analyzedFilters,
      intentSortBy,
      intentSortApplied,
    };
  }

  /**
   * 检测是否为纯意图搜索
   * 纯意图搜索：有意图词但无具体品牌/分类，关键词搜索效果差，应直接走语义召回
   * 例如："gift for her", "cheap bags", "new arrivals"
   */
  private isPureIntentSearch(analyzedQuery: AnalyzedQuery | null): boolean {
    if (!analyzedQuery) return false;

    const hasIntent = !!(
      analyzedQuery.intent?.purposeIntent ||
      analyzedQuery.intent?.priceIntent ||
      analyzedQuery.intent?.timeIntent
    );

    // 没有意图，不是纯意图搜索
    if (!hasIntent) return false;

    // 有品牌匹配，不是纯意图搜索（如 "Nike gift" 应该走关键词搜索）
    if (analyzedQuery.brands.length > 0) return false;

    // 有分类匹配，不是纯意图搜索（如 "gift bags" 应该走关键词搜索找 bags）
    if (analyzedQuery.categories.length > 0) return false;

    // 检查剩余关键词是否为空或只有性别词
    const genderWords = new Set([
      'her',
      'him',
      'men',
      'women',
      'male',
      'female',
      'man',
      'woman',
    ]);
    const keywords = analyzedQuery.keywords || [];
    const hasNonGenderKeyword = keywords.some(
      (k) => !genderWords.has(k.toLowerCase()),
    );

    // 有非性别关键词，不是纯意图搜索
    if (hasNonGenderKeyword) return false;

    return true;
  }

  /**
   * 获取搜索关键词
   */
  private getSearchKeywords(
    analyzedQuery: AnalyzedQuery | null,
    effectiveSearch: string | undefined,
  ): string[] {
    const hasStructuredMatch =
      analyzedQuery &&
      (analyzedQuery.brands.length > 0 ||
        analyzedQuery.categories.length > 0 ||
        analyzedQuery.genders.length > 0 ||
        analyzedQuery.colors.length > 0 ||
        analyzedQuery.styles.length > 0 ||
        analyzedQuery.intent?.priceIntent ||
        analyzedQuery.intent?.timeIntent);

    if (analyzedQuery?.keywords?.length) {
      return analyzedQuery.keywords;
    }

    if (hasStructuredMatch) {
      return [];
    }

    return effectiveSearch ? [effectiveSearch] : [];
  }

  private async buildSearchContext(
    query: QueryProductDto,
    options?: {
      effectiveSearch?: string;
      sortBy?: string;
      filters?: Record<string, any>;
      gender?: string;
    },
  ): Promise<ProductSearchContext> {
    const effectiveSearch =
      options?.effectiveSearch ?? query.q ?? query.search ?? undefined;
    const sortBy = options?.sortBy ?? query.sortBy ?? 'createdAt';
    const gender = options?.gender ?? query.gender;
    const filters =
      options?.filters ??
      (() => {
        const rest = { ...query } as Record<string, any>;
        delete rest.page;
        delete rest.limit;
        delete rest.q;
        delete rest.search;
        delete rest.category;
        delete rest.sortBy;
        delete rest.sortOrder;
        delete rest.gender;
        delete rest.preferredBrands;
        delete rest.preferredCategories;
        delete rest.ids;
        return rest;
      })();

    const {
      analyzedQuery,
      effectiveCategory,
      analyzedFilters,
      intentSortBy,
      intentSortApplied,
    } = await this.analyzeSearchQuery(
      effectiveSearch,
      query.category,
      sortBy,
      filters,
      gender,
    );

    const searchKeywords = this.getSearchKeywords(
      analyzedQuery,
      effectiveSearch,
    );
    const meiliQuery = searchKeywords.join(' ');
    const enrichedQuery: QueryProductDto = {
      ...query,
      category: effectiveCategory,
      brands: query.brands || analyzedFilters.brands,
      colors: query.colors || query.color || analyzedFilters.colors,
      styles: query.styles || query.style || analyzedFilters.styles,
      genders: query.genders || query.gender || analyzedFilters.genders,
      occasions: query.occasions || analyzedFilters.occasions,
      seasons: query.seasons || analyzedFilters.seasons,
    };

    return {
      effectiveSearch,
      analyzedQuery,
      effectiveCategory,
      analyzedFilters,
      intentSortBy,
      intentSortApplied,
      searchKeywords,
      meiliQuery,
      enrichedQuery,
      isPureIntentSearch: this.isPureIntentSearch(analyzedQuery),
    };
  }

  private async executeMeilisearchSearchPlan<T>({
    label,
    context,
    execute,
    getHitCount,
  }: {
    label: string;
    context: ProductSearchContext;
    execute: (searchTerm: string, stage: 'primary' | 'fallback') => Promise<T>;
    getHitCount: (result: T) => number;
  }): Promise<T> {
    const primaryResult = await execute(context.meiliQuery, 'primary');
    if (
      getHitCount(primaryResult) > 0 ||
      !context.effectiveSearch ||
      context.effectiveSearch === context.meiliQuery
    ) {
      return primaryResult;
    }

    this.logger.log(
      `[Meili][${label}] 第一层无结果，回退全文搜索: "${context.effectiveSearch}"`,
    );

    return execute(context.effectiveSearch, 'fallback');
  }

  /**
   * 获取排序配置
   */
  private getSortConfig(
    sortBy: string,
    sortOrder: string,
  ): { field: string; order: 'ASC' | 'DESC'; featuredFirst?: boolean } {
    const config = SORT_CONFIG[sortBy];
    if (config) {
      // 对于旧版兼容的排序方式，使用传入的 sortOrder
      if (['createdAt', 'price', 'sales', 'views'].includes(sortBy)) {
        return { field: config.field, order: sortOrder as 'ASC' | 'DESC' };
      }
      // popular 排序时，isFeatured 商品置顶
      if (sortBy === 'popular') {
        return { ...config, featuredFirst: true };
      }
      return config;
    }
    return { field: 'createdAt', order: 'DESC' };
  }

  /** 应用排序到 queryBuilder，支持 isFeatured 置顶 */
  private applySortConfig(
    queryBuilder: import('typeorm').SelectQueryBuilder<Product>,
    sortConfig: {
      field: string;
      order: 'ASC' | 'DESC';
      featuredFirst?: boolean;
    },
  ): void {
    if (sortConfig.featuredFirst) {
      queryBuilder
        .orderBy('product.isFeatured', 'DESC')
        .addOrderBy('product.featuredSort', 'ASC')
        .addOrderBy(`product.${sortConfig.field}`, sortConfig.order);
    } else {
      queryBuilder.orderBy(`product.${sortConfig.field}`, sortConfig.order);
    }
  }

  /**
   * 记录搜索日志
   */
  private async logSearch(
    effectiveSearch: string | undefined,
    total: number,
    context: SearchContext = {},
  ): Promise<string | undefined> {
    if (!effectiveSearch) return undefined;

    try {
      const result = await this.searchAnalyticsService.logSearch(
        effectiveSearch,
        total,
        context,
      );
      return result.searchLogId;
    } catch (err) {
      this.logger.error('记录搜索日志失败', err);
      return undefined;
    }
  }

  /**
   * 后处理流水线：智能排序 → 偏好加权 → 礼物品类提升 → 性别权重 → 搜索日志
   * PostgreSQL 路径和 Meilisearch 路径共用
   */
  private async applyPostProcessing(params: {
    data: Product[];
    searchQuery: string;
    sortBy: string;
    intentSortApplied: boolean;
    analyzedQuery: AnalyzedQuery | null;
    gender: string | undefined;
    filtersGenders: string | undefined;
    analyzedGenders: string | undefined;
    preferredBrands: string | undefined;
    preferredCategories: string | undefined;
    page: number;
    limit: number;
    total: number;
    semanticEnhanced: boolean;
    usedFallback: boolean;
    searchContext?: SearchContext;
  }): Promise<{
    data: Product[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      searchLogId?: string;
      usedFallback?: boolean;
      semanticEnhanced?: boolean;
    };
  }> {
    const {
      data,
      searchQuery,
      sortBy,
      intentSortApplied,
      analyzedQuery,
      gender,
      filtersGenders,
      analyzedGenders,
      preferredBrands,
      preferredCategories,
      page,
      limit,
      total,
      semanticEnhanced,
      usedFallback,
      searchContext,
    } = params;

    // 后处理重排序仅在第 1 页执行，避免跨页排序不一致（分页在重排之前完成，
    // 第 2 页以后的重排会破坏全局排序，导致用户看到重复或遗漏的商品）
    let finalData = data;
    if (page === 1) {
      // 智能排序
      finalData = this.searchEnhancerService.applySmartRanking(
        data,
        searchQuery,
        sortBy,
        intentSortApplied,
      );

      // 用户偏好加权
      const genderFilter =
        gender ||
        (filtersGenders ? filtersGenders.split(',')[0] : null) ||
        (analyzedGenders ? analyzedGenders.split(',')[0] : null);
      const hasGenderSort = !!genderFilter;

      if (preferredBrands || preferredCategories) {
        const brandIds = preferredBrands
          ? preferredBrands.split(',').filter(Boolean)
          : [];
        const categoryIds = preferredCategories
          ? preferredCategories.split(',').filter(Boolean)
          : [];
        finalData = this.searchEnhancerService.applyPreferenceBoost(
          finalData,
          brandIds,
          categoryIds,
          intentSortApplied || hasGenderSort,
        );
      }

      // 礼物品类优先排序
      const isGiftIntent = analyzedQuery?.intent?.purposeIntent === 'gift';
      if (isGiftIntent && !intentSortApplied) {
        finalData =
          this.searchEnhancerService.applyGiftCategoryBoost(finalData);
      }

      // 性别匹配权重排序（最后执行）
      if (hasGenderSort) {
        finalData = this.searchEnhancerService.applyGenderWeightSort(
          finalData,
          genderFilter,
        );
      }
    }

    // 批量补充 hasEmbedding 状态
    if (finalData.length > 0) {
      const productIds = finalData.map((p) => p.id);
      const embeddingRows = await this.productRepository.manager.query(
        `SELECT DISTINCT product_id FROM product_image_embeddings WHERE product_id = ANY($1) AND embedding IS NOT NULL`,
        [productIds],
      );
      const embeddingSet = new Set(
        embeddingRows.map((r: { product_id: string }) => r.product_id),
      );
      for (const p of finalData) {
        (p as any).hasEmbedding = embeddingSet.has(p.id);
      }
    }

    // 记录搜索日志
    const searchLogId = await this.logSearch(
      searchQuery || undefined,
      total,
      searchContext,
    );

    return {
      data: finalData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ...(searchLogId && { searchLogId }),
        ...(semanticEnhanced && { semanticEnhanced: true }),
        ...(usedFallback && { usedFallback: true }),
      },
    };
  }

  // ================================================================
  // Meilisearch 搜索路径
  // ================================================================

  private async searchViaMeilisearch(
    query: QueryProductDto,
    analyticsContext: SearchContext = {},
  ): Promise<{
    data: Product[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      searchLogId?: string;
      usedFallback?: boolean;
      semanticEnhanced?: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      q,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      gender,
      preferredBrands,
      preferredCategories,
      ...filters
    } = query;

    const effectiveSearch = q ?? search ?? '';
    const searchContext = await this.buildSearchContext(query, {
      effectiveSearch,
      sortBy,
      filters,
      gender,
    });
    const {
      analyzedQuery,
      effectiveCategory,
      analyzedFilters,
      intentSortBy,
      intentSortApplied,
      enrichedQuery,
      isPureIntentSearch,
    } = searchContext;

    const meiliSearchFacets = [
      'brandSlug',
      'colors',
      'genders',
      'styles',
      'occasions',
      'seasons',
      'priceMin',
      'priceMax',
    ];

    let data: Product[] = [];
    let total = 0;
    let semanticEnhanced = false;
    let usedFallback = false;

    if (isPureIntentSearch && effectiveSearch) {
      // 纯意图搜索：Meilisearch 对纯意图词效果差，走多路召回
      this.logger.log(
        `[Meili] 检测到纯意图搜索: "${effectiveSearch}"，走多路召回`,
      );
      const recallResult = await this.searchEnhancerService.tryMultiPathRecall(
        effectiveSearch,
        analyzedQuery,
        {
          brands: filters.brands || analyzedFilters.brands,
          category: effectiveCategory,
          colors: filters.colors || analyzedFilters.colors,
          genders: filters.genders || gender || analyzedFilters.genders,
          seasons: filters.seasons || analyzedFilters.seasons,
        },
        intentSortBy,
        intentSortApplied,
        limit,
        (page - 1) * limit,
      );

      if (recallResult) {
        data = recallResult.products;
        total = recallResult.total;
        semanticEnhanced = true;
        usedFallback = recallResult.usedFallback;
      }
    } else {
      const explicitFilterQuery: QueryProductDto = {
        ...query,
        status: query.status,
      };
      const searchResult = await this.executeMeilisearchSearchPlan({
        label: 'Results',
        context: searchContext,
        execute: (searchTerm, stage) =>
          this.meilisearchService.search(searchTerm, {
            filter: this.buildMeilisearchFilter(
              stage === 'primary' ? enrichedQuery : explicitFilterQuery,
            ),
            sort: this.buildMeilisearchSort(
              intentSortBy,
              sortOrder,
              searchTerm,
            ),
            facets: meiliSearchFacets,
            page,
            hitsPerPage: limit,
          }),
        getHitCount: (result) => result.totalHits ?? 0,
      });

      data = searchResult.hits.map((hit) => this.mapHitToProduct(hit));
      total = searchResult.totalHits ?? 0;

      if (this.shouldUseExactActiveCount(query)) {
        const exactTotal = await this.getExactActiveProductCount();
        if (exactTotal !== null) {
          total = exactTotal;
        }
      }
      // ===== 第三层：仍然 0 结果时走多路召回兜底 =====
      if (total === 0 && effectiveSearch) {
        this.logger.log(
          `[Meili] 前两层均无结果，走多路召回兜底: "${effectiveSearch}"`,
        );
        const recallResult =
          await this.searchEnhancerService.tryMultiPathRecall(
            effectiveSearch,
            analyzedQuery,
            {
              brands: filters.brands || analyzedFilters.brands,
              category: effectiveCategory,
              colors: filters.colors || analyzedFilters.colors,
              genders: filters.genders || gender || analyzedFilters.genders,
              seasons: filters.seasons || analyzedFilters.seasons,
            },
            intentSortBy,
            intentSortApplied,
            limit,
            (page - 1) * limit,
          );

        if (recallResult) {
          data = recallResult.products;
          total = recallResult.total;
          semanticEnhanced = true;
          usedFallback = recallResult.usedFallback;
        }
      }
    }

    // ========== 语义搜索增强（有结果但较少时补充） ==========
    const searchQueryForEnhance = effectiveSearch || '';
    if (total > 0 && data.length < limit && searchQueryForEnhance) {
      const enhancedData = await this.searchEnhancerService.trySemanticEnhance(
        data,
        searchQueryForEnhance,
        limit,
      );
      if (enhancedData.length > data.length) {
        data = enhancedData;
        total = Math.max(total, enhancedData.length);
        semanticEnhanced = true;
      }
    }

    // ========== 后处理流水线 ==========
    return this.applyPostProcessing({
      data,
      searchQuery: searchQueryForEnhance,
      sortBy,
      intentSortApplied,
      analyzedQuery,
      gender,
      filtersGenders: filters.genders,
      analyzedGenders: analyzedFilters.genders,
      preferredBrands,
      preferredCategories,
      page,
      limit,
      total,
      semanticEnhanced,
      usedFallback,
      searchContext: analyticsContext,
    });
  }

  /**
   * 转义 Meilisearch 过滤器值，防止过滤器注入攻击
   */
  private escapeMeiliFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private buildMeilisearchFilter(query: QueryProductDto): string {
    const filters: string[] = [];
    const esc = (v: string) => this.escapeMeiliFilterValue(v);

    // 状态筛选（status 已在 findAll 入口处被安全处理）
    if (query.status === 'all') {
      // admin: no status filter
    } else if (query.status) {
      filters.push(`status = "${esc(query.status)}"`);
    } else {
      filters.push('status = "active"');
    }

    // 分类筛选（使用预计算的 allCategorySlugs）
    if (query.category) {
      filters.push(`allCategorySlugs = "${esc(query.category)}"`);
    }

    // 多选分类筛选（categories=shoes,bags → OR 逻辑）
    if (query.categories) {
      const slugs = query.categories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length === 1) {
        filters.push(`allCategorySlugs = "${esc(slugs[0])}"`);
      } else if (slugs.length > 1) {
        filters.push(
          `(${slugs.map((s) => `allCategorySlugs = "${esc(s)}"`).join(' OR ')})`,
        );
      }
    }

    // 品牌筛选
    if (query.brands) {
      const slugs = query.brands
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length === 1) {
        filters.push(`brandSlug = "${esc(slugs[0])}"`);
      } else if (slugs.length > 1) {
        filters.push(
          `brandSlug IN [${slugs.map((s) => `"${esc(s)}"`).join(', ')}]`,
        );
      }
    }

    // 价格筛选（区间重叠：商品有任意 SKU 在用户预算范围内即匹配）
    if (query.minPrice != null) filters.push(`priceMax >= ${query.minPrice}`);
    if (query.maxPrice != null) filters.push(`priceMin <= ${query.maxPrice}`);

    // 属性筛选
    const attrFilters: Array<{ key: string; values: string }> = [
      { key: 'colors', values: query.colors || query.color || '' },
      { key: 'styles', values: query.styles || query.style || '' },
      { key: 'genders', values: query.genders || query.gender || '' },
      { key: 'occasions', values: query.occasions || '' },
      { key: 'seasons', values: query.seasons || '' },
    ];

    for (const { key, values } of attrFilters) {
      if (!values) continue;
      const vals = values
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (vals.length === 1) {
        filters.push(`${key} = "${esc(vals[0])}"`);
      } else if (vals.length > 1) {
        filters.push(
          `${key} IN [${vals.map((v) => `"${esc(v)}"`).join(', ')}]`,
        );
      }
    }

    // 特性筛选
    if (query.isFeatured != null)
      filters.push(`isFeatured = ${query.isFeatured}`);

    return filters.join(' AND ');
  }

  private buildMeilisearchSort(
    sortBy: string,
    sortOrder: string,
    effectiveSearch: string,
  ): string[] | undefined {
    // 有搜索词且用户没有指定排序时，依赖 Meilisearch 的相关性排序
    const isDefaultSort =
      sortBy === 'createdAt' || sortBy === 'relevance' || sortBy === 'popular';
    if (effectiveSearch && isDefaultSort) {
      return undefined;
    }

    const MEILI_SORT_MAP: Record<string, string[]> = {
      newest: ['createdAt:desc'],
      createdAt: [`createdAt:${sortOrder === 'ASC' ? 'asc' : 'desc'}`],
      price_asc: ['priceMin:asc'],
      price_desc: ['priceMin:desc'],
      price: [`priceMin:${sortOrder === 'ASC' ? 'asc' : 'desc'}`],
      popular: ['isFeatured:desc', 'featuredSort:asc', 'popularityScore:desc'],
      views: [`viewCount:${sortOrder === 'ASC' ? 'asc' : 'desc'}`],
      sales: [`salesCount:${sortOrder === 'ASC' ? 'asc' : 'desc'}`],
    };

    return MEILI_SORT_MAP[sortBy] ?? ['createdAt:desc'];
  }

  private async getFacetsViaMeilisearch(
    query: QueryProductDto,
  ): Promise<FacetResult> {
    const effectiveSearch = query.q ?? query.search ?? '';
    const { gender, ...filters } = query;

    const searchContext = await this.buildSearchContext(query, {
      effectiveSearch,
      sortBy: query.sortBy || 'createdAt',
      filters,
      gender,
    });
    const { enrichedQuery } = searchContext;

    // 分类聚合走 PostgreSQL（Meilisearch 不支持层级分类树），与 Meilisearch 搜索并行
    const categoryIds = enrichedQuery.category
      ? await this.filterBuilderService.getCategoryIds(enrichedQuery.category)
      : null;
    const brandSlugsForCategory = enrichedQuery.brands
      ? enrichedQuery.brands.split(',').map((b) => b.trim().toLowerCase())
      : null;

    const facetAttributes = [
      'brandSlug',
      'colors',
      'genders',
      'styles',
      'occasions',
      'seasons',
      'priceMin',
      'priceMax',
    ];
    const explicitFilterQuery: QueryProductDto = {
      ...query,
      status: query.status,
    };

    const [searchResult, categories] = await Promise.all([
      this.executeMeilisearchSearchPlan({
        label: 'Facets',
        context: searchContext,
        execute: (searchTerm, stage) =>
          this.meilisearchService.search(searchTerm, {
            filter: this.buildMeilisearchFilter(
              stage === 'primary' ? enrichedQuery : explicitFilterQuery,
            ),
            facets: facetAttributes,
            hitsPerPage: 0,
            page: 1,
          }),
        getHitCount: (result) => result.totalHits ?? 0,
      }),
      this.facetService.aggregateCategories(categoryIds, brandSlugsForCategory),
    ]);

    const dist = searchResult.facetDistribution || {};
    const stats = searchResult.facetStats || {};

    // Build brand facets with name lookup
    const brandSlugs = Object.keys(dist.brandSlug || {});
    let brandMap = new Map<string, Brand>();
    if (brandSlugs.length > 0) {
      const brands = await this.brandRepository.find({
        where: { slug: In(brandSlugs) },
        select: ['id', 'name', 'slug'],
      });
      brandMap = new Map(brands.map((b) => [b.slug, b]));
    }

    return {
      categories,
      brands: Object.entries(dist.brandSlug || {}).map(([slug, count]) => {
        const brand = brandMap.get(slug);
        return {
          id: brand?.id || '',
          name: brand?.name || slug,
          slug,
          count: count,
        };
      }),
      priceRange: {
        min: (stats as any).priceMin?.min ?? 0,
        max: (stats as any).priceMax?.max ?? 0,
      },
      colors: Object.entries(dist.colors || {}).map(([value, count]) => ({
        value,
        count: count,
      })),
      sizes: [],
      genders: Object.entries(dist.genders || {}).map(([value, count]) => ({
        value,
        count: count,
      })),
      styles: Object.entries(dist.styles || {}).map(([value, count]) => ({
        value,
        count: count,
      })),
      occasions: Object.entries(dist.occasions || {}).map(([value, count]) => ({
        value,
        count: count,
      })),
      seasons: Object.entries(dist.seasons || {}).map(([value, count]) => ({
        value,
        count: count,
      })),
    };
  }

  /**
   * Map a Meilisearch hit to a Product-like object.
   * Meilisearch documents already contain brand/primaryCategory objects.
   */
  private mapHitToProduct(hit: Record<string, any>): Product {
    // 从 Meilisearch 的 genders 数组重建 aiAttributes.gender，
    // 供 applyGenderWeightSort() 使用
    const genders: string[] = hit.genders || [];
    const aiAttributes =
      genders.length > 0 ? { gender: genders[0] } : undefined;

    return {
      id: hit.id,
      productGroupId: hit.productGroupId,
      title: hit.title,
      slug: hit.slug,
      description: hit.description,
      originalTitle: hit.originalTitle,
      mainImage: hit.mainImage,
      images: hit.images || [],
      currency: hit.currency,
      priceMin: hit.priceMin,
      priceMax: hit.priceMax,
      status: hit.status,
      isFeatured: hit.isFeatured,
      hasVariants: hit.hasVariants,
      viewCount: hit.viewCount,
      salesCount: hit.salesCount,
      popularityScore: hit.popularityScore ?? 0,
      ctr: hit.ctr,
      createdAt: hit.createdAt ? new Date(hit.createdAt) : undefined,
      brand: hit.brand || null,
      brandId: hit.brand?.id || null,
      primaryCategory: hit.primaryCategory || null,
      primaryCategoryId: hit.primaryCategory?.id || null,
      aiBrandName: hit.aiBrandName || null,
      aiAttributes,
      hasEmbedding: hit.hasEmbedding ?? false,
    } as unknown as Product;
  }
}
