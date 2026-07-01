import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { MeilisearchSyncService } from '../meilisearch/meilisearch-sync.service';
import { MeilisearchIndexService } from '../meilisearch/meilisearch-index.service';
import { SettingsService } from '../settings/settings.service';
import { ProductsService } from '../products/products.service';
import {
  ProductQueryService,
  SEARCH_ENGINE_CHANGED_EVENT,
} from '../products/product-query.service';

const VALID_ENGINES = ['meilisearch', 'postgres'] as const;

type HotProductsFilterParams = {
  search?: string;
  qcState?: 'with' | 'without';
  featuredState?: 'featured' | 'not_featured';
  shelfDays?: '7' | '8_30' | '30_plus';
  qcLevel?: 'lt3' | 'gte3';
  minPopularityScore?: number;
};

function parseHotProductsFilters(
  search?: string,
  qcState?: string,
  featuredState?: string,
  shelfDays?: string,
  qcLevel?: string,
  minPopularityScore?: string,
): HotProductsFilterParams {
  const parsedMinPopularityScore = minPopularityScore
    ? parseFloat(minPopularityScore)
    : undefined;

  return {
    search: search || undefined,
    qcState: qcState === 'with' || qcState === 'without' ? qcState : undefined,
    featuredState:
      featuredState === 'featured' || featuredState === 'not_featured'
        ? featuredState
        : undefined,
    shelfDays:
      shelfDays === '7' || shelfDays === '8_30' || shelfDays === '30_plus'
        ? shelfDays
        : undefined,
    qcLevel: qcLevel === 'lt3' || qcLevel === 'gte3' ? qcLevel : undefined,
    minPopularityScore:
      typeof parsedMinPopularityScore === 'number' &&
      Number.isFinite(parsedMinPopularityScore)
        ? parsedMinPopularityScore
        : undefined,
  };
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly meilisearchService: MeilisearchService,
    private readonly meilisearchSyncService: MeilisearchSyncService,
    private readonly meilisearchIndexService: MeilisearchIndexService,
    private readonly settingsService: SettingsService,
    private readonly productQueryService: ProductQueryService,
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priceState') priceState?: string,
    @Query('qcState') qcState?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('reviewSource') reviewSource?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('deadLink') deadLink?: string,
    @Query('shopIds') shopIds?: string,
  ) {
    return this.productQueryService.findAllAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search: search || undefined,
      status: status || undefined,
      priceState:
        priceState === 'zero' || priceState === 'priced'
          ? priceState
          : undefined,
      qcState:
        qcState === 'with' || qcState === 'without' ? qcState : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      reviewSource: reviewSource === 'sku_split' ? 'sku_split' : undefined,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
      deadLink: deadLink as 'suspected' | 'confirmed' | undefined,
      shopIds: shopIds
        ? shopIds
            .split(',')
            .map((shopId) => shopId.trim())
            .filter(Boolean)
        : undefined,
    });
  }

  @Get('products/shop-options')
  async getProductShopOptions(
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priceState') priceState?: string,
    @Query('qcState') qcState?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('reviewSource') reviewSource?: string,
    @Query('deadLink') deadLink?: string,
    @Query('shopSearch') shopSearch?: string,
  ) {
    return this.productQueryService.getAdminShopOptions(
      {
        search: search || undefined,
        status: status || undefined,
        priceState:
          priceState === 'zero' || priceState === 'priced'
            ? priceState
            : undefined,
        qcState:
          qcState === 'with' || qcState === 'without' ? qcState : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        reviewSource: reviewSource === 'sku_split' ? 'sku_split' : undefined,
        deadLink: deadLink as 'suspected' | 'confirmed' | undefined,
        shopSearch: shopSearch || undefined,
      },
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * 产品管理页 Tab 徽章计数（单次查询返回全部计数）
   * GET /admin/products/tab-counts
   */
  @Get('products/tab-counts')
  async getTabCounts() {
    return this.adminService.getTabCounts();
  }

  /**
   * 热门商品排行（按 popularityScore 排序，isFeatured 置顶）
   * GET /admin/products/hot
   */
  @Get('products/hot')
  async getHotProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('qcState') qcState?: string,
    @Query('featuredState') featuredState?: string,
    @Query('shelfDays') shelfDays?: string,
    @Query('qcLevel') qcLevel?: string,
    @Query('minPopularityScore') minPopularityScore?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    const filters = parseHotProductsFilters(
      search,
      qcState,
      featuredState,
      shelfDays,
      qcLevel,
      minPopularityScore,
    );

    return this.adminService.getHotProducts(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      filters.search,
      filters.qcState,
      filters.featuredState,
      filters.shelfDays,
      filters.qcLevel,
      filters.minPopularityScore,
      includeSummary !== 'false',
    );
  }

  /**
   * 热门商品全量统计（按当前筛选条件，独立于分页）
   * GET /admin/products/hot/summary
   */
  @Get('products/hot/summary')
  async getHotProductsSummary(
    @Query('search') search?: string,
    @Query('qcState') qcState?: string,
    @Query('featuredState') featuredState?: string,
    @Query('shelfDays') shelfDays?: string,
    @Query('qcLevel') qcLevel?: string,
    @Query('minPopularityScore') minPopularityScore?: string,
  ) {
    return this.adminService.getHotProductsSummary(
      parseHotProductsFilters(
        search,
        qcState,
        featuredState,
        shelfDays,
        qcLevel,
        minPopularityScore,
      ),
    );
  }

  /**
   * 批量更新推荐排序
   * PUT /admin/products/featured-sort
   */
  @Put('products/featured-sort')
  async updateFeaturedSort(
    @Body() body: { items: Array<{ id: string; featuredSort: number }> },
  ) {
    if (!body.items?.length) {
      throw new BadRequestException('items 不能为空');
    }
    return this.productsService.updateFeaturedSort(body.items);
  }

  /**
   * 切换商品推荐状态
   * PUT /admin/products/:id/featured
   */
  @Put('products/:id/featured')
  async toggleFeatured(@Param('id') id: string) {
    return this.productsService.toggleFeatured(id);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('meilisearch/health')
  async meilisearchHealth() {
    const healthy = await this.meilisearchService.isHealthy();
    return { healthy };
  }

  @Post('meilisearch/sync')
  async meilisearchFullSync() {
    const result = await this.meilisearchSyncService.fullSync();
    return result;
  }

  /**
   * 获取当前搜索引擎状态
   */
  @Get('meilisearch/engine')
  async getSearchEngine() {
    const current = this.productQueryService.searchEngine;
    const healthy = await this.meilisearchService.isHealthy();
    const degradation = this.productQueryService.getDegradationStats();

    // 索引校验（仅在 MeiliSearch 健康时）
    let indexStatus: {
      configMatch: boolean;
      missingSort: string[];
      missingFilter: string[];
      documentCount: number;
      dbProductCount: number;
    } | null = null;

    if (healthy) {
      try {
        const validation =
          await this.meilisearchIndexService.validateSettings();
        const dbCount = await this.adminService.getActiveProductCount();
        indexStatus = { ...validation, dbProductCount: dbCount };
      } catch {
        // 索引可能未创建
      }
    }

    return {
      current,
      meilisearchHealthy: healthy,
      options: VALID_ENGINES,
      indexStatus,
      degradation,
    };
  }

  /**
   * 切换搜索引擎（实时生效，无需重启）
   */
  @Put('meilisearch/engine')
  async setSearchEngine(@Body() body: { engine: string }) {
    const { engine } = body;
    if (!VALID_ENGINES.includes(engine as any)) {
      throw new BadRequestException(
        `无效的搜索引擎: ${engine}，可选值: ${VALID_ENGINES.join(', ')}`,
      );
    }

    // 写入 DB（持久化）
    await this.settingsService.set(
      'search_engine',
      engine,
      '搜索引擎（meilisearch | postgres）',
    );

    // 通过事件通知所有监听者刷新内存缓存（实时生效）
    this.eventEmitter.emit(SEARCH_ENGINE_CHANGED_EVENT, { engine });

    return {
      engine,
      message: `搜索引擎已切换为 ${engine}，立即生效`,
    };
  }
}
