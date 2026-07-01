import { Test, TestingModule } from '@nestjs/testing';
import { SmartRankingProcessor } from './smart-ranking.processor';
import { ProductSearchEnhancerService } from '../../products/product-search-enhancer.service';
import { SearchContext } from '../orchestrator/search-context';

describe('SmartRankingProcessor', () => {
  let processor: SmartRankingProcessor;
  let mockEnhancerService: {
    applySmartRanking: jest.Mock;
    applyPreferenceBoost: jest.Mock;
    applyGiftCategoryBoost: jest.Mock;
    applyGenderWeightSort: jest.Mock;
  };

  const createContext = (
    overrides: {
      query?: string;
      sortBy?: string;
      gender?: string;
      preferredBrands?: string;
      preferredCategories?: string;
      products?: any[];
      total?: number;
      correctedQuery?: string;
      filters?: Record<string, any>;
      analysis?: any;
    } = {},
  ): SearchContext => {
    const ctx = new SearchContext({
      query: overrides.query ?? 'test query',
      page: 1,
      limit: 20,
      sortBy: overrides.sortBy ?? 'relevance',
      sortOrder: 'DESC',
      gender: overrides.gender,
      preferredBrands: overrides.preferredBrands,
      preferredCategories: overrides.preferredCategories,
      filters: overrides.filters ?? {},
    });

    const products = overrides.products ?? [
      { id: '1', title: 'Product 1' },
      { id: '2', title: 'Product 2' },
    ];

    ctx.setResult({
      products,
      total: overrides.total ?? products.length,
      correctedQuery: overrides.correctedQuery,
    });

    if (overrides.analysis) {
      ctx.setAnalysis(overrides.analysis);
    }

    return ctx;
  };

  beforeEach(async () => {
    mockEnhancerService = {
      applySmartRanking: jest.fn().mockImplementation((products) => products),
      applyPreferenceBoost: jest
        .fn()
        .mockImplementation((products) => products),
      applyGiftCategoryBoost: jest
        .fn()
        .mockImplementation((products) => products),
      applyGenderWeightSort: jest
        .fn()
        .mockImplementation((products) => products),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartRankingProcessor,
        {
          provide: ProductSearchEnhancerService,
          useValue: mockEnhancerService,
        },
      ],
    }).compile();

    processor = module.get<SmartRankingProcessor>(SmartRankingProcessor);
  });

  it('should have name "SmartRanking"', () => {
    expect(processor.name).toBe('SmartRanking');
  });

  describe('shouldProcess', () => {
    it('should return true when results exist', () => {
      const ctx = createContext({ total: 5 });
      expect(processor.shouldProcess(ctx)).toBe(true);
    });

    it('should return false when total is 0', () => {
      const ctx = createContext({ total: 0 });
      expect(processor.shouldProcess(ctx)).toBe(false);
    });

    it('should return false when result is null', () => {
      const ctx = new SearchContext({
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      });
      // result is null by default
      expect(processor.shouldProcess(ctx)).toBe(false);
    });
  });

  describe('process', () => {
    it('should return early when result is null', () => {
      const ctx = new SearchContext({
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      });

      processor.process(ctx);

      expect(mockEnhancerService.applySmartRanking).not.toHaveBeenCalled();
    });

    it('should return early when products are empty', () => {
      const ctx = createContext({ products: [], total: 0 });

      processor.process(ctx);

      expect(mockEnhancerService.applySmartRanking).not.toHaveBeenCalled();
    });

    it('should always call applySmartRanking', () => {
      const ctx = createContext({ query: 'nike shoes' });

      processor.process(ctx);

      expect(mockEnhancerService.applySmartRanking).toHaveBeenCalledWith(
        expect.any(Array),
        'nike shoes',
        'relevance',
        false, // intentSortApplied defaults to false
      );
    });

    it('should use correctedQuery when available', () => {
      const ctx = createContext({
        query: 'nkie',
        correctedQuery: 'nike',
      });

      processor.process(ctx);

      expect(mockEnhancerService.applySmartRanking).toHaveBeenCalledWith(
        expect.any(Array),
        'nike', // correctedQuery takes precedence
        expect.any(String),
        expect.any(Boolean),
      );
    });

    it('should not call applyPreferenceBoost when no preferences', () => {
      const ctx = createContext();

      processor.process(ctx);

      expect(mockEnhancerService.applyPreferenceBoost).not.toHaveBeenCalled();
    });

    it('should call applyPreferenceBoost when preferredBrands are set', () => {
      const ctx = createContext({
        preferredBrands: 'brand1,brand2',
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyPreferenceBoost).toHaveBeenCalledWith(
        expect.any(Array),
        ['brand1', 'brand2'],
        [],
        false, // no intentSort and no genderSort
      );
    });

    it('should call applyPreferenceBoost when preferredCategories are set', () => {
      const ctx = createContext({
        preferredCategories: 'cat1,cat2',
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyPreferenceBoost).toHaveBeenCalledWith(
        expect.any(Array),
        [],
        ['cat1', 'cat2'],
        false,
      );
    });

    it('should not call applyGiftCategoryBoost when no gift intent', () => {
      const ctx = createContext();

      processor.process(ctx);

      expect(mockEnhancerService.applyGiftCategoryBoost).not.toHaveBeenCalled();
    });

    it('should call applyGiftCategoryBoost when gift intent is detected', () => {
      const ctx = createContext({
        analysis: {
          analyzedQuery: {
            intent: { purposeIntent: 'gift' },
          },
          analyzedFilters: {},
          intentSortBy: 'relevance',
          intentSortApplied: false,
          searchKeywords: ['gift'],
          isPureIntentSearch: false,
        },
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyGiftCategoryBoost).toHaveBeenCalledWith(
        expect.any(Array),
      );
    });

    it('should skip gift boost when intentSortApplied is true', () => {
      const ctx = createContext({
        analysis: {
          analyzedQuery: {
            intent: { purposeIntent: 'gift' },
          },
          analyzedFilters: {},
          intentSortBy: 'salesCount',
          intentSortApplied: true,
          searchKeywords: ['gift'],
          isPureIntentSearch: false,
        },
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyGiftCategoryBoost).not.toHaveBeenCalled();
    });

    it('should not call applyGenderWeightSort when no gender filter', () => {
      const ctx = createContext();

      processor.process(ctx);

      expect(mockEnhancerService.applyGenderWeightSort).not.toHaveBeenCalled();
    });

    it('should extract gender from request.gender', () => {
      const ctx = createContext({ gender: 'women' });

      processor.process(ctx);

      expect(mockEnhancerService.applyGenderWeightSort).toHaveBeenCalledWith(
        expect.any(Array),
        'women',
      );
    });

    it('should extract gender from request.filters.genders', () => {
      const ctx = createContext({
        filters: { genders: 'men,women' },
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyGenderWeightSort).toHaveBeenCalledWith(
        expect.any(Array),
        'men', // first gender from comma-separated list
      );
    });

    it('should extract gender from analysis.analyzedFilters.genders', () => {
      const ctx = createContext({
        analysis: {
          analyzedQuery: null,
          analyzedFilters: { genders: 'women' },
          intentSortBy: 'relevance',
          intentSortApplied: false,
          searchKeywords: [],
          isPureIntentSearch: false,
        },
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyGenderWeightSort).toHaveBeenCalledWith(
        expect.any(Array),
        'women',
      );
    });

    it('should prioritize request.gender over filters.genders', () => {
      const ctx = createContext({
        gender: 'men',
        filters: { genders: 'women' },
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyGenderWeightSort).toHaveBeenCalledWith(
        expect.any(Array),
        'men',
      );
    });

    it('should update result.products with ranked products', () => {
      const rankedProducts = [
        { id: '2', title: 'Product 2' },
        { id: '1', title: 'Product 1' },
      ];
      mockEnhancerService.applySmartRanking.mockReturnValue(rankedProducts);

      const ctx = createContext();

      processor.process(ctx);

      expect(ctx.result!.products).toBe(rankedProducts);
    });

    it('should pass skipReSort=true to preferenceBoost when gender filter exists', () => {
      const ctx = createContext({
        gender: 'women',
        preferredBrands: 'brand1',
      });

      processor.process(ctx);

      expect(mockEnhancerService.applyPreferenceBoost).toHaveBeenCalledWith(
        expect.any(Array),
        ['brand1'],
        [],
        true, // skipReSort because gender filter exists
      );
    });
  });
});
