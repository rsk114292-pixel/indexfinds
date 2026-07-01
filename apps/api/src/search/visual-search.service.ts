import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import type { Cache } from 'cache-manager';
import { ProductImageEmbedding } from './entities/product-image-embedding.entity';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import axios from 'axios';
import FormData from 'form-data';
import { validateUrlForSSRF } from '../common/utils/url-validator';
import { basename } from 'path';
import {
  getVisualSearchByProductCacheKey,
  VISUAL_SEARCH_BY_PRODUCT_CACHE_TTL_MS,
} from './visual-search-cache.interceptor';

/**
 * 以图搜图结果
 */
export interface VisualSearchResult {
  product: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    images: string[];
    priceMin: number;
    priceMax: number;
    currency?: string;
    brand?: { id: string; name: string; slug: string };
    category?: { name: string; slug: string };
    gender?: string;
    colors?: string[];
    weidianShopName?: string;
  };
  similarity: number; // 相似度百分比 (0-100)
  matchedImage?: string; // 匹配到的图片URL
}

export interface VisualSearchSourceProduct {
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  images: string[];
}

interface SearchByProductResponse {
  sourceProduct: VisualSearchSourceProduct | null;
  results: VisualSearchResult[];
}

/**
 * Embedding 服务响应
 */
interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  processing_time_ms: number;
}

class PermanentImageEmbeddingError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PermanentImageEmbeddingError';
  }
}

/**
 * 内部召回结果（包含重排所需字段）
 */
interface RecallResult {
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  images: string[];
  priceMin: number;
  priceMax: number;
  currency: string;
  similarity: number; // 原始 0-1 float
  matchedImage: string;
  primaryCategoryId: string | null;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  viewCount: number;
  gender: string | null;
  colors: string[];
  weidianShopName: string | null;
}

/**
 * 重排源商品属性
 */
interface RerankSource {
  categoryId?: string;
  gender?: string;
  brandId?: string;
}

/**
 * 以图搜图服务
 *
 * 使用 CLIP 模型提取图片特征向量，通过 pgvector 进行相似度搜索
 * 支持多图搜索：每个商品的所有图片都有独立的向量
 */
@Injectable()
export class VisualSearchService implements OnModuleInit {
  private readonly logger = new Logger(VisualSearchService.name);
  private readonly embeddingServiceUrl: string;
  private readonly imageUrlEmbeddingTimeoutMs: number;
  private readonly vectorRecallTimeoutMs: number;
  private readonly maxConcurrentEmbeddingRecalls: number;
  private activeEmbeddingRecalls = 0;
  private readonly activeByProductSearches = new Map<
    string,
    Promise<SearchByProductResponse>
  >();
  private isServiceAvailable = false;

  constructor(
    @InjectRepository(ProductImageEmbedding)
    private readonly imageEmbeddingRepository: Repository<ProductImageEmbedding>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly productQueryFacade: ProductQueryFacadeService,
  ) {
    this.embeddingServiceUrl = this.configService.get<string>(
      'EMBEDDING_SERVICE_URL',
      'http://localhost:18001',
    );
    this.imageUrlEmbeddingTimeoutMs = this.configService.get<number>(
      'EMBEDDING_IMAGE_URL_TIMEOUT_MS',
      240000,
    );
    const configuredVectorRecallTimeout = Number(
      this.configService.get('VISUAL_SEARCH_VECTOR_RECALL_TIMEOUT_MS', 5000),
    );
    this.vectorRecallTimeoutMs = Number.isFinite(configuredVectorRecallTimeout)
      ? Math.max(1000, configuredVectorRecallTimeout)
      : 5000;
    const configuredMaxConcurrentRecalls = Number(
      this.configService.get('VISUAL_SEARCH_MAX_CONCURRENT_RECALLS', 1),
    );
    this.maxConcurrentEmbeddingRecalls = Number.isFinite(
      configuredMaxConcurrentRecalls,
    )
      ? Math.max(1, configuredMaxConcurrentRecalls)
      : 1;
  }

  /**
   * 模块初始化 — 仅做健康检查和表存在性验证
   * DDL（CREATE TABLE / CREATE INDEX）已迁移至 migrations/search-system-ddl.sql
   */
  async onModuleInit() {
    await this.checkServiceHealth();
    await this.verifyTableExists();
  }

  private async verifyTableExists(): Promise<void> {
    try {
      await this.dataSource.query(
        `SELECT 1 FROM product_image_embeddings LIMIT 0`,
      );
      this.logger.log('product_image_embeddings table ready');
    } catch {
      this.logger.warn(
        'product_image_embeddings table not found. Please run migrations/search-system-ddl.sql',
      );
    }
  }

  /**
   * 检查 embedding 服务健康状态
   */
  private async checkServiceHealth(): Promise<void> {
    try {
      const response = await axios.get(`${this.embeddingServiceUrl}/health`, {
        timeout: 5000,
      });
      // 检查服务状态和图片模型加载状态
      const isHealthy =
        response.data?.status === 'ok' || response.data?.status === 'partial';
      const imageModelLoaded = response.data?.models?.image?.loaded === true;
      this.isServiceAvailable = isHealthy && imageModelLoaded;
      this.logger.log(
        `Image embedding service: ${this.isServiceAvailable ? 'available' : 'unavailable'} (healthy: ${isHealthy}, imageModel: ${imageModelLoaded})`,
      );
    } catch {
      this.isServiceAvailable = false;
      this.logger.warn(
        `Image embedding service not available at ${this.embeddingServiceUrl}`,
      );
    }
  }

  /**
   * 刷新服务可用性状态（公开方法）
   * 用于运行时重新检查 embedding 服务是否可用
   */
  async refreshServiceAvailability(): Promise<boolean> {
    await this.checkServiceHealth();
    return this.isServiceAvailable;
  }

  /**
   * 获取服务是否可用
   */
  isAvailable(): boolean {
    return this.isServiceAvailable;
  }

  /**
   * 设置服务可用状态（由 EmbeddingHealthService 同步调用）
   */
  setAvailable(available: boolean): void {
    this.isServiceAvailable = available;
  }

  /**
   * 从图片 Buffer 获取 embedding 向量
   */
  async getImageEmbedding(
    imageBuffer: Buffer,
    filename = 'image.jpg',
  ): Promise<number[]> {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename,
      contentType: 'image/jpeg',
    });

    try {
      const response = await axios.post<EmbeddingResponse>(
        `${this.embeddingServiceUrl}/embedding`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000,
        },
      );

      this.logger.debug(
        `Embedding extracted in ${response.data.processing_time_ms}ms`,
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error(`Failed to get embedding: ${error.message}`);
      throw new Error('Failed to extract image features');
    }
  }

  /**
   * 从图片 URL 获取 embedding 向量
   */
  async getImageEmbeddingFromUrl(imageUrl: string): Promise<number[]> {
    // SSRF 防护: 校验 URL 协议 + DNS 解析后验证 IP 不在私有/保留范围
    await validateUrlForSSRF(imageUrl);

    let lastError: unknown;
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post<EmbeddingResponse>(
          `${this.embeddingServiceUrl}/embedding/url`,
          null,
          {
            params: { url: imageUrl },
            // 远端 CDN 图片可能下载慢，再叠加 embedding-service 的单线程图片编码，
            // 生产中 30s 很容易误判超时。
            timeout: this.imageUrlEmbeddingTimeoutMs,
            maxRedirects: 0,
          },
        );

        return response.data.embedding;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        if (status === 429 && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          this.logger.warn(
            `Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        this.logger.warn(
          `URL embedding failed, falling back to direct download: ${error.message}`,
        );
        break;
      }
    }

    try {
      const imageBuffer = await this.downloadImageBuffer(imageUrl);
      const filename = this.filenameFromImageUrl(imageUrl);
      return await this.getImageEmbedding(imageBuffer, filename);
    } catch (fallbackError) {
      const primaryMessage =
        lastError instanceof Error ? lastError.message : String(lastError);
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError);
      const fallbackStatus = this.getHttpStatus(fallbackError);
      this.logger.error(
        `Failed to get embedding from URL: ${primaryMessage}; fallback failed: ${fallbackMessage}`,
      );
      if (fallbackStatus === 404 || fallbackStatus === 410) {
        throw new PermanentImageEmbeddingError(
          `Permanent image URL failure (${fallbackStatus})`,
          `http_${fallbackStatus}`,
        );
      }
      throw new Error('Failed to extract image features from URL');
    }
  }

  private getHttpStatus(error: unknown): number | undefined {
    return typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { status?: unknown } }).response?.status ===
        'number'
      ? (error as { response: { status: number } }).response.status
      : undefined;
  }

  private async downloadImageBuffer(imageUrl: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
      timeout: this.imageUrlEmbeddingTimeoutMs,
      maxRedirects: 0,
    });
    return Buffer.from(response.data);
  }

  private filenameFromImageUrl(imageUrl: string): string {
    try {
      const pathname = new URL(imageUrl).pathname;
      const filename = basename(pathname);
      return filename || 'image.jpg';
    } catch {
      return 'image.jpg';
    }
  }

  /**
   * 以图搜图：根据上传的图片搜索相似商品
   *
   * @param imageBuffer 图片二进制数据
   * @param limit 返回结果数量
   * @param minSimilarity 最低相似度阈值 (0-100)
   */
  async searchByImage(
    imageBuffer: Buffer,
    limit = 20,
    minSimilarity = 50,
  ): Promise<VisualSearchResult[]> {
    const queryEmbedding = await this.getImageEmbedding(imageBuffer);

    // 过量召回 2 倍，留给重排筛选
    const recallResults = await this.recallByEmbedding(
      queryEmbedding,
      limit * 2,
      minSimilarity,
    );

    if (recallResults.length === 0) return [];

    // 用 top-1 结果的属性作为重排源（upload 入口无源商品）
    const top1 = recallResults[0];
    const source: RerankSource = {
      categoryId: top1.primaryCategoryId || undefined,
      gender: top1.gender || undefined,
    };

    return this.rerankResults(
      recallResults,
      source,
      { useBrandDiversity: false },
      limit,
    );
  }

  /**
   * 根据 embedding 向量搜索相似商品（公开接口，纯 CLIP 排序）
   */
  async searchByEmbedding(
    embedding: number[],
    limit = 20,
    minSimilarity = 50,
  ): Promise<VisualSearchResult[]> {
    const results = await this.recallByEmbedding(
      embedding,
      limit,
      minSimilarity,
    );
    return results.map((r) => this.toVisualSearchResult(r));
  }

  /**
   * 内部召回：返回包含重排所需字段的原始结果
   */
  private async recallByEmbedding(
    embedding: number[],
    limit: number,
    minSimilarity: number,
  ): Promise<RecallResult[]> {
    if (this.activeEmbeddingRecalls >= this.maxConcurrentEmbeddingRecalls) {
      throw new ServiceUnavailableException(
        'Visual search is busy. Please try again later.',
      );
    }

    this.activeEmbeddingRecalls += 1;
    const embeddingStr = `[${embedding.join(',')}]`;

    try {
      const candidateLimit = this.getVectorRecallCandidateLimit(limit);
      const results = await this.queryVectorRecall(
        `
        WITH nearest_matches AS (
          SELECT
            pie.product_id,
            pie.image_url as matched_image,
            1 - (pie.embedding <=> $1::vector) as similarity,
            pie.embedding <=> $1::vector as distance
          FROM product_image_embeddings pie
          WHERE pie.embedding IS NOT NULL
          ORDER BY pie.embedding <=> $1::vector
          LIMIT $4
        ),
        ranked_matches AS (
          SELECT
            nm.product_id,
            nm.matched_image,
            nm.similarity,
            ROW_NUMBER() OVER (
              PARTITION BY nm.product_id
              ORDER BY nm.distance
            ) as rn
          FROM nearest_matches nm
          WHERE nm.similarity >= $2
        )
        SELECT
          p.id,
          p.title,
          p.slug,
          p."mainImage",
          p.images,
          p."priceMin",
          p."priceMax",
          p.currency,
          p."primaryCategoryId",
          p."brandId",
          p."viewCount",
          p."aiAttributes",
          p."weidianShopName",
          b.name as "brandName",
          b.slug as "brandSlug",
          c.name as "categoryName",
          c.slug as "categorySlug",
          rm.similarity,
          rm.matched_image
        FROM ranked_matches rm
        JOIN products p ON p.id = rm.product_id
        LEFT JOIN brands b ON p."brandId" = b.id
        LEFT JOIN category c ON p."primaryCategoryId" = c.id
        WHERE rm.rn = 1
          AND p.status = 'active'
        ORDER BY rm.similarity DESC
        LIMIT $3
        `,
        [embeddingStr, minSimilarity / 100, limit, candidateLimit],
      );

      return results.map((row: any) => {
        let aiAttrs: any = null;
        if (row.aiAttributes) {
          try {
            aiAttrs =
              typeof row.aiAttributes === 'string'
                ? JSON.parse(row.aiAttributes)
                : row.aiAttributes;
          } catch {
            /* ignore */
          }
        }

        // 从 aiAttributes 提取颜色数组
        let colors: string[] = [];
        if (aiAttrs?.colors && Array.isArray(aiAttrs.colors)) {
          colors = aiAttrs.colors;
        } else if (aiAttrs?.color) {
          colors = [aiAttrs.color];
        }

        return {
          id: row.id,
          title: row.title,
          slug: row.slug,
          mainImage: row.mainImage,
          images: row.images,
          priceMin: parseFloat(row.priceMin) || 0,
          priceMax: parseFloat(row.priceMax) || 0,
          currency: row.currency || 'CNY',
          similarity: parseFloat(row.similarity),
          matchedImage: row.matched_image,
          primaryCategoryId: row.primaryCategoryId || null,
          brandId: row.brandId || null,
          brandName: row.brandName || null,
          brandSlug: row.brandSlug || null,
          categoryName: row.categoryName || null,
          categorySlug: row.categorySlug || null,
          viewCount: parseInt(row.viewCount, 10) || 0,
          gender: aiAttrs?.gender || null,
          weidianShopName: row.weidianShopName || null,
          colors,
        };
      });
    } catch (error) {
      this.logger.error(`Visual search query failed: ${error.message}`);

      if (error.message?.includes('vector')) {
        throw new Error(
          'Visual search is not available. Please ensure pgvector is enabled.',
        );
      }

      throw error;
    } finally {
      this.activeEmbeddingRecalls -= 1;
    }
  }

  private async queryVectorRecall(
    sql: string,
    params: unknown[],
  ): Promise<any[]> {
    if (typeof this.dataSource.createQueryRunner !== 'function') {
      return this.dataSource.query(sql, params);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `SET LOCAL statement_timeout = ${this.vectorRecallTimeoutMs}`,
      );
      const results = await queryRunner.query(sql, params);
      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private getVectorRecallCandidateLimit(limit: number): number {
    return Math.min(Math.max(limit * 4, 120), 240);
  }

  /**
   * 多信号加权重排
   *
   * by-product: CLIP 0.70 + 类目 0.12 + 性别 0.08 + 品牌多样 0.05 + 人气 0.05
   * upload:     CLIP 0.75 + 类目 0.12 + 性别 0.08 + 人气 0.05
   */
  private rerankResults(
    results: RecallResult[],
    source: RerankSource,
    config: { useBrandDiversity: boolean },
    limit: number,
  ): VisualSearchResult[] {
    if (results.length === 0) return [];

    const W_CLIP = config.useBrandDiversity ? 0.7 : 0.75;
    const W_CATEGORY = 0.12;
    const W_GENDER = 0.08;
    const W_BRAND = config.useBrandDiversity ? 0.05 : 0;
    const W_POPULARITY = 0.05;

    const maxViewCount = Math.max(...results.map((r) => r.viewCount), 1);

    const scored = results.map((r) => {
      const categoryScore =
        source.categoryId && r.primaryCategoryId === source.categoryId ? 1 : 0;
      const genderScore = source.gender && r.gender === source.gender ? 1 : 0;
      const brandScore =
        config.useBrandDiversity &&
        source.brandId &&
        r.brandId &&
        r.brandId !== source.brandId
          ? 1
          : 0;
      const popularityScore = r.viewCount / maxViewCount;

      const finalScore =
        r.similarity * W_CLIP +
        categoryScore * W_CATEGORY +
        genderScore * W_GENDER +
        brandScore * W_BRAND +
        popularityScore * W_POPULARITY;

      return { result: r, finalScore };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);

    return scored
      .slice(0, limit)
      .map((s) => this.toVisualSearchResult(s.result));
  }

  private toVisualSearchResult(r: RecallResult): VisualSearchResult {
    return {
      product: {
        id: r.id,
        title: r.title,
        slug: r.slug,
        mainImage: r.mainImage,
        images: r.images,
        priceMin: r.priceMin,
        priceMax: r.priceMax,
        currency: r.currency,
        brand:
          r.brandId && r.brandName && r.brandSlug
            ? { id: r.brandId, name: r.brandName, slug: r.brandSlug }
            : undefined,
        category:
          r.categoryName && r.categorySlug
            ? { name: r.categoryName, slug: r.categorySlug }
            : undefined,
        gender: r.gender || undefined,
        colors: r.colors.length > 0 ? r.colors : undefined,
        weidianShopName: r.weidianShopName || undefined,
      },
      similarity: Math.round(r.similarity * 100),
      matchedImage: r.matchedImage,
    };
  }

  /**
   * 根据商品 ID 搜索视觉相似商品
   * 读取该商品主图的 embedding，执行向量搜索，排除自身
   */
  async searchByProductId(
    productId: string,
    limit = 50,
    minSimilarity = 25,
  ): Promise<SearchByProductResponse> {
    const cacheKey = `${productId}:${limit}:${minSimilarity}`;
    const existing = this.activeByProductSearches.get(cacheKey);
    if (existing) {
      return existing;
    }

    const search = this.searchByProductIdInternal(
      productId,
      limit,
      minSimilarity,
    ).finally(() => {
      this.activeByProductSearches.delete(cacheKey);
    });

    this.activeByProductSearches.set(cacheKey, search);
    return search;
  }

  private async searchByProductIdInternal(
    productId: string,
    limit: number,
    minSimilarity: number,
  ): Promise<SearchByProductResponse> {
    // 一次查询获取源商品的 embedding + 重排属性
    const sourceResult = await this.dataSource.query(
      `SELECT pie.embedding,
              p.id,
              p.title,
              p.slug,
              p."mainImage",
              p.images,
              p."primaryCategoryId",
              p."brandId",
              p."aiAttributes"
       FROM product_image_embeddings pie
       JOIN products p ON p.id = pie.product_id
       WHERE pie.product_id = $1 AND pie.embedding IS NOT NULL
       ORDER BY pie.image_index LIMIT 1`,
      [productId],
    );

    if (!sourceResult.length || !sourceResult[0].embedding) {
      this.logger.warn(
        `No embedding found for product ${productId}, returning empty`,
      );
      return {
        sourceProduct: null,
        results: [],
      };
    }

    let embedding: number[] = sourceResult[0].embedding;
    if (typeof embedding === 'string') {
      embedding = JSON.parse(embedding);
    }

    // 解析源商品属性
    let sourceAiAttrs: any = null;
    if (sourceResult[0].aiAttributes) {
      try {
        sourceAiAttrs =
          typeof sourceResult[0].aiAttributes === 'string'
            ? JSON.parse(sourceResult[0].aiAttributes)
            : sourceResult[0].aiAttributes;
      } catch {
        /* ignore */
      }
    }

    const source: RerankSource = {
      categoryId: sourceResult[0].primaryCategoryId || undefined,
      gender: sourceAiAttrs?.gender || undefined,
      brandId: sourceResult[0].brandId || undefined,
    };

    const sourceProduct: VisualSearchSourceProduct = {
      id: sourceResult[0].id,
      title: sourceResult[0].title,
      slug: sourceResult[0].slug,
      mainImage: sourceResult[0].mainImage,
      images: this.getProductImages({
        mainImage: sourceResult[0].mainImage,
        images: sourceResult[0].images,
      }),
    };

    // 过量召回 2 倍（+1 排除自身）
    let recallResults: RecallResult[];
    try {
      recallResults = await this.recallByEmbedding(
        embedding,
        (limit + 1) * 2,
        minSimilarity,
      );
    } catch (error) {
      this.logger.warn(
        `Visual search by-product recall failed for ${productId}: ${error.message}`,
      );
      return {
        sourceProduct,
        results: [],
      };
    }

    // 排除自身后重排
    const filtered = recallResults.filter((r) => r.id !== productId);
    return {
      sourceProduct,
      results: this.rerankResults(
        filtered,
        source,
        { useBrandDiversity: true },
        limit,
      ),
    };
  }

  async warmByProductSearchCache(
    productId: string,
    limit = 24,
    minSimilarity = 25,
  ): Promise<void> {
    try {
      const { sourceProduct, results } = await this.searchByProductId(
        productId,
        limit,
        minSimilarity,
      );

      if (!sourceProduct || results.length === 0) {
        return;
      }

      await this.cacheManager.set(
        getVisualSearchByProductCacheKey(productId, limit, minSimilarity),
        {
          sourceProduct,
          results,
          total: results.length,
        },
        VISUAL_SEARCH_BY_PRODUCT_CACHE_TTL_MS,
      );
    } catch (error) {
      this.logger.warn(
        `Visual search by-product cache warm failed for ${productId}: ${error.message}`,
      );
    }
  }

  /**
   * 获取产品的所有图片URL
   */
  private getProductImages(product: {
    mainImage?: string;
    images?: string | string[];
  }): string[] {
    const urls: string[] = [];

    // 添加主图
    if (product.mainImage) {
      urls.push(product.mainImage);
    }

    // 解析 images 字段
    let imagesArray: string[] = [];
    if (product.images) {
      if (typeof product.images === 'string') {
        try {
          imagesArray = JSON.parse(product.images);
        } catch {
          imagesArray = [];
        }
      } else if (Array.isArray(product.images)) {
        imagesArray = product.images;
      }
    }

    // 添加其他图片（去重）
    for (const img of imagesArray) {
      if (img && !urls.includes(img)) {
        urls.push(img);
      }
    }

    return urls;
  }

  /**
   * 为单个商品生成并保存所有图片的 embedding
   */
  async generateProductEmbeddings(
    productId: string,
  ): Promise<{ success: number; failed: number }> {
    const product = await this.productQueryFacade.findProductImages(productId);

    if (!product) {
      this.logger.warn(`Product not found: ${productId}`);
      return { success: 0, failed: 0 };
    }

    const imageUrls = this.getProductImages(product);
    if (imageUrls.length === 0) {
      this.logger.warn(`Product ${productId} has no images`);
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    // 批量查询已有 embedding，避免 N 次 SELECT
    const existingRows = await this.dataSource.query(
      `
      SELECT image_url, embedding IS NOT NULL AS has_embedding, embedding_failure_code
      FROM product_image_embeddings
      WHERE product_id = $1
        AND (
          embedding IS NOT NULL
          OR embedding_failure_code IN ('http_404', 'http_410')
        )
      `,
      [productId],
    );
    const existingUrls = new Set<string>(
      existingRows
        .filter((r: { has_embedding: boolean }) => r.has_embedding)
        .map((r: { image_url: string }) => r.image_url),
    );
    const permanentlyFailedUrls = new Set<string>(
      existingRows
        .filter((r: { embedding_failure_code: string | null }) =>
          ['http_404', 'http_410'].includes(r.embedding_failure_code ?? ''),
        )
        .map((r: { image_url: string }) => r.image_url),
    );

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];

      try {
        if (existingUrls.has(imageUrl)) {
          success++;
          continue;
        }
        if (permanentlyFailedUrls.has(imageUrl)) {
          continue;
        }

        // 请求间延迟，避免触发速率限制
        if (i > 0 || success > 0) {
          await new Promise((r) => setTimeout(r, 500));
        }

        // 生成 embedding
        const embedding = await this.getImageEmbeddingFromUrl(imageUrl);

        // 插入记录
        await this.dataSource.query(
          `INSERT INTO product_image_embeddings (product_id, image_url, image_index, embedding)
           VALUES ($1, $2, $3, $4::vector)
           ON CONFLICT (product_id, image_url) DO UPDATE SET
             image_index = EXCLUDED.image_index,
             embedding = EXCLUDED.embedding,
             embedding_failure_code = NULL,
             embedding_failure_reason = NULL,
             embedding_failed_at = NULL,
             embedding_failure_count = 0`,
          [productId, imageUrl, i, `[${embedding.join(',')}]`],
        );

        success++;
        this.logger.debug(
          `Generated embedding for product ${productId} image ${i + 1}/${imageUrls.length}`,
        );
      } catch (error) {
        failed++;
        if (error instanceof PermanentImageEmbeddingError) {
          await this.markImageEmbeddingFailed(productId, imageUrl, i, error);
        }
        this.logger.error(
          `Failed to generate embedding for product ${productId} image ${imageUrl}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Product ${productId}: ${success} embeddings generated, ${failed} failed`,
    );
    return { success, failed };
  }

  private async markImageEmbeddingFailed(
    productId: string,
    imageUrl: string,
    imageIndex: number,
    error: PermanentImageEmbeddingError,
  ): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO product_image_embeddings (
        product_id,
        image_url,
        image_index,
        embedding,
        embedding_failure_code,
        embedding_failure_reason,
        embedding_failed_at,
        embedding_failure_count
      )
      VALUES ($1, $2, $3, NULL, $4, $5, NOW(), 1)
      ON CONFLICT (product_id, image_url) DO UPDATE SET
        image_index = EXCLUDED.image_index,
        embedding_failure_code = EXCLUDED.embedding_failure_code,
        embedding_failure_reason = EXCLUDED.embedding_failure_reason,
        embedding_failed_at = NOW(),
        embedding_failure_count = product_image_embeddings.embedding_failure_count + 1
      `,
      [productId, imageUrl, imageIndex, error.code, error.message],
    );
  }

  /**
   * 获取没有完整 embedding 的商品数量
   * 包括：1) 完全没有记录的商品  2) 有记录但 embedding 为 NULL 的商品
   */
  async countProductsWithoutEmbedding(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      WHERE p.status = 'active'
        AND (p."mainImage" IS NOT NULL OR (p.images IS NOT NULL AND p.images != '[]' AND p.images != ''))
        AND NOT EXISTS (
          SELECT 1 FROM product_image_embeddings pie
          WHERE pie.product_id = p.id
            AND pie.embedding IS NOT NULL
        )
        AND EXISTS (
          SELECT 1
          FROM (
            SELECT p."mainImage" AS image_url
            UNION
            SELECT image_values.image_url
            FROM jsonb_array_elements_text(
              CASE
                WHEN p.images IS NULL OR p.images = '' THEN '[]'::jsonb
                ELSE p.images::jsonb
              END
            ) AS image_values(image_url)
          ) candidate_images
          WHERE candidate_images.image_url IS NOT NULL
            AND candidate_images.image_url <> ''
            AND NOT EXISTS (
              SELECT 1 FROM product_image_embeddings pie
              WHERE pie.product_id = p.id
                AND pie.image_url = candidate_images.image_url
                AND pie.embedding_failure_code IN ('http_404', 'http_410')
            )
          )
    `);

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * 获取有 embedding 的商品数量（仅统计 active 状态）
   */
  async countProductsWithEmbedding(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(DISTINCT pie.product_id) as count
      FROM product_image_embeddings pie
      INNER JOIN products p ON pie.product_id = p.id
      WHERE pie.embedding IS NOT NULL
        AND p.status = 'active'
    `);

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * 获取图片向量总数（仅统计 active 状态商品的向量）
   */
  async countTotalImageEmbeddings(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM product_image_embeddings pie
      INNER JOIN products p ON pie.product_id = p.id
      WHERE pie.embedding IS NOT NULL
        AND p.status = 'active'
    `);

    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * 清空所有商品的 embeddings（用于彻底重置）
   */
  async clearAllEmbeddings(): Promise<void> {
    await this.dataSource.query(`DELETE FROM product_image_embeddings`);
    this.logger.log('All image embeddings cleared');
  }

  /**
   * 标记所有 embedding 为待重建（置 NULL）
   * 旧记录保留行但 embedding 值清空，batchGenerateEmbeddings 会重新处理
   * 搜索不中断：查询条件是 embedding IS NOT NULL，置 NULL 后自然被排除
   */
  async markAllEmbeddingsForRegeneration(): Promise<void> {
    await this.dataSource.query(
      `UPDATE product_image_embeddings SET embedding = NULL`,
    );
    this.logger.log('All image embeddings marked for regeneration');
  }

  /**
   * 直接保存一条已有的 embedding（跳过 CLIP 调用）
   * 用于去重时生成的 embedding 复用：同步写入，不走异步队列
   */
  async saveProductEmbedding(
    productId: string,
    imageUrl: string,
    imageIndex: number,
    embedding: number[],
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO product_image_embeddings (product_id, image_url, image_index, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (product_id, image_url) DO UPDATE SET embedding = $4::vector`,
      [productId, imageUrl, imageIndex, `[${embedding.join(',')}]`],
    );
  }

  /**
   * 删除指定产品的所有 embeddings
   */
  async deleteProductEmbeddings(productId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM product_image_embeddings WHERE product_id = $1`,
      [productId],
    );
    this.logger.log(`Embeddings deleted for product ${productId}`);
  }

  /**
   * 批量生成缺失的 embeddings
   *
   * @param limit 最大处理商品数量
   * @returns 处理结果统计
   */
  async batchGenerateEmbeddings(limit = 100): Promise<{
    totalProducts: number;
    totalImages: number;
    success: number;
    failed: number;
  }> {
    // 获取缺失 embedding 的商品（包括有记录但 embedding 为 NULL 的情况）
    const products = await this.dataSource.query(
      `
      SELECT p.id, p."mainImage", p.images
      FROM products p
      WHERE p.status = 'active'
        AND (p."mainImage" IS NOT NULL OR (p.images IS NOT NULL AND p.images != '[]' AND p.images != ''))
        AND NOT EXISTS (
          SELECT 1 FROM product_image_embeddings pie
          WHERE pie.product_id = p.id
            AND pie.embedding IS NOT NULL
        )
        AND EXISTS (
          SELECT 1
          FROM (
            SELECT p."mainImage" AS image_url
            UNION
            SELECT image_values.image_url
            FROM jsonb_array_elements_text(
              CASE
                WHEN p.images IS NULL OR p.images = '' THEN '[]'::jsonb
                ELSE p.images::jsonb
              END
            ) AS image_values(image_url)
          ) candidate_images
          WHERE candidate_images.image_url IS NOT NULL
            AND candidate_images.image_url <> ''
            AND NOT EXISTS (
              SELECT 1 FROM product_image_embeddings pie
              WHERE pie.product_id = p.id
                AND pie.image_url = candidate_images.image_url
                AND pie.embedding_failure_code IN ('http_404', 'http_410')
            )
          )
      ORDER BY p."createdAt" DESC
      LIMIT $1
      `,
      [limit],
    );

    let totalImages = 0;
    let success = 0;
    let failed = 0;

    for (const product of products) {
      const result = await this.generateProductEmbeddings(product.id);
      totalImages += result.success + result.failed;
      success += result.success;
      failed += result.failed;
    }

    return {
      totalProducts: products.length,
      totalImages,
      success,
      failed,
    };
  }
}
