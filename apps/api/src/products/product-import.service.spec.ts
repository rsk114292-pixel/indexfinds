import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductImportService } from './product-import.service';
import { Product } from './entities/product.entity';
import { WeidianService } from '../weidian/weidian.service';
import { ProductAIEnhancerService } from './product-ai-enhancer.service';
import { ProductCreatorService } from './product-creator.service';
import { ProductDataMapperService } from './product-data-mapper.service';
import { ProductEvents } from '../shared/events';
import { ProductStatus } from './product-status';
import { BrandGovernanceService } from '../brands/brand-governance.service';

describe('ProductImportService', () => {
  let service: ProductImportService;
  let weidianService: any;
  let aiEnhancerService: any;
  let creatorService: any;
  let dataMapper: any;
  let brandGovernanceService: any;
  let eventEmitter: any;
  let productRepository: any;

  // ===== Shared test fixtures =====
  const mockProduct = {
    id: 'prod-1',
    slug: 'nike-shoes-abc',
    title: 'Nike Air Max',
    originalTitle: '耐克气垫鞋',
    weidianItemId: '123456',
    primaryCategoryId: 'cat-1',
    priceMin: 100,
    priceMax: 200,
    images: ['img1.jpg'],
  };

  const mockSkus = [
    {
      id: 'sku-1',
      weidianSkuId: 'ws-1',
      attributes: { size: '42' },
      price: 150,
      stock: 10,
    },
  ];

  const mockWeidianData = {
    title: '耐克气垫鞋',
    mainImage: 'main.jpg',
    images: ['img1.jpg', 'img2.jpg'],
    detailImages: ['detail1.jpg'],
    shopId: 'shop-1',
    shopName: '测试店铺',
    skus: [{ skuId: 'ws-1', price: 150 }],
    rawSkuInfo: {},
    rawDetailDesc: {},
  };

  const mockAiResult = {
    translatedTitle: 'Nike Air Max',
    translatedDescription: 'Comfortable shoes',
    aiBrandName: 'Nike',
    aiCategorySlug: 'sneakers',
    aiConfidence: 0.9,
    aiAttributes: { colors: ['black'] },
    warnings: [],
  };

  const mockBrandResult = {
    brandId: 'brand-1',
    aiBrandName: 'Nike',
    warnings: [],
  };

  const mockCategory = {
    id: 'cat-1',
    slug: 'sneakers',
    name: 'Sneakers',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    weidianService = {
      scrapeItem: jest.fn().mockResolvedValue(mockWeidianData),
      extractItemId: jest.fn().mockReturnValue('123456'),
    };

    aiEnhancerService = {
      analyzeAndEnhance: jest.fn().mockResolvedValue(mockAiResult),
      analyzeAndEnhanceComprehensive: jest.fn(),
      resolveCategoryFromSlug: jest.fn().mockResolvedValue('cat-1'),
      processBrand: jest.fn().mockResolvedValue(mockBrandResult),
      determineStatusByConfidence: jest.fn().mockReturnValue('active'),
      determineStatusByMixedness: jest.fn().mockReturnValue('active'),
    };

    creatorService = {
      findExistingProduct: jest.fn().mockResolvedValue(null),
      validateAndGetPrimaryCategory: jest.fn().mockResolvedValue(mockCategory),
      getSecondaryCategories: jest
        .fn()
        .mockResolvedValue({ categories: [], warnings: [] }),
      generateSlug: jest.fn().mockResolvedValue('nike-sneakers-abc'),
      createProductWithSkus: jest.fn().mockResolvedValue({
        product: mockProduct,
        skus: mockSkus,
        warnings: [],
      }),
    };

    dataMapper = {
      buildExistingProductResult: jest.fn().mockReturnValue({
        success: true,
        product: mockProduct,
        skus: [],
      }),
      mapWeidianSkus: jest.fn().mockReturnValue([]),
      mapSourceSkus: jest.fn().mockReturnValue([]),
      buildSkuHints: jest.fn().mockReturnValue('SKU hints'),
    };

    brandGovernanceService = {
      syncProductBrandDecision: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    productRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImportService,
        { provide: WeidianService, useValue: weidianService },
        {
          provide: ProductAIEnhancerService,
          useValue: aiEnhancerService,
        },
        { provide: ProductCreatorService, useValue: creatorService },
        {
          provide: ProductDataMapperService,
          useValue: dataMapper,
        },
        {
          provide: BrandGovernanceService,
          useValue: brandGovernanceService,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get<ProductImportService>(ProductImportService);
  });

  // ========== importFromWeidian ==========

  describe('importFromWeidian', () => {
    const baseDto = {
      itemId: '123456',
      primaryCategoryId: 'cat-1',
      title: '测试商品',
    };

    it('should import product successfully with itemId', async () => {
      const result = await service.importFromWeidian(baseDto);

      expect(result.success).toBe(true);
      expect(result.product).toBeDefined();
      expect(result.product!.id).toBe('prod-1');
      expect(result.skus).toHaveLength(1);
    });

    it('should extract itemId from URL when itemId not provided', async () => {
      const dto = {
        url: 'https://weidian.com/item.html?itemID=123456',
        primaryCategoryId: 'cat-1',
      };

      await service.importFromWeidian(dto);

      expect(weidianService.scrapeItem).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: '123456' }),
      );
    });

    it('should return existing product if already imported', async () => {
      creatorService.findExistingProduct.mockResolvedValue(mockProduct);

      const result = await service.importFromWeidian(baseDto);

      expect(result.success).toBe(true);
      expect(dataMapper.buildExistingProductResult).toHaveBeenCalledWith(
        mockProduct,
      );
      expect(weidianService.scrapeItem).not.toHaveBeenCalled();
    });

    it('should throw if URL extraction fails', async () => {
      weidianService.extractItemId.mockReturnValue(null);

      const result = await service.importFromWeidian({
        url: 'https://invalid.com',
        primaryCategoryId: 'cat-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should throw if neither url nor itemId provided', async () => {
      const result = await service.importFromWeidian({
        primaryCategoryId: 'cat-1',
      } as any);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('必须提供');
    });

    it('should fail if scrape returns null', async () => {
      weidianService.scrapeItem.mockResolvedValue(null);

      const result = await service.importFromWeidian(baseDto);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('抓取微店商品数据失败');
    });

    it('should use AI category when no primaryCategoryId given', async () => {
      const dto = { itemId: '123456' } as any;
      aiEnhancerService.resolveCategoryFromSlug.mockResolvedValue('cat-ai');

      await service.importFromWeidian(dto);

      expect(aiEnhancerService.resolveCategoryFromSlug).toHaveBeenCalledWith(
        'sneakers',
      );
    });

    it('should fail if no category resolved', async () => {
      const dto = { itemId: '123456' } as any;
      aiEnhancerService.resolveCategoryFromSlug.mockResolvedValue(null);

      const result = await service.importFromWeidian(dto);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('primaryCategoryId');
    });

    it('should collect warnings from all stages', async () => {
      aiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        ...mockAiResult,
        warnings: ['AI warn'],
      });
      aiEnhancerService.processBrand.mockResolvedValue({
        ...mockBrandResult,
        warnings: ['Brand warn'],
      });
      creatorService.getSecondaryCategories.mockResolvedValue({
        categories: [],
        warnings: ['Cat warn'],
      });
      creatorService.createProductWithSkus.mockResolvedValue({
        product: mockProduct,
        skus: mockSkus,
        warnings: ['Create warn'],
      });

      const result = await service.importFromWeidian(baseDto);

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          'AI warn',
          'Brand warn',
          'Cat warn',
          'Create warn',
        ]),
      );
    });

    it('should emit IMPORT_FAILED event on error', async () => {
      weidianService.scrapeItem.mockRejectedValue(new Error('Network'));

      await service.importFromWeidian(baseDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProductEvents.IMPORT_FAILED,
        expect.objectContaining({
          source: 'weidian',
          error: 'Network',
        }),
      );
    });
  });

  // ========== importFromWeidianWithMixedDetection ==========

  describe('importFromWeidianWithMixedDetection', () => {
    const baseDto = {
      itemId: '123456',
      primaryCategoryId: 'cat-1',
      title: '测试商品',
    };

    const mockComprehensiveResult = {
      ...mockAiResult,
      isMixedProduct: true,
      mixednessScore: 0.85,
      processingStrategy: 'manual_review',
      comprehensiveAnalysis: {
        suggestedGroups: [{ id: 'g1' }, { id: 'g2' }],
        overallConfidence: 0.9,
      },
    };

    beforeEach(() => {
      aiEnhancerService.analyzeAndEnhanceComprehensive.mockResolvedValue(
        mockComprehensiveResult,
      );
    });

    it('should import with mixed product detection data', async () => {
      const result = await service.importFromWeidianWithMixedDetection(baseDto);

      expect(result.success).toBe(true);
      expect(result.isMixedProduct).toBe(true);
      expect(result.mixednessScore).toBe(0.85);
      expect(result.suggestedGroupCount).toBe(2);
    });

    it('should return existing product if already exists', async () => {
      creatorService.findExistingProduct.mockResolvedValue(mockProduct);

      const result = await service.importFromWeidianWithMixedDetection(baseDto);

      expect(result.success).toBe(true);
      expect(
        aiEnhancerService.analyzeAndEnhanceComprehensive,
      ).not.toHaveBeenCalled();
    });

    it('should combine main + detail images for analysis', async () => {
      await service.importFromWeidianWithMixedDetection(baseDto);

      expect(
        aiEnhancerService.analyzeAndEnhanceComprehensive,
      ).toHaveBeenCalledWith(
        ['img1.jpg', 'img2.jpg', 'detail1.jpg'],
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });

    it('should use determineStatusByMixedness instead of byConfidence', async () => {
      await service.importFromWeidianWithMixedDetection(baseDto);

      expect(aiEnhancerService.determineStatusByMixedness).toHaveBeenCalledWith(
        0.9,
        true,
        'manual_review',
        undefined,
      );
      expect(
        aiEnhancerService.determineStatusByConfidence,
      ).not.toHaveBeenCalled();
    });

    it('should emit IMPORT_FAILED event on error', async () => {
      weidianService.scrapeItem.mockRejectedValue(new Error('Timeout'));

      const result = await service.importFromWeidianWithMixedDetection(baseDto);

      expect(result.success).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProductEvents.IMPORT_FAILED,
        expect.objectContaining({ error: 'Timeout' }),
      );
    });
  });

  // ========== createProductFromBatchItem ==========

  describe('createProductFromBatchItem', () => {
    const batchData = {
      sourceUrl: 'https://weidian.com/item.html?itemID=123456',
      sourceData: {
        title: '耐克气垫鞋',
        images: ['img1.jpg'],
        mainImage: 'main.jpg',
        skus: [],
        shopId: 'shop-1',
        shopName: '测试店铺',
      },
      aiData: {
        title: 'Nike Air Max',
        primaryCategoryId: 'cat-1',
        brandName: 'Nike',
        brandId: 'brand-1',
      },
    };

    it('should create product from batch data', async () => {
      const result = await service.createProductFromBatchItem(batchData);

      expect(result.success).toBe(true);
      expect(result.product!.id).toBe('prod-1');
      expect(creatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nike Air Max',
          weidianItemId: '123456',
          status: 'active',
        }),
        expect.any(Array),
        false,
      );
    });

    it('should return existing product result if already exists', async () => {
      creatorService.findExistingProduct.mockResolvedValue(mockProduct);

      const result = await service.createProductFromBatchItem(batchData);

      expect(result.success).toBe(true);
      expect(dataMapper.buildExistingProductResult).toHaveBeenCalled();
      expect(creatorService.createProductWithSkus).not.toHaveBeenCalled();
    });

    it('should update existing product with mixed analysis data', async () => {
      const existing = { ...mockProduct, splitMetadata: null };
      creatorService.findExistingProduct.mockResolvedValue(existing);

      const data = {
        ...batchData,
        aiData: {
          ...batchData.aiData,
          mixednessScore: 0.9,
          isMixedProduct: true,
          comprehensiveAnalysis: { suggestedGroups: [] } as any,
          processingStrategy: 'manual_review' as const,
        },
      };

      await service.createProductFromBatchItem(data);

      expect(productRepository.update).toHaveBeenCalledWith(
        mockProduct.id,
        expect.objectContaining({
          mixednessScore: 0.9,
          mixednessEvaluated: true,
          potentialMixedProduct: true,
          status: 'pending_review',
        }),
      );
    });

    it('should set status to pending_review for mixed products', async () => {
      const data = {
        ...batchData,
        aiData: {
          ...batchData.aiData,
          isMixedProduct: true,
        },
      };

      await service.createProductFromBatchItem(data);

      expect(creatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending_review' }),
        expect.any(Array),
        false,
      );
    });

    it('should use status override when provided', async () => {
      const data = { ...batchData, status: ProductStatus.DRAFT };

      await service.createProductFromBatchItem(data);

      expect(creatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
        expect.any(Array),
        false,
      );
    });

    it('should fail if URL has no itemId', async () => {
      weidianService.extractItemId.mockReturnValue(null);

      const result = await service.createProductFromBatchItem(batchData);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('无法从 URL 提取 itemId');
    });

    it('should return error result on exception', async () => {
      creatorService.validateAndGetPrimaryCategory.mockRejectedValue(
        new Error('Category not found'),
      );

      const result = await service.createProductFromBatchItem(batchData);

      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('Category not found');
    });
  });
});
