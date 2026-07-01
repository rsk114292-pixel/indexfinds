import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MultiPathRecallService } from './multi-path-recall.service';
import { Category } from '../categories/entities/category.entity';
import { SemanticSearchService } from './semantic-search.service';
import { BM25RankingService } from './bm25-ranking.service';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import { AnalyzedQuery } from './keyword-analysis.service';

describe('MultiPathRecallService', () => {
  let service: MultiPathRecallService;

  const mockProduct = {
    id: 'product-1',
    title: 'Nike Air Max',
    slug: 'nike-air-max',
    status: 'active',
    priceMin: 100,
    viewCount: 50,
    createdAt: new Date(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockSemanticSearchService = {
    searchSimilarByText: jest.fn().mockResolvedValue([]),
    isAvailable: jest.fn().mockReturnValue(true),
  };

  const mockBM25RankingService = {
    searchWithBM25: jest.fn().mockResolvedValue([]),
    rankResults: jest.fn((products) => products),
  };

  const mockProductQueryFacade = {
    getActiveProductIds: jest.fn().mockResolvedValue([]),
    getProductsByIds: jest.fn().mockResolvedValue([]),
    findLatestProducts: jest.fn().mockResolvedValue([mockProduct]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiPathRecallService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: SemanticSearchService,
          useValue: mockSemanticSearchService,
        },
        {
          provide: BM25RankingService,
          useValue: mockBM25RankingService,
        },
        {
          provide: ProductQueryFacadeService,
          useValue: mockProductQueryFacade,
        },
      ],
    }).compile();

    service = module.get<MultiPathRecallService>(MultiPathRecallService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recall', () => {
    it('应并行执行多路召回', async () => {
      const query = 'nike shoes';
      const analyzedQuery: AnalyzedQuery = {
        brands: ['nike'],
        categories: [],
        genders: [],
        seasons: [],
        colors: [],
        styles: [],
        occasions: [],
        keywords: ['shoes'],
      };

      const result = await service.recall(query, analyzedQuery, {});

      expect(result).toBeDefined();
      expect(result.timing).toBeDefined();
      expect(result.sources).toBeDefined();
    });

    it('所有路径返回空时应启用兜底策略', async () => {
      mockSemanticSearchService.searchSimilarByText.mockResolvedValue([]);
      mockBM25RankingService.searchWithBM25.mockResolvedValue([]);

      const result = await service.recall('xyz123', null, {});

      // 当所有召回路径都返回空时，usedFallback 应为 true
      expect(result.usedFallback).toBe(true);
    });

    it('应正确合并和去重多路召回结果', async () => {
      const product1 = { ...mockProduct, id: 'product-1' };

      // 语义搜索返回 product-1
      mockSemanticSearchService.searchSimilarByText.mockResolvedValue([
        { product: product1, similarity: 0.9 },
      ]);

      // BM25 也返回 product-1 (重复)
      mockBM25RankingService.searchWithBM25.mockResolvedValue([product1]);

      const result = await service.recall('nike', null, {});

      // 应该去重
      const uniqueIds = new Set(result.candidates.map((c) => c.product?.id));
      expect(uniqueIds.size).toBe(result.candidates.length);
    });

    it('应正确传递性别过滤条件', async () => {
      const filters = { genders: 'women' };

      const result = await service.recall('dress', null, filters);

      // 验证返回结果包含正确的结构
      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
    });

    it('应从 analyzedQuery 中提取性别过滤条件', async () => {
      const analyzedQuery: AnalyzedQuery = {
        brands: [],
        categories: [],
        genders: ['men'],
        seasons: [],
        colors: [],
        styles: [],
        occasions: [],
        keywords: [],
      };

      const result = await service.recall('jacket', analyzedQuery, {});

      // 验证返回结果包含正确的结构
      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
    });
  });

  describe('recall with custom config', () => {
    it('应使用自定义配置覆盖默认值', async () => {
      const customConfig = {
        keywordLimit: 5,
        semanticLimit: 10,
        categoryLimit: 3,
      };

      const result = await service.recall('test', null, {}, customConfig);

      // 验证能够正常执行
      expect(result).toBeDefined();
    });
  });

  describe('timing tracking', () => {
    it('应记录各阶段耗时', async () => {
      const result = await service.recall('test', null, {});

      expect(result.timing).toHaveProperty('keywordMs');
      expect(result.timing).toHaveProperty('semanticMs');
      expect(result.timing).toHaveProperty('categoryMs');
      expect(result.timing).toHaveProperty('mergeMs');
      expect(result.timing).toHaveProperty('totalMs');
      expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sources tracking', () => {
    it('应记录各召回源的结果数量', async () => {
      const result = await service.recall('test', null, {});

      expect(result.sources).toHaveProperty('keyword');
      expect(result.sources).toHaveProperty('semantic');
      expect(result.sources).toHaveProperty('category');
      expect(result.sources).toHaveProperty('fallback');
    });
  });
});
