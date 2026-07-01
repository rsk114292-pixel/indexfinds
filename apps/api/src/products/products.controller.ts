import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { ImportFromWeidianDto } from './dto/import-from-weidian.dto';
import {
  StatusActionDto,
  BatchStatusActionDto,
  BatchDeleteDto,
  BatchCategoryUpdateDto,
} from './dto/status-action.dto';
import {
  SplitProductDto,
  RollbackSplitDto,
  QueryMixedProductsDto,
} from './dto/split-product.dto';
import { MixedProductService } from './mixed-product.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchAnalyticsService } from '../search/search-analytics.service';
import { FullTextSearchService } from '../search/full-text-search.service';
import { PersonalizedHotSearchService } from '../search/personalized-hot-search.service';
import type { Request } from 'express';
import { buildAnalyticsRequestContext } from '../shared/utils/analytics-request';
import { ProductsListCacheInterceptor } from './interceptors/products-list-cache.interceptor';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchAnalyticsService: SearchAnalyticsService,
    private readonly fullTextSearchService: FullTextSearchService,
    private readonly mixedProductService: MixedProductService,
    private readonly personalizedHotSearchService: PersonalizedHotSearchService,
  ) {}

  // ===== Product 端点 =====

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('import-from-weidian')
  @UseGuards(JwtAuthGuard, AdminGuard)
  importFromWeidian(@Body() importDto: ImportFromWeidianDto) {
    return this.productsService.importFromWeidian(importDto);
  }

  /**
   * 从微店导入商品（带混合商品检测）v2.1
   * POST /products/import-from-weidian-v2
   *
   * 使用综合分析检测混合商品，返回详细的混合度信息和处理建议
   */
  @Post('import-from-weidian-v2')
  @UseGuards(JwtAuthGuard, AdminGuard)
  importFromWeidianWithMixedDetection(@Body() importDto: ImportFromWeidianDto) {
    return this.productsService.importFromWeidianWithMixedDetection(importDto);
  }

  @Public()
  @Get('suggest')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟
  async suggest(@Query('q') query: string) {
    return this.productsService.getSuggestions(query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('hot-searches/personalized')
  @Throttle({ long: { limit: 120, ttl: 60000 } })
  async getPersonalizedHotSearches(
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
    @Query('limit') limit?: number,
  ) {
    const requestContext = buildAnalyticsRequestContext(req, user?.id);
    return this.personalizedHotSearchService.getPersonalizedHotSearches(
      limit || 10,
      user?.id,
      requestContext.trustedVisitorId,
    );
  }

  @Public()
  @Get('hot-searches')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟
  async getHotSearches(@Query('limit') limit?: number) {
    const searches = await this.searchAnalyticsService.getHotSearches(
      limit || 10,
    );
    return searches.map((s) => ({
      keyword: s.keyword,
      count: s.searchCount7d,
    }));
  }

  /**
   * 模糊搜索 - 支持拼写错误
   * GET /products/fuzzy-search?q=nikee&threshold=0.3
   */
  @Public()
  @Get('fuzzy-search')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟
  async fuzzySearch(
    @Query('q') query: string,
    @Query('threshold') threshold?: number,
    @Query('limit') limit?: number,
  ) {
    const results = await this.fullTextSearchService.fuzzySearch(
      query,
      threshold ? parseFloat(String(threshold)) : 0.3,
      limit || 20,
    );
    return {
      query,
      total: results.length,
      data: results.map((r) => ({
        ...r.product,
        _score: r.score,
      })),
    };
  }

  /**
   * 拼写纠错建议
   * GET /products/spelling-suggest?q=nikee
   */
  @Public()
  @Get('spelling-suggest')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟
  async spellingSuggest(@Query('q') query: string) {
    const suggestions =
      await this.fullTextSearchService.spellingSuggestions(query);
    return {
      query,
      suggestions,
    };
  }

  /**
   * 增强版搜索建议（包含拼写纠错）
   * GET /products/autocomplete?q=nik
   */
  @Public()
  @Get('autocomplete')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟
  async autocomplete(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const suggestions = await this.fullTextSearchService.searchSuggestions(
      query,
      limit || 10,
    );
    return {
      query,
      suggestions,
    };
  }

  @Public()
  @Get('facets')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟
  @Throttle({ long: { limit: 120, ttl: 60000 } })
  getFacets(@Query() query: QueryProductDto) {
    return this.productsService.getFacets(query);
  }

  @Public()
  @Get('search')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  async searchProducts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
      return { query: '', total: 0, data: [] };
    }

    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 20)
      : 10;
    const data = await this.productsService.search(normalizedQuery, safeLimit);

    return {
      query: normalizedQuery,
      total: data.length,
      data,
    };
  }

  @Public()
  @Get('slug/:slug')
  @Throttle({ long: { limit: 180, ttl: 60000 } })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  /**
   * 获取已发布商品的 slugs（用于 Sitemap 生成）
   * GET /products/slugs         → 全量
   * GET /products/slugs?page=1&limit=5000 → 分页 + total
   */
  @Public()
  @Get('slugs')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(1296000000) // 缓存15天（新商品发布时主动刷新）
  getAllSlugs(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.productsService.getAllSlugs(p, l);
  }

  @Public()
  @Get(':id/buy-link')
  getBuyLink(@Param('id') id: string, @Query('platform') platformKey?: string) {
    return this.productsService.generateBuyLink(id, platformKey);
  }

  @Public()
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(ProductsListCacheInterceptor)
  @CacheTTL(300000) // 缓存5分钟，减少DB压力
  @Throttle({ long: { limit: 120, ttl: 60000 } })
  findAll(
    @Query() query: QueryProductDto,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ) {
    const requestContext = buildAnalyticsRequestContext(req, user?.id);
    return this.productsService.findAll(query, {
      userId: user?.id,
      sessionId: requestContext.trustedVisitorId,
      deviceId: requestContext.trustedVisitorId,
      visitId: requestContext.visitId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
  }

  // ===== 混合商品拆分端点 (v2.1) - 必须在 :id 路由之前 =====

  /**
   * 获取待处理的混合商品列表
   * GET /products/mixed
   */
  @Get('mixed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getMixedProducts(@Query() query: QueryMixedProductsDto) {
    return this.mixedProductService.getMixedProductsList(query);
  }

  /**
   * 执行商品拆分
   * POST /products/split
   */
  @Post('split')
  @UseGuards(JwtAuthGuard, AdminGuard)
  splitProduct(@Body() dto: SplitProductDto) {
    return this.mixedProductService.executeSplit({
      productId: dto.productId,
      skuMappings: dto.skuMappings,
      customGroups: dto.customGroups,
    });
  }

  /**
   * 获取所有拆分历史列表（分页）
   * GET /products/split-history
   */
  @Get('split-history')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAllSplitHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('weidianItemId') weidianItemId?: string,
  ) {
    return this.mixedProductService.getAllSplitHistory({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      weidianItemId,
    });
  }

  /**
   * 获取拆分历史详情
   * GET /products/split-history/:id
   */
  @Get('split-history/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getSplitHistoryDetail(@Param('id') id: string) {
    return this.mixedProductService.getSplitHistoryDetail(id);
  }

  /**
   * 回滚拆分操作
   * POST /products/split-history/:id/rollback
   */
  @Post('split-history/:id/rollback')
  @UseGuards(JwtAuthGuard, AdminGuard)
  rollbackSplit(@Param('id') id: string, @Body() dto: RollbackSplitDto) {
    return this.mixedProductService.rollbackSplit(
      id,
      dto.reason || 'Manual rollback from admin panel',
    );
  }

  /**
   * 删除拆分历史记录
   * DELETE /products/split-history/:id
   */
  @Delete('split-history/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSplitHistory(@Param('id') id: string) {
    return this.mixedProductService.deleteSplitHistory(id);
  }

  /**
   * 批量删除拆分历史
   * POST /products/split-history/batch-delete
   */
  @Post('split-history/batch-delete')
  @UseGuards(JwtAuthGuard, AdminGuard)
  batchDeleteSplitHistory(@Body() body: { ids: string[] }) {
    return this.mixedProductService.batchDeleteSplitHistory(body.ids);
  }

  /**
   * 批量删除
   * POST /products/batch-delete
   * Body: { ids: ['id1', 'id2'] }
   */
  @Post('batch-delete')
  @UseGuards(JwtAuthGuard, AdminGuard)
  batchDelete(@Body() dto: BatchDeleteDto) {
    return this.productsService.batchRemove(dto.ids);
  }

  /**
   * 批量状态操作
   * POST /products/batch-status
   * Body: { ids: ['id1', 'id2'], action: 'approve' }
   */
  @Post('batch-status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  batchStatusAction(@Body() dto: BatchStatusActionDto) {
    return this.productsService.batchUpdateStatus(dto.ids, dto.action, {
      allowParentCategory: dto.allowParentCategory,
    });
  }

  /**
   * 批量更新主分类
   * POST /products/batch-category
   * Body: { ids: ['id1', 'id2'], primaryCategoryId: 'cat-id' }
   */
  @Post('batch-category')
  @UseGuards(JwtAuthGuard, AdminGuard)
  batchCategoryUpdate(@Body() dto: BatchCategoryUpdateDto) {
    return this.productsService.batchUpdatePrimaryCategory(
      dto.ids,
      dto.primaryCategoryId,
      {
        scope: dto.scope,
        approveAfterUpdate: dto.approveAfterUpdate,
        allowParentCategory: dto.allowParentCategory,
      },
    );
  }

  @Get(':id')
  @Throttle({ long: { limit: 180, ttl: 60000 } })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ===== 状态管理端点 =====

  /**
   * 获取商品可执行的状态操作
   * GET /products/:id/status-actions
   */
  @Get(':id/status-actions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getStatusActions(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    const actions = this.productsService.getAvailableStatusActions(
      product.status,
    );
    return {
      currentStatus: product.status,
      availableActions: actions,
    };
  }

  /**
   * 执行商品状态操作
   * POST /products/:id/status
   * Body: { action: 'approve' | 'reject' | 'publish' | ... }
   */
  @Post(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  performStatusAction(@Param('id') id: string, @Body() dto: StatusActionDto) {
    return this.productsService.performStatusAction(id, dto.action);
  }

  /**
   * 快捷操作：审核通过
   * POST /products/:id/approve
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approveProduct(@Param('id') id: string) {
    return this.productsService.approveProduct(id);
  }

  /**
   * 快捷操作：审核拒绝
   * POST /products/:id/reject
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  rejectProduct(@Param('id') id: string) {
    return this.productsService.rejectProduct(id);
  }

  /**
   * 快捷操作：直接发布
   * POST /products/:id/publish
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, AdminGuard)
  publishProduct(@Param('id') id: string) {
    return this.productsService.publishProduct(id);
  }

  /**
   * 快捷操作：下架
   * POST /products/:id/unpublish
   */
  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, AdminGuard)
  unpublishProduct(@Param('id') id: string) {
    return this.productsService.unpublishProduct(id);
  }

  // ===== 混合商品拆分端点 - 带 :id 参数的路由 =====

  /**
   * 获取混合商品详情（包含 AI 分析数据）
   * GET /products/:id/mixed-detail
   */
  @Get(':id/mixed-detail')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getMixedProductDetail(@Param('id') id: string) {
    return this.mixedProductService.getMixedProductDetail(id);
  }

  /**
   * 生成拆分预览 - 自动预填 SKU 映射
   * GET /products/:id/split-preview
   */
  @Get(':id/split-preview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getSplitPreview(@Param('id') id: string) {
    return this.mixedProductService.generateSplitPreview(id);
  }

  /**
   * 获取商品的拆分历史
   * GET /products/:id/split-history
   */
  @Get(':id/split-history')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getSplitHistory(@Param('id') id: string) {
    return this.mixedProductService.getSplitHistory(id);
  }

  // ===== 统计端点 =====

  /**
   * 记录商品浏览（前端详情页主动上报）
   * POST /products/:id/view
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  async recordView(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user?: { id: string },
  ): Promise<void> {
    await this.productsService.recordProductView(
      id,
      buildAnalyticsRequestContext(req, user?.id),
    );
  }

  /**
   * 记录商品点击
   * POST /products/:id/click
   */
  @Public()
  @Post(':id/click')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ long: { limit: 60, ttl: 60000 } })
  async recordClick(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.productsService.recordProductClick(
      id,
      buildAnalyticsRequestContext(req),
    );
  }

  // ===== SKU 端点 =====

  @Post('skus')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createSku(@Body() createSkuDto: CreateSkuDto) {
    return this.productsService.createSku(createSkuDto);
  }

  @Get(':productId/skus')
  findSkusByProduct(@Param('productId') productId: string) {
    return this.productsService.findSkusByProduct(productId);
  }

  @Get('skus/:id')
  findOneSku(@Param('id') id: string) {
    return this.productsService.findOneSku(id);
  }

  @Patch('skus/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateSku(@Param('id') id: string, @Body() updateSkuDto: UpdateSkuDto) {
    return this.productsService.updateSku(id, updateSkuDto);
  }

  @Delete('skus/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSku(@Param('id') id: string) {
    return this.productsService.removeSku(id);
  }
}
