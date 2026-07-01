import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { QueryBrandCandidateDto } from './dto/query-brand-candidate.dto';
import { ResolveBrandCandidateDto } from './dto/resolve-brand-candidate.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BrandGovernanceService } from './brand-governance.service';

const CACHE_1_HOUR = 3600000;

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly brandGovernanceService: BrandGovernanceService,
  ) {}

  // Admin: Create brand
  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandsService.create(createBrandDto);
  }

  // Public: Get brand list
  @Public()
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findAll(@Query() query: QueryBrandDto) {
    return this.brandsService.findAll(query);
  }

  // Admin: Get brand list (no cache, real-time data)
  @Get('admin/list')
  @UseGuards(AdminGuard)
  findAllAdmin(@Query() query: QueryBrandDto) {
    return this.brandsService.findAll(query);
  }

  // Admin: Get pending review brands
  @Get('pending')
  @UseGuards(AdminGuard)
  findPending() {
    return this.brandsService.findPending();
  }

  // Public: Get top-level brands (no parent)
  @Public()
  @Get('top-level')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findTopLevel() {
    return this.brandsService.findTopLevel();
  }

  // Public: Get brands grouped by category
  @Public()
  @Get('by-category')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findByCategory() {
    return this.brandsService.findByCategory();
  }

  // Public: Get brand by slug
  @Public()
  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  // Public: Get categories where this brand has products
  @Public()
  @Get('slug/:slug/categories')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findBrandCategories(@Param('slug') slug: string) {
    return this.brandsService.findCategoriesByBrandSlug(slug);
  }

  // Public: Get related brands (same category)
  @Public()
  @Get('slug/:slug/related')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findRelatedBrands(
    @Param('slug') slug: string,
    @Query('limit') limit?: number,
  ) {
    return this.brandsService.findRelatedBrands(slug, limit || 8);
  }

  /**
   * 获取所有活跃品牌的 slugs（用于 Sitemap 生成）
   * GET /brands/slugs
   */
  @Public()
  @Get('slugs')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  getAllSlugs() {
    return this.brandsService.getAllSlugs();
  }

  // Admin: Fetch brand logo from external source
  // 必须在 :id 路由之前，否则 'logo' 会被当作 :id 参数
  @Get('logo/fetch')
  @UseGuards(AdminGuard)
  fetchLogo(@Query('name') name: string) {
    return this.brandsService.fetchBrandLogo(name);
  }

  // Admin: Backfill logos for brands missing logoUrl
  @Post('backfill-logos')
  @UseGuards(AdminGuard)
  backfillLogos() {
    return this.brandsService.backfillLogos();
  }

  // Admin: Backfill legacy products with aiBrandName but no brandId
  @Post('backfill')
  @UseGuards(AdminGuard)
  backfill() {
    return this.brandsService.backfillBrands();
  }

  // Admin: List brand candidates (mainly historical/manual/exception sources)
  @Get('admin/candidates')
  @UseGuards(AdminGuard)
  findCandidates(@Query() query: QueryBrandCandidateDto) {
    return this.brandGovernanceService.listCandidates(query);
  }

  // Admin: Get candidate review evidence
  @Get('admin/candidates/:id')
  @UseGuards(AdminGuard)
  findCandidateDetail(@Param('id') id: string) {
    return this.brandGovernanceService.getCandidateDetail(id);
  }

  // Admin: Resolve brand candidate (mainly historical/manual/exception sources)
  @Post('admin/candidates/:id/resolve')
  @UseGuards(AdminGuard)
  resolveCandidate(
    @Param('id') id: string,
    @Body() body: ResolveBrandCandidateDto,
  ) {
    return this.brandGovernanceService.resolveCandidate(id, body);
  }

  // Public: Get brand by ID with children
  @Public()
  @Get(':id/with-children')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findOneWithChildren(@Param('id') id: string) {
    return this.brandsService.findOneWithChildren(id);
  }

  // Public: Get brand's children
  @Public()
  @Get(':id/children')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findChildren(@Param('id') id: string) {
    return this.brandsService.findChildren(id);
  }

  // Public: Get brand by ID
  @Public()
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  // Admin: Update brand
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandsService.update(id, updateBrandDto);
  }

  // Admin: Delete brand (soft delete → inactive)
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }

  // Admin: Approve brand (pending_review -> active)
  @Patch(':id/approve')
  @UseGuards(AdminGuard)
  approve(@Param('id') id: string) {
    return this.brandsService.approve(id);
  }

  // Admin: Reject brand (pending_review -> rejected)
  @Patch(':id/reject')
  @UseGuards(AdminGuard)
  reject(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.brandsService.reject(id, undefined, reason);
  }

  // Admin: Merge brands
  @Post(':sourceId/merge/:targetId')
  @UseGuards(AdminGuard)
  merge(
    @Param('sourceId') sourceId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.brandsService.merge(sourceId, targetId);
  }
}
