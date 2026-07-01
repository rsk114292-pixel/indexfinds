# LoloBuySpreadsheets Phase 8 本地搜索验证报告

生成时间：2026-06-30

## 结论

Phase 8 本地验证通过。

- 新项目本地 API 可以连接新 DB、新 Redis、新 Meilisearch。
- Meilisearch 已完成全量重建并完成索引 swap。
- 普通搜索 `/products/search` 可返回迁移商品。
- facets `/products/facets` 可返回分类、品牌、价格、颜色等筛选聚合。
- embedding-service 已启动，图片模型和文本模型均加载成功。
- 视觉搜索 `/visual-search/status` ready。
- 视觉相似商品搜索 `/visual-search/by-product/:productId` 可返回相似商品。
- 上传图片视觉搜索 `/visual-search/search` 可返回结果。
- 未导入旧 users、favorites、browsing、referral、weidian_cache、jobs、points 数据。

## 本轮只操作范围

- 项目目录：`/Volumes/1T/lolobuyspreadsheets.com`
- 本地服务：当前项目 Docker Compose 的 PostgreSQL、Redis、Meilisearch、embedding-service
- 未连接旧生产 DB
- 未运行旧项目 migration、seed、reset、cleanup、delete
- 未导入旧用户、收藏、浏览、referral、session、search、click、traffic、points、job 数据

## 关键配置修正

### Meilisearch task wait timeout

为避免大索引批量写入时 5 秒 `waitTask` 超时，新增统一等待配置：

- `MEILI_TASK_WAIT_OPTIONS.timeout = 120000`
- `MEILI_TASK_WAIT_OPTIONS.interval = 500`

已应用位置：

- `apps/api/src/meilisearch/meilisearch.constants.ts`
- `apps/api/src/meilisearch/meilisearch.service.ts`
- `apps/api/src/meilisearch/meilisearch-index.service.ts`
- `apps/api/src/meilisearch/meilisearch-sync.service.ts`

### 本地 BM25 重型统计禁用

本地全量数据下 BM25 统计刷新会触发 Postgres statement timeout，且首版搜索使用 Meilisearch。

已在 `apps/api/.env.local` 设置：

- `SEARCH_ENGINE=meilisearch`
- `BM25_REFRESH_ON_STARTUP=false`
- `BM25_REFRESH_STATS_ENABLED=false`

API 重启后日志确认：

- `BM25 stats refresh disabled; using fallback relevance until enabled`
- `ProductSearchRuntimeService 搜索引擎初始化: meilisearch`

## 数据校验

### 产品域数量

导入后校验脚本已更新：

- `migration-artifacts/product-domain-import/sql/20-post-import-validation.sql`

当前产品域固定行数校验通过：

| 表 | 行数 |
| --- | ---: |
| products | 331,776 |
| skus | 1,672,709 |
| category | 203 |
| category_closure | 551 |
| brands | 3,259 |
| product_attribute_values | 3,341,521 |
| product_image_embeddings | 331,776 |
| product_text_embeddings | 331,776 |

Embedding 类型校验通过：

- `products.embedding`: `vector(512)`
- `product_image_embeddings.embedding`: `vector(512)`
- `product_text_embeddings.embedding`: `vector(384)`

Embedding 覆盖：

- image embeddings：331,775 非空，1 个 null
- text embeddings：331,776 非空
- API 视觉搜索统计按 active 商品计算：331,769 with embedding，0 without embedding，coverage 100%

### uploads URL

旧 uploads host 残留为 0：

- `api.findsindex.com/uploads/` 在产品、SKU、QC media、brands、platforms 字段中均未残留
- 普通外部商品图片 URL 未重写

### 排除域

以下旧数据域仍为 0：

| 表 | 行数 |
| --- | ---: |
| users | 0 |
| user_favorites | 0 |
| user_browsing_history | 0 |
| referral_codes | 0 |
| referral_clicks | 0 |
| referral_attributions | 0 |
| weidian_cache | 0 |
| batch_jobs | 0 |
| batch_job_items | 0 |
| point_accounts | 0 |
| point_transactions | 0 |

说明：`visit_sessions`、`search_logs`、`search_clicks` 等运行时遥测表允许在本地 smoke test 后产生新记录；它们不再作为“导入后必须不存在”的判断条件。

## Migration 状态

`migration:show` 结果：

```text
[X] 3 LoloBuyInitialSchemaBaseline1790000000000
[X] 4 EnsureSearchTrackingTables1790000100000
[X] 5 EnsureSearchTrackingTables1790000200000
[X] 6 LoloBuyRuntimeEmptyTables1790000300000
```

没有尝试执行旧历史 migrations。

## Meilisearch 全量重建

全量重建命令：

```bash
npx ts-node -r tsconfig-paths/register scripts/ops/meilisearch-sync.ts
```

结果：

- 同步完成：331,770 个商品
- 耗时：4,034.9 秒
- Index swap completed successfully
- Meili stats：`numberOfDocuments=331770`
- Meili stats：`isIndexing=false`

数量解释：

- `products` 总数：331,776
- `active` 商品：331,770
- `draft` 商品：6
- Meilisearch 同步 active 商品，因此 331,770 是正确数量

## 普通搜索 smoke test

### Health

`GET http://localhost:4101/health`

结果：

- `status=ok`
- `database=ok`

### Search

`GET http://localhost:4101/products/search?q=nike&limit=5`

结果：

- `query=nike`
- `total=5`
- 返回 Nike 商品
- 返回商品包含 brand、category、price、mainImage、hasEmbedding 等字段

### Facets

`GET http://localhost:4101/products/facets?q=nike`

结果：

- 返回 categories
- 返回 brands，Nike count 为 15,866
- 返回 priceRange
- 返回 colors、genders、styles、occasions、seasons

## 视觉搜索 smoke test

### embedding-service

`GET http://localhost:18001/health`

结果：

```json
{
  "status": "ok",
  "models": {
    "image": { "name": "clip-ViT-B-32", "dimensions": 512, "loaded": true },
    "text": { "name": "all-MiniLM-L6-v2", "dimensions": 384, "loaded": true }
  }
}
```

API 日志：

- `SemanticSearch Service RECOVERED`
- `VisualSearch Service RECOVERED`

### Visual status

`GET http://localhost:4101/visual-search/status`

结果：

- `available=true`
- `message=Visual search is ready`
- `productsWithEmbedding=331769`
- `productsWithoutEmbedding=0`
- `coverage=100`

### By product

`GET http://localhost:4101/visual-search/by-product/e58e381c-07e8-4310-b3e1-8777b2ba31c9?limit=5&minSimilarity=25`

结果：

- source product：`Nike Air Force 1 Low White Sneakers`
- 返回 5 条相似商品
- similarity 范围：93-95

### Upload image

`POST http://localhost:4101/visual-search/search?limit=3&minSimilarity=0`

测试文件：

- `apps/api/uploads/b49f834369dd571c0d518cc646363104.webp`
- 需要显式 MIME：`type=image/webp`

结果：

- 返回 3 条结果
- similarity 范围：80-82

说明：

- 未显式 MIME 时，curl 会发送 `application/octet-stream`，API 正确拒绝并返回 400。
- 显式 `image/webp` 后上传视觉搜索通过。

## 已知观察

- 本地大表导入后，Postgres 会触发 `VACUUM ANALYZE public.products`，全量索引期间会短暂拖慢 Meili 同步。
- 11 点触发过 `popularityScore` 定时任务，检测到 Postgres 繁忙后提前结束；未中断同步。
- 同步脚本完成后 Nest 应用上下文未自动退出，已手动停止该同步进程，避免后台定时任务继续运行。
- 普通搜索和视觉搜索 smoke 后，运行时 telemetry 表可能出现本地新记录；这不代表旧数据被导入。

## 下一步建议

1. 保留当前本地 DB、Redis、Meili、embedding-service 作为新站验证基线。
2. 用前端本地站点做端到端浏览器 smoke：搜索页、商品页、视觉搜索页、uploads 图片加载。
3. 选择性重建安全 settings key，只重建新站需要的公开配置和新 secret，不复制旧值。
4. 准备新 VPS 空库初始化流程：baseline migrations、product-domain dump import、uploads tar 解压、Meili rebuild、embedding-service health、API smoke。
5. 新 VPS 部署前再次确认 `.env`、DB、Redis、Meili、COMPOSE_PROJECT_NAME、域名、Caddy 配置全部是新站专用。
