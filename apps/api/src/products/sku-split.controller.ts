import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkuSplitService } from './services/sku-split.service';
import {
  SkuSplitPreviewDto,
  SkuSplitExecuteDto,
  SkuSplitAutoBatchDto,
} from './dto/sku-split.dto';
import { Product } from './entities/product.entity';
import { ProductStatus } from './product-status';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('SKU Split')
@Controller('products/sku-split')
export class SkuSplitController {
  constructor(
    private readonly skuSplitService: SkuSplitService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  @Post('prefetch')
  @UseGuards(JwtAuthGuard, AdminGuard)
  prefetch(@Body() dto: SkuSplitPreviewDto) {
    return this.skuSplitService.prefetchUrl(dto.weidianUrl);
  }

  @Post('preview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  preview(@Body() dto: SkuSplitPreviewDto) {
    return this.skuSplitService.previewSplit(dto.weidianUrl);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  execute(@Body() dto: SkuSplitExecuteDto) {
    return this.skuSplitService.createSplitJob(
      dto.weidianItemId,
      dto.shopId,
      dto.selectedAttrIds,
      undefined,
      dto.batchId,
    );
  }

  @Post('batch/auto')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createAutoBatch(@Body() dto: SkuSplitAutoBatchDto) {
    return this.skuSplitService.createAutoBatch(dto.weidianUrls);
  }

  /**
   * 列出拆分条目（批次聚合 + 单任务），按条目分页
   * GET /products/sku-split?page=1&pageSize=20
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  list(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.skuSplitService.listEntries(
      page ? Math.max(1, Number(page) || 1) : 1,
      pageSize ? Math.min(Math.max(1, Number(pageSize) || 20), 100) : 20,
    );
  }

  @Post(':id/retry')
  @UseGuards(JwtAuthGuard, AdminGuard)
  retry(@Param('id') id: string) {
    return this.skuSplitService.retryJob(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.skuSplitService.deleteJob(id);
  }

  /**
   * 查询同组产品（配色切换用）
   * 公开端点：前端详情页需要无认证调用
   * 注意：必须在 :id 路由之前声明，避免 "siblings" 被当成 :id
   */
  @Public()
  @Get('siblings')
  async getSiblings(@Query('productGroupId') productGroupId: string) {
    if (!productGroupId) {
      return [];
    }

    return this.productRepository.manager.query(
      `SELECT p.id,
              p.slug,
              p.title,
              p."mainImage",
              p."skuVariantKey",
              p."priceMin",
              split_item."variantValue"
       FROM products p
       LEFT JOIN sku_split_items split_item
         ON split_item."productId" = p.id
       WHERE p."productGroupId" = $1
         AND p.status = $2
       ORDER BY p."createdAt" ASC`,
      [productGroupId, ProductStatus.ACTIVE],
    );
  }

  /**
   * 查询批次详情（展开批次时调用）
   * GET /products/sku-split/batch/:batchId
   * 必须在 :id 路由之前声明
   */
  @Get('batch/:batchId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getBatchDetail(@Param('batchId') batchId: string) {
    return this.skuSplitService.getBatchJobs(batchId);
  }

  @Get('auto-batch/:batchId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAutoBatchDetail(@Param('batchId') batchId: string) {
    return this.skuSplitService.getAutoBatchDetail(batchId);
  }

  @Post('auto-batch/:batchId/retry-failed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  retryAutoBatchFailed(@Param('batchId') batchId: string) {
    return this.skuSplitService.retryAutoBatchFailed(batchId);
  }

  @Post('auto-batch/:batchId/pause')
  @UseGuards(JwtAuthGuard, AdminGuard)
  pauseAutoBatch(@Param('batchId') batchId: string) {
    return this.skuSplitService.pauseAutoBatch(batchId);
  }

  @Post('auto-batch/:batchId/resume')
  @UseGuards(JwtAuthGuard, AdminGuard)
  resumeAutoBatch(@Param('batchId') batchId: string) {
    return this.skuSplitService.resumeAutoBatch(batchId);
  }

  @Post('auto-batch/:batchId/cancel')
  @UseGuards(JwtAuthGuard, AdminGuard)
  cancelAutoBatch(@Param('batchId') batchId: string) {
    return this.skuSplitService.cancelAutoBatch(batchId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getDetail(@Param('id') id: string) {
    return this.skuSplitService.getJobDetail(id);
  }
}
