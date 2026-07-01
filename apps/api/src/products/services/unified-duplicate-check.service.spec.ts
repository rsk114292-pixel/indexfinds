import { UnifiedDuplicateCheckService } from './unified-duplicate-check.service';

const mockProductRepository = {
  findOne: jest.fn(),
};

const mockVisualSearchService = {
  isAvailable: jest.fn(),
  getImageEmbeddingFromUrl: jest.fn(),
  searchByEmbedding: jest.fn(),
};

describe('UnifiedDuplicateCheckService', () => {
  let service: UnifiedDuplicateCheckService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UnifiedDuplicateCheckService(
      mockProductRepository as any,
      mockVisualSearchService as any,
    );
  });

  describe('checkByWeidianItemId', () => {
    it('空 itemId 返回非重复', async () => {
      const result = await service.checkByWeidianItemId('');
      expect(result.isDuplicate).toBe(false);
      expect(mockProductRepository.findOne).not.toHaveBeenCalled();
    });

    it('找到匹配产品返回重复', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        title: 'Nike Dunk Low',
        mainImage: 'http://img.jpg',
      });

      const result = await service.checkByWeidianItemId('12345');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('weidian_id');
      expect(result.matchedProductId).toBe('prod-1');
    });

    it('未找到匹配返回非重复', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);
      const result = await service.checkByWeidianItemId('12345');
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('checkByVariantKey', () => {
    it('空参数返回非重复', async () => {
      const result = await service.checkByVariantKey('', '');
      expect(result.isDuplicate).toBe(false);
    });

    it('找到匹配变体返回重复', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: 'prod-2',
        title: 'Adidas Track Jacket',
        mainImage: 'http://img2.jpg',
      });

      const result = await service.checkByVariantKey('7642281561', '1001');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('variant_key');
    });
  });

  describe('checkByImageSimilarity', () => {
    it('视觉服务不可用时跳过', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(false);
      const result = await service.checkByImageSimilarity('http://img.jpg');
      expect(result.isDuplicate).toBe(false);
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
    });

    it('找到视觉相似产品返回重复', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([
        0.1, 0.2,
      ]);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([
        {
          product: {
            id: 'prod-3',
            title: 'Similar Jacket',
            mainImage: 'http://sim.jpg',
          },
          similarity: 97,
        },
      ]);

      const result = await service.checkByImageSimilarity('http://img.jpg');
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('visual_similarity');
      expect(result.similarity).toBe(97);
    });

    it('无相似产品返回非重复', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([
        0.1, 0.2,
      ]);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([]);

      const result = await service.checkByImageSimilarity('http://img.jpg');
      expect(result.isDuplicate).toBe(false);
    });

    it('embedding 服务报错不阻塞流程', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockRejectedValue(
        new Error('Service timeout'),
      );

      const result = await service.checkByImageSimilarity('http://img.jpg');
      expect(result.isDuplicate).toBe(false);
    });

    it('传入 precomputedEmbedding 时跳过 CLIP 调用', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([]);

      const result = await service.checkByImageSimilarity(
        'http://img.jpg',
        95,
        [0.5, 0.6, 0.7],
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.embedding).toEqual([0.5, 0.6, 0.7]);
      // 不应调用 CLIP
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
      // 应使用传入的 embedding 搜索
      expect(mockVisualSearchService.searchByEmbedding).toHaveBeenCalledWith(
        [0.5, 0.6, 0.7],
        1,
        95,
      );
    });

    it('未重复时返回生成的 embedding 供复用', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([
        0.1, 0.2,
      ]);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([]);

      const result = await service.checkByImageSimilarity('http://img.jpg');

      expect(result.isDuplicate).toBe(false);
      expect(result.embedding).toEqual([0.1, 0.2]);
    });

    it('重复时也返回 embedding', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([
        0.1, 0.2,
      ]);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([
        {
          product: { id: 'prod-3', title: 'Match', mainImage: 'http://m.jpg' },
          similarity: 97,
        },
      ]);

      const result = await service.checkByImageSimilarity('http://img.jpg');

      expect(result.isDuplicate).toBe(true);
      expect(result.embedding).toEqual([0.1, 0.2]);
    });
  });

  describe('checkAll', () => {
    it('weidianItemId 命中时立即返回，不做后续检查', async () => {
      mockProductRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        title: 'Exact Match',
        mainImage: 'http://exact.jpg',
      });

      const result = await service.checkAll({
        weidianItemId: '12345',
        imageUrl: 'http://img.jpg',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('weidian_id');
      // 视觉检查不应被调用
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
    });

    it('variantKey 命中时不做视觉检查', async () => {
      // weidianItemId 未提供，variantKey 命中
      mockProductRepository.findOne.mockResolvedValue({
        id: 'prod-2',
        title: 'Variant Match',
        mainImage: 'http://var.jpg',
      });

      const result = await service.checkAll({
        splitSourceWeidianId: '7642281561',
        skuVariantKey: '1001',
        imageUrl: 'http://img.jpg',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('variant_key');
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
    });

    it('前两级未命中时回退到视觉检查', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([0.1]);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([
        {
          product: {
            id: 'prod-3',
            title: 'Visual Match',
            mainImage: 'http://vis.jpg',
          },
          similarity: 96,
        },
      ]);

      const result = await service.checkAll({
        splitSourceWeidianId: '7645599299',
        skuVariantKey: '999',
        imageUrl: 'http://img.jpg',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('visual_similarity');
    });

    it('三级都未命中时返回非重复 + embedding', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([0.1]);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([]);

      const result = await service.checkAll({
        splitSourceWeidianId: '7645599299',
        skuVariantKey: '999',
        imageUrl: 'http://img.jpg',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.embedding).toEqual([0.1]);
    });

    it('checkAll 传递 precomputedEmbedding 到视觉检查', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.searchByEmbedding.mockResolvedValue([]);

      const result = await service.checkAll({
        splitSourceWeidianId: '7645599299',
        skuVariantKey: '999',
        imageUrl: 'http://img.jpg',
        precomputedEmbedding: [0.9, 0.8],
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.embedding).toEqual([0.9, 0.8]);
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
    });
  });

  describe('generateEmbedding', () => {
    it('服务可用时返回向量', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockResolvedValue([
        0.1, 0.2,
      ]);

      const result = await service.generateEmbedding('http://img.jpg');

      expect(result).toEqual([0.1, 0.2]);
      expect(mockVisualSearchService.searchByEmbedding).not.toHaveBeenCalled();
    });

    it('服务不可用时返回 null', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(false);

      const result = await service.generateEmbedding('http://img.jpg');

      expect(result).toBeNull();
      expect(
        mockVisualSearchService.getImageEmbeddingFromUrl,
      ).not.toHaveBeenCalled();
    });

    it('空 URL 返回 null', async () => {
      const result = await service.generateEmbedding('');
      expect(result).toBeNull();
    });

    it('CLIP 失败时返回 null 不抛异常', async () => {
      mockVisualSearchService.isAvailable.mockReturnValue(true);
      mockVisualSearchService.getImageEmbeddingFromUrl.mockRejectedValue(
        new Error('429'),
      );

      const result = await service.generateEmbedding('http://img.jpg');

      expect(result).toBeNull();
    });
  });
});
