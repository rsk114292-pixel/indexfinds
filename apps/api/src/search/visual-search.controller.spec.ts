import { VisualSearchController } from './visual-search.controller';
import { VisualSearchService } from './visual-search.service';
import { ConfigService } from '@nestjs/config';

describe('VisualSearchController', () => {
  let controller: VisualSearchController;
  const mockVisualSearchService = {
    isAvailable: jest.fn().mockReturnValue(true),
    searchByImage: jest.fn(),
    searchByProductId: jest.fn(),
    countProductsWithEmbedding: jest.fn().mockResolvedValue(318),
    countProductsWithoutEmbedding: jest.fn().mockResolvedValue(6),
    countTotalImageEmbeddings: jest.fn().mockResolvedValue(320),
    markAllEmbeddingsForRegeneration: jest.fn().mockResolvedValue(undefined),
  };
  const mockEmbeddingQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };
  const mockConfigService = {
    get: jest.fn(),
  };
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    controller = new VisualSearchController(
      mockVisualSearchService as unknown as VisualSearchService,
      mockConfigService as unknown as ConfigService,
      mockEmbeddingQueue as never,
      mockCacheManager as never,
    );
    jest.clearAllMocks();
    mockVisualSearchService.isAvailable.mockReturnValue(true);
    mockVisualSearchService.countProductsWithEmbedding.mockResolvedValue(318);
    mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(6);
    mockVisualSearchService.countTotalImageEmbeddings.mockResolvedValue(320);
    mockConfigService.get.mockReturnValue('false');
    mockCacheManager.get.mockResolvedValue(undefined);
    mockCacheManager.set.mockResolvedValue(undefined);
  });

  it('returns visual-search status with embedding coverage stats', async () => {
    const expectedStatus = {
      available: true,
      message: 'Visual search is ready',
      stats: {
        productsWithEmbedding: 318,
        productsWithoutEmbedding: 6,
        totalImageEmbeddings: 320,
        coverage: 98,
      },
    };

    await expect(controller.getStatus()).resolves.toEqual(expectedStatus);
    expect(
      mockVisualSearchService.countProductsWithEmbedding,
    ).toHaveBeenCalled();
    expect(
      mockVisualSearchService.countProductsWithoutEmbedding,
    ).toHaveBeenCalled();
    expect(
      mockVisualSearchService.countTotalImageEmbeddings,
    ).toHaveBeenCalled();
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'visual-search:status:v1',
      expectedStatus,
      120000,
    );
  });

  it('returns cached visual-search status without recounting embeddings', async () => {
    const cachedStatus = {
      available: true,
      message: 'Visual search is ready',
      stats: {
        productsWithEmbedding: 318,
        productsWithoutEmbedding: 6,
        totalImageEmbeddings: 320,
        coverage: 98,
      },
    };
    mockCacheManager.get.mockResolvedValue(cachedStatus);

    await expect(controller.getStatus()).resolves.toEqual(cachedStatus);
    expect(
      mockVisualSearchService.countProductsWithEmbedding,
    ).not.toHaveBeenCalled();
    expect(
      mockVisualSearchService.countProductsWithoutEmbedding,
    ).not.toHaveBeenCalled();
    expect(
      mockVisualSearchService.countTotalImageEmbeddings,
    ).not.toHaveBeenCalled();
    expect(mockCacheManager.set).not.toHaveBeenCalled();
  });

  it('keeps public upload image search disabled by default', async () => {
    const file = {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await expect(controller.searchByImage(file, '10', '60')).rejects.toThrow(
      'Visual search upload is temporarily unavailable',
    );
    expect(mockVisualSearchService.searchByImage).not.toHaveBeenCalled();
  });

  it('returns image-search results without sourceProduct metadata when upload search is enabled', async () => {
    mockConfigService.get.mockReturnValue('true');
    const file = {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/jpeg',
      size: 10,
    } as Express.Multer.File;
    const results = [
      {
        similarity: 92,
        product: {
          id: 'similar-1',
          title: 'Similar Product',
          slug: 'similar-product',
          mainImage: 'https://example.com/similar.jpg',
          images: ['https://example.com/similar.jpg'],
          priceMin: 100,
          priceMax: 120,
        },
      },
    ];
    mockVisualSearchService.searchByImage.mockResolvedValue(results);

    await expect(controller.searchByImage(file, '10', '60')).resolves.toEqual({
      results,
      total: 1,
    });
    expect(mockVisualSearchService.searchByImage).toHaveBeenCalledWith(
      file.buffer,
      10,
      60,
    );
  });

  it('clamps public upload image-search result limits', async () => {
    mockConfigService.get.mockReturnValue('true');
    const file = {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/png',
      size: 10,
    } as Express.Multer.File;
    mockVisualSearchService.searchByImage.mockResolvedValue([]);

    await controller.searchByImage(file, '50', '0');

    expect(mockVisualSearchService.searchByImage).toHaveBeenCalledWith(
      file.buffer,
      12,
      0,
    );
  });

  it('rejects gif uploads even when upload image search is enabled', async () => {
    mockConfigService.get.mockReturnValue('true');
    const file = {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/gif',
      size: 10,
    } as Express.Multer.File;

    await expect(controller.searchByImage(file)).rejects.toThrow(
      'Invalid file type',
    );
    expect(mockVisualSearchService.searchByImage).not.toHaveBeenCalled();
  });

  it('rejects oversized uploads even when upload image search is enabled', async () => {
    mockConfigService.get.mockReturnValue('true');
    const file = {
      buffer: Buffer.alloc(3 * 1024 * 1024 + 1),
      mimetype: 'image/webp',
      size: 3 * 1024 * 1024 + 1,
    } as Express.Multer.File;

    await expect(controller.searchByImage(file)).rejects.toThrow(
      'Image file is too large',
    );
    expect(mockVisualSearchService.searchByImage).not.toHaveBeenCalled();
  });

  it('returns product-based search results with sourceProduct metadata', async () => {
    const sourceProduct = {
      id: 'source-1',
      title: 'Source Product',
      slug: 'source-product',
      mainImage: 'https://example.com/source.jpg',
      images: [
        'https://example.com/source.jpg',
        'https://example.com/source-2.jpg',
      ],
    };
    const results = [
      {
        similarity: 95,
        product: {
          id: 'similar-1',
          title: 'Similar Product',
          slug: 'similar-product',
          mainImage: 'https://example.com/similar.jpg',
          images: ['https://example.com/similar.jpg'],
          priceMin: 100,
          priceMax: 120,
        },
      },
    ];
    mockVisualSearchService.searchByProductId.mockResolvedValue({
      sourceProduct,
      results,
    });

    await expect(
      controller.searchByProduct('source-1', '50', '25'),
    ).resolves.toEqual({
      sourceProduct,
      results,
      total: 1,
    });
    expect(mockVisualSearchService.searchByProductId).toHaveBeenCalledWith(
      'source-1',
      24,
      25,
    );
  });

  it('clamps product-based visual search limit for public requests', async () => {
    mockVisualSearchService.searchByProductId.mockResolvedValue({
      sourceProduct: null,
      results: [],
    });

    await controller.searchByProduct('source-1', '200', '25');

    expect(mockVisualSearchService.searchByProductId).toHaveBeenCalledWith(
      'source-1',
      24,
      25,
    );
  });

  it('queues image-only batch generation for missing image embeddings', async () => {
    await controller.batchGenerate();

    expect(mockEmbeddingQueue.add).toHaveBeenCalledWith(
      'batch-generate',
      { type: 'batch', limit: 100, embeddingType: 'image' },
      { priority: 3 },
    );
  });

  it('queues image-only regeneration batches when rebuilding all image embeddings', async () => {
    mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(
      600,
    );

    await controller.regenerateAll();

    expect(mockEmbeddingQueue.add).toHaveBeenCalledTimes(2);
    expect(mockEmbeddingQueue.add).toHaveBeenNthCalledWith(
      1,
      'batch-generate',
      { type: 'batch', limit: 500, embeddingType: 'image' },
      { priority: 3 },
    );
    expect(mockEmbeddingQueue.add).toHaveBeenNthCalledWith(
      2,
      'batch-generate',
      { type: 'batch', limit: 500, embeddingType: 'image' },
      { priority: 3 },
    );
  });
});
