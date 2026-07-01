import { Test, TestingModule } from '@nestjs/testing';
import { SearchSortingBoostService } from './search-sorting-boost.service';
import { SearchRankingService } from '../search/search-ranking.service';
import { Product } from './entities/product.entity';

describe('SearchSortingBoostService', () => {
  let service: SearchSortingBoostService;
  let mockRankingService: { rankProducts: jest.Mock };

  const createProduct = (overrides: Partial<Product> = {}): Product =>
    ({
      id: 'p1',
      title: 'Test Product',
      ctr: 0.5,
      aiAttributes: null,
      brand: null,
      primaryCategory: null,
      primaryCategoryId: null,
      ...overrides,
    }) as unknown as Product;

  beforeEach(async () => {
    mockRankingService = {
      rankProducts: jest.fn().mockImplementation((products) => products),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchSortingBoostService,
        { provide: SearchRankingService, useValue: mockRankingService },
      ],
    }).compile();

    service = module.get<SearchSortingBoostService>(SearchSortingBoostService);
  });

  describe('applySmartRanking', () => {
    it('should skip ranking when intentSortApplied is true', () => {
      const products = [createProduct()];
      const result = service.applySmartRanking(
        products,
        'nike',
        'relevance',
        true,
      );

      expect(result).toBe(products);
      expect(mockRankingService.rankProducts).not.toHaveBeenCalled();
    });

    it('should skip ranking when sortBy is not "relevance"', () => {
      const products = [createProduct()];
      const result = service.applySmartRanking(
        products,
        'nike',
        'price',
        false,
      );

      expect(result).toBe(products);
      expect(mockRankingService.rankProducts).not.toHaveBeenCalled();
    });

    it('should skip ranking when searchQuery is empty', () => {
      const products = [createProduct()];
      const result = service.applySmartRanking(
        products,
        '',
        'relevance',
        false,
      );

      expect(result).toBe(products);
      expect(mockRankingService.rankProducts).not.toHaveBeenCalled();
    });

    it('should skip ranking when products array is empty', () => {
      const result = service.applySmartRanking([], 'nike', 'relevance', false);

      expect(result).toEqual([]);
      expect(mockRankingService.rankProducts).not.toHaveBeenCalled();
    });

    it('should delegate to searchRankingService.rankProducts', () => {
      const products = [
        createProduct({ id: 'p1', title: 'Nike Shoes', ctr: 0.3 }),
        createProduct({ id: 'p2', title: 'Adidas Shoes', ctr: 0.7 }),
      ];

      service.applySmartRanking(products, 'nike shoes', 'relevance', false);

      expect(mockRankingService.rankProducts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Nike Shoes', ctr: 0.3 }),
          expect.objectContaining({ name: 'Adidas Shoes', ctr: 0.7 }),
        ]),
        ['nike', 'shoes'],
      );
    });

    it('should default ctr to 0 when missing', () => {
      const products = [createProduct({ ctr: undefined as any })];

      service.applySmartRanking(products, 'test', 'relevance', false);

      expect(mockRankingService.rankProducts).toHaveBeenCalledWith(
        [expect.objectContaining({ ctr: 0 })],
        ['test'],
      );
    });
  });

  describe('applyGenderWeightSort', () => {
    it('should return same array when gender is null', () => {
      const products = [createProduct()];
      const result = service.applyGenderWeightSort(products, null);
      expect(result).toBe(products);
    });

    it('should return same array when products are empty', () => {
      const result = service.applyGenderWeightSort([], 'men');
      expect(result).toEqual([]);
    });

    it('should return same array for invalid gender values', () => {
      const products = [createProduct()];
      const result = service.applyGenderWeightSort(products, 'unknown');
      expect(result).toBe(products);
    });

    it('should sort exact gender matches first, unisex second, others last', () => {
      const men = createProduct({
        id: 'men',
        aiAttributes: { gender: 'men' },
      });
      const women = createProduct({
        id: 'women',
        aiAttributes: { gender: 'women' },
      });
      const unisex = createProduct({
        id: 'unisex',
        aiAttributes: { gender: 'unisex' },
      });
      const none = createProduct({
        id: 'none',
        aiAttributes: {},
      });

      const result = service.applyGenderWeightSort(
        [none, unisex, women, men],
        'men',
      );

      expect(result.map((p) => p.id)).toEqual([
        'men',
        'unisex',
        'none', // both score 0, stable sort preserves original input order
        'women',
      ]);
    });

    it('should handle case-insensitive gender matching', () => {
      const product = createProduct({
        id: 'p1',
        aiAttributes: { gender: 'Men' },
      });
      const other = createProduct({
        id: 'p2',
        aiAttributes: { gender: 'women' },
      });

      const result = service.applyGenderWeightSort([other, product], 'Men');

      expect(result[0].id).toBe('p1');
    });

    it('should not mutate the original array', () => {
      const products = [
        createProduct({ id: 'p1', aiAttributes: { gender: 'women' } }),
        createProduct({ id: 'p2', aiAttributes: { gender: 'men' } }),
      ];
      const originalOrder = products.map((p) => p.id);

      service.applyGenderWeightSort(products, 'men');

      expect(products.map((p) => p.id)).toEqual(originalOrder);
    });
  });

  describe('applyPreferenceBoost', () => {
    it('should return same array when products are empty', () => {
      const result = service.applyPreferenceBoost([], ['b1'], ['c1']);
      expect(result).toEqual([]);
    });

    it('should return same array when no preferences provided', () => {
      const products = [createProduct()];
      const result = service.applyPreferenceBoost(products, [], []);
      expect(result).toBe(products);
    });

    it('should boost products matching preferred brands', () => {
      const boosted = createProduct({
        id: 'boosted',
        brand: { id: 'brand1', name: 'Nike' } as any,
      });
      const normal = createProduct({
        id: 'normal',
        brand: { id: 'brand2', name: 'Adidas' } as any,
      });

      const result = service.applyPreferenceBoost(
        [normal, boosted],
        ['brand1'],
        [],
      );

      expect(result[0].id).toBe('boosted');
    });

    it('should boost products matching preferred categories', () => {
      const boosted = createProduct({
        id: 'boosted',
        primaryCategoryId: 'cat1',
      });
      const normal = createProduct({
        id: 'normal',
        primaryCategoryId: 'cat2',
      });

      const result = service.applyPreferenceBoost(
        [normal, boosted],
        [],
        ['cat1'],
      );

      expect(result[0].id).toBe('boosted');
    });

    it('should apply higher boost to earlier-ranked preferences', () => {
      const brand1 = createProduct({
        id: 'first-pref',
        brand: { id: 'b1', name: 'First' } as any,
      });
      const brand2 = createProduct({
        id: 'second-pref',
        brand: { id: 'b2', name: 'Second' } as any,
      });

      const result = service.applyPreferenceBoost(
        [brand2, brand1],
        ['b1', 'b2'],
        [],
      );

      // b1 gets 0.3 - 0*0.05 = 0.3, b2 gets 0.3 - 1*0.05 = 0.25
      expect(result[0].id).toBe('first-pref');
    });

    it('should return unchanged when skipReSort is true and boosts exist', () => {
      const products = [
        createProduct({
          id: 'normal',
          brand: { id: 'other', name: 'Other' } as any,
        }),
        createProduct({
          id: 'boosted',
          brand: { id: 'b1', name: 'Nike' } as any,
        }),
      ];

      const result = service.applyPreferenceBoost(products, ['b1'], [], true);

      expect(result).toBe(products);
    });

    it('should return unchanged when no products match preferences', () => {
      const products = [
        createProduct({ brand: { id: 'other', name: 'Other' } as any }),
      ];

      const result = service.applyPreferenceBoost(
        products,
        ['nonexistent'],
        [],
      );

      expect(result).toBe(products);
    });

    it('should preserve original order for products with equal boost scores', () => {
      const p1 = createProduct({ id: 'p1' });
      const p2 = createProduct({ id: 'p2' });
      const boosted = createProduct({
        id: 'boosted',
        brand: { id: 'b1', name: 'Nike' } as any,
      });

      const result = service.applyPreferenceBoost(
        [p1, p2, boosted],
        ['b1'],
        [],
      );

      // boosted comes first, then p1 and p2 preserve their relative order
      expect(result[0].id).toBe('boosted');
      expect(result[1].id).toBe('p1');
      expect(result[2].id).toBe('p2');
    });
  });

  describe('applyGiftCategoryBoost', () => {
    it('should return same array when products are empty', () => {
      const result = service.applyGiftCategoryBoost([]);
      expect(result).toEqual([]);
    });

    it('should rank jewelry higher than sneakers', () => {
      const jewelry = createProduct({
        id: 'jewelry',
        primaryCategory: { slug: 'jewelry' } as any,
      });
      const sneakers = createProduct({
        id: 'sneakers',
        primaryCategory: { slug: 'sneakers' } as any,
      });

      const result = service.applyGiftCategoryBoost([sneakers, jewelry]);

      expect(result[0].id).toBe('jewelry');
    });

    it('should give luxury brands +20 bonus', () => {
      const luxury = createProduct({
        id: 'luxury',
        primaryCategory: { slug: 'shoes' } as any, // 85 + 20 = 105
        brand: { slug: 'gucci' } as any,
      });
      const nonLuxury = createProduct({
        id: 'non-luxury',
        primaryCategory: { slug: 'belts' } as any, // 105
        brand: { slug: 'generic' } as any,
      });

      const result = service.applyGiftCategoryBoost([nonLuxury, luxury]);

      // luxury: 85 + 20 = 105, nonLuxury: 105
      // Both at 105, so original order preserved
      expect(result[0].id).toBe('non-luxury');
      expect(result[1].id).toBe('luxury');
    });

    it('should use default score 50 for unknown categories', () => {
      const known = createProduct({
        id: 'known',
        primaryCategory: { slug: 'jewelry' } as any, // 150
      });
      const unknown = createProduct({
        id: 'unknown',
        primaryCategory: { slug: 'unknown-cat' } as any, // 50 (default)
      });

      const result = service.applyGiftCategoryBoost([unknown, known]);

      expect(result[0].id).toBe('known');
    });

    it('should handle products without primaryCategory', () => {
      const withCategory = createProduct({
        id: 'with',
        primaryCategory: { slug: 'jewelry' } as any,
      });
      const without = createProduct({
        id: 'without',
        primaryCategory: null as any,
      });

      const result = service.applyGiftCategoryBoost([without, withCategory]);

      expect(result[0].id).toBe('with');
    });

    it('should preserve original order for products with equal gift scores', () => {
      const p1 = createProduct({
        id: 'p1',
        primaryCategory: { slug: 'necklaces' } as any, // 145
      });
      const p2 = createProduct({
        id: 'p2',
        primaryCategory: { slug: 'bracelets' } as any, // 145
      });

      const result = service.applyGiftCategoryBoost([p1, p2]);

      expect(result[0].id).toBe('p1');
      expect(result[1].id).toBe('p2');
    });
  });
});
