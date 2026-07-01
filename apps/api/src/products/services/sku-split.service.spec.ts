import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SkuSplitService } from './sku-split.service';
import { SkuSplitAnalyzerService } from './sku-split-analyzer.service';
import { SkuSplitJobStatus } from '../entities/sku-split-job.entity';
import { SkuSplitItemStatus } from '../entities/sku-split-item.entity';
import { SkuSplitBatchStatus } from '../entities/sku-split-batch.entity';
import { SkuSplitBatchItemStatus } from '../entities/sku-split-batch-item.entity';

// Mock 依赖
const mockJobRepository = {
  create: jest.fn((data) => ({ id: 'job-uuid', ...data })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  remove: jest.fn().mockResolvedValue({}),
};

const mockItemRepository = {
  create: jest.fn((data) => ({ id: `item-${Math.random()}`, ...data })),
  save: jest.fn((entities) => Promise.resolve(entities)),
  find: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({}),
};

const mockBatchRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
};

const mockBatchItemRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn((entities) => Promise.resolve(entities)),
  update: jest.fn().mockResolvedValue({}),
};

const mockWeidianService = {
  extractItemId: jest.fn(),
  scrapeItem: jest.fn(),
};

const analyzerService = new SkuSplitAnalyzerService();

const mockDuplicateCheckService = {
  checkAll: jest.fn().mockResolvedValue({ isDuplicate: false }),
  checkByWeidianItemId: jest.fn().mockResolvedValue({ isDuplicate: false }),
  checkByVariantKey: jest.fn().mockResolvedValue({ isDuplicate: false }),
  checkByImageSimilarity: jest.fn().mockResolvedValue({ isDuplicate: false }),
  generateEmbedding: jest.fn().mockResolvedValue(null),
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
};

const mockDataSource = {
  transaction: jest.fn((cb: (manager: any) => Promise<any>) => {
    const manager = {
      create: jest.fn((_, data) => ({ id: 'job-uuid', ...data })),
      save: jest.fn((entity) =>
        Promise.resolve(Array.isArray(entity) ? entity : entity),
      ),
    };
    return cb(manager);
  }),
};

describe('SkuSplitService', () => {
  let service: SkuSplitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SkuSplitService(
      mockJobRepository as any,
      mockItemRepository as any,
      mockBatchRepository as any,
      mockBatchItemRepository as any,
      mockQueue as any,
      mockQueue as any,
      mockWeidianService as any,
      analyzerService,
      mockDuplicateCheckService as any,
      mockRedis as any,
      mockDataSource as any,
    );
  });

  describe('previewSplit', () => {
    const mockNormalizedData = {
      itemId: '12345',
      title: 'Test Product',
      images: [],
      detailImages: [],
      attributes: [
        {
          name: '颜色',
          values: [
            { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
            { id: 101, value: '白色', image: 'https://img.com/white.jpg' },
          ],
        },
        {
          name: '尺码',
          values: [
            { id: 200, value: 'S' },
            { id: 201, value: 'M' },
          ],
        },
      ],
      skus: [
        {
          attrIds: [100, 200],
          attributes: { 颜色: '黑色', 尺码: 'S' },
          skuKey: '尺码=S;颜色=黑色',
          price: 99,
          stock: 10,
        },
        {
          attrIds: [100, 201],
          attributes: { 颜色: '黑色', 尺码: 'M' },
          skuKey: '尺码=M;颜色=黑色',
          price: 99,
          stock: 5,
        },
        {
          attrIds: [101, 200],
          attributes: { 颜色: '白色', 尺码: 'S' },
          skuKey: '尺码=S;颜色=白色',
          price: 89,
          stock: 8,
        },
        {
          attrIds: [101, 201],
          attributes: { 颜色: '白色', 尺码: 'M' },
          skuKey: '尺码=M;颜色=白色',
          price: 89,
          stock: 6,
        },
      ],
    };

    it('正确返回拆分预览', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      const result = await service.previewSplit(
        'https://weidian.com/item.html?itemID=12345',
      );

      expect(result.weidianItemId).toBe('12345');
      expect(result.splitDimension).toBe('颜色');
      expect(result.totalVariants).toBe(2);
      expect(result.variants).toHaveLength(2);
      expect(result.variants[0].imageUrl).toBe('https://img.com/black.jpg');
    });

    it('纯 itemId 字符串也能识别', async () => {
      mockWeidianService.extractItemId.mockReturnValue(null);
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      const result = await service.previewSplit('12345');

      expect(result.totalVariants).toBe(2);
      expect(mockWeidianService.scrapeItem).toHaveBeenCalledWith({
        itemId: '12345',
      });
    });

    it('无效链接抛出 BadRequestException', async () => {
      mockWeidianService.extractItemId.mockReturnValue(null);

      await expect(service.previewSplit('not-a-valid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('预览中检测到重复变体时返回 duplicateInfo', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll
        .mockResolvedValueOnce({
          isDuplicate: true,
          matchType: 'visual_similarity',
          matchedProductId: 'existing-prod-1',
          matchedProductTitle: 'Nike Dunk Low Black',
          similarity: 97,
        })
        .mockResolvedValueOnce({ isDuplicate: false });

      const result = await service.previewSplit('12345');

      expect(result.duplicateCount).toBe(1);
      expect(result.variants[0].duplicateInfo).toBeDefined();
      expect(result.variants[0].duplicateInfo!.matchType).toBe(
        'visual_similarity',
      );
      expect(result.variants[0].duplicateInfo!.matchedProductId).toBe(
        'existing-prod-1',
      );
      expect(result.variants[0].duplicateInfo!.similarity).toBe(97);
      expect(result.variants[1].duplicateInfo).toBeUndefined();
    });

    it('预览中所有变体都重复时 duplicateCount 等于总数', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: true,
        matchType: 'variant_key',
        matchedProductId: 'existing-prod',
        matchedProductTitle: 'Existing Product',
      });

      const result = await service.previewSplit('12345');

      expect(result.duplicateCount).toBe(2);
      expect(result.variants.every((v) => v.duplicateInfo)).toBe(true);
    });

    it('预览中无重复时 duplicateCount 为 undefined', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: false,
      });

      const result = await service.previewSplit('12345');

      expect(result.duplicateCount).toBeUndefined();
      expect(result.variants.every((v) => !v.duplicateInfo)).toBe(true);
    });

    it('预览中去重服务传入正确的参数', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: false,
      });

      await service.previewSplit('12345');

      expect(mockDuplicateCheckService.checkAll).toHaveBeenCalledTimes(2);
      expect(mockDuplicateCheckService.checkAll).toHaveBeenCalledWith({
        splitSourceWeidianId: '12345',
        skuVariantKey: '100',
        imageUrl: 'https://img.com/black.jpg',
      });
      expect(mockDuplicateCheckService.checkAll).toHaveBeenCalledWith({
        splitSourceWeidianId: '12345',
        skuVariantKey: '101',
        imageUrl: 'https://img.com/white.jpg',
      });
    });

    it('预览时将 embedding 缓存到 Redis', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll
        .mockResolvedValueOnce({
          isDuplicate: false,
          embedding: [0.1, 0.2, 0.3],
        })
        .mockResolvedValueOnce({
          isDuplicate: false,
          embedding: [0.4, 0.5, 0.6],
        });

      await service.previewSplit('12345');

      // 两个变体的 embedding 都应缓存到 Redis
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'sku-emb:12345:100',
        JSON.stringify([0.1, 0.2, 0.3]),
        'EX',
        3600,
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'sku-emb:12345:101',
        JSON.stringify([0.4, 0.5, 0.6]),
        'EX',
        3600,
      );
    });

    it('无 embedding 返回时不缓存', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: false,
        // 无 embedding（CLIP 服务不可用时）
      });

      await service.previewSplit('12345');

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('Redis 缓存失败不影响预览结果', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: false,
        embedding: [0.1, 0.2],
      });
      mockRedis.set.mockRejectedValue(new Error('Redis connection lost'));

      const result = await service.previewSplit('12345');

      // 预览仍应正常返回
      expect(result.totalVariants).toBe(2);
    });

    it('无可拆分维度抛出 BadRequestException', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue({
        ...mockNormalizedData,
        attributes: [
          {
            name: '尺码',
            values: [
              { id: 200, value: 'S' },
              { id: 201, value: 'M' },
            ],
          },
        ],
      });

      await expect(
        service.previewSplit('https://weidian.com/item.html?itemID=12345'),
      ).rejects.toThrow('没有可拆分的款式维度');
    });

    it('使用 prefetch 缓存的数据跳过抓取', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'sku-prefetch:12345') {
          return Promise.resolve(JSON.stringify(mockNormalizedData));
        }
        return Promise.resolve(null);
      });
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: false,
      });

      const result = await service.previewSplit('12345');

      expect(result.totalVariants).toBe(2);
      // 应使用缓存数据，不调用 scrapeItem
      expect(mockWeidianService.scrapeItem).not.toHaveBeenCalled();
    });

    it('使用 prefetch 缓存的向量跳过 CLIP', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      // 无数据缓存，有向量缓存
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'sku-emb:12345:100') {
          return Promise.resolve(JSON.stringify([0.1, 0.2, 0.3]));
        }
        return Promise.resolve(null);
      });
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      mockDuplicateCheckService.checkAll.mockResolvedValue({
        isDuplicate: false,
      });

      await service.previewSplit('12345');

      // 第一个变体应传入预缓存的 embedding
      expect(mockDuplicateCheckService.checkAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skuVariantKey: '100',
          precomputedEmbedding: [0.1, 0.2, 0.3],
        }),
      );
      // 第二个变体无缓存，不传 precomputedEmbedding
      expect(mockDuplicateCheckService.checkAll).toHaveBeenCalledWith(
        expect.objectContaining({
          skuVariantKey: '101',
          precomputedEmbedding: undefined,
        }),
      );
    });
  });

  describe('prefetchUrl', () => {
    const mockNormalizedData = {
      itemId: '12345',
      title: 'Test Product',
      images: [],
      detailImages: [],
      attributes: [
        {
          name: '颜色',
          values: [
            { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
            { id: 101, value: '白色', image: 'https://img.com/white.jpg' },
          ],
        },
      ],
      skus: [
        {
          attrIds: [100],
          attributes: { 颜色: '黑色' },
          skuKey: '颜色=黑色',
          price: 99,
          stock: 10,
        },
        {
          attrIds: [101],
          attributes: { 颜色: '白色' },
          skuKey: '颜色=白色',
          price: 89,
          stock: 8,
        },
      ],
    };

    it('抓取数据并缓存到 Redis（不生成向量）', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      const result = await service.prefetchUrl('12345');

      expect(result.itemId).toBe('12345');
      expect(result.variantCount).toBe(2);
      expect(result.cached).toBe(false);
      // 不应调用任何 CLIP 相关方法
      expect(
        mockDuplicateCheckService.generateEmbedding,
      ).not.toHaveBeenCalled();
      expect(mockDuplicateCheckService.checkAll).not.toHaveBeenCalled();
      // 仅缓存微店数据
      expect(mockRedis.set).toHaveBeenCalledWith(
        'sku-prefetch:12345',
        expect.any(String),
        'EX',
        3600,
      );
    });

    it('已缓存时直接返回不重新抓取', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockRedis.get.mockResolvedValue(JSON.stringify(mockNormalizedData));

      const result = await service.prefetchUrl('12345');

      expect(result.cached).toBe(true);
      expect(result.variantCount).toBe(2);
      expect(mockWeidianService.scrapeItem).not.toHaveBeenCalled();
    });

    it('不可拆分时返回 variantCount=0', async () => {
      mockWeidianService.extractItemId.mockReturnValue('12345');
      mockRedis.get.mockResolvedValue(null);
      mockWeidianService.scrapeItem.mockResolvedValue({
        ...mockNormalizedData,
        attributes: [{ name: '尺码', values: [{ id: 200, value: 'S' }] }],
      });

      const result = await service.prefetchUrl('12345');

      expect(result.variantCount).toBe(0);
      expect(result.cached).toBe(false);
    });
  });

  describe('createSplitJob', () => {
    const mockNormalizedData = {
      itemId: '12345',
      title: 'Test Product',
      images: [],
      detailImages: [],
      attributes: [
        {
          name: '颜色',
          values: [
            { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
            { id: 101, value: '白色', image: 'https://img.com/white.jpg' },
            { id: 102, value: '红色', image: 'https://img.com/red.jpg' },
          ],
        },
      ],
      skus: [
        {
          attrIds: [100],
          attributes: { 颜色: '黑色' },
          skuKey: '颜色=黑色',
          price: 99,
          stock: 10,
        },
        {
          attrIds: [101],
          attributes: { 颜色: '白色' },
          skuKey: '颜色=白色',
          price: 89,
          stock: 8,
        },
        {
          attrIds: [102],
          attributes: { 颜色: '红色' },
          skuKey: '颜色=红色',
          price: 109,
          stock: 4,
        },
      ],
    };

    it('创建任务并加入队列', async () => {
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      const result = await service.createSplitJob('12345', 'shop-1');

      expect(result.totalVariants).toBe(3);
      expect(result.status).toBe(SkuSplitJobStatus.PENDING);
      expect(result.jobId).toBeDefined();
      expect(result.productGroupId).toBeDefined();

      // 验证使用事务
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      // 验证入队
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('selectedAttrIds 过滤变体', async () => {
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      const result = await service.createSplitJob(
        '12345',
        'shop-1',
        [100, 101], // 只选黑色和白色
      );

      expect(result.totalVariants).toBe(2);
    });

    it('非数字 weidianItemId 抛出 BadRequestException', async () => {
      await expect(
        service.createSplitJob('not-a-number', 'shop-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('selectedAttrIds 不匹配任何变体抛异常', async () => {
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      await expect(
        service.createSplitJob('12345', 'shop-1', [999]),
      ).rejects.toThrow('没有选中的变体');
    });
  });

  describe('getJobDetail', () => {
    it('任务不存在抛出 NotFoundException', async () => {
      mockJobRepository.findOne.mockResolvedValue(null);

      await expect(service.getJobDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('返回任务详情含 items', async () => {
      mockJobRepository.findOne.mockResolvedValue({
        id: 'job-1',
        status: SkuSplitJobStatus.COMPLETED,
        weidianItemId: '12345',
        weidianTitle: 'Test',
        splitDimension: '颜色',
        sourceUrl: 'https://weidian.com/item.html?itemID=12345',
        productGroupId: 'group-uuid',
        totalVariantCount: 2,
        processedCount: 2,
        successCount: 2,
        failedCount: 0,
        duplicateCount: 0,
        createdAt: new Date('2026-03-14'),
        completedAt: new Date('2026-03-14'),
      });

      mockItemRepository.find.mockResolvedValue([
        {
          id: 'item-1',
          attrId: 100,
          variantValue: '黑色',
          imageUrl: 'https://img.com/black.jpg',
          price: 99,
          skuCount: 3,
          status: SkuSplitItemStatus.SUCCESS,
          productId: 'prod-1',
          errorMessage: null,
          processingLog: [
            {
              ts: '2026-03-14T00:00:00.000Z',
              event: '发布判定完成',
              data: { productStatus: 'active' },
            },
          ],
        },
        {
          id: 'item-2',
          attrId: 101,
          variantValue: '白色',
          imageUrl: 'https://img.com/white.jpg',
          price: 89,
          skuCount: 2,
          status: SkuSplitItemStatus.FAILED,
          productId: null,
          errorMessage: '无法解析分类: AI 返回 "sets"',
          processingLog: [
            {
              ts: '2026-03-14T00:01:00.000Z',
              event: '待人工处理',
              data: {
                actionable: true,
                reasonCode: 'category_unresolved',
                suggestedAction: '补充规范分类或人工确认分类后重试',
              },
            },
          ],
        },
      ]);

      const result = await service.getJobDetail('job-1');

      expect(result.status).toBe('completed');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].status).toBe('success');
      expect(result.publishDecisionStats).toEqual({
        active: 1,
        pendingReview: 0,
      });
      expect(result.actionableFailureCount).toBe(1);
      expect(result.failureReasonStats).toEqual([
        {
          code: 'category_unresolved',
          label: '分类无法解析',
          count: 1,
          actionableCount: 1,
        },
      ]);
      expect(result.items[1]).toEqual(
        expect.objectContaining({
          actionable: true,
          failureReasonCode: 'category_unresolved',
          failureReasonLabel: '分类无法解析',
          suggestedAction: '补充规范分类或人工确认分类后重试',
        }),
      );
    });
  });

  describe('incrementJobCounter', () => {
    it('调用 repository.increment', async () => {
      await service.incrementJobCounter('job-1', 'successCount');

      expect(mockJobRepository.increment).toHaveBeenCalledWith(
        { id: 'job-1' },
        'successCount',
        1,
      );
    });
  });

  describe('retryJob', () => {
    it('重置失败 items 并重新入队', async () => {
      mockJobRepository.findOne.mockResolvedValue({
        id: 'job-1',
        status: 'failed',
        productGroupId: 'group-1',
        totalVariantCount: 3,
      });
      mockItemRepository.find.mockResolvedValue([
        { status: 'failed' },
        { status: 'failed' },
        { status: 'success' },
      ]);
      mockItemRepository.update = jest.fn().mockResolvedValue({});
      mockJobRepository.update.mockResolvedValue({});

      const result = await service.retryJob('job-1');

      expect(result.status).toBe('pending');
      // 重置失败 items
      expect(mockItemRepository.update).toHaveBeenCalledWith(
        { jobId: 'job-1', status: 'failed' },
        expect.objectContaining({ status: 'pending' }),
      );
      // 重新入队
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('同时重置 PROCESSING 状态的 items（崩溃恢复）', async () => {
      mockJobRepository.findOne.mockResolvedValue({
        id: 'job-1',
        status: 'failed',
        productGroupId: 'group-1',
        totalVariantCount: 4,
      });
      mockItemRepository.find.mockResolvedValue([
        { status: 'success' },
        { status: 'failed' },
        { status: 'processing' }, // 进程崩溃时残留的 PROCESSING 状态
        { status: 'pending' },
      ]);
      mockItemRepository.update = jest.fn().mockResolvedValue({});
      mockJobRepository.update.mockResolvedValue({});

      await service.retryJob('job-1');

      // 应同时重置 FAILED 和 PROCESSING
      expect(mockItemRepository.update).toHaveBeenCalledWith(
        { jobId: 'job-1', status: 'failed' },
        expect.objectContaining({ status: 'pending' }),
      );
      expect(mockItemRepository.update).toHaveBeenCalledWith(
        { jobId: 'job-1', status: 'processing' },
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('重试时正确设置计数器', async () => {
      mockJobRepository.findOne.mockResolvedValue({
        id: 'job-1',
        status: 'partial_failed',
        productGroupId: 'group-1',
        totalVariantCount: 5,
      });
      mockItemRepository.find.mockResolvedValue([
        { status: 'success' },
        { status: 'success' },
        { status: 'duplicate' },
        { status: 'pending' }, // 被重置后的 item
        { status: 'pending' }, // 被重置后的 item
      ]);
      mockItemRepository.update = jest.fn().mockResolvedValue({});
      mockJobRepository.update.mockResolvedValue({});

      await service.retryJob('job-1');

      expect(mockJobRepository.update).toHaveBeenCalledWith('job-1', {
        status: 'pending',
        processedCount: 3, // 2 success + 1 duplicate
        successCount: 2,
        failedCount: 0,
        duplicateCount: 1,
        completedAt: null as any,
        errorMessage: null as any,
      });
    });

    it('非失败状态抛出 BadRequestException', async () => {
      mockJobRepository.findOne.mockResolvedValue({
        id: 'job-1',
        status: 'completed',
      });

      await expect(service.retryJob('job-1')).rejects.toThrow(
        '只能重试失败或部分失败的任务',
      );
    });

    it('任务不存在抛出 NotFoundException', async () => {
      mockJobRepository.findOne.mockResolvedValue(null);

      await expect(service.retryJob('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSplitJob - 事务安全', () => {
    const mockNormalizedData = {
      itemId: '12345',
      title: 'Test Product',
      images: [],
      detailImages: [],
      attributes: [
        {
          name: '颜色',
          values: [
            { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
          ],
        },
      ],
      skus: [
        {
          attrIds: [100],
          attributes: { 颜色: '黑色' },
          skuKey: '颜色=黑色',
          price: 99,
          stock: 10,
        },
      ],
    };

    it('使用 dataSource.transaction 原子写入 job + items', async () => {
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);

      await service.createSplitJob('12345', 'shop-1');

      // 应通过事务管理器创建，而非直接用 repository
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('items 保存失败时整个事务回滚，不入队', async () => {
      mockWeidianService.scrapeItem.mockResolvedValue(mockNormalizedData);
      // 模拟事务内 items save 失败
      mockDataSource.transaction.mockImplementationOnce((cb: any) => {
        const manager = {
          create: jest.fn((_, data) => ({ id: 'job-uuid', ...data })),
          save: jest
            .fn()
            .mockResolvedValueOnce({ id: 'job-uuid' }) // job save 成功
            .mockRejectedValueOnce(new Error('DB error')), // items save 失败
        };
        return cb(manager); // 事务内异常 → 整个事务回滚
      });

      await expect(service.createSplitJob('12345', 'shop-1')).rejects.toThrow(
        'DB error',
      );

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    it('删除任务', async () => {
      const job = { id: 'job-1' };
      mockJobRepository.findOne.mockResolvedValue(job);
      mockJobRepository.remove = jest.fn().mockResolvedValue(job);

      await service.deleteJob('job-1');

      expect(mockJobRepository.remove).toHaveBeenCalledWith(job);
    });

    it('任务不存在抛出 NotFoundException', async () => {
      mockJobRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteJob('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('retryAutoBatchFailed', () => {
    it('重置失败链接并重新入队', async () => {
      mockBatchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        status: SkuSplitBatchStatus.PARTIAL_FAILED,
      });
      mockBatchItemRepository.find
        .mockResolvedValueOnce([
          {
            id: 'item-1',
            batchId: 'batch-1',
            status: SkuSplitBatchItemStatus.FAILED,
            errorMessage: '创建商品失败',
            splitJobId: 'old-job-1',
            processedAt: new Date('2026-04-16T00:00:00.000Z'),
            processingLog: [],
          },
          {
            id: 'item-2',
            batchId: 'batch-1',
            status: SkuSplitBatchItemStatus.FAILED,
            errorMessage: 'AI 无法生成可用标题',
            splitJobId: null,
            processedAt: new Date('2026-04-16T00:00:00.000Z'),
            processingLog: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'item-1',
            batchId: 'batch-1',
            status: SkuSplitBatchItemStatus.PENDING,
          },
          {
            id: 'item-2',
            batchId: 'batch-1',
            status: SkuSplitBatchItemStatus.PENDING,
          },
          {
            id: 'item-3',
            batchId: 'batch-1',
            status: SkuSplitBatchItemStatus.COMPLETED,
          },
          {
            id: 'item-4',
            batchId: 'batch-1',
            status: SkuSplitBatchItemStatus.SKIPPED,
          },
        ]);

      const result = await service.retryAutoBatchFailed('batch-1');

      expect(mockBatchItemRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'item-1',
            status: SkuSplitBatchItemStatus.PENDING,
            splitJobId: null,
            errorMessage: null,
            processedAt: null,
          }),
          expect.objectContaining({
            id: 'item-2',
            status: SkuSplitBatchItemStatus.PENDING,
          }),
        ]),
      );
      expect(mockBatchRepository.update).toHaveBeenCalledWith(
        'batch-1',
        expect.objectContaining({
          status: SkuSplitBatchStatus.PENDING,
          processedUrls: 2,
          successUrls: 1,
          failedUrls: 0,
          skippedUrls: 1,
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-auto-batch',
        { batchId: 'batch-1' },
        expect.objectContaining({
          jobId: expect.stringContaining('sku-split-batch-retry-batch-1-'),
        }),
      );
      expect(result).toEqual({
        batchId: 'batch-1',
        retryCount: 2,
        status: SkuSplitBatchStatus.PENDING,
      });
    });

    it('无失败链接时抛出 BadRequestException', async () => {
      mockBatchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        status: SkuSplitBatchStatus.COMPLETED,
      });
      mockBatchItemRepository.find.mockResolvedValue([]);

      await expect(service.retryAutoBatchFailed('batch-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('auto batch controls', () => {
    it('pauseAutoBatch 将批次置为 paused', async () => {
      mockBatchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        status: SkuSplitBatchStatus.PROCESSING,
      });

      const result = await service.pauseAutoBatch('batch-1');

      expect(mockBatchRepository.update).toHaveBeenCalledWith(
        'batch-1',
        expect.objectContaining({
          status: SkuSplitBatchStatus.PAUSED,
        }),
      );
      expect(result).toEqual({
        batchId: 'batch-1',
        status: SkuSplitBatchStatus.PAUSED,
      });
    });

    it('resumeAutoBatch 恢复批次并重新入队', async () => {
      mockBatchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        status: SkuSplitBatchStatus.PAUSED,
      });

      const result = await service.resumeAutoBatch('batch-1');

      expect(mockBatchRepository.update).toHaveBeenCalledWith(
        'batch-1',
        expect.objectContaining({
          status: SkuSplitBatchStatus.PENDING,
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-auto-batch',
        { batchId: 'batch-1' },
        expect.objectContaining({
          jobId: expect.stringContaining('sku-split-batch-resume-batch-1-'),
        }),
      );
      expect(result).toEqual({
        batchId: 'batch-1',
        status: SkuSplitBatchStatus.PENDING,
      });
    });

    it('cancelAutoBatch 取消未完成链接并更新计数', async () => {
      mockBatchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        status: SkuSplitBatchStatus.PROCESSING,
      });
      mockBatchItemRepository.find.mockResolvedValue([
        {
          id: 'item-1',
          batchId: 'batch-1',
          status: SkuSplitBatchItemStatus.PENDING,
          processingLog: [],
          processedAt: null,
        },
        {
          id: 'item-2',
          batchId: 'batch-1',
          status: SkuSplitBatchItemStatus.COMPLETED,
          processingLog: [],
          processedAt: new Date('2026-04-16T00:00:00.000Z'),
        },
        {
          id: 'item-3',
          batchId: 'batch-1',
          status: SkuSplitBatchItemStatus.SKIPPED,
          processingLog: [],
          processedAt: new Date('2026-04-16T00:00:00.000Z'),
        },
      ]);

      const result = await service.cancelAutoBatch('batch-1');

      expect(mockBatchItemRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'item-1',
            status: SkuSplitBatchItemStatus.CANCELLED,
          }),
        ]),
      );
      expect(mockBatchRepository.update).toHaveBeenCalledWith(
        'batch-1',
        expect.objectContaining({
          status: SkuSplitBatchStatus.CANCELLED,
          processedUrls: 3,
          successUrls: 1,
          skippedUrls: 1,
          cancelledUrls: 1,
        }),
      );
      expect(result).toEqual({
        batchId: 'batch-1',
        status: SkuSplitBatchStatus.CANCELLED,
      });
    });
  });

  describe('updateJobStatus', () => {
    it('完成状态自动设置 completedAt', async () => {
      await service.updateJobStatus('job-1', SkuSplitJobStatus.COMPLETED);

      const updateCall = mockJobRepository.update.mock.calls[0];
      expect(updateCall[0]).toBe('job-1');
      expect(updateCall[1].status).toBe(SkuSplitJobStatus.COMPLETED);
      expect(updateCall[1].completedAt).toBeInstanceOf(Date);
    });

    it('处理中状态不设置 completedAt', async () => {
      await service.updateJobStatus('job-1', SkuSplitJobStatus.PROCESSING);

      const updateCall = mockJobRepository.update.mock.calls[0];
      expect(updateCall[1].completedAt).toBeUndefined();
    });
  });
});
