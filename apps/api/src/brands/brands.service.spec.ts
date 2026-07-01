import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';
import { Product } from '../products/entities/product.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BrandReviewService } from './brand-review.service';
import { BrandMatchService } from './brand-match.service';
import { BrandEvents } from '../shared/events/brand.events';
import axios from 'axios';
import { validateUrlForSSRF } from '../common/utils/url-validator';

// Mock axios to prevent real HTTP calls
jest.mock('axios');

// Mock url-validator
jest.mock('../common/utils/url-validator', () => ({
  validateUrlForSSRF: jest.fn().mockResolvedValue(undefined),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedValidateUrlForSSRF = validateUrlForSSRF as jest.MockedFunction<
  typeof validateUrlForSSRF
>;

describe('BrandsService', () => {
  let service: BrandsService;
  let brandRepo: any;
  let productRepo: any;
  let cacheStore: Map<string, string>;
  let configService: any;
  let reviewService: any;
  let matchService: any;
  let eventEmitter: any;

  // ===== Helper: mock QueryBuilder chain =====
  const createMockQb = (data: any[] = [], count = 0) => ({
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(data[0] ?? null),
    getRawOne: jest.fn().mockResolvedValue(data[0] ?? null),
    getMany: jest.fn().mockResolvedValue(data),
    getCount: jest.fn().mockResolvedValue(count),
    getRawMany: jest.fn().mockResolvedValue(data),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  });

  const mockBrand: Brand = {
    id: 'b1',
    name: 'Nike',
    slug: 'nike',
    aliases: ['耐克'],
    tier: 1,
    brandType: 'canonical',
    displayMode: 'independent',
    governanceStatus: 'approved',
    canonicalKey: 'nike',
    status: 'active',
    logoUrl: null,
    description: null,
    mergedIntoId: null,
    metadata: null,
    parentId: null,
    parent: null,
    children: [],
    isIndependent: false,
    isFeatured: false,
    featuredSort: 0,
    products: [],
    productCount: 5,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as unknown as Brand;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockQb = createMockQb([mockBrand], 1);

    brandRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      query: jest.fn().mockResolvedValue([{ id: 'b1', productCount: 5 }]),
      create: jest.fn((data) => ({ id: 'b-new', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    productRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQb()),
    };

    configService = {
      get: jest.fn().mockReturnValue('http://localhost:4101'),
    };

    reviewService = {
      findPending: jest.fn().mockResolvedValue([]),
      approve: jest.fn(),
      reject: jest.fn(),
    };

    matchService = {
      generateSlug: jest.fn().mockReturnValue('nike'),
      generateCanonicalKey: jest.fn().mockReturnValue('nike'),
      generateAliases: jest.fn().mockReturnValue(['耐克']),
      merge: jest.fn(),
      findByNameOrAlias: jest.fn(),
      findOrCreateByName: jest.fn(),
      findAllSimple: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: getRepositoryToken(Brand), useValue: brandRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        {
          provide: CACHE_MANAGER,
          useFactory: () => {
            cacheStore = new Map([
              ['keyv:/brands?page=1', 'cached-brands'],
              ['keyv:/brands/slug/nike', 'cached-brand-nike'],
              ['keyv:admin_dashboard_stats', 'cached-admin'],
            ]);
            return { stores: [{ store: cacheStore }] };
          },
        },
        { provide: ConfigService, useValue: configService },
        { provide: BrandReviewService, useValue: reviewService },
        { provide: BrandMatchService, useValue: matchService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  // ========== create ==========

  describe('create', () => {
    it('should create brand with auto-generated slug and aliases', async () => {
      brandRepo.findOne.mockResolvedValue(null); // no duplicates

      const result = await service.create({ name: 'Nike' } as any);

      expect(matchService.generateSlug).toHaveBeenCalledWith('Nike');
      expect(matchService.generateAliases).toHaveBeenCalledWith('Nike');
      expect(brandRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Nike');
    });

    it('should use provided slug and aliases', async () => {
      brandRepo.findOne.mockResolvedValue(null);

      await service.create({
        name: 'Nike',
        slug: 'custom-nike',
        aliases: ['custom-alias'],
      } as any);

      expect(matchService.generateSlug).not.toHaveBeenCalled();
      expect(matchService.generateAliases).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if name already exists', async () => {
      brandRepo.findOne
        .mockResolvedValueOnce({ id: 'existing' }) // name check
        .mockResolvedValueOnce(null); // slug check

      await expect(service.create({ name: 'Nike' } as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should append timestamp to slug if slug already exists', async () => {
      brandRepo.findOne
        .mockResolvedValueOnce(null) // name OK
        .mockResolvedValueOnce({ id: 'dup-slug' }); // slug duplicate

      const result = await service.create({ name: 'NikeNew' } as any);

      expect(result.slug).toContain('nike-');
    });

    it('should default status to active for manual creation', async () => {
      brandRepo.findOne.mockResolvedValue(null);

      await service.create({ name: 'TestBrand' } as any);

      expect(brandRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });
  });

  // ========== update ==========

  describe('update', () => {
    it('should update brand fields and emit UPDATED event', async () => {
      // findOne via query builder
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      brandRepo.findOne.mockResolvedValue(null); // no conflict

      const result = await service.update('b1', {
        description: 'Updated',
      } as any);

      expect(brandRepo.save).toHaveBeenCalled();
      expect(result.description).toBe('Updated');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        BrandEvents.UPDATED,
        expect.objectContaining({ brandId: 'b1' }),
      );
    });

    it('should reject setting parentId to itself', async () => {
      const qb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update('b1', { parentId: 'b1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject circular hierarchy (A→B→A)', async () => {
      const brandA = { ...mockBrand, id: 'a', parentId: null };
      const brandB = { id: 'b', parentId: 'a' };

      const qb = createMockQb([brandA]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      // findOne for ancestor traversal: brand B's parentId is 'a' (same as the brand being updated)
      brandRepo.findOne.mockResolvedValueOnce(brandB);

      await expect(
        service.update('a', { parentId: 'b' } as any),
      ).rejects.toThrow(/循环层级/);
    });

    it('should allow valid parentId without circular reference', async () => {
      const brandA = { ...mockBrand, id: 'a', parentId: null };

      const qb = createMockQb([brandA]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      // findOne for ancestor traversal: brand C has no parent (end of chain)
      brandRepo.findOne
        .mockResolvedValueOnce({ id: 'c', parentId: null }) // ancestor check
        .mockResolvedValueOnce(null); // name/slug conflict check

      await service.update('a', { parentId: 'c' } as any);

      expect(brandRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException on name/slug conflict', async () => {
      const qb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      brandRepo.findOne.mockResolvedValue({ id: 'other-brand' });

      await expect(
        service.update('b1', { name: 'Adidas' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if brand not found', async () => {
      const qb = createMockQb([], 0);
      qb.getOne.mockResolvedValue(null);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update('nonexistent', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========== remove ==========

  describe('remove', () => {
    it('should soft delete brand by setting status to inactive', async () => {
      const qb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      brandRepo.save.mockResolvedValue({ ...mockBrand, status: 'inactive' });

      const result = await service.remove('b1');

      expect(result.deletedBrand).toBe('Nike');
      expect(result.status).toBe('inactive');
      expect(brandRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive' }),
      );
      expect(brandRepo.remove).not.toHaveBeenCalled();
    });
  });

  // ========== clearBrandCache ==========

  describe('clearBrandCache', () => {
    it('create 后清除品牌缓存', async () => {
      brandRepo.findOne.mockResolvedValue(null);
      expect(cacheStore.has('keyv:/brands?page=1')).toBe(true);

      await service.create({ name: 'Adidas' } as any);

      expect(cacheStore.has('keyv:/brands?page=1')).toBe(false);
      expect(cacheStore.has('keyv:/brands/slug/nike')).toBe(false);
      // 不相关的缓存保留
      expect(cacheStore.has('keyv:admin_dashboard_stats')).toBe(true);
    });

    it('update 后清除品牌缓存', async () => {
      const qb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      brandRepo.findOne.mockResolvedValue(null);
      expect(cacheStore.has('keyv:/brands?page=1')).toBe(true);

      await service.update('b1', { description: 'New' } as any);

      expect(cacheStore.has('keyv:/brands?page=1')).toBe(false);
      expect(cacheStore.has('keyv:/brands/slug/nike')).toBe(false);
      expect(cacheStore.has('keyv:admin_dashboard_stats')).toBe(true);
    });

    it('remove 后清除品牌缓存', async () => {
      const qb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      expect(cacheStore.has('keyv:/brands?page=1')).toBe(true);

      await service.remove('b1');

      expect(cacheStore.has('keyv:/brands?page=1')).toBe(false);
      expect(cacheStore.has('keyv:/brands/slug/nike')).toBe(false);
      expect(cacheStore.has('keyv:admin_dashboard_stats')).toBe(true);
    });
  });

  // ========== findOne ==========

  describe('findOne', () => {
    it('should return brand by id', async () => {
      const result = await service.findOne('b1');

      expect(result).toEqual(mockBrand);
    });

    it('should throw NotFoundException if not found', async () => {
      const qb = createMockQb([]);
      qb.getOne.mockResolvedValue(null);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== findBySlug ==========

  describe('findBySlug', () => {
    it('should return brand by slug', async () => {
      const result = await service.findBySlug('nike');

      expect(result).toEqual(mockBrand);
    });

    it('should throw NotFoundException if slug not found', async () => {
      const qb = createMockQb([]);
      qb.getOne.mockResolvedValue(null);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== findAll ==========

  describe('findAll', () => {
    it('should return paginated brands', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should throw BadRequestException when q and search differ', async () => {
      await expect(
        service.findAll({ q: 'nike', search: 'adidas' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply tier filter', async () => {
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ tier: 1 });

      expect(qb.andWhere).toHaveBeenCalledWith('brand.tier = :tier', {
        tier: 1,
      });
    });

    it('should apply search filter', async () => {
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ q: 'nike' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(brand.name)'),
        expect.objectContaining({ search: '%nike%' }),
      );
    });

    it('should apply isFeatured filter', async () => {
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isFeatured: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'brand.isFeatured = :isFeatured',
        { isFeatured: true },
      );
    });

    it('should sort by featuredSort when isFeatured is true', async () => {
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isFeatured: true });

      expect(qb.orderBy).toHaveBeenCalledWith('brand.featuredSort', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('brand.name', 'ASC');
    });

    it('should sort by tier when isFeatured is not set', async () => {
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 10 });

      expect(qb.orderBy).toHaveBeenCalledWith('tier_order', 'ASC');
    });

    it('should apply hasProducts filter with innerJoin and groupBy', async () => {
      const qb = createMockQb([mockBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ hasProducts: true });

      expect(qb.innerJoin).toHaveBeenCalledWith(
        'brand.products',
        'product_check',
      );
      expect(qb.groupBy).toHaveBeenCalledWith('brand.id');
      expect(qb.addGroupBy).toHaveBeenCalledWith('parent.id');
    });

    it('should return all results when limit=0 (no pagination)', async () => {
      const brands = [mockBrand, { ...mockBrand, id: 'b2', name: 'Adidas' }];
      const qb = createMockQb(brands, 2);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ limit: 0 });

      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply pagination when limit > 0', async () => {
      const qb = createMockQb([mockBrand], 5);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 2, limit: 2 });

      expect(qb.skip).toHaveBeenCalledWith(2);
      expect(qb.take).toHaveBeenCalledWith(2);
    });

    it('should aggregate active product counts from child brands', async () => {
      const parentBrand = { ...mockBrand, id: 'parent', productCount: 0 };
      const qb = createMockQb([parentBrand], 1);
      brandRepo.createQueryBuilder.mockReturnValue(qb);
      brandRepo.query.mockResolvedValue([{ id: 'parent', productCount: 12 }]);

      const result = await service.findAll({ isFeatured: true, limit: 10 });

      expect(brandRepo.query).toHaveBeenCalled();
      expect(result.data[0].productCount).toBe(12);
    });
  });

  // ========== search ==========

  describe('search', () => {
    it('should return matching brands', async () => {
      const qb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('nike', 5);

      expect(result).toHaveLength(1);
    });

    it('should return empty array for short query', async () => {
      const result = await service.search('n');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty query', async () => {
      const result = await service.search('');

      expect(result).toEqual([]);
    });
  });

  // ========== getAllSlugs ==========

  describe('getAllSlugs', () => {
    it('should return active brand slugs', async () => {
      brandRepo.find.mockResolvedValue([{ slug: 'nike' }, { slug: 'adidas' }]);

      const result = await service.getAllSlugs();

      expect(result.slugs).toEqual(['nike', 'adidas']);
      expect(brandRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'active' },
          select: ['slug'],
        }),
      );
    });
  });

  // ========== Delegation methods ==========

  describe('delegation to BrandReviewService', () => {
    it('findPending delegates correctly', async () => {
      await service.findPending();
      expect(reviewService.findPending).toHaveBeenCalled();
    });

    it('approve delegates correctly', async () => {
      await service.approve('b1', 'admin');
      expect(reviewService.approve).toHaveBeenCalledWith('b1', 'admin');
    });

    it('reject delegates correctly', async () => {
      await service.reject('b1', 'admin', 'reason');
      expect(reviewService.reject).toHaveBeenCalledWith(
        'b1',
        'admin',
        'reason',
      );
    });
  });

  describe('delegation to BrandMatchService', () => {
    it('merge delegates correctly', async () => {
      await service.merge('src', 'tgt');
      expect(matchService.merge).toHaveBeenCalledWith('src', 'tgt');
    });

    it('findByNameOrAlias delegates correctly', async () => {
      await service.findByNameOrAlias('Nike');
      expect(matchService.findByNameOrAlias).toHaveBeenCalledWith('Nike');
    });

    it('findAllSimple delegates correctly', async () => {
      await service.findAllSimple();
      expect(matchService.findAllSimple).toHaveBeenCalled();
    });

    it('generateAliases delegates correctly', () => {
      service.generateAliases('Nike');
      expect(matchService.generateAliases).toHaveBeenCalledWith('Nike');
    });
  });

  // ========== findOrCreateByName ==========

  describe('findOrCreateByName', () => {
    it('should return existing brand without fetching logo', async () => {
      const existing = {
        ...mockBrand,
        logoUrl: 'existing.png',
        metadata: null,
      };
      matchService.findOrCreateByName.mockResolvedValue(existing);

      const result = await service.findOrCreateByName('Nike');

      expect(result).toEqual(existing);
    });

    it('should return null when match service returns null', async () => {
      matchService.findOrCreateByName.mockResolvedValue(null);

      const result = await service.findOrCreateByName('Unknown');

      expect(result).toBeNull();
    });
  });

  // ========== backfillBrands ==========

  describe('backfillBrands', () => {
    it('should return empty result if no products need backfill', async () => {
      productRepo.find.mockResolvedValue([]);

      const result = await service.backfillBrands();

      expect(result.scannedProducts).toBe(0);
      expect(result.linkedProducts).toBe(0);
    });

    it('should create brands and link products', async () => {
      productRepo.find.mockResolvedValue([
        { id: 'p1', aiBrandName: 'Nike' },
        { id: 'p2', aiBrandName: 'Nike' },
        { id: 'p3', aiBrandName: 'Adidas' },
      ]);

      matchService.findOrCreateByName.mockImplementation((name: string) => ({
        id: `brand-${name.toLowerCase()}`,
        name,
        metadata: {},
        createdAt: new Date(),
      }));

      const result = await service.backfillBrands();

      expect(result.scannedProducts).toBe(3);
      expect(result.uniqueBrands).toBe(2);
      expect(result.linkedProducts).toBe(3);
      expect(productRepo.update).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for individual brands gracefully', async () => {
      productRepo.find.mockResolvedValue([
        { id: 'p1', aiBrandName: 'BadBrand' },
      ]);
      matchService.findOrCreateByName.mockRejectedValue(new Error('DB error'));

      const result = await service.backfillBrands();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('BadBrand');
    });
  });

  // ========== downloadAndSaveLogo SSRF protection ==========

  describe('downloadAndSaveLogo SSRF protection', () => {
    it('should call validateUrlForSSRF before downloading', async () => {
      mockedValidateUrlForSSRF.mockResolvedValue(undefined);
      // Create a valid PNG buffer (magic bytes + padding)
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const pngBuffer = Buffer.concat([pngHeader, Buffer.alloc(200)]);
      mockedAxios.get.mockResolvedValue({ data: pngBuffer });

      // Access private method via bracket notation
      await (service as any).downloadAndSaveLogo(
        'https://example.com/logo.png',
        'test-brand',
      );

      expect(mockedValidateUrlForSSRF).toHaveBeenCalledWith(
        'https://example.com/logo.png',
      );
    });

    it('should return null when SSRF validation fails', async () => {
      mockedValidateUrlForSSRF.mockRejectedValue(
        new Error('Blocked URL: private/reserved IP address'),
      );

      const result = await (service as any).downloadAndSaveLogo(
        'http://169.254.169.254/latest/meta-data/',
        'evil-brand',
      );

      expect(result).toBeNull();
      expect(mockedValidateUrlForSSRF).toHaveBeenCalledWith(
        'http://169.254.169.254/latest/meta-data/',
      );
    });
  });

  // ========== backfillLogos ==========

  describe('backfillLogos', () => {
    it('should return empty result if no brands need logos', async () => {
      brandRepo.find.mockResolvedValue([]);

      const result = await service.backfillLogos();

      expect(result.total).toBe(0);
      expect(result.updated).toBe(0);
    });

    it('should process brands in concurrent batches', async () => {
      const brands = [
        { id: 'b1', name: 'Nike' },
        { id: 'b2', name: 'Adidas' },
        { id: 'b3', name: 'Puma' },
        { id: 'b4', name: 'Gucci' },
        { id: 'b5', name: 'Prada' },
        { id: 'b6', name: 'LV' },
        { id: 'b7', name: 'Chanel' },
      ];
      brandRepo.find.mockResolvedValue(brands);

      // Mock fetchBrandLogo: 部分成功、部分未找到、部分报错
      const fetchSpy = jest
        .spyOn(service, 'fetchBrandLogo' as any)
        .mockResolvedValueOnce({
          logoUrl: 'https://logo.com/nike.png',
          source: 'website',
        }) // b1
        .mockResolvedValueOnce({
          logoUrl: 'https://logo.com/adidas.png',
          source: 'wiki',
        }) // b2
        .mockResolvedValueOnce({ logoUrl: null, source: 'none' }) // b3 not found
        .mockRejectedValueOnce(new Error('timeout')) // b4 error
        .mockResolvedValueOnce({
          logoUrl: 'https://logo.com/prada.png',
          source: 'website',
        }) // b5
        .mockResolvedValueOnce({ logoUrl: null, source: 'none' }) // b6 not found
        .mockResolvedValueOnce({
          logoUrl: 'https://logo.com/chanel.png',
          source: 'wiki',
        }); // b7

      const result = await service.backfillLogos();

      expect(result.total).toBe(7);
      expect(result.updated).toBe(4); // Nike, Adidas, Prada, Chanel
      expect(result.failed).toBe(3); // Puma(not_found), Gucci(error), LV(not_found)

      // 验证 brandRepository.update 只对有 logoUrl 的品牌调用
      expect(brandRepo.update).toHaveBeenCalledWith('b1', {
        logoUrl: 'https://logo.com/nike.png',
      });
      expect(brandRepo.update).toHaveBeenCalledWith('b2', {
        logoUrl: 'https://logo.com/adidas.png',
      });
      expect(brandRepo.update).not.toHaveBeenCalledWith(
        'b3',
        expect.anything(),
      );
      expect(brandRepo.update).toHaveBeenCalledWith('b5', {
        logoUrl: 'https://logo.com/prada.png',
      });
      expect(brandRepo.update).toHaveBeenCalledWith('b7', {
        logoUrl: 'https://logo.com/chanel.png',
      });
      expect(brandRepo.update).toHaveBeenCalledTimes(4);

      // 验证所有品牌都被处理（7 次 fetchBrandLogo 调用）
      expect(fetchSpy).toHaveBeenCalledTimes(7);

      fetchSpy.mockRestore();
    });
  });

  // ========== findCategoriesByBrandSlug ==========
  describe('findCategoriesByBrandSlug', () => {
    it('返回品牌下商品所属的分类列表', async () => {
      const rawData = [
        {
          id: 'c1',
          name: 'Sneakers',
          nameEn: 'Sneakers',
          slug: 'sneakers',
          translations: null,
          productCount: '15',
        },
        {
          id: 'c2',
          name: 'T-Shirts',
          nameEn: 'T-Shirts',
          slug: 't-shirts',
          translations: null,
          productCount: '8',
        },
      ];
      const mockQb = createMockQb(rawData);
      productRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findCategoriesByBrandSlug('nike');

      expect(productRepo.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(result).toHaveLength(2);
      expect(result[0].productCount).toBe(15);
      expect(result[1].slug).toBe('t-shirts');
    });

    it('品牌无商品时返回空数组', async () => {
      const mockQb = createMockQb([]);
      productRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findCategoriesByBrandSlug('unknown');
      expect(result).toEqual([]);
    });
  });

  // ========== findRelatedBrands ==========
  describe('findRelatedBrands', () => {
    it('返回同分类下的其他品牌', async () => {
      // Step 1: findBySlug 返回品牌
      const brandQb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValueOnce(brandQb);

      // Step 2: 查询该品牌最大分类
      const categoryQb = createMockQb([], 0);
      categoryQb.getRawOne.mockResolvedValue({ categoryId: 'c1', count: '10' });
      productRepo.createQueryBuilder.mockReturnValueOnce(categoryQb);

      // Step 3: 查询相关品牌
      const relatedBrand = {
        ...mockBrand,
        id: 'b2',
        name: 'Adidas',
        slug: 'adidas',
      };
      const relatedQb = createMockQb([relatedBrand]);
      brandRepo.createQueryBuilder.mockReturnValueOnce(relatedQb);

      const result = await service.findRelatedBrands('nike', 8);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Adidas');
    });

    it('品牌无分类时返回空数组', async () => {
      const brandQb = createMockQb([mockBrand]);
      brandRepo.createQueryBuilder.mockReturnValueOnce(brandQb);

      const categoryQb = createMockQb([], 0);
      categoryQb.getRawOne.mockResolvedValue(null);
      productRepo.createQueryBuilder.mockReturnValueOnce(categoryQb);

      const result = await service.findRelatedBrands('nike');
      expect(result).toEqual([]);
    });
  });
});
