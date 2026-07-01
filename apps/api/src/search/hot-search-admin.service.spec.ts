import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HotSearchAdminService } from './hot-search-admin.service';
import { HotSearch, HotSearchSource } from './entities/hot-search.entity';
import { SearchLog } from './entities/search-log.entity';

describe('HotSearchAdminService', () => {
  let service: HotSearchAdminService;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'test-id', ...entity })),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({ ...mockQueryBuilder })),
  };

  const mockCacheManager = {
    del: jest.fn().mockResolvedValue(undefined),
  };
  const mockSearchLogRepository = {
    query: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotSearchAdminService,
        {
          provide: getRepositoryToken(HotSearch),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SearchLog),
          useValue: mockSearchLogRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<HotSearchAdminService>(HotSearchAdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockData = [{ id: '1', keyword: 'nike' }];
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockData, 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);
      mockSearchLogRepository.query.mockResolvedValue([
        {
          keyword: 'nike',
          rawSearchCount7d: '12',
          dedupSearchCount7d: '9',
        },
      ]);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          keyword: 'nike',
          rawSearchCount7d: 12,
          dedupSearchCount7d: 9,
          suspiciousSearchCount7d: 3,
        }),
      );
      expect(result.total).toBe(1);
    });

    it('should filter by source', async () => {
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ source: 'manual' });
      expect(qb.andWhere).toHaveBeenCalledWith('hs.source = :source', {
        source: 'manual',
      });
    });
  });

  describe('create', () => {
    it('should create a manual hot search', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        keyword: 'test keyword',
        source: HotSearchSource.MANUAL,
        isPinned: false,
      });
      mockRepository.save.mockResolvedValue({
        id: 'new-id',
        keyword: 'test keyword',
        source: HotSearchSource.MANUAL,
      });

      const result = await service.create({ keyword: 'Test Keyword' });
      expect(result.keyword).toBe('test keyword');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: HotSearchSource.MANUAL }),
      );
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });

    it('should throw ConflictException for duplicate keyword', async () => {
      mockRepository.findOne.mockResolvedValue({ id: '1', keyword: 'nike' });

      await expect(service.create({ keyword: 'nike' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should normalize keyword (lowercase, trim)', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((dto) => dto);
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve({ id: 'id', ...entity }),
      );

      await service.create({ keyword: '  Nike Shoes  ' });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { keyword: 'nike shoes' },
      });
    });
  });

  describe('update', () => {
    it('should update hot search', async () => {
      const existing = {
        id: '1',
        keyword: 'nike',
        isPinned: false,
        isBlocked: false,
        sortOrder: null,
      };
      mockRepository.findOne.mockResolvedValue({ ...existing });
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update('1', {
        isPinned: true,
        sortOrder: 1,
      });
      expect(result.isPinned).toBe(true);
      expect(result.sortOrder).toBe(1);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });

    it('should auto-unpin when blocking', async () => {
      const existing = { id: '1', isPinned: true, isBlocked: false };
      mockRepository.findOne.mockResolvedValue({ ...existing });
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update('1', { isBlocked: true });
      expect(result.isBlocked).toBe(true);
      expect(result.isPinned).toBe(false);
    });

    it('should throw NotFoundException for missing id', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.update('missing', { isPinned: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete manual hot search', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '1',
        source: HotSearchSource.MANUAL,
      });

      await service.remove('1');
      expect(mockRepository.remove).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });

    it('should reject deletion of auto hot search', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '1',
        source: HotSearchSource.AUTO,
      });

      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('togglePin', () => {
    it('should toggle isPinned from false to true', async () => {
      mockRepository.findOne.mockResolvedValue({ id: '1', isPinned: false });
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.togglePin('1');
      expect(result.isPinned).toBe(true);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });

    it('should toggle isPinned from true to false', async () => {
      mockRepository.findOne.mockResolvedValue({ id: '1', isPinned: true });
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.togglePin('1');
      expect(result.isPinned).toBe(false);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });
  });

  describe('toggleBlock', () => {
    it('should toggle isBlocked and auto-unpin', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '1',
        isBlocked: false,
        isPinned: true,
      });
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.toggleBlock('1');
      expect(result.isBlocked).toBe(true);
      expect(result.isPinned).toBe(false);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });

    it('should unblock without affecting pin status', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '1',
        isBlocked: true,
        isPinned: false,
      });
      mockRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.toggleBlock('1');
      expect(result.isBlocked).toBe(false);
      expect(result.isPinned).toBe(false);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
    });
  });
});
