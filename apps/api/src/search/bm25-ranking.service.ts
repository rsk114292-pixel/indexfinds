import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BM25_CONFIG, CACHE_CONFIG } from '../config/search.config';

/**
 * 字段权重配置
 */
export interface FieldWeights {
  title: number;
  brandName: number;
  categoryName: number;
  description: number;
}

/**
 * BM25 参数配置
 */
export interface BM25Config {
  k1: number; // 词频饱和参数，通常 1.2-2.0
  b: number; // 文档长度归一化参数，通常 0.75
}

/**
 * 文档统计信息（用于 IDF 计算）
 */
interface DocumentStats {
  totalDocuments: number;
  avgDocLength: number;
  termDocFrequency: Map<string, number>; // 词 -> 包含该词的文档数
}

/**
 * BM25 排名服务
 * 实现 Okapi BM25 算法，用于计算搜索词与商品的相关性
 */
@Injectable()
export class BM25RankingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BM25RankingService.name);

  // BM25 参数（从集中配置读取，支持环境变量覆盖）
  private readonly config: BM25Config = {
    k1: BM25_CONFIG.k1,
    b: BM25_CONFIG.b,
  };

  // 字段权重
  private readonly fieldWeights: FieldWeights = {
    title: 3.0,
    brandName: 2.5,
    categoryName: 2.0,
    description: 1.0,
  };

  // 文档统计缓存
  private stats: DocumentStats = {
    totalDocuments: 0,
    avgDocLength: 0,
    termDocFrequency: new Map(),
  };

  private readonly REFRESH_INTERVAL_MS = CACHE_CONFIG.bm25RefreshInterval;
  private readonly STATS_QUERY_TIMEOUT_MS = 5000;
  private readonly MAX_TERM_MAP_SIZE = 500_000; // termDocFrequency 条目上限
  private readonly refreshStatsEnabled =
    process.env.BM25_REFRESH_STATS_ENABLED === 'true';
  private readonly refreshOnStartup =
    process.env.BM25_REFRESH_ON_STARTUP !== 'false';
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshInFlight = false;

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 模块初始化生命周期钩子
   * 执行首次统计数据刷新并启动定时刷新任务
   */
  onModuleInit() {
    if (!this.refreshStatsEnabled) {
      this.logger.warn(
        'BM25 stats refresh disabled; using fallback relevance until enabled',
      );
      this.logger.log('BM25RankingService initialized');
      return;
    }

    if (this.refreshOnStartup) {
      void this.refreshStats();
    } else {
      this.logger.warn('BM25 startup stats refresh skipped');
    }

    this.startAutoRefresh();
    this.logger.log('BM25RankingService initialized');
  }

  /**
   * 模块销毁生命周期钩子
   * 停止定时刷新任务，清理资源
   */
  onModuleDestroy() {
    this.stopAutoRefresh();
  }

  /**
   * 启动自动刷新（使用 setTimeout 避免任务堆积）
   */
  private startAutoRefresh() {
    const scheduleNext = async () => {
      try {
        await this.refreshStats();
      } catch (error) {
        this.logger.error('BM25 auto-refresh failed:', error);
      } finally {
        // 无论成功或失败，都在完成后调度下一次刷新
        // 这样避免了 setInterval 导致的任务堆积问题
        this.refreshTimer = setTimeout(
          () => void scheduleNext(),
          this.REFRESH_INTERVAL_MS,
        );
      }
    };

    // 首次调度（模块初始化时已执行过一次 refreshStats，这里延迟开始定时刷新）
    this.refreshTimer = setTimeout(
      () => void scheduleNext(),
      this.REFRESH_INTERVAL_MS,
    );
  }

  /**
   * 停止自动刷新
   */
  private stopAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 刷新文档统计信息（DB 端计算，避免全量加载到内存）
   */
  async refreshStats(): Promise<void> {
    if (this.refreshInFlight) {
      this.logger.warn('BM25 stats refresh already in progress; skipping');
      return;
    }

    this.refreshInFlight = true;
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      const startTime = Date.now();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.query(
        `SET LOCAL statement_timeout = ${this.STATS_QUERY_TIMEOUT_MS}`,
      );

      // 1. 让 PostgreSQL 计算基础统计量
      const [{ count, avg_len }] = await queryRunner.query(`
        SELECT COUNT(*) as count,
               AVG(array_length(string_to_array(
                 CONCAT(COALESCE(title,''), ' ', COALESCE(description,'')), ' '
               ), 1)) as avg_len
        FROM products WHERE status = 'active'
      `);

      const totalDocuments = parseInt(count, 10);
      if (totalDocuments === 0) {
        this.logger.warn('No active products found for BM25 stats');
        await queryRunner.commitTransaction();
        return;
      }

      // 2. 让 PostgreSQL 计算词频（term document frequency）
      const termFreqRows: Array<{ word: string; doc_count: string }> =
        await queryRunner.query(`
        SELECT word, COUNT(DISTINCT product_id) as doc_count FROM (
          SELECT p.id as product_id, unnest(string_to_array(
            lower(CONCAT(COALESCE(p.title,''), ' ', COALESCE(p.description,''))), ' '
          )) as word
          FROM products p WHERE p.status = 'active'
        ) tokens
        WHERE length(word) > 0
        GROUP BY word
        HAVING COUNT(DISTINCT product_id) >= 2
      `);

      const termDocFrequency = new Map<string, number>();
      for (const row of termFreqRows) {
        termDocFrequency.set(row.word, parseInt(row.doc_count, 10));
      }

      if (termDocFrequency.size > this.MAX_TERM_MAP_SIZE) {
        this.logger.warn(
          `termDocFrequency size (${termDocFrequency.size}) exceeds limit (${this.MAX_TERM_MAP_SIZE}). ` +
            `Consider raising HAVING threshold or using approximate stats.`,
        );
      }

      // 更新缓存（旧 Map 引用被替换后由 GC 回收）
      this.stats = {
        totalDocuments,
        avgDocLength: parseFloat(avg_len) || 10,
        termDocFrequency,
      };

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `BM25 stats refreshed: ${totalDocuments} docs, ` +
          `avgLen=${this.stats.avgDocLength.toFixed(1)}, ` +
          `${termDocFrequency.size} unique terms, ` +
          `took ${elapsed}ms`,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error('Failed to refresh BM25 stats', error);
    } finally {
      await queryRunner.release();
      this.refreshInFlight = false;
    }
  }

  /**
   * 计算单个商品的 BM25 相关性得分
   */
  calculateRelevance(
    product: {
      title: string;
      description?: string;
      brand?: { name: string } | null;
      primaryCategory?: { name: string } | null;
    },
    searchTerms: string[],
  ): number {
    if (!searchTerms.length) return 1;

    const { k1, b } = this.config;
    const { totalDocuments, avgDocLength } = this.stats;

    // 如果没有统计数据，降级到简单匹配
    if (totalDocuments === 0) {
      return this.fallbackRelevance(product, searchTerms);
    }

    let totalScore = 0;

    // 对每个字段分别计算 BM25 得分，然后加权求和
    const fields = [
      { text: product.title || '', weight: this.fieldWeights.title },
      { text: product.brand?.name || '', weight: this.fieldWeights.brandName },
      {
        text: product.primaryCategory?.name || '',
        weight: this.fieldWeights.categoryName,
      },
      {
        text: product.description || '',
        weight: this.fieldWeights.description,
      },
    ];

    for (const field of fields) {
      if (!field.text) continue;

      const tokens = this.tokenizeByWhitespace(field.text);
      const docLength = tokens.length;
      if (docLength === 0) continue;

      // 计算词频
      const termFrequency = new Map<string, number>();
      for (const token of tokens) {
        termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
      }

      // 对每个搜索词计算 BM25 得分
      for (const term of searchTerms) {
        const normalizedTerm = term.toLowerCase().trim();
        const tf = termFrequency.get(normalizedTerm) || 0;

        if (tf === 0) continue;

        // IDF 计算: log((N - n + 0.5) / (n + 0.5) + 1)
        const docFreq = this.stats.termDocFrequency.get(normalizedTerm) || 0;
        const idf = Math.log(
          (totalDocuments - docFreq + 0.5) / (docFreq + 0.5) + 1,
        );

        // BM25 词频饱和: (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl/avgdl))
        const tfNorm =
          (tf * (k1 + 1)) /
          (tf + k1 * (1 - b + b * (docLength / avgDocLength)));

        // 加权得分
        totalScore += idf * tfNorm * field.weight;
      }
    }

    // 归一化到 0-1 范围（使用 sigmoid 函数）
    const normalizedScore = this.normalizeScoreViaSigmoid(
      totalScore / searchTerms.length,
    );

    return normalizedScore;
  }

  /**
   * 批量计算商品的 BM25 得分
   */
  calculateBatchRelevance<
    T extends {
      title: string;
      description?: string;
      brand?: { name: string } | null;
      primaryCategory?: { name: string } | null;
    },
  >(products: T[], searchTerms: string[]): Map<T, number> {
    const scores = new Map<T, number>();

    for (const product of products) {
      scores.set(product, this.calculateRelevance(product, searchTerms));
    }

    return scores;
  }

  /**
   * 获取文档的完整文本（用于建立索引）
   */
  private getDocumentText(product: {
    title?: string;
    description?: string | null;
    brand?: { name: string } | null;
    primaryCategory?: { name: string } | null;
  }): string {
    return [
      product.title || '',
      product.brand?.name || '',
      product.primaryCategory?.name || '',
      product.description || '',
    ].join(' ');
  }

  /**
   * 使用空格分词（用于 BM25 计算）
   * 注：仅适用于英文，中文需要使用专门的分词库
   */
  private tokenizeByWhitespace(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0);
  }

  /**
   * 使用 Sigmoid 函数归一化评分
   * 将评分映射到 [0, 1] 区间
   */
  private normalizeScoreViaSigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * 降级的简单相关性计算（当没有统计数据时使用）
   */
  private fallbackRelevance(
    product: {
      title: string;
      description?: string;
      brand?: { name: string } | null;
      primaryCategory?: { name: string } | null;
    },
    searchTerms: string[],
  ): number {
    const text = this.getDocumentText(product).toLowerCase();

    let matchCount = 0;
    for (const term of searchTerms) {
      if (text.includes(term.toLowerCase())) {
        matchCount++;
      }
    }

    return matchCount / searchTerms.length;
  }

  /**
   * 获取当前统计信息（用于调试和监控）
   */
  getStats(): {
    totalDocuments: number;
    avgDocLength: number;
    uniqueTerms: number;
  } {
    return {
      totalDocuments: this.stats.totalDocuments,
      avgDocLength: this.stats.avgDocLength,
      uniqueTerms: this.stats.termDocFrequency.size,
    };
  }

  /**
   * 获取字段权重配置
   */
  getFieldWeights(): FieldWeights {
    return { ...this.fieldWeights };
  }
}
