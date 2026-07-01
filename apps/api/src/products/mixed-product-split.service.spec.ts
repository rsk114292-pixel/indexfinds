import { MixedProductSplitService } from './mixed-product-split.service';

// 只测试 prepareProductDataFromGroup 中 splitSourceWeidianId / skuVariantKey 的写入

const mockProductRepository = { update: jest.fn() };
const mockSkuRepository = {};
const mockSplitHistoryRepository = { create: jest.fn() };
const mockProductCreatorService = {
  generateSlug: jest.fn().mockResolvedValue('test-slug'),
};
const mockProductAiEnhancerService = {
  processBrand: jest.fn().mockResolvedValue({ brandId: 'brand-1' }),
};
const mockProductSkuService = {};
const mockWeidianService = {};
const mockMixedProductQueryService = {};
const mockDataSource = {};
const mockEmbeddingQueue = {};

describe('MixedProductSplitService', () => {
  let service: MixedProductSplitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MixedProductSplitService(
      mockProductRepository as any,
      mockSkuRepository as any,
      mockSplitHistoryRepository as any,
      mockProductCreatorService as any,
      mockProductAiEnhancerService as any,
      mockProductSkuService as any,
      mockWeidianService as any,
      mockMixedProductQueryService as any,
      mockDataSource as any,
      mockEmbeddingQueue as any,
    );
  });

  describe('prepareProductDataFromGroup', () => {
    const sourceProduct = {
      id: 'source-prod',
      title: 'Mixed Product',
      originalTitle: '混合商品',
      weidianItemId: '7643669106',
      weidianShopId: 'shop-1',
      weidianShopName: 'Test Shop',
      sourceUrl: 'https://weidian.com/item.html?itemID=7643669106',
      primaryCategoryId: 'cat-1',
      primaryCategory: { slug: 'belts' },
      secondaryCategories: [],
      mainImage: 'https://img.com/main.jpg',
      images: ['https://img.com/1.jpg', 'https://img.com/2.jpg'],
      detailImages: [],
    };

    const group = {
      groupKey: 'gucci-belt',
      brand: 'Gucci',
      model: 'GG Marmont Belt',
      suggestedTitle: 'Gucci GG Marmont Belt',
      originalGroupKeys: ['gucci-belt'],
      imageIndexes: [0],
    };

    const analysis = {
      suggestedGroups: [
        {
          groupKey: 'gucci-belt',
          brand: 'Gucci',
          model: 'GG Marmont Belt',
          imageIndexes: [0],
          productInfo: {
            title: 'Gucci GG Marmont Belt',
            description: 'Luxury belt',
            category: 'belts',
            attributes: {},
          },
        },
      ],
      perImageAnalysis: [],
      overallConfidence: 0.8,
    };

    it('产品数据包含 splitSourceWeidianId 和 skuVariantKey', async () => {
      const result = await (service as any).prepareProductDataFromGroup(
        sourceProduct,
        group,
        'product-group-uuid',
        analysis,
        [],
      );

      expect(result.splitSourceWeidianId).toBe('7643669106');
      expect(result.skuVariantKey).toBe('gucci-belt');
      expect(result.isFromSplit).toBe(true);
      expect(result.productGroupId).toBe('product-group-uuid');
    });

    it('源产品无 weidianItemId 时 splitSourceWeidianId 为 undefined', async () => {
      const productWithoutWeidian = {
        ...sourceProduct,
        weidianItemId: null,
      };

      const result = await (service as any).prepareProductDataFromGroup(
        productWithoutWeidian,
        group,
        'product-group-uuid',
        analysis,
        [],
      );

      expect(result.splitSourceWeidianId).toBeUndefined();
      expect(result.skuVariantKey).toBe('gucci-belt');
    });
  });
});
