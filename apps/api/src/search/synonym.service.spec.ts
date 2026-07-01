import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SynonymService } from './synonym.service';
import { SynonymGroup } from './entities/synonym-group.entity';

describe('SynonymService', () => {
  let service: SynonymService;

  const mockSynonymGroups: Partial<SynonymGroup>[] = [
    {
      id: '1',
      name: 'sneakers/trainers',
      canonicalTerm: 'sneakers',
      synonyms: ['trainers', 'kicks', 'tennis shoes'],
      category: 'locale',
      isActive: true,
    },
    {
      id: '2',
      name: 't-shirt variants',
      canonicalTerm: 't-shirt',
      synonyms: ['tee', 'tshirt'],
      category: 'general',
      isActive: true,
    },
  ];

  const mockRepository = {
    find: jest.fn().mockResolvedValue(mockSynonymGroups),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'new-id', ...entity })),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockSynonymGroups, 2]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynonymService,
        {
          provide: getRepositoryToken(SynonymGroup),
          useValue: mockRepository,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SynonymService>(SynonymService);

    // 手动调用 onModuleInit 加载同义词
    await service.onModuleInit();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('expandQuery', () => {
    it('should expand "trainers" to include "sneakers"', () => {
      const result = service.expandQuery('trainers');
      expect(result).toContain('sneakers');
      expect(result).toContain('trainers');
      expect(result).toContain('kicks');
    });

    it('should expand "sneakers" to include all synonyms', () => {
      const result = service.expandQuery('sneakers');
      expect(result).toContain('trainers');
      expect(result).toContain('tennis shoes');
    });

    it('should return original term if no synonyms found', () => {
      const result = service.expandQuery('unknown-term');
      expect(result).toEqual(['unknown-term']);
    });

    it('should be case-insensitive', () => {
      const result = service.expandQuery('TRAINERS');
      expect(result).toContain('sneakers');
    });

    it('should handle terms with whitespace', () => {
      const result = service.expandQuery('  trainers  ');
      expect(result).toContain('sneakers');
    });

    it('should expand "tee" to include "t-shirt"', () => {
      const result = service.expandQuery('tee');
      expect(result).toContain('t-shirt');
      expect(result).toContain('tshirt');
    });
  });

  describe('expandTerms', () => {
    it('should expand multiple terms', () => {
      const result = service.expandTerms(['trainers', 'tee']);
      expect(result).toContain('sneakers');
      expect(result).toContain('t-shirt');
    });

    it('should deduplicate results', () => {
      const result = service.expandTerms(['trainers', 'sneakers']);
      const sneakersCount = result.filter((t) => t === 'sneakers').length;
      expect(sneakersCount).toBe(1);
    });

    it('should handle empty array', () => {
      const result = service.expandTerms([]);
      expect(result).toEqual([]);
    });

    it('should preserve unknown terms', () => {
      const result = service.expandTerms(['trainers', 'unknown']);
      expect(result).toContain('sneakers');
      expect(result).toContain('unknown');
    });
  });

  describe('CRUD operations', () => {
    it('should create a synonym group', async () => {
      mockRepository.save.mockResolvedValueOnce({
        id: 'new-id',
        name: 'test',
        canonicalTerm: 'test',
        synonyms: ['test1', 'test2'],
        category: 'general',
      });
      mockRepository.find.mockResolvedValueOnce(mockSynonymGroups);

      const result = await service.create({
        name: 'test',
        canonicalTerm: 'test',
        synonyms: ['test1', 'test2'],
      });

      expect(result.id).toBe('new-id');
    });

    it('should find all synonym groups with pagination', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should find one synonym group by id', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockSynonymGroups[0]);

      const result = await service.findOne('1');

      expect(result.canonicalTerm).toBe('sneakers');
    });

    it('should throw NotFoundException when group not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockRepository.find.mockResolvedValueOnce(mockSynonymGroups);

      const stats = await service.getStats();

      expect(stats.totalGroups).toBe(2);
      expect(stats.byCategory).toHaveProperty('locale');
      expect(stats.byCategory).toHaveProperty('general');
    });
  });
});
