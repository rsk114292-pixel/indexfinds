import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';

const CACHE_1_HOUR = 3600000;

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private async mapCategoriesWithStats(includeLegacy?: string) {
    const canonicalOnly = includeLegacy !== 'true';
    const categories = await this.categoriesService.findAll({ canonicalOnly });
    const stats = await this.categoriesService.getCategoryStats();

    return categories.map((c) => ({
      ...c,
      ...(stats.get(c.id) ?? {}),
    }));
  }

  // Admin: 获取分类列表（无缓存，实时数据）
  @Get('admin/list')
  @UseGuards(AdminGuard)
  async findAllAdmin(
    @Query('flat') flat?: string,
    @Query('withStats') withStats?: string,
    @Query('includeLegacy') includeLegacy?: string,
  ) {
    const canonicalOnly = includeLegacy !== 'true';
    if (flat === 'true') {
      return this.categoriesService.findAllFlat({ canonicalOnly });
    }
    if (withStats === 'true') {
      return this.mapCategoriesWithStats(includeLegacy);
    }
    return this.categoriesService.findAll({ canonicalOnly });
  }

  // 创建分类
  @UseGuards(AdminGuard)
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // 获取完整分类树
  @Public()
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  async findAll(
    @Query('flat') flat?: string,
    @Query('withStats') withStats?: string,
    @Query('includeLegacy') includeLegacy?: string,
  ) {
    const canonicalOnly = includeLegacy !== 'true';
    // 如果传入 ?flat=true，返回扁平化列表
    if (flat === 'true') {
      return this.categoriesService.findAllFlat({ canonicalOnly });
    }
    const categories = await this.categoriesService.findAll({ canonicalOnly });
    if (withStats === 'true') {
      const stats = await this.categoriesService.getCategoryStats();
      return categories.map((c) => ({
        ...c,
        ...(stats.get(c.id) ?? {}),
      }));
    }
    return categories;
  }

  // 首页使用：实时带统计，避免命中长时间缓存导致首页分类图和数量滞后
  @Public()
  @Get('home')
  async findHomeCategories(@Query('includeLegacy') includeLegacy?: string) {
    return this.mapCategoriesWithStats(includeLegacy);
  }

  // 兼容旧接口：获取完整分类树
  @Public()
  @Get('tree')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findAllTree() {
    return this.categoriesService.findAll({ canonicalOnly: true });
  }

  // 根据 slug 查询分类
  @Public()
  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  /**
   * 获取所有活跃分类的 slugs（用于 Sitemap 生成）
   * GET /categories/slugs
   */
  @Public()
  @Get('slugs')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  getAllSlugs() {
    return this.categoriesService.getAllSlugs();
  }

  // 获取分类的祖先链（用于面包屑）
  @Public()
  @Get(':id/ancestors')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findAncestors(@Param('id') id: string) {
    return this.categoriesService.findAncestors(id);
  }

  // 获取分类的后代列表
  @Public()
  @Get(':id/descendants')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findDescendants(@Param('id') id: string) {
    return this.categoriesService.findDescendants(id);
  }

  // 获取分类的子树
  @Public()
  @Get(':id/tree')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findDescendantsTree(@Param('id') id: string) {
    return this.categoriesService.findDescendantsTree(id);
  }

  // 获取单个分类
  @Public()
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_1_HOUR)
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  // 更新分类
  @UseGuards(AdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  // 删除分类
  @UseGuards(AdminGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
