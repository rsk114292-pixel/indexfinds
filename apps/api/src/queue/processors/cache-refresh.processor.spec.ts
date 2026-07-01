import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { CacheRefreshProcessor } from './cache-refresh.processor';
import { WeidianService } from '../../weidian/weidian.service';
import { Product } from '../../products/entities/product.entity';
import { Sku } from '../../products/entities/sku.entity';

// Mock @nestjs/bullmq 避免 BullMQ 实际连接
jest.mock('@nestjs/bullmq', () => ({
  WorkerHost: class {
    constructor() {}
  },
  Processor: () => () => {},
}));

// Mock queue.module 避免 BullModule.forRootAsync 被调用
jest.mock('../queue.module', () => ({
  QUEUE_NAMES: {
    BATCH_IMPORT: 'batch-import',
    AI_GENERATION: 'ai-generation',
    EMBEDDING: 'embedding',
    CACHE_REFRESH: 'cache-refresh',
  },
}));

describe('CacheRefreshProcessor', () => {
  let processor: CacheRefreshProcessor;
  let weidianService: { scrapeItem: jest.Mock };
  let productRepository: { findOne: jest.Mock; update: jest.Mock };
  let skuRepository: { find: jest.Mock; update: jest.Mock };
  let cacheRefreshService: { weeklyRefreshScan: jest.Mock };

  beforeEach(async () => {
    weidianService = { scrapeItem: jest.fn() };
    productRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    skuRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    cacheRefreshService = {
      weeklyRefreshScan: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheRefreshProcessor,
        { provide: WeidianService, useValue: weidianService },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(Sku), useValue: skuRepository },
        { provide: 'CacheRefreshService', useValue: cacheRefreshService },
      ],
    }).compile();

    processor = module.get<CacheRefreshProcessor>(CacheRefreshProcessor);
  });

  function makeJob(
    data: {
      itemId?: string;
      productId?: string;
      trigger: 'click' | 'scheduled' | 'manual';
    },
    name = 'refresh',
  ): Job<any> {
    return { name, data } as Job<any>;
  }

  const ITEM_ID = 'item-456';
  const PRODUCT_ID = 'prod-123';

  describe('isTransientError — 瞬态错误不计入死链', () => {
    it('429 错误不写入死链记录', async () => {
      weidianService.scrapeItem.mockRejectedValue(
        new Error('HTTP 429 Too Many Requests'),
      );

      await expect(
        processor.process(
          makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
        ),
      ).rejects.toThrow('429');

      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('rate limit 错误不写入死链记录', async () => {
      weidianService.scrapeItem.mockRejectedValue(
        new Error('rate limit exceeded'),
      );

      await expect(
        processor.process(
          makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
        ),
      ).rejects.toThrow('rate limit');

      expect(productRepository.update).not.toHaveBeenCalled();
    });

    it('非瞬态错误（商品不存在）写入死链记录', async () => {
      weidianService.scrapeItem.mockRejectedValue(new Error('item not found'));
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        weidianDeadLinkAttempts: 0,
        weidianDeadLinkAt: null,
      });

      await expect(
        processor.process(
          makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
        ),
      ).rejects.toThrow('item not found');

      expect(productRepository.update).toHaveBeenCalledWith(
        PRODUCT_ID,
        expect.objectContaining({ weidianDeadLinkAttempts: 1 }),
      );
    });
  });

  describe('triggerFrontendRevalidate — 主动刷新前端 ISR', () => {
    const SLUG = 'nike-air-max-test';

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      process.env.REVALIDATE_SECRET = 'test-secret';
      process.env.FRONTEND_URL = 'http://localhost:3101';
    });

    afterEach(() => {
      delete process.env.REVALIDATE_SECRET;
      delete process.env.FRONTEND_URL;
    });

    it('成功刷新后向前端发送 revalidate 请求', async () => {
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        slug: SLUG,
        priceMin: '99.00',
        priceMax: '199.00',
        weidianShopId: 'shop-1',
        weidianShopName: 'Test Shop',
        weidianDeadLinkAttempts: 0,
      });
      skuRepository.find.mockResolvedValue([]);
      weidianService.scrapeItem.mockResolvedValue({ skus: [] });

      await processor.process(
        makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3101/api/revalidate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-revalidate-secret': 'test-secret',
          }),
          body: JSON.stringify({ slug: SLUG }),
        }),
      );
    });

    it('REVALIDATE_SECRET 未配置时不调用 fetch', async () => {
      delete process.env.REVALIDATE_SECRET;
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        slug: SLUG,
        priceMin: '99.00',
        priceMax: '199.00',
        weidianShopId: 'shop-1',
        weidianShopName: 'Test Shop',
        weidianDeadLinkAttempts: 0,
      });
      skuRepository.find.mockResolvedValue([]);
      weidianService.scrapeItem.mockResolvedValue({ skus: [] });

      await processor.process(
        makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Decimal 价格比较 — 价格未变时不写库', () => {
    it('DB 返回 decimal 字符串与计算值相同时，不触发 product update', async () => {
      // PostgreSQL decimal 列读出为字符串 "99.00"，不是 number 99
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        priceMin: '99.00',
        priceMax: '199.00',
        weidianShopId: 'shop-1',
        weidianShopName: 'Test Shop',
        weidianDeadLinkAttempts: 0,
      });

      skuRepository.find.mockResolvedValue([
        { price: '99.00' },
        { price: '199.00' },
      ]);

      weidianService.scrapeItem.mockResolvedValue({
        skus: [],
        shopId: 'shop-1',
        shopName: 'Test Shop',
      });

      await processor.process(
        makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
      );

      // 价格没有变化，不应写入 product 更新
      expect(productRepository.update).not.toHaveBeenCalledWith(
        PRODUCT_ID,
        expect.objectContaining({ priceMin: expect.anything() }),
      );
    });

    it('价格真正变化时触发 product update', async () => {
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        priceMin: '99.00',
        priceMax: '199.00',
        weidianShopId: null,
        weidianShopName: null,
        weidianDeadLinkAttempts: 0,
      });

      // SKU 价格已变为 89 和 179
      skuRepository.find.mockResolvedValue([
        { price: '89.00' },
        { price: '179.00' },
      ]);

      weidianService.scrapeItem.mockResolvedValue({ skus: [] });

      await processor.process(
        makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
      );

      expect(productRepository.update).toHaveBeenCalledWith(
        PRODUCT_ID,
        expect.objectContaining({ priceMin: 89, priceMax: 179 }),
      );
    });
  });

  describe('updateSkuPricesAndStock — SKU 批量并发更新', () => {
    it('微店返回 SKU 数据时应并发更新匹配的 SKU', async () => {
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        priceMin: '99.00',
        priceMax: '199.00',
        weidianShopId: 'shop-1',
        weidianShopName: 'Test Shop',
        weidianDeadLinkAttempts: 0,
      });

      // 现有 SKU（skuRepository.find 会被调用两次：一次 updateSkuPricesAndStock，一次计算价格范围）
      skuRepository.find
        .mockResolvedValueOnce([
          { id: 'sku-1', skuKey: 'red-S', price: 99, stock: 10 },
          { id: 'sku-2', skuKey: 'red-M', price: 99, stock: 5 },
          { id: 'sku-3', skuKey: 'blue-S', price: 99, stock: 8 },
        ])
        .mockResolvedValueOnce([{ price: 89 }, { price: 109 }, { price: 99 }]);

      // 微店返回的新数据
      weidianService.scrapeItem.mockResolvedValue({
        skus: [
          { skuKey: 'red-S', price: '89', stock: '15' },
          { skuKey: 'red-M', price: '109', stock: '5' },
          { skuKey: 'unknown-key', price: '199', stock: '3' }, // 无匹配
        ],
      });

      await processor.process(
        makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
      );

      // red-S: 价格 99→89，库存 10→15
      expect(skuRepository.update).toHaveBeenCalledWith('sku-1', {
        price: 89,
        stock: 15,
      });
      // red-M: 价格 99→109，库存不变（5===5）
      expect(skuRepository.update).toHaveBeenCalledWith('sku-2', {
        price: 109,
      });
      // blue-S: 无匹配微店 SKU，不应更新
      expect(skuRepository.update).not.toHaveBeenCalledWith(
        'sku-3',
        expect.anything(),
      );
      // 总共 2 次 SKU 更新（并发执行）
      expect(skuRepository.update).toHaveBeenCalledTimes(2);
    });

    it('SKU 价格和库存均未变化时不应调用 update', async () => {
      productRepository.findOne.mockResolvedValue({
        id: PRODUCT_ID,
        priceMin: '99.00',
        priceMax: '99.00',
        weidianShopId: 'shop-1',
        weidianShopName: 'Test Shop',
        weidianDeadLinkAttempts: 0,
      });

      skuRepository.find
        .mockResolvedValueOnce([
          { id: 'sku-1', skuKey: 'red-S', price: 99, stock: 10 },
        ])
        .mockResolvedValueOnce([{ price: 99 }]);

      weidianService.scrapeItem.mockResolvedValue({
        skus: [{ skuKey: 'red-S', price: '99', stock: '10' }],
      });

      await processor.process(
        makeJob({ itemId: ITEM_ID, productId: PRODUCT_ID, trigger: 'click' }),
      );

      expect(skuRepository.update).not.toHaveBeenCalled();
    });
  });
});
