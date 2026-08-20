import { SkuSplitProcessor } from './sku-split.processor';
import { ConflictException } from '@nestjs/common';
import { SkuSplitItemStatus } from '../../products/entities/sku-split-item.entity';
import { SkuSplitJobStatus } from '../../products/entities/sku-split-job.entity';

const mockItemRepository = {
  find: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
};

const mockProductRepository = {
  findOne: jest.fn(),
};

const mockEmbeddingQueue = {
  add: jest.fn().mockResolvedValue({}),
};

const mockWeidianService = {
  scrapeItem: jest.fn(),
};

const mockAnalyzerService = {
  analyzeSplitPlan: jest.fn(),
  extractVariantSizeSkus: jest.fn().mockReturnValue([
    {
      weidianSkuId: 'sku-1',
      attributes: { 尺码: 'M' },
      skuKey: '尺码=M',
      price: 99,
      stock: 0,
      image: null,
    },
  ]),
};

const mockSkuSplitService = {
  getJobDetail: jest.fn(),
  updateJobStatus: jest.fn().mockResolvedValue({}),
  incrementJobCounter: jest.fn().mockResolvedValue({}),
  appendItemLog: jest.fn().mockResolvedValue({}),
};

const mockAiEnhancerService = {
  analyzeAndEnhance: jest.fn(),
  processBrand: jest.fn(),
};

const mockCreatorService = {
  createProductWithSkus: jest.fn(),
  generateSlug: jest.fn().mockResolvedValue('test-slug'),
};

const mockBrandsService = {};

const mockBrandGovernanceService = {
  syncProductBrandDecision: jest.fn().mockResolvedValue(undefined),
};

const mockCategoriesService = {
  findCanonicalLeafMatchForAiInput: jest.fn().mockResolvedValue({
    categoryId: 'cat-1',
    categorySlug: 'sneakers',
    matchType: 'exact_slug',
  }),
  findCategoryMatchByAiSlug: jest.fn().mockResolvedValue({
    categoryId: 'cat-1',
    categorySlug: 'sneakers',
    matchType: 'exact_slug',
  }),
  findCategoryIdByAiSlug: jest.fn().mockResolvedValue('cat-1'),
  ensureCanonicalLeafCategory: jest
    .fn()
    .mockResolvedValue({ id: 'cat-1', slug: 'sneakers' }),
  ensureCanonicalActiveCategory: jest
    .fn()
    .mockResolvedValue({ id: 'cat-1', slug: 'sneakers' }),
  findOne: jest.fn().mockResolvedValue({ slug: 'sneakers' }),
};

const mockMeilisearchSyncService = {
  syncProduct: jest.fn().mockResolvedValue({}),
};

const mockVisualSearchService = {
  isAvailable: jest.fn().mockReturnValue(true),
  getImageEmbeddingFromUrl: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  saveProductEmbedding: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
};

describe('SkuSplitProcessor', () => {
  let processor: SkuSplitProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
      categoryId: 'cat-1',
      categorySlug: 'sneakers',
      matchType: 'exact_slug',
    });
    mockCategoriesService.findCategoryMatchByAiSlug.mockResolvedValue({
      categoryId: 'cat-1',
      categorySlug: 'sneakers',
      matchType: 'exact_slug',
    });
    mockCategoriesService.findCategoryIdByAiSlug.mockResolvedValue('cat-1');
    mockCategoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
      id: 'cat-1',
      slug: 'sneakers',
    });
    mockCategoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
      id: 'cat-1',
      slug: 'sneakers',
    });
    processor = new SkuSplitProcessor(
      mockItemRepository as any,
      mockProductRepository as any,
      mockEmbeddingQueue as any,
      mockWeidianService as any,
      mockAnalyzerService as any,
      mockSkuSplitService as any,
      mockAiEnhancerService as any,
      mockCreatorService as any,
      mockBrandsService as any,
      mockBrandGovernanceService as any,
      mockCategoriesService as any,
      mockMeilisearchSyncService as any,
      mockVisualSearchService as any,
      mockRedis as any,
    );
  });

  describe('processVariant', () => {
    const makeItem = (overrides = {}) => ({
      id: 'item-1',
      jobId: 'job-1',
      attrId: 100,
      variantValue: '黑色',
      imageUrl: 'https://img.com/black.jpg',
      price: 99,
      skuCount: 3,
      ...overrides,
    });

    const normalizedData = {
      itemId: '12345',
      title: 'Test',
      images: [],
      detailImages: [],
      attributes: [],
      skus: [],
    };

    const mockAiSuccess = () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Nike Dunk Low',
        aiConfidence: 0.9,
        aiBrandId: 'brand-1',
        aiBrandName: 'Nike',
        aiCategorySlug: 'sneakers',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Nike',
        warnings: [],
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod', slug: 'nike-dunk-low' },
        skus: [],
        warnings: [],
      });
    };

    it.each([
      [{ price: 0 }, '价格为 0'],
      [{ skuCount: 0 }, 'SKU 数量为 0'],
    ])('拒绝%s的无效变体且不调用 AI', async (overrides) => {
      const result = await (processor as any).processVariant(
        makeItem(overrides),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBeNull();
      expect(mockAiEnhancerService.analyzeAndEnhance).not.toHaveBeenCalled();
      expect(mockCreatorService.createProductWithSkus).not.toHaveBeenCalled();
      expect(mockItemRepository.update).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          status: SkuSplitItemStatus.FAILED,
          errorMessage: '变体缺少有效价格或可用 SKU',
        }),
      );
      expect(mockSkuSplitService.appendItemLog).toHaveBeenCalledWith(
        'item-1',
        '待人工处理',
        expect.objectContaining({
          actionable: true,
          reasonCode: 'invalid_variant_sku',
        }),
      );
    });

    it('源数据已变化且无法提取 SKU 时拒绝陈旧任务', async () => {
      mockAnalyzerService.extractVariantSizeSkus.mockReturnValueOnce([]);

      const result = await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBeNull();
      expect(mockAiEnhancerService.analyzeAndEnhance).not.toHaveBeenCalled();
      expect(mockCreatorService.createProductWithSkus).not.toHaveBeenCalled();
    });

    it('Redis 缓存命中时不调 CLIP', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify([0.5, 0.6, 0.7]));
      mockAiSuccess();

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockRedis.get).toHaveBeenCalledWith('sku-emb:12345:100');
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
      expect(mockVisualSearchService.saveProductEmbedding).toHaveBeenCalledWith(
        'new-prod',
        'https://img.com/black.jpg',
        0,
        [0.5, 0.6, 0.7],
      );
      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
        expect.any(Array),
        false,
      );
    });

    it('Redis 缓存未命中时调 CLIP 生成', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockAiSuccess();

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).toHaveBeenCalledWith('https://img.com/black.jpg');
      expect(mockVisualSearchService.saveProductEmbedding).toHaveBeenCalledWith(
        'new-prod',
        'https://img.com/black.jpg',
        0,
        [0.1, 0.2, 0.3],
      );
    });

    it('CLIP 失败时产品仍创建但无 embedding', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockRejectedValue(
        new Error('CLIP timeout'),
      );
      mockAiSuccess();

      const result = await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBe('new-prod');
      expect(
        mockVisualSearchService.saveProductEmbedding,
      ).not.toHaveBeenCalled();
    });

    it('不再做去重检查', async () => {
      mockAiSuccess();

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      // 产品应被创建
      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalled();
      // 不应有去重相关的 item 状态更新（DUPLICATE）
      const updateCalls = mockItemRepository.update.mock.calls;
      const duplicateUpdates = updateCalls.filter(
        (call: any[]) => call[1]?.status === SkuSplitItemStatus.DUPLICATE,
      );
      expect(duplicateUpdates).toHaveLength(0);
    });

    it('写入处理日志', async () => {
      mockAiSuccess();

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      const logCalls = mockSkuSplitService.appendItemLog.mock.calls.map(
        (c: any[]) => c[1],
      );
      expect(logCalls).toContain('开始处理');
      expect(logCalls).toEqual(
        expect.arrayContaining([expect.stringContaining('AI 分析完成')]),
      );
      expect(logCalls).toEqual(
        expect.arrayContaining([expect.stringContaining('产品创建成功')]),
      );
    });

    it('分类仅模糊命中时创建待审核商品', async () => {
      mockAiSuccess();
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'cat-1',
        categorySlug: 'sneakers',
        matchType: 'fuzzy',
        score: 20,
        runnerUpScore: 10,
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending_review' }),
        expect.any(Array),
        false,
      );
    });

    it('卖家联系方式或购买指引图片创建待审核商品', async () => {
      mockAiSuccess();
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Design Product Link Instruction Electronics',
        translatedDescription: 'Purchase at the new link.',
        aiConfidence: 0.95,
        aiBrandId: null,
        aiBrandName: 'Design',
        aiCategorySlug: 'electronics',
        aiAttributes: {},
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending_review' }),
        expect.any(Array),
        false,
      );
    });

    it('高质量模糊命中时应自动上架', async () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Gucci Polo and Shorts Set Black',
        aiConfidence: 0.98,
        aiBrandId: 'brand-1',
        aiBrandName: 'Gucci',
        aiCategorySlug: 'sets',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Gucci',
        warnings: [],
      });
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'casual-set-id',
        categorySlug: 'casual-set',
        matchType: 'fuzzy',
        score: 210,
        runnerUpScore: 0,
        resolvedByContext: true,
      });
      mockCategoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'casual-set-id',
        slug: 'casual-set',
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod', slug: 'gucci-casual-set' },
        skus: [],
        warnings: [],
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
        expect.any(Array),
        false,
      );
    });

    it('有上下文支撑且分数足够的模糊命中应自动上架', async () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Louis Vuitton Monogram Crossbody Bag Brown',
        aiConfidence: 0.72,
        aiBrandId: 'brand-1',
        aiBrandName: 'Louis Vuitton',
        aiCategorySlug: 'bags',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Louis Vuitton',
        warnings: [],
      });
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'crossbody-bag-id',
        categorySlug: 'crossbody-bags',
        matchType: 'fuzzy',
        score: 140,
        runnerUpScore: 110,
        resolvedByContext: true,
      });
      mockCategoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'crossbody-bag-id',
        slug: 'crossbody-bags',
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod', slug: 'lv-crossbody-bag' },
        skus: [],
        warnings: [],
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
        expect.any(Array),
        false,
      );
    });

    it('品牌未命中时回退到 Design 并允许继续自动上架', async () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Unbranded Bear Embroidery White Hoodie',
        aiConfidence: 0.75,
        aiBrandId: 'brand-design',
        aiBrandName: 'Design',
        aiCategorySlug: 'hoodie',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-design',
        aiBrandName: 'Design',
        warnings: ['未识别到可用品牌，已绑定兜底品牌 Design'],
      });
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'hoodie-id',
        categorySlug: 'hoodie',
        matchType: 'exact_slug',
      });
      mockCategoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'hoodie-id',
        slug: 'hoodie',
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod', slug: 'design-hoodie' },
        skus: [],
        warnings: [],
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          brandId: 'brand-design',
          aiBrandName: 'Design',
        }),
        expect.any(Array),
        false,
      );
    });

    it('缺少上下文支撑的边界模糊命中仍应进入待审核', async () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Louis Vuitton Monogram Crossbody Bag Brown',
        aiConfidence: 0.72,
        aiBrandId: 'brand-1',
        aiBrandName: 'Louis Vuitton',
        aiCategorySlug: 'bags',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Louis Vuitton',
        warnings: [],
      });
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'crossbody-bag-id',
        categorySlug: 'crossbody-bags',
        matchType: 'fuzzy',
        score: 140,
        runnerUpScore: 110,
        resolvedByContext: false,
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending_review' }),
        expect.any(Array),
        false,
      );
    });

    it('分类完全失败时记录可人工处理原因', async () => {
      mockAiSuccess();
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue(
        null,
      );

      const result = await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBeNull();
      expect(mockItemRepository.update).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          status: SkuSplitItemStatus.FAILED,
          errorMessage: expect.stringContaining('无法解析分类'),
        }),
      );
      expect(mockSkuSplitService.appendItemLog).toHaveBeenCalledWith(
        'item-1',
        '待人工处理',
        expect.objectContaining({
          actionable: true,
          reasonCode: 'category_unresolved',
        }),
      );
    });

    it('父类分类应结合标题下钻到叶子分类', async () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Philipp Plein Logo Print Black Casual Set',
        aiConfidence: 0.98,
        aiBrandId: 'brand-1',
        aiBrandName: 'Philipp Plein',
        aiCategorySlug: 'sets',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Philipp Plein',
        warnings: [],
      });
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'casual-set-id',
        categorySlug: 'casual-set',
        matchType: 'exact_alias_or_name',
      });
      mockCategoriesService.ensureCanonicalLeafCategory.mockResolvedValue({
        id: 'casual-set-id',
        slug: 'casual-set',
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod', slug: 'philipp-plein-casual-set' },
        skus: [],
        warnings: [],
      });

      await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(
        mockCategoriesService.findCanonicalLeafMatchForAiInput,
      ).toHaveBeenCalledWith({
        slug: 'sets',
        contextText: 'Philipp Plein Logo Print Black Casual Set',
      });
      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryCategoryId: 'casual-set-id',
        }),
        expect.any(Array),
        false,
      );
    });

    it('只命中父类分类时应创建待审核商品而不是失败', async () => {
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Philipp Plein Black Set',
        aiConfidence: 0.98,
        aiBrandId: 'brand-1',
        aiBrandName: 'Philipp Plein',
        aiCategorySlug: 'sets',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Philipp Plein',
        warnings: [],
      });
      mockCategoriesService.findCanonicalLeafMatchForAiInput.mockResolvedValue({
        categoryId: 'sets-id',
        categorySlug: 'sets',
        matchType: 'exact_slug',
      });
      mockCategoriesService.ensureCanonicalLeafCategory.mockRejectedValue(
        new ConflictException(
          '主分类必须是最深层子分类，当前分类 "sets" 仍有子分类',
        ),
      );
      mockCategoriesService.ensureCanonicalActiveCategory.mockResolvedValue({
        id: 'sets-id',
        slug: 'sets',
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod', slug: 'philipp-plein-black-set' },
        skus: [],
        warnings: [],
      });

      const result = await (processor as any).processVariant(
        makeItem(),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBe('new-prod');
      expect(
        mockCategoriesService.ensureCanonicalActiveCategory,
      ).toHaveBeenCalledWith('sets-id');
      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryCategoryId: 'sets-id',
          status: 'pending_review',
          allowNonLeafPrimaryCategory: true,
        }),
        expect.any(Array),
        false,
      );
      expect(mockSkuSplitService.appendItemLog).toHaveBeenCalledWith(
        'item-1',
        '发布判定完成',
        expect.objectContaining({
          reviewReasons: expect.arrayContaining([
            expect.stringContaining('分类仅命中父类'),
          ]),
        }),
      );
    });
  });

  describe('processJob - 重试安全', () => {
    const normalizedData = {
      itemId: '12345',
      title: 'Test',
      images: [],
      detailImages: [],
      attributes: [
        {
          name: '颜色',
          values: [
            { id: 100, value: '黑色', image: 'https://img.com/black.jpg' },
            { id: 101, value: '白色', image: 'https://img.com/white.jpg' },
          ],
        },
      ],
      skus: [],
    };

    const setupJobMocks = () => {
      mockSkuSplitService.getJobDetail.mockResolvedValue({
        weidianItemId: '12345',
        sourceUrl: 'https://weidian.com/item.html?itemID=12345',
        productGroupId: 'group-1',
        successCount: 1,
        failedCount: 0,
        duplicateCount: 0,
      });
      mockWeidianService.scrapeItem.mockResolvedValue(normalizedData);
      mockAnalyzerService.analyzeSplitPlan.mockReturnValue({
        splitDimension: '颜色',
        weidianItemId: '12345',
        weidianTitle: 'Test',
        variants: [
          {
            attrId: 100,
            value: '黑色',
            imageUrl: 'https://img.com/black.jpg',
            price: 99,
            skuCount: 2,
            sizes: ['S', 'M'],
          },
          {
            attrId: 101,
            value: '白色',
            imageUrl: 'https://img.com/white.jpg',
            price: 89,
            skuCount: 2,
            sizes: ['S', 'M'],
          },
        ],
      });
    };

    it('重试时只处理 PENDING 状态的 items，跳过已成功的', async () => {
      setupJobMocks();
      mockAiEnhancerService.analyzeAndEnhance.mockResolvedValue({
        translatedTitle: 'Nike Dunk Low',
        aiConfidence: 0.9,
        aiBrandId: 'brand-1',
        aiBrandName: 'Nike',
        aiCategorySlug: 'sneakers',
        aiAttributes: {},
      });
      mockAiEnhancerService.processBrand.mockResolvedValue({
        brandId: 'brand-1',
        aiBrandName: 'Nike',
        warnings: [],
      });
      mockCreatorService.createProductWithSkus.mockResolvedValue({
        product: { id: 'new-prod-2', slug: 'nike-dunk-low-2' },
        skus: [],
        warnings: [],
      });

      // 模拟重试场景：查询只返回 PENDING 的 items（已成功的被过滤）
      mockItemRepository.find.mockResolvedValue([
        {
          id: 'item-2',
          jobId: 'job-1',
          attrId: 101,
          variantValue: '白色',
          imageUrl: 'https://img.com/white.jpg',
          price: 89,
          skuCount: 2,
          status: SkuSplitItemStatus.PENDING,
        },
      ]);

      await (processor as any).processJob('job-1');

      // 查询 items 时应过滤 status=PENDING
      expect(mockItemRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jobId: 'job-1', status: SkuSplitItemStatus.PENDING },
        }),
      );
      // 只应创建 1 个产品（白色），不应重复创建黑色
      expect(mockCreatorService.createProductWithSkus).toHaveBeenCalledTimes(1);
      // processedCount 只应增加 1 次（只处理了 PENDING 的白色）
      const processedCalls =
        mockSkuSplitService.incrementJobCounter.mock.calls.filter(
          (c: any[]) => c[1] === 'processedCount',
        );
      expect(processedCalls).toHaveLength(1);
    });

    it('所有 items 已完成时处理 0 个变体并正常 finalize', async () => {
      setupJobMocks();
      // 模拟全部已完成，无 PENDING items
      mockItemRepository.find.mockResolvedValue([]);

      await (processor as any).processJob('job-1');

      // 不应创建任何产品
      expect(mockCreatorService.createProductWithSkus).not.toHaveBeenCalled();
      // 应正常设置最终状态
      expect(mockSkuSplitService.updateJobStatus).toHaveBeenCalledWith(
        'job-1',
        expect.any(String), // COMPLETED/FAILED 取决于 getJobDetail 返回的计数器
      );
    });
  });

  describe('processVariant - 状态防御检查', () => {
    const makeItem = (overrides = {}) => ({
      id: 'item-1',
      jobId: 'job-1',
      attrId: 100,
      variantValue: '黑色',
      imageUrl: 'https://img.com/black.jpg',
      price: 99,
      skuCount: 3,
      status: SkuSplitItemStatus.PENDING,
      ...overrides,
    });

    const normalizedData = {
      itemId: '12345',
      title: 'Test',
      images: [],
      detailImages: [],
      attributes: [],
      skus: [],
    };

    it('已成功的 item 直接返回 productId，不重新创建产品', async () => {
      const result = await (processor as any).processVariant(
        makeItem({
          status: SkuSplitItemStatus.SUCCESS,
          productId: 'existing-prod',
        }),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBe('existing-prod');
      expect(mockCreatorService.createProductWithSkus).not.toHaveBeenCalled();
      expect(mockAiEnhancerService.analyzeAndEnhance).not.toHaveBeenCalled();
    });

    it('DUPLICATE 状态的 item 直接返回 null，不重新处理', async () => {
      const result = await (processor as any).processVariant(
        makeItem({ status: SkuSplitItemStatus.DUPLICATE }),
        normalizedData,
        '颜色',
        'group-uuid',
        'https://weidian.com/item.html?itemID=12345',
        '12345',
      );

      expect(result).toBeNull();
      expect(mockCreatorService.createProductWithSkus).not.toHaveBeenCalled();
    });
  });

  describe('finalizeJob', () => {
    it('text embedding 入队失败时不中断', async () => {
      mockSkuSplitService.getJobDetail.mockResolvedValue({
        successCount: 2,
        failedCount: 0,
      });
      mockEmbeddingQueue.add
        .mockRejectedValueOnce(new Error('Redis down'))
        .mockResolvedValueOnce({});

      await (processor as any).finalizeJob('job-1', ['prod-1', 'prod-2']);

      expect(mockEmbeddingQueue.add).toHaveBeenCalledTimes(2);
      expect(mockMeilisearchSyncService.syncProduct).toHaveBeenCalledTimes(2);
      expect(mockSkuSplitService.updateJobStatus).toHaveBeenCalledWith(
        'job-1',
        SkuSplitJobStatus.COMPLETED,
      );
    });
  });
});
