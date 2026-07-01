# LoloBuySpreadsheets Phase 10 新 VPS 导入与部署 Runbook

日期：2026-07-01

## 目标

把已经在本地验证通过的迁移流程固化成新 VPS 可重复执行的步骤。成功标准是：新 VPS 空库可以从 baseline migration 初始化，导入产品域数据，恢复 referenced uploads，重建 Meilisearch，并通过 API/Web/普通搜索/视觉搜索 smoke test。

## 假设

- 只操作新项目 `/Volumes/1T/lolobuyspreadsheets.com` 和后续新 VPS。
- 旧项目和旧生产库只读，Phase 10 不再连接旧生产 DB。
- dump 已存在：`migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql`。
- uploads 包已存在：`migration-artifacts/uploads-referenced/referenced-uploads.tar`。
- 新 VPS 会使用新的 `.env`、新 DB、新 Redis、新 Meilisearch、新 `COMPOSE_PROJECT_NAME`。

## 禁止项

- 不复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。
- 不运行旧项目 migration/seed/reset/cleanup/delete。
- 不导入 users/favorites/browsing/referral/session/search/click/traffic/points/job 数据。
- 不 bulk copy `settings`。
- 不重写普通外部商品图片 URL。

## 本地修复记录

本地发现品牌图标和代购平台图标坏图，原因是 URL 指向旧本地端口：

- `brands.logoUrl`：574 条 `http://localhost:4100/uploads/...`
- `platforms.logoUrl`：11 条 `http://localhost:4100/uploads/...`
- `products.images`：1 处 `http://localhost:4100/uploads/...`
- `product_qc_media.url`：297 处 `http://localhost:4100/uploads/...`

已在新本地 DB 修复为 `http://localhost:4101/uploads/...`。抽样品牌页 `/en/brands/a-bathing-ape` 验证通过，品牌 Logo 从 API uploads 正常加载，坏图数为 0。

为避免新 VPS 或重新导入时复发，已新增：

- `migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql`

第二次复跑该 SQL 后所有 UPDATE 均为 0，说明脚本幂等。当前本地校验结果：

| 检查项 | 结果 |
| --- | ---: |
| `platforms` 旧生产 uploads 残留 | 0 |
| `platforms` stale `localhost:4100/uploads` | 0 |
| `platforms.inviteCode` 非空 | 0 |
| 平台模板硬编码旧 invite/ref 参数 | 0 |
| `product_qc_media` 旧生产 uploads 残留 | 0 |
| `brands` stale `localhost:4100/uploads` | 0 |
| `brands` 旧生产 uploads 残留 | 0 |
| `skus` stale `localhost:4100/uploads` | 0 |
| `products` stale `localhost:4100/uploads` | 0 |
| `settings.loongbuy_invitecode` | empty |
| `settings.tracking_enabled` | false |

## 新 VPS 执行顺序

1. 准备新环境
   - 新 `.env`
   - 新 Postgres
   - 新 Redis
   - 新 Meilisearch
   - 新 uploads volume
   - 新 `COMPOSE_PROJECT_NAME`

   验证：服务端口、容器名、数据库名均不是旧项目值。

2. 初始化空库 schema
   - 在新 API 环境执行 baseline migrations。
   - 不使用 `schema:sync` 作为最终方案。

   验证：`products/skus/brands/category/platforms/product_image_embeddings/product_text_embeddings` 等业务表存在，`vector` extension 存在。

3. 清理新 API 自动创建的默认平台数据

   如果 API 已经启动过，应用可能已自动创建默认 `platforms` 记录。产品域 dump 也包含 `platforms`，因此导入前需要确认并清空新库默认平台数据，避免 `UQ_platforms_key` 冲突。

   ```sql
   TRUNCATE TABLE platforms RESTART IDENTITY CASCADE;
   ```

   只允许在新 VPS、新 DB、产品域导入前执行。执行前必须确认 `products/skus/brands` 仍为空，且运行/用户/收藏/浏览/推荐/搜索/点击/积分/job 表未导入旧数据。

4. 导入产品域 dump

   ```bash
   psql "$NEW_PRODUCTION_DATABASE_URL" \
     -v ON_ERROR_STOP=1 \
     -f migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql
   ```

   验证：导入无错误，COPY sections 完成。

5. 解压 referenced uploads

   ```bash
   mkdir -p apps/api/uploads
   tar -xf migration-artifacts/uploads-referenced/referenced-uploads.tar -C apps/api/uploads
   ```

   验证：uploads 文件数与 manifest 对齐；已知 4 个旧品牌 Logo 缺失，需要后续替换、清空或恢复。

6. 重写旧 uploads 域名

   ```bash
   psql "$NEW_PRODUCTION_DATABASE_URL" \
     -v ON_ERROR_STOP=1 \
     -v new_upload_base='https://api.lolobuyspreadsheets.com/uploads/' \
     -f migration-artifacts/product-domain-import/sql/10-rewrite-upload-urls.sql
   ```

   验证：`api.findsindex.com/uploads/` 残留为 0。

7. 执行 post-import 安全清理

   ```bash
   psql "$NEW_PRODUCTION_DATABASE_URL" \
     -v ON_ERROR_STOP=1 \
     -v new_upload_base='https://api.lolobuyspreadsheets.com/uploads/' \
     -f migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql
   ```

   验证：
   - `platforms.inviteCode` 非空数量为 0
   - 平台模板没有旧硬编码 invite/ref 参数
   - `settings.loongbuy_invitecode` 为空
   - `settings.tracking_enabled=false`
   - `localhost:4100/uploads/` 残留为 0

8. 运行导入后校验

   ```bash
   psql "$NEW_PRODUCTION_DATABASE_URL" \
     -v ON_ERROR_STOP=1 \
     -f migration-artifacts/product-domain-import/sql/20-post-import-validation.sql
   ```

   验证：行数、外键孤儿、embedding vector 类型、旧 uploads 残留全部通过。

9. 重建 Meilisearch
   - 使用新 Meilisearch 和新 API 环境变量。
   - 全量同步 active products。

   验证：Meilisearch document count 与 active products 接近；`isIndexing=false`。

10. Smoke test
   - API `/health`
   - Web 首页
   - 普通搜索 `/en/search?q=nike`
   - 品牌页 Logo，例如 `/en/brands/a-bathing-ape`
   - 平台选择器 Logo
   - 视觉搜索 status
   - by-product 视觉搜索
   - 图片上传视觉搜索

11. 选择性重建安全 settings
    - 新站自己的平台 invite/ref code
    - 新站自己的 GA/GTM
    - 新站自己的 AI/search/security key

    验证：不出现旧站 invite/ref/settings/secrets。

## 当前下一步

本地已经完成 Phase 10 SQL 和 runbook 准备。进入新 VPS 前，建议先在本地保留当前验证环境，并把上述 runbook 作为新 VPS 操作清单逐项执行。
