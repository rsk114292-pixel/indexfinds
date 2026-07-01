import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { CacheRefreshService } from './cache-refresh.service';
import { WeidianCache } from '../products/entities/weidian-cache.entity';
import { Product } from '../products/entities/product.entity';
import { QUEUE_NAMES } from '../queue/queue.module';

describe('CacheRefreshService', () => {
  let service: CacheRefreshService;
  let cacheRefreshQueue: { add: jest.Mock; addBulk: jest.Mock };
  let productRepository: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let cacheRepository: { findOne: jest.Mock };
  let mockQueryBuilder: {
    innerJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    getMany: jest.Mock;
    getCount: jest.Mock;
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    cacheRefreshQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      addBulk: jest.fn().mockResolvedValue([]),
    };
    productRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    };
    cacheRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheRefreshService,
        {
          provide: getQueueToken(QUEUE_NAMES.CACHE_REFRESH),
          useValue: cacheRefreshQueue,
        },
        {
          provide: getRepositoryToken(WeidianCache),
          useValue: cacheRepository,
        },
        { provide: getRepositoryToken(Product), useValue: productRepository },
      ],
    }).compile();

    await module.init(); // 触发 onModuleInit
    cacheRefreshQueue.add.mockClear(); // 清除 weekly-scan 的初始化调用

    service = module.get<CacheRefreshService>(CacheRefreshService);
  });

  describe('manualRefreshScan — jobId 去重', () => {
    const staleProducts = [
      { id: 'prod-1', weidianItemId: 'item-111' },
      { id: 'prod-2', weidianItemId: 'item-222' },
    ];

    beforeEach(() => {
      mockQueryBuilder.getMany.mockResolvedValue(staleProducts);
    });

    it('使用 addBulk 批量入队，jobId 格式为 refresh-{itemId}，不含时间戳', async () => {
      await service.manualRefreshScan();

      // addBulk 应被调用，add 不应被用于 refresh 任务
      expect(cacheRefreshQueue.addBulk).toHaveBeenCalled();

      // 取出所有批次中的 jobs（每次 addBulk 调用的第一个参数是 jobs 数组）
      const allJobs = cacheRefreshQueue.addBulk.mock.calls.flatMap(
        (call) => call[0] as Array<{ name: string; opts: { jobId: string } }>,
      );

      expect(allJobs).toHaveLength(staleProducts.length);

      for (const job of allJobs) {
        expect(job.opts.jobId).toMatch(/^refresh-/);
        // 不含 10 位以上连续数字（时间戳特征）
        expect(job.opts.jobId).not.toMatch(/\d{10,}/);
      }
    });

    it('连续两次调用，同一产品的 jobId 完全相同', async () => {
      await service.manualRefreshScan();
      const firstIds = cacheRefreshQueue.addBulk.mock.calls
        .flatMap((call) => call[0] as Array<{ opts: { jobId: string } }>)
        .map((job) => job.opts.jobId);

      cacheRefreshQueue.addBulk.mockClear();

      await service.manualRefreshScan();
      const secondIds = cacheRefreshQueue.addBulk.mock.calls
        .flatMap((call) => call[0] as Array<{ opts: { jobId: string } }>)
        .map((job) => job.opts.jobId);

      expect(firstIds).toEqual(secondIds);
    });

    it('入队任务包含 removeOnFail 选项', async () => {
      await service.manualRefreshScan();

      const allJobs = cacheRefreshQueue.addBulk.mock.calls.flatMap(
        (call) => call[0] as Array<{ opts: { removeOnFail?: unknown } }>,
      );

      for (const job of allJobs) {
        expect(job.opts.removeOnFail).toBeDefined();
      }
    });
  });

  describe('manualRefreshScan — 拆分产品过滤', () => {
    it('查询条件包含 isFromSplit = false，排除拆分产品', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.manualRefreshScan();

      const andWhereCalls: string[] = mockQueryBuilder.andWhere.mock.calls.map(
        (call: [string, ...unknown[]]) => call[0],
      );

      expect(andWhereCalls.some((cond) => cond.includes('isFromSplit'))).toBe(
        true,
      );
    });
  });
});
