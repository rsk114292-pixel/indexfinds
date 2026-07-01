import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PersonalizedHotSearchService } from './personalized-hot-search.service';
import { HotSearch, HotSearchSource } from './entities/hot-search.entity';
import { SearchLog } from './entities/search-log.entity';
import { SearchAnalyticsService } from './search-analytics.service';

describe('PersonalizedHotSearchService', () => {
  let service: PersonalizedHotSearchService;
  let analyticsService: jest.Mocked<Partial<SearchAnalyticsService>>;

  const mockHotSearches: Partial<HotSearch>[] = [
    {
      id: '1',
      keyword: 'nike',
      searchCount7d: 100,
      isPinned: true,
      isBlocked: false,
      source: HotSearchSource.AUTO,
    },
    {
      id: '2',
      keyword: 'adidas',
      searchCount7d: 80,
      isPinned: false,
      isBlocked: false,
      source: HotSearchSource.AUTO,
    },
    {
      id: '3',
      keyword: 'puma',
      searchCount7d: 60,
      isPinned: false,
      isBlocked: false,
      source: HotSearchSource.AUTO,
    },
  ];

  const mockHotSearchQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockSearchLogQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockHotSearchRepo = {
    createQueryBuilder: jest.fn(() => ({ ...mockHotSearchQb })),
  };

  const mockSearchLogRepo = {
    createQueryBuilder: jest.fn(() => ({ ...mockSearchLogQb })),
  };

  beforeEach(async () => {
    analyticsService = {
      getHotSearches: jest.fn().mockResolvedValue(mockHotSearches),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalizedHotSearchService,
        {
          provide: getRepositoryToken(HotSearch),
          useValue: mockHotSearchRepo,
        },
        {
          provide: getRepositoryToken(SearchLog),
          useValue: mockSearchLogRepo,
        },
        {
          provide: SearchAnalyticsService,
          useValue: analyticsService,
        },
      ],
    }).compile();

    service = module.get<PersonalizedHotSearchService>(
      PersonalizedHotSearchService,
    );
    jest.clearAllMocks();
    // Re-setup default mock for analyticsService
    (analyticsService.getHotSearches as jest.Mock).mockResolvedValue(
      mockHotSearches,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPersonalizedHotSearches', () => {
    it('should fallback to general when no userId/sessionId', async () => {
      const result = await service.getPersonalizedHotSearches(10);

      expect(analyticsService.getHotSearches).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(3);
      expect(result[0].keyword).toBe('nike');
      expect(result[0].source).toBe('pinned');
      expect(result[1].source).toBe('general');
    });

    it('should fallback to general when no user search history', async () => {
      const logQb = {
        ...mockSearchLogQb,
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockSearchLogRepo.createQueryBuilder.mockReturnValue(logQb);

      const result = await service.getPersonalizedHotSearches(
        10,
        undefined,
        'sess_123',
      );

      expect(result).toHaveLength(3);
      // All should be pinned or general
      expect(
        result.every((r) => r.source === 'pinned' || r.source === 'general'),
      ).toBe(true);
    });

    it('should mix personal keywords when user has history', async () => {
      // User searched "bape" and "supreme" frequently
      const logQb = {
        ...mockSearchLogQb,
        getRawMany: jest.fn().mockResolvedValue([
          { keyword: 'bape', freq: '15' },
          { keyword: 'supreme', freq: '10' },
        ]),
      };
      mockSearchLogRepo.createQueryBuilder.mockReturnValue(logQb);

      // These keywords are trending in hot_searches
      const hotQb = {
        ...mockHotSearchQb,
        getMany: jest
          .fn()
          .mockResolvedValue([
            { keyword: 'bape', searchCount7d: 50, isPinned: false },
          ]),
      };
      mockHotSearchRepo.createQueryBuilder.mockReturnValue(hotQb);

      const result = await service.getPersonalizedHotSearches(
        10,
        undefined,
        'sess_123',
      );

      // Should have pinned first, then personal, then general
      expect(result[0].keyword).toBe('nike');
      expect(result[0].source).toBe('pinned');

      // Personal keyword should be included
      const personalItems = result.filter((r) => r.source === 'personal');
      expect(personalItems.length).toBeGreaterThan(0);
      expect(personalItems[0].keyword).toBe('bape');
    });

    it('should respect limit by passing it to analyticsService', async () => {
      await service.getPersonalizedHotSearches(2);
      expect(analyticsService.getHotSearches).toHaveBeenCalledWith(2);
    });

    it('should not duplicate keywords', async () => {
      // User searches for "nike" (which is already in hot searches)
      const logQb = {
        ...mockSearchLogQb,
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ keyword: 'nike', freq: '20' }]),
      };
      mockSearchLogRepo.createQueryBuilder.mockReturnValue(logQb);

      const hotQb = {
        ...mockHotSearchQb,
        getMany: jest
          .fn()
          .mockResolvedValue([
            { keyword: 'nike', searchCount7d: 100, isPinned: false },
          ]),
      };
      mockHotSearchRepo.createQueryBuilder.mockReturnValue(hotQb);

      const result = await service.getPersonalizedHotSearches(
        10,
        undefined,
        'sess_123',
      );

      const nikeItems = result.filter((r) => r.keyword === 'nike');
      expect(nikeItems.length).toBe(1); // Should not appear twice
    });
  });
});
