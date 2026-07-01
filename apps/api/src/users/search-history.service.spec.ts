import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchHistoryService } from './search-history.service';
import { UserSearchHistory } from './entities/user-search-history.entity';

describe('SearchHistoryService', () => {
  let service: SearchHistoryService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
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
        SearchHistoryService,
        {
          provide: getRepositoryToken(UserSearchHistory),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SearchHistoryService>(SearchHistoryService);
  });

  describe('recordSearch', () => {
    it('should upsert a search record', async () => {
      await service.recordSearch('user-1', 'nike shoes');

      const qb = mockRepo.createQueryBuilder();
      expect(qb.insert).toHaveBeenCalled();
      expect(qb.orUpdate).toHaveBeenCalledWith(
        ['searched_at'],
        ['user_id', 'query'],
      );
    });

    it('should skip empty queries', async () => {
      await service.recordSearch('user-1', '');
      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should skip queries over 200 chars', async () => {
      await service.recordSearch('user-1', 'a'.repeat(201));
      expect(mockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should trim whitespace', async () => {
      await service.recordSearch('user-1', '  nike  ');
      const qb = mockRepo.createQueryBuilder();
      expect(qb.values).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'nike' }),
      );
    });
  });

  describe('getHistory', () => {
    it('should return search history as string array', async () => {
      mockRepo.find.mockResolvedValue([
        { query: 'nike', searchedAt: new Date() },
        { query: 'adidas', searchedAt: new Date() },
      ]);

      const result = await service.getHistory('user-1', 10);

      expect(result.data).toEqual(['nike', 'adidas']);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-1' } },
        order: { searchedAt: 'DESC' },
        take: 10,
      });
    });

    it('should cap limit at 50', async () => {
      mockRepo.find.mockResolvedValue([]);
      await service.getHistory('user-1', 999);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('removeItem', () => {
    it('should delete specific query for user', async () => {
      await service.removeItem('user-1', 'nike');
      expect(mockRepo.delete).toHaveBeenCalledWith({
        user: { id: 'user-1' },
        query: 'nike',
      });
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
      const result = await service.bulkSync('user-1', ['nike', 'adidas']);
      expect(result.synced).toBe(2);
    });

    it('should return 0 for empty items', async () => {
      const result = await service.bulkSync('user-1', []);
      expect(result.synced).toBe(0);
    });

    it('should skip invalid entries', async () => {
      const result = await service.bulkSync('user-1', [
        'valid',
        '',
        'a'.repeat(201),
      ]);
      expect(result.synced).toBe(1);
    });
  });
});
