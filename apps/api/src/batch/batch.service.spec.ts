import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BatchService } from './batch.service';
import {
  BatchJob,
  BatchJobStatus,
  BatchJobType,
} from './entities/batch-job.entity';
import {
  BatchJobItem,
  BatchJobItemStatus,
} from './entities/batch-job-item.entity';
import { ProductsService } from '../products/products.service';
import { QUEUE_NAMES } from '../queue/queue.module';

describe('BatchService', () => {
  let service: BatchService;
  let batchJobRepo: jest.Mocked<Repository<BatchJob>>;
  let batchJobItemRepo: jest.Mocked<Repository<BatchJobItem>>;
  let batchImportQueue: { add: jest.Mock };
  let aiGenerationQueue: { add: jest.Mock };
  let productsService: jest.Mocked<ProductsService>;

  const mockBatchJob = (overrides?: Partial<BatchJob>): BatchJob =>
    ({
      id: 'job-1',
      type: BatchJobType.IMPORT,
      status: BatchJobStatus.PENDING,
      totalItems: 3,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      createdById: 'user-1',
      createdAt: new Date(),
      items: [],
      ...overrides,
    }) as BatchJob;

  const mockBatchJobItem = (overrides?: Partial<BatchJobItem>): BatchJobItem =>
    ({
      id: 'item-1',
      batchJobId: 'job-1',
      sourceUrl: 'https://weidian.com/item/123',
      status: BatchJobItemStatus.PENDING,
      createdAt: new Date(),
      ...overrides,
    }) as BatchJobItem;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        {
          provide: getRepositoryToken(BatchJob),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BatchJobItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QUEUE_NAMES.BATCH_IMPORT),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QUEUE_NAMES.AI_GENERATION),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            importFromWeidian: jest.fn(),
            createProductFromBatchItem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
    batchJobRepo = module.get(getRepositoryToken(BatchJob));
    batchJobItemRepo = module.get(getRepositoryToken(BatchJobItem));
    batchImportQueue = module.get(getQueueToken(QUEUE_NAMES.BATCH_IMPORT));
    aiGenerationQueue = module.get(getQueueToken(QUEUE_NAMES.AI_GENERATION));
    productsService = module.get(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBatchJob', () => {
    it('创建批量任务和子项', async () => {
      const urls = [
        'https://weidian.com/item/1',
        'https://weidian.com/item/2',
        'https://weidian.com/item/3',
      ];

      batchJobRepo.create.mockReturnValue(mockBatchJob());
      batchJobRepo.save.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.create.mockImplementation(
        (data) => data as BatchJobItem,
      );
      (batchJobItemRepo.save as jest.Mock).mockImplementation((items) =>
        Promise.resolve(items),
      );

      const result = await service.createBatchJob(urls, 'user-1');

      expect(batchJobRepo.create).toHaveBeenCalledWith({
        type: BatchJobType.IMPORT,
        totalItems: 3,
        createdById: 'user-1',
        status: BatchJobStatus.PENDING,
      });
      expect(batchJobItemRepo.create).toHaveBeenCalledTimes(3);
      expect(batchJobItemRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('输入 URL 去重', async () => {
      const urls = [
        'https://weidian.com/item/1',
        'https://weidian.com/item/2',
        'https://weidian.com/item/1', // 重复
        'https://weidian.com/item/3',
        'https://weidian.com/item/2', // 重复
      ];

      batchJobRepo.create.mockReturnValue(mockBatchJob());
      batchJobRepo.save.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.create.mockImplementation(
        (data) => data as BatchJobItem,
      );
      (batchJobItemRepo.save as jest.Mock).mockImplementation((items) =>
        Promise.resolve(items),
      );

      await service.createBatchJob(urls, 'user-1');

      // 5 个 URL 去重后应只有 3 个
      expect(batchJobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalItems: 3 }),
      );
      expect(batchJobItemRepo.create).toHaveBeenCalledTimes(3);
    });

    it('支持指定任务类型', async () => {
      batchJobRepo.create.mockReturnValue(
        mockBatchJob({ type: BatchJobType.IMPORT }),
      );
      batchJobRepo.save.mockResolvedValue(
        mockBatchJob({ type: BatchJobType.IMPORT }),
      );
      batchJobItemRepo.create.mockImplementation(
        (data) => data as BatchJobItem,
      );
      (batchJobItemRepo.save as jest.Mock).mockImplementation((items) =>
        Promise.resolve(items),
      );

      await service.createBatchJob(['url'], 'user-1', BatchJobType.IMPORT);

      expect(batchJobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: BatchJobType.IMPORT }),
      );
    });
  });

  describe('appendLog', () => {
    it('追加日志到 item 的 processingLog', async () => {
      const mockExecute = jest.fn().mockResolvedValue({ affected: 1 });
      const mockWhere = jest.fn().mockReturnValue({ execute: mockExecute });
      const mockSetParameter = jest.fn().mockReturnValue({ where: mockWhere });
      const mockSet = jest
        .fn()
        .mockReturnValue({ setParameter: mockSetParameter });
      const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
      batchJobItemRepo.createQueryBuilder.mockReturnValue({
        update: mockUpdate,
      } as any);

      await service.appendLog('item-1', '开始抓取', { url: 'test.com' });

      expect(batchJobItemRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(BatchJobItem);
      expect(mockWhere).toHaveBeenCalledWith('id = :id', { id: 'item-1' });
      expect(mockExecute).toHaveBeenCalled();
    });

    it('日志写入失败不抛出异常', async () => {
      batchJobItemRepo.createQueryBuilder.mockImplementation(() => {
        throw new Error('DB error');
      });

      // 不应抛出异常
      await expect(
        service.appendLog('item-1', '测试'),
      ).resolves.toBeUndefined();
    });
  });

  describe('startBatchJob', () => {
    it('启动任务并将子项添加到队列', async () => {
      const items = [
        mockBatchJobItem({ id: 'item-1', sourceUrl: 'url-1' }),
        mockBatchJobItem({ id: 'item-2', sourceUrl: 'url-2' }),
      ];

      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.find.mockResolvedValue(items);

      await service.startBatchJob('job-1');

      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        status: BatchJobStatus.PROCESSING,
      });
      expect(batchImportQueue.add).toHaveBeenCalledTimes(2);
      expect(batchImportQueue.add).toHaveBeenCalledWith('import-item', {
        jobId: 'job-1',
        itemId: 'item-1',
        sourceUrl: 'url-1',
        jobType: 'import',
      });
    });

    it('没有待处理子项时不添加队列任务', async () => {
      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.find.mockResolvedValue([]);

      await service.startBatchJob('job-1');

      expect(batchJobRepo.update).toHaveBeenCalled();
      expect(batchImportQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('retryFailedItems', () => {
    it('重试失败的子项', async () => {
      const failedItems = [
        mockBatchJobItem({ id: 'item-1', status: BatchJobItemStatus.FAILED }),
        mockBatchJobItem({ id: 'item-2', status: BatchJobItemStatus.FAILED }),
      ];

      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.find.mockResolvedValue(failedItems);

      const result = await service.retryFailedItems('job-1');

      expect(result.retried).toBe(2);
      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        status: BatchJobStatus.PROCESSING,
      });
      expect(batchJobItemRepo.update).toHaveBeenCalledTimes(2);
      expect(batchImportQueue.add).toHaveBeenCalledTimes(2);
    });

    it('没有失败子项时返回 0', async () => {
      batchJobItemRepo.find.mockResolvedValue([]);

      const result = await service.retryFailedItems('job-1');

      expect(result.retried).toBe(0);
      expect(batchJobRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('startBatchJob 防止重复启动', () => {
    it('任务已在 PROCESSING 状态时抛出 BadRequestException', async () => {
      batchJobRepo.findOne.mockResolvedValue(
        mockBatchJob({ status: BatchJobStatus.PROCESSING }),
      );

      await expect(service.startBatchJob('job-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(batchJobRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('retryStuckItems', () => {
    it('FETCHED 项目直接投入 AI 队列，PENDING 项目投入抓取队列', async () => {
      const stuckItems = [
        mockBatchJobItem({
          id: 'item-1',
          status: BatchJobItemStatus.FETCHED,
          sourceUrl: 'url-1',
        }),
        mockBatchJobItem({
          id: 'item-2',
          status: BatchJobItemStatus.PENDING,
          sourceUrl: 'url-2',
        }),
      ];

      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.find.mockResolvedValue(stuckItems);
      // appendLog 使用 createQueryBuilder
      const mockQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      batchJobItemRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.retryStuckItems('job-1');

      expect(result.retried).toBe(2);
      // FETCHED → AI queue
      expect(aiGenerationQueue.add).toHaveBeenCalledWith('generate-content', {
        jobId: 'job-1',
        itemId: 'item-1',
      });
      // PENDING → import queue
      expect(batchImportQueue.add).toHaveBeenCalledWith('import-item', {
        jobId: 'job-1',
        itemId: 'item-2',
        sourceUrl: 'url-2',
        jobType: 'import',
      });
    });

    it('没有卡住的项目时返回 0', async () => {
      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.find.mockResolvedValue([]);

      const result = await service.retryStuckItems('job-1');

      expect(result.retried).toBe(0);
      expect(batchJobRepo.update).not.toHaveBeenCalled();
    });

    it('任务不存在时抛出 NotFoundException', async () => {
      batchJobRepo.findOne.mockResolvedValue(null);

      await expect(service.retryStuckItems('job-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publishItem', () => {
    const mockSourceData = {
      title: '微店商品',
      images: ['img1.jpg'],
      detailImages: [],
      skus: [{ skuId: 'sku-1', price: 100 }],
    };

    it('成功发布子项', async () => {
      const item = mockBatchJobItem({
        status: BatchJobItemStatus.APPROVED,
        sourceData: mockSourceData,
        finalData: {
          slug: 'test-product',
          primaryCategoryId: 'cat-1',
          brandId: 'brand-1',
          title: 'Test Product',
        },
      });

      batchJobItemRepo.findOne.mockResolvedValue(item);
      productsService.createProductFromBatchItem.mockResolvedValue({
        success: true,
        product: { id: 'product-1' } as any,
      });

      const result = await service.publishItem('item-1');

      expect(result.id).toBe('product-1');
      expect(productsService.createProductFromBatchItem).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceUrl: item.sourceUrl,
          status: 'active',
        }),
      );
      expect(batchJobItemRepo.update).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          status: BatchJobItemStatus.PUBLISHED,
          productId: 'product-1',
        }),
      );
    });

    it('子项不存在时抛出 NotFoundException', async () => {
      batchJobItemRepo.findOne.mockResolvedValue(null);

      await expect(service.publishItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('子项未审核时抛出 BadRequestException', async () => {
      const item = mockBatchJobItem({ status: BatchJobItemStatus.PENDING });
      batchJobItemRepo.findOne.mockResolvedValue(item);

      await expect(service.publishItem('item-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('缺少 primaryCategoryId 时抛出 BadRequestException', async () => {
      const item = mockBatchJobItem({
        status: BatchJobItemStatus.APPROVED,
        sourceData: mockSourceData,
        aiGeneratedData: { title: 'No category' },
      });
      batchJobItemRepo.findOne.mockResolvedValue(item);

      await expect(service.publishItem('item-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('缺少 sourceData 时抛出 BadRequestException', async () => {
      const item = mockBatchJobItem({
        status: BatchJobItemStatus.APPROVED,
        sourceData: null,
        aiGeneratedData: { primaryCategoryId: 'cat-1', title: 'Test' },
      });
      batchJobItemRepo.findOne.mockResolvedValue(item);

      await expect(service.publishItem('item-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('创建失败时抛出 BadRequestException', async () => {
      const item = mockBatchJobItem({
        status: BatchJobItemStatus.APPROVED,
        sourceData: mockSourceData,
        finalData: { slug: 'test', primaryCategoryId: 'cat-1', title: 'Test' },
      });

      batchJobItemRepo.findOne.mockResolvedValue(item);
      productsService.createProductFromBatchItem.mockResolvedValue({
        success: false,
        errors: ['Creation failed'],
      });

      await expect(service.publishItem('item-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('优先使用 finalData，其次 aiGeneratedData', async () => {
      const item = mockBatchJobItem({
        status: BatchJobItemStatus.REVIEW,
        sourceData: mockSourceData,
        aiGeneratedData: {
          slug: 'ai-slug',
          primaryCategoryId: 'cat-1',
          title: 'AI Title',
        },
        finalData: undefined,
      });

      const approvedItem = { ...item, status: BatchJobItemStatus.APPROVED };
      batchJobItemRepo.findOne
        .mockResolvedValueOnce(item)
        .mockResolvedValueOnce(approvedItem)
        .mockResolvedValueOnce(approvedItem);

      productsService.createProductFromBatchItem.mockResolvedValue({
        success: true,
        product: { id: 'product-1' } as any,
      });

      await service.publishItem('item-1');

      expect(productsService.createProductFromBatchItem).toHaveBeenCalledWith(
        expect.objectContaining({
          aiData: expect.objectContaining({ slug: 'ai-slug' }),
        }),
      );
    });
  });

  describe('batchPublish', () => {
    it('批量发布成功和失败统计', async () => {
      const mockSourceData = {
        title: '微店商品',
        images: ['img1.jpg'],
        skus: [],
      };
      const items = [
        mockBatchJobItem({
          id: 'item-1',
          status: BatchJobItemStatus.APPROVED,
          sourceData: mockSourceData,
          finalData: {
            slug: 'product-1',
            primaryCategoryId: 'cat-1',
            title: 'Product 1',
          },
        }),
        mockBatchJobItem({
          id: 'item-2',
          status: BatchJobItemStatus.APPROVED,
          sourceData: mockSourceData,
          finalData: {
            slug: 'product-2',
            primaryCategoryId: 'cat-1',
            title: 'Product 2',
          },
        }),
      ];

      batchJobItemRepo.findOne
        .mockResolvedValueOnce(items[0]) // item-1: publishItem 初始读取
        .mockResolvedValueOnce(items[0]) // item-1: updateItemStatus 读取
        .mockResolvedValueOnce(items[1]) // item-2: publishItem 初始读取
        .mockResolvedValueOnce(items[1]); // item-2: updateItemStatus 读取

      productsService.createProductFromBatchItem
        .mockResolvedValueOnce({ success: true, product: { id: 'p-1' } as any })
        .mockResolvedValueOnce({ success: false, errors: ['Failed'] });

      const result = await service.batchPublish(['item-1', 'item-2']);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('updateJobProgress', () => {
    it('正确统计各状态数量并返回 statusMap', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: BatchJobItemStatus.REVIEW, count: '2' },
          { status: BatchJobItemStatus.APPROVED, count: '1' },
          { status: BatchJobItemStatus.FAILED, count: '1' },
        ]),
      };

      batchJobItemRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const statusMap = await service.updateJobProgress('job-1');

      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        processedItems: 4, // review(2) + approved(1) + failed(1)
        successItems: 3, // review(2) + approved(1)
        failedItems: 1,
        inProgressItems: 0,
      });
      expect(statusMap).toEqual({
        [BatchJobItemStatus.REVIEW]: 2,
        [BatchJobItemStatus.APPROVED]: 1,
        [BatchJobItemStatus.FAILED]: 1,
      });
    });

    it('正确统计 inProgressItems（FETCHING/FETCHED/GENERATING）', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: BatchJobItemStatus.FETCHING, count: '2' },
          { status: BatchJobItemStatus.GENERATING, count: '3' },
          { status: BatchJobItemStatus.REVIEW, count: '1' },
          { status: BatchJobItemStatus.FAILED, count: '1' },
        ]),
      };

      batchJobItemRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const statusMap = await service.updateJobProgress('job-1');

      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        processedItems: 2, // review(1) + failed(1)
        successItems: 1, // review(1)
        failedItems: 1,
        inProgressItems: 5, // fetching(2) + generating(3)
      });
      expect(statusMap).toEqual({
        [BatchJobItemStatus.FETCHING]: 2,
        [BatchJobItemStatus.GENERATING]: 3,
        [BatchJobItemStatus.REVIEW]: 1,
        [BatchJobItemStatus.FAILED]: 1,
      });
    });
  });

  describe('checkAndCompleteJob', () => {
    it('所有子项完成时标记任务为完成（传入 statusMap）', async () => {
      const statusMap = {
        [BatchJobItemStatus.REVIEW]: 2,
        [BatchJobItemStatus.PUBLISHED]: 1,
      };

      await service.checkAndCompleteJob('job-1', statusMap);

      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        status: BatchJobStatus.COMPLETED,
        completedAt: expect.any(Date),
      });
    });

    it('有失败项时标记为部分完成', async () => {
      const statusMap = {
        [BatchJobItemStatus.REVIEW]: 2,
        [BatchJobItemStatus.FAILED]: 1,
      };

      await service.checkAndCompleteJob('job-1', statusMap);

      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        status: BatchJobStatus.PARTIAL,
        completedAt: expect.any(Date),
      });
    });

    it('全部失败时标记为失败', async () => {
      const statusMap = {
        [BatchJobItemStatus.FAILED]: 3,
      };

      await service.checkAndCompleteJob('job-1', statusMap);

      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        status: BatchJobStatus.FAILED,
        completedAt: expect.any(Date),
      });
    });

    it('还有待处理项时不更新状态', async () => {
      const statusMap = {
        [BatchJobItemStatus.PENDING]: 2,
        [BatchJobItemStatus.REVIEW]: 1,
      };

      await service.checkAndCompleteJob('job-1', statusMap);

      expect(batchJobRepo.update).not.toHaveBeenCalled();
    });

    it('还有进行中项时不更新状态', async () => {
      const statusMap = {
        [BatchJobItemStatus.FETCHING]: 1,
        [BatchJobItemStatus.REVIEW]: 2,
      };

      await service.checkAndCompleteJob('job-1', statusMap);

      expect(batchJobRepo.update).not.toHaveBeenCalled();
    });

    it('无 statusMap 时自行查询（向后兼容）', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { status: BatchJobItemStatus.REVIEW, count: '3' },
          ]),
      };
      batchJobItemRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.checkAndCompleteJob('job-1');

      expect(batchJobItemRepo.createQueryBuilder).toHaveBeenCalled();
      expect(batchJobRepo.update).toHaveBeenCalledWith('job-1', {
        status: BatchJobStatus.COMPLETED,
        completedAt: expect.any(Date),
      });
    });
  });

  describe('getJobs', () => {
    it('分页获取所有任务（admin 可见全部）', async () => {
      const jobs = [mockBatchJob(), mockBatchJob({ id: 'job-2' })];
      batchJobRepo.findAndCount.mockResolvedValue([jobs, 10]);

      const result = await service.getJobs(2, 5);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(batchJobRepo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 5,
        take: 5,
      });
    });
  });

  describe('deleteJob', () => {
    it('删除存在的任务', async () => {
      const job = mockBatchJob();
      batchJobRepo.findOne.mockResolvedValue(job);

      await service.deleteJob('job-1');

      expect(batchJobRepo.remove).toHaveBeenCalledWith(job);
    });

    it('任务不存在时抛出错误', async () => {
      batchJobRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteJob('non-existent')).rejects.toThrow(
        'Job non-existent not found',
      );
    });
  });

  describe('autoRecoverStuckItems', () => {
    it('发现卡住的 items 时按 jobId 分组调用 retryStuckItems', async () => {
      const stuckItems = [
        mockBatchJobItem({
          id: 'item-1',
          batchJobId: 'job-1',
          status: BatchJobItemStatus.FETCHING,
          updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 小时前
        }),
        mockBatchJobItem({
          id: 'item-2',
          batchJobId: 'job-1',
          status: BatchJobItemStatus.GENERATING,
          updatedAt: new Date(Date.now() - 45 * 60 * 1000),
        }),
        mockBatchJobItem({
          id: 'item-3',
          batchJobId: 'job-2',
          status: BatchJobItemStatus.FETCHING,
          updatedAt: new Date(Date.now() - 35 * 60 * 1000),
        }),
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(stuckItems),
      };
      batchJobItemRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      // retryStuckItems 需要 findOne 和 find
      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.find.mockResolvedValue([]);

      await service.autoRecoverStuckItems();

      // 应该调用 createQueryBuilder 查询卡住的 items
      expect(batchJobItemRepo.createQueryBuilder).toHaveBeenCalledWith('item');
      expect(mockQb.where).toHaveBeenCalledWith(
        'item.status IN (:...statuses)',
        {
          statuses: [
            BatchJobItemStatus.FETCHING,
            BatchJobItemStatus.GENERATING,
          ],
        },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'item.updatedAt < :threshold',
        expect.objectContaining({ threshold: expect.any(Date) }),
      );
    });

    it('没有卡住的 items 时直接返回', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      batchJobItemRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.autoRecoverStuckItems();

      // 不应调用 retryStuckItems（即不应 findOne job）
      expect(batchJobRepo.findOne).not.toHaveBeenCalled();
    });

    it('单个 job 恢复失败时不影响其他 job', async () => {
      const stuckItems = [
        mockBatchJobItem({
          id: 'item-1',
          batchJobId: 'job-1',
          status: BatchJobItemStatus.FETCHING,
        }),
        mockBatchJobItem({
          id: 'item-2',
          batchJobId: 'job-2',
          status: BatchJobItemStatus.GENERATING,
        }),
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(stuckItems),
      };
      batchJobItemRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      // job-1 恢复失败，job-2 成功
      batchJobRepo.findOne
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(mockBatchJob({ id: 'job-2' }));
      batchJobItemRepo.find.mockResolvedValue([]);

      // 不应抛出异常
      await expect(service.autoRecoverStuckItems()).resolves.toBeUndefined();
    });
  });

  describe('batchDelete', () => {
    it('批量删除子项并更新任务进度', async () => {
      const items = [
        mockBatchJobItem({ id: 'item-1', batchJobId: 'job-1' }),
        mockBatchJobItem({ id: 'item-2', batchJobId: 'job-1' }),
      ];

      batchJobItemRepo.find.mockResolvedValue(items);
      batchJobRepo.findOne.mockResolvedValue(mockBatchJob());
      batchJobItemRepo.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      batchJobItemRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.batchDelete(['item-1', 'item-2']);

      expect(result.deleted).toBe(2);
      expect(batchJobItemRepo.remove).toHaveBeenCalledWith(items);
    });

    it('空数组返回删除 0', async () => {
      const result = await service.batchDelete([]);

      expect(result.deleted).toBe(0);
      expect(batchJobItemRepo.find).not.toHaveBeenCalled();
    });
  });
});
