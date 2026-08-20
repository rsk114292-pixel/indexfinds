import { SkuSplitController } from './sku-split.controller';
import { ProductStatus } from './product-status';

const mockSkuSplitService = {
  prefetchUrl: jest.fn(),
  previewSplit: jest.fn(),
  createSplitJob: jest.fn(),
  createAutoBatch: jest.fn(),
  listEntries: jest.fn(),
  getBatchJobs: jest.fn(),
  getAutoBatchDetail: jest.fn(),
  retryAutoBatchFailed: jest.fn(),
  pauseAutoBatch: jest.fn(),
  resumeAutoBatch: jest.fn(),
  cancelAutoBatch: jest.fn(),
  getJobDetail: jest.fn(),
  retryJob: jest.fn(),
  deleteJob: jest.fn(),
};

const mockProductRepository = {
  manager: {
    query: jest.fn(),
  },
};

describe('SkuSplitController', () => {
  let controller: SkuSplitController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SkuSplitController(
      mockSkuSplitService as any,
      mockProductRepository as any,
    );
  });

  describe('getSiblings', () => {
    it('有 productGroupId 时查询同组 ACTIVE 产品', async () => {
      const mockSiblings = [
        {
          id: '1',
          slug: 'nike-aj4-black',
          title: 'AJ4 Black',
          mainImage: 'img1.jpg',
          skuVariantKey: '100',
          priceMin: 99,
        },
      ];
      mockProductRepository.manager.query.mockResolvedValue(mockSiblings);

      const result = await controller.getSiblings('group-uuid');

      expect(result).toHaveLength(1);
      expect(mockProductRepository.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('split_item."variantValue"'),
        ['group-uuid', ProductStatus.ACTIVE],
      );
    });

    it('无 productGroupId 返回空数组', async () => {
      const result = await controller.getSiblings('');
      expect(result).toEqual([]);
      expect(mockProductRepository.manager.query).not.toHaveBeenCalled();
    });

    it('undefined productGroupId 返回空数组', async () => {
      const result = await controller.getSiblings(undefined as any);
      expect(result).toEqual([]);
      expect(mockProductRepository.manager.query).not.toHaveBeenCalled();
    });
  });

  describe('prefetch', () => {
    it('转发到 skuSplitService.prefetchUrl', async () => {
      mockSkuSplitService.prefetchUrl.mockResolvedValue({
        itemId: '123',
        variantCount: 3,
        cached: false,
      });

      const result = await controller.prefetch({ weidianUrl: '123' });

      expect(mockSkuSplitService.prefetchUrl).toHaveBeenCalledWith('123');
      expect(result.variantCount).toBe(3);
    });
  });

  describe('preview', () => {
    it('转发到 skuSplitService.previewSplit', async () => {
      await controller.preview({
        weidianUrl: 'https://weidian.com/item.html?itemID=123',
      });
      expect(mockSkuSplitService.previewSplit).toHaveBeenCalledWith(
        'https://weidian.com/item.html?itemID=123',
      );
    });
  });

  describe('execute', () => {
    it('传透 batchId 到 createSplitJob', async () => {
      await controller.execute({
        weidianItemId: '123',
        shopId: 'shop-1',
        selectedAttrIds: [100, 101],
        batchId: 'batch-uuid',
      });
      expect(mockSkuSplitService.createSplitJob).toHaveBeenCalledWith(
        '123',
        'shop-1',
        [100, 101],
        undefined,
        'batch-uuid',
      );
    });

    it('无 batchId 时传 undefined', async () => {
      await controller.execute({
        weidianItemId: '123',
      });
      expect(mockSkuSplitService.createSplitJob).toHaveBeenCalledWith(
        '123',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('createAutoBatch', () => {
    it('转发到 skuSplitService.createAutoBatch', async () => {
      await controller.createAutoBatch({
        weidianUrls: ['7712370033', '7715377988'],
      });

      expect(mockSkuSplitService.createAutoBatch).toHaveBeenCalledWith([
        '7712370033',
        '7715377988',
      ]);
    });
  });

  describe('list', () => {
    it('默认 page=1 pageSize=20', async () => {
      await controller.list(undefined, undefined);
      expect(mockSkuSplitService.listEntries).toHaveBeenCalledWith(1, 20);
    });

    it('自定义分页', async () => {
      await controller.list(2, 50);
      expect(mockSkuSplitService.listEntries).toHaveBeenCalledWith(2, 50);
    });

    it('pageSize 超过 100 时截断', async () => {
      await controller.list(1, 9999);
      expect(mockSkuSplitService.listEntries).toHaveBeenCalledWith(1, 100);
    });
  });

  describe('getBatchDetail', () => {
    it('转发到 skuSplitService.getBatchJobs', async () => {
      await controller.getBatchDetail('batch-uuid');
      expect(mockSkuSplitService.getBatchJobs).toHaveBeenCalledWith(
        'batch-uuid',
      );
    });
  });

  describe('getAutoBatchDetail', () => {
    it('转发到 skuSplitService.getAutoBatchDetail', async () => {
      await controller.getAutoBatchDetail('batch-uuid');
      expect(mockSkuSplitService.getAutoBatchDetail).toHaveBeenCalledWith(
        'batch-uuid',
      );
    });
  });

  describe('retryAutoBatchFailed', () => {
    it('转发到 skuSplitService.retryAutoBatchFailed', async () => {
      await controller.retryAutoBatchFailed('batch-uuid');
      expect(mockSkuSplitService.retryAutoBatchFailed).toHaveBeenCalledWith(
        'batch-uuid',
      );
    });
  });

  describe('auto batch controls', () => {
    it('转发到 pauseAutoBatch', async () => {
      await controller.pauseAutoBatch('batch-uuid');
      expect(mockSkuSplitService.pauseAutoBatch).toHaveBeenCalledWith(
        'batch-uuid',
      );
    });

    it('转发到 resumeAutoBatch', async () => {
      await controller.resumeAutoBatch('batch-uuid');
      expect(mockSkuSplitService.resumeAutoBatch).toHaveBeenCalledWith(
        'batch-uuid',
      );
    });

    it('转发到 cancelAutoBatch', async () => {
      await controller.cancelAutoBatch('batch-uuid');
      expect(mockSkuSplitService.cancelAutoBatch).toHaveBeenCalledWith(
        'batch-uuid',
      );
    });
  });
});
