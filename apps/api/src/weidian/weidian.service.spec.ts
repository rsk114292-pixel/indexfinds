import { Test, TestingModule } from '@nestjs/testing';
import { WeidianService } from './weidian.service';
import { WeidianThorApiService } from './weidian-thor-api.service';
import { WeidianCacheService } from './weidian-cache.service';
import { WeidianHtmlParserService } from './weidian-html-parser.service';

describe('WeidianService', () => {
  let service: WeidianService;
  let thorApiService: {
    fetchItemSkuInfo: jest.Mock;
    fetchDetailDesc: jest.Mock;
  };
  let cacheService: {
    getCachedData: jest.Mock;
    saveCacheData: jest.Mock;
    isCacheValid: jest.Mock;
    denormalizeCachedData: jest.Mock;
    updateShopInfo: jest.Mock;
  };
  let htmlParserService: {
    fetchAndParseShopInfo: jest.Mock;
    fetchShopInfoFromHtml: jest.Mock;
  };

  beforeEach(async () => {
    thorApiService = {
      fetchItemSkuInfo: jest.fn(),
      fetchDetailDesc: jest.fn(),
    };

    cacheService = {
      getCachedData: jest.fn(),
      saveCacheData: jest.fn(),
      isCacheValid: jest.fn(),
      denormalizeCachedData: jest.fn(),
      updateShopInfo: jest.fn().mockResolvedValue(undefined),
    };

    htmlParserService = {
      fetchAndParseShopInfo: jest.fn(),
      fetchShopInfoFromHtml: jest
        .fn()
        .mockResolvedValue({ shopId: null, shopName: null }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeidianService,
        {
          provide: WeidianThorApiService,
          useValue: thorApiService,
        },
        {
          provide: WeidianCacheService,
          useValue: cacheService,
        },
        {
          provide: WeidianHtmlParserService,
          useValue: htmlParserService,
        },
      ],
    }).compile();

    service = module.get<WeidianService>(WeidianService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractItemId', () => {
    it('应该从标准微店 URL 中提取 itemId', () => {
      const url = 'https://weidian.com/item.html?itemID=7569577612';
      const itemId = service.extractItemId(url);
      expect(itemId).toBe('7569577612');
    });

    it('应该从带参数的 URL 中提取 itemId', () => {
      const url = 'https://weidian.com/item.html?itemID=7613410521&wdtoken=xxx';
      const itemId = service.extractItemId(url);
      expect(itemId).toBe('7613410521');
    });

    it('应该从简化格式的 URL 中提取 itemId', () => {
      const url = 'https://weidian.com/item/7561117168';
      const itemId = service.extractItemId(url);
      expect(itemId).toBe('7561117168');
    });

    it('应该处理小写的 itemid', () => {
      const url = 'https://weidian.com/item.html?itemid=7590995411';
      const itemId = service.extractItemId(url);
      expect(itemId).toBe('7590995411');
    });

    it('无效 URL 应返回 null', () => {
      const url = 'https://example.com/invalid';
      const itemId = service.extractItemId(url);
      expect(itemId).toBeNull();
    });
  });

  describe('scrapeItem', () => {
    it('应该使用缓存数据', async () => {
      const cachedData = {
        itemId: '7569577612',
        title: '缓存商品',
        mainImage: 'https://example.com/cached.jpg',
        images: ['https://example.com/cached1.jpg'],
        detailImages: [],
        skus: [],
        attributes: [],
        priceMin: 88,
        priceMax: 88,
        shopId: 'shop456',
        shopName: '缓存店铺',
      };

      cacheService.getCachedData.mockResolvedValue(cachedData);
      cacheService.denormalizeCachedData.mockReturnValue(cachedData);

      const result = await service.scrapeItem({ itemId: '7569577612' });

      expect(result.title).toBe('缓存商品');
      expect(result.shopId).toBe('shop456');
      expect(thorApiService.fetchItemSkuInfo).not.toHaveBeenCalled();
    });

    it('缓存不存在时应调用 Thor API', async () => {
      cacheService.getCachedData.mockResolvedValue(null);

      const mockSkuResponse = {
        status: { code: 0, message: 'success', description: '' },
        result: {
          itemTitle: '测试商品',
          itemMainPic: 'https://example.com/main.jpg',
          itemImgs: ['https://example.com/img1.jpg'],
          attrList: [],
          skuInfos: [],
          seller: { shopId: 'shop123', shopName: '测试店铺' },
        },
      };

      thorApiService.fetchItemSkuInfo.mockResolvedValue(mockSkuResponse);
      thorApiService.fetchDetailDesc.mockResolvedValue(null);
      cacheService.saveCacheData.mockResolvedValue(undefined);

      const result = await service.scrapeItem({ itemId: '7569577612' });

      expect(thorApiService.fetchItemSkuInfo).toHaveBeenCalledWith(
        '7569577612',
        undefined,
      );
      expect(result.title).toBe('测试商品');
    });

    it('forceRefresh 时应忽略缓存', async () => {
      const cachedData = { itemId: '7569577612', title: '旧数据' };
      cacheService.getCachedData.mockResolvedValue(cachedData);

      const mockSkuResponse = {
        status: { code: 0, message: 'success', description: '' },
        result: {
          itemTitle: '新数据',
          itemImgs: [],
          attrList: [],
          skuInfos: [],
        },
      };

      thorApiService.fetchItemSkuInfo.mockResolvedValue(mockSkuResponse);
      thorApiService.fetchDetailDesc.mockResolvedValue(null);
      cacheService.saveCacheData.mockResolvedValue(undefined);

      const result = await service.scrapeItem({
        itemId: '7569577612',
        forceRefresh: true,
      });

      expect(result.title).toBe('新数据');
      expect(thorApiService.fetchItemSkuInfo).toHaveBeenCalled();
    });

    it('should collect images from main, attributes, and SKUs', async () => {
      cacheService.getCachedData.mockResolvedValue(null);
      thorApiService.fetchItemSkuInfo.mockResolvedValue({
        result: {
          itemTitle: '测试',
          itemMainPic: 'main.jpg',
          attrList: [
            {
              attrTitle: '颜色',
              attrValues: [
                { attrId: 1, attrValue: '红', img: 'attr1.jpg' },
                { attrId: 2, attrValue: '蓝', img: null },
              ],
            },
          ],
          skuInfos: [
            {
              attrIds: [1],
              skuInfo: {
                id: 's1',
                discountPrice: 10000,
                stock: 5,
                img: 'sku1.jpg',
              },
            },
          ],
        },
      });
      thorApiService.fetchDetailDesc.mockResolvedValue(null);
      cacheService.saveCacheData.mockResolvedValue(undefined);

      const result = await service.scrapeItem({ itemId: '100' });

      expect(result.images).toContain('main.jpg');
      expect(result.images).toContain('attr1.jpg');
      expect(result.images).toContain('sku1.jpg');
    });

    it('should normalize SKU prices from fen to yuan', async () => {
      cacheService.getCachedData.mockResolvedValue(null);
      thorApiService.fetchItemSkuInfo.mockResolvedValue({
        result: {
          itemTitle: '测试',
          attrList: [
            {
              attrTitle: '尺码',
              attrValues: [{ attrId: 1, attrValue: '42' }],
            },
          ],
          skuInfos: [
            {
              attrIds: [1],
              skuInfo: { id: 's1', discountPrice: 15000, stock: 10 },
            },
            {
              attrIds: [1],
              skuInfo: { id: 's2', discountPrice: 20000, stock: 5 },
            },
          ],
        },
      });
      thorApiService.fetchDetailDesc.mockResolvedValue(null);
      cacheService.saveCacheData.mockResolvedValue(undefined);

      const result = await service.scrapeItem({ itemId: '100' });

      expect(result.skus[0].price).toBe(150);
      expect(result.skus[1].price).toBe(200);
      expect(result.priceMin).toBe(150);
      expect(result.priceMax).toBe(200);
    });

    it('should extract detail images of type=2 only', async () => {
      cacheService.getCachedData.mockResolvedValue(null);
      thorApiService.fetchItemSkuInfo.mockResolvedValue({
        result: { itemTitle: '测试', attrList: [], skuInfos: [] },
      });
      thorApiService.fetchDetailDesc.mockResolvedValue({
        result: {
          item_detail: {
            desc_content: [
              { type: 2, url: 'detail1.jpg' },
              { type: 1, text: 'text' },
              { type: 2, url: 'detail2.jpg' },
            ],
          },
        },
      });
      cacheService.saveCacheData.mockResolvedValue(undefined);

      const result = await service.scrapeItem({ itemId: '100' });

      expect(result.detailImages).toEqual(['detail1.jpg', 'detail2.jpg']);
    });

    it('should fallback to HTML parser when no shop info from API', async () => {
      cacheService.getCachedData.mockResolvedValue(null);
      thorApiService.fetchItemSkuInfo.mockResolvedValue({
        result: { itemTitle: '测试', attrList: [], skuInfos: [] },
      });
      thorApiService.fetchDetailDesc.mockResolvedValue(null);
      cacheService.saveCacheData.mockResolvedValue(undefined);
      htmlParserService.fetchShopInfoFromHtml.mockResolvedValue({
        shopId: 'html-shop',
        shopName: 'HTML Store',
      });

      const result = await service.scrapeItem({ itemId: '100' });

      expect(htmlParserService.fetchShopInfoFromHtml).toHaveBeenCalledWith(
        '100',
      );
      expect(result.shopId).toBe('html-shop');
      expect(result.shopName).toBe('HTML Store');
    });

    it('should handle Thor SKU API failure gracefully', async () => {
      cacheService.getCachedData.mockResolvedValue(null);
      thorApiService.fetchItemSkuInfo.mockRejectedValue(new Error('API down'));
      thorApiService.fetchDetailDesc.mockResolvedValue({
        result: {
          item_detail: {
            desc_content: [{ type: 2, url: 'd1.jpg' }],
          },
        },
      });
      cacheService.saveCacheData.mockResolvedValue(undefined);

      const result = await service.scrapeItem({ itemId: '100' });

      expect(result.itemId).toBe('100');
      expect(result.detailImages).toEqual(['d1.jpg']);
    });
  });

  // ========== getShopInfo ==========

  describe('getShopInfo', () => {
    it('should return cached shop info', async () => {
      cacheService.getCachedData.mockResolvedValue({
        shopId: 'cached-shop',
        shopName: 'Cached Store',
      });

      const result = await service.getShopInfo('123');

      expect(result).toEqual({
        shopId: 'cached-shop',
        shopName: 'Cached Store',
      });
      expect(htmlParserService.fetchShopInfoFromHtml).not.toHaveBeenCalled();
    });

    it('should fallback to HTML parser when no cache', async () => {
      cacheService.getCachedData.mockResolvedValue(null);
      htmlParserService.fetchShopInfoFromHtml.mockResolvedValue({
        shopId: 'html-id',
        shopName: 'HTML Shop',
      });

      const result = await service.getShopInfo('123');

      expect(result.shopId).toBe('html-id');
    });

    it('should update cache when HTML returns data and cache exists', async () => {
      cacheService.getCachedData.mockResolvedValue({
        itemId: '123',
        shopId: null,
        shopName: null,
      });
      htmlParserService.fetchShopInfoFromHtml.mockResolvedValue({
        shopId: 'new-id',
        shopName: 'New Shop',
      });

      await service.getShopInfo('123');

      expect(cacheService.updateShopInfo).toHaveBeenCalledWith('123', {
        shopId: 'new-id',
        shopName: 'New Shop',
      });
    });
  });
});
