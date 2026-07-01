import { CACHE_TTL_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { SemanticSearchController } from './semantic-search.controller';
import { SemanticSearchService } from './semantic-search.service';
import { VisualSearchService } from './visual-search.service';
import { EmbeddingHealthService } from './embedding-health.service';
import { SEMANTIC_CONFIG } from '../config/search.config';

describe('SemanticSearchController', () => {
  let controller: SemanticSearchController;

  const mockSemanticSearchService = {
    getStats: jest.fn(),
    refreshServiceAvailability: jest.fn(),
    batchGenerateEmbeddings: jest.fn(),
    generateProductEmbedding: jest.fn(),
  };

  const mockVisualSearchService = {
    countProductsWithEmbedding: jest.fn(),
    countProductsWithoutEmbedding: jest.fn(),
    countTotalImageEmbeddings: jest.fn(),
  };

  const mockEmbeddingHealthService = {
    getStatus: jest.fn(),
    forceHealthCheck: jest.fn(),
  };

  beforeEach(() => {
    controller = new SemanticSearchController(
      mockSemanticSearchService as unknown as SemanticSearchService,
      mockVisualSearchService as unknown as VisualSearchService,
      mockEmbeddingHealthService as unknown as EmbeddingHealthService,
    );

    jest.clearAllMocks();
    mockSemanticSearchService.getStats.mockResolvedValue({
      totalProducts: 100,
      productsWithEmbedding: 90,
      coverageRate: 0.9,
      serviceAvailable: true,
    });
    mockVisualSearchService.countProductsWithEmbedding.mockResolvedValue(80);
    mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(20);
    mockVisualSearchService.countTotalImageEmbeddings.mockResolvedValue(160);
    mockEmbeddingHealthService.getStatus.mockReturnValue({
      text: {
        available: true,
        model: 'all-MiniLM-L6-v2',
        dimensions: SEMANTIC_CONFIG.vectorDimensions,
      },
      image: {
        available: true,
        model: 'clip-ViT-B-32',
        dimensions: 512,
      },
      embeddingServiceUrl: 'http://embedding-service:8001',
      lastCheckTime: new Date('2026-06-06T00:00:00.000Z'),
      consecutiveFailures: 0,
      lastStateChange: null,
      nextCheckInMs: 30000,
    });
  });

  it('returns combined vector stats from cached health state', async () => {
    await expect(controller.getCombinedStats()).resolves.toEqual({
      text: {
        totalProducts: 100,
        productsWithEmbedding: 90,
        productsWithoutEmbedding: 10,
        coverageRate: 0.9,
        dimensions: SEMANTIC_CONFIG.vectorDimensions,
        model: 'all-MiniLM-L6-v2',
      },
      image: {
        totalProductsWithImages: 100,
        productsWithEmbedding: 80,
        productsWithoutEmbedding: 20,
        totalEmbeddings: 160,
        coverageRate: 0.8,
        dimensions: 512,
        model: 'clip-ViT-B-32',
      },
      service: {
        available: true,
        textAvailable: true,
        imageAvailable: true,
        url: 'http://embedding-service:8001',
        lastCheckTime: new Date('2026-06-06T00:00:00.000Z'),
        consecutiveFailures: 0,
      },
    });

    expect(mockEmbeddingHealthService.getStatus).toHaveBeenCalledTimes(1);
    expect(mockEmbeddingHealthService.forceHealthCheck).not.toHaveBeenCalled();
  });

  it('caches combined vector stats briefly on the API side', () => {
    const handler = SemanticSearchController.prototype.getCombinedStats;

    expect(Reflect.getMetadata(CACHE_TTL_METADATA, handler)).toBe(120000);
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toContain(
      CacheInterceptor,
    );
  });
});
