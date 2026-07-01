import { SkuSplitBatchProcessor } from './sku-split-batch.processor';
import { SkuSplitBatchStatus } from '../../products/entities/sku-split-batch.entity';
import { SkuSplitBatchItemStatus } from '../../products/entities/sku-split-batch-item.entity';
import { SkuSplitJobStatus } from '../../products/entities/sku-split-job.entity';

const mockBatchRepository = {
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
};

const mockBatchItemRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockResolvedValue({}),
};

const mockSplitJobRepository = {
  findOne: jest.fn(),
};

const mockSkuSplitService = {
  previewSplit: jest.fn(),
  createSplitJob: jest.fn(),
};

describe('SkuSplitBatchProcessor', () => {
  let processor: SkuSplitBatchProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new SkuSplitBatchProcessor(
      mockBatchRepository as any,
      mockBatchItemRepository as any,
      mockSplitJobRepository as any,
      mockSkuSplitService as any,
    );
  });

  it('全部重复时标记链接为 skipped', async () => {
    const batch = {
      id: 'batch-1',
      totalUrls: 1,
      status: SkuSplitBatchStatus.PENDING,
    };
    const item = {
      id: 'item-1',
      batchId: 'batch-1',
      sourceUrl: '7712370033',
      status: SkuSplitBatchItemStatus.PENDING,
      processingLog: [],
      selectedCount: 0,
    };

    mockBatchRepository.findOne.mockResolvedValue(batch);
    mockBatchItemRepository.find
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([
        { ...item, status: SkuSplitBatchItemStatus.SKIPPED },
      ]);
    mockBatchItemRepository.findOne.mockResolvedValue(item);
    mockSkuSplitService.previewSplit.mockResolvedValue({
      weidianItemId: '7712370033',
      totalVariants: 2,
      variants: [
        { attrId: 1, duplicateInfo: { matchType: 'weidian_id' } },
        { attrId: 2, duplicateInfo: { matchType: 'weidian_id' } },
      ],
    });

    await processor.process({
      data: { batchId: 'batch-1' },
    } as any);

    expect(mockSkuSplitService.createSplitJob).not.toHaveBeenCalled();
    expect(mockBatchRepository.update).toHaveBeenCalledWith(
      'batch-1',
      expect.objectContaining({
        status: SkuSplitBatchStatus.COMPLETED,
        processedUrls: 1,
        skippedUrls: 1,
      }),
    );
  });

  it('创建子任务并等待完成后标记成功', async () => {
    const batch = {
      id: 'batch-1',
      totalUrls: 1,
      status: SkuSplitBatchStatus.PENDING,
    };
    const item = {
      id: 'item-1',
      batchId: 'batch-1',
      sourceUrl: '7712370033',
      status: SkuSplitBatchItemStatus.PENDING,
      processingLog: [],
      selectedCount: 0,
    };

    mockBatchRepository.findOne.mockResolvedValue(batch);
    mockBatchItemRepository.find
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([
        { ...item, status: SkuSplitBatchItemStatus.COMPLETED },
      ]);
    mockBatchItemRepository.findOne.mockResolvedValue(item);
    mockSkuSplitService.previewSplit.mockResolvedValue({
      weidianItemId: '7712370033',
      totalVariants: 2,
      variants: [{ attrId: 1 }, { attrId: 2 }],
    });
    mockSkuSplitService.createSplitJob.mockResolvedValue({
      jobId: 'split-job-1',
    });
    mockSplitJobRepository.findOne.mockResolvedValue({
      id: 'split-job-1',
      status: SkuSplitJobStatus.COMPLETED,
    });

    await processor.process({
      data: { batchId: 'batch-1' },
    } as any);

    expect(mockSkuSplitService.createSplitJob).toHaveBeenCalledWith(
      '7712370033',
      undefined,
      [1, 2],
      undefined,
      'batch-1',
    );
    expect(mockBatchRepository.update).toHaveBeenCalledWith(
      'batch-1',
      expect.objectContaining({
        status: SkuSplitBatchStatus.COMPLETED,
        processedUrls: 1,
        successUrls: 1,
      }),
    );
  });

  it('已暂停批次不进入处理', async () => {
    mockBatchRepository.findOne.mockResolvedValue({
      id: 'batch-1',
      totalUrls: 1,
      status: SkuSplitBatchStatus.PAUSED,
    });

    await processor.process({
      data: { batchId: 'batch-1' },
    } as any);

    expect(mockBatchRepository.update).not.toHaveBeenCalled();
    expect(mockSkuSplitService.previewSplit).not.toHaveBeenCalled();
  });

  it('取消状态下计入 cancelledUrls', async () => {
    const batch = {
      id: 'batch-1',
      totalUrls: 2,
      status: SkuSplitBatchStatus.CANCELLED,
      completedAt: null,
    };

    mockBatchRepository.findOne.mockResolvedValue(batch);
    mockBatchItemRepository.find.mockResolvedValue([
      {
        id: 'item-1',
        batchId: 'batch-1',
        status: 'cancelled',
      },
      {
        id: 'item-2',
        batchId: 'batch-1',
        status: SkuSplitBatchItemStatus.COMPLETED,
      },
    ]);

    await (processor as any).refreshBatchProgress('batch-1');

    expect(mockBatchRepository.update).toHaveBeenLastCalledWith(
      'batch-1',
      expect.objectContaining({
        status: SkuSplitBatchStatus.CANCELLED,
        processedUrls: 2,
        successUrls: 1,
        cancelledUrls: 1,
      }),
    );
  });
});
