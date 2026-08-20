import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProductQueryService } from './product-query.service';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import { Brand } from '../brands/entities/brand.entity';
import { SettingsService } from '../settings/settings.service';
import { PlatformsService } from '../platforms/platforms.service';
import { KeywordAnalysisService } from '../search/keyword-analysis.service';
import { SearchAnalyticsService } from '../search/search-analytics.service';
import { SemanticSearchService } from '../search/semantic-search.service';
import { ProductFilterBuilderService } from './product-filter-builder.service';
import { ProductFacetService } from './product-facet.service';
import { ProductSearchEnhancerService } from './product-search-enhancer.service';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { ProductSearchRuntimeService } from './product-search-runtime.service';
import { ProductDetailService } from './product-detail.service';
import { ProductPurchaseService } from './product-purchase.service';
import { ProductCatalogQueryService } from './product-catalog-query.service';
import { AdminProductQueryService } from './admin-product-query.service';
import { ProductStatus } from './product-status';

describe('ProductQueryService', () => {
  let service: ProductQueryService;
  let productRepository: any;
  let skuRepository: any;
  let brandRepository: any;
  let configService: any;
  let settingsService: any;
  let platformsService: any;
  let keywordAnalysisService: any;
  let searchAnalyticsService: any;
  let semanticSearchService: any;
  let filterBuilderService: any;
  let facetService: any;
  let searchEnhancerService: any;
  let meilisearchService: any;
  let cacheManager: any;

  // Helper: mock QueryBuilder chain
  const createMockQueryBuilder = (
    data: any[] = [],
    total = 0,
    rawMany: any[] = [],
    rawOne: any = {},
  ) => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([data, total]),
      getRawMany: jest.fn().mockResolvedValue(rawMany),
      getRawOne: jest.fn().mockResolvedValue(rawOne),
      getQueryAndParameters: jest.fn().mockReturnValue(['SELECT 1', []]),
    };
    qb.clone = jest.fn(() => qb);
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    productRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      manager: {
        query: jest.fn().mockResolvedValue([]),
      },
    };

    skuRepository = {};

    brandRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    meilisearchService = {
      search: jest.fn().mockResolvedValue({
        hits: [],
        totalHits: 0,
        totalPages: 0,
        facetDistribution: {},
        facetStats: {},
      }),
    };

    cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    settingsService = {
      get: jest.fn().mockResolvedValue(null),
    };

    platformsService = {
      findByKey: jest.fn(),
      getDefaultPlatform: jest.fn(),
      generateBuyLink: jest
        .fn()
        .mockReturnValue('https://buy.example.com/item/123'),
      findActive: jest.fn().mockResolvedValue([]),
    };

    keywordAnalysisService = {
      analyzeAsync: jest.fn().mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: null,
      }),
    };

    searchAnalyticsService = {
      logSearch: jest.fn().mockResolvedValue({ searchLogId: 'log-1' }),
    };

    semanticSearchService = {};

    filterBuilderService = {
      applyAllFilters: jest.fn().mockResolvedValue(undefined),
      applyTextSearchFilter: jest.fn(),
      getCategoryIds: jest.fn().mockResolvedValue(null),
    };

    facetService = {
      getFacets: jest.fn().mockResolvedValue({}),
      aggregateCategories: jest.fn().mockResolvedValue([]),
    };

    searchEnhancerService = {
      trySpellCorrection: jest.fn().mockResolvedValue(null),
      tryMultiPathRecall: jest.fn().mockResolvedValue(null),
      trySemanticEnhance: jest
        .fn()
        .mockImplementation((data) => Promise.resolve(data)),
      applySmartRanking: jest.fn().mockImplementation((data) => data),
      applyPreferenceBoost: jest.fn().mockImplementation((data) => data),
      applyGenderWeightSort: jest.fn().mockImplementation((data) => data),
      applyGiftCategoryBoost: jest.fn().mockImplementation((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductQueryService,
        ProductSearchRuntimeService,
        ProductDetailService,
        ProductPurchaseService,
        ProductCatalogQueryService,
        AdminProductQueryService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(Sku), useValue: skuRepository },
        { provide: getRepositoryToken(Brand), useValue: brandRepository },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: MeilisearchService, useValue: meilisearchService },
        { provide: SettingsService, useValue: settingsService },
        { provide: PlatformsService, useValue: platformsService },
        { provide: KeywordAnalysisService, useValue: keywordAnalysisService },
        { provide: SearchAnalyticsService, useValue: searchAnalyticsService },
        { provide: SemanticSearchService, useValue: semanticSearchService },
        {
          provide: ProductFilterBuilderService,
          useValue: filterBuilderService,
        },
        { provide: ProductFacetService, useValue: facetService },
        {
          provide: ProductSearchEnhancerService,
          useValue: searchEnhancerService,
        },
      ],
    }).compile();

    service = module.get<ProductQueryService>(ProductQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== findOne() =====
  describe('findOne()', () => {
    it('查询商品不自增 viewCount（由前端主动上报）', async () => {
      const product = { id: 'prod-1', title: 'Test' };
      productRepository.findOne.mockResolvedValue(product);

      const result = await service.findOne('prod-1');

      expect(result).toEqual(product);
      expect(productRepository.increment).not.toHaveBeenCalled();
    });

    it('商品不存在抛出 NotFoundException', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===== findBySlug() =====
  describe('findBySlug()', () => {
    it('查询商品不自增 viewCount（由前端主动上报）', async () => {
      const product = { id: 'prod-1', slug: 'nike-shoes-abc' };
      productRepository.findOne.mockResolvedValue(product);

      const result = await service.findBySlug('nike-shoes-abc');

      expect(result).toEqual(product);
      expect(productRepository.increment).not.toHaveBeenCalled();
    });

    it('命中缓存时直接返回缓存商品', async () => {
      const product = {
        id: 'prod-1',
        slug: 'nike-shoes-abc',
        status: ProductStatus.ACTIVE,
      };
      cacheManager.get.mockResolvedValue(product);

      const result = await service.findBySlug('nike-shoes-abc');

      expect(result).toEqual(product);
      expect(productRepository.findOne).not.toHaveBeenCalled();
    });

    it('缓存未命中时查询数据库并回写缓存', async () => {
      const product = { id: 'prod-1', slug: 'nike-shoes-abc' };
      cacheManager.get.mockResolvedValue(null);
      productRepository.findOne.mockResolvedValue(product);

      const result = await service.findBySlug('nike-shoes-abc');

      expect(result).toEqual(product);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'product:detail:slug:nike-shoes-abc',
        product,
        3_600_000,
      );
    });

    it('slug 不存在抛出 NotFoundException', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.findBySlug('no-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('invalidateProductDetailCacheBySlug()', () => {
    it('删除指定 slug 的详情缓存', async () => {
      await service.invalidateProductDetailCacheBySlug('nike-shoes-abc');

      expect(cacheManager.del).toHaveBeenCalledWith(
        'product:detail:slug:nike-shoes-abc',
      );
    });
  });

  // ===== findByWeidianItemId() =====
  describe('findByWeidianItemId()', () => {
    it('should return null for empty weidianItemId', async () => {
      const result = await service.findByWeidianItemId('');
      expect(result).toBeNull();
      expect(productRepository.findOne).not.toHaveBeenCalled();
    });

    it('should query by weidianItemId', async () => {
      productRepository.findOne.mockResolvedValue({ id: 'prod-1' });
      const result = await service.findByWeidianItemId('wd-123');
      expect(result).toEqual({ id: 'prod-1' });
    });
  });

  // ===== getAllSlugs() =====
  describe('getAllSlugs()', () => {
    it('不传分页参数返回全量 slugs', async () => {
      productRepository.find.mockResolvedValue([
        { slug: 'slug-a' },
        { slug: 'slug-b' },
      ]);
      const result = await service.getAllSlugs();
      expect(result).toEqual({ slugs: ['slug-a', 'slug-b'] });
    });

    it('传 page+limit 返回分页结果和 total', async () => {
      productRepository.findAndCount.mockResolvedValue([
        [{ slug: 'slug-c' }],
        100,
      ]);
      const result = await service.getAllSlugs(2, 50);
      expect(result).toEqual({ slugs: ['slug-c'], total: 100 });
      expect(productRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });
  });

  // ===== search() =====
  describe('search()', () => {
    it('should return empty for query shorter than 2 chars', async () => {
      expect(await service.search('a')).toEqual([]);
      expect(await service.search('')).toEqual([]);
    });

    it('should search by title with ILike', async () => {
      productRepository.find.mockResolvedValue([{ id: 'p1' }]);
      const result = await service.search('nike', 5);
      expect(result).toHaveLength(1);
      expect(productRepository.find).toHaveBeenCalled();
    });

    it('should escape ILIKE wildcards in query', async () => {
      productRepository.find.mockResolvedValue([]);
      await service.search('100%', 5);
      const call = productRepository.find.mock.calls[0][0];
      // % should be escaped to \% so it's treated as literal
      expect(call.where[0].title._value).toContain('100\\%');
    });

    it('should reject invalid queries via validateSearchQuery', async () => {
      // SQL injection keyword should be rejected
      const result = await service.search('DROP TABLE products', 5);
      expect(result).toEqual([]);
      expect(productRepository.find).not.toHaveBeenCalled();
    });

    it('should short-circuit risky non-commerce suggest searches', async () => {
      const result = await service.search(
        'what is the wow maintenance tomorrow',
        5,
      );

      expect(result).toEqual([]);
      expect(productRepository.find).not.toHaveBeenCalled();
      expect(meilisearchService.search).not.toHaveBeenCalled();
      expect(keywordAnalysisService.analyzeAsync).not.toHaveBeenCalled();
    });
  });

  // ===== generateBuyLink() =====
  describe('generateBuyLink()', () => {
    const product = { id: 'prod-1', weidianItemId: 'wd-123', title: 'Nike' };

    it('should generate link with specified platform', async () => {
      productRepository.findOne.mockResolvedValue(product);
      platformsService.findByKey.mockResolvedValue({
        key: 'superbuy',
        name: 'Superbuy',
      });

      const result = await service.generateBuyLink('prod-1', 'superbuy');

      expect(result.url).toBe('https://buy.example.com/item/123');
      expect(result.platform).toBe('superbuy');
    });

    it('should use default platform when none specified', async () => {
      productRepository.findOne.mockResolvedValue(product);
      platformsService.getDefaultPlatform.mockResolvedValue({
        key: 'def',
        name: 'Default',
      });

      const result = await service.generateBuyLink('prod-1');

      expect(platformsService.getDefaultPlatform).toHaveBeenCalled();
      expect(result.platform).toBe('def');
    });

    it('should throw if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.generateBuyLink('bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if product has no weidianItemId', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'p1',
        weidianItemId: null,
      });
      await expect(service.generateBuyLink('p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if specified platform not found', async () => {
      productRepository.findOne.mockResolvedValue(product);
      platformsService.findByKey.mockResolvedValue(null);
      await expect(service.generateBuyLink('prod-1', 'bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if no default platform available', async () => {
      productRepository.findOne.mockResolvedValue(product);
      platformsService.getDefaultPlatform.mockResolvedValue(null);
      await expect(service.generateBuyLink('prod-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===== findAll() =====
  describe('findAll()', () => {
    // Helper to setup a basic findAll scenario
    const setupBasicQuery = (data: any[] = [], total = 0) => {
      const qb = createMockQueryBuilder(data, total);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should throw BadRequestException if q and search conflict', async () => {
      await expect(
        service.findAll({ q: 'nike', search: 'adidas' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return paginated results for basic query', async () => {
      const products = [{ id: 'p1' }, { id: 'p2' }];
      setupBasicQuery(products, 2);

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should share concurrent non-search product list loads and reuse the short cache', async () => {
      let resolveQuery: (value: [any[], number]) => void = () => undefined;
      const qb = createMockQueryBuilder([], 0);
      qb.getManyAndCount.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
      );
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const query = { page: 1, limit: 10, sortBy: 'popular' } as any;
      const first = service.findAll(query);
      const second = service.findAll({ ...query });
      await new Promise((resolve) => setImmediate(resolve));

      expect(productRepository.createQueryBuilder).toHaveBeenCalledTimes(1);

      resolveQuery([[{ id: 'p1' }], 1]);

      const [firstResult, secondResult] = await Promise.all([first, second]);
      expect(firstResult.meta.total).toBe(1);
      expect(secondResult.data).toHaveLength(1);

      const cached = await service.findAll({ ...query });
      expect(cached.meta.total).toBe(1);
      expect(productRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('should return an empty fallback when too many product list loads are active', async () => {
      const resolvers: Array<(value: [any[], number]) => void> = [];
      productRepository.createQueryBuilder.mockImplementation(() => {
        const qb = createMockQueryBuilder([], 0);
        qb.getManyAndCount.mockReturnValue(
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
        );
        return qb;
      });

      const first = service.findAll({ page: 1, limit: 10 } as any);
      const second = service.findAll({ page: 2, limit: 10 } as any);
      await new Promise((resolve) => setImmediate(resolve));

      const third = await service.findAll({ page: 3, limit: 10 } as any);

      expect(third.data).toEqual([]);
      expect(third.meta.usedFallback).toBe(true);
      expect(productRepository.createQueryBuilder).toHaveBeenCalledTimes(2);

      resolvers[0]([[{ id: 'p1' }], 1]);
      resolvers[1]([[{ id: 'p2' }], 1]);
      await Promise.all([first, second]);
    });

    it('should use fast path when ids param provided', async () => {
      const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ ids: 'p1,p2' } as any);

      expect(qb.where).toHaveBeenCalled();
      expect(keywordAnalysisService.analyzeAsync).not.toHaveBeenCalled();
      expect(result.meta.total).toBe(1);
    });

    it('should skip ids fast path for empty string (falsy)', async () => {
      setupBasicQuery([], 0);
      const result = await service.findAll({ ids: '' } as any);
      // Empty string is falsy → goes through normal path
      expect(result.meta.total).toBe(0);
    });

    it('should call keyword analysis for search queries', async () => {
      setupBasicQuery([{ id: 'p1' }], 1);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: ['shoes'],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: null,
      });

      await service.findAll({ search: 'shoes' } as any);

      expect(keywordAnalysisService.analyzeAsync).toHaveBeenCalledWith('shoes');
    });

    it('should apply budget intent → price_asc sort', async () => {
      const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { priceIntent: 'budget' },
      });

      await service.findAll({ search: 'cheap bags' } as any);

      // price_asc → priceMin ASC
      expect(qb.orderBy).toHaveBeenCalledWith('product.priceMin', 'ASC');
    });

    it('should apply luxury intent → price_desc sort', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { priceIntent: 'luxury' },
      });

      await service.findAll({ search: 'luxury watch' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('product.priceMin', 'DESC');
    });

    it('should apply new intent → newest sort', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { timeIntent: 'new' },
      });

      await service.findAll({ search: 'new arrivals' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('should try spell correction when no results found', async () => {
      setupBasicQuery([], 0); // zero results
      searchEnhancerService.trySpellCorrection.mockResolvedValue({
        data: [{ id: 'p-corrected' }],
        total: 1,
        correctedQuery: 'nike',
        intentSortApplied: false,
      });

      const result = await service.findAll({ search: 'nkie' } as any);

      expect(searchEnhancerService.trySpellCorrection).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should try multi-path recall when spell correction also fails', async () => {
      setupBasicQuery([], 0);
      searchEnhancerService.trySpellCorrection.mockResolvedValue(null);
      searchEnhancerService.tryMultiPathRecall.mockResolvedValue({
        products: [{ id: 'p-recall' }],
        total: 1,
        usedFallback: true,
      });

      const result = await service.findAll({ search: 'xyz123' } as any);

      expect(searchEnhancerService.tryMultiPathRecall).toHaveBeenCalled();
      expect(result.meta.usedFallback).toBe(true);
    });

    it('should enhance with semantic search when results < limit', async () => {
      setupBasicQuery([{ id: 'p1' }], 1);
      searchEnhancerService.trySemanticEnhance.mockResolvedValue([
        { id: 'p1' },
        { id: 'p-semantic' },
      ]);

      const result = await service.findAll({
        search: 'shoes',
        limit: 10,
      } as any);

      expect(searchEnhancerService.trySemanticEnhance).toHaveBeenCalled();
      expect(result.meta.semanticEnhanced).toBe(true);
    });

    it('should log search and return searchLogId', async () => {
      setupBasicQuery([{ id: 'p1' }], 1);

      const result = await service.findAll({ search: 'nike' } as any);

      expect(searchAnalyticsService.logSearch).toHaveBeenCalledWith(
        'nike',
        1,
        {},
      );
      expect(result.meta.searchLogId).toBe('log-1');
    });

    it('should short-circuit risky non-commerce public searches before heavy search work', async () => {
      const result = await service.findAll({
        search: 'what is the wow maintenance tomorrow',
        page: 1,
        limit: 10,
      } as any);

      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          usedFallback: true,
        },
      });
      expect(productRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(meilisearchService.search).not.toHaveBeenCalled();
      expect(keywordAnalysisService.analyzeAsync).not.toHaveBeenCalled();
      expect(searchAnalyticsService.logSearch).not.toHaveBeenCalled();
    });

    it('should handle search log failure gracefully', async () => {
      setupBasicQuery([{ id: 'p1' }], 1);
      searchAnalyticsService.logSearch.mockRejectedValue(new Error('DB down'));

      const result = await service.findAll({ search: 'nike' } as any);

      expect(result.meta.searchLogId).toBeUndefined();
      expect(result.data).toHaveLength(1);
    });

    it('should use multi-path recall for pure intent search', async () => {
      setupBasicQuery([], 0);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: ['her'],
        brands: [],
        categories: [],
        genders: ['female'],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { purposeIntent: 'gift' },
      });
      searchEnhancerService.tryMultiPathRecall.mockResolvedValue({
        products: [{ id: 'p-gift' }],
        total: 1,
        usedFallback: false,
      });

      const result = await service.findAll({ search: 'gift for her' } as any);

      expect(result.meta.semanticEnhanced).toBe(true);
    });

    it('should apply preference boost when preferredBrands given', async () => {
      setupBasicQuery([{ id: 'p1' }], 1);

      await service.findAll({
        search: 'bag',
        preferredBrands: 'b1,b2',
      } as any);

      expect(searchEnhancerService.applyPreferenceBoost).toHaveBeenCalledWith(
        expect.any(Array),
        ['b1', 'b2'],
        [],
        expect.any(Boolean),
      );
    });

    it('should apply gift category boost for gift intent', async () => {
      setupBasicQuery([{ id: 'p1' }], 1);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { purposeIntent: 'gift' },
      });

      await service.findAll({ search: 'gift ideas' } as any);

      expect(searchEnhancerService.applyGiftCategoryBoost).toHaveBeenCalled();
    });

    it('should apply trending intent → popular sort', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { timeIntent: 'trending' },
      });

      await service.findAll({ search: 'trending bags' } as any);

      // popular 排序：isFeatured 置顶 + featuredSort 升序 + popularityScore 降序
      expect(qb.orderBy).toHaveBeenCalledWith('product.isFeatured', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('product.featuredSort', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith(
        'product.popularityScore',
        'DESC',
      );
    });

    it('should NOT override user-specified custom sort with intent', async () => {
      const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
      productRepository.createQueryBuilder.mockReturnValue(qb);
      keywordAnalysisService.analyzeAsync.mockResolvedValue({
        keywords: [],
        brands: [],
        categories: [],
        genders: [],
        colors: [],
        styles: [],
        occasions: [],
        seasons: [],
        intent: { priceIntent: 'budget' },
      });

      await service.findAll({ search: 'cheap', sortBy: 'price_desc' } as any);

      // User explicitly chose price_desc → should NOT be overridden to price_asc
      expect(qb.orderBy).toHaveBeenCalledWith('product.priceMin', 'DESC');
    });
  });

  // ===== gender weight sort =====
  describe('findAll() gender sort', () => {
    it('should apply gender weight sort when gender filter present', async () => {
      const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'bag', gender: 'female' } as any);

      expect(searchEnhancerService.applyGenderWeightSort).toHaveBeenCalledWith(
        expect.any(Array),
        'female',
      );
    });
  });

  // ===== legacy sort compat =====
  describe('findAll() legacy sort', () => {
    it('should use passed sortOrder for legacy sort keys', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'price', sortOrder: 'DESC' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('product.priceMin', 'DESC');
    });
  });

  // ===== getFacets() =====
  describe('getFacets()', () => {
    it('should delegate to facetService', async () => {
      const query = { category: 'shoes' } as any;
      await service.getFacets(query);
      expect(facetService.getFacets).toHaveBeenCalledWith(query);
    });
  });

  // ===== getAvailablePlatforms() =====
  describe('getAvailablePlatforms()', () => {
    it('should delegate to platformsService.findActive', async () => {
      await service.getAvailablePlatforms();
      expect(platformsService.findActive).toHaveBeenCalled();
    });
  });

  // ================================================================
  // Meilisearch 搜索路径测试
  // ================================================================

  describe('Meilisearch path', () => {
    beforeEach(() => {
      // 通过事件处理器切换到 Meilisearch 引擎
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
    });

    describe('findAll() via Meilisearch', () => {
      it('should route to Meilisearch when SEARCH_ENGINE=meilisearch', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Nike',
              slug: 'nike',
              brand: { id: 'b1', name: 'Nike', slug: 'nike' },
              primaryCategory: null,
            },
          ],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });
        productRepository.count.mockResolvedValue(1);

        const result = await service.findAll({ page: 1, limit: 10 } as any);

        expect(meilisearchService.search).toHaveBeenCalled();
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('p1');
        expect(result.meta.total).toBe(1);
        // Should NOT touch PostgreSQL query builder
        expect(productRepository.createQueryBuilder).not.toHaveBeenCalled();
      });

      it('should use exact PostgreSQL count for unfiltered active listings', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Nike',
              slug: 'nike',
              brand: { id: 'b1', name: 'Nike', slug: 'nike' },
              primaryCategory: null,
            },
          ],
          totalHits: 10000,
          totalPages: 1000,
          facetDistribution: {},
          facetStats: {},
        });
        productRepository.manager.query.mockResolvedValue([{ count: 57704 }]);

        const result = await service.findAll({ page: 1, limit: 10 } as any);

        expect(productRepository.manager.query).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(DISTINCT'),
          [ProductStatus.ACTIVE],
        );
        expect(result.meta.total).toBe(57704);
        expect(result.meta.totalPages).toBe(Math.ceil(57704 / 10));
      });

      it('should pass filter, sort, facets, and pagination to Meilisearch', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({
          page: 2,
          limit: 20,
          search: 'nike shoes',
          category: 'sneakers',
          brands: 'nike,adidas',
          minPrice: 50,
          maxPrice: 500,
          sortBy: 'price_asc',
        } as any);

        const call = meilisearchService.search.mock.calls[0];
        expect(call[0]).toBe('nike shoes');
        const opts = call[1];
        expect(opts.page).toBe(2);
        expect(opts.hitsPerPage).toBe(20);
        expect(opts.filter).toContain('allCategorySlugs = "sneakers"');
        expect(opts.filter).toContain('brandSlug IN ["nike", "adidas"]');
        expect(opts.filter).toContain('priceMax >= 50');
        expect(opts.filter).toContain('priceMin <= 500');
        expect(opts.sort).toEqual(['priceMin:asc']);
      });

      it('should use relevance sort (undefined) when searching with default sort', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ search: 'nike' } as any);

        const opts = meilisearchService.search.mock.calls[0][1];
        expect(opts.sort).toBeUndefined();
      });

      it('should still use ids fast path even when Meilisearch enabled', async () => {
        const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
        productRepository.createQueryBuilder.mockReturnValue(qb);

        await service.findAll({ ids: 'p1,p2' } as any);

        expect(productRepository.createQueryBuilder).toHaveBeenCalled();
        expect(meilisearchService.search).not.toHaveBeenCalled();
      });
    });

    describe('buildMeilisearchFilter()', () => {
      it('should default to status=active', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ page: 1, limit: 10 } as any);

        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('status = "active"');
      });

      it('should force status=active when status=all passed via public findAll()', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ page: 1, limit: 10, status: 'all' } as any);

        const filter = meilisearchService.search.mock.calls[0][1].filter;
        // status=all 在 findAll 入口被安全重置，最终应使用默认的 active
        expect(filter).toContain('status = "active"');
      });

      it('should handle single brand slug', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ brands: 'nike' } as any);

        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('brandSlug = "nike"');
      });

      it('should handle attribute filters (colors, genders)', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ colors: 'black,white', gender: 'Men' } as any);

        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('colors IN ["black", "white"]');
        expect(filter).toContain('genders = "Men"');
      });

      it('should handle isFeatured filter', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ isFeatured: true } as any);

        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('isFeatured = true');
      });
    });

    describe('buildMeilisearchSort()', () => {
      const mockEmptyResult = {
        hits: [],
        totalHits: 0,
        totalPages: 0,
        facetDistribution: {},
        facetStats: {},
      };

      it('should return popular sort for popular sortBy', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ sortBy: 'popular' } as any);
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'isFeatured:desc',
          'featuredSort:asc',
          'popularityScore:desc',
        ]);
      });

      it('should return newest sort', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ sortBy: 'newest' } as any);
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'createdAt:desc',
        ]);
      });

      it('should return sales sort with order', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ sortBy: 'sales', sortOrder: 'ASC' } as any);
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'salesCount:asc',
        ]);
      });

      it('should return price_desc sort', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ sortBy: 'price_desc' } as any);
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'priceMin:desc',
        ]);
      });

      it('should fallback to createdAt:desc for unknown sortBy', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ sortBy: 'unknown_sort' } as any);
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'createdAt:desc',
        ]);
      });

      it('should use createdAt:desc when no search and default sort', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ page: 1, limit: 10 } as any);
        // No search query + default sort → NOT undefined (relevance only applies when searching)
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'createdAt:desc',
        ]);
      });

      it('sortBy=popular + 有搜索词 → 用 MeiliSearch 原生相关性', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ q: 'nike sneakers', sortBy: 'popular' } as any);
        // popular + 搜索词 → sort 为 undefined，让 MeiliSearch 用原生排名
        expect(meilisearchService.search.mock.calls[0][1].sort).toBeUndefined();
      });

      it('sortBy=popular + 无搜索词 → isFeatured:desc + featuredSort:asc + popularityScore:desc', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ sortBy: 'popular' } as any);
        expect(meilisearchService.search.mock.calls[0][1].sort).toEqual([
          'isFeatured:desc',
          'featuredSort:asc',
          'popularityScore:desc',
        ]);
      });
    });

    describe('buildMeilisearchFilter() edge cases', () => {
      const mockEmptyResult = {
        hits: [],
        totalHits: 0,
        totalPages: 0,
        facetDistribution: {},
        facetStats: {},
      };

      it('should reject non-active status like draft via public findAll()', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ status: 'draft' } as any);
        const filter = meilisearchService.search.mock.calls[0][1].filter;
        // draft 在 findAll 入口被安全重置，最终应使用默认的 active
        expect(filter).toContain('status = "active"');
        expect(filter).not.toContain('draft');
      });

      it('should use color (singular) as fallback for colors', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ color: 'Red' } as any);
        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('colors = "Red"');
      });

      it('should handle occasions and seasons', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({
          occasions: 'casual,formal',
          seasons: 'summer',
        } as any);
        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('occasions IN ["casual", "formal"]');
        expect(filter).toContain('seasons = "summer"');
      });

      it('should handle style (singular) as fallback for styles', async () => {
        meilisearchService.search.mockResolvedValue(mockEmptyResult);
        await service.findAll({ style: 'Street' } as any);
        const filter = meilisearchService.search.mock.calls[0][1].filter;
        expect(filter).toContain('styles = "Street"');
      });
    });

    describe('searchViaMeilisearch() edge cases', () => {
      it('should prefer q over search param', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          totalPages: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.findAll({ q: 'nike', search: undefined } as any);

        expect(meilisearchService.search.mock.calls[0][0]).toBe('nike');
      });

      it('should include searchLogId in meta', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Nike',
              slug: 'nike',
              brand: null,
              primaryCategory: null,
            },
          ],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });
        searchAnalyticsService.logSearch.mockResolvedValue({
          searchLogId: 'log-meili-1',
        });

        const result = await service.findAll({ search: 'nike' } as any);

        expect(result.meta.searchLogId).toBe('log-meili-1');
      });

      it('should fallback to PostgreSQL when Meilisearch fails', async () => {
        meilisearchService.search.mockRejectedValue(
          new Error('Meilisearch down'),
        );
        const qb = createMockQueryBuilder([{ id: 'p-fallback' }], 1);
        productRepository.createQueryBuilder.mockReturnValue(qb);

        const result = await service.findAll({ search: 'test' } as any);

        // Should fallback to PostgreSQL
        expect(productRepository.createQueryBuilder).toHaveBeenCalled();
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('p-fallback');
      });

      it('should apply post-processing pipeline (preference boost, gift boost, gender sort)', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Gift Bag',
              slug: 'gift-bag',
              brand: { id: 'b1', name: 'Nike', slug: 'nike' },
              primaryCategory: { id: 'c1', name: 'Bags', slug: 'bags' },
            },
          ],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });
        keywordAnalysisService.analyzeAsync.mockResolvedValue({
          keywords: [],
          brands: [],
          categories: [],
          genders: [],
          colors: [],
          styles: [],
          occasions: [],
          seasons: [],
          intent: { purposeIntent: 'gift' },
        });

        await service.findAll({
          search: 'gift bag',
          gender: 'female',
          preferredBrands: 'b1',
        } as any);

        expect(searchEnhancerService.applySmartRanking).toHaveBeenCalled();
        expect(searchEnhancerService.applyPreferenceBoost).toHaveBeenCalled();
        expect(searchEnhancerService.applyGiftCategoryBoost).toHaveBeenCalled();
        expect(
          searchEnhancerService.applyGenderWeightSort,
        ).toHaveBeenCalledWith(expect.any(Array), 'female');
      });

      it('should try semantic enhance when results < limit', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Nike',
              slug: 'nike',
              brand: null,
              primaryCategory: null,
            },
          ],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });
        searchEnhancerService.trySemanticEnhance.mockResolvedValue([
          { id: 'p1' },
          { id: 'p-semantic' },
        ]);

        const result = await service.findAll({
          search: 'nike',
          limit: 10,
        } as any);

        expect(searchEnhancerService.trySemanticEnhance).toHaveBeenCalled();
        expect(result.meta.semanticEnhanced).toBe(true);
      });

      it('should use multi-path recall for pure intent search in Meilisearch path', async () => {
        keywordAnalysisService.analyzeAsync.mockResolvedValue({
          keywords: ['her'],
          brands: [],
          categories: [],
          genders: ['female'],
          colors: [],
          styles: [],
          occasions: [],
          seasons: [],
          intent: { purposeIntent: 'gift' },
        });
        searchEnhancerService.tryMultiPathRecall.mockResolvedValue({
          products: [{ id: 'p-gift' }],
          total: 1,
          usedFallback: false,
        });

        const result = await service.findAll({ search: 'gift for her' } as any);

        expect(searchEnhancerService.tryMultiPathRecall).toHaveBeenCalled();
        // Should NOT call meilisearchService.search for pure intent
        expect(meilisearchService.search).not.toHaveBeenCalled();
        expect(result.meta.semanticEnhanced).toBe(true);
      });
    });

    describe('getFacetsViaMeilisearch() edge cases', () => {
      it('should skip brand DB lookup when no brand slugs in distribution', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: { brandSlug: {}, colors: {} },
          facetStats: {},
        });

        const result = await service.getFacets({} as any);

        expect(brandRepository.find).not.toHaveBeenCalled();
        expect(result.brands).toEqual([]);
      });

      it('should fallback to slug as name when brand not found in DB', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: { brandSlug: { 'unknown-brand': 3 } },
          facetStats: {},
        });
        brandRepository.find.mockResolvedValue([]); // brand not in DB

        const result = await service.getFacets({} as any);

        expect(result.brands).toEqual([
          {
            id: '',
            name: 'unknown-brand', // fallback to slug
            slug: 'unknown-brand',
            count: 3,
          },
        ]);
      });

      it('should return zero priceRange when facetStats empty', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: {},
          facetStats: {},
        });

        const result = await service.getFacets({} as any);

        expect(result.priceRange).toEqual({ min: 0, max: 0 });
      });

      it('Meilisearch 路径返回 PostgreSQL 分类树数据', async () => {
        const mockCategories = [
          {
            id: 'c1',
            name: 'Shoes',
            slug: 'shoes',
            level: 0,
            count: 30,
            children: [
              {
                id: 'c1a',
                name: 'Sneakers',
                slug: 'sneakers',
                level: 1,
                count: 20,
              },
            ],
          },
        ];
        facetService.aggregateCategories.mockResolvedValue(mockCategories);
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: {},
          facetStats: {},
        });

        const result = await service.getFacets({} as any);

        expect(facetService.aggregateCategories).toHaveBeenCalledWith(
          null,
          null,
        );
        expect(result.categories).toEqual(mockCategories);
      });

      it('带 category 参数时透传 categoryIds 给分类聚合', async () => {
        filterBuilderService.getCategoryIds.mockResolvedValue([
          'cat-id-1',
          'cat-id-2',
        ]);
        facetService.aggregateCategories.mockResolvedValue([]);
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.getFacets({ category: 'shoes' } as any);

        expect(filterBuilderService.getCategoryIds).toHaveBeenCalledWith(
          'shoes',
        );
        expect(facetService.aggregateCategories).toHaveBeenCalledWith(
          ['cat-id-1', 'cat-id-2'],
          null,
        );
      });

      it('带 brands 参数时透传 brandSlugs 给分类聚合', async () => {
        facetService.aggregateCategories.mockResolvedValue([]);
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.getFacets({ brands: 'nike,adidas' } as any);

        expect(facetService.aggregateCategories).toHaveBeenCalledWith(null, [
          'nike',
          'adidas',
        ]);
      });
    });

    describe('mapHitToProduct() edge cases', () => {
      it('should handle null brand in hit', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'No Brand',
              slug: 'no-brand',
              brand: null,
              primaryCategory: null,
            },
          ],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });

        const result = await service.findAll({ page: 1, limit: 10 } as any);

        expect(result.data[0].brand).toBeNull();
        expect(result.data[0].brandId).toBeNull();
        expect(result.data[0].primaryCategory).toBeNull();
        expect(result.data[0].primaryCategoryId).toBeNull();
      });

      it('should handle missing createdAt', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Old',
              slug: 'old',
              brand: null,
              primaryCategory: null,
              createdAt: null,
            },
          ],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });

        const result = await service.findAll({ page: 1, limit: 10 } as any);

        expect(result.data[0].createdAt).toBeUndefined();
      });
    });

    describe('search() via Meilisearch', () => {
      it('should use Meilisearch for simple search', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [
            {
              id: 'p1',
              title: 'Nike Air',
              slug: 'nike-air',
              brand: null,
              primaryCategory: null,
            },
          ],
        });

        const result = await service.search('nike', 5);

        expect(meilisearchService.search).toHaveBeenCalledWith('nike', {
          hitsPerPage: 5,
          page: 1,
          filter: 'status = "active"',
        });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('p1');
        expect(productRepository.find).not.toHaveBeenCalled();
      });

      it('should fallback to PostgreSQL when Meilisearch search() fails', async () => {
        meilisearchService.search.mockRejectedValue(
          new Error('Meilisearch down'),
        );
        productRepository.find.mockResolvedValue([{ id: 'p-pg' }]);

        const result = await service.search('nike', 5);

        expect(productRepository.find).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('p-pg');
      });

      it('should fallback to full-text Meilisearch suggest when analyzed query returns zero hits', async () => {
        keywordAnalysisService.analyzeAsync.mockResolvedValue({
          keywords: ['forces'],
          brands: [],
          categories: [],
          genders: [],
          colors: [],
          styles: [],
          occasions: [],
          seasons: [],
          intent: null,
        });
        meilisearchService.search
          .mockResolvedValueOnce({
            hits: [],
            totalHits: 0,
          })
          .mockResolvedValueOnce({
            hits: [
              {
                id: 'p1',
                title: 'Nike Air Force 1',
                slug: 'nike-air-force-1',
                brand: null,
                primaryCategory: null,
              },
            ],
            totalHits: 1,
          });

        const result = await service.search('air forces', 5);

        expect(meilisearchService.search).toHaveBeenCalledTimes(2);
        expect(meilisearchService.search.mock.calls[0][0]).toBe('forces');
        expect(meilisearchService.search.mock.calls[1][0]).toBe('air forces');
        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('nike-air-force-1');
      });
    });

    describe('getFacets() via Meilisearch', () => {
      it('should fallback to PostgreSQL facets when Meilisearch fails', async () => {
        meilisearchService.search.mockRejectedValue(
          new Error('Meilisearch down'),
        );
        facetService.getFacets.mockResolvedValue({
          categories: [],
          brands: [],
          priceRange: { min: 0, max: 0 },
          colors: [],
          sizes: [],
          genders: [],
          styles: [],
          occasions: [],
          seasons: [],
        });

        const result = await service.getFacets({} as any);

        expect(facetService.getFacets).toHaveBeenCalled();
        expect(result.brands).toEqual([]);
      });

      it('should return empty facets for static asset path searches', async () => {
        const result = await service.getFacets({
          search: 'VGN Lightning 68/_next/static/chunks/app.js?dpl=123',
        } as any);

        expect(meilisearchService.search).not.toHaveBeenCalled();
        expect(facetService.getFacets).not.toHaveBeenCalled();
        expect(result).toEqual({
          categories: [],
          brands: [],
          priceRange: { min: 0, max: 0 },
          colors: [],
          sizes: [],
          genders: [],
          styles: [],
          occasions: [],
          seasons: [],
        });
      });

      it('should return empty facets when both Meilisearch and PostgreSQL fallback fail', async () => {
        meilisearchService.search.mockRejectedValue(
          new Error('Meilisearch down'),
        );
        facetService.getFacets.mockRejectedValue(new Error('Postgres busy'));

        const result = await service.getFacets({ search: 'nike shoes' } as any);

        expect(facetService.getFacets).toHaveBeenCalled();
        expect(result).toEqual({
          categories: [],
          brands: [],
          priceRange: { min: 0, max: 0 },
          colors: [],
          sizes: [],
          genders: [],
          styles: [],
          occasions: [],
          seasons: [],
        });
      });

      it('should return facets from Meilisearch', async () => {
        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: {
            brandSlug: { nike: 10, adidas: 5 },
            colors: { Black: 8, White: 3 },
            genders: { Men: 12 },
            styles: {},
            occasions: {},
            seasons: {},
          },
          facetStats: {
            priceMin: { min: 50, max: 500 },
            priceMax: { min: 80, max: 800 },
          },
        });
        brandRepository.find.mockResolvedValue([
          { id: 'b1', name: 'Nike', slug: 'nike' },
          { id: 'b2', name: 'Adidas', slug: 'adidas' },
        ]);

        const result = await service.getFacets({} as any);

        expect(meilisearchService.search).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            hitsPerPage: 0,
            page: 1,
          }),
        );
        expect(result.brands).toHaveLength(2);
        expect(result.brands[0]).toEqual({
          id: 'b1',
          name: 'Nike',
          slug: 'nike',
          count: 10,
        });
        expect(result.priceRange).toEqual({ min: 50, max: 800 });
        expect(result.colors).toEqual([
          { value: 'Black', count: 8 },
          { value: 'White', count: 3 },
        ]);
        expect(result.genders).toEqual([{ value: 'Men', count: 12 }]);
        expect(result.sizes).toEqual([]);
      });

      it('should use analyzed query and enriched filters for facets (issue #11)', async () => {
        // 模拟关键词分析：搜索 "nike black shoes" 时，提取 brands=nike, colors=black, keywords=shoes
        keywordAnalysisService.analyzeAsync.mockResolvedValue({
          keywords: ['shoes'],
          brands: ['nike'],
          categories: [],
          genders: [],
          colors: ['black'],
          styles: [],
          occasions: [],
          seasons: [],
          intent: null,
        });

        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: { brandSlug: { nike: 5 }, colors: { black: 3 } },
          facetStats: {},
        });
        brandRepository.find.mockResolvedValue([
          { id: 'b1', name: 'Nike', slug: 'nike' },
        ]);

        await service.getFacets({ search: 'nike black shoes' } as any);

        // 验证：Meilisearch 应收到分析后的关键词 "shoes"（不是原始的 "nike black shoes"）
        // 以及 enriched 过滤器中包含 brands 和 colors
        const searchCall = meilisearchService.search.mock.calls[0];
        expect(searchCall[0]).toBe('shoes'); // 分析后的关键词
        expect(searchCall[1].filter).toContain('brandSlug = "nike"'); // enriched 品牌过滤
        expect(searchCall[1].filter).toContain('colors = "black"'); // enriched 颜色过滤
      });

      it('should fallback to full-text facet search when analyzed query returns zero hits', async () => {
        keywordAnalysisService.analyzeAsync.mockResolvedValue({
          keywords: ['forces'],
          brands: [],
          categories: [],
          genders: [],
          colors: [],
          styles: [],
          occasions: [],
          seasons: [],
          intent: null,
        });

        meilisearchService.search
          .mockResolvedValueOnce({
            hits: [],
            totalHits: 0,
            facetDistribution: {},
            facetStats: {},
          })
          .mockResolvedValueOnce({
            hits: [],
            totalHits: 12,
            facetDistribution: {
              brandSlug: { nike: 12 },
              colors: { White: 10 },
            },
            facetStats: {
              priceMin: { min: 21.75, max: 34.8 },
              priceMax: { min: 21.75, max: 34.8 },
            },
          });
        brandRepository.find.mockResolvedValue([
          { id: 'b1', name: 'Nike', slug: 'nike' },
        ]);

        const result = await service.getFacets({ search: 'air forces' } as any);

        expect(meilisearchService.search).toHaveBeenCalledTimes(2);
        expect(meilisearchService.search.mock.calls[0][0]).toBe('forces');
        expect(meilisearchService.search.mock.calls[1][0]).toBe('air forces');
        expect(meilisearchService.search.mock.calls[1][1].filter).toBe(
          'status = "active"',
        );
        expect(result.brands).toEqual([
          { id: 'b1', name: 'Nike', slug: 'nike', count: 12 },
        ]);
        expect(result.colors).toEqual([{ value: 'White', count: 10 }]);
        expect(result.priceRange).toEqual({ min: 21.75, max: 34.8 });
      });

      it('should use empty query when all keywords are structurally consumed', async () => {
        // 搜索 "nike" 时，品牌被提取，没有剩余关键词
        keywordAnalysisService.analyzeAsync.mockResolvedValue({
          keywords: [],
          brands: ['nike'],
          categories: [],
          genders: [],
          colors: [],
          styles: [],
          occasions: [],
          seasons: [],
          intent: null,
        });

        meilisearchService.search.mockResolvedValue({
          hits: [],
          totalHits: 0,
          facetDistribution: {},
          facetStats: {},
        });

        await service.getFacets({ search: 'nike' } as any);

        // 关键词全部被结构化消费 → 搜索词应为空
        const searchCall = meilisearchService.search.mock.calls[0];
        expect(searchCall[0]).toBe('');
        expect(searchCall[1].filter).toContain('brandSlug = "nike"');
      });
    });

    describe('mapHitToProduct()', () => {
      it('should map Meilisearch hit to Product-like object', async () => {
        const hit = {
          id: 'p1',
          title: 'Nike Air Force 1',
          slug: 'nike-af1',
          description: 'Great shoe',
          originalTitle: '耐克',
          mainImage: 'https://img.com/1.jpg',
          currency: 'CNY',
          priceMin: 100,
          priceMax: 200,
          status: 'active',
          isFeatured: false,
          hasVariants: true,
          viewCount: 50,
          salesCount: 10,
          ctr: 0.1,
          createdAt: 1735689600000,
          brand: { id: 'b1', name: 'Nike', slug: 'nike' },
          primaryCategory: { id: 'c1', name: 'Sneakers', slug: 'sneakers' },
        };

        meilisearchService.search.mockResolvedValue({
          hits: [hit],
          totalHits: 1,
          totalPages: 1,
          facetDistribution: {},
          facetStats: {},
        });

        const result = await service.findAll({ page: 1, limit: 10 } as any);
        const product = result.data[0];

        expect(product.id).toBe('p1');
        expect(product.brand).toEqual({ id: 'b1', name: 'Nike', slug: 'nike' });
        expect(product.brandId).toBe('b1');
        expect(product.primaryCategory).toEqual({
          id: 'c1',
          name: 'Sneakers',
          slug: 'sneakers',
        });
        expect(product.primaryCategoryId).toBe('c1');
      });
    });
  });

  // ===== PostgreSQL path should still work when SEARCH_ENGINE is not meilisearch =====
  describe('PostgreSQL path (default)', () => {
    it('should use PostgreSQL when SEARCH_ENGINE is not set', async () => {
      const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(productRepository.createQueryBuilder).toHaveBeenCalled();
      expect(meilisearchService.search).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  // ===== 搜索引擎动态切换 =====
  describe('search engine switching', () => {
    it('should default to postgres engine', () => {
      expect(service.searchEngine).toBe('postgres');
    });

    it('should switch to meilisearch via event', async () => {
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      expect(service.searchEngine).toBe('meilisearch');

      meilisearchService.search.mockResolvedValue({
        hits: [
          {
            id: 'p1',
            title: 'Test',
            slug: 'test',
            brand: null,
            primaryCategory: null,
          },
        ],
        totalHits: 1,
        totalPages: 1,
        facetDistribution: {},
        facetStats: {},
      });

      const result = await service.findAll({ page: 1, limit: 10 } as any);
      expect(meilisearchService.search).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should switch back to postgres via event', async () => {
      // Switch to meilisearch first
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      expect(service.searchEngine).toBe('meilisearch');

      // Switch back to postgres
      service.handleSearchEngineChanged({ engine: 'postgres' });
      expect(service.searchEngine).toBe('postgres');

      const qb = createMockQueryBuilder([{ id: 'p1' }], 1);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 10 } as any);
      expect(productRepository.createQueryBuilder).toHaveBeenCalled();
      expect(meilisearchService.search).not.toHaveBeenCalled();
    });

    it('should load engine from DB on module init', async () => {
      settingsService.get.mockResolvedValue('meilisearch');
      await service.onModuleInit();
      expect(service.searchEngine).toBe('meilisearch');
    });

    it('should fallback to env when DB returns null on init', async () => {
      settingsService.get.mockResolvedValue(null);
      configService.get.mockReturnValue('meilisearch');
      await service.onModuleInit();
      expect(service.searchEngine).toBe('meilisearch');
    });

    it('should fallback to meilisearch when both DB and env are empty', async () => {
      settingsService.get.mockResolvedValue(null);
      configService.get.mockReturnValue(undefined);
      await service.onModuleInit();
      expect(service.searchEngine).toBe('meilisearch');
    });
  });

  // ================================================================
  // 安全修复验证测试
  // ================================================================

  describe('Security: Meilisearch filter injection prevention', () => {
    beforeEach(() => {
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      meilisearchService.search.mockResolvedValue({
        hits: [],
        totalHits: 0,
        totalPages: 0,
        facetDistribution: {},
        facetStats: {},
      });
    });

    it('should escape double quotes in brands to prevent filter injection', async () => {
      await service.findAll({ brands: 'test" OR status = "draft' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      // 双引号被转义为 \"，整个注入内容作为 brandSlug 的字面值，不会破坏过滤器结构
      expect(filter).toContain('brandSlug = "test\\" OR status = \\"draft"');
      // status = "active" 仍然独立存在，未被注入覆盖
      expect(filter).toContain('status = "active"');
      // 确保不存在未转义的 status = "draft" 子句
      expect(filter).not.toContain('status = "draft"');
    });

    it('should escape double quotes in colors filter', async () => {
      await service.findAll({ colors: 'red" OR status = "draft' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).not.toContain('OR status = "draft"');
      expect(filter).toContain('status = "active"');
    });

    it('should escape double quotes in category filter', async () => {
      await service.findAll({ category: 'shoes" OR status = "draft' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).not.toContain('OR status = "draft"');
      expect(filter).toContain('status = "active"');
    });

    it('categories 多选筛选生成正确的 Meilisearch 过滤条件', async () => {
      await service.findAll({ categories: 'shoes,bags' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('allCategorySlugs = "shoes"');
      expect(filter).toContain('allCategorySlugs = "bags"');
      expect(filter).toContain(' OR ');
    });

    it('categories 单选筛选生成正确的 Meilisearch 过滤条件', async () => {
      await service.findAll({ categories: 'clothing' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('allCategorySlugs = "clothing"');
      expect(filter).not.toContain(' OR ');
    });

    it('should escape backslashes in filter values', async () => {
      await service.findAll({ brands: 'test\\' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('brandSlug = "test\\\\"');
    });

    it('should handle multi-value injection attempt in brands', async () => {
      await service.findAll({ brands: 'nike","draft' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      // 逗号分隔后每个值的双引号都被转义
      expect(filter).toContain('brandSlug IN ["nike\\"');
    });
  });

  describe('Security: status parameter protection', () => {
    const mockEmptyResult = {
      hits: [],
      totalHits: 0,
      totalPages: 0,
      facetDistribution: {},
      facetStats: {},
    };

    it('should reset status=all to default active in public findAll()', async () => {
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      meilisearchService.search.mockResolvedValue(mockEmptyResult);

      await service.findAll({ status: 'all' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('status = "active"');
    });

    it('should reset status=draft to default active in public findAll()', async () => {
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      meilisearchService.search.mockResolvedValue(mockEmptyResult);

      await service.findAll({ status: 'draft' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('status = "active"');
      expect(filter).not.toContain('draft');
    });

    it('should reset status=inactive to default active in public findAll()', async () => {
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      meilisearchService.search.mockResolvedValue(mockEmptyResult);

      await service.findAll({ status: 'inactive' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('status = "active"');
      expect(filter).not.toContain('inactive');
    });

    it('should allow status=active (no change needed)', async () => {
      service.handleSearchEngineChanged({ engine: 'meilisearch' });
      meilisearchService.search.mockResolvedValue(mockEmptyResult);

      await service.findAll({ status: 'active' } as any);

      const filter = meilisearchService.search.mock.calls[0][1].filter;
      expect(filter).toContain('status = "active"');
    });

    it('should protect PostgreSQL path from status=all too', async () => {
      // 使用默认 postgres 引擎
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const query = { status: 'all' } as any;
      await service.findAll(query);

      // status 应该被重置为 undefined，让 filterBuilderService 使用默认的 active
      expect(query.status).toBeUndefined();
    });
  });

  describe('findAllAdmin()', () => {
    it('search 参数中的 ILIKE 通配符被转义', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({ search: '100%_off' });

      const andWhereCall = qb.andWhere.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('ILIKE'),
      );
      expect(andWhereCall).toBeDefined();
      // escapeIlike 应将 % → \% 、 _ → \_
      expect(andWhereCall[1].keyword).toBe('%100\\%\\_off%');
    });

    it('limit 超过 100 时被截断为 100', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({ limit: 999 });

      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('limit 为负数时被修正为 1', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({ limit: -5 });

      expect(qb.take).toHaveBeenCalledWith(1);
    });

    it('reviewSource=sku_split 时只筛选 SKU 拆分产品', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({
        status: 'pending_review',
        reviewSource: 'sku_split',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('product.status = :status', {
        status: 'pending_review',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product."skuVariantKey" IS NOT NULL',
      );
    });

    it('supports zero-price and price range filters', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({
        priceState: 'zero',
        minPrice: 0,
        maxPrice: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(product."priceMin", 0) <= 0',
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(product."priceMin", 0) >= :minPrice',
        { minPrice: 0 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'COALESCE(product."priceMin", 0) <= :maxPrice',
        { maxPrice: 20 },
      );
    });

    it('supports qc photo state filters', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({ qcState: 'with' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM product_qc_media pqm WHERE pqm.product_id = product.id)',
      );

      qb.andWhere.mockClear();

      await service.findAllAdmin({ qcState: 'without' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'NOT EXISTS (SELECT 1 FROM product_qc_media pqm WHERE pqm.product_id = product.id)',
      );
    });

    it('supports filtering by concrete and unknown shop ids', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAllAdmin({ shopIds: ['shop-1', 'unknown'] });

      expect(qb.andWhere).toHaveBeenCalledWith(
        `(product."weidianShopId" IN (:...shopIds) OR COALESCE(NULLIF(BTRIM(product."weidianShopId"), ''), 'unknown') = 'unknown')`,
        { shopIds: ['shop-1'] },
      );
    });
  });

  describe('getAdminShopOptions()', () => {
    it('returns parsed aggregate rows and overview meta', async () => {
      const qb = createMockQueryBuilder([], 0);
      productRepository.manager.query
        .mockResolvedValueOnce([
          {
            shopId: 'shop-1',
            shopName: 'Style Transit',
            productCount: '12',
            pendingReviewCount: '3',
            withoutQcCount: '2',
            deadLinkCount: '1',
          },
        ])
        .mockResolvedValueOnce([
          {
            totalProducts: '12',
            pendingReviewCount: '3',
            withoutQcCount: '2',
            deadLinkCount: '1',
            missingProductCount: '0',
          },
        ])
        .mockResolvedValueOnce([
          {
            totalShops: '1',
          },
        ]);
      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAdminShopOptions(
        { search: 'birkin', qcState: 'without' },
        8,
      );

      expect(qb.getQueryAndParameters).toHaveBeenCalled();
      expect(productRepository.manager.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        data: [
          {
            shopId: 'shop-1',
            shopName: 'Style Transit',
            productCount: 12,
            pendingReviewCount: 3,
            withoutQcCount: 2,
            deadLinkCount: 1,
          },
        ],
        meta: {
          totalProducts: 12,
          totalShops: 1,
          missingProductCount: 0,
          pendingReviewCount: 3,
          withoutQcCount: 2,
          deadLinkCount: 1,
        },
      });
    });
  });
});
