import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import axios from 'axios';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import type {
  EmbeddingGenerationStats,
  ProductTextInput,
} from './dto/semantic-search.types';

@Injectable()
export class EmbeddingGenerationService {
  private readonly logger = new Logger(EmbeddingGenerationService.name);
  private readonly embeddingServiceUrl: string;
  private isServiceAvailable = false;
  private readonly TEXT_BATCH_LIMIT = 50;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly productQueryFacade: ProductQueryFacadeService,
  ) {
    this.embeddingServiceUrl = this.configService.get<string>(
      'EMBEDDING_SERVICE_URL',
      'http://localhost:18001',
    );
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.embeddingServiceUrl}/health`, {
        timeout: 3000,
      });
      const isHealthy = response.status === 200;
      const textModelLoaded = response.data?.models?.text?.loaded === true;
      this.isServiceAvailable = isHealthy && textModelLoaded;
      return this.isServiceAvailable;
    } catch {
      this.isServiceAvailable = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isServiceAvailable;
  }

  setAvailable(available: boolean): void {
    this.isServiceAvailable = available;
  }

  /**
   * 带指数退避的重试辅助函数
   * @param fn 要执行的异步函数
   * @param maxRetries 最大重试次数
   * @param baseDelay 基础延迟（毫秒）
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const error = err as {
          code?: string;
          response?: { status: number };
          message?: string;
        };
        lastError = err as Error;

        // 最后一次尝试失败，不再重试
        if (attempt === maxRetries) {
          break;
        }

        // 只对网络相关错误重试
        const isRetryableError =
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          (error.response?.status ?? 0) >= 500;

        if (!isRetryableError) {
          throw err;
        }

        // 指数退避延迟：1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError ?? new Error('All retry attempts failed');
  }

  /**
   * 延迟辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateTextHash(text: string): string {
    return createHash('sha256').update(text).digest('hex').substring(0, 64);
  }

  buildProductText(product: ProductTextInput): string {
    const parts: string[] = [];

    if (product.title) {
      parts.push(product.title);
    }

    const brandName = product.brand?.name || product.aiBrandName;
    if (brandName) {
      parts.push(brandName);
    }

    const categoryName = product.primaryCategory?.name;
    if (categoryName) {
      parts.push(categoryName);
    }

    // 加入 AI 提取的属性，丰富语义信息
    const attrs = product.aiAttributes;
    if (attrs) {
      if (attrs.gender) parts.push(attrs.gender);
      if (attrs.styles?.length) parts.push(attrs.styles.join(', '));
      if (attrs.occasions?.length) parts.push(attrs.occasions.join(', '));
      if (attrs.seasons?.length) parts.push(attrs.seasons.join(', '));
    }

    if (product.description) {
      parts.push(product.description.substring(0, 500));
    }

    return parts.join(' ').trim();
  }

  async generateTextEmbedding(text: string): Promise<number[] | null> {
    if (!this.isServiceAvailable) {
      return null;
    }

    try {
      const response = await axios.post(
        `${this.embeddingServiceUrl}/embed/text`,
        { text },
        { timeout: 10000 },
      );

      return response.data?.embedding || null;
    } catch (error) {
      this.logger.warn(`Failed to generate text embedding: ${error.message}`);
      return null;
    }
  }

  async batchGenerateTextEmbeddings(
    texts: string[],
  ): Promise<(number[] | null)[]> {
    if (!this.isServiceAvailable || texts.length === 0) {
      return texts.map(() => null);
    }

    if (texts.length > this.TEXT_BATCH_LIMIT) {
      const chunkedResults: (number[] | null)[] = [];

      for (let i = 0; i < texts.length; i += this.TEXT_BATCH_LIMIT) {
        const chunk = texts.slice(i, i + this.TEXT_BATCH_LIMIT);
        const chunkResults = await this.batchGenerateTextEmbeddings(chunk);
        chunkedResults.push(...chunkResults);
      }

      return chunkedResults;
    }

    try {
      // 使用指数退避重试（最多 3 次）
      const response = await this.retryWithExponentialBackoff(
        async () =>
          await axios.post(
            `${this.embeddingServiceUrl}/embed/text/batch`,
            { texts },
            { timeout: 30000 },
          ),
      );

      if (
        response.data?.embeddings &&
        Array.isArray(response.data.embeddings)
      ) {
        return response.data.embeddings;
      }
      return this.fallbackBatchGenerate(texts);
    } catch (error) {
      if (error.response?.status === 404) {
        return this.fallbackBatchGenerate(texts);
      }
      this.logger.warn(
        `Failed to generate batch embeddings after retries: ${error.message}`,
      );
      return texts.map(() => null);
    }
  }

  private async fallbackBatchGenerate(
    texts: string[],
  ): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = [];
    for (const text of texts) {
      results.push(await this.generateTextEmbedding(text));
    }
    return results;
  }

  async generateProductEmbedding(productId: string): Promise<boolean> {
    if (!this.isServiceAvailable) {
      this.logger.warn(
        `Embedding service unavailable, skipping product ${productId}`,
      );
      return false;
    }

    try {
      const product = await this.productQueryFacade.findProductById(productId, [
        'brand',
        'primaryCategory',
      ]);

      if (!product) {
        this.logger.warn(`Product not found: ${productId}`);
        return false;
      }

      const sourceText = this.buildProductText(product);
      const textHash = this.generateTextHash(sourceText);

      const existing = await this.dataSource.query(
        `SELECT text_hash FROM product_text_embeddings WHERE product_id = $1`,
        [productId],
      );

      if (existing.length > 0 && existing[0].text_hash === textHash) {
        return true;
      }

      const embedding = await this.generateTextEmbedding(sourceText);
      if (!embedding) {
        return false;
      }

      const embeddingStr = `[${embedding.join(',')}]`;
      await this.dataSource.query(
        `
        INSERT INTO product_text_embeddings (product_id, source_text, text_hash, embedding)
        VALUES ($1, $2, $3, $4::vector)
        ON CONFLICT (product_id)
        DO UPDATE SET
          source_text = EXCLUDED.source_text,
          text_hash = EXCLUDED.text_hash,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
        `,
        [productId, sourceText, textHash, embeddingStr],
      );

      return true;
    } catch (error) {
      const isNetworkError =
        error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
      if (isNetworkError) {
        this.isServiceAvailable = false;
        this.logger.error(
          `Embedding service connection failed for product ${productId}, marking unavailable`,
        );
      } else {
        this.logger.error(
          `Failed to generate embedding for product ${productId}: ${error.message}`,
          error.stack,
        );
      }
      return false;
    }
  }

  async batchGenerateEmbeddings(
    limit = 100,
    forceRegenerate = false,
  ): Promise<EmbeddingGenerationStats> {
    const stats: EmbeddingGenerationStats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };

    if (!this.isServiceAvailable) {
      this.logger.warn(
        'Embedding service unavailable, skipping batch generation',
      );
      return stats;
    }

    try {
      let query = `
        SELECT p.id, p.title, p.description, p."aiBrandName", p."aiAttributes",
               b.name as brand_name, c.name as category_name
        FROM products p
        LEFT JOIN brands b ON p."brandId" = b.id
        LEFT JOIN category c ON p."primaryCategoryId" = c.id
        WHERE p.status = 'active'
      `;

      if (!forceRegenerate) {
        query += `
          AND NOT EXISTS (
            SELECT 1 FROM product_text_embeddings pte WHERE pte.product_id = p.id
          )
        `;
      }

      query += ` LIMIT $1`;

      const products = await this.dataSource.query(query, [limit]);
      stats.total = products.length;

      if (products.length === 0) {
        return stats;
      }

      const productTexts: Array<{
        id: string;
        sourceText: string;
        textHash: string;
      }> = [];
      let existingHashes = new Map<string, string>();

      if (forceRegenerate) {
        const productIds = products.map((p: { id: string }) => p.id);
        const hashResults = await this.dataSource.query(
          `SELECT product_id, text_hash FROM product_text_embeddings WHERE product_id = ANY($1)`,
          [productIds],
        );
        existingHashes = new Map(
          hashResults.map((r: { product_id: string; text_hash: string }) => [
            r.product_id,
            r.text_hash,
          ]),
        );
      }

      for (const product of products) {
        const aiAttrs =
          typeof product.aiAttributes === 'string'
            ? JSON.parse(product.aiAttributes)
            : product.aiAttributes;
        const sourceText = this.buildProductText({
          title: product.title,
          description: product.description,
          brand: product.brand_name ? { name: product.brand_name } : null,
          primaryCategory: product.category_name
            ? { name: product.category_name }
            : null,
          aiBrandName: product.aiBrandName,
          aiAttributes: aiAttrs || null,
        });
        const textHash = this.generateTextHash(sourceText);

        if (forceRegenerate && existingHashes.get(product.id) === textHash) {
          stats.skipped++;
          continue;
        }

        productTexts.push({ id: product.id, sourceText, textHash });
      }

      if (productTexts.length === 0) {
        return stats;
      }

      const texts = productTexts.map((p) => p.sourceText);
      const embeddings = await this.batchGenerateTextEmbeddings(texts);

      const batchSize = 50;
      const totalBatches = Math.ceil(productTexts.length / batchSize);

      for (let i = 0; i < productTexts.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = productTexts.slice(i, i + batchSize);
        const batchEmbeddings = embeddings.slice(i, i + batchSize);

        const values: string[] = [];
        const params: (string | null)[] = [];
        let paramIndex = 1;
        let batchSuccessCount = 0;

        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embedding = batchEmbeddings[j];

          if (!embedding) {
            stats.failed++;
            continue;
          }

          const embeddingStr = `[${embedding.join(',')}]`;
          values.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}::vector)`,
          );
          params.push(item.id, item.sourceText, item.textHash, embeddingStr);
          paramIndex += 4;
          batchSuccessCount++;
        }

        if (values.length > 0) {
          // 使用事务包裹数据库写入，确保批次原子性
          const queryRunner = this.dataSource.createQueryRunner();
          await queryRunner.connect();
          await queryRunner.startTransaction();

          try {
            await queryRunner.query(
              `
              INSERT INTO product_text_embeddings (product_id, source_text, text_hash, embedding)
              VALUES ${values.join(', ')}
              ON CONFLICT (product_id)
              DO UPDATE SET
                source_text = EXCLUDED.source_text,
                text_hash = EXCLUDED.text_hash,
                embedding = EXCLUDED.embedding,
                updated_at = NOW()
              `,
              params,
            );

            await queryRunner.commitTransaction();
            stats.success += batchSuccessCount;

            this.logger.debug(
              `Batch ${batchNum}/${totalBatches}: ${batchSuccessCount} embeddings saved`,
            );
          } catch (error) {
            await queryRunner.rollbackTransaction();
            // 事务失败，将这批有 embedding 的项目标记为失败
            stats.failed += batchSuccessCount;
            this.logger.error(
              `Batch ${batchNum}/${totalBatches} DB write failed: ${error.message}`,
            );
          } finally {
            await queryRunner.release();
          }

          // 批次间添加延时，避免打满连接池（100ms）
          if (i + batchSize < productTexts.length) {
            await this.sleep(100);
          }
        }
      }

      this.logger.log(
        `Batch embedding: ${stats.success} success, ${stats.failed} failed, ${stats.skipped} skipped`,
      );
    } catch (error) {
      this.logger.error(`Batch embedding generation failed: ${error.message}`);
    }

    return stats;
  }
}
