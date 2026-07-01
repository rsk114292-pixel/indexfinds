import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BrowsingHistoryService } from './browsing-history.service';
import { UserBrowsingHistory } from './entities/user-browsing-history.entity';

describe('BrowsingHistoryService', () => {
  let service: BrowsingHistoryService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orUpdate: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrowsingHistoryService,
        {
          provide: getRepositoryToken(UserBrowsingHistory),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<BrowsingHistoryService>(BrowsingHistoryService);
  });

  describe('recordView', () => {
    it('should upsert a browsing record', async () => {
      await service.recordView('user-1', {
        productId: 'prod-1',
        brandId: 'brand-1',
        categoryId: 'cat-1',
      });

      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
      const qb = mockRepo.createQueryBuilder();
      expect(qb.insert).toHaveBeenCalled();
      expect(qb.orUpdate).toHaveBeenCalledWith(
        ['viewed_at', 'brand_id', 'category_id'],
        ['user_id', 'product_id'],
      );
    });

    it('should no-op when product does not exist', async () => {
      const qb = mockRepo.createQueryBuilder();
      qb.execute.mockRejectedValueOnce({ driverError: { code: '23503' } });

      await expect(
        service.recordView('user-1', {
          productId: 'missing-prod',
          brandId: 'brand-1',
        }),
      ).resolves.toBeUndefined();

      expect(mockRepo.count).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should return browsing history sorted by viewedAt DESC', async () => {
      const mockRecords = [
        {
          id: '1',
          product: { id: 'prod-1' },
          brandId: 'brand-1',
          categoryId: 'cat-1',
          viewedAt: new Date('2026-01-01'),
        },
        {
          id: '2',
          product: { id: 'prod-2' },
          brandId: null,
          categoryId: null,
          viewedAt: new Date('2026-01-02'),
        },
      ];
      mockRepo.find.mockResolvedValue(mockRecords);

      const result = await service.getHistory('user-1', 50);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].productId).toBe('prod-1');
      expect(result.data[1].productId).toBe('prod-2');
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-1' } },
        order: { viewedAt: 'DESC' },
        take: 50,
        relations: ['product'],
      });
    });

    it('should filter out records with deleted products', async () => {
      mockRepo.find.mockResolvedValue([
        {
          id: '1',
          product: { id: 'prod-1' },
          brandId: null,
          categoryId: null,
          viewedAt: new Date(),
        },
        {
          id: '2',
          product: null,
          brandId: null,
          categoryId: null,
          viewedAt: new Date(),
        },
      ]);

      const result = await service.getHistory('user-1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].productId).toBe('prod-1');
    });

    it('should cap limit at 100', async () => {
      mockRepo.find.mockResolvedValue([]);
      await service.getHistory('user-1', 500);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('clearHistory', () => {
    it('should delete all records for user', async () => {
      await service.clearHistory('user-1');
      expect(mockRepo.delete).toHaveBeenCalledWith({ user: { id: 'user-1' } });
    });
  });

  describe('bulkSync', () => {
    it('should sync items and return count', async () => {
      const result = await service.bulkSync('user-1', {
        items: [
          { productId: 'p1', viewedAt: Date.now() },
          { productId: 'p2', viewedAt: Date.now() },
        ],
      });

      expect(result.synced).toBe(2);
    });

    it('should return 0 for empty items', async () => {
      const result = await service.bulkSync('user-1', { items: [] });
      expect(result.synced).toBe(0);
    });
  });
});
