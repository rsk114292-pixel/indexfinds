import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

/**
 * 搜索系统性能监控服务
 * 使用 Prometheus 格式导出关键指标
 */
@Injectable()
export class SearchMetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // ============ 延迟指标 ============
  /** 搜索延迟分布（毫秒） */
  private searchLatency: Histogram<string>;

  /** BM25 统计刷新耗时（毫秒） */
  private bm25RefreshDuration: Histogram<string>;

  /** Embedding 生成延迟（毫秒） */
  private embeddingLatency: Histogram<string>;

  // ============ 召回路径指标 ============
  /** 召回路径调用次数 */
  private recallPathCalls: Counter<string>;

  /** 召回路径命中数（返回结果 > 0） */
  private recallPathHits: Counter<string>;

  /** 召回路径返回结果数量 */
  private recallPathResults: Histogram<string>;

  // ============ 可用性指标 ============
  /** 语义搜索服务可用性（0 = 不可用，1 = 可用） */
  private semanticSearchAvailability: Gauge<string>;

  /** 搜索请求总数 */
  private searchRequestsTotal: Counter<string>;

  /** 搜索错误总数 */
  private searchErrorsTotal: Counter<string>;

  // ============ 缓存指标 ============
  /** 缓存命中次数 */
  private cacheHits: Counter<string>;

  /** 缓存未命中次数 */
  private cacheMisses: Counter<string>;

  // ============ 业务指标 ============
  /** 空结果搜索次数 */
  private zeroResultsSearches: Counter<string>;

  /** 拼写纠正触发次数 */
  private spellCorrectionTriggers: Counter<string>;

  constructor() {
    this.registry = new Registry();
  }

  onModuleInit() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // ======== 延迟指标 ========
    this.searchLatency = new Histogram({
      name: 'search_latency_ms',
      help: 'Search request latency in milliseconds',
      labelNames: ['route', 'strategy'] as const,
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000], // P50, P95, P99
      registers: [this.registry],
    });

    this.bm25RefreshDuration = new Histogram({
      name: 'bm25_refresh_duration_ms',
      help: 'BM25 statistics refresh duration in milliseconds',
      buckets: [100, 500, 1000, 2000, 5000, 10000],
      registers: [this.registry],
    });

    this.embeddingLatency = new Histogram({
      name: 'embedding_generation_latency_ms',
      help: 'Embedding generation latency in milliseconds',
      labelNames: ['type'] as const, // 'text' | 'image' | 'batch'
      buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
      registers: [this.registry],
    });

    // ======== 召回路径指标 ========
    this.recallPathCalls = new Counter({
      name: 'recall_path_calls_total',
      help: 'Total number of recall path invocations',
      labelNames: ['path'] as const, // 'keyword' | 'semantic' | 'category' | 'fallback'
      registers: [this.registry],
    });

    this.recallPathHits = new Counter({
      name: 'recall_path_hits_total',
      help: 'Total number of recall path hits (result count > 0)',
      labelNames: ['path'] as const,
      registers: [this.registry],
    });

    this.recallPathResults = new Histogram({
      name: 'recall_path_results_count',
      help: 'Number of results returned by each recall path',
      labelNames: ['path'] as const,
      buckets: [0, 1, 5, 10, 20, 50, 100, 200],
      registers: [this.registry],
    });

    // ======== 可用性指标 ========
    this.semanticSearchAvailability = new Gauge({
      name: 'semantic_search_available',
      help: 'Semantic search service availability (0 = unavailable, 1 = available)',
      registers: [this.registry],
    });

    this.searchRequestsTotal = new Counter({
      name: 'search_requests_total',
      help: 'Total number of search requests',
      labelNames: ['route', 'status'] as const, // status: 'success' | 'error'
      registers: [this.registry],
    });

    this.searchErrorsTotal = new Counter({
      name: 'search_errors_total',
      help: 'Total number of search errors',
      labelNames: ['error_type'] as const,
      registers: [this.registry],
    });

    // ======== 缓存指标 ========
    this.cacheHits = new Counter({
      name: 'search_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'] as const, // 'suggestion' | 'bm25' | 'synonym'
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'search_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'] as const,
      registers: [this.registry],
    });

    // ======== 业务指标 ========
    this.zeroResultsSearches = new Counter({
      name: 'zero_results_searches_total',
      help: 'Total number of searches that returned zero results',
      labelNames: ['query_length'] as const,
      registers: [this.registry],
    });

    this.spellCorrectionTriggers = new Counter({
      name: 'spell_correction_triggers_total',
      help: 'Total number of spell correction triggers',
      labelNames: ['was_corrected'] as const, // 'true' | 'false'
      registers: [this.registry],
    });

    // 初始化语义搜索可用性为 0（未知）
    this.semanticSearchAvailability.set(0);
  }

  // ============================================================
  // 公开方法：记录指标
  // ============================================================

  /**
   * 记录搜索延迟
   * @param durationMs 延迟（毫秒）
   * @param route 路由（如 '/products/search'）
   * @param strategy 策略（如 'keyword' | 'hybrid' | 'semantic'）
   */
  recordSearchLatency(
    durationMs: number,
    route: string,
    strategy: string,
  ): void {
    this.searchLatency.observe({ route, strategy }, durationMs);
  }

  /**
   * 记录 BM25 统计刷新耗时
   * @param durationMs 耗时（毫秒）
   */
  recordBM25RefreshDuration(durationMs: number): void {
    this.bm25RefreshDuration.observe(durationMs);
  }

  /**
   * 记录 Embedding 生成延迟
   * @param durationMs 延迟（毫秒）
   * @param type 类型（'text' | 'image' | 'batch'）
   */
  recordEmbeddingLatency(durationMs: number, type: string): void {
    this.embeddingLatency.observe({ type }, durationMs);
  }

  /**
   * 记录召回路径调用
   * @param path 路径名（'keyword' | 'semantic' | 'category' | 'fallback'）
   * @param resultCount 返回结果数量
   */
  recordRecallPath(path: string, resultCount: number): void {
    this.recallPathCalls.inc({ path });
    this.recallPathResults.observe({ path }, resultCount);
    if (resultCount > 0) {
      this.recallPathHits.inc({ path });
    }
  }

  /**
   * 更新语义搜索服务可用性
   * @param available 是否可用
   */
  setSemanticSearchAvailability(available: boolean): void {
    this.semanticSearchAvailability.set(available ? 1 : 0);
  }

  /**
   * 记录搜索请求
   * @param route 路由
   * @param status 状态（'success' | 'error'）
   */
  recordSearchRequest(route: string, status: 'success' | 'error'): void {
    this.searchRequestsTotal.inc({ route, status });
  }

  /**
   * 记录搜索错误
   * @param errorType 错误类型
   */
  recordSearchError(errorType: string): void {
    this.searchErrorsTotal.inc({ error_type: errorType });
  }

  /**
   * 记录缓存命中
   * @param cacheType 缓存类型（'suggestion' | 'bm25' | 'synonym'）
   */
  recordCacheHit(cacheType: string): void {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  /**
   * 记录缓存未命中
   * @param cacheType 缓存类型
   */
  recordCacheMiss(cacheType: string): void {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  /**
   * 记录零结果搜索
   * @param queryLength 查询长度
   */
  recordZeroResultsSearch(queryLength: number): void {
    const lengthBucket =
      queryLength <= 5 ? 'short' : queryLength <= 15 ? 'medium' : 'long';
    this.zeroResultsSearches.inc({ query_length: lengthBucket });
  }

  /**
   * 记录拼写纠正触发
   * @param wasCorrected 是否进行了纠正
   */
  recordSpellCorrection(wasCorrected: boolean): void {
    this.spellCorrectionTriggers.inc({
      was_corrected: wasCorrected.toString(),
    });
  }

  // ============================================================
  // 辅助方法：延迟测量
  // ============================================================

  /**
   * 创建计时器（返回结束函数）
   * @example
   * const endTimer = metricsService.startTimer();
   * await doSomething();
   * endTimer((duration) => metricsService.recordSearchLatency(duration, '/search', 'keyword'));
   */
  startTimer(): (callback: (durationMs: number) => void) => void {
    const start = Date.now();
    return (callback: (durationMs: number) => void) => {
      const duration = Date.now() - start;
      callback(duration);
    };
  }

  // ============================================================
  // 导出 Prometheus metrics
  // ============================================================

  /**
   * 获取 Prometheus 格式的 metrics
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * 获取 Registry（供其他模块注册自定义 metrics）
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * 计算召回路径命中率
   * 注：这是一个辅助方法，实际的命中率由 Prometheus 查询计算
   * PromQL: rate(recall_path_hits_total[5m]) / rate(recall_path_calls_total[5m])
   */
  getRecallHitRates(): Record<string, number> {
    // 这里只是占位符，实际应该从 Prometheus 查询
    // 在生产环境中，应使用 Prometheus 的 PromQL 查询
    return {
      keyword: 0.85,
      semantic: 0.72,
      category: 0.61,
      fallback: 0.43,
    };
  }
}
