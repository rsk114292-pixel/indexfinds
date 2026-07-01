# LoloBuySpreadsheets Phase 16 新 VPS 产品域导入报告

日期：2026-07-01

## 目标

在新 VPS `43.165.1.148` 上完成产品域数据导入、referenced uploads 恢复、URL rewrite、post-import safety cleanup、validation、Meilisearch rebuild，并通过 API 普通搜索和视觉搜索 smoke test。

## 执行边界

- 只操作新 VPS 和新项目目录。
- 未连接旧生产 DB。
- 未运行旧项目 migration、seed、reset、cleanup、delete。
- 未导入 users、favorites、browsing、referral、session、search、click、traffic、points、job 数据。
- 未 bulk copy 旧 `settings`。
- 未复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。

## Artifact 校验

本地 artifact：

| Artifact | 本地路径 | 大小 | SHA-256 |
| --- | --- | ---: | --- |
| 产品域 dump | `migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql` | `5597949157` bytes | `0a101e647abab0f860d6ba5b90e6e43fc499e30fff684b159933c4c962b89c51` |
| referenced uploads | `migration-artifacts/uploads-referenced/referenced-uploads.tar` | `153579520` bytes | `4ef7042405c6e3000d43d55059ac51e7c1a6a715eee246352e28be6ecbcaf80c` |

VPS artifact：

| Artifact | VPS 路径 | 校验 |
| --- | --- | --- |
| 产品域 dump | `/opt/lolobuyspreadsheets/imports/product-domain/lolobuy-product-domain-data.sql` | 大小和 SHA-256 与本地一致 |
| referenced uploads | `/opt/lolobuyspreadsheets/imports/uploads/referenced-uploads.tar` | 大小和 SHA-256 与本地一致 |

上传说明：

- dump 首次裸 `rsync` 较慢，中途切换为 `rsync -z -P` 压缩续传。
- 压缩传输实际发送约 `1.8G`，远端落地仍为原始 `5.6G` SQL。

## 导入前状态

VPS repo revision：

```text
c1d35e5
```

导入前核心产品域表为空：

| 表 | 行数 |
| --- | ---: |
| `products` | 0 |
| `skus` | 0 |
| `brands` | 0 |
| `product_image_embeddings` | 0 |
| `product_text_embeddings` | 0 |

baseline migrations：

- `1790000000000 LoloBuyInitialSchemaBaseline1790000000000`
- `1790000100000 EnsureSearchTrackingTables1790000100000`
- `1790000200000 EnsureSearchTrackingTables1790000200000`
- `1790000300000 LoloBuyRuntimeEmptyTables1790000300000`

pre-import 备份：

```text
/opt/lolobuyspreadsheets/backups/pre-import/lolobuy-pre-import-20260701-200409.dump
```

备份 SHA-256：

```text
9729322e98c92be9fdb2a000bd8b2848ad61aa7e5636ba24d512de5a41094bf9
```

## 导入过程

导入期间只停止 API 容器，Postgres、Redis、Meilisearch、embedding service 保持运行。

第一次导入失败点：

```text
ERROR: duplicate key value violates unique constraint "UQ_platforms_key"
DETAIL: Key (key)=(loongbuy) already exists.
CONTEXT: COPY platforms, line 2
```

原因：

- 新 API 启动时已经创建默认 `platforms` 记录。
- dump 本身也包含产品域 `platforms` 表。
- 两者在 `platforms.key` 上冲突。

处理：

- API 保持停止。
- 清空失败产生的产品域半导入数据和默认 `platforms`。
- 重新导入同一个已校验 dump。

清空语句级联提示包含运行表，例如 `user_favorites`、`user_browsing_history`、`product_interaction_events`、`collection_items`；这些表在新库中本来就是空表，未导入旧运行数据。

后续 runbook 注意：

- 如果 API 已经启动过并创建默认 `platforms`，产品域 dump 导入前必须清空新库默认 `platforms`，让 dump 中的平台数据成为唯一来源。

## Uploads 恢复

referenced uploads 解压位置：

```text
/opt/lolobuyspreadsheets/data/uploads
```

结果：

| 项 | 值 |
| --- | ---: |
| 文件数 | 881 |
| 大小 | 148M |

与本地 manifest 一致：885 referenced paths、881 packaged files、4 个已知缺失品牌 logo。

## URL Rewrite

执行：

```text
/opt/lolobuyspreadsheets/app/repo/migration-artifacts/product-domain-import/sql/10-rewrite-upload-urls.sql
```

生产 uploads base：

```text
https://api.lolobuyspreadsheets.com/uploads/
```

更新结果：

| 表/字段 | 更新行数 |
| --- | ---: |
| `products.images` | 1 |
| `product_qc_media.url` | 297 |
| `brands.logoUrl` | 574 |
| `platforms.logoUrl` | 11 |

旧 `api.findsindex.com/uploads` 残留为 0。

## Safety Cleanup

执行：

```text
/opt/lolobuyspreadsheets/app/repo/migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql
```

结果：

| 检查项 | 结果 |
| --- | ---: |
| `platforms.inviteCode` 非空 | 0 |
| 平台硬编码旧 invite/ref 参数 | 0 |
| `tracking_enabled` | `false` |
| `loongbuy_invitecode` | empty |
| stale `localhost:4100/uploads` 残留 | 0 |
| old production uploads 残留 | 0 |

## Validation

执行：

```text
/opt/lolobuyspreadsheets/app/repo/migration-artifacts/product-domain-import/sql/20-post-import-validation.sql
```

关键结果：

| 表 | 期望 | 实际 | 通过 |
| --- | ---: | ---: | --- |
| `products` | 331776 | 331776 | yes |
| `skus` | 1672709 | 1672709 | yes |
| `brands` | 3259 | 3259 | yes |
| `platforms` | 11 | 11 | yes |
| `product_attribute_values` | 3341521 | 3341521 | yes |
| `product_image_embeddings` | 331776 | 331776 | yes |
| `product_text_embeddings` | 331776 | 331776 | yes |

外键孤儿检查全部为 0。

旧 uploads 残留全部为 0。

运行/用户/统计类排除表仍为空：

- `users`
- `user_favorites`
- `user_browsing_history`
- `user_search_history`
- `referral_codes`
- `referral_clicks`
- `referral_attributions`
- `point_accounts`
- `point_transactions`
- `point_withdrawals`
- `batch_jobs`
- `batch_job_items`
- `weidian_cache`

产品状态分布：

| status | count |
| --- | ---: |
| `active` | 331770 |
| `draft` | 6 |

## Meilisearch Rebuild

执行方式：

- 生产 API 镜像一次性 `node -e`。
- 从 `dist` 加载 `AppModule`、`MeilisearchSyncService`、`MeilisearchService`。
- 不启动 HTTP 端口。
- 不运行 migration。

结果：

| 项 | 值 |
| --- | ---: |
| synced documents | 331770 |
| elapsedSeconds | 4380 |
| Meilisearch `numberOfDocuments` | 331770 |
| Meilisearch `isIndexing` | false |

注意：

- 一次性 Nest application context 会加载定时任务。
- 执行期间触发过 `AnalyticsAlertsService` 刷新和 `PopularityScoreService` 计算。
- `PopularityScoreService` 计算了 331770 个产品，属于新库当前产品域数据的运行期计算，不涉及旧用户或旧统计数据导入。
- 后续如需更快、更纯的索引重建，建议新增专用 one-shot rebuild 脚本，避免使用完整 AppModule 触发 cron。

## Smoke Test

API health：

```json
{"status":"ok","database":"ok"}
```

Meilisearch stats：

```json
{"numberOfDocuments":331770,"isIndexing":false}
```

普通搜索：

```text
GET http://127.0.0.1:4101/products/search?q=nike&limit=5
```

结果：

- `total=5`
- `data_len=5`
- 示例标题：
  - `FC Barcelona x Spotify 2024 Third Jersey Pink`
  - `Nike Air Force 1 Low White Sneakers`
  - `Nike Swoosh Crew Socks Triple Pack Black White Gray Socks`

视觉搜索状态：

```json
{
  "available": true,
  "message": "Visual search is ready",
  "stats": {
    "productsWithEmbedding": 331769,
    "productsWithoutEmbedding": 0,
    "totalImageEmbeddings": 331769,
    "coverage": 100
  }
}
```

视觉 by-product：

```text
GET http://127.0.0.1:4101/visual-search/by-product/59418d07-228d-4397-9d58-1ccd997beb1d?limit=5&minSimilarity=25
```

结果：

- `total=5`
- `results_len=5`

视觉上传搜索：

```text
POST http://127.0.0.1:4101/visual-search/search?limit=3&minSimilarity=0
```

上传测试图片：

```text
brand-outdoor deer-1774103698353.jpg
```

结果：

- `total=3`
- `results_len=3`

uploads 静态文件：

| 类型 | API path | HTTP |
| --- | --- | ---: |
| brand logo | `/uploads/1f78867ff4e0b29503dac58c7b502a4f.png` | 200 |
| platform logo | `/uploads/cc012a2f4aa31834a49750e990396e62.jpg` | 200 |

## 最终 VPS 状态

VPS repo revision：

```text
c1d35e5
```

容器状态：

| 服务 | 状态 | 端口绑定 |
| --- | --- | --- |
| API | healthy | `127.0.0.1:4101->4101/tcp` |
| embedding service | healthy | `127.0.0.1:8001->8001/tcp` |
| Meilisearch | healthy | `127.0.0.1:7700->7700/tcp` |
| Postgres | healthy | `127.0.0.1:5432->5432/tcp` |
| Redis | healthy | `127.0.0.1:6379->6379/tcp` |

磁盘：

```text
/dev/vda2 118G total, 35G used, 79G available, 31%
```

## 重要日志路径

```text
/opt/lolobuyspreadsheets/logs/phase16/product-import-20260701-200509.log
/opt/lolobuyspreadsheets/logs/phase16/product-import-retry-20260701-200623.log
/opt/lolobuyspreadsheets/logs/phase16/url-rewrite-20260701-203915.log
/opt/lolobuyspreadsheets/logs/phase16/safety-cleanup-20260701-203945.log
/opt/lolobuyspreadsheets/logs/phase16/post-import-validation-20260701-204009.log
/opt/lolobuyspreadsheets/logs/phase16/meilisearch-full-sync-20260701-204226.log
```

## 剩余步骤

1. 配置 API 反代和 TLS，不复制旧 Caddy 生产配置。
2. 配置 Vercel `apps/web` 生产项目和新站环境变量。
3. 用临时验证方式跑 Web -> API 端到端 smoke test。
4. 最后再执行 DNS 切换。
