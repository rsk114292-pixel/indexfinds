import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import { VisualSearchService } from './visual-search.service';
import { ProductImageEmbedding } from './entities/product-image-embedding.entity';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock SSRF validator — 默认放行，SSRF 拦截测试中覆盖
jest.mock('../common/utils/url-validator', () => ({
  validateUrlForSSRF: jest.fn().mockResolvedValue(undefined),
}));
import { validateUrlForSSRF } from '../common/utils/url-validator';
const mockedValidateUrl = validateUrlForSSRF as jest.MockedFunction<
  typeof validateUrlForSSRF
>;

describe('VisualSearchService', () => {
  let service: VisualSearchService;
  let mockDataSource: any;
  let mockCacheManager: any;

  const mockProductQueryFacade = {
    findProductImages: jest.fn(),
  };

  const mockImageEmbeddingRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'EMBEDDING_SERVICE_URL') {
        return 'http://localhost:18001';
      }
      if (key === 'EMBEDDING_IMAGE_URL_TIMEOUT_MS') {
        return 240000;
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualSearchService,
        {
          provide: getRepositoryToken(ProductImageEmbedding),
          useValue: mockImageEmbeddingRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ProductQueryFacadeService,
          useValue: mockProductQueryFacade,
        },
      ],
    }).compile();

    service = module.get<VisualSearchService>(VisualSearchService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAvailable', () => {
    it('初始状态应为不可用', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('服务健康检查成功时应设置为可用', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'ok', models: { image: { loaded: true } } },
      });
      mockDataSource.query.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:18001/health',
        expect.any(Object),
      );
    });

    it('服务健康检查失败时应保持不可用', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));
      mockDataSource.query.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });

    it('健康检查返回非 ok 状态时应设置为不可用', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'error' },
      });
      mockDataSource.query.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('getImageEmbedding', () => {
    it('应成功从图片 Buffer 获取 embedding', async () => {
      const mockEmbedding = Array(512).fill(0.1);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          embedding: mockEmbedding,
          dimensions: 512,
          processing_time_ms: 100,
        },
      });

      const imageBuffer = Buffer.from('fake-image-data');
      const result = await service.getImageEmbedding(imageBuffer);

      expect(result).toEqual(mockEmbedding);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:18001/embedding',
        expect.any(Object),
        expect.objectContaining({
          timeout: 30000,
        }),
      );
    });

    it('API 调用失败时应抛出错误', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const imageBuffer = Buffer.from('fake-image-data');

      await expect(service.getImageEmbedding(imageBuffer)).rejects.toThrow(
        'Failed to extract image features',
      );
    });
  });

  describe('getImageEmbeddingFromUrl', () => {
    it('应成功从图片 URL 获取 embedding', async () => {
      const mockEmbedding = Array(512).fill(0.2);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          embedding: mockEmbedding,
          dimensions: 512,
          processing_time_ms: 150,
        },
      });

      const imageUrl = 'https://example.com/image.jpg';
      const result = await service.getImageEmbeddingFromUrl(imageUrl);

      expect(result).toEqual(mockEmbedding);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:18001/embedding/url',
        null,
        expect.objectContaining({
          params: { url: imageUrl },
          timeout: 240000,
        }),
      );
    });

    it('URL 获取失败时应抛出错误', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid URL'));

      await expect(
        service.getImageEmbeddingFromUrl('invalid-url'),
      ).rejects.toThrow('Failed to extract image features from URL');
    });

    it('URL embedding 失败时应回退到下载后上传', async () => {
      const mockEmbedding = Array(512).fill(0.4);
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Blocked URL'))
        .mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 120,
          },
        });
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-image-data'),
      });

      const imageUrl = 'https://si.geilicdn.com/open-test-image.jpg';
      const result = await service.getImageEmbeddingFromUrl(imageUrl);

      expect(result).toEqual(mockEmbedding);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        imageUrl,
        expect.objectContaining({
          responseType: 'arraybuffer',
          timeout: 240000,
          maxRedirects: 0,
        }),
      );
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        'http://localhost:18001/embedding',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.any(Object),
          timeout: 30000,
        }),
      );
    });

    it('图片源返回 404 时应标记为永久失败', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('URL embedding failed'));
      mockedAxios.get.mockRejectedValueOnce(
        Object.assign(new Error('Request failed with status code 404'), {
          response: { status: 404 },
        }),
      );

      await expect(
        service.getImageEmbeddingFromUrl('https://example.com/missing.jpg'),
      ).rejects.toThrow('Permanent image URL failure (404)');
    });
  });

  describe('searchByEmbedding', () => {
    it('应返回相似商品列表', async () => {
      const mockQueryResult = [
        {
          id: 'product-1',
          title: 'Test Product',
          slug: 'test-product',
          mainImage: 'https://example.com/main.jpg',
          images: ['https://example.com/img1.jpg'],
          priceMin: '100',
          priceMax: '200',
          similarity: '0.85',
          matched_image: 'https://example.com/matched.jpg',
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockQueryResult);

      const embedding = Array(512).fill(0.1);
      const results = await service.searchByEmbedding(embedding, 20, 50);

      expect(results).toHaveLength(1);
      expect(results[0].product.id).toBe('product-1');
      expect(results[0].similarity).toBe(85);
      expect(results[0].matchedImage).toBe('https://example.com/matched.jpg');
    });

    it('应返回品牌、分类、性别、颜色、货币信息', async () => {
      const mockQueryResult = [
        {
          id: 'product-1',
          title: 'Nike Shoes',
          slug: 'nike-shoes',
          mainImage: 'https://example.com/main.jpg',
          images: ['https://example.com/img1.jpg'],
          priceMin: '299',
          priceMax: '599',
          currency: 'USD',
          similarity: '0.85',
          matched_image: 'https://example.com/matched.jpg',
          primaryCategoryId: 'cat-1',
          brandId: 'brand-1',
          brandName: 'Nike',
          brandSlug: 'nike',
          categoryName: 'Shoes',
          categorySlug: 'shoes',
          viewCount: '100',
          aiAttributes: JSON.stringify({
            gender: 'Women',
            colors: ['Black', 'White'],
          }),
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockQueryResult);

      const results = await service.searchByEmbedding(
        Array(512).fill(0.1),
        20,
        50,
      );

      expect(results[0].product.currency).toBe('USD');
      expect(results[0].product.brand).toEqual({
        id: 'brand-1',
        name: 'Nike',
        slug: 'nike',
      });
      expect(results[0].product.category).toEqual({
        name: 'Shoes',
        slug: 'shoes',
      });
      expect(results[0].product.gender).toBe('Women');
      expect(results[0].product.colors).toEqual(['Black', 'White']);
    });

    it('品牌/分类缺失时不应包含在结果中', async () => {
      const mockQueryResult = [
        {
          id: 'product-2',
          title: 'No Brand Product',
          slug: 'no-brand',
          mainImage: 'https://example.com/main.jpg',
          images: [],
          priceMin: '100',
          priceMax: '200',
          currency: null,
          similarity: '0.80',
          matched_image: null,
          primaryCategoryId: null,
          brandId: null,
          brandName: null,
          brandSlug: null,
          categoryName: null,
          categorySlug: null,
          viewCount: '0',
          aiAttributes: null,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockQueryResult);

      const results = await service.searchByEmbedding(
        Array(512).fill(0.1),
        20,
        50,
      );

      expect(results[0].product.brand).toBeUndefined();
      expect(results[0].product.category).toBeUndefined();
      expect(results[0].product.gender).toBeUndefined();
      expect(results[0].product.colors).toBeUndefined();
      expect(results[0].product.currency).toBe('CNY'); // 默认值
    });

    it('aiAttributes 中单个 color 字段也能正确提取', async () => {
      const mockQueryResult = [
        {
          id: 'product-3',
          title: 'Single Color',
          slug: 'single-color',
          mainImage: 'https://example.com/main.jpg',
          images: [],
          priceMin: '100',
          priceMax: '200',
          similarity: '0.75',
          matched_image: null,
          viewCount: '0',
          aiAttributes: JSON.stringify({ color: 'Red' }),
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockQueryResult);

      const results = await service.searchByEmbedding(
        Array(512).fill(0.1),
        20,
        50,
      );

      expect(results[0].product.colors).toEqual(['Red']);
    });

    it('应正确处理空结果', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      const embedding = Array(512).fill(0.1);
      const results = await service.searchByEmbedding(embedding, 20, 50);

      expect(results).toHaveLength(0);
    });

    it('pgvector 未启用时应抛出特定错误', async () => {
      mockDataSource.query.mockRejectedValueOnce(
        new Error('type "vector" does not exist'),
      );

      const embedding = Array(512).fill(0.1);

      await expect(
        service.searchByEmbedding(embedding, 20, 50),
      ).rejects.toThrow('Visual search is not available');
    });

    it('其他查询错误应直接抛出', async () => {
      mockDataSource.query.mockRejectedValueOnce(
        new Error('Database connection error'),
      );

      const embedding = Array(512).fill(0.1);

      await expect(
        service.searchByEmbedding(embedding, 20, 50),
      ).rejects.toThrow('Database connection error');
    });

    it('应限制并发向量召回，避免同时打满数据库', async () => {
      let resolveQuery: (rows: unknown[]) => void = () => undefined;
      mockDataSource.query.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
      );

      const embedding = Array(512).fill(0.1);
      const first = service.searchByEmbedding(embedding, 20, 50);

      await expect(
        service.searchByEmbedding(embedding, 20, 50),
      ).rejects.toThrow('Visual search is busy');
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);

      resolveQuery([]);
      await expect(first).resolves.toEqual([]);
    });

    it('使用 query runner 时应为向量召回设置 statement_timeout', async () => {
      const queryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce([]),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockDataSource.createQueryRunner = jest.fn(() => queryRunner);

      await expect(
        service.searchByEmbedding(Array(512).fill(0.1), 20, 50),
      ).resolves.toEqual([]);

      expect(queryRunner.query).toHaveBeenNthCalledWith(
        1,
        'SET LOCAL statement_timeout = 5000',
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('应先限制最近向量候选，再做去重和重排', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await service.searchByEmbedding(Array(512).fill(0.1), 20, 50);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH nearest_matches AS'),
        expect.arrayContaining([20, 120]),
      );
    });
  });

  describe('searchByImage', () => {
    it('应结合 getImageEmbedding 和 searchByEmbedding', async () => {
      const mockEmbedding = Array(512).fill(0.1);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          embedding: mockEmbedding,
          dimensions: 512,
          processing_time_ms: 100,
        },
      });

      const mockQueryResult = [
        {
          id: 'product-1',
          title: 'Test Product',
          slug: 'test-product',
          mainImage: 'https://example.com/main.jpg',
          images: [],
          priceMin: '100',
          priceMax: '200',
          similarity: '0.90',
          matched_image: null,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockQueryResult);

      const imageBuffer = Buffer.from('fake-image');
      const results = await service.searchByImage(imageBuffer, 10, 60);

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(90);
    });
  });

  describe('searchByProductId', () => {
    it('应返回 sourceProduct，并在结果中排除源商品自身', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            embedding: JSON.stringify(Array(3).fill(0.1)),
            id: 'source-1',
            title: 'Source Product',
            slug: 'source-product',
            mainImage: 'https://example.com/source.jpg',
            images: JSON.stringify([
              'https://example.com/source.jpg',
              'https://example.com/source-2.jpg',
            ]),
            primaryCategoryId: 'cat-1',
            brandId: 'brand-1',
            aiAttributes: JSON.stringify({ gender: 'Women' }),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'source-1',
            title: 'Source Product',
            slug: 'source-product',
            mainImage: 'https://example.com/source.jpg',
            images: ['https://example.com/source.jpg'],
            priceMin: '199',
            priceMax: '199',
            currency: 'USD',
            similarity: '0.99',
            matched_image: 'https://example.com/source.jpg',
            primaryCategoryId: 'cat-1',
            brandId: 'brand-1',
            brandName: 'Brand One',
            brandSlug: 'brand-one',
            categoryName: 'Slides',
            categorySlug: 'slides',
            viewCount: '100',
            aiAttributes: JSON.stringify({
              gender: 'Women',
              colors: ['Black'],
            }),
            weidianShopName: 'Source Shop',
          },
          {
            id: 'similar-1',
            title: 'Similar Product',
            slug: 'similar-product',
            mainImage: 'https://example.com/similar.jpg',
            images: ['https://example.com/similar.jpg'],
            priceMin: '149',
            priceMax: '179',
            currency: 'USD',
            similarity: '0.92',
            matched_image: 'https://example.com/similar.jpg',
            primaryCategoryId: 'cat-1',
            brandId: 'brand-2',
            brandName: 'Brand Two',
            brandSlug: 'brand-two',
            categoryName: 'Slides',
            categorySlug: 'slides',
            viewCount: '80',
            aiAttributes: JSON.stringify({
              gender: 'Women',
              colors: ['White'],
            }),
            weidianShopName: 'Similar Shop',
          },
        ]);

      const result = await service.searchByProductId('source-1', 50, 25);

      expect(result.sourceProduct).toEqual({
        id: 'source-1',
        title: 'Source Product',
        slug: 'source-product',
        mainImage: 'https://example.com/source.jpg',
        images: [
          'https://example.com/source.jpg',
          'https://example.com/source-2.jpg',
        ],
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].product.id).toBe('similar-1');
    });

    it('同一商品并发 by-product 查询应共享同一次向量召回', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            embedding: JSON.stringify(Array(3).fill(0.1)),
            id: 'source-1',
            title: 'Source Product',
            slug: 'source-product',
            mainImage: 'https://example.com/source.jpg',
            images: JSON.stringify(['https://example.com/source.jpg']),
            primaryCategoryId: 'cat-1',
            brandId: 'brand-1',
            aiAttributes: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'similar-1',
            title: 'Similar Product',
            slug: 'similar-product',
            mainImage: 'https://example.com/similar.jpg',
            images: ['https://example.com/similar.jpg'],
            priceMin: '149',
            priceMax: '179',
            currency: 'USD',
            similarity: '0.92',
            matched_image: 'https://example.com/similar.jpg',
            primaryCategoryId: 'cat-1',
            brandId: 'brand-2',
            brandName: 'Brand Two',
            brandSlug: 'brand-two',
            categoryName: 'Slides',
            categorySlug: 'slides',
            viewCount: '80',
            aiAttributes: null,
            weidianShopName: 'Similar Shop',
          },
        ]);

      const [first, second] = await Promise.all([
        service.searchByProductId('source-1', 24, 25),
        service.searchByProductId('source-1', 24, 25),
      ]);

      expect(first.results).toHaveLength(1);
      expect(second.results).toHaveLength(1);
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
    });

    it('应可预热 by-product 缓存中的成功结果', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            embedding: JSON.stringify(Array(3).fill(0.1)),
            id: 'source-1',
            title: 'Source Product',
            slug: 'source-product',
            mainImage: 'https://example.com/source.jpg',
            images: JSON.stringify(['https://example.com/source.jpg']),
            primaryCategoryId: 'cat-1',
            brandId: 'brand-1',
            aiAttributes: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'similar-1',
            title: 'Similar Product',
            slug: 'similar-product',
            mainImage: 'https://example.com/similar.jpg',
            images: ['https://example.com/similar.jpg'],
            priceMin: '149',
            priceMax: '179',
            currency: 'USD',
            similarity: '0.92',
            matched_image: 'https://example.com/similar.jpg',
            primaryCategoryId: 'cat-1',
            brandId: 'brand-2',
            brandName: 'Brand Two',
            brandSlug: 'brand-two',
            categoryName: 'Slides',
            categorySlug: 'slides',
            viewCount: '80',
            aiAttributes: null,
            weidianShopName: 'Similar Shop',
          },
        ]);

      await service.warmByProductSearchCache('source-1');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'visual-search:by-product:v2:source-1:limit=24:minSimilarity=25',
        expect.objectContaining({ total: 1 }),
        3600000,
      );
    });

    it('源商品没有 embedding 时应返回空 sourceProduct 和空结果', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(
        service.searchByProductId('missing-product'),
      ).resolves.toEqual({
        sourceProduct: null,
        results: [],
      });
    });

    it('向量召回失败时应保留 sourceProduct 并返回空结果', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            embedding: JSON.stringify(Array(3).fill(0.1)),
            id: 'source-1',
            title: 'Source Product',
            slug: 'source-product',
            mainImage: 'https://example.com/source.jpg',
            images: JSON.stringify(['https://example.com/source.jpg']),
            primaryCategoryId: 'cat-1',
            brandId: 'brand-1',
            aiAttributes: null,
          },
        ])
        .mockRejectedValueOnce(
          new Error('canceling statement due to statement timeout'),
        );

      await expect(
        service.searchByProductId('source-1', 24, 25),
      ).resolves.toEqual({
        sourceProduct: {
          id: 'source-1',
          title: 'Source Product',
          slug: 'source-product',
          mainImage: 'https://example.com/source.jpg',
          images: ['https://example.com/source.jpg'],
        },
        results: [],
      });
    });
  });

  describe('generateProductEmbeddings', () => {
    it('商品不存在时应返回空结果', async () => {
      mockProductQueryFacade.findProductImages.mockResolvedValueOnce(null);

      const result = await service.generateProductEmbeddings('non-existent-id');

      expect(result).toEqual({ success: 0, failed: 0 });
    });

    it('商品无图片时应返回空结果', async () => {
      mockProductQueryFacade.findProductImages.mockResolvedValueOnce({
        id: 'product-1',
        mainImage: null,
        images: null,
      });

      const result = await service.generateProductEmbeddings('product-1');

      expect(result).toEqual({ success: 0, failed: 0 });
    });

    it('应成功为商品图片生成 embedding', async () => {
      mockProductQueryFacade.findProductImages.mockResolvedValueOnce({
        id: 'product-1',
        mainImage: 'https://example.com/main.jpg',
        images: ['https://example.com/img1.jpg'],
      });

      // Mock: 批量查询无已有 embedding，然后两次 INSERT
      mockDataSource.query
        .mockResolvedValueOnce([]) // 批量 SELECT：无已有 embedding
        .mockResolvedValueOnce(undefined) // 插入第一张
        .mockResolvedValueOnce(undefined); // 插入第二张

      const mockEmbedding = Array(512).fill(0.1);
      mockedAxios.post.mockResolvedValue({
        data: {
          embedding: mockEmbedding,
          dimensions: 512,
          processing_time_ms: 100,
        },
      });

      const result = await service.generateProductEmbeddings('product-1');

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('已存在的 embedding 应跳过生成', async () => {
      mockProductQueryFacade.findProductImages.mockResolvedValueOnce({
        id: 'product-1',
        mainImage: 'https://example.com/main.jpg',
        images: null,
      });

      // Mock: 批量查询返回已有 embedding
      mockDataSource.query.mockResolvedValueOnce([
        { image_url: 'https://example.com/main.jpg', has_embedding: true },
      ]);

      const result = await service.generateProductEmbeddings('product-1');

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      // 不应调用 embedding API
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('永久失败图片应写入失败标记，避免后续恢复反复重试', async () => {
      mockProductQueryFacade.findProductImages.mockResolvedValueOnce({
        id: 'product-1',
        mainImage: 'https://example.com/missing.jpg',
        images: null,
      });

      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined);
      mockedAxios.post.mockRejectedValueOnce(new Error('URL embedding failed'));
      mockedAxios.get.mockRejectedValueOnce(
        Object.assign(new Error('Request failed with status code 404'), {
          response: { status: 404 },
        }),
      );

      const result = await service.generateProductEmbeddings('product-1');

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockDataSource.query).toHaveBeenLastCalledWith(
        expect.stringContaining('embedding_failure_code'),
        [
          'product-1',
          'https://example.com/missing.jpg',
          0,
          'http_404',
          'Permanent image URL failure (404)',
        ],
      );
    });
  });

  describe('countProductsWithoutEmbedding', () => {
    it('应返回正确的计数', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ count: '42' }]);

      const count = await service.countProductsWithoutEmbedding();

      expect(count).toBe(42);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "embedding_failure_code IN ('http_404', 'http_410')",
        ),
      );
    });

    it('无结果时应返回0', async () => {
      mockDataSource.query.mockResolvedValueOnce([{}]);

      const count = await service.countProductsWithoutEmbedding();

      expect(count).toBe(0);
    });
  });

  describe('countProductsWithEmbedding', () => {
    it('应返回有 embedding 的商品数量', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ count: '100' }]);

      const count = await service.countProductsWithEmbedding();

      expect(count).toBe(100);
    });
  });

  describe('countTotalImageEmbeddings', () => {
    it('应返回总 embedding 数量', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ count: '500' }]);

      const count = await service.countTotalImageEmbeddings();

      expect(count).toBe(500);
    });
  });

  describe('clearAllEmbeddings', () => {
    it('应执行删除所有 embeddings 的 SQL', async () => {
      mockDataSource.query.mockResolvedValueOnce(undefined);

      await service.clearAllEmbeddings();

      expect(mockDataSource.query).toHaveBeenCalledWith(
        'DELETE FROM product_image_embeddings',
      );
    });
  });

  describe('markAllEmbeddingsForRegeneration', () => {
    it('应将所有 embedding 置为 NULL 而非删除行', async () => {
      mockDataSource.query.mockResolvedValueOnce(undefined);

      await service.markAllEmbeddingsForRegeneration();

      expect(mockDataSource.query).toHaveBeenCalledWith(
        'UPDATE product_image_embeddings SET embedding = NULL',
      );
    });
  });

  describe('deleteProductEmbeddings', () => {
    it('应删除指定商品的所有 embeddings', async () => {
      mockDataSource.query.mockResolvedValueOnce(undefined);

      await service.deleteProductEmbeddings('product-123');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        'DELETE FROM product_image_embeddings WHERE product_id = $1',
        ['product-123'],
      );
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('应批量处理缺失 embedding 的商品', async () => {
      // Mock: 查询缺失 embedding 的商品
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'product-1',
          mainImage: 'https://example.com/1.jpg',
          images: null,
        },
        {
          id: 'product-2',
          mainImage: 'https://example.com/2.jpg',
          images: null,
        },
      ]);

      // Mock: generateProductEmbeddings 的调用
      mockProductQueryFacade.findProductImages
        .mockResolvedValueOnce({
          id: 'product-1',
          mainImage: 'https://example.com/1.jpg',
          images: null,
        })
        .mockResolvedValueOnce({
          id: 'product-2',
          mainImage: 'https://example.com/2.jpg',
          images: null,
        });

      // Mock: 检查和插入
      mockDataSource.query
        .mockResolvedValueOnce([]) // product-1 不存在
        .mockResolvedValueOnce(undefined) // 插入 product-1
        .mockResolvedValueOnce([]) // product-2 不存在
        .mockResolvedValueOnce(undefined); // 插入 product-2

      const mockEmbedding = Array(512).fill(0.1);
      mockedAxios.post.mockResolvedValue({
        data: {
          embedding: mockEmbedding,
          dimensions: 512,
          processing_time_ms: 100,
        },
      });

      const result = await service.batchGenerateEmbeddings(10);

      expect(result.totalProducts).toBe(2);
      expect(result.success).toBe(2);
    });

    it('无缺失商品时应返回空结果', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      const result = await service.batchGenerateEmbeddings(10);

      expect(result.totalProducts).toBe(0);
      expect(result.totalImages).toBe(0);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('重排 (reranking)', () => {
    const makeRecallRow = (overrides: any) => ({
      id: 'p1',
      title: 'Product',
      slug: 'product',
      mainImage: 'https://example.com/img.jpg',
      images: [],
      priceMin: '100',
      priceMax: '200',
      similarity: '0.85',
      matched_image: null,
      primaryCategoryId: null,
      brandId: null,
      viewCount: '0',
      aiAttributes: null,
      ...overrides,
    });

    describe('searchByImage 重排', () => {
      it('应根据 top-1 属性重排，同类目/性别的结果排序提升', async () => {
        const mockEmbedding = Array(512).fill(0.1);
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 100,
          },
        });

        // CLIP 排序: A(0.90) > C(0.89) > B(0.88)
        mockDataSource.query.mockResolvedValueOnce([
          makeRecallRow({
            id: 'A',
            similarity: '0.90',
            primaryCategoryId: 'cat-shoes',
            aiAttributes: JSON.stringify({ gender: 'Women' }),
            viewCount: '200',
          }),
          makeRecallRow({
            id: 'C',
            similarity: '0.89',
            primaryCategoryId: 'cat-bags',
            aiAttributes: JSON.stringify({ gender: 'Men' }),
            viewCount: '10',
          }),
          makeRecallRow({
            id: 'B',
            similarity: '0.88',
            primaryCategoryId: 'cat-shoes',
            aiAttributes: JSON.stringify({ gender: 'Women' }),
            viewCount: '50',
          }),
        ]);

        const results = await service.searchByImage(
          Buffer.from('fake'),
          10,
          50,
        );

        // Top-1 是 A (shoes/Women)，重排后 B 应超过 C（同类目/性别加分）
        expect(results[0].product.id).toBe('A');
        expect(results[1].product.id).toBe('B');
        expect(results[2].product.id).toBe('C');
      });

      it('应使用 2 倍过量召回', async () => {
        const mockEmbedding = Array(512).fill(0.1);
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 100,
          },
        });
        mockDataSource.query.mockResolvedValueOnce([]);

        await service.searchByImage(Buffer.from('fake'), 10, 50);

        // 验证 SQL 中 limit 参数为 10 * 2 = 20
        expect(mockDataSource.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([20]),
        );
      });
    });

    describe('searchByProductId 重排', () => {
      it('应根据源商品属性重排，品牌多样性加分', async () => {
        // 源商品: shoes / Women / Nike
        mockDataSource.query.mockResolvedValueOnce([
          {
            embedding: JSON.stringify(Array(512).fill(0.1)),
            primaryCategoryId: 'cat-shoes',
            brandId: 'brand-nike',
            aiAttributes: JSON.stringify({ gender: 'Women' }),
          },
        ]);

        // CLIP 排序: Z(0.86) > X(0.85) > Y(0.83)
        mockDataSource.query.mockResolvedValueOnce([
          makeRecallRow({
            id: 'Z',
            similarity: '0.86',
            primaryCategoryId: 'cat-bags',
            brandId: 'brand-lv',
            aiAttributes: JSON.stringify({ gender: 'Men' }),
            viewCount: '50',
          }),
          makeRecallRow({
            id: 'X',
            similarity: '0.85',
            primaryCategoryId: 'cat-shoes',
            brandId: 'brand-nike',
            aiAttributes: JSON.stringify({ gender: 'Women' }),
            viewCount: '100',
          }),
          makeRecallRow({
            id: 'Y',
            similarity: '0.83',
            primaryCategoryId: 'cat-shoes',
            brandId: 'brand-adidas',
            aiAttributes: JSON.stringify({ gender: 'Women' }),
            viewCount: '200',
          }),
        ]);

        const { results } = await service.searchByProductId(
          'source-product',
          10,
          25,
        );

        // Y 排第一：同类目/性别 + 不同品牌(多样性加分) + 最高人气
        expect(results[0].product.id).toBe('Y');
        // X 第二：同类目/性别，但同品牌无多样性加分
        expect(results[1].product.id).toBe('X');
        // Z 第三：不同类目/性别，CLIP 分不够补回来
        expect(results[2].product.id).toBe('Z');
      });

      it('应排除源商品自身', async () => {
        mockDataSource.query.mockResolvedValueOnce([
          {
            embedding: JSON.stringify(Array(512).fill(0.1)),
            primaryCategoryId: 'cat-shoes',
            brandId: null,
            aiAttributes: null,
          },
        ]);

        mockDataSource.query.mockResolvedValueOnce([
          makeRecallRow({ id: 'source-product', similarity: '0.99' }),
          makeRecallRow({ id: 'other-product', similarity: '0.85' }),
        ]);

        const { results } = await service.searchByProductId(
          'source-product',
          10,
          25,
        );

        expect(results.every((r) => r.product.id !== 'source-product')).toBe(
          true,
        );
        expect(results[0].product.id).toBe('other-product');
      });
    });

    describe('边界情况', () => {
      it('所有 viewCount 为 0 时不应出错', async () => {
        const mockEmbedding = Array(512).fill(0.1);
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 100,
          },
        });

        mockDataSource.query.mockResolvedValueOnce([
          makeRecallRow({ id: 'A', similarity: '0.90', viewCount: '0' }),
          makeRecallRow({ id: 'B', similarity: '0.85', viewCount: '0' }),
        ]);

        const results = await service.searchByImage(
          Buffer.from('fake'),
          10,
          50,
        );

        expect(results).toHaveLength(2);
        expect(results[0].product.id).toBe('A');
      });

      it('aiAttributes 为 null 时不应出错', async () => {
        const mockEmbedding = Array(512).fill(0.1);
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 100,
          },
        });

        mockDataSource.query.mockResolvedValueOnce([
          makeRecallRow({ id: 'A', similarity: '0.90', aiAttributes: null }),
          makeRecallRow({ id: 'B', similarity: '0.85', aiAttributes: null }),
        ]);

        const results = await service.searchByImage(
          Buffer.from('fake'),
          10,
          50,
        );

        expect(results).toHaveLength(2);
      });

      it('过量召回后应截取到请求的 limit', async () => {
        const mockEmbedding = Array(512).fill(0.1);
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 100,
          },
        });

        mockDataSource.query.mockResolvedValueOnce([
          makeRecallRow({ id: 'A', similarity: '0.90' }),
          makeRecallRow({ id: 'B', similarity: '0.88' }),
          makeRecallRow({ id: 'C', similarity: '0.86' }),
          makeRecallRow({ id: 'D', similarity: '0.84' }),
        ]);

        const results = await service.searchByImage(Buffer.from('fake'), 2, 50);

        expect(results).toHaveLength(2);
      });

      it('召回结果为空时应返回空数组', async () => {
        const mockEmbedding = Array(512).fill(0.1);
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            embedding: mockEmbedding,
            dimensions: 512,
            processing_time_ms: 100,
          },
        });

        mockDataSource.query.mockResolvedValueOnce([]);

        const results = await service.searchByImage(
          Buffer.from('fake'),
          10,
          50,
        );

        expect(results).toHaveLength(0);
      });
    });
  });

  describe('SSRF 防护', () => {
    it('getImageEmbeddingFromUrl 应调用 SSRF 校验', async () => {
      const mockEmbedding = Array(512).fill(0.2);
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          embedding: mockEmbedding,
          dimensions: 512,
          processing_time_ms: 100,
        },
      });

      await service.getImageEmbeddingFromUrl('https://example.com/image.jpg');

      expect(mockedValidateUrl).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
      );
    });

    it('SSRF 校验失败时应阻止请求', async () => {
      mockedValidateUrl.mockRejectedValueOnce(
        new Error('Blocked URL: resolves to private/reserved IP address'),
      );

      await expect(
        service.getImageEmbeddingFromUrl(
          'http://169.254.169.254/latest/meta-data/',
        ),
      ).rejects.toThrow('Blocked URL: resolves to private/reserved IP address');

      // 不应调用 embedding API
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('generateProductEmbeddings 中 SSRF 校验失败时应记录失败', async () => {
      mockProductQueryFacade.findProductImages.mockResolvedValueOnce({
        id: 'product-1',
        mainImage: 'http://169.254.169.254/creds',
        images: null,
      });

      // 无已有 embedding
      mockDataSource.query.mockResolvedValueOnce([]);

      // SSRF 校验拒绝
      mockedValidateUrl.mockRejectedValueOnce(
        new Error('Blocked URL: resolves to private/reserved IP address'),
      );

      const result = await service.generateProductEmbeddings('product-1');

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});
