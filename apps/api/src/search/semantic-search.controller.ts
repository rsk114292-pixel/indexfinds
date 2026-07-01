import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SemanticSearchService } from './semantic-search.service';
import { VisualSearchService } from './visual-search.service';
import { EmbeddingHealthService } from './embedding-health.service';
import { SEMANTIC_CONFIG } from '../config/search.config';

const COMBINED_VECTOR_STATS_CACHE_TTL_MS = 120000;

/**
 * 语义搜索管理 API
 * 用于管理向量生成和查看统计信息
 */
@ApiTags('Semantic Search')
@Controller('admin/semantic-search')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SemanticSearchController {
  constructor(
    private readonly semanticSearchService: SemanticSearchService,
    private readonly visualSearchService: VisualSearchService,
    private readonly embeddingHealthService: EmbeddingHealthService,
  ) {}

  /**
   * 获取语义搜索统计信息
   */
  @Get('stats')
  async getStats() {
    return this.semanticSearchService.getStats();
  }

  /**
   * 获取综合向量统计（文本+图片）
   */
  @Get('combined-stats')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(COMBINED_VECTOR_STATS_CACHE_TTL_MS)
  async getCombinedStats() {
    const healthStatus = this.embeddingHealthService.getStatus();

    const [
      textStats,
      imageWithEmbedding,
      imageWithoutEmbedding,
      totalImageEmbeddings,
    ] = await Promise.all([
      this.semanticSearchService.getStats(),
      this.visualSearchService.countProductsWithEmbedding(),
      this.visualSearchService.countProductsWithoutEmbedding(),
      this.visualSearchService.countTotalImageEmbeddings(),
    ]);

    const totalProductsWithImages = imageWithEmbedding + imageWithoutEmbedding;

    return {
      text: {
        totalProducts: textStats.totalProducts,
        productsWithEmbedding: textStats.productsWithEmbedding,
        productsWithoutEmbedding:
          textStats.totalProducts - textStats.productsWithEmbedding,
        coverageRate: textStats.coverageRate,
        dimensions: SEMANTIC_CONFIG.vectorDimensions,
        model: 'all-MiniLM-L6-v2',
      },
      image: {
        totalProductsWithImages,
        productsWithEmbedding: imageWithEmbedding,
        productsWithoutEmbedding: imageWithoutEmbedding,
        totalEmbeddings: totalImageEmbeddings,
        coverageRate:
          totalProductsWithImages > 0
            ? imageWithEmbedding / totalProductsWithImages
            : 0,
        dimensions: 512,
        model: 'clip-ViT-B-32',
      },
      service: {
        available: healthStatus.text.available && healthStatus.image.available,
        textAvailable: healthStatus.text.available,
        imageAvailable: healthStatus.image.available,
        url: healthStatus.embeddingServiceUrl,
        lastCheckTime: healthStatus.lastCheckTime,
        consecutiveFailures: healthStatus.consecutiveFailures,
      },
    };
  }

  /**
   * 手动刷新 embedding 服务状态
   */
  @Post('refresh-status')
  async refreshStatus() {
    const available =
      await this.semanticSearchService.refreshServiceAvailability();
    return {
      available,
      message: available
        ? 'Embedding service is now available'
        : 'Embedding service is still unavailable',
    };
  }

  /**
   * 获取 embedding 服务健康状态（不触发检查）
   */
  @Get('health-status')
  getHealthStatus() {
    const status = this.embeddingHealthService.getStatus();
    return {
      ...status,
      message:
        status.text.available && status.image.available
          ? 'All embedding services are healthy'
          : 'Some embedding services are unavailable',
    };
  }

  /**
   * 手动触发健康检查并返回状态
   */
  @Post('health-check')
  async forceHealthCheck() {
    const status = await this.embeddingHealthService.forceHealthCheck();
    return {
      ...status,
      message:
        status.text.available && status.image.available
          ? 'All embedding services are healthy'
          : 'Some embedding services are unavailable',
    };
  }

  /**
   * 批量生成文本向量
   */
  @Post('generate')
  async batchGenerate(
    @Query('limit') limit?: string,
    @Query('force') force?: string,
  ) {
    // 先刷新服务可用性
    const available =
      await this.semanticSearchService.refreshServiceAvailability();
    if (!available) {
      return {
        message: 'Embedding service is not available',
        stats: { total: 0, success: 0, failed: 0, skipped: 0 },
      };
    }

    const limitNum = limit ? parseInt(limit, 10) : 100;
    const forceRegenerate = force === 'true';

    const stats = await this.semanticSearchService.batchGenerateEmbeddings(
      limitNum,
      forceRegenerate,
    );

    return {
      message: `Batch generation completed`,
      stats,
    };
  }

  /**
   * 为单个商品生成文本向量
   */
  @Post('generate/:productId')
  async generateForProduct(@Param('productId') productId: string) {
    const success =
      await this.semanticSearchService.generateProductEmbedding(productId);

    return {
      productId,
      success,
      message: success
        ? 'Embedding generated successfully'
        : 'Failed to generate embedding',
    };
  }

  /**
   * 测试语义搜索
   */
  @Get('test')
  async testSearch(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query) {
      return { error: 'Query parameter "q" is required' };
    }

    // 先刷新服务可用性
    await this.semanticSearchService.refreshServiceAvailability();

    const limitNum = limit ? parseInt(limit, 10) : 10;
    const results = await this.semanticSearchService.semanticSearch(
      query,
      limitNum,
      0.2,
    );

    return {
      query,
      resultCount: results.length,
      serviceAvailable: this.semanticSearchService.isAvailable(),
      shouldUseSemanticSearch:
        this.semanticSearchService.shouldUseSemanticSearch(query),
      results,
    };
  }
}
