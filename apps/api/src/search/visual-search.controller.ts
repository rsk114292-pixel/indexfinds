import {
  Controller,
  Post,
  Get,
  Inject,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CACHE_MANAGER, CacheTTL } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  VisualSearchService,
  VisualSearchResult,
  VisualSearchSourceProduct,
} from './visual-search.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { QUEUE_NAMES } from '../queue/queue.module';
import { VisualSearchByProductCacheInterceptor } from './visual-search-cache.interceptor';

const VISUAL_SEARCH_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;
const VISUAL_SEARCH_UPLOAD_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const VISUAL_SEARCH_STATUS_CACHE_KEY = 'visual-search:status:v1';
const VISUAL_SEARCH_STATUS_CACHE_TTL_MS = 120000;

type VisualSearchStatusResponse = {
  available: boolean;
  message: string;
  stats: {
    productsWithEmbedding: number;
    productsWithoutEmbedding: number;
    totalImageEmbeddings: number;
    coverage: number;
  };
};

/**
 * 以图搜图 API 控制器
 *
 * 提供基于图片的商品搜索功能
 */
@ApiTags('Visual Search')
@Controller('visual-search')
export class VisualSearchController {
  private readonly logger = new Logger(VisualSearchController.name);

  constructor(
    private readonly visualSearchService: VisualSearchService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * 健康检查 & 服务状态
   *
   * GET /api/visual-search/status
   */
  @Get('status')
  @Public()
  async getStatus(): Promise<VisualSearchStatusResponse> {
    try {
      const cached = await this.cacheManager.get<VisualSearchStatusResponse>(
        VISUAL_SEARCH_STATUS_CACHE_KEY,
      );
      if (cached) {
        return cached;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Visual search status cache read failed: ${message}`);
    }

    const isAvailable = this.visualSearchService.isAvailable();
    const withEmbedding =
      await this.visualSearchService.countProductsWithEmbedding();
    const withoutEmbedding =
      await this.visualSearchService.countProductsWithoutEmbedding();
    const totalImageEmbeddings =
      await this.visualSearchService.countTotalImageEmbeddings();

    const status = {
      available: isAvailable,
      message: isAvailable
        ? 'Visual search is ready'
        : 'Embedding service is not available',
      stats: {
        productsWithEmbedding: withEmbedding,
        productsWithoutEmbedding: withoutEmbedding,
        totalImageEmbeddings: totalImageEmbeddings,
        coverage:
          withEmbedding + withoutEmbedding > 0
            ? Math.round(
                (withEmbedding / (withEmbedding + withoutEmbedding)) * 100,
              )
            : 0,
      },
    };

    try {
      await this.cacheManager.set(
        VISUAL_SEARCH_STATUS_CACHE_KEY,
        status,
        VISUAL_SEARCH_STATUS_CACHE_TTL_MS,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Visual search status cache write failed: ${message}`);
    }

    return status;
  }

  /**
   * 以图搜图
   *
   * POST /api/visual-search/search
   *
   * @param file 上传的图片文件
   * @param limit 返回结果数量 (默认 12，最大 12)
   * @param minSimilarity 最低相似度阈值 (默认 60，范围 0-100)
   */
  @Post('search')
  @Public()
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 10 },
  })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: VISUAL_SEARCH_UPLOAD_MAX_BYTES,
      },
      fileFilter: (_req, file, cb) => {
        if (!VISUAL_SEARCH_UPLOAD_ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`,
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async searchByImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('limit') limitStr?: string,
    @Query('minSimilarity') minSimilarityStr?: string,
  ): Promise<{ results: VisualSearchResult[]; total: number }> {
    if (!this.isUploadSearchEnabled()) {
      throw new ServiceUnavailableException(
        'Visual search upload is temporarily unavailable. Please try again later.',
      );
    }

    // 检查服务是否可用
    if (!this.visualSearchService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Visual search service is temporarily unavailable. Please try again later.',
      );
    }

    // 验证文件
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    this.validateUploadedImage(file);

    // 解析参数
    const limit = this.parseBoundedInt(limitStr, 12, 1, 12);
    const minSimilarity = this.parseBoundedInt(minSimilarityStr, 60, 0, 100);

    // 执行搜索
    const results = await this.visualSearchService.searchByImage(
      file.buffer,
      limit,
      minSimilarity,
    );

    return {
      results,
      total: results.length,
    };
  }

  private isUploadSearchEnabled(): boolean {
    return (
      this.configService.get<string>(
        'VISUAL_SEARCH_UPLOAD_ENABLED',
        'false',
      ) === 'true'
    );
  }

  private validateUploadedImage(file: Express.Multer.File): void {
    if (!VISUAL_SEARCH_UPLOAD_ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`,
      );
    }

    const size = file.size ?? file.buffer?.length ?? 0;
    if (size > VISUAL_SEARCH_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(
        'Image file is too large. Maximum size: 3MB',
      );
    }
  }

  private parseBoundedInt(
    value: string | undefined,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    const parsed = Number.parseInt(value ?? '', 10);
    const numeric = Number.isFinite(parsed) ? parsed : defaultValue;
    return Math.min(Math.max(numeric, min), max);
  }

  /**
   * 以图搜相似 — 根据商品 ID 查找视觉相似商品
   *
   * GET /visual-search/by-product/:productId
   */
  @Get('by-product/:productId')
  @Public()
  @Throttle({ long: { ttl: 60000, limit: 20 } })
  @UseInterceptors(VisualSearchByProductCacheInterceptor)
  @CacheTTL(3600000) // 1 小时
  async searchByProduct(
    @Param('productId') productId: string,
    @Query('limit') limitStr?: string,
    @Query('minSimilarity') minSimilarityStr?: string,
  ): Promise<{
    sourceProduct: VisualSearchSourceProduct | null;
    results: VisualSearchResult[];
    total: number;
  }> {
    const limit = Math.min(
      Math.max(parseInt(limitStr || '50', 10) || 50, 1),
      24,
    );
    const minSimilarity = Math.min(
      Math.max(parseInt(minSimilarityStr || '25', 10) || 25, 0),
      100,
    );

    const { sourceProduct, results } =
      await this.visualSearchService.searchByProductId(
        productId,
        limit,
        minSimilarity,
      );

    return {
      sourceProduct,
      results,
      total: results.length,
    };
  }

  /**
   * 为单个商品生成所有图片的 embedding
   *
   * POST /visual-search/generate/:productId
   *
   * 用于手动触发单个商品的所有图片 embedding 生成
   */
  @Post('generate/:productId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async generateEmbedding(
    @Param('productId') productId: string,
  ): Promise<{ success: number; failed: number; productId: string }> {
    if (!this.visualSearchService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Embedding service is not available',
      );
    }

    const result =
      await this.visualSearchService.generateProductEmbeddings(productId);

    return {
      success: result.success,
      failed: result.failed,
      productId,
    };
  }

  /**
   * 批量生成缺失的 embeddings（通过队列异步处理）
   *
   * POST /visual-search/batch-generate
   *
   * 管理后台用：触发批量生成任务
   */
  @Post('batch-generate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async batchGenerate(@Body('limit') limit?: number): Promise<{
    message: string;
    queued: boolean;
    pendingCount: number;
  }> {
    if (!this.visualSearchService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Embedding service is not available',
      );
    }

    const pendingCount =
      await this.visualSearchService.countProductsWithoutEmbedding();

    if (pendingCount === 0) {
      return {
        message: 'All products already have embeddings',
        queued: false,
        pendingCount: 0,
      };
    }

    // 添加批量任务到队列（limit 上限 500，防止单任务处理过久）
    const safeLimit = Math.min(Math.max(limit || 100, 1), 500);
    await this.embeddingQueue.add(
      'batch-generate',
      { type: 'batch', limit: safeLimit, embeddingType: 'image' },
      { priority: 3 }, // 低优先级，不影响单个商品的实时生成
    );

    return {
      message: `Batch embedding generation started for ${pendingCount} products`,
      queued: true,
      pendingCount,
    };
  }

  /**
   * 重新生成所有 embeddings（通过队列异步处理）
   *
   * POST /visual-search/regenerate-all
   *
   * 利用 ON CONFLICT DO UPDATE 覆盖更新，不删除旧数据，搜索不中断
   */
  @Post('regenerate-all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateAll(): Promise<{
    message: string;
    queued: boolean;
    totalCount: number;
  }> {
    if (!this.visualSearchService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Embedding service is not available',
      );
    }

    // 标记所有 embedding 为待重建（置 NULL），让 batchGenerate 重新处理
    await this.visualSearchService.markAllEmbeddingsForRegeneration();

    const totalCount =
      await this.visualSearchService.countProductsWithoutEmbedding();

    // 按批次投递队列任务，确保全部商品都被处理
    const batchSize = 500;
    const batchCount = Math.ceil(totalCount / batchSize);
    for (let i = 0; i < batchCount; i++) {
      await this.embeddingQueue.add(
        'batch-generate',
        { type: 'batch', limit: batchSize, embeddingType: 'image' },
        { priority: 3 },
      );
    }

    return {
      message: `Regenerating embeddings for all ${totalCount} products (${batchCount} batch jobs queued)`,
      queued: true,
      totalCount,
    };
  }
}
