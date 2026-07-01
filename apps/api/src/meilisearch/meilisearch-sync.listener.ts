import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProductEvents } from '../shared/events/product.events';
import { BrandEvents } from '../shared/events/brand.events';
import { CategoryEvents } from '../shared/events/category.events';
import { SynonymEvents } from '../shared/events/synonym.events';
import { MeilisearchSyncService } from './meilisearch-sync.service';
import { MeilisearchIndexService } from './meilisearch-index.service';

@Injectable()
export class MeilisearchSyncListener {
  private readonly logger = new Logger(MeilisearchSyncListener.name);

  constructor(
    private readonly syncService: MeilisearchSyncService,
    private readonly indexService: MeilisearchIndexService,
  ) {}

  @OnEvent(ProductEvents.CREATED)
  async handleProductCreated(payload: { productId: string }) {
    try {
      await this.syncService.syncProduct(payload.productId);
    } catch (error) {
      this.logger.error(
        `Sync failed for created product ${payload.productId}: ${error.message}`,
      );
    }
  }

  @OnEvent(ProductEvents.UPDATED)
  async handleProductUpdated(payload: { productId: string }) {
    try {
      await this.syncService.syncProduct(payload.productId);
    } catch (error) {
      this.logger.error(
        `Sync failed for updated product ${payload.productId}: ${error.message}`,
      );
    }
  }

  @OnEvent(ProductEvents.DELETED)
  async handleProductDeleted(payload: { productId: string }) {
    try {
      await this.syncService.removeProduct(payload.productId);
    } catch (error) {
      this.logger.error(
        `Sync failed for deleted product ${payload.productId}: ${error.message}`,
      );
    }
  }

  @OnEvent(BrandEvents.UPDATED)
  async handleBrandUpdated(payload: { brandId: string }) {
    try {
      await this.syncService.syncProductsByBrand(payload.brandId);
    } catch (error) {
      this.logger.error(
        `Sync failed for brand ${payload.brandId}: ${error.message}`,
      );
    }
  }

  @OnEvent(CategoryEvents.UPDATED)
  async handleCategoryUpdated(payload: { categoryId: string }) {
    try {
      await this.syncService.syncProductsByCategory(payload.categoryId);
    } catch (error) {
      this.logger.error(
        `Sync failed for category ${payload.categoryId}: ${error.message}`,
      );
    }
  }

  @OnEvent(SynonymEvents.UPDATED)
  async handleSynonymUpdated() {
    try {
      await this.indexService.syncSynonyms();
    } catch (error) {
      this.logger.error(`Synonym sync to Meilisearch failed: ${error.message}`);
    }
  }
}
