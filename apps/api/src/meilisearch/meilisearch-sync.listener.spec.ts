import { Test, TestingModule } from '@nestjs/testing';
import { MeilisearchSyncListener } from './meilisearch-sync.listener';
import { MeilisearchSyncService } from './meilisearch-sync.service';
import { MeilisearchIndexService } from './meilisearch-index.service';

describe('MeilisearchSyncListener', () => {
  let listener: MeilisearchSyncListener;
  let syncService: any;
  let indexService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    syncService = {
      syncProduct: jest.fn().mockResolvedValue(undefined),
      removeProduct: jest.fn().mockResolvedValue(undefined),
      syncProductsByBrand: jest.fn().mockResolvedValue(undefined),
      syncProductsByCategory: jest.fn().mockResolvedValue(undefined),
    };

    indexService = {
      syncSynonyms: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeilisearchSyncListener,
        { provide: MeilisearchSyncService, useValue: syncService },
        { provide: MeilisearchIndexService, useValue: indexService },
      ],
    }).compile();

    listener = module.get<MeilisearchSyncListener>(MeilisearchSyncListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleProductCreated', () => {
    it('should sync product on create', async () => {
      await listener.handleProductCreated({ productId: 'prod-1' });
      expect(syncService.syncProduct).toHaveBeenCalledWith('prod-1');
    });

    it('should not throw on sync error', async () => {
      syncService.syncProduct.mockRejectedValue(new Error('sync failed'));
      await expect(
        listener.handleProductCreated({ productId: 'prod-1' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleProductUpdated', () => {
    it('should sync product on update', async () => {
      await listener.handleProductUpdated({ productId: 'prod-2' });
      expect(syncService.syncProduct).toHaveBeenCalledWith('prod-2');
    });
  });

  describe('handleProductDeleted', () => {
    it('should remove product on delete', async () => {
      await listener.handleProductDeleted({ productId: 'prod-3' });
      expect(syncService.removeProduct).toHaveBeenCalledWith('prod-3');
    });
  });

  describe('handleBrandUpdated', () => {
    it('should sync products by brand', async () => {
      await listener.handleBrandUpdated({ brandId: 'brand-1' });
      expect(syncService.syncProductsByBrand).toHaveBeenCalledWith('brand-1');
    });
  });

  describe('handleCategoryUpdated', () => {
    it('should sync products by category', async () => {
      await listener.handleCategoryUpdated({ categoryId: 'cat-1' });
      expect(syncService.syncProductsByCategory).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('handleSynonymUpdated', () => {
    it('should sync synonyms to Meilisearch', async () => {
      await listener.handleSynonymUpdated();
      expect(indexService.syncSynonyms).toHaveBeenCalled();
    });

    it('should not throw on sync error', async () => {
      indexService.syncSynonyms.mockRejectedValue(new Error('sync failed'));
      await expect(listener.handleSynonymUpdated()).resolves.toBeUndefined();
    });
  });
});
