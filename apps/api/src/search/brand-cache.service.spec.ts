import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BrandCacheService } from './brand-cache.service';
import { Brand } from '../brands/entities/brand.entity';

describe('BrandCacheService', () => {
  let service: BrandCacheService;

  const mockBrands = [
    {
      name: 'Nike',
      slug: 'nike',
      aliases: ['NIKE', 'naiki'],
      parentId: null,
      parent: null,
    },
    {
      name: 'Adidas',
      slug: 'adidas',
      aliases: ['adi', 'ADIDAS'],
      parentId: null,
      parent: null,
    },
    {
      name: 'The North Face',
      slug: 'the-north-face',
      aliases: ['tnf', 'north face'],
      parentId: null,
      parent: null,
    },
    {
      name: 'Air Jordan',
      slug: 'air-jordan',
      aliases: ['jordan', 'aj', 'jumpman'],
      parentId: 'nike-id',
      parent: { slug: 'nike' },
    },
    {
      name: 'Nike SB',
      slug: 'nike-sb',
      aliases: ['sb'],
      parentId: 'nike-id',
      parent: { slug: 'nike' },
    },
    {
      name: 'Adidas Yeezy',
      slug: 'adidas-yeezy',
      aliases: ['yeezy'],
      parentId: 'adidas-id',
      parent: { slug: 'adidas' },
    },
  ];

  const mockBrandRepository = {
    find: jest.fn().mockResolvedValue(mockBrands),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandCacheService,
        {
          provide: getRepositoryToken(Brand),
          useValue: mockBrandRepository,
        },
      ],
    }).compile();

    service = module.get<BrandCacheService>(BrandCacheService);

    // 手动调用 onModuleInit 加载缓存
    await service.onModuleInit();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBrand', () => {
    it('should find brand by exact name', () => {
      expect(service.findBrand('Nike')).toBe('nike');
      expect(service.findBrand('Adidas')).toBe('adidas');
    });

    it('should find brand by slug', () => {
      expect(service.findBrand('nike')).toBe('nike');
      expect(service.findBrand('the-north-face')).toBe('the-north-face');
    });

    it('should find brand by alias', () => {
      expect(service.findBrand('adi')).toBe('adidas');
      expect(service.findBrand('tnf')).toBe('the-north-face');
      expect(service.findBrand('north face')).toBe('the-north-face');
    });

    it('should find sub-brand by alias', () => {
      expect(service.findBrand('jordan')).toBe('air-jordan');
      expect(service.findBrand('aj')).toBe('air-jordan');
      expect(service.findBrand('yeezy')).toBe('adidas-yeezy');
      expect(service.findBrand('sb')).toBe('nike-sb');
    });

    it('should find sub-brand by name', () => {
      expect(service.findBrand('Air Jordan')).toBe('air-jordan');
      expect(service.findBrand('Nike SB')).toBe('nike-sb');
      expect(service.findBrand('Adidas Yeezy')).toBe('adidas-yeezy');
    });

    it('should be case-insensitive', () => {
      expect(service.findBrand('NIKE')).toBe('nike');
      expect(service.findBrand('AdIdAs')).toBe('adidas');
      expect(service.findBrand('AIR JORDAN')).toBe('air-jordan');
    });

    it('should return null for unknown brand', () => {
      expect(service.findBrand('unknown-brand')).toBeNull();
      expect(service.findBrand('')).toBeNull();
    });

    it('should handle whitespace', () => {
      expect(service.findBrand('  nike  ')).toBe('nike');
    });
  });

  describe('isBrand', () => {
    it('should return true for known brands', () => {
      expect(service.isBrand('nike')).toBe(true);
      expect(service.isBrand('adi')).toBe(true);
    });

    it('should return true for sub-brand aliases', () => {
      expect(service.isBrand('jordan')).toBe(true);
      expect(service.isBrand('yeezy')).toBe(true);
    });

    it('should return false for unknown brands', () => {
      expect(service.isBrand('unknown')).toBe(false);
    });
  });

  describe('getBrandWithChildren', () => {
    it('should return parent brand plus all children slugs', () => {
      const result = service.getBrandWithChildren('nike');
      expect(result).toContain('nike');
      expect(result).toContain('air-jordan');
      expect(result).toContain('nike-sb');
      expect(result).toHaveLength(3);
    });

    it('should return adidas plus its children', () => {
      const result = service.getBrandWithChildren('adidas');
      expect(result).toContain('adidas');
      expect(result).toContain('adidas-yeezy');
      expect(result).toHaveLength(2);
    });

    it('should return only the brand itself if it has no children', () => {
      const result = service.getBrandWithChildren('the-north-face');
      expect(result).toEqual(['the-north-face']);
    });

    it('should return only the brand itself for a sub-brand (no grandchildren)', () => {
      const result = service.getBrandWithChildren('air-jordan');
      expect(result).toEqual(['air-jordan']);
    });

    it('should be case-insensitive', () => {
      const result = service.getBrandWithChildren('Nike');
      expect(result).toContain('nike');
      expect(result).toContain('air-jordan');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = service.getStats();
      expect(stats.brandCount).toBe(6); // 3 parent + 3 sub
      expect(stats.termCount).toBeGreaterThan(6); // name + slug + aliases
      expect(stats.parentChildPairs).toBe(3); // AJ→Nike, SB→Nike, Yeezy→Adidas
    });
  });

  describe('event-driven refresh', () => {
    it('should refresh cache when handleBrandChange is called', async () => {
      mockBrandRepository.find.mockResolvedValueOnce([
        {
          name: 'NewBrand',
          slug: 'new-brand',
          aliases: [],
          parentId: null,
          parent: null,
        },
      ]);

      await service.handleBrandChange();

      expect(service.findBrand('NewBrand')).toBe('new-brand');
      // Old brands should be gone after refresh
      expect(service.findBrand('Nike')).toBeNull();
    });
  });
});
