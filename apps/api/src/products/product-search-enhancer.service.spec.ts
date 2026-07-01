import { Test, TestingModule } from '@nestjs/testing';
import { ProductSearchEnhancerService } from './product-search-enhancer.service';
import { Product } from './entities/product.entity';
import { SearchSpellCorrectionService } from './search-spell-correction.service';
import { SearchRecallEnhancerService } from './search-recall-enhancer.service';
import { SearchSortingBoostService } from './search-sorting-boost.service';

describe('ProductSearchEnhancerService', () => {
  let service: ProductSearchEnhancerService;

  const mockProduct = {
    id: 'product-1',
    title: 'Nike Air Max',
    slug: 'nike-air-max',
    status: 'active',
    priceMin: 100,
    viewCount: 50,
    salesCount: 10,
    createdAt: new Date(),
    brand: { id: 'brand-1', slug: 'nike' },
    primaryCategory: { id: 'cat-1', slug: 'shoes' },
    aiAttributes: { gender: 'men' },
  } as unknown as Product;

  const mockSpellCorrectionService = {
    trySpellCorrection: jest.fn().mockResolvedValue(null),
  };

  const mockRecallEnhancerService = {
    tryMultiPathRecall: jest.fn().mockResolvedValue(null),
    trySemanticEnhance: jest
      .fn()
      .mockImplementation((products) => Promise.resolve(products)),
  };

  const mockSortingBoostService = {
    applySmartRanking: jest.fn().mockImplementation((products) => products),
    applyGenderWeightSort: jest.fn().mockImplementation((products) => products),
    applyPreferenceBoost: jest.fn().mockImplementation((products) => products),
    applyGiftCategoryBoost: jest
      .fn()
      .mockImplementation((products) => products),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSearchEnhancerService,
        {
          provide: SearchSpellCorrectionService,
          useValue: mockSpellCorrectionService,
        },
        {
          provide: SearchRecallEnhancerService,
          useValue: mockRecallEnhancerService,
        },
        {
          provide: SearchSortingBoostService,
          useValue: mockSortingBoostService,
        },
      ],
    }).compile();

    service = module.get<ProductSearchEnhancerService>(
      ProductSearchEnhancerService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trySpellCorrection', () => {
    const sortConfig = {
      relevance: { field: 'createdAt', order: 'DESC' as const },
      newest: { field: 'createdAt', order: 'DESC' as const },
      price_asc: { field: 'priceMin', order: 'ASC' as const },
    };

    it('应委托给 spellCorrectionService 并返回结果', async () => {
      mockSpellCorrectionService.trySpellCorrection.mockResolvedValue(null);

      const result = await service.trySpellCorrection(
        'nike',
        'relevance',
        sortConfig,
        0,
        20,
      );

      expect(result).toBeNull();
      expect(
        mockSpellCorrectionService.trySpellCorrection,
      ).toHaveBeenCalledWith('nike', 'relevance', sortConfig, 0, 20);
    });

    it('纠正成功时应返回子服务的结果', async () => {
      const correctionResult = {
        correctedQuery: 'nike',
        wasChanged: true,
        data: [mockProduct],
        total: 1,
      };
      mockSpellCorrectionService.trySpellCorrection.mockResolvedValue(
        correctionResult,
      );

      const result = await service.trySpellCorrection(
        'nkie',
        'relevance',
        sortConfig,
        0,
        20,
      );

      expect(result).not.toBeNull();
      expect(result?.correctedQuery).toBe('nike');
      expect(result?.wasChanged).toBe(true);
      expect(result?.data).toHaveLength(1);
    });
  });

  describe('tryMultiPathRecall', () => {
    it('应委托给 recallEnhancerService', async () => {
      const recallResult = { products: [mockProduct], total: 1 };
      mockRecallEnhancerService.tryMultiPathRecall.mockResolvedValue(
        recallResult,
      );

      const result = await service.tryMultiPathRecall(
        'nike shoes',
        null,
        {},
        'relevance',
        false,
        20,
        0,
      );

      expect(result).not.toBeNull();
      expect(result?.products).toHaveLength(1);
      expect(mockRecallEnhancerService.tryMultiPathRecall).toHaveBeenCalled();
    });

    it('召回无结果时应返回 null', async () => {
      mockRecallEnhancerService.tryMultiPathRecall.mockResolvedValue(null);

      const result = await service.tryMultiPathRecall(
        'xyz123',
        null,
        {},
        'relevance',
        false,
        20,
        0,
      );

      expect(result).toBeNull();
    });
  });

  describe('trySemanticEnhance', () => {
    it('应委托给 recallEnhancerService.trySemanticEnhance', async () => {
      const existingProducts = [
        mockProduct,
        { ...mockProduct, id: 'product-2' },
      ];
      mockRecallEnhancerService.trySemanticEnhance.mockResolvedValue(
        existingProducts,
      );

      const result = await service.trySemanticEnhance(
        existingProducts,
        'nike',
        2,
      );

      expect(result).toHaveLength(2);
      expect(mockRecallEnhancerService.trySemanticEnhance).toHaveBeenCalledWith(
        existingProducts,
        'nike',
        2,
      );
    });
  });

  describe('applySmartRanking', () => {
    it('应委托给 sortingBoostService.applySmartRanking', () => {
      const products = [
        { ...mockProduct, viewCount: 10 },
        { ...mockProduct, id: 'product-2', viewCount: 100 },
      ];

      mockSortingBoostService.applySmartRanking.mockReturnValue(products);

      const result = service.applySmartRanking(
        products,
        'nike',
        'relevance',
        false,
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockSortingBoostService.applySmartRanking).toHaveBeenCalledWith(
        products,
        'nike',
        'relevance',
        false,
      );
    });
  });

  describe('applyPreferenceBoost', () => {
    it('应委托给 sortingBoostService.applyPreferenceBoost', () => {
      const products = [
        {
          ...mockProduct,
          id: 'product-1',
          brand: { id: 'brand-other', slug: 'adidas' },
        },
        {
          ...mockProduct,
          id: 'product-2',
          brand: { id: 'brand-1', slug: 'nike' },
        },
      ] as unknown as Product[];

      mockSortingBoostService.applyPreferenceBoost.mockReturnValue(products);

      const result = service.applyPreferenceBoost(
        products,
        ['brand-1'],
        [],
        false,
      );

      expect(mockSortingBoostService.applyPreferenceBoost).toHaveBeenCalledWith(
        products,
        ['brand-1'],
        [],
        false,
      );
      expect(result).toBeDefined();
    });
  });

  describe('applyGenderWeightSort', () => {
    it('应委托给 sortingBoostService.applyGenderWeightSort', () => {
      const products = [
        { ...mockProduct, id: 'product-1', aiAttributes: { gender: 'unisex' } },
        { ...mockProduct, id: 'product-2', aiAttributes: { gender: 'women' } },
      ];

      mockSortingBoostService.applyGenderWeightSort.mockReturnValue(products);

      const result = service.applyGenderWeightSort(products, 'women');

      expect(
        mockSortingBoostService.applyGenderWeightSort,
      ).toHaveBeenCalledWith(products, 'women');
      expect(result).toBeDefined();
    });
  });

  describe('applyGiftCategoryBoost', () => {
    it('应委托给 sortingBoostService.applyGiftCategoryBoost', () => {
      const products = [
        {
          ...mockProduct,
          id: 'product-1',
          primaryCategory: { slug: 't-shirts' },
        },
        {
          ...mockProduct,
          id: 'product-2',
          primaryCategory: { slug: 'jewelry' },
        },
      ] as unknown as Product[];

      mockSortingBoostService.applyGiftCategoryBoost.mockReturnValue(products);

      const result = service.applyGiftCategoryBoost(products);

      expect(
        mockSortingBoostService.applyGiftCategoryBoost,
      ).toHaveBeenCalledWith(products);
      expect(result).toBeDefined();
    });
  });
});
