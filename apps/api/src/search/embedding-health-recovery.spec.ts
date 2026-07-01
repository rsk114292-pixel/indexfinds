import { EmbeddingHealthService } from './embedding-health.service';

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:18001'),
};

const mockEmbeddingGenerationService = {
  setAvailable: jest.fn(),
};

const mockVisualSearchService = {
  setAvailable: jest.fn(),
  countProductsWithoutEmbedding: jest.fn(),
};

const mockEmbeddingQueue = {
  add: jest.fn().mockResolvedValue({}),
};

describe('EmbeddingHealthService 恢复机制', () => {
  let service: EmbeddingHealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('http://localhost:18001');
    service = new EmbeddingHealthService(
      mockConfigService as any,
      mockEmbeddingGenerationService as any,
      mockVisualSearchService as any,
      mockEmbeddingQueue as any,
    );
  });

  describe('handleEmbeddingRecovery 定时恢复', () => {
    it('发现缺失 embedding 时入队批量任务', async () => {
      // 模拟服务可用
      (service as any).imageServiceAvailable = true;
      (service as any).textServiceAvailable = true;
      mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(
        15,
      );

      await service.handleEmbeddingRecovery();

      expect(mockEmbeddingQueue.add).toHaveBeenCalledWith(
        'batch-embedding',
        { type: 'batch', limit: 200, embeddingType: 'both' },
        expect.objectContaining({ priority: 3 }),
      );
    });

    it('无缺失时不入队', async () => {
      (service as any).imageServiceAvailable = true;
      (service as any).textServiceAvailable = true;
      mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(
        0,
      );

      await service.handleEmbeddingRecovery();

      expect(mockEmbeddingQueue.add).not.toHaveBeenCalled();
    });

    it('服务不可用时跳过恢复', async () => {
      (service as any).imageServiceAvailable = false;
      (service as any).textServiceAvailable = false;

      await service.handleEmbeddingRecovery();

      expect(
        mockVisualSearchService.countProductsWithoutEmbedding,
      ).not.toHaveBeenCalled();
    });

    it('恢复开关关闭时跳过恢复', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, fallback?: string) =>
          key === 'EMBEDDING_RECOVERY_ENABLED'
            ? 'false'
            : fallback || 'http://localhost:18001',
      );
      service = new EmbeddingHealthService(
        mockConfigService as any,
        mockEmbeddingGenerationService as any,
        mockVisualSearchService as any,
        mockEmbeddingQueue as any,
      );
      (service as any).imageServiceAvailable = true;
      (service as any).textServiceAvailable = true;

      await service.handleEmbeddingRecovery();

      expect(
        mockVisualSearchService.countProductsWithoutEmbedding,
      ).not.toHaveBeenCalled();
      expect(mockEmbeddingQueue.add).not.toHaveBeenCalled();
    });

    it('扫描出错时不抛异常', async () => {
      (service as any).imageServiceAvailable = true;
      mockVisualSearchService.countProductsWithoutEmbedding.mockRejectedValue(
        new Error('DB timeout'),
      );

      // 不应抛异常
      await expect(service.handleEmbeddingRecovery()).resolves.toBeUndefined();
    });
  });

  describe('triggerRecoveryOnRestore 服务恢复触发', () => {
    it('服务恢复时扫描并补齐', async () => {
      mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(
        30,
      );

      await (service as any).triggerRecoveryOnRestore();

      expect(mockEmbeddingQueue.add).toHaveBeenCalledWith(
        'batch-embedding',
        { type: 'batch', limit: 200, embeddingType: 'both' },
        expect.objectContaining({ priority: 2 }),
      );
    });

    it('无缺失时不入队', async () => {
      mockVisualSearchService.countProductsWithoutEmbedding.mockResolvedValue(
        0,
      );

      await (service as any).triggerRecoveryOnRestore();

      expect(mockEmbeddingQueue.add).not.toHaveBeenCalled();
    });

    it('恢复开关关闭时服务恢复不入队', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, fallback?: string) =>
          key === 'EMBEDDING_RECOVERY_ENABLED'
            ? 'false'
            : fallback || 'http://localhost:18001',
      );
      service = new EmbeddingHealthService(
        mockConfigService as any,
        mockEmbeddingGenerationService as any,
        mockVisualSearchService as any,
        mockEmbeddingQueue as any,
      );

      await (service as any).triggerRecoveryOnRestore();

      expect(
        mockVisualSearchService.countProductsWithoutEmbedding,
      ).not.toHaveBeenCalled();
      expect(mockEmbeddingQueue.add).not.toHaveBeenCalled();
    });
  });
});
