import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductsService } from './products.service';
import { ProductStatusAction } from './product-status';
import { Product } from './entities/product.entity';
import {
  ProductInteractionEvent,
  ProductInteractionEventType,
} from './entities/product-interaction-event.entity';
import { ProductQcMedia } from './entities/product-qc-media.entity';
import { Category } from '../categories/entities/category.entity';
import { BrandsService } from '../brands/brands.service';
import { BrandGovernanceService } from '../brands/brand-governance.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductStatusService } from './product-status.service';
import { ProductSkuService } from './product-sku.service';
import { ProductImportService } from './product-import.service';
import { ProductQueryService } from './product-query.service';
import { ProductEvents } from '../shared/events/product.events';
import { AttributesService } from '../attributes/attributes.service';
import { AttributeValidatorService } from '../attributes/attribute-validator.service';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';

// Mock slug utility
jest.mock('../utils/slug', () => ({
  generateUniqueProductSlug: jest
    .fn()
    .mockResolvedValue('brand-category-abc123'),
}));

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: any;
  let productInteractionEventRepository: any;
  let productQcMediaRepository: any;
  let categoryRepository: any;
  let cacheManager: any;
  let brandsService: any;
  let brandGovernanceService: any;
  let categoriesService: any;
  let productStatusService: any;
  let productSkuService: any;
  let productImportService: any;
  let productQueryService: any;
  let eventEmitter: any;
  let analyticsDedupService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    productRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({ id: 'prod-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
      increment: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    productInteractionEventRepository = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
      })),
    };

    productQcMediaRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((data) => data),
      save: jest.fn((entities) => Promise.resolve(entities)),
    };

    categoryRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      manager: {
        getTreeRepository: jest.fn().mockReturnValue({
          findAncestors: jest.fn().mockResolvedValue([]),
        }),
      },
    };

    cacheManager = {
      stores: [
        {
          store: new Map([
            ['keyv:/products?page=1', 'cached-list'],
            ['keyv:/products/facets?brand=nike', 'cached-facets'],
            ['keyv:/products/suggest?q=nike', 'cached-suggest'],
            ['keyv:/brands?page=1', 'cached-brands'],
            ['keyv:/categories', 'cached-categories'],
            ['keyv:admin_dashboard_stats', 'cached-admin'],
            ['keyv:search_suggestions:nike', 'cached-search'],
          ]),
        },
      ],
      clear: jest.fn().mockResolvedValue(undefined),
    };

    brandsService = {
      findOrCreateByName: jest.fn(),
      search: jest.fn().mockResolvedValue([]),
    };

    brandGovernanceService = {
      syncProductBrandDecision: jest.fn().mockResolvedValue(undefined),
    };

    categoriesService = {
      search: jest.fn().mockResolvedValue([]),
      ensureCanonicalLeafCategory: jest.fn(),
      ensureCanonicalActiveCategory: jest.fn(),
    };

    productStatusService = {
      performStatusAction: jest.fn(),
      submitForReview: jest.fn(),
      approveProduct: jest.fn(),
      rejectProduct: jest.fn(),
      publishProduct: jest.fn(),
      unpublishProduct: jest.fn(),
      markOutOfStock: jest.fn(),
      restockProduct: jest.fn(),
      getAvailableStatusActions: jest.fn(),
      batchUpdateStatus: jest.fn(),
    };

    productSkuService = {
      createSku: jest.fn(),
      findSkusByProduct: jest.fn(),
      findOneSku: jest.fn(),
      updateSku: jest.fn(),
      removeSku: jest.fn(),
      clearSkuImagesForRemovedUrls: jest.fn().mockResolvedValue(0),
    };

    productImportService = {
      importFromWeidian: jest.fn(),
      importFromWeidianWithMixedDetection: jest.fn(),
      createProductFromBatchItem: jest.fn(),
    };

    productQueryService = {
      findAll: jest.fn(),
      getFacets: jest.fn(),
      findOne: jest.fn(),
      findBySlug: jest.fn(),
      invalidateProductDetailCacheBySlug: jest
        .fn()
        .mockResolvedValue(undefined),
      findByWeidianItemId: jest.fn(),
      getAllSlugs: jest.fn(),
      search: jest.fn().mockResolvedValue([]),
      generateBuyLink: jest.fn(),
      getAvailablePlatforms: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };
    analyticsDedupService = {
      claim: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productRepository },
        {
          provide: getRepositoryToken(ProductInteractionEvent),
          useValue: productInteractionEventRepository,
        },
        {
          provide: getRepositoryToken(ProductQcMedia),
          useValue: productQcMediaRepository,
        },
        { provide: getRepositoryToken(Category), useValue: categoryRepository },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: BrandsService, useValue: brandsService },
        { provide: BrandGovernanceService, useValue: brandGovernanceService },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: ProductStatusService, useValue: productStatusService },
        { provide: ProductSkuService, useValue: productSkuService },
        { provide: ProductImportService, useValue: productImportService },
        { provide: ProductQueryService, useValue: productQueryService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: AttributesService,
          useValue: { syncProductAttributes: jest.fn() },
        },
        {
          provide: AttributeValidatorService,
          useValue: {
            validateAndResolve: jest
              .fn()
              .mockResolvedValue({ normalized: {}, attributeValueIds: [] }),
          },
        },
        { provide: AnalyticsDedupService, useValue: analyticsDedupService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== create() =====
  describe('create()', () => {
    const baseDto = {
      title: 'Test Product',
      primaryCategoryId: 'cat-1',
      aiBrandName: 'Nike',
      brandConfidence: 0.9,
    } as any;

    it('should create a product with slug and brand', async () => {
      categoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-1' });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([]);

      await service.create(baseDto);

      expect(
        categoriesService.ensureCanonicalActiveCategory,
      ).toHaveBeenCalledWith('cat-1');
      expect(brandsService.findOrCreateByName).toHaveBeenCalledWith(
        'Nike',
        0.9,
      );
      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if primary category not found', async () => {
      categoriesService.ensureCanonicalActiveCategory.mockRejectedValue(
        new NotFoundException('not found'),
      );
      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('should reject non-leaf primary category', async () => {
      categoriesService.ensureCanonicalActiveCategory.mockRejectedValue(
        new ConflictException('主分类必须是最深层子分类'),
      );

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
    });

    it('should skip brand creation when brandId is provided', async () => {
      categoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([]);

      await service.create({ ...baseDto, brandId: 'existing-brand' });

      expect(brandsService.findOrCreateByName).not.toHaveBeenCalled();
    });

    it('should merge ancestor IDs into secondary categories', async () => {
      categoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-1' });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([
          { id: 'ancestor-1' },
          { id: 'ancestor-2' },
        ]);
      categoryRepository.find.mockResolvedValue([
        { id: 'ancestor-1' },
        { id: 'ancestor-2' },
      ]);

      await service.create(baseDto);

      expect(categoryRepository.find).toHaveBeenCalled();
    });

    it('should throw if some secondary category IDs not found', async () => {
      categoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'shoes',
      });
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-1' });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([{ id: 'ancestor-1' }]);
      // Return empty → length mismatch
      categoryRepository.find.mockResolvedValue([]);

      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('should require leaf category when creating active product', async () => {
      categoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'cat-1',
        slug: 'hoodie',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-1',
        slug: 'hoodie',
      });
      brandsService.findOrCreateByName.mockResolvedValue({ id: 'brand-1' });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([]);

      await service.create({ ...baseDto, status: 'active' });

      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).toHaveBeenCalledWith('cat-1');
    });
  });

  // ===== update() =====
  describe('update()', () => {
    const existingProduct = {
      id: 'prod-1',
      slug: 'old-slug',
      primaryCategoryId: 'cat-1',
      images: ['img1.jpg', 'img2.jpg'],
      secondaryCategories: [],
    };

    it('should update product and clear only product cache entries', async () => {
      productRepository.findOne.mockResolvedValue({ ...existingProduct });
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      const result = await service.update('prod-1', {
        title: 'New Title',
      } as any);

      expect(result.title).toBe('New Title');
      // Product/brand/category cache entries should be deleted
      const store = cacheManager.stores[0].store as Map<string, string>;
      expect(store.has('keyv:/products?page=1')).toBe(false);
      expect(store.has('keyv:/products/facets?brand=nike')).toBe(false);
      expect(store.has('keyv:/products/suggest?q=nike')).toBe(false);
      expect(store.has('keyv:/brands?page=1')).toBe(false);
      expect(store.has('keyv:/categories')).toBe(false);
      // Unrelated cache entries should be preserved
      expect(store.has('keyv:admin_dashboard_stats')).toBe(true);
      expect(store.has('keyv:search_suggestions:nike')).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProductEvents.UPDATED,
        expect.objectContaining({ productId: 'prod-1' }),
      );
    });

    it('should throw NotFoundException if product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.update('prod-1', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if slug already taken', async () => {
      productRepository.findOne
        .mockResolvedValueOnce({ ...existingProduct }) // find product
        .mockResolvedValueOnce({ id: 'other-prod' }); // slug check

      await expect(
        service.update('prod-1', { slug: 'taken-slug' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should sync mainImage to images[0] when images updated', async () => {
      productRepository.findOne.mockResolvedValue({ ...existingProduct });
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      const result = await service.update('prod-1', {
        images: ['new1.jpg', 'new2.jpg'],
      } as any);

      expect(result.mainImage).toBe('new1.jpg');
    });

    it('should clear SKU images when product images removed', async () => {
      productRepository.findOne.mockResolvedValue({ ...existingProduct });
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));
      productSkuService.clearSkuImagesForRemovedUrls.mockResolvedValue(2);

      await service.update('prod-1', { images: ['img1.jpg'] } as any);

      expect(
        productSkuService.clearSkuImagesForRemovedUrls,
      ).toHaveBeenCalledWith('prod-1', ['img2.jpg']);
    });

    it('should recalculate secondary categories when primaryCategoryId changes', async () => {
      productRepository.findOne.mockResolvedValue({ ...existingProduct });
      categoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
        id: 'cat-2',
        slug: 'bags',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-2',
        slug: 'bags',
      });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([{ id: 'anc-1' }]);
      categoryRepository.find.mockResolvedValue([{ id: 'anc-1' }]);
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.update('prod-1', { primaryCategoryId: 'cat-2' } as any);

      expect(
        categoriesService.ensureCanonicalActiveCategory,
      ).toHaveBeenCalledWith('cat-2');
      expect(categoryRepository.find).toHaveBeenCalled();
    });

    it('should require leaf category when updating product to active', async () => {
      productRepository.findOne.mockResolvedValue({
        ...existingProduct,
        status: 'pending_review',
      });
      categoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'cat-parent',
        slug: 'hoodie',
      });
      categoryRepository.findOne.mockResolvedValue({
        id: 'cat-parent',
        slug: 'hoodie',
      });
      categoryRepository.manager
        .getTreeRepository()
        .findAncestors.mockResolvedValue([{ id: 'cat-parent' }]);
      categoryRepository.find.mockResolvedValue([{ id: 'cat-parent' }]);
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.update('prod-1', {
        primaryCategoryId: 'cat-parent',
        status: 'active',
      } as any);

      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).toHaveBeenCalledWith('cat-parent');
    });

    it('should validate current category when only status changes to active', async () => {
      productRepository.findOne.mockResolvedValue({
        ...existingProduct,
        status: 'pending_review',
        primaryCategoryId: 'cat-parent',
      });
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));
      categoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'cat-parent',
        slug: 'hoodie',
      });

      await service.update('prod-1', { status: 'active' } as any);

      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).toHaveBeenCalledWith('cat-parent');
    });
  });

  // ===== remove() & softRemove() =====
  describe('remove()', () => {
    it('should delete product, clear cache, and emit DELETED event', async () => {
      const product = { id: 'prod-1' };
      productQueryService.findOne.mockResolvedValue(product);

      await service.remove('prod-1');

      expect(productRepository.remove).toHaveBeenCalledWith(product);
      // Product/brand/category cache entries should be deleted
      const store = cacheManager.stores[0].store as Map<string, string>;
      expect(store.has('keyv:/products?page=1')).toBe(false);
      expect(store.has('keyv:/brands?page=1')).toBe(false);
      expect(store.has('keyv:/categories')).toBe(false);
      // Unrelated cache entries should be preserved
      expect(store.has('keyv:admin_dashboard_stats')).toBe(true);
      // Should emit DELETED event
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProductEvents.DELETED,
        expect.objectContaining({ productId: 'prod-1' }),
      );
    });
  });

  // ===== batchRemove() =====
  describe('batchRemove()', () => {
    it('should delete all found products, clear cache, and emit DELETED events', async () => {
      const products = [
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
        { id: 'prod-3', title: 'Product 3' },
      ];
      productRepository.find.mockResolvedValue(products);

      const result = await service.batchRemove(['prod-1', 'prod-2', 'prod-3']);

      expect(productRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
      expect(productRepository.remove).toHaveBeenCalledWith(products);
      expect(productRepository.remove).toHaveBeenCalledTimes(1);
      expect(result.success).toEqual(['prod-1', 'prod-2', 'prod-3']);
      expect(result.failed).toEqual([]);
      // Product/brand/category cache should be cleared
      const store = cacheManager.stores[0].store as Map<string, string>;
      expect(store.has('keyv:/products?page=1')).toBe(false);
      expect(store.has('keyv:/brands?page=1')).toBe(false);
      expect(store.has('keyv:/categories')).toBe(false);
      // Unrelated cache should be preserved
      expect(store.has('keyv:admin_dashboard_stats')).toBe(true);
      // Should emit DELETED event for each product
      expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProductEvents.DELETED,
        expect.objectContaining({ productId: 'prod-1' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProductEvents.DELETED,
        expect.objectContaining({ productId: 'prod-3' }),
      );
    });

    it('should report not-found IDs as failed', async () => {
      const products = [{ id: 'prod-1', title: 'Product 1' }];
      productRepository.find.mockResolvedValue(products);

      const result = await service.batchRemove(['prod-1', 'prod-not-exist']);

      expect(productRepository.remove).toHaveBeenCalledWith(products);
      expect(result.success).toEqual(['prod-1']);
      expect(result.failed).toEqual([
        { id: 'prod-not-exist', reason: '产品不存在' },
      ]);
    });

    it('should handle empty results (all IDs not found)', async () => {
      productRepository.find.mockResolvedValue([]);

      const result = await service.batchRemove(['prod-not-1', 'prod-not-2']);

      expect(productRepository.remove).not.toHaveBeenCalled();
      expect(result.success).toEqual([]);
      expect(result.failed).toEqual([
        { id: 'prod-not-1', reason: '产品不存在' },
        { id: 'prod-not-2', reason: '产品不存在' },
      ]);
    });
  });

  describe('softRemove()', () => {
    it('should set status to inactive', async () => {
      const product = { id: 'prod-1', status: 'active' };
      productQueryService.findOne.mockResolvedValue(product);
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.softRemove('prod-1');

      expect(product.status).toBe('inactive');
      expect(productRepository.save).toHaveBeenCalledWith(product);
    });
  });

  // ===== clearProductListCache fallback =====
  describe('clearProductListCache fallback (unknown store type)', () => {
    it('should NOT call cacheManager.clear() when store type is unknown', async () => {
      // 替换为无法识别的 store 类型（既非 Redis 也非 Map）
      cacheManager.stores = [{ store: 'unknown-store-type' }];

      const product = {
        id: 'prod-1',
        slug: 'old',
        primaryCategoryId: 'cat-1',
        images: [],
        secondaryCategories: [],
      };
      productRepository.findOne.mockResolvedValue({ ...product });
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      // update 内部会调用 clearProductListCache
      await service.update('prod-1', { title: 'Trigger cache clear' } as any);

      // cacheManager.clear() 不应被调用
      expect(cacheManager.clear).not.toHaveBeenCalled();
    });

    it('should NOT call cacheManager.clear() when stores is empty', async () => {
      cacheManager.stores = [];

      const product = {
        id: 'prod-1',
        slug: 'old',
        primaryCategoryId: 'cat-1',
        images: [],
        secondaryCategories: [],
      };
      productRepository.findOne.mockResolvedValue({ ...product });
      productRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.update('prod-1', { title: 'Trigger cache clear' } as any);

      expect(cacheManager.clear).not.toHaveBeenCalled();
    });
  });

  // ===== incrementSalesCount() & recordProductClick() =====
  describe('incrementSalesCount()', () => {
    it('should use atomic increment for salesCount', async () => {
      await service.incrementSalesCount('prod-1');

      expect(productRepository.increment).toHaveBeenCalledWith(
        { id: 'prod-1' },
        'salesCount',
        1,
      );
    });
  });

  describe('recordProductClick()', () => {
    it('should increment clickCount and update CTR', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        viewCount: 100,
        clickCount: 11,
      });

      await service.recordProductClick('prod-1');

      expect(analyticsDedupService.claim).toHaveBeenCalled();
      expect(productInteractionEventRepository.create).toHaveBeenCalledWith({
        productId: 'prod-1',
        eventType: ProductInteractionEventType.CLICK,
        trustedVisitorId: null,
        userId: null,
      });
      expect(productInteractionEventRepository.save).toHaveBeenCalled();
      expect(productRepository.increment).toHaveBeenCalledWith(
        { id: 'prod-1' },
        'clickCount',
        1,
      );
      expect(productRepository.update).toHaveBeenCalledWith('prod-1', {
        ctr: 11 / 100,
      });
    });

    it('should skip CTR update when viewCount is 0', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        viewCount: 0,
        clickCount: 1,
      });

      await service.recordProductClick('prod-1');

      expect(productRepository.increment).toHaveBeenCalled();
      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('should skip duplicate click events inside the dedup window', async () => {
      analyticsDedupService.claim.mockResolvedValue(false);

      await service.recordProductClick('prod-1');

      expect(productRepository.increment).not.toHaveBeenCalled();
      expect(productInteractionEventRepository.save).not.toHaveBeenCalled();
    });

    it('should no-op when click tracking references a missing product', async () => {
      productInteractionEventRepository.save.mockRejectedValueOnce({
        driverError: { code: '23503' },
      });

      await expect(
        service.recordProductClick('missing-prod'),
      ).resolves.toBeUndefined();

      expect(productRepository.increment).not.toHaveBeenCalled();
      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('should skip click writes when one visitor scans too many products quickly', async () => {
      const context = {
        userId: undefined,
        trustedVisitorId: 'visitor-scan',
        ipAddress: '203.0.113.10',
        userAgent: 'Mozilla/5.0',
      };

      for (let i = 1; i <= 18; i++) {
        await service.recordProductClick(`prod-${i}`, context);
      }

      await service.recordProductClick('prod-blocked', context);

      expect(productInteractionEventRepository.save).toHaveBeenCalledTimes(18);
      expect(productRepository.increment).toHaveBeenCalledTimes(18);
    });
  });

  describe('recordProductView()', () => {
    it('原子递增 viewCount', async () => {
      await service.recordProductView('prod-1');

      expect(analyticsDedupService.claim).toHaveBeenCalled();
      expect(productInteractionEventRepository.create).toHaveBeenCalledWith({
        productId: 'prod-1',
        eventType: ProductInteractionEventType.VIEW,
        trustedVisitorId: null,
        userId: null,
      });
      expect(productInteractionEventRepository.save).toHaveBeenCalled();
      expect(productRepository.increment).toHaveBeenCalledWith(
        { id: 'prod-1' },
        'viewCount',
        1,
      );
    });

    it('emits daily browse reward after five distinct viewed products', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '5' }),
      };
      productInteractionEventRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      await service.recordProductView('prod-5', {
        userId: 'user-1',
        trustedVisitorId: 'visitor-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'points.earn.request',
        expect.objectContaining({
          userId: 'user-1',
          action: 'daily_browse_5_products',
          referenceType: 'daily_task',
          referenceId: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          metadata: { distinctProducts: 5 },
        }),
      );
    });

    it('重复浏览命中去重窗口时不再累加', async () => {
      analyticsDedupService.claim.mockResolvedValue(false);

      await service.recordProductView('prod-1');

      expect(productRepository.increment).not.toHaveBeenCalled();
      expect(productInteractionEventRepository.save).not.toHaveBeenCalled();
    });

    it('should no-op when view tracking references a missing product', async () => {
      productInteractionEventRepository.save.mockRejectedValueOnce({
        driverError: { code: '23503' },
      });

      await expect(
        service.recordProductView('missing-prod'),
      ).resolves.toBeUndefined();

      expect(productRepository.increment).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'points.earn.request',
        expect.anything(),
      );
    });

    it('same visitor fast product scans skip view writes before dedup', async () => {
      const context = {
        userId: undefined,
        trustedVisitorId: 'visitor-view-scan',
        ipAddress: '203.0.113.20',
        userAgent: 'Mozilla/5.0',
      };

      for (let i = 1; i <= 18; i++) {
        await service.recordProductView(`prod-${i}`, context);
      }

      await service.recordProductView('prod-blocked', context);

      expect(analyticsDedupService.claim).toHaveBeenCalledTimes(18);
      expect(productRepository.increment).toHaveBeenCalledTimes(18);
      expect(productInteractionEventRepository.save).toHaveBeenCalledTimes(18);
    });

    it('high-volume IP product scans skip view writes before dedup', async () => {
      for (let i = 1; i <= 120; i++) {
        await service.recordProductView(`prod-${i}`, {
          userId: undefined,
          trustedVisitorId: `visitor-${i}`,
          ipAddress: '203.0.113.30',
          userAgent: 'Mozilla/5.0',
        });
      }

      await service.recordProductView('prod-blocked', {
        userId: undefined,
        trustedVisitorId: 'visitor-blocked',
        ipAddress: '203.0.113.30',
        userAgent: 'Mozilla/5.0',
      });

      expect(analyticsDedupService.claim).toHaveBeenCalledTimes(120);
      expect(productRepository.increment).toHaveBeenCalledTimes(120);
      expect(productInteractionEventRepository.save).toHaveBeenCalledTimes(120);
    });
  });

  describe('toggleFeatured()', () => {
    it('未推荐商品切换为推荐并触发同步事件', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        isFeatured: false,
      });

      const result = await service.toggleFeatured('prod-1');

      expect(result).toEqual({ isFeatured: true });
      expect(productRepository.update).toHaveBeenCalledWith('prod-1', {
        isFeatured: true,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('product.updated', {
        productId: 'prod-1',
      });
    });

    it('已推荐商品切换为未推荐并触发同步事件', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        isFeatured: true,
      });

      const result = await service.toggleFeatured('prod-1');

      expect(result).toEqual({ isFeatured: false });
      expect(productRepository.update).toHaveBeenCalledWith('prod-1', {
        isFeatured: false,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('product.updated', {
        productId: 'prod-1',
      });
    });

    it('商品不存在抛出 NotFoundException', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleFeatured('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateFeaturedSort()', () => {
    it('批量更新排序值并触发同步事件', async () => {
      productRepository.update.mockResolvedValue({ affected: 1 });

      const items = [
        { id: 'p1', featuredSort: 10 },
        { id: 'p2', featuredSort: 20 },
      ];
      const result = await service.updateFeaturedSort(items);

      expect(result).toEqual({ updated: 2 });
      expect(productRepository.update).toHaveBeenCalledWith('p1', {
        featuredSort: 10,
      });
      expect(productRepository.update).toHaveBeenCalledWith('p2', {
        featuredSort: 20,
      });
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(ProductEvents.UPDATED, {
        productId: 'p1',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(ProductEvents.UPDATED, {
        productId: 'p2',
      });
    });

    it('空数组返回更新 0', async () => {
      const result = await service.updateFeaturedSort([]);
      expect(result).toEqual({ updated: 0 });
    });
  });

  // ===== getSuggestions() =====
  describe('getSuggestions()', () => {
    it('should return empty results for short query', async () => {
      const result = await service.getSuggestions('a');
      expect(result).toEqual({ brands: [], categories: [], products: [] });
    });

    it('should return empty results for empty query', async () => {
      const result = await service.getSuggestions('');
      expect(result).toEqual({ brands: [], categories: [], products: [] });
    });

    it('should search brands, categories, and products in parallel', async () => {
      brandsService.search.mockResolvedValue([{ name: 'Nike' }]);
      categoriesService.search.mockResolvedValue([{ name: 'Shoes' }]);
      productQueryService.search.mockResolvedValue([{ title: 'Nike Air' }]);

      const result = await service.getSuggestions('nike');

      expect(brandsService.search).toHaveBeenCalledWith('nike', 3);
      expect(categoriesService.search).toHaveBeenCalledWith('nike', 3);
      expect(result.brands).toHaveLength(1);
      expect(result.categories).toHaveLength(1);
      expect(result.products).toHaveLength(1);
    });
  });

  // ===== Delegation tests =====
  describe('delegation', () => {
    it('findAll → productQueryService.findAll', async () => {
      const query = { page: 1, limit: 10 } as any;
      await service.findAll(query);
      expect(productQueryService.findAll).toHaveBeenCalledWith(
        query,
        undefined,
      );
    });

    it('findOne → productQueryService.findOne', async () => {
      await service.findOne('id-1');
      expect(productQueryService.findOne).toHaveBeenCalledWith('id-1');
    });

    it('findBySlug → productQueryService.findBySlug', async () => {
      await service.findBySlug('my-slug');
      expect(productQueryService.findBySlug).toHaveBeenCalledWith('my-slug');
    });

    it('generateBuyLink → productQueryService.generateBuyLink', async () => {
      await service.generateBuyLink('prod-1', 'superbuy');
      expect(productQueryService.generateBuyLink).toHaveBeenCalledWith(
        'prod-1',
        'superbuy',
      );
    });

    it('performStatusAction → productStatusService and syncs caches', async () => {
      productStatusService.performStatusAction.mockResolvedValue({
        id: 'id-1',
        slug: 'test-slug',
        status: 'active',
      });

      await service.performStatusAction('id-1', 'approve' as any);

      expect(productStatusService.performStatusAction).toHaveBeenCalledWith(
        'id-1',
        'approve',
        undefined,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(ProductEvents.UPDATED, {
        productId: 'id-1',
        changes: { status: 'active' },
        updatedAt: expect.any(Date),
      });
      expect(
        productQueryService.invalidateProductDetailCacheBySlug,
      ).toHaveBeenCalledWith('test-slug');
    });

    it('batchUpdatePrimaryCategory can expand by productGroupId and approve', async () => {
      productRepository.find
        .mockResolvedValueOnce([{ id: 'prod-1', productGroupId: 'group-1' }])
        .mockResolvedValueOnce([{ id: 'prod-1' }, { id: 'prod-2' }]);

      const updateSpy = jest.spyOn(service, 'update').mockResolvedValue({
        id: 'prod-1',
      } as Product);
      const performStatusActionSpy = jest
        .spyOn(service, 'performStatusAction')
        .mockResolvedValue({
          id: 'prod-1',
          slug: 'test-slug',
          status: 'active',
        } as Product);

      const result = await service.batchUpdatePrimaryCategory(
        ['prod-1'],
        'cat-leaf',
        {
          scope: 'group',
          approveAfterUpdate: true,
        },
      );

      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenNthCalledWith(1, 'prod-1', {
        primaryCategoryId: 'cat-leaf',
      });
      expect(updateSpy).toHaveBeenNthCalledWith(2, 'prod-2', {
        primaryCategoryId: 'cat-leaf',
      });
      expect(performStatusActionSpy).toHaveBeenCalledTimes(2);
      expect(performStatusActionSpy).toHaveBeenNthCalledWith(
        1,
        'prod-1',
        ProductStatusAction.APPROVE,
        { allowParentCategory: undefined },
      );
      expect(performStatusActionSpy).toHaveBeenNthCalledWith(
        2,
        'prod-2',
        ProductStatusAction.APPROVE,
        { allowParentCategory: undefined },
      );
      expect(result).toEqual({ success: ['prod-1', 'prod-2'], failed: [] });
    });

    it('batchUpdateStatus forwards allowParentCategory to manual review flow', async () => {
      productStatusService.performStatusAction.mockResolvedValue({
        id: 'id-1',
        slug: 'test-slug',
        status: 'active',
      });

      const result = await service.batchUpdateStatus(
        ['id-1'],
        ProductStatusAction.APPROVE,
        { allowParentCategory: true },
      );

      expect(productStatusService.performStatusAction).toHaveBeenCalledWith(
        'id-1',
        ProductStatusAction.APPROVE,
        { allowParentCategory: true },
      );
      expect(result).toEqual({ success: ['id-1'], failed: [] });
    });

    it('createSku → productSkuService.createSku', async () => {
      const dto = { productId: 'prod-1' } as any;
      await service.createSku(dto);
      expect(productSkuService.createSku).toHaveBeenCalledWith(dto);
    });

    it('importFromWeidian → productImportService', async () => {
      const dto = { url: 'https://weidian.com/item.html' } as any;
      await service.importFromWeidian(dto);
      expect(productImportService.importFromWeidian).toHaveBeenCalledWith(dto);
    });
  });
});
