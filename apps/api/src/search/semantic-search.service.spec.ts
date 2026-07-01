import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SemanticSearchService } from './semantic-search.service';
import { EmbeddingGenerationService } from './embedding-generation.service';
import { GenderFilterBuilder } from './utils/gender-filter.builder';

describe('SemanticSearchService', () => {
  let service: SemanticSearchService;
  let mockDataSource: { query: jest.Mock };
  let mockEmbeddingService: {
    checkServiceHealth: jest.Mock;
    isAvailable: jest.Mock;
    buildProductText: jest.Mock;
    generateTextEmbedding: jest.Mock;
    batchGenerateTextEmbeddings: jest.Mock;
    generateProductEmbedding: jest.Mock;
    batchGenerateEmbeddings: jest.Mock;
  };

  beforeEach(async () => {
    mockDataSource = { query: jest.fn() };

    mockEmbeddingService = {
      checkServiceHealth: jest.fn().mockResolvedValue(true),
      isAvailable: jest.fn().mockReturnValue(true),
      buildProductText: jest.fn().mockReturnValue('product text'),
      generateTextEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      batchGenerateTextEmbeddings: jest.fn().mockResolvedValue([[0.1], [0.2]]),
      generateProductEmbedding: jest.fn().mockResolvedValue(true),
      batchGenerateEmbeddings: jest.fn().mockResolvedValue({
        total: 10,
        success: 8,
        failed: 1,
        skipped: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticSearchService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmbeddingGenerationService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<SemanticSearchService>(SemanticSearchService);
  });

  // ============================================================
  // Delegation tests (Facade pattern)
  // ============================================================

  describe('isAvailable', () => {
    it('should delegate to embeddingService.isAvailable', () => {
      mockEmbeddingService.isAvailable.mockReturnValue(true);
      expect(service.isAvailable()).toBe(true);

      mockEmbeddingService.isAvailable.mockReturnValue(false);
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('refreshServiceAvailability', () => {
    it('should delegate to embeddingService.checkServiceHealth', async () => {
      mockEmbeddingService.checkServiceHealth.mockResolvedValue(false);

      const result = await service.refreshServiceAvailability();

      expect(result).toBe(false);
      expect(mockEmbeddingService.checkServiceHealth).toHaveBeenCalled();
    });
  });

  describe('buildProductText', () => {
    it('should delegate to embeddingService.buildProductText', () => {
      mockEmbeddingService.buildProductText.mockReturnValue(
        'Nike shoes running',
      );

      const result = service.buildProductText({
        title: 'Nike shoes',
        brand: { name: 'Nike' },
      });

      expect(result).toBe('Nike shoes running');
      expect(mockEmbeddingService.buildProductText).toHaveBeenCalledWith({
        title: 'Nike shoes',
        brand: { name: 'Nike' },
      });
    });
  });

  describe('generateTextEmbedding', () => {
    it('should delegate to embeddingService.generateTextEmbedding', async () => {
      const embedding = [0.1, 0.2, 0.3];
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue(embedding);

      const result = await service.generateTextEmbedding('test text');

      expect(result).toBe(embedding);
    });
  });

  describe('batchGenerateTextEmbeddings', () => {
    it('should delegate to embeddingService.batchGenerateTextEmbeddings', async () => {
      const embeddings = [[0.1], [0.2]];
      mockEmbeddingService.batchGenerateTextEmbeddings.mockResolvedValue(
        embeddings,
      );

      const result = await service.batchGenerateTextEmbeddings(['a', 'b']);

      expect(result).toBe(embeddings);
    });
  });

  describe('generateProductEmbedding', () => {
    it('should delegate to embeddingService.generateProductEmbedding', async () => {
      mockEmbeddingService.generateProductEmbedding.mockResolvedValue(true);

      const result = await service.generateProductEmbedding('product-id');

      expect(result).toBe(true);
      expect(
        mockEmbeddingService.generateProductEmbedding,
      ).toHaveBeenCalledWith('product-id');
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('should delegate with correct parameters', async () => {
      await service.batchGenerateEmbeddings(50, true);

      expect(mockEmbeddingService.batchGenerateEmbeddings).toHaveBeenCalledWith(
        50,
        true,
      );
    });

    it('should use default parameters', async () => {
      await service.batchGenerateEmbeddings();

      expect(mockEmbeddingService.batchGenerateEmbeddings).toHaveBeenCalledWith(
        100,
        false,
      );
    });
  });

  // ============================================================
  // semanticSearch
  // ============================================================

  describe('semanticSearch', () => {
    it('should return empty array when service is unavailable and health check fails', async () => {
      mockEmbeddingService.isAvailable.mockReturnValue(false);
      mockEmbeddingService.checkServiceHealth.mockResolvedValue(false);

      const result = await service.semanticSearch('test query');

      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should skip health check when skipHealthCheck is true', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue(null);

      await service.semanticSearch('test', 20, 0.3, undefined, 0, true);

      expect(mockEmbeddingService.checkServiceHealth).not.toHaveBeenCalled();
    });

    it('should return empty array when embedding generation fails', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue(null);

      const result = await service.semanticSearch(
        'test',
        20,
        0.3,
        undefined,
        0,
      );

      expect(result).toEqual([]);
    });

    it('should return search results on success', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue([0.1, 0.2]);
      mockDataSource.query.mockResolvedValue([
        {
          product_id: 'p1',
          similarity: '0.85',
          id: 'p1',
          title: 'Nike Shoes',
          slug: 'nike-shoes',
          mainImage: 'img.jpg',
          priceMin: '100',
          priceMax: '200',
        },
      ]);

      const result = await service.semanticSearch('nike shoes', 10, 0.3);

      expect(result).toEqual([
        {
          productId: 'p1',
          similarity: 0.85,
          product: {
            id: 'p1',
            title: 'Nike Shoes',
            slug: 'nike-shoes',
            mainImage: 'img.jpg',
            priceMin: 100,
            priceMax: 200,
          },
        },
      ]);
    });

    it('should retry on failure with exponential backoff', async () => {
      mockEmbeddingService.generateTextEmbedding
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue([0.1, 0.2]);

      mockDataSource.query.mockResolvedValue([]);

      const result = await service.semanticSearch(
        'test',
        20,
        0.3,
        undefined,
        2,
        true,
      );

      expect(result).toEqual([]);
      expect(mockEmbeddingService.generateTextEmbedding).toHaveBeenCalledTimes(
        3,
      );
    });

    it('should return empty array after all retries are exhausted', async () => {
      mockEmbeddingService.generateTextEmbedding.mockRejectedValue(
        new Error('persistent failure'),
      );

      const result = await service.semanticSearch(
        'test',
        20,
        0.3,
        undefined,
        1,
        true,
      );

      expect(result).toEqual([]);
      expect(mockEmbeddingService.generateTextEmbedding).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should include gender filter when provided', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue([0.1, 0.2]);
      mockDataSource.query.mockResolvedValue([]);

      // Mock the static method
      const spy = jest
        .spyOn(GenderFilterBuilder, 'buildRawSqlCondition')
        .mockReturnValue({
          sql: 'p."aiAttributes"->>\'gender\' = $4',
          params: ['women'],
          nextParamIndex: 5,
        });

      await service.semanticSearch('dress', 10, 0.3, { genders: 'women' });

      expect(spy).toHaveBeenCalledWith('women', 4, 'p');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('gender'),
        expect.arrayContaining(['women']),
      );

      spy.mockRestore();
    });
  });

  // ============================================================
  // hybridSearch
  // ============================================================

  describe('hybridSearch', () => {
    const keywordResults = [
      { productId: 'p1', score: 10 },
      { productId: 'p2', score: 5 },
    ];

    it('should return keyword-only results when embedding service is unavailable', async () => {
      mockEmbeddingService.isAvailable.mockReturnValue(false);
      mockEmbeddingService.checkServiceHealth.mockResolvedValue(false);

      const result = await service.hybridSearch(keywordResults, 'test');

      expect(result).toEqual([
        {
          productId: 'p1',
          keywordScore: 10,
          semanticScore: 0,
          combinedScore: 10,
        },
        {
          productId: 'p2',
          keywordScore: 5,
          semanticScore: 0,
          combinedScore: 5,
        },
      ]);
    });

    it('should merge keyword and semantic results with default weights', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue([0.1, 0.2]);
      mockDataSource.query.mockResolvedValue([
        {
          product_id: 'p1',
          similarity: '0.9',
          id: 'p1',
          title: 'P1',
          slug: 'p1',
          mainImage: '',
          priceMin: '10',
          priceMax: '20',
        },
        {
          product_id: 'p3',
          similarity: '0.8',
          id: 'p3',
          title: 'P3',
          slug: 'p3',
          mainImage: '',
          priceMin: '30',
          priceMax: '40',
        },
      ]);

      const result = await service.hybridSearch(keywordResults, 'test');

      // p1: keyword=10/10=1.0, semantic=0.9
      //     combined = 1.0*0.7 + 0.9*0.3 = 0.97
      // p2: keyword=5/10=0.5, semantic=0
      //     combined = 0.5*0.7 + 0*0.3 = 0.35
      // p3: keyword=0, semantic=0.8
      //     combined = 0 + 0.8*0.3 = 0.24
      expect(result).toHaveLength(3);
      expect(result[0].productId).toBe('p1');
      expect(result[0].combinedScore).toBeCloseTo(0.97, 2);
      expect(result[1].productId).toBe('p2');
      expect(result[2].productId).toBe('p3');
    });

    it('should use custom weights when provided', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue([0.1, 0.2]);
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.hybridSearch(
        [{ productId: 'p1', score: 10 }],
        'test',
        0.5, // keywordWeight
        0.5, // semanticWeight
      );

      // p1: keyword = 10/10 = 1.0, semantic = 0
      // combined = 1.0 * 0.5 + 0 * 0.5 = 0.5
      expect(result[0].combinedScore).toBeCloseTo(0.5, 2);
    });

    it('should return normalized keyword-only results when semantic search returns empty', async () => {
      // semanticSearch catches errors internally and returns [],
      // so hybridSearch processes via the normal path with normalization
      mockEmbeddingService.generateTextEmbedding.mockRejectedValue(
        new Error('embedding API down'),
      );

      const result = await service.hybridSearch(keywordResults, 'test');

      expect(result).toHaveLength(2);
      expect(result[0].semanticScore).toBe(0);
      // Keyword scores are normalized: 10/10 = 1.0
      expect(result[0].keywordScore).toBe(1);
      expect(result[0].combinedScore).toBeCloseTo(0.7, 2);
    });

    it('should not include duplicate products from semantic results', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue([0.1]);
      mockDataSource.query.mockResolvedValue([
        {
          product_id: 'p1',
          similarity: '0.9',
          id: 'p1',
          title: 'P1',
          slug: 'p1',
          mainImage: '',
          priceMin: '10',
          priceMax: '20',
        },
      ]);

      const result = await service.hybridSearch(
        [{ productId: 'p1', score: 10 }],
        'test',
      );

      // p1 appears in both keyword and semantic — should only appear once
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('p1');
      expect(result[0].semanticScore).toBe(0.9);
    });

    it('should sort results by combinedScore descending', async () => {
      mockEmbeddingService.generateTextEmbedding.mockResolvedValue([0.1]);
      mockDataSource.query.mockResolvedValue([
        {
          product_id: 'p3',
          similarity: '0.95',
          id: 'p3',
          title: 'P3',
          slug: 'p3',
          mainImage: '',
          priceMin: '10',
          priceMax: '20',
        },
      ]);

      const result = await service.hybridSearch(
        [{ productId: 'p1', score: 2 }],
        'test',
      );

      // p1: combined = (2/2)*0.7 + 0*0.3 = 0.7
      // p3: combined = 0 + 0.95*0.3 = 0.285
      expect(result[0].productId).toBe('p1');
      expect(result[1].productId).toBe('p3');
    });
  });

  // ============================================================
  // shouldUseSemanticSearch
  // ============================================================

  describe('shouldUseSemanticSearch', () => {
    it('should return false when embedding service is unavailable', () => {
      mockEmbeddingService.isAvailable.mockReturnValue(false);

      expect(service.shouldUseSemanticSearch('dress for wedding party')).toBe(
        false,
      );
    });

    it('should return false for queries with 2 or fewer words', () => {
      expect(service.shouldUseSemanticSearch('red dress')).toBe(false);
      expect(service.shouldUseSemanticSearch('nike')).toBe(false);
    });

    it('should return true for queries with natural language patterns', () => {
      expect(service.shouldUseSemanticSearch('dress for wedding party')).toBe(
        true,
      );
      expect(service.shouldUseSemanticSearch('something casual to wear')).toBe(
        true,
      );
      expect(service.shouldUseSemanticSearch('outfit with red shoes')).toBe(
        true,
      );
      expect(service.shouldUseSemanticSearch('going to vacation outfit')).toBe(
        true,
      );
    });

    it('should return false for multi-word keyword queries without NL patterns', () => {
      expect(service.shouldUseSemanticSearch('nike air max')).toBe(false);
      expect(service.shouldUseSemanticSearch('red blue green shoes')).toBe(
        false,
      );
    });

    it('should match patterns case-insensitively', () => {
      expect(service.shouldUseSemanticSearch('Dress FOR Wedding')).toBe(true);
    });
  });

  // ============================================================
  // getStats
  // ============================================================

  describe('getStats', () => {
    it('should return stats from database', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ count: '1000' }]) // total products
        .mockResolvedValueOnce([{ count: '750' }]); // with embeddings

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalProducts: 1000,
        productsWithEmbedding: 750,
        coverageRate: 0.75,
        serviceAvailable: true,
      });
    });

    it('should return 0 coverage rate when no products exist', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }]);

      const stats = await service.getStats();

      expect(stats.coverageRate).toBe(0);
    });

    it('should return fallback stats on database error', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'));

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalProducts: 0,
        productsWithEmbedding: 0,
        coverageRate: 0,
        serviceAvailable: true,
      });
    });
  });
});
