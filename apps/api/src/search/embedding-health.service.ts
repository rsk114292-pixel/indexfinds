import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import {
  EmbeddingHealthStatus,
  EmbeddingServiceHealthResponse,
  StateChangeEvent,
} from './embedding-health.types';
import { SEMANTIC_CONFIG } from '../config/search.config';
import { QUEUE_NAMES } from '../queue/queue.module';
import { EmbeddingGenerationService } from './embedding-generation.service';
import { VisualSearchService } from './visual-search.service';

/**
 * Embedding 服务健康检查服务
 *
 * 定期监控 embedding 服务状态，实现：
 * - 每 30 秒检查一次健康状态
 * - 服务离线时自适应加快检查频率
 * - 记录状态变化日志
 * - 提供手动触发检查的接口
 */
@Injectable()
export class EmbeddingHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingHealthService.name);
  private readonly embeddingServiceUrl: string;
  private readonly embeddingRecoveryEnabled: boolean;

  // 定时器
  private healthCheckTimer: NodeJS.Timeout | null = null;

  // 配置
  private readonly HEALTH_CHECK_INTERVAL_MS = 30 * 1000; // 30秒
  private readonly HEALTH_CHECK_TIMEOUT_MS = 5000; // 5秒超时
  private readonly MIN_CHECK_INTERVAL_MS = 5000; // 最小检查间隔 5秒
  private readonly MAX_BACKOFF_EXPONENT = 3; // 最大退避指数

  // 服务状态
  private textServiceAvailable = false;
  private imageServiceAvailable = false;
  private lastCheckTime: Date | null = null;
  private consecutiveFailures = 0;
  private lastStateChange: StateChangeEvent | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EmbeddingGenerationService))
    private readonly embeddingGenerationService: EmbeddingGenerationService,
    @Inject(forwardRef(() => VisualSearchService))
    private readonly visualSearchService: VisualSearchService,
    @InjectQueue(QUEUE_NAMES.EMBEDDING)
    private readonly embeddingQueue: Queue,
  ) {
    this.embeddingServiceUrl = this.configService.get<string>(
      'EMBEDDING_SERVICE_URL',
      'http://localhost:18001',
    );
    this.embeddingRecoveryEnabled =
      this.configService.get<string>('EMBEDDING_RECOVERY_ENABLED', 'true') !==
      'false';
  }

  /**
   * 模块初始化
   */
  async onModuleInit() {
    this.logger.log(
      `Initializing embedding health monitor for ${this.embeddingServiceUrl}`,
    );

    // 立即执行一次健康检查
    await this.performHealthCheck();

    // 启动定期健康检查
    this.startHealthCheck();
  }

  /**
   * 模块销毁时清理定时器
   */
  onModuleDestroy() {
    this.stopHealthCheck();
    this.logger.log('Embedding health monitor stopped');
  }

  /**
   * 启动定期健康检查
   * 使用 setTimeout 递归模式避免任务堆积
   */
  private startHealthCheck() {
    const scheduleNext = async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error(`Health check error: ${error.message}`);
      } finally {
        // 无论成功或失败，都在完成后调度下一次检查
        const nextInterval = this.getNextCheckInterval();
        this.healthCheckTimer = setTimeout(
          () => void scheduleNext(),
          nextInterval,
        );
      }
    };

    // 首次检查在初始间隔后
    const initialInterval = this.getNextCheckInterval();
    this.healthCheckTimer = setTimeout(
      () => void scheduleNext(),
      initialInterval,
    );
    this.logger.log(
      `Health check scheduled, next check in ${initialInterval}ms`,
    );
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 计算下一次检查间隔
   * 服务正常时使用标准间隔，服务异常时使用指数退避
   */
  private getNextCheckInterval(): number {
    if (this.consecutiveFailures > 0) {
      // 指数退避：5s, 10s, 20s, 30s（最大）
      const backoff = Math.min(
        this.HEALTH_CHECK_INTERVAL_MS,
        this.MIN_CHECK_INTERVAL_MS *
          Math.pow(
            2,
            Math.min(this.consecutiveFailures - 1, this.MAX_BACKOFF_EXPONENT),
          ),
      );
      return backoff;
    }
    return this.HEALTH_CHECK_INTERVAL_MS;
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const previousTextAvailable = this.textServiceAvailable;
    const previousImageAvailable = this.imageServiceAvailable;

    try {
      const response = await axios.get<EmbeddingServiceHealthResponse>(
        `${this.embeddingServiceUrl}/health`,
        { timeout: this.HEALTH_CHECK_TIMEOUT_MS },
      );

      const isHealthy = response.status === 200;
      const textModelLoaded = response.data?.models?.text?.loaded === true;
      const imageModelLoaded = response.data?.models?.image?.loaded === true;

      this.textServiceAvailable = isHealthy && textModelLoaded;
      this.imageServiceAvailable = isHealthy && imageModelLoaded;

      // 检查成功，重置失败计数
      if (this.textServiceAvailable && this.imageServiceAvailable) {
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
      }
    } catch (error) {
      // 连接失败
      this.textServiceAvailable = false;
      this.imageServiceAvailable = false;
      this.consecutiveFailures++;

      if (this.consecutiveFailures === 1) {
        // 首次失败时记录详细错误
        this.logger.warn(
          `Embedding service health check failed: ${error.message}`,
        );
      }
    }

    this.lastCheckTime = new Date();

    // 记录状态变化并同步给 EmbeddingGenerationService
    if (this.textServiceAvailable !== previousTextAvailable) {
      this.logStateChange(
        'text',
        'SemanticSearch',
        previousTextAvailable,
        this.textServiceAvailable,
      );
      // 同步状态给 EmbeddingGenerationService，确保语义搜索可用性一致
      this.embeddingGenerationService.setAvailable(this.textServiceAvailable);
    }
    if (this.imageServiceAvailable !== previousImageAvailable) {
      this.logStateChange(
        'image',
        'VisualSearch',
        previousImageAvailable,
        this.imageServiceAvailable,
      );
      // 同步状态给 VisualSearchService，确保以图搜图可用性一致
      this.visualSearchService.setAvailable(this.imageServiceAvailable);

      // 服务恢复时触发 embedding 补齐
      if (this.imageServiceAvailable && !previousImageAvailable) {
        void this.triggerRecoveryOnRestore();
      }
    }
  }

  /**
   * 记录状态变化
   */
  private logStateChange(
    service: 'text' | 'image',
    serviceName: string,
    from: boolean,
    to: boolean,
  ): void {
    const status = to ? 'RECOVERED' : 'DOWN';
    const emoji = to ? '✅' : '❌';

    this.logger.log(`${emoji} [${serviceName}] Service ${status}`);

    this.lastStateChange = {
      service,
      serviceName,
      from,
      to,
      at: new Date(),
    };
  }

  /**
   * 手动触发健康检查
   */
  async forceHealthCheck(): Promise<EmbeddingHealthStatus> {
    this.logger.log('Manual health check triggered');
    await this.performHealthCheck();
    return this.getStatus();
  }

  /**
   * 获取当前健康状态
   */
  getStatus(): EmbeddingHealthStatus {
    return {
      text: {
        available: this.textServiceAvailable,
        model: 'all-MiniLM-L6-v2',
        dimensions: SEMANTIC_CONFIG.vectorDimensions,
      },
      image: {
        available: this.imageServiceAvailable,
        model: 'clip-ViT-B-32',
        dimensions: 512,
      },
      embeddingServiceUrl: this.embeddingServiceUrl,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
      lastStateChange: this.lastStateChange,
      nextCheckInMs: this.getNextCheckInterval(),
    };
  }

  /**
   * 每小时扫描缺失 embedding 的产品，自动补齐
   * 这是 embedding 可靠性的最终安全网
   */
  @Cron('0 */15 * * * *') // 每 15 分钟执行
  async handleEmbeddingRecovery() {
    if (!this.embeddingRecoveryEnabled) {
      return;
    }

    if (!this.imageServiceAvailable && !this.textServiceAvailable) {
      return; // 服务不可用时不执行
    }

    try {
      const missingCount =
        await this.visualSearchService.countProductsWithoutEmbedding();

      if (missingCount === 0) return;

      this.logger.log(
        `定时恢复：发现 ${missingCount} 个产品缺少 embedding，开始补齐`,
      );

      // 每次最多处理 200 个
      await this.embeddingQueue.add(
        'batch-embedding',
        { type: 'batch', limit: 200, embeddingType: 'both' },
        { jobId: `recovery-${Date.now()}`, priority: 3 },
      );
    } catch (error) {
      this.logger.error(
        `定时恢复失败: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * 服务恢复时触发紧急补齐
   */
  private async triggerRecoveryOnRestore() {
    if (!this.embeddingRecoveryEnabled) {
      return;
    }

    try {
      const missingCount =
        await this.visualSearchService.countProductsWithoutEmbedding();

      if (missingCount > 0) {
        this.logger.log(
          `服务恢复，发现 ${missingCount} 个产品需要补齐 embedding`,
        );
        await this.embeddingQueue.add(
          'batch-embedding',
          { type: 'batch', limit: 200, embeddingType: 'both' },
          { jobId: `restore-${Date.now()}`, priority: 2 },
        );
      }
    } catch (error) {
      this.logger.error(
        `恢复触发失败: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * 检查文本 embedding 服务是否可用
   */
  isTextServiceAvailable(): boolean {
    return this.textServiceAvailable;
  }

  /**
   * 检查图片 embedding 服务是否可用
   */
  isImageServiceAvailable(): boolean {
    return this.imageServiceAvailable;
  }

  /**
   * 检查所有 embedding 服务是否可用
   */
  isAllServicesAvailable(): boolean {
    return this.textServiceAvailable && this.imageServiceAvailable;
  }
}
