# LoloBuySpreadsheets Phase 15 API 与空库 Baseline 部署报告

日期：2026-07-01

## 目标

在不导入产品域数据、不切 DNS、不部署 Vercel 的前提下，在新 VPS 上启动并验证：

- `embedding-service`
- `api`
- 空库 baseline migration

成功标准：

1. `embedding-service` 构建成功并健康。
2. `api` 构建成功并健康。
3. API 只连接新 VPS 的新 Postgres、Redis、Meilisearch、embedding service。
4. TypeORM 只执行 baseline migrations。
5. 关键业务、用户、行为、推荐、积分、job 表为空。
6. `settings` 只包含 API 默认重建 key，不从旧库 bulk copy。
7. API 和 embedding 只绑定 `127.0.0.1`。
8. 不输出、不记录任何真实 secret。

## 执行边界

- 只连接新 VPS：`43.165.1.148`。
- 不连接旧 VPS。
- 不连接旧生产 DB。
- 不运行旧项目 migration、seed、reset、cleanup、delete。
- 不导入 users、favorites、browsing、referral、session、search、click、traffic、points、job 数据。
- 不上传产品域 dump。
- 不上传或解压 `referenced-uploads.tar`。
- 不切 DNS。
- 不部署 Vercel。

## Git revision

VPS repo 已更新到：

```text
892521a fix: pin embedding numpy below 2
```

Phase 15 过程中新增两个部署修复：

- `771594e fix: use cpu torch for embedding image`
- `892521a fix: pin embedding numpy below 2`

原因：

- 原 `embedding-service` 通过普通 PyPI 安装 `torch>=2,<3`，在 CPU-only VPS 上解析到了带 CUDA/NVIDIA 依赖的 wheel，下载体积和运行形态不合适。
- CPU-only PyTorch `2.2.2+cpu` 与 NumPy 2.x 有运行时兼容风险，因此固定 `numpy<2`。

## 启动命令

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env \
  -f docker-compose.prod.yml \
  up -d --build embedding-service api
```

## 当前容器状态

```text
lolobuyspreadsheets-api-1                 Up 5 minutes (healthy)    127.0.0.1:4101->4101/tcp
lolobuyspreadsheets-embedding-service-1   Up 5 minutes (healthy)    127.0.0.1:8001->8001/tcp
lolobuyspreadsheets-meilisearch-1         Up 59 minutes (healthy)   127.0.0.1:7700->7700/tcp
lolobuyspreadsheets-postgres-1            Up 59 minutes (healthy)   127.0.0.1:5432->5432/tcp
lolobuyspreadsheets-redis-1               Up 56 minutes (healthy)   127.0.0.1:6379->6379/tcp
```

## Health checks

Embedding service:

```json
{"status":"ok","models":{"image":{"name":"clip-ViT-B-32","dimensions":512,"loaded":true},"text":{"name":"all-MiniLM-L6-v2","dimensions":384,"loaded":true}}}
```

API:

```json
{"status":"ok","database":"ok"}
```

说明：API health 输出里还有 timestamp 和 uptime；报告中省略动态字段。

## Baseline migration 验证

`typeorm_migrations` 当前只有 4 条 baseline migration：

```text
1790000000000 | LoloBuyInitialSchemaBaseline1790000000000
1790000100000 | EnsureSearchTrackingTables1790000100000
1790000200000 | EnsureSearchTrackingTables1790000200000
1790000300000 | LoloBuyRuntimeEmptyTables1790000300000
```

本地 `apps/api/data-source.ts` 确认 production migration glob 为：

```text
dist/src/migrations/baseline/*{.ts,.js}
```

## 数据边界验证

关键表计数：

```text
products=0
brands=0
skus=0
category=0
users=0
user_favorites=0
user_browsing_history=0
user_search_history=0
search_logs=0
search_clicks=0
visit_sessions=0
outbound_clicks=0
referral_codes=0
referral_clicks=0
referral_attributions=0
point_accounts=0
point_transactions=0
point_withdrawals=0
batch_jobs=0
batch_job_items=0
product_interaction_events=0
```

`settings=14`，来源是 API 启动时 `SettingsService.ensureDefaults()` 的默认重建，不是旧库 bulk copy。

仅查询了 `settings.key` 与 `isSecret`，没有读取 value。当前唯一 secret key：

```text
ai_api_key | value_length=0 | isSecret=true
```

## 端口暴露审计

监听端口：

```text
127.0.0.1:8001
127.0.0.1:7700
127.0.0.1:6379
127.0.0.1:5432
127.0.0.1:4101
```

结论：

- API 未直接公网暴露。
- embedding service 未直接公网暴露。
- Postgres、Redis、Meilisearch 仍只绑定 VPS 本机。

## 日志验证摘要

API 启动日志确认：

- `Image embedding service: available (healthy: true, imageModel: true)`
- `Semantic search service initialized, embedding available: true`
- `Meilisearch client initialized: http://meilisearch:7700`
- `Index "products" ready with settings applied`
- `Nest application successfully started`

当前 Meilisearch 只完成空索引 settings 初始化，尚未导入产品数据或 rebuild 产品索引。

## 资源状态

磁盘：

```text
/dev/vda2  118G  20G  94G  18% /
```

内存：

```text
Mem: 7.4Gi total, 1.6Gi used, 5.9Gi available
Swap: 1.9Gi total, 268Ki used
```

说明：

- embedding 镜像构建后磁盘从 Phase 14 的约 7G 使用增长到约 20G。
- 94G 可用空间足够进入产品域 dump、uploads 和 Meilisearch rebuild 阶段。

## 明确未执行

- 未导入产品域 dump。
- 未上传或解压 `referenced-uploads.tar`。
- 未执行 upload URL rewrite。
- 未执行 post-import safety cleanup。
- 未执行 validation SQL。
- 未 rebuild Meilisearch 产品索引。
- 未配置 Caddy/API HTTPS。
- 未部署 Vercel 前端。
- 未切 DNS。

## 下一阶段建议

Phase 16 建议进入产品域导入前准备：

1. 上传产品域 dump 到 `/opt/lolobuyspreadsheets/imports/product-domain/`。
2. 上传 `referenced-uploads.tar` 到 `/opt/lolobuyspreadsheets/imports/uploads/`。
3. 导入前做数据库备份。
4. 停止或维持 API 由具体导入脚本要求决定；如果导入脚本会改大量产品域表，优先短暂停 API。
5. 按 Phase 10 runbook 执行产品域导入、uploads 解压、URL rewrite、post-import safety cleanup、validation、Meilisearch rebuild。
