import { Injectable, type OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Product } from './entities/product.entity';
import type { QueryProductDto } from './dto/query-product.dto';
import type { FacetResult } from './product-facet.service';
import type { SearchContext } from '../search/dto/search-analytics.types';
import { ProductSearchRuntimeService } from './product-search-runtime.service';
import { ProductDetailService } from './product-detail.service';
import { ProductPurchaseService } from './product-purchase.service';
import { ProductCatalogQueryService } from './product-catalog-query.service';
import { AdminProductQueryService } from './admin-product-query.service';
import { SEARCH_ENGINE_CHANGED_EVENT } from './product-query.constants';

export { SEARCH_ENGINE_CHANGED_EVENT } from './product-query.constants';

@Injectable()
export class ProductQueryService implements OnModuleInit {
  constructor(
    private readonly runtimeService: ProductSearchRuntimeService,
    private readonly detailService: ProductDetailService,
    private readonly purchaseService: ProductPurchaseService,
    private readonly catalogQueryService: ProductCatalogQueryService,
    private readonly adminProductQueryService: AdminProductQueryService,
  ) {}

  async onModuleInit() {
    await this.runtimeService.onModuleInit();
  }

  getDegradationStats() {
    return this.runtimeService.getDegradationStats();
  }

  @OnEvent(SEARCH_ENGINE_CHANGED_EVENT)
  handleSearchEngineChanged(payload: { engine: string }) {
    this.runtimeService.handleSearchEngineChanged(payload);
  }

  get searchEngine(): string {
    return this.runtimeService.searchEngine;
  }

  async invalidateProductDetailCacheBySlug(
    slug?: string | null,
  ): Promise<void> {
    await this.detailService.invalidateProductDetailCacheBySlug(slug);
  }

  async findAllAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priceState?: 'zero' | 'priced';
    qcState?: 'with' | 'without';
    minPrice?: number;
    maxPrice?: number;
    reviewSource?: 'sku_split';
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    deadLink?: 'suspected' | 'confirmed';
    shopIds?: string[];
  }): Promise<{
    data: Product[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.adminProductQueryService.findAllAdmin(query);
  }

  async getAdminShopOptions(
    query: {
      search?: string;
      status?: string;
      priceState?: 'zero' | 'priced';
      qcState?: 'with' | 'without';
      minPrice?: number;
      maxPrice?: number;
      reviewSource?: 'sku_split';
      deadLink?: 'suspected' | 'confirmed';
      shopSearch?: string;
    },
    limit?: number,
  ) {
    return this.adminProductQueryService.getAdminShopOptions(query, limit);
  }

  async findAll(
    query: QueryProductDto,
    searchContext: SearchContext = {},
  ): Promise<{
    data: Product[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      searchLogId?: string;
      usedFallback?: boolean;
      semanticEnhanced?: boolean;
    };
  }> {
    return this.catalogQueryService.findAll(query, searchContext);
  }

  async getFacets(query: QueryProductDto): Promise<FacetResult> {
    return this.catalogQueryService.getFacets(query);
  }

  async findOne(id: string): Promise<Product> {
    return this.detailService.findOne(id);
  }

  async findBySlug(slug: string): Promise<Product> {
    return this.detailService.findBySlug(slug);
  }

  async findByWeidianItemId(weidianItemId: string): Promise<Product | null> {
    return this.detailService.findByWeidianItemId(weidianItemId);
  }

  async findActiveBySourceProductId(
    sourceProductId: string,
  ): Promise<Pick<Product, 'id' | 'slug'>> {
    return this.detailService.findActiveBySourceProductId(sourceProductId);
  }

  async getAllSlugs(
    page?: number,
    limit?: number,
  ): Promise<{ slugs: string[]; total?: number }> {
    return this.detailService.getAllSlugs(page, limit);
  }

  async search(query: string, limit: number = 10): Promise<Product[]> {
    return this.catalogQueryService.search(query, limit);
  }

  async generateBuyLink(productId: string, platformKey?: string) {
    return this.purchaseService.generateBuyLink(productId, platformKey);
  }

  async getAvailablePlatforms() {
    return this.purchaseService.getAvailablePlatforms();
  }
}
