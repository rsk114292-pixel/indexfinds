# lolobuyspreadsheets.com Schema Baseline 报告

> 日期：2026-06-30
> 阶段：Phase 5
> 状态：已完成

## 本次目标

为新站创建可审计、可复现的初始 schema baseline migration，用于新本地 DB 和后续新 VPS 空库初始化。

## 安全边界

本次只操作：

- `/Volumes/1T/lolobuyspreadsheets.com`
- 新本地 DB：`127.0.0.1:15432/lolobuyspreadsheets_dev`

本次没有执行：

- 旧项目命令
- 旧项目 migration
- seed
- reset
- cleanup/delete
- 旧生产数据库连接
- 旧用户、收藏、浏览记录、referral 数据导入
- `schema:sync` 作为最终方案

## 文件变更

新增 baseline migration：

- `apps/api/src/migrations/baseline/1790000000000-LoloBuyInitialSchemaBaseline.ts`

旧历史 migrations 已归档到新项目内部：

- `apps/api/src/migrations/legacy/archive/`
- `apps/api/src/search/migrations/legacy/archive/`

TypeORM migration glob 已收窄：

- `apps/api/data-source.ts`
- `apps/api/src/app.module.ts`

现在只加载：

- `src/migrations/baseline/*{.ts,.js}`

为保持编译通过，更新了一个硬编码旧迁移 import：

- `apps/api/src/scripts/run-referral-migration.ts`

注意：该脚本没有运行，旧 referral 数据也没有导入。

## Baseline 覆盖范围

产品域表：

- `products`
- `skus`
- `category`
- `category_closure`
- `brands`
- `colors`
- `attributes`
- `attribute_values`
- `product_attribute_values`
- `product_secondary_categories`
- `product_qc_media`

平台、设置、搜索启动表：

- `platforms`
- `settings`
- `synonym_groups`
- `social_links`

视觉搜索和语义搜索表：

- `product_image_embeddings`
- `product_text_embeddings`

扩展：

- `vector`
- `pgcrypto`
- `pg_trgm`

向量列：

- `product_image_embeddings.embedding vector(512)`
- `product_text_embeddings.embedding vector(384)`
- `products.embedding vector(512)`

说明：`products.embedding` 是为了让现有 API 启动时的兼容补列逻辑变成可审计 schema，而不是启动时偷偷修改结构。

## 验证结果

已执行：

- `pnpm migration:show`
- `pnpm migration:run`
- `pnpm migration:revert`
- 再次 `pnpm migration:run`
- `pnpm typecheck`
- API 空库启动
- `curl http://127.0.0.1:4100/health`

关键结果：

- `migration:show` 只显示 `LoloBuyInitialSchemaBaseline1790000000000`。
- 旧历史 migrations 不再进入 TypeORM 执行候选。
- `typeorm_migrations` 只记录新 baseline。
- 新 DB 目标表创建成功。
- `vector`、`pgcrypto`、`pg_trgm` 扩展存在。
- image embedding 列为 `vector(512)`。
- text embedding 列为 `vector(384)`。
- API 空库启动成功。
- `/health` 返回 `status=ok`、`database=ok`。

## 额外发现

第一次 API 空库启动发现 `SocialLinksService.onModuleInit()` 会立即查询 `social_links` 并写入默认公共链接。

处理方式：

- 将 `social_links` 纳入 baseline。
- 回滚新 DB baseline。
- 重跑更新后的单一 baseline。
- 重新启动 API 并验证通过。

这不涉及旧用户数据、旧 referral 数据或旧行为数据。

## 当前结论

Phase 5 已完成。

新项目 baseline migration 已创建；新 DB schema 初始化成功；API 能空库启动。

下一步应返回旧项目聊天窗口，只读统计真实产品/SKU/embedding 数量，并准备产品域数据导出清单。

## Phase 6 后补检查

旧项目窗口完成只读 production inventory 后，确认 v1 导出范围新增：

- `brand_aliases`
- `brand_relations`
- `product_brand_facts`

原 Phase 5 baseline 不包含这三张表，不能直接承接完整 Phase 6 导出。

处理方式：

- 在新 baseline 中补齐 `brand_aliases`、`brand_relations`、`product_brand_facts`。
- 同时补齐 `brand_candidates`、`brand_candidate_items` 空 schema，作为 `product_brand_facts.candidateId` 的 nullable FK 目标。
- 不导入 `brand_candidates` / `brand_candidate_items` 旧数据；旧生产两表计数为 0，且 `product_brand_facts.candidateId` 非空数量为 0。

补齐后已重新验证：

- `pnpm typecheck` 通过。
- 新本地 DB 已执行 `migration:revert` 后重新 `migration:run`。
- 补后的 baseline 可从空库初始化。
- `migration:show` 仍只显示 `LoloBuyInitialSchemaBaseline1790000000000`。
- 抽查确认导入承接表存在，image embedding 为 `vector(512)`，text embedding 为 `vector(384)`。
