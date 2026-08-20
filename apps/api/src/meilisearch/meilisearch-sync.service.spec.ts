import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MeilisearchSyncService } from './meilisearch-sync.service';
import { MeilisearchService } from './meilisearch.service';
import { MeilisearchIndexService } from './meilisearch-index.service';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductStatus } from '../products/product-status';

describe('MeilisearchSyncService', () => {
  let service: MeilisearchSyncService;
  let productRepo: any;
  let categoryRepo: any;
  let meilisearchService: any;
  let indexService: any;
  let dataSource: any;

  const mockProduct = {
    id: 'prod-1',
    productGroupId: 'group-1',
    title: 'Nike Air Force 1',
    originalTitle: '耐克空军一号',
    description: '<p>Great shoe</p>',
    slug: 'nike-air-force-1',
    mainImage: 'https://img.com/1.jpg',
    currency: 'CNY',
    status: 'active',
    priceMin: 100,
    priceMax: 200,
    isFeatured: false,
    hasVariants: false,
    viewCount: 50,
    salesCount: 10,
    clickCount: 5,
    ctr: 0.1,
    aiBrandName: 'Nike',
    aiAttributes: { gender: 'Men' },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    brand: { id: 'b1', name: 'Nike', slug: 'nike' },
    brandId: 'b1',
    primaryCategory: { id: 'c1', name: 'Sneakers', slug: 'sneakers' },
    primaryCategoryId: 'c1',
    secondaryCategories: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    productRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      manager: {
        query: jest.fn().mockResolvedValue([]),
        getTreeRepository: jest.fn().mockReturnValue({
          findAncestors: jest.fn().mockResolvedValue([]),
        }),
      },
    };

    categoryRepo = {
      manager: {
        getTreeRepository: jest.fn().mockReturnValue({
          findAncestors: jest.fn().mockResolvedValue([]),
        }),
      },
    };

    meilisearchService = {
      getClient: jest.fn().mockReturnValue({
        index: jest.fn().mockReturnValue({
          addDocuments: jest
            .fn()
            .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
        }),
      }),
      updateDocuments: jest.fn().mockResolvedValue(undefined),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
    };

    indexService = {
      createTempIndex: jest.fn().mockResolvedValue('products_tmp'),
      swapAndCleanup: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeilisearchSyncService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: MeilisearchService, useValue: meilisearchService },
        { provide: MeilisearchIndexService, useValue: indexService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<MeilisearchSyncService>(MeilisearchSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncProduct', () => {
    it('should load product and update in meilisearch', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);

      await service.syncProduct('prod-1');

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        relations: ['brand', 'primaryCategory', 'secondaryCategories'],
      });
      expect(meilisearchService.updateDocuments).toHaveBeenCalledTimes(1);
    });

    it('should skip if product not found', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await service.syncProduct('nonexistent');

      expect(meilisearchService.updateDocuments).not.toHaveBeenCalled();
    });

    it('should remove inactive products from meilisearch instead of indexing them', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.INACTIVE,
      });

      await service.syncProduct('prod-1');

      expect(meilisearchService.deleteDocument).toHaveBeenCalledWith('prod-1');
      expect(meilisearchService.updateDocuments).not.toHaveBeenCalled();
    });
  });

  describe('removeProduct', () => {
    it('should delete document from meilisearch', async () => {
      await service.removeProduct('prod-1');
      expect(meilisearchService.deleteDocument).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('transformProduct', () => {
    it('should strip HTML from description', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.description).toBe('Great shoe');
    });

    it('should index the catalog grouping key', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.productGroupId).toBe('group-1');

      const ungrouped = await service.transformProduct({
        ...mockProduct,
        productGroupId: null,
      } as any);
      expect(ungrouped.productGroupId).toBe('prod-1');
    });

    it('should map brand object', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.brand).toEqual({ id: 'b1', name: 'Nike', slug: 'nike' });
      expect(doc.brandSlug).toBe('nike');
      expect(doc.brandName).toBe('Nike');
    });

    it('should map primaryCategory object', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.primaryCategory).toEqual({
        id: 'c1',
        name: 'Sneakers',
        slug: 'sneakers',
      });
      expect(doc.categoryName).toBe('Sneakers');
    });

    it('should convert createdAt to unix timestamp', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.createdAt).toBe(new Date('2026-01-01').getTime());
    });

    it('should convert priceMin/priceMax to numbers', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.priceMin).toBe(100);
      expect(doc.priceMax).toBe(200);
    });

    it('should fall back to aiAttributes.gender when attributes have no genders', async () => {
      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.genders).toEqual(['Men']);
    });

    it('should use attribute values from DB when available', async () => {
      productRepo.manager.query.mockResolvedValue([
        { value: 'Black', attr_name: 'color' },
        { value: 'Street', attr_name: 'style' },
        { value: 'Men', attr_name: 'gender' },
      ]);

      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.colors).toEqual(['Black']);
      expect(doc.styles).toEqual(['Street']);
      expect(doc.genders).toEqual(['Men']);
    });

    it('should handle null brand gracefully', async () => {
      const productNoBrand = { ...mockProduct, brand: null, brandId: null };
      const doc = await service.transformProduct(productNoBrand as any);
      expect(doc.brand).toBeNull();
      expect(doc.brandSlug).toBe('');
      expect(doc.brandName).toBe('');
    });

    it('should include ancestor slugs in allCategorySlugs', async () => {
      categoryRepo.manager.getTreeRepository.mockReturnValue({
        findAncestors: jest.fn().mockResolvedValue([
          { id: 'c0', slug: 'shoes' },
          { id: 'c1', slug: 'sneakers' },
        ]),
      });

      const doc = await service.transformProduct(mockProduct as any);
      expect(doc.allCategorySlugs).toContain('sneakers');
      expect(doc.allCategorySlugs).toContain('shoes');
    });
  });

  describe('syncProductsByBrand', () => {
    it('should sync all products with given brandId', async () => {
      productRepo.find.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      productRepo.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, id: 'p2' });

      await service.syncProductsByBrand('b1');

      expect(productRepo.find).toHaveBeenCalledWith({
        where: { brandId: 'b1' },
        select: ['id'],
      });
      expect(meilisearchService.updateDocuments).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncProductsByCategory', () => {
    it('should sync primary and secondary category products', async () => {
      productRepo.find.mockResolvedValue([{ id: 'p1' }]);
      productRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'p2' }]),
      });
      productRepo.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, id: 'p2' });

      await service.syncProductsByCategory('c1');

      expect(meilisearchService.updateDocuments).toHaveBeenCalledTimes(2);
    });
  });

  describe('fullSync', () => {
    it('should create temp index, batch sync, then swap', async () => {
      // First call returns products, second returns empty (end of pagination)
      productRepo.find
        .mockResolvedValueOnce([mockProduct])
        .mockResolvedValueOnce([]);

      const result = await service.fullSync();

      expect(productRepo.find).toHaveBeenNthCalledWith(1, {
        where: { status: ProductStatus.ACTIVE },
        relations: ['brand', 'primaryCategory', 'secondaryCategories'],
        order: { createdAt: 'ASC' },
        skip: 0,
        take: 500,
      });
      expect(indexService.createTempIndex).toHaveBeenCalled();
      expect(indexService.swapAndCleanup).toHaveBeenCalledWith('products_tmp');
      expect(result.synced).toBe(1);
    });

    it('should handle empty database', async () => {
      productRepo.find.mockResolvedValue([]);

      const result = await service.fullSync();

      expect(result.synced).toBe(0);
      expect(indexService.swapAndCleanup).toHaveBeenCalled();
    });
  });
});
