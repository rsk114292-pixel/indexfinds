import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.module';
import { VisualSearchService } from '../../search/visual-search.service';
import { SemanticSearchService } from '../../search/semantic-search.service';

/**
 * Embedding 任务数据
 */
export interface EmbeddingJobData {
  productId: string;
  priority?: 'high' | 'normal' | 'low';
  /** 生成类型: image=图片向量, text=文本向量, both=两者都生成 */
  embeddingType?: 'image' | 'text' | 'both';
}

/**
 * 批量生成 Embedding 任务数据
 */
export interface BatchEmbeddingJobData {
  type: 'batch';
  limit?: number;
  /** 生成类型: image=图片向量, text=文本向量, both=两者都生成 */
  embeddingType?: 'image' | 'text' | 'both';
}

export type EmbeddingJobPayload = EmbeddingJobData | BatchEmbeddingJobData;

/**
 * Embedding 策略接口
 *
 * 每种 embedding 类型（image/text）实现此接口，
 * 遵循开闭原则：新增 embedding 类型只需实现此接口并注册。
 */
interface EmbeddingStrategy {
  readonly name: string;
  isAvailable(): boolean;
  generateSingle(productId: string): Promise<string>;
  generateBatch(limit: number): Promise<string>;
}

/**
 * Embedding 队列处理器
 *
 * 使用策略模式替代 if/else 分支：
 * - 每种 embedding 类型注册为独立策略
 * - 处理器统一遍历匹配的策略执行
 * - 新增类型只需添加策略，无需修改处理逻辑
 */
@Processor(QUEUE_NAMES.EMBEDDING, { concurrency: 5 })
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);
  private readonly strategies: EmbeddingStrategy[];

  constructor(
    private readonly visualSearchService: VisualSearchService,
    @Optional() private readonly semanticSearchService?: SemanticSearchService,
  ) {
    super();
    this.strategies = this.buildStrategies();
  }

  private buildStrategies(): EmbeddingStrategy[] {
    const strategies: EmbeddingStrategy[] = [
      {
        name: 'image',
        isAvailable: () => this.visualSearchService.isAvailable(),
        generateSingle: async (productId: string) => {
          const result =
            await this.visualSearchService.generateProductEmbeddings(productId);
          if (result.success > 0) {
            await this.visualSearchService.warmByProductSearchCache(productId);
          }
          return `image: ${result.success}/${result.success + result.failed}`;
        },
        generateBatch: async (limit: number) => {
          const count =
            await this.visualSearchService.countProductsWithoutEmbedding();
          if (count === 0) return 'image: 0 products to process';
          this.logger.log(`Found ${count} products without image embeddings`);
          const result =
            await this.visualSearchService.batchGenerateEmbeddings(limit);
          return `image: ${result.totalProducts} products, ${result.success}/${result.totalImages} images`;
        },
      },
    ];

    if (this.semanticSearchService) {
      const semanticService = this.semanticSearchService;
      strategies.push({
        name: 'text',
        isAvailable: () => semanticService.isAvailable(),
        generateSingle: async (productId: string) => {
          const success =
            await semanticService.generateProductEmbedding(productId);
          return `text: ${success ? 'success' : 'failed'}`;
        },
        generateBatch: async (limit: number) => {
          const result = await semanticService.batchGenerateEmbeddings(limit);
          return `text: ${result.success}/${result.total} products`;
        },
      });
    }

    return strategies;
  }

  async process(job: Job<EmbeddingJobPayload>): Promise<void> {
    if ('type' in job.data && job.data.type === 'batch') {
      await this.processBatch(job as Job<BatchEmbeddingJobData>);
      return;
    }
    await this.processSingle(job as Job<EmbeddingJobData>);
  }

  private getActiveStrategies(
    embeddingType: 'image' | 'text' | 'both',
  ): EmbeddingStrategy[] {
    return this.strategies.filter(
      (s) =>
        s.isAvailable() &&
        (embeddingType === 'both' || s.name === embeddingType),
    );
  }

  private async processSingle(job: Job<EmbeddingJobData>): Promise<void> {
    const { productId, embeddingType = 'both' } = job.data;
    this.logger.log(
      `Generating ${embeddingType} embeddings for product ${productId}`,
    );

    try {
      const active = this.getActiveStrategies(embeddingType);
      const results = await Promise.all(
        active.map((s) => s.generateSingle(productId)),
      );
      this.logger.log(
        `Embeddings generated for product ${productId}: ${results.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating embeddings for product ${productId}: ${error.message}`,
      );
      throw error;
    }
  }

  private async processBatch(job: Job<BatchEmbeddingJobData>): Promise<void> {
    const { limit = 100, embeddingType = 'both' } = job.data;
    this.logger.log(
      `Starting batch ${embeddingType} embedding generation (limit: ${limit})`,
    );

    try {
      const active = this.getActiveStrategies(embeddingType);
      for (const strategy of active) {
        const result = await strategy.generateBatch(limit);
        this.logger.log(`Batch ${strategy.name} embedding: ${result}`);
      }
    } catch (error) {
      this.logger.error(`Batch embedding failed: ${error.message}`);
      throw error;
    }
  }
}
