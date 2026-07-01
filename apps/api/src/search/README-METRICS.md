# 搜索系统性能监控集成指南

## 安装依赖

```bash
npm install prom-client
```

## Metrics 端点

- **Prometheus 格式**: `GET /metrics`
- **召回命中率**: `GET /metrics/recall-hit-rates`

## 集成示例

### 1. 记录搜索延迟

```typescript
// 在 search-orchestrator.service.ts 中
constructor(private readonly metricsService: SearchMetricsService) {}

async executeSearch(query: string) {
  const endTimer = this.metricsService.startTimer();
  
  try {
    const result = await this.performSearch(query);
    endTimer((duration) => 
      this.metricsService.recordSearchLatency(duration, '/search', 'keyword')
    );
    this.metricsService.recordSearchRequest('/search', 'success');
    return result;
  } catch (error) {
    this.metricsService.recordSearchRequest('/search', 'error');
    this.metricsService.recordSearchError(error.name);
    throw error;
  }
}
```

### 2. 记录召回路径

```typescript
// 在 multi-path-recall.service.ts 中
async keywordRecall(query: string) {
  const results = await this.performKeywordRecall(query);
  this.metricsService.recordRecallPath('keyword', results.length);
  return results;
}
```

### 3. 更新语义搜索可用性

```typescript
// 在 semantic-search.service.ts 中
async checkServiceHealth() {
  const isAvailable = await this.embeddingService.isAvailable();
  this.metricsService.setSemanticSearchAvailability(isAvailable);
}
```

### 4. 记录零结果搜索

```typescript
// 在 search-orchestrator.service.ts 中
if (result.products.length === 0) {
  this.metricsService.recordZeroResultsSearch(query.length);
}
```

### 5. 记录缓存命中

```typescript
// 在 full-text-search.service.ts 中
const cached = await this.cacheManager.get(cacheKey);
if (cached) {
  this.metricsService.recordCacheHit('suggestion');
  return cached;
}
this.metricsService.recordCacheMiss('suggestion');
```

## Prometheus 查询示例

### P50/P95/P99 搜索延迟

```promql
# P50
histogram_quantile(0.50, rate(search_latency_ms_bucket[5m]))

# P95
histogram_quantile(0.95, rate(search_latency_ms_bucket[5m]))

# P99
histogram_quantile(0.99, rate(search_latency_ms_bucket[5m]))
```

### 召回路径命中率

```promql
rate(recall_path_hits_total[5m]) / rate(recall_path_calls_total[5m])
```

### 语义搜索可用率

```promql
avg_over_time(semantic_search_available[5m])
```

### 搜索错误率

```promql
rate(search_errors_total[5m]) / rate(search_requests_total[5m])
```

## Grafana 仪表盘配置

1. 创建数据源：添加 Prometheus 服务器地址
2. 导入预设模板或创建自定义面板
3. 关键面板推荐：
   - 搜索延迟分布图（Heatmap）
   - 召回路径命中率（Gauge）
   - 错误率趋势（Graph）
   - 缓存命中率（Stat）
   - 零结果搜索数（Counter）

## 告警规则示例

```yaml
groups:
  - name: search_alerts
    rules:
      - alert: HighSearchLatency
        expr: histogram_quantile(0.95, rate(search_latency_ms_bucket[5m])) > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "搜索延迟过高 (P95 > 2s)"

      - alert: SemanticSearchDown
        expr: semantic_search_available == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "语义搜索服务不可用"

      - alert: HighSearchErrorRate
        expr: rate(search_errors_total[5m]) / rate(search_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "搜索错误率过高 (>5%)"
```
