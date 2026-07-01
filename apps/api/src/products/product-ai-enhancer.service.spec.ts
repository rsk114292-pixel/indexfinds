import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductAIEnhancerService } from './product-ai-enhancer.service';
import { Category } from '../categories/entities/category.entity';
import { AIService } from '../ai/ai.service';
import { AIResponseParserService } from '../ai/ai-response-parser.service';
import { BrandsService } from '../brands/brands.service';
import { AttributeValidatorService } from '../attributes/attribute-validator.service';
import { ProductStatus } from './product-status';
import { CategoriesService } from '../categories/categories.service';

describe('ProductAIEnhancerService', () => {
  let service: ProductAIEnhancerService;
  let categoryRepository: any;
  let aiService: any;
  let aiParserService: any;
  let brandsService: any;
  let categoriesService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    categoryRepository = {
      find: jest.fn().mockResolvedValue([
        { name: 'Sneakers', slug: 'sneakers' },
        { name: 'Jackets', slug: 'jackets' },
      ]),
      findOne: jest.fn(),
    };

    aiService = {
      analyzeProductImage: jest.fn().mockResolvedValue({
        title: 'Nike Air Max 90',
        description: 'Classic sneaker',
        brandSlug: 'nike',
        category: 'sneakers',
        brandName: 'Nike',
        attributes: { colors: ['white'] },
        confidence: 0.85,
      }),
      analyzeProductComprehensive: jest.fn(),
      analyzeTwoPhase: jest.fn(),
    };

    aiParserService = {
      extractBrandFromTitle: jest.fn().mockReturnValue(null),
    };

    brandsService = {
      findActivePromptBrands: jest.fn().mockResolvedValue([
        { id: 'brand-1', name: 'Nike', slug: 'nike' },
        { id: 'brand-design', name: 'Design', slug: 'design' },
      ]),
      findActiveApprovedBrandById: jest.fn().mockResolvedValue({
        id: 'brand-1',
        name: 'Nike',
      }),
      findActiveApprovedBrandByExactName: jest.fn().mockResolvedValue({
        id: 'brand-1',
        name: 'Nike',
      }),
      findDesignFallbackBrand: jest.fn().mockResolvedValue({
        id: 'brand-design',
        name: 'Design',
        slug: 'design',
      }),
      findOrCreateByName: jest.fn().mockResolvedValue({
        id: 'brand-1',
        name: 'Nike',
      }),
    };

    categoriesService = {
      findActivePromptCategories: jest.fn().mockResolvedValue([
        {
          id: 'root-shoes',
          name: 'Shoes',
          nameEn: 'Shoes',
          slug: 'shoes',
          level: 0,
          parent: null,
        },
        {
          id: 'leaf-running',
          name: 'Running Shoes',
          nameEn: 'Running Shoes',
          slug: 'running-shoes',
          level: 1,
          parent: { id: 'root-shoes' },
        },
        {
          id: 'root-clothing',
          name: 'Clothing',
          nameEn: 'Clothing',
          slug: 'clothing',
          level: 0,
          parent: null,
        },
        {
          id: 'leaf-hoodie',
          name: 'Hoodie',
          nameEn: 'Hoodie',
          slug: 'hoodie',
          level: 1,
          parent: { id: 'root-clothing' },
        },
      ]),
      findCategoryIdByAiSlug: jest.fn(),
      ensureCanonicalLeafCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductAIEnhancerService,
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
        { provide: AIService, useValue: aiService },
        {
          provide: AIResponseParserService,
          useValue: aiParserService,
        },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: BrandsService, useValue: brandsService },
        {
          provide: AttributeValidatorService,
          useValue: {
            validateAndResolve: jest
              .fn()
              .mockResolvedValue({ normalized: {}, attributeValueIds: [] }),
          },
        },
      ],
    }).compile();

    service = module.get<ProductAIEnhancerService>(ProductAIEnhancerService);
  });

  // ========== analyzeAndEnhance ==========

  describe('analyzeAndEnhance', () => {
    it('should return AI-enhanced result on high confidence', async () => {
      const result = await service.analyzeAndEnhance(['img1.jpg'], '默认标题');

      expect(result.translatedTitle).toBe('Nike Air Max 90 Sneakers');
      expect(result.aiBrandId).toBe('brand-1');
      expect(result.aiBrandName).toBe('Nike');
      expect(result.aiCategorySlug).toBe('sneakers');
      expect(result.aiConfidence).toBe(0.85);
      expect(result.warnings).toContain('AI 标题已自动组装为品牌 + 分类格式');
    });

    it('should use default title when AI confidence is low', async () => {
      aiService.analyzeProductImage.mockResolvedValue({
        title: 'Bad Title',
        brandSlug: 'nike',
        brandName: 'Nike',
        category: 'sneakers',
        confidence: 0.3,
      });

      const result = await service.analyzeAndEnhance(['img1.jpg'], '默认标题');

      expect(result.translatedTitle).toBe('Nike Bad Title Sneakers');
      expect(result.warnings).toContainEqual(
        expect.stringContaining('置信度较低'),
      );
    });

    it('should auto-assemble title with brand and category when AI title is empty', async () => {
      aiService.analyzeProductImage.mockResolvedValue({
        title: '',
        description: 'Classic sneaker',
        brandSlug: 'nike',
        brandName: 'Nike',
        category: 'running-shoes',
        attributes: { colors: ['white'] },
        confidence: 0.82,
      });

      const result = await service.analyzeAndEnhance(['img1.jpg'], '');

      expect(result.translatedTitle).toBe('Nike White Running Shoes');
      expect(result.warnings).toContain('AI 标题已自动组装为品牌 + 分类格式');
    });

    it('should append category when AI title misses category token', async () => {
      aiService.analyzeProductImage.mockResolvedValue({
        title: 'Nike Air Max 90',
        description: 'Classic sneaker',
        brandSlug: 'nike',
        brandName: 'Nike',
        category: 'running-shoes',
        attributes: { colors: ['white'] },
        confidence: 0.91,
      });

      const result = await service.analyzeAndEnhance(['img1.jpg'], '');

      expect(result.translatedTitle).toBe('Nike Air Max 90 Running Shoes');
      expect(result.warnings).toContain('AI 标题已自动组装为品牌 + 分类格式');
    });

    it('should keep assembled titles fully English when category names are Chinese', async () => {
      categoriesService.findActivePromptCategories.mockResolvedValueOnce([
        {
          id: 'leaf-backpacks',
          name: '双肩包',
          nameEn: 'Backpacks',
          slug: 'backpacks',
          level: 1,
          parent: { id: 'root-bags' },
        },
      ]);
      brandsService.findActivePromptBrands.mockResolvedValueOnce([
        { id: 'brand-lv', name: 'Louis Vuitton', slug: 'louis-vuitton' },
        { id: 'brand-design', name: 'Design', slug: 'design' },
      ]);
      aiService.analyzeProductImage.mockResolvedValueOnce({
        title: 'Louis Vuitton Damier Graphite Neo Backpack Gray 双肩包',
        description: 'Luxury backpack',
        brandSlug: 'louis-vuitton',
        brandName: 'Louis Vuitton',
        category: 'backpacks',
        attributes: { colors: ['gray'] },
        confidence: 0.98,
      });

      const result = await service.analyzeAndEnhance(['img1.jpg'], '');

      expect(result.translatedTitle).toBe(
        'Louis Vuitton Damier Graphite Neo Backpack Gray',
      );
      expect(result.translatedTitle).not.toMatch(/[\u3400-\u9FFF]/);
    });

    it('should normalize slash-heavy category slugs to clean English labels', async () => {
      categoriesService.findActivePromptCategories.mockResolvedValueOnce([
        {
          id: 'leaf-tee',
          name: '短袖',
          nameEn: 'T-Shirts',
          slug: 'tops/t-shirt',
          level: 1,
          parent: { id: 'root-clothing' },
        },
      ]);
      aiService.analyzeProductImage.mockResolvedValueOnce({
        title: '',
        description: 'Graphic tee',
        brandSlug: 'design',
        brandName: 'Design',
        category: 'tops/t-shirt',
        attributes: { colors: ['white'] },
        confidence: 0.66,
      });

      const result = await service.analyzeAndEnhance(['img1.jpg'], '');

      expect(result.translatedTitle).toBe('Design White T-Shirts');
      expect(result.translatedTitle).not.toContain('Tops/t Shirt');
      expect(result.translatedTitle).not.toMatch(/[\u3400-\u9FFF]/);
    });

    it('should return defaults when no images provided', async () => {
      const result = await service.analyzeAndEnhance([], '默认标题');

      expect(result.translatedTitle).toBe('默认标题');
      expect(result.aiConfidence).toBe(0);
      expect(aiService.analyzeProductImage).not.toHaveBeenCalled();
    });

    it('should handle AI service error gracefully', async () => {
      aiService.analyzeProductImage.mockRejectedValue(new Error('AI timeout'));

      const result = await service.analyzeAndEnhance(['img1.jpg'], '默认标题');

      expect(result.translatedTitle).toBe('默认标题');
      expect(result.warnings[0]).toContain('AI 图片分析失败');
    });

    it('should fetch brands and categories for AI context', async () => {
      await service.analyzeAndEnhance(['img1.jpg'], '标题');

      expect(brandsService.findActivePromptBrands).toHaveBeenCalled();
      expect(categoriesService.findActivePromptCategories).toHaveBeenCalled();
      expect(aiService.analyzeProductImage).toHaveBeenCalledWith(
        ['img1.jpg'],
        expect.any(Array),
        [
          {
            id: 'root-shoes',
            name: 'Shoes',
            nameEn: 'Shoes',
            slug: 'shoes',
            level: 0,
            parent: null,
          },
          {
            id: 'leaf-running',
            name: 'Running Shoes',
            nameEn: 'Running Shoes',
            slug: 'running-shoes',
            level: 1,
            parent: { id: 'root-shoes' },
          },
          {
            id: 'root-clothing',
            name: 'Clothing',
            nameEn: 'Clothing',
            slug: 'clothing',
            level: 0,
            parent: null,
          },
          {
            id: 'leaf-hoodie',
            name: 'Hoodie',
            nameEn: 'Hoodie',
            slug: 'hoodie',
            level: 1,
            parent: { id: 'root-clothing' },
          },
        ],
      );
    });
  });

  // ========== resolveCategoryFromSlug ==========

  describe('resolveCategoryFromSlug', () => {
    it('should return category ID for valid slug', async () => {
      categoriesService.findCategoryIdByAiSlug.mockResolvedValue('cat-1');
      categoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'cat-1',
        slug: 'sneakers',
      });

      const result = await service.resolveCategoryFromSlug('sneakers');

      expect(result).toBe('cat-1');
      expect(categoriesService.findCategoryIdByAiSlug).toHaveBeenCalledWith(
        'sneakers',
      );
      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).toHaveBeenCalledWith('cat-1');
    });

    it('should return undefined for unknown slug', async () => {
      categoriesService.findCategoryIdByAiSlug.mockResolvedValue(null);

      const result = await service.resolveCategoryFromSlug('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should reject legacy or non-leaf slug', async () => {
      categoriesService.findCategoryIdByAiSlug.mockResolvedValue('cat-1');
      categoriesService.ensureCanonicalLeafCategory.mockRejectedValue(
        new Error('legacy category'),
      );

      const result = await service.resolveCategoryFromSlug('tops');

      expect(result).toBeUndefined();
    });
  });

  // ========== processBrand ==========

  describe('processBrand', () => {
    it('should return provided brandId immediately', async () => {
      const result = await service.processBrand('brand-1', 'Nike');

      expect(result.brandId).toBe('brand-1');
      expect(result.aiBrandName).toBe('Nike');
      expect(brandsService.findOrCreateByName).not.toHaveBeenCalled();
    });

    it('should resolve exact canonical brand by name first', async () => {
      const result = await service.processBrand(undefined, 'Nike');

      expect(result.brandId).toBe('brand-1');
      expect(result.aiBrandName).toBe('Nike');
      expect(
        brandsService.findActiveApprovedBrandByExactName,
      ).toHaveBeenCalledWith('Nike');
      expect(brandsService.findOrCreateByName).not.toHaveBeenCalled();
    });

    it('should normalize brand formatting drift before falling back', async () => {
      brandsService.findActiveApprovedBrandByExactName.mockResolvedValueOnce(
        null,
      );

      const result = await service.processBrand(undefined, '  NIKE  ');

      expect(result.brandId).toBe('brand-1');
      expect(result.aiBrandName).toBe('Nike');
      expect(result.warnings).toContainEqual(
        expect.stringContaining('已归一化到标准品牌 "Nike"'),
      );
      expect(brandsService.findOrCreateByName).not.toHaveBeenCalled();
    });

    it('should retry on first failure', async () => {
      brandsService.findActiveApprovedBrandByExactName.mockResolvedValueOnce(
        null,
      );
      brandsService.findOrCreateByName
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'brand-2', name: 'Nike' });

      const result = await service.processBrand(undefined, 'BadBrand');

      expect(result.brandId).toBe('brand-2');
      expect(brandsService.findOrCreateByName).toHaveBeenCalledTimes(2);
      expect(result.warnings).toHaveLength(0);
    });

    it('should add warning after two failures', async () => {
      brandsService.findActiveApprovedBrandByExactName.mockResolvedValueOnce(
        null,
      );
      brandsService.findOrCreateByName
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'));

      const result = await service.processBrand(undefined, 'BadBrand');

      expect(result.brandId).toBeUndefined();
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('品牌匹配/创建失败');
      expect(result.warnings[1]).toContain('已进入候选审核');
    });

    it('should fallback to Design in exact-match-only mode', async () => {
      brandsService.findActiveApprovedBrandByExactName.mockResolvedValueOnce(
        null,
      );

      const result = await service.processBrand(undefined, 'Unknown Brand', {
        exactMatchOnly: true,
        fallbackToDesign: true,
      });

      expect(result.brandId).toBe('brand-design');
      expect(result.aiBrandName).toBe('Design');
      expect(result.warnings).toContainEqual(
        expect.stringContaining('已绑定兜底品牌 Design'),
      );
    });

    it('should accept near-exact canonical brand match safely', async () => {
      brandsService.findActiveApprovedBrandByExactName.mockResolvedValueOnce(
        null,
      );
      brandsService.findActivePromptBrands.mockResolvedValueOnce([
        { id: 'brand-1', name: 'Comme des Garcons', slug: 'comme-des-garcons' },
        { id: 'brand-design', name: 'Design', slug: 'design' },
      ]);

      const result = await service.processBrand(
        undefined,
        'Comne des Garcons',
        {
          exactMatchOnly: true,
          fallbackToDesign: true,
        },
      );

      expect(result.brandId).toBe('brand-1');
      expect(result.aiBrandName).toBe('Comme des Garcons');
      expect(result.warnings).toContainEqual(
        expect.stringContaining('近似命中'),
      );
    });

    it('should return empty result when no brand info', async () => {
      const result = await service.processBrand(undefined, undefined);

      expect(result.brandId).toBeUndefined();
      expect(result.aiBrandName).toBeUndefined();
    });
  });

  // ========== determineStatusByConfidence ==========

  describe('determineStatusByConfidence', () => {
    it('should return override status when provided', () => {
      expect(
        service.determineStatusByConfidence(0.9, ProductStatus.DRAFT),
      ).toBe('draft');
    });

    it('should return active for confidence >= 0.6', () => {
      expect(service.determineStatusByConfidence(0.6)).toBe('active');
      expect(service.determineStatusByConfidence(0.9)).toBe('active');
    });

    it('should return pending_review for 0.4 <= confidence < 0.6', () => {
      expect(service.determineStatusByConfidence(0.4)).toBe('pending_review');
      expect(service.determineStatusByConfidence(0.59)).toBe('pending_review');
    });

    it('should return draft for confidence < 0.4', () => {
      expect(service.determineStatusByConfidence(0.1)).toBe('draft');
      expect(service.determineStatusByConfidence(0.39)).toBe('draft');
    });

    it('should return pending_review for null/undefined/NaN', () => {
      expect(service.determineStatusByConfidence(undefined)).toBe(
        'pending_review',
      );
      expect(service.determineStatusByConfidence(null)).toBe('pending_review');
      expect(service.determineStatusByConfidence(NaN)).toBe('pending_review');
    });
  });

  // ========== determineStatusByMixedness ==========

  describe('determineStatusByMixedness', () => {
    it('should return override status when provided', () => {
      expect(
        service.determineStatusByMixedness(
          0.9,
          true,
          'split_products',
          ProductStatus.DRAFT,
        ),
      ).toBe('draft');
    });

    it('should return pending_review for mixed products', () => {
      expect(
        service.determineStatusByMixedness(0.9, true, 'single_product'),
      ).toBe('pending_review');
    });

    it('should return pending_review for split_products strategy', () => {
      expect(
        service.determineStatusByMixedness(0.9, false, 'split_products'),
      ).toBe('pending_review');
    });

    it('should return pending_review for manual_review strategy', () => {
      expect(
        service.determineStatusByMixedness(0.9, false, 'manual_review'),
      ).toBe('pending_review');
    });

    it('should fall through to confidence-based logic for normal products', () => {
      expect(
        service.determineStatusByMixedness(0.9, false, 'single_product'),
      ).toBe('active');

      expect(
        service.determineStatusByMixedness(0.3, false, 'single_with_variants'),
      ).toBe('draft');
    });
  });

  // ========== analyzeAndEnhanceComprehensive ==========

  describe('analyzeAndEnhanceComprehensive', () => {
    const mockComprehensiveResult = {
      overview: {
        totalImages: 3,
        mixednessScore: {
          overallScore: 0.2,
          brandDiversity: 0.1,
          modelDiversity: 0.1,
          visualConsistency: 0.8,
        },
        isRecommendedToSplit: false,
        detectedBrands: ['Nike'],
        detectedModels: ['Air Max'],
      },
      perImageAnalysis: [],
      suggestedGroups: [
        {
          brand: 'Nike',
          productInfo: {
            title: 'Nike Air Max',
            description: 'Great shoe',
            category: 'sneakers',
            attributes: { colors: ['white'] },
          },
        },
      ],
      overallConfidence: 0.85,
      warnings: [],
    };

    beforeEach(() => {
      aiService.analyzeProductComprehensive.mockResolvedValue(
        mockComprehensiveResult,
      );
    });

    it('should return fallback when no images', async () => {
      const result = await service.analyzeAndEnhanceComprehensive([]);

      expect(result.isMixedProduct).toBe(false);
      expect(result.mixednessScore).toBe(0);
      expect(result.processingStrategy).toBe('manual_review');
    });

    it('should analyze images and return comprehensive result', async () => {
      const result = await service.analyzeAndEnhanceComprehensive([
        'img1.jpg',
        'img2.jpg',
      ]);

      expect(result.translatedTitle).toBe('Nike Air Max');
      expect(result.aiBrandName).toBe('Nike');
      expect(result.aiConfidence).toBe(0.85);
      expect(result.isMixedProduct).toBe(false);
      expect(result.processingStrategy).toBe('single_product');
    });

    it('should correct NaN mixednessScore', async () => {
      const badResult = {
        ...mockComprehensiveResult,
        overview: {
          ...mockComprehensiveResult.overview,
          mixednessScore: {
            overallScore: NaN,
            brandDiversity: 0,
            modelDiversity: 0,
            visualConsistency: 1,
          },
        },
      };
      aiService.analyzeProductComprehensive.mockResolvedValue(badResult);

      const result = await service.analyzeAndEnhanceComprehensive(['img1.jpg']);

      expect(result.mixednessScore).toBe(0);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('mixednessScore 无效'),
      );
    });

    it('should correct single-brand high mixedness false positive', async () => {
      const falsePositive = {
        ...mockComprehensiveResult,
        overview: {
          ...mockComprehensiveResult.overview,
          mixednessScore: {
            overallScore: 0.8,
            brandDiversity: 0.1,
            modelDiversity: 0.5,
            visualConsistency: 0.2,
          },
        },
      };
      aiService.analyzeProductComprehensive.mockResolvedValue(falsePositive);

      const result = await service.analyzeAndEnhanceComprehensive(['img1.jpg']);

      expect(result.mixednessScore).toBe(0);
      expect(result.isMixedProduct).toBe(false);
    });

    it('should correct low mixedness but isMixed=true inconsistency', async () => {
      const inconsistent = {
        ...mockComprehensiveResult,
        overview: {
          ...mockComprehensiveResult.overview,
          mixednessScore: {
            overallScore: 0.05,
            brandDiversity: 0,
            modelDiversity: 0,
            visualConsistency: 0.95,
          },
          isRecommendedToSplit: true,
        },
      };
      aiService.analyzeProductComprehensive.mockResolvedValue(inconsistent);

      const result = await service.analyzeAndEnhanceComprehensive(['img1.jpg']);

      expect(result.isMixedProduct).toBe(false);
    });

    it('should upward-correct mixedness for multi-brand products', async () => {
      const multiBrand = {
        ...mockComprehensiveResult,
        overview: {
          ...mockComprehensiveResult.overview,
          mixednessScore: {
            overallScore: 0.1,
            brandDiversity: 0.1,
            modelDiversity: 0.1,
            visualConsistency: 0.9,
          },
          detectedBrands: ['Nike', 'Adidas'],
        },
        suggestedGroups: [
          {
            brand: 'Nike',
            productInfo: {
              title: 'Nike Shoe',
              category: 'sneakers',
              attributes: {},
            },
          },
          {
            brand: 'Adidas',
            productInfo: {
              title: 'Adidas Shoe',
              category: 'sneakers',
              attributes: {},
            },
          },
        ],
      };
      aiService.analyzeProductComprehensive.mockResolvedValue(multiBrand);

      const result = await service.analyzeAndEnhanceComprehensive([
        'img1.jpg',
        'img2.jpg',
      ]);

      expect(result.mixednessScore).toBeGreaterThanOrEqual(0.5);
      expect(result.isMixedProduct).toBe(true);
    });

    it('should use two-phase analysis for >20 images', async () => {
      aiService.analyzeTwoPhase.mockResolvedValue(mockComprehensiveResult);
      const manyImages = Array.from({ length: 25 }, (_, i) => `img${i}.jpg`);

      await service.analyzeAndEnhanceComprehensive(manyImages);

      expect(aiService.analyzeTwoPhase).toHaveBeenCalled();
      expect(aiService.analyzeProductComprehensive).not.toHaveBeenCalled();
    });

    it('should fallback to brand extraction from title when AI fails', async () => {
      const noBrand = {
        ...mockComprehensiveResult,
        suggestedGroups: [
          {
            brand: 'Unknown',
            productInfo: {
              title: 'Some Shoe',
              category: 'sneakers',
              attributes: {},
            },
          },
        ],
      };
      aiService.analyzeProductComprehensive.mockResolvedValue(noBrand);
      aiParserService.extractBrandFromTitle.mockReturnValue('Nike');

      const result = await service.analyzeAndEnhanceComprehensive(
        ['img1.jpg'],
        undefined,
        '耐克气垫鞋 NK',
      );

      expect(result.aiBrandName).toBe('Nike');
    });

    it('should handle AI error and return fallback', async () => {
      aiService.analyzeProductComprehensive.mockRejectedValue(
        new Error('AI crashed'),
      );

      const result = await service.analyzeAndEnhanceComprehensive(
        ['img1.jpg'],
        undefined,
        '默认标题',
      );

      expect(result.isMixedProduct).toBe(false);
      expect(result.processingStrategy).toBe('manual_review');
      expect(result.warnings).toContainEqual(
        expect.stringContaining('综合分析失败'),
      );
    });

    it('should handle numeric mixednessScore from AI', async () => {
      const numericScore = {
        ...mockComprehensiveResult,
        overview: {
          ...mockComprehensiveResult.overview,
          mixednessScore: 0 as any, // AI returns plain number
        },
      };
      aiService.analyzeProductComprehensive.mockResolvedValue(numericScore);

      const result = await service.analyzeAndEnhanceComprehensive(['img1.jpg']);

      // Should not crash and should normalize
      expect(typeof result.mixednessScore).toBe('number');
    });
  });
});
