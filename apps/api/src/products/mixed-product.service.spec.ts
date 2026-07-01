import { Test, TestingModule } from '@nestjs/testing';
import { MixedProductService } from './mixed-product.service';
import { MixedProductQueryService } from './mixed-product-query.service';
import { MixedProductSplitService } from './mixed-product-split.service';
import { MixedProductHistoryService } from './mixed-product-history.service';

describe('MixedProductService', () => {
  let service: MixedProductService;
  let queryService: any;
  let splitService: any;
  let historyService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    queryService = {
      getMixedProductsList: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
      getMixedProductDetail: jest.fn().mockResolvedValue({
        product: { id: 'p1' },
        aiAnalysis: {},
      }),
    };

    splitService = {
      generateSplitPreview: jest.fn().mockResolvedValue({
        groups: [],
        totalSkus: 0,
      }),
      executeSplit: jest.fn().mockResolvedValue({
        success: true,
        createdProducts: [],
      }),
    };

    historyService = {
      rollbackSplit: jest.fn().mockResolvedValue({
        success: true,
        restoredProductId: 'p1',
      }),
      deleteSplitHistory: jest.fn().mockResolvedValue(undefined),
      batchDeleteSplitHistory: jest.fn().mockResolvedValue({ deleted: 3 }),
      getAllSplitHistory: jest.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
      getSplitHistory: jest.fn().mockResolvedValue([]),
      getSplitHistoryDetail: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MixedProductService,
        { provide: MixedProductQueryService, useValue: queryService },
        { provide: MixedProductSplitService, useValue: splitService },
        {
          provide: MixedProductHistoryService,
          useValue: historyService,
        },
      ],
    }).compile();

    service = module.get<MixedProductService>(MixedProductService);
  });

  // ========== Query delegation ==========

  describe('getMixedProductsList', () => {
    it('should delegate to queryService', async () => {
      const options = { page: 2, limit: 10 };
      await service.getMixedProductsList(options);
      expect(queryService.getMixedProductsList).toHaveBeenCalledWith(options);
    });

    it('should pass empty options by default', async () => {
      await service.getMixedProductsList();
      expect(queryService.getMixedProductsList).toHaveBeenCalledWith({});
    });
  });

  describe('getMixedProductDetail', () => {
    it('should delegate to queryService', async () => {
      await service.getMixedProductDetail('prod-1');
      expect(queryService.getMixedProductDetail).toHaveBeenCalledWith('prod-1');
    });
  });

  // ========== Split delegation ==========

  describe('generateSplitPreview', () => {
    it('should delegate to splitService', async () => {
      await service.generateSplitPreview('prod-1');
      expect(splitService.generateSplitPreview).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('executeSplit', () => {
    it('should delegate to splitService', async () => {
      const request = { productId: 'p1', groups: [] };
      await service.executeSplit(request as any);
      expect(splitService.executeSplit).toHaveBeenCalledWith(request);
    });
  });

  // ========== History delegation ==========

  describe('rollbackSplit', () => {
    it('should delegate to historyService with all params', async () => {
      await service.rollbackSplit('hist-1', 'wrong split', 'admin-1');
      expect(historyService.rollbackSplit).toHaveBeenCalledWith(
        'hist-1',
        'wrong split',
        'admin-1',
      );
    });
  });

  describe('deleteSplitHistory', () => {
    it('委托给 historyService 删除单条记录', async () => {
      await service.deleteSplitHistory('hist-1');
      expect(historyService.deleteSplitHistory).toHaveBeenCalledWith('hist-1');
    });
  });

  describe('batchDeleteSplitHistory', () => {
    it('委托给 historyService 批量删除并返回结果', async () => {
      const result = await service.batchDeleteSplitHistory(['h1', 'h2', 'h3']);
      expect(historyService.batchDeleteSplitHistory).toHaveBeenCalledWith([
        'h1',
        'h2',
        'h3',
      ]);
      expect(result).toEqual({ deleted: 3 });
    });
  });

  describe('getAllSplitHistory', () => {
    it('should delegate to historyService', async () => {
      const options = { page: 1, limit: 50 };
      await service.getAllSplitHistory(options);
      expect(historyService.getAllSplitHistory).toHaveBeenCalledWith(options);
    });
  });

  describe('getSplitHistory', () => {
    it('should delegate to historyService', async () => {
      await service.getSplitHistory('prod-1');
      expect(historyService.getSplitHistory).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('getSplitHistoryDetail', () => {
    it('should delegate to historyService', async () => {
      await service.getSplitHistoryDetail('hist-1');
      expect(historyService.getSplitHistoryDetail).toHaveBeenCalledWith(
        'hist-1',
      );
    });
  });
});
