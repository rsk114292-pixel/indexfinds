import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  BatchImportProcessor,
  BatchImportJobData,
} from './batch-import.processor';
import { BatchService } from '../../batch/batch.service';
import { BatchJobItemStatus } from '../../batch/entities/batch-job-item.entity';
import { BatchJobType } from '../../batch/entities/batch-job.entity';
import { WeidianService } from '../../weidian/weidian.service';
import { ProductsService } from '../../products/products.service';
import { UnifiedDuplicateCheckService } from '../../products/services/unified-duplicate-check.service';
import { QUEUE_NAMES } from '../queue.module';

describe('BatchImportProcessor', () => {
  let processor: BatchImportProcessor;
  let batchService: Record<string, jest.Mock>;
  let weidianService: Record<string, jest.Mock>;
  let productsService: Record<string, jest.Mock>;
  let duplicateCheckService: Record<string, jest.Mock>;
  let aiGenerationQueue: { add: jest.Mock };

  const mockProductData = {
    title: 'Test Product',
    mainImage: 'https://img.weidian.com/main.jpg',
    images: ['https://img.weidian.com/1.jpg', 'https://img.weidian.com/2.jpg'],
    skus: [{ price: 99 }],
  };

  const mockJob = (overrides?: Partial<BatchImportJobData>) =>
    ({
      data: {
        jobId: 'job-1',
        itemId: 'item-1',
        sourceUrl: 'https://weidian.com/item.html?itemID=123456',
        ...overrides,
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    }) as unknown as Job<BatchImportJobData>;

  beforeEach(async () => {
    batchService = {
      getItem: jest.fn().mockResolvedValue({
        id: 'item-1',
        status: BatchJobItemStatus.PENDING,
      }),
      appendLog: jest.fn().mockResolvedValue(undefined),
      updateItemStatus: jest.fn().mockResolvedValue(undefined),
      saveRawData: jest.fn().mockResolvedValue(undefined),
      saveAiGeneratedData: jest.fn().mockResolvedValue(undefined),
      updateJobProgress: jest.fn().mockResolvedValue({}),
      checkAndCompleteJob: jest.fn().mockResolvedValue(undefined),
    };

    weidianService = {
      extractItemId: jest.fn().mockReturnValue('123456'),
      scrapeItem: jest.fn().mockResolvedValue(mockProductData),
    };

    productsService = {
      findByWeidianItemId: jest.fn().mockResolvedValue(null),
    };

    duplicateCheckService = {
      checkByWeidianItemId: jest.fn().mockResolvedValue({ isDuplicate: false }),
      checkByImageSimilarity: jest
        .fn()
        .mockResolvedValue({ isDuplicate: false }),
      checkByVariantKey: jest.fn().mockResolvedValue({ isDuplicate: false }),
      checkAll: jest.fn().mockResolvedValue({ isDuplicate: false }),
    };

    aiGenerationQueue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchImportProcessor,
        { provide: BatchService, useValue: batchService },
        { provide: WeidianService, useValue: weidianService },
        { provide: ProductsService, useValue: productsService },
        {
          provide: UnifiedDuplicateCheckService,
          useValue: duplicateCheckService,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.AI_GENERATION),
          useValue: aiGenerationQueue,
        },
      ],
    }).compile();

    processor = module.get<BatchImportProcessor>(BatchImportProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  describe('视觉去重', () => {
    it('无重复时正常进入 AI 队列', async () => {
      await processor.process(mockJob());

      expect(duplicateCheckService.checkByImageSimilarity).toHaveBeenCalledWith(
        mockProductData.mainImage,
      );
      expect(aiGenerationQueue.add).toHaveBeenCalledWith('generate-content', {
        jobId: 'job-1',
        itemId: 'item-1',
      });
    });

    it('无重复时缓存 embedding 到 aiGeneratedData', async () => {
      duplicateCheckService.checkByImageSimilarity.mockResolvedValue({
        isDuplicate: false,
        embedding: [0.1, 0.2, 0.3],
      });

      await processor.process(mockJob());

      expect(batchService.saveAiGeneratedData).toHaveBeenCalledWith('item-1', {
        mainImageEmbedding: [0.1, 0.2, 0.3],
      });
    });

    it('视觉服务无 embedding 时不缓存', async () => {
      duplicateCheckService.checkByImageSimilarity.mockResolvedValue({
        isDuplicate: false,
        // no embedding returned (service was unavailable)
      });

      await processor.process(mockJob());

      // saveAiGeneratedData 不应被调用（无 embedding 可缓存）
      expect(batchService.saveAiGeneratedData).not.toHaveBeenCalled();
    });

    it('检测到重复时跳过 AI，标记 REVIEW', async () => {
      duplicateCheckService.checkByImageSimilarity.mockResolvedValue({
        isDuplicate: true,
        matchType: 'visual_similarity',
        matchedProductId: 'existing-product-id',
        matchedProductTitle: 'Existing Product',
        matchedProductImage: 'https://img.weidian.com/existing.jpg',
        similarity: 95,
      });

      await processor.process(mockJob());

      expect(aiGenerationQueue.add).not.toHaveBeenCalled();

      expect(batchService.saveAiGeneratedData).toHaveBeenCalledWith('item-1', {
        duplicateOf: {
          productId: 'existing-product-id',
          title: 'Existing Product',
          mainImage: 'https://img.weidian.com/existing.jpg',
          similarity: 95,
        },
      });

      expect(batchService.updateItemStatus).toHaveBeenCalledWith(
        'item-1',
        BatchJobItemStatus.REVIEW,
      );
    });

    it('去重服务返回非重复时继续正常流程', async () => {
      duplicateCheckService.checkByImageSimilarity.mockResolvedValue({
        isDuplicate: false,
      });

      await processor.process(mockJob());

      expect(aiGenerationQueue.add).toHaveBeenCalled();
    });

    it('UPDATE 模式跳过去重', async () => {
      await processor.process(mockJob({ jobType: BatchJobType.UPDATE }));

      expect(
        duplicateCheckService.checkByImageSimilarity,
      ).not.toHaveBeenCalled();
      expect(aiGenerationQueue.add).toHaveBeenCalled();
    });

    it('无 mainImage 时跳过视觉去重', async () => {
      weidianService.scrapeItem.mockResolvedValue({
        ...mockProductData,
        mainImage: null,
      });

      await processor.process(mockJob());

      expect(
        duplicateCheckService.checkByImageSimilarity,
      ).not.toHaveBeenCalled();
      expect(aiGenerationQueue.add).toHaveBeenCalled();
    });
  });

  describe('基本流程', () => {
    it('weidianItemId 重复时直接 SKIPPED', async () => {
      duplicateCheckService.checkByWeidianItemId.mockResolvedValue({
        isDuplicate: true,
        matchType: 'weidian_id',
        matchedProductId: 'existing-id',
      });

      await processor.process(mockJob());

      expect(batchService.updateItemStatus).toHaveBeenCalledWith(
        'item-1',
        BatchJobItemStatus.SKIPPED,
        { errorMessage: 'Duplicate product detected' },
      );
      expect(weidianService.scrapeItem).not.toHaveBeenCalled();
    });

    it('无效 itemId 直接返回', async () => {
      await processor.process(mockJob({ itemId: 'undefined' }));

      expect(batchService.getItem).not.toHaveBeenCalled();
    });

    it('终态 item 跳过处理', async () => {
      batchService.getItem.mockResolvedValue({
        id: 'item-1',
        status: BatchJobItemStatus.PUBLISHED,
      });

      await processor.process(mockJob());

      expect(weidianService.extractItemId).not.toHaveBeenCalled();
    });
  });
});
