import { PopularityScoreService } from './popularity-score.service';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductInteractionEvent } from './entities/product-interaction-event.entity';

describe('PopularityScoreService', () => {
  let service: PopularityScoreService;
  let productRepository: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    query: jest.Mock;
    manager: {
      transaction: jest.Mock;
    };
  };
  let transactionManager: { query: jest.Mock };
  let productInteractionEventRepository: {
    createQueryBuilder: jest.Mock;
    query: jest.Mock;
  };
  let interactionStatsQueryBuilder: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
  };

  const maxValues = {
    maxViewCount: 1000,
    maxSalesCount: 100,
    maxClickCount: 500,
    maxFavoriteCount: 50,
  };

  const now = new Date('2026-03-10T00:00:00Z').getTime();

  function makeProduct(
    overrides: Partial<Product> = {},
  ): Pick<
    Product,
    | 'viewCount'
    | 'salesCount'
    | 'clickCount'
    | 'favoriteCount'
    | 'ctr'
    | 'isFeatured'
    | 'createdAt'
  > {
    return {
      viewCount: 0,
      salesCount: 0,
      clickCount: 0,
      favoriteCount: 0,
      ctr: 0,
      isFeatured: false,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      ...overrides,
    };
  }

  beforeEach(() => {
    productRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      query: jest.fn().mockResolvedValue([
        {
          activeQueries: '0',
          maxAgeSeconds: '0',
        },
      ]),
      manager: {
        transaction: jest.fn((callback) => callback(transactionManager)),
      },
    };
    transactionManager = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    productInteractionEventRepository = {
      createQueryBuilder: jest.fn(),
      query: jest
        .fn()
        .mockResolvedValue([{ maxViewCount: '0', maxClickCount: '0' }]),
    };
    interactionStatsQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    productInteractionEventRepository.createQueryBuilder.mockReturnValue(
      interactionStatsQueryBuilder,
    );
    service = new PopularityScoreService(
      productRepository as unknown as Repository<Product>,
      productInteractionEventRepository as unknown as Repository<ProductInteractionEvent>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateScore', () => {
    it('全零指标返回仅包含新鲜度的分数', () => {
      const product = makeProduct();
      const score = service.calculateScore(product, maxValues, now);
      // 应该只有 freshness 分量（约 37 天前）
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.15); // freshness 权重 0.10，衰减后更低
    });

    it('高浏览量产品分数更高', () => {
      const lowView = makeProduct({ viewCount: 10 });
      const highView = makeProduct({ viewCount: 800 });

      const lowScore = service.calculateScore(lowView, maxValues, now);
      const highScore = service.calculateScore(highView, maxValues, now);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('isFeatured 产品获得额外加分', () => {
      const normal = makeProduct({ viewCount: 100 });
      const featured = makeProduct({ viewCount: 100, isFeatured: true });

      const normalScore = service.calculateScore(normal, maxValues, now);
      const featuredScore = service.calculateScore(featured, maxValues, now);

      expect(featuredScore).toBeGreaterThan(normalScore);
      expect(featuredScore - normalScore).toBeCloseTo(0.05, 2);
    });

    it('新品保护：7天内的产品额外加 0.15', () => {
      const oldProduct = makeProduct({
        createdAt: new Date('2026-02-01T00:00:00Z'),
      });
      const newProduct = makeProduct({
        createdAt: new Date('2026-03-08T00:00:00Z'), // 2 天前
      });

      const oldScore = service.calculateScore(oldProduct, maxValues, now);
      const newScore = service.calculateScore(newProduct, maxValues, now);

      // 新品应该因为新品保护和更高新鲜度而分数更高
      expect(newScore).toBeGreaterThan(oldScore);
      // 新品保护加分至少 0.15
      expect(newScore).toBeGreaterThanOrEqual(0.15);
    });

    it('外跳次数（salesCount）对分数影响大', () => {
      const noSales = makeProduct({ viewCount: 100 });
      const highSales = makeProduct({ viewCount: 100, salesCount: 80 });

      const noSalesScore = service.calculateScore(noSales, maxValues, now);
      const highSalesScore = service.calculateScore(highSales, maxValues, now);

      expect(highSalesScore).toBeGreaterThan(noSalesScore);
    });

    it('收藏数对分数有贡献', () => {
      const noFav = makeProduct({ viewCount: 100 });
      const highFav = makeProduct({ viewCount: 100, favoriteCount: 40 });

      const noFavScore = service.calculateScore(noFav, maxValues, now);
      const highFavScore = service.calculateScore(highFav, maxValues, now);

      expect(highFavScore).toBeGreaterThan(noFavScore);
    });

    it('maxValues 全为 1 时不崩溃', () => {
      const minMax = {
        maxViewCount: 1,
        maxSalesCount: 1,
        maxClickCount: 1,
        maxFavoriteCount: 1,
      };
      const product = makeProduct({ viewCount: 0 });
      const score = service.calculateScore(product, minMax, now);
      expect(typeof score).toBe('number');
      expect(isNaN(score)).toBe(false);
    });

    it('分数精度为 6 位小数', () => {
      const product = makeProduct({ viewCount: 123, salesCount: 45 });
      const score = service.calculateScore(product, maxValues, now);
      const decimals = score.toString().split('.')[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(6);
    });
  });

  describe('recalculateAll', () => {
    it('无产品时返回 updated=0', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxViewCount: '0',
          maxSalesCount: '0',
          maxClickCount: '0',
          maxFavoriteCount: '0',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);
      productRepository.find.mockResolvedValue([]);

      const result = await service.recalculateAll();

      expect(result.updated).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(
        productInteractionEventRepository.query.mock.calls[0][0],
      ).toContain('visit_sessions vs');
      expect(
        productInteractionEventRepository.query.mock.calls[0][0],
      ).toContain('vs.country IN');
    });

    it('批量计算并更新产品分数', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxViewCount: '100',
          maxSalesCount: '50',
          maxClickCount: '200',
          maxFavoriteCount: '30',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      const mockProducts = [
        {
          id: 'p1',
          viewCount: 50,
          salesCount: 10,
          clickCount: 30,
          favoriteCount: 5,
          ctr: 0.05,
          isFeatured: false,
          createdAt: new Date('2026-02-20T00:00:00Z'),
        },
        {
          id: 'p2',
          viewCount: 100,
          salesCount: 50,
          clickCount: 200,
          favoriteCount: 30,
          ctr: 0.1,
          isFeatured: true,
          createdAt: new Date('2026-03-08T00:00:00Z'),
        },
      ];

      productRepository.find
        .mockResolvedValueOnce(mockProducts as any)
        .mockResolvedValueOnce([]); // 第二批为空，结束循环

      const result = await service.recalculateAll();

      expect(result.updated).toBe(2);
      expect(productRepository.find.mock.calls[0][0]).not.toHaveProperty(
        'skip',
      );
      expect(productRepository.find.mock.calls[1][0]).not.toHaveProperty(
        'skip',
      );
      expect(productRepository.find.mock.calls[1][0].where.id).toBeDefined();
      expect(productRepository.find.mock.calls[0][0].select).toContain(
        'popularityScore',
      );
      // 验证批量更新 SQL 被调用
      expect(productRepository.manager.transaction).toHaveBeenCalledTimes(1);
      const sql = transactionManager.query.mock.calls[1][0] as string;
      expect(sql).toContain('UPDATE products');
      expect(sql).toContain("'p1'");
      expect(sql).toContain("'p2'");
      expect(transactionManager.query.mock.calls[0][0]).toContain(
        'SET LOCAL statement_timeout',
      );
      expect(interactionStatsQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('visit_sessions vs'),
        expect.objectContaining({ windowStart: expect.any(Date) }),
      );
    });

    it('featured + 新品的分数高于普通旧品', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxViewCount: '100',
          maxSalesCount: '50',
          maxClickCount: '100',
          maxFavoriteCount: '20',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-03-10T00:00:00Z').getTime());

      const oldPlain = {
        id: 'old',
        viewCount: 10,
        salesCount: 0,
        clickCount: 5,
        favoriteCount: 0,
        ctr: 0,
        isFeatured: false,
        createdAt: new Date('2025-12-01T00:00:00Z'),
      };
      const newFeatured = {
        id: 'new',
        viewCount: 10,
        salesCount: 0,
        clickCount: 5,
        favoriteCount: 0,
        ctr: 0,
        isFeatured: true,
        createdAt: new Date('2026-03-09T00:00:00Z'),
      };

      productRepository.find
        .mockResolvedValueOnce([oldPlain, newFeatured] as any)
        .mockResolvedValueOnce([]);

      await service.recalculateAll();

      const sql = transactionManager.query.mock.calls[1][0] as string;
      // 提取分数
      const oldMatch = sql.match(/WHEN 'old' THEN ([\d.]+)/);
      const newMatch = sql.match(/WHEN 'new' THEN ([\d.]+)/);
      const oldScore = parseFloat(oldMatch![1]);
      const newScore = parseFloat(newMatch![1]);

      expect(newScore).toBeGreaterThan(oldScore);
    });

    it('跳过 popularityScore 未变化的产品，避免无效写入', async () => {
      const fixedNow = new Date('2026-03-10T00:00:00Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxSalesCount: '50',
          maxFavoriteCount: '30',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      const product = {
        id: 'stable',
        viewCount: 50,
        salesCount: 10,
        clickCount: 30,
        favoriteCount: 5,
        ctr: 0.05,
        isFeatured: false,
        createdAt: new Date('2026-02-20T00:00:00Z'),
      };
      const currentScore = service.calculateScore(
        {
          ...product,
          viewCount: 0,
          clickCount: 0,
          ctr: 0,
        },
        {
          maxViewCount: 1,
          maxSalesCount: 50,
          maxClickCount: 1,
          maxFavoriteCount: 30,
        },
        fixedNow,
      );

      productRepository.find
        .mockResolvedValueOnce([
          { ...product, popularityScore: currentScore },
        ] as any)
        .mockResolvedValueOnce([]);

      const result = await service.recalculateAll();

      expect(result.updated).toBe(0);
      expect(productRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('skips recalculation when Postgres is busy', async () => {
      productRepository.query.mockResolvedValueOnce([
        {
          activeQueries: '4',
          maxAgeSeconds: '3',
        },
      ]);

      const result = await service.recalculateAll();

      expect(result.updated).toBe(0);
      expect(productRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(productRepository.find).not.toHaveBeenCalled();
      expect(productRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('循环中发现 Postgres 忙碌时提前停止并保留续跑 cursor', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxSalesCount: '1',
          maxFavoriteCount: '1',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);
      productRepository.query
        .mockResolvedValueOnce([{ activeQueries: '0', maxAgeSeconds: '0' }])
        .mockResolvedValueOnce([{ activeQueries: '4', maxAgeSeconds: '3' }]);

      for (let i = 1; i <= 10; i += 1) {
        productRepository.find.mockResolvedValueOnce([
          {
            id: `p${String(i).padStart(2, '0')}`,
            viewCount: 0,
            salesCount: 0,
            clickCount: 0,
            favoriteCount: 0,
            ctr: 0,
            isFeatured: false,
            createdAt: new Date('2026-02-20T00:00:00Z'),
            popularityScore: 0,
          },
        ] as any);
      }
      productRepository.find.mockResolvedValue([]);

      const result = await service.recalculateAll();

      expect(result.updated).toBe(10);
      expect(productRepository.query).toHaveBeenCalledTimes(2);
      expect(productRepository.find).toHaveBeenCalledTimes(10);
      expect((service as any).recalculationCursor).toBe('p10');
    });

    it('达到时间预算时提前停止', async () => {
      const baseNow = new Date('2026-03-10T00:00:00Z').getTime();
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(baseNow)
        .mockReturnValueOnce(baseNow)
        .mockReturnValueOnce(baseNow)
        .mockReturnValueOnce(baseNow)
        .mockReturnValueOnce(baseNow)
        .mockReturnValue(baseNow + 481000);

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxSalesCount: '1',
          maxFavoriteCount: '1',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);
      productRepository.find
        .mockResolvedValueOnce([
          {
            id: 'p1',
            viewCount: 0,
            salesCount: 0,
            clickCount: 0,
            favoriteCount: 0,
            ctr: 0,
            isFeatured: false,
            createdAt: new Date('2026-02-20T00:00:00Z'),
            popularityScore: 0,
          },
        ] as any)
        .mockResolvedValue([]);

      const result = await service.recalculateAll();

      expect(result.updated).toBe(1);
      expect(productRepository.find).toHaveBeenCalledTimes(1);
      expect((service as any).recalculationCursor).toBe('p1');
    });

    it('未完成的上轮任务会从 cursor 后继续，扫完后清空 cursor', async () => {
      (service as any).recalculationCursor = 'p10';
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxSalesCount: '1',
          maxFavoriteCount: '1',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);
      productRepository.find.mockResolvedValueOnce([]);

      const result = await service.recalculateAll();

      expect(result.updated).toBe(0);
      expect(productRepository.find.mock.calls[0][0].where.id).toBeDefined();
      expect((service as any).recalculationCursor).toBeUndefined();
    });

    it('skips overlapping recalculation runs', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          maxViewCount: '0',
          maxSalesCount: '0',
          maxClickCount: '0',
          maxFavoriteCount: '0',
        }),
      };
      productRepository.createQueryBuilder.mockReturnValue(mockQb as any);
      productRepository.find.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 20)),
      );

      const firstRun = service.recalculateAll();
      const secondRun = await service.recalculateAll();
      await firstRun;

      expect(secondRun.updated).toBe(0);
      expect(productRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });
});
