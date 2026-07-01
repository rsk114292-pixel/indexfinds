import { SimilarProductsService } from './similar-products.service';

describe('SimilarProductsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RECOMMENDATIONS_SIMILAR_IMAGE_RECALL_ENABLED;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('keeps image embedding recall disabled by default for safe similar mode', async () => {
    const source = {
      id: 'source-product',
      status: 'active',
      aiAttributes: null,
      brandId: null,
      primaryCategoryId: null,
      secondaryCategories: [],
    };
    const fallbackProduct = {
      id: 'fallback-product',
      status: 'active',
      viewCount: 10,
    };
    const productRepository = {
      findOne: jest.fn().mockResolvedValue(source),
      find: jest.fn().mockResolvedValue([fallbackProduct]),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
    };
    const semanticSearchService = {
      isAvailable: jest.fn().mockReturnValue(false),
    };
    const visualSearchService = {
      isAvailable: jest.fn().mockReturnValue(true),
    };

    const service = new SimilarProductsService(
      productRepository as any,
      dataSource as any,
      semanticSearchService as any,
      visualSearchService as any,
    );

    const result = await service.findSimilar(source.id, 12);

    expect(result).toEqual([fallbackProduct]);
    expect(visualSearchService.isAvailable).not.toHaveBeenCalled();
  });

  it('only uses image embedding recall when explicitly enabled', async () => {
    process.env.RECOMMENDATIONS_SIMILAR_IMAGE_RECALL_ENABLED = 'true';

    const source = {
      id: 'source-product',
      status: 'active',
      aiAttributes: null,
      brandId: null,
      primaryCategoryId: null,
      secondaryCategories: [],
    };
    const productRepository = {
      findOne: jest.fn().mockResolvedValue(source),
      find: jest.fn().mockResolvedValue([]),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
    };
    const semanticSearchService = {
      isAvailable: jest.fn().mockReturnValue(false),
    };
    const visualSearchService = {
      isAvailable: jest.fn().mockReturnValue(false),
    };

    const service = new SimilarProductsService(
      productRepository as any,
      dataSource as any,
      semanticSearchService as any,
      visualSearchService as any,
    );

    await service.findSimilar(source.id, 12);

    expect(visualSearchService.isAvailable).toHaveBeenCalledTimes(1);
  });
});
