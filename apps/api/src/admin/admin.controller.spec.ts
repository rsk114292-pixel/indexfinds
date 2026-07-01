import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { MeilisearchSyncService } from '../meilisearch/meilisearch-sync.service';
import { MeilisearchIndexService } from '../meilisearch/meilisearch-index.service';
import { SettingsService } from '../settings/settings.service';
import { ProductsService } from '../products/products.service';
import {
  ProductQueryService,
  SEARCH_ENGINE_CHANGED_EVENT,
} from '../products/product-query.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;
  let meilisearchService: any;
  let meilisearchSyncService: any;
  let settingsService: any;
  let productQueryService: any;
  let productsService: any;
  let eventEmitter: any;

  beforeEach(async () => {
    adminService = {
      getDashboardStats: jest.fn().mockResolvedValue({ products: 100 }),
      getHotProducts: jest.fn().mockResolvedValue({
        data: [{ id: 'p1', title: 'Hot Product', popularityScore: 0.8 }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
      getHotProductsSummary: jest.fn().mockResolvedValue({
        withoutQc: 1,
        qcLessThan3: 0,
        featuredWithoutQc: 1,
        highHeatWithoutQc: 1,
      }),
      getActiveProductCount: jest.fn().mockResolvedValue(75),
      getTabCounts: jest.fn().mockResolvedValue({
        review: 5,
        duplicates: 2,
        mixed: 3,
        split: 10,
        deadLinkConfirmed: 1,
      }),
    };

    meilisearchService = {
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    meilisearchSyncService = {
      fullSync: jest.fn().mockResolvedValue({ total: 75, synced: 75 }),
    };

    settingsService = {
      set: jest
        .fn()
        .mockResolvedValue({ key: 'search_engine', value: 'meilisearch' }),
    };

    productQueryService = {
      searchEngine: 'meilisearch',
      getDegradationStats: jest
        .fn()
        .mockReturnValue({ count: 0, lastAt: null }),
      getAdminShopOptions: jest.fn().mockResolvedValue({
        data: [],
        meta: {
          totalProducts: 0,
          totalShops: 0,
          missingProductCount: 0,
          pendingReviewCount: 0,
          withoutQcCount: 0,
          deadLinkCount: 0,
        },
      }),
    };

    productsService = {
      toggleFeatured: jest.fn().mockResolvedValue({ isFeatured: true }),
      updateFeaturedSort: jest.fn().mockResolvedValue({ updated: 2 }),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: MeilisearchService, useValue: meilisearchService },
        { provide: MeilisearchSyncService, useValue: meilisearchSyncService },
        {
          provide: MeilisearchIndexService,
          useValue: {
            validateSettings: jest.fn().mockResolvedValue({
              configMatch: true,
              missingSort: [],
              missingFilter: [],
              documentCount: 75,
            }),
          },
        },
        { provide: SettingsService, useValue: settingsService },
        { provide: ProductQueryService, useValue: productQueryService },
        { provide: ProductsService, useValue: productsService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardStats()', () => {
    it('should return dashboard stats', async () => {
      const result = await controller.getDashboardStats();
      expect(result).toEqual({ products: 100 });
    });
  });

  describe('getProducts()', () => {
    it('passes price filters through to productQueryService', async () => {
      productQueryService.findAllAdmin = jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.getProducts(
        '1',
        '20',
        'nike',
        'active',
        'zero',
        undefined,
        '0',
        '50',
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(productQueryService.findAllAdmin).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'nike',
        status: 'active',
        priceState: 'zero',
        qcState: undefined,
        minPrice: 0,
        maxPrice: 50,
        reviewSource: undefined,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        deadLink: undefined,
        shopIds: undefined,
      });
    });

    it('passes shopIds through to productQueryService', async () => {
      productQueryService.findAllAdmin = jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.getProducts(
        '2',
        '20',
        undefined,
        'pending_review',
        undefined,
        'without',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'shop-1, unknown ,shop-2',
      );

      expect(productQueryService.findAllAdmin).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        search: undefined,
        status: 'pending_review',
        priceState: undefined,
        qcState: 'without',
        minPrice: undefined,
        maxPrice: undefined,
        reviewSource: undefined,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        deadLink: undefined,
        shopIds: ['shop-1', 'unknown', 'shop-2'],
      });
    });
  });

  describe('getProductShopOptions()', () => {
    it('passes product filters to productQueryService shop aggregation', async () => {
      await controller.getProductShopOptions(
        '8',
        'birkin',
        'pending_review',
        'priced',
        'without',
        '100',
        '500',
        'sku_split',
        'confirmed',
        'style',
      );

      expect(productQueryService.getAdminShopOptions).toHaveBeenCalledWith(
        {
          search: 'birkin',
          status: 'pending_review',
          priceState: 'priced',
          qcState: 'without',
          minPrice: 100,
          maxPrice: 500,
          reviewSource: 'sku_split',
          deadLink: 'confirmed',
          shopSearch: 'style',
        },
        8,
      );
    });
  });

  describe('meilisearchHealth()', () => {
    it('should return healthy status', async () => {
      const result = await controller.meilisearchHealth();
      expect(result).toEqual({ healthy: true });
    });

    it('should return unhealthy status', async () => {
      meilisearchService.isHealthy.mockResolvedValue(false);
      const result = await controller.meilisearchHealth();
      expect(result).toEqual({ healthy: false });
    });
  });

  describe('meilisearchFullSync()', () => {
    it('should trigger full sync and return result', async () => {
      const result = await controller.meilisearchFullSync();
      expect(meilisearchSyncService.fullSync).toHaveBeenCalled();
      expect(result).toEqual({ total: 75, synced: 75 });
    });
  });

  describe('getSearchEngine()', () => {
    it('返回引擎状态、索引校验和降级信息', async () => {
      const result = await controller.getSearchEngine();
      expect(result.current).toBe('meilisearch');
      expect(result.meilisearchHealthy).toBe(true);
      expect(result.options).toEqual(['meilisearch', 'postgres']);
      expect(result.indexStatus).toEqual({
        configMatch: true,
        missingSort: [],
        missingFilter: [],
        documentCount: 75,
        dbProductCount: 75,
      });
      expect(result.degradation).toEqual({ count: 0, lastAt: null });
    });

    it('should reflect postgres engine', async () => {
      productQueryService.searchEngine = 'postgres';
      const result = await controller.getSearchEngine();
      expect(result.current).toBe('postgres');
    });
  });

  describe('setSearchEngine()', () => {
    it('should switch to postgres and persist', async () => {
      const result = await controller.setSearchEngine({ engine: 'postgres' });

      expect(settingsService.set).toHaveBeenCalledWith(
        'search_engine',
        'postgres',
        expect.any(String),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SEARCH_ENGINE_CHANGED_EVENT,
        { engine: 'postgres' },
      );
      expect(result.engine).toBe('postgres');
    });

    it('should switch to meilisearch and persist', async () => {
      const result = await controller.setSearchEngine({
        engine: 'meilisearch',
      });

      expect(settingsService.set).toHaveBeenCalledWith(
        'search_engine',
        'meilisearch',
        expect.any(String),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SEARCH_ENGINE_CHANGED_EVENT,
        { engine: 'meilisearch' },
      );
      expect(result.engine).toBe('meilisearch');
    });

    it('should reject invalid engine value', async () => {
      await expect(
        controller.setSearchEngine({ engine: 'elasticsearch' }),
      ).rejects.toThrow(BadRequestException);

      expect(settingsService.set).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should reject empty engine value', async () => {
      await expect(controller.setSearchEngine({ engine: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTabCounts()', () => {
    it('返回所有 Tab 计数', async () => {
      const result = await controller.getTabCounts();
      expect(adminService.getTabCounts).toHaveBeenCalled();
      expect(result).toEqual({
        review: 5,
        duplicates: 2,
        mixed: 3,
        split: 10,
        deadLinkConfirmed: 1,
      });
    });
  });

  describe('getHotProducts()', () => {
    it('返回热门商品列表', async () => {
      const result = await controller.getHotProducts(
        '1',
        '20',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
      expect(result.data).toHaveLength(1);
    });

    it('默认分页参数 page=1 limit=20', async () => {
      await controller.getHotProducts(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
    });

    it('传递搜索参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        'jordan',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        'jordan',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
    });

    it('传递 QC 筛选参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        undefined,
        'with',
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        'with',
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
    });

    it('忽略无效 QC 筛选参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        undefined,
        'all',
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
    });

    it('传递推荐状态和上架天数参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        undefined,
        undefined,
        'featured',
        '8_30',
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        'featured',
        '8_30',
        undefined,
        undefined,
        true,
      );
    });

    it('忽略无效推荐状态和上架天数参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        undefined,
        undefined,
        'all',
        '90',
        undefined,
        undefined,
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
    });

    it('传递 QC 数量和高热阈值参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        undefined,
        undefined,
        undefined,
        undefined,
        'lt3',
        '0.6',
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'lt3',
        0.6,
        true,
      );
    });

    it('忽略无效 QC 数量和高热阈值参数', async () => {
      await controller.getHotProducts(
        '1',
        '20',
        undefined,
        undefined,
        undefined,
        undefined,
        'zero',
        'oops',
      );
      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );
    });

    it('支持跳过全量统计', async () => {
      await controller.getHotProducts(
        '2',
        '100',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'false',
      );

      expect(adminService.getHotProducts).toHaveBeenCalledWith(
        2,
        100,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
      );
    });
  });

  describe('getHotProductsSummary()', () => {
    it('传递热门商品统计筛选参数', async () => {
      const result = await controller.getHotProductsSummary(
        'jordan',
        'without',
        'featured',
        '7',
        'lt3',
        '0.6',
      );

      expect(adminService.getHotProductsSummary).toHaveBeenCalledWith({
        search: 'jordan',
        qcState: 'without',
        featuredState: 'featured',
        shelfDays: '7',
        qcLevel: 'lt3',
        minPopularityScore: 0.6,
      });
      expect(result).toEqual({
        withoutQc: 1,
        qcLessThan3: 0,
        featuredWithoutQc: 1,
        highHeatWithoutQc: 1,
      });
    });
  });

  describe('toggleFeatured()', () => {
    it('切换推荐状态', async () => {
      const result = await controller.toggleFeatured('p1');
      expect(productsService.toggleFeatured).toHaveBeenCalledWith('p1');
      expect(result).toEqual({ isFeatured: true });
    });
  });

  describe('updateFeaturedSort()', () => {
    it('批量更新排序', async () => {
      const items = [
        { id: 'p1', featuredSort: 10 },
        { id: 'p2', featuredSort: 20 },
      ];
      const result = await controller.updateFeaturedSort({ items });
      expect(productsService.updateFeaturedSort).toHaveBeenCalledWith(items);
      expect(result).toEqual({ updated: 2 });
    });

    it('空 items 抛出 BadRequestException', async () => {
      await expect(
        controller.updateFeaturedSort({ items: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
