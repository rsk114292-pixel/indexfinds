# LoloBuySpreadsheets Phase 11 新 VPS 部署前准备

日期：2026-07-01

## 目标

在购买新 VPS 前，把生产部署所需的规格、目录、环境变量、secret、数据上传路径、首次部署顺序、DNS 切换和 smoke test 固化成可执行清单。

成功标准：

1. VPS 购买和系统版本有明确建议。
2. 新 VPS 上的目录、env、volume、artifact 路径可以直接按文档准备。
3. 首次部署顺序覆盖 baseline migration、产品域导入、URL rewrite、post-import safety cleanup、validation、Meilisearch rebuild。
4. 明确禁止复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。

## 前置假设

- Phase 11 只做部署前准备，不连接任何服务器。
- 源项目 `/Volumes/1T/test/11/findsspreadsheet.com` 继续只读。
- 新项目工作目录是 `/Volumes/1T/lolobuyspreadsheets.com`。
- 新 VPS 尚未购买，本文中的服务器路径和域名是部署目标设计，不代表已经存在。
- 首版继续使用现有普通外部商品图片 URL；只重写旧 `api.findsindex.com/uploads/...` 到新站 uploads URL。
- 首版必须开启视觉搜索，因此新 VPS 需要运行 embedding service，并保留 `VISUAL_SEARCH_UPLOAD_ENABLED=true`。
- 当前 `docker-compose.yml` 偏本地 infra 形态，生产部署前需要补齐或另建生产 compose，将 API/Web/infra/embedding/Meilisearch/uploads 统一纳入管理。

## 不确定点和取舍

- Web 生产部署方式有两种：同 VPS Docker 部署，或后续独立托管。为了第一版迁移闭环，建议先同 VPS 部署，减少 API/CORS/DNS 变量。
- uploads 首版建议用 VPS 本地 volume，原因是当前 artifact 是 `referenced-uploads.tar`，已有代码支持 `/app/uploads`。后续如果迁到对象存储，应单独开 Phase，不混入首次上线。
- Ubuntu 默认建议 24.04 LTS。Ubuntu 26.04 LTS 已进入 LTS 周期，但发布时间较新；如果 VPS 面板默认镜像和 Docker 生态验证充分，可以选 26.04 LTS，否则用 24.04 LTS 保守上线。

## VPS 购买规格建议

最低可用规格：

- CPU：4 vCPU
- 内存：8 GB
- 磁盘：160 GB NVMe SSD
- 带宽：按量或不限流量，至少 5 Mbps 稳定出口
- 系统盘快照：必须支持手动快照

推荐首版规格：

- CPU：8 vCPU
- 内存：16 GB
- 磁盘：300 GB NVMe SSD
- 带宽：10 Mbps 或以上
- 备份：每日快照或至少上线前手动快照

理由：

- Postgres 产品域数据约 33 万产品、167 万 SKU，并包含 image/text embeddings。
- Meilisearch 需要额外磁盘和内存。
- embedding service 同时加载 CLIP 512 维图片模型和 MiniLM 384 维文本模型，当前 compose 已为它预留 2-3 GB 内存。
- 首次导入、Meilisearch rebuild、视觉搜索 smoke test 会同时消耗 CPU、内存和磁盘 IO。

不建议：

- 2 GB 或 4 GB 内存小机器。
- 磁盘低于 100 GB。
- 与旧站共用同一台 VPS。

## Ubuntu 版本建议

默认建议：

- `Ubuntu Server 24.04 LTS`
- 原因：LTS、成熟、Docker/compose 支持稳定，标准安全维护到 2029 年 5 月。

可选：

- `Ubuntu Server 26.04 LTS`
- 使用条件：VPS 商家已提供稳定镜像，Docker Engine、Compose plugin、pgvector 镜像、Meilisearch 镜像、Node 20 镜像拉取和运行都验证正常。
- 官方 LTS 标准安全维护到 2031 年 5 月。

不建议：

- 非 LTS 版本。
- 桌面版 Ubuntu。
- 旧版 Ubuntu 20.04 或更早版本。

## 新 VPS 目录结构

建议统一放在 `/opt/lolobuyspreadsheets`：

```text
/opt/lolobuyspreadsheets/
  app/
    repo/                         # Git checkout: cpf1236/lolobuyspreadsheets.com
    releases/                     # 可选：后续按 commit/tag 发布
  env/
    api.env                       # API 生产 env，不提交 Git
    web.env                       # Web 生产 env，不提交 Git
    compose.env                   # Docker Compose 生产变量，不提交 Git
  data/
    postgres/                     # Docker named volume 或 bind mount 二选一
    redis/
    meilisearch/
    uploads/                      # API /app/uploads 挂载点
    hf-cache/                     # embedding service HuggingFace cache
  imports/
    product-domain/
      lolobuy-product-domain-data.sql
    uploads/
      referenced-uploads.tar
    logs/
      import-YYYYMMDD-HHMMSS.log
      validation-YYYYMMDD-HHMMSS.log
  backups/
    pre-import/
    pre-dns-cutover/
  scripts/
    first-deploy.sh               # 可选：人工确认后再脚本化
```

权限建议：

- `env/` 只允许 deploy 用户读取：`chmod 700 /opt/lolobuyspreadsheets/env`。
- `imports/` 和 `backups/` 不对公网暴露。
- `data/uploads/` 挂载到 API 容器 `/app/uploads`。

## 生产 .env 模板

以下是模板，不包含真实 secret。生产值必须在新 VPS 上重新生成或从新服务控制台获取。

### API env：`/opt/lolobuyspreadsheets/env/api.env`

```dotenv
NODE_ENV=production
PORT=4101

DB_HOST=postgres
DB_PORT=5432
DB_USER=lolobuy
DB_PASSWORD=<NEW_POSTGRES_PASSWORD>
DB_NAME=lolobuyspreadsheets_prod
DB_SSL=false

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<NEW_REDIS_PASSWORD>

JWT_SECRET=<NEW_JWT_SECRET>
JWT_ACCESS_EXPIRATION=2h
JWT_REFRESH_EXPIRATION_DAYS=30
OAUTH_ENCRYPTION_KEY=<NEW_OAUTH_ENCRYPTION_KEY>

QWEN_API_KEY=<NEW_QWEN_API_KEY>
QWEN_API_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

RESEND_API_KEY=<NEW_RESEND_API_KEY>
EMAIL_FROM=noreply@lolobuyspreadsheets.com

FRONTEND_URL=https://lolobuyspreadsheets.com
SITE_URL=https://lolobuyspreadsheets.com
TRAFFIC_INTERNAL_DOMAINS=lolobuyspreadsheets.com,www.lolobuyspreadsheets.com,api.lolobuyspreadsheets.com
TRAFFIC_OWNED_DOMAINS=

REVALIDATE_SECRET=<NEW_REVALIDATE_SECRET>
CORS_ORIGIN=https://lolobuyspreadsheets.com,https://www.lolobuyspreadsheets.com

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://api.lolobuyspreadsheets.com/auth/google/callback

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=https://api.lolobuyspreadsheets.com/auth/discord/callback

API_URL=https://api.lolobuyspreadsheets.com
UPLOADS_PATH=/app/uploads

MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=<NEW_MEILISEARCH_MASTER_KEY>
SEARCH_ENGINE=meilisearch

EMBEDDING_SERVICE_URL=http://embedding-service:8001
VISUAL_SEARCH_UPLOAD_ENABLED=true

MAX_LOGIN_ATTEMPTS=5
LOCK_DURATION_MINUTES=30
```

### Web env：`/opt/lolobuyspreadsheets/env/web.env`

变量名按当前 `apps/web` 代码只读审计结果整理。生产部署前仍需在 Phase 12 对最终 compose 和 build 环境复核一次。

```dotenv
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.lolobuyspreadsheets.com
NEXT_PUBLIC_API_HOSTNAME=api.lolobuyspreadsheets.com
NEXT_PUBLIC_APP_URL=https://lolobuyspreadsheets.com
NEXT_PUBLIC_SITE_URL=https://lolobuyspreadsheets.com
NEXT_PUBLIC_SITE_NAME=LoloBuySpreadsheets
NEXT_PUBLIC_APP_NAME=LoloBuySpreadsheets
NEXT_PUBLIC_CONTACT_EMAIL=support@lolobuyspreadsheets.com
NEXT_PUBLIC_PRIVACY_EMAIL=privacy@lolobuyspreadsheets.com
NEXT_PUBLIC_LEGAL_EMAIL=legal@lolobuyspreadsheets.com
NEXT_PUBLIC_CDN_WEBP=true
LEGACY_SITE_URLS=
REVALIDATE_SECRET=<SAME_AS_API_REVALIDATE_SECRET>
REFERRAL_TRACKING_SECRET=<NEW_REFERRAL_TRACKING_SECRET_OR_EMPTY_IF_DISABLED>
```

### Compose env：`/opt/lolobuyspreadsheets/env/compose.env`

```dotenv
COMPOSE_PROJECT_NAME=lolobuyspreadsheets

POSTGRES_USER=lolobuy
POSTGRES_PASSWORD=<NEW_POSTGRES_PASSWORD>
POSTGRES_DB=lolobuyspreadsheets_prod

REDIS_PASSWORD=<NEW_REDIS_PASSWORD>

DB_PORT=127.0.0.1:5432
REDIS_PORT=127.0.0.1:6379
MEILISEARCH_PORT=127.0.0.1:7700
EMBEDDING_SERVICE_PORT=127.0.0.1:8001

MEILISEARCH_API_KEY=<NEW_MEILISEARCH_MASTER_KEY>
MEILI_ENV=production

API_PUBLIC_PORT=127.0.0.1:4101
WEB_PUBLIC_PORT=127.0.0.1:3101
UPLOADS_HOST_PATH=/opt/lolobuyspreadsheets/data/uploads
HF_CACHE_HOST_PATH=/opt/lolobuyspreadsheets/data/hf-cache
```

注意：生产 compose 不应把 Postgres、Redis、Meilisearch、embedding service 直接暴露到公网；只绑定 `127.0.0.1` 或 Docker internal network。

生产 compose 补齐前必须复核：

- API 容器监听端口与 `PORT=4101` 一致。
- API healthcheck 使用真实监听端口。当前 `apps/api/Dockerfile` 里 `EXPOSE 4000` 与 healthcheck `http://localhost:4100/health` 和应用默认 `4101` 不一致，Phase 12 创建生产 compose 或修 Dockerfile 时必须处理。
- Web build 阶段能拿到 `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_SITE_URL` 等 build-time env。

## 必须新生成的 secret 清单

必须新生成：

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `OAUTH_ENCRYPTION_KEY`
- `REVALIDATE_SECRET`
- `REFERRAL_TRACKING_SECRET`，如果保留 `/r/{code}` 跳转签名逻辑
- `MEILISEARCH_API_KEY`
- `QWEN_API_KEY`
- `RESEND_API_KEY`
- OAuth client secrets，如果启用 Google/Discord 登录
- Caddy/反代相关的 basic auth 或管理 token，如果后续需要
- GitHub deploy token 或 GHCR token，如果生产拉私有镜像

生成建议：

```bash
openssl rand -base64 32
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

禁止：

- 复用旧项目 `.env`。
- 复用旧 DB、旧 Redis、旧 Meilisearch 密码。
- 复用旧 GitHub Actions secrets。
- 把真实 secret 写入 Git、Markdown、issue、聊天记录或截图。

## Docker Compose 生产变量清单

生产 compose 至少需要这些变量：

| 变量 | 用途 | 要求 |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | 容器/volume/network 前缀 | 固定为 `lolobuyspreadsheets` |
| `POSTGRES_USER` | Postgres 用户 | 新用户，不用旧站值 |
| `POSTGRES_PASSWORD` | Postgres 密码 | 新生成 |
| `POSTGRES_DB` | Postgres 数据库 | `lolobuyspreadsheets_prod` |
| `REDIS_PASSWORD` | Redis 密码 | 新生成，生产必须设置 |
| `MEILISEARCH_API_KEY` | Meilisearch master key | 新生成 |
| `MEILI_ENV` | Meilisearch 环境 | `production` |
| `DB_PORT` | 宿主机 DB 绑定 | 只绑 `127.0.0.1` |
| `REDIS_PORT` | 宿主机 Redis 绑定 | 只绑 `127.0.0.1` |
| `MEILISEARCH_PORT` | 宿主机 Meili 绑定 | 只绑 `127.0.0.1` |
| `EMBEDDING_SERVICE_PORT` | embedding service 绑定 | 只绑 `127.0.0.1` |
| `API_PUBLIC_PORT` | API 反代端口 | 只绑 `127.0.0.1` |
| `WEB_PUBLIC_PORT` | Web 反代端口 | 只绑 `127.0.0.1` |
| `UPLOADS_HOST_PATH` | uploads volume host path | `/opt/lolobuyspreadsheets/data/uploads` |
| `HF_CACHE_HOST_PATH` | 模型缓存 host path | `/opt/lolobuyspreadsheets/data/hf-cache` |

## uploads volume 方案

首版方案：

- 宿主机目录：`/opt/lolobuyspreadsheets/data/uploads`
- API 容器挂载：`/app/uploads`
- API env：`UPLOADS_PATH=/app/uploads`
- 公开访问：通过 API 服务和反代暴露 `https://api.lolobuyspreadsheets.com/uploads/...`

初始化顺序：

```bash
mkdir -p /opt/lolobuyspreadsheets/data/uploads
tar -xf /opt/lolobuyspreadsheets/imports/uploads/referenced-uploads.tar \
  -C /opt/lolobuyspreadsheets/data/uploads
```

验证：

- 文件数量与 artifact manifest 对齐。
- 已知 4 个缺失品牌 Logo 在上线前选择处理：替换、清空或恢复。
- 浏览器能直接访问抽样 `https://api.lolobuyspreadsheets.com/uploads/...`。

不做：

- 不把普通外部商品图片下载到本地。
- 不在首版引入对象存储迁移。
- 不重写非 `api.findsindex.com/uploads/...` 的商品图片 URL。

## dump 和 referenced uploads 上传路径

本地源文件：

- `migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql`
- `migration-artifacts/uploads-referenced/referenced-uploads.tar`

新 VPS 目标路径：

```text
/opt/lolobuyspreadsheets/imports/product-domain/lolobuy-product-domain-data.sql
/opt/lolobuyspreadsheets/imports/uploads/referenced-uploads.tar
```

建议上传后校验：

```bash
sha256sum /opt/lolobuyspreadsheets/imports/product-domain/lolobuy-product-domain-data.sql
sha256sum /opt/lolobuyspreadsheets/imports/uploads/referenced-uploads.tar
ls -lh /opt/lolobuyspreadsheets/imports/product-domain/
ls -lh /opt/lolobuyspreadsheets/imports/uploads/
```

## 新 VPS 首次部署命令顺序

以下命令是顺序草案，购买 VPS 后需要按实际生产 compose 文件名微调。

### 1. 系统基础准备

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw jq htop postgresql-client
```

安装 Docker Engine 和 Compose plugin 后验证：

```bash
docker version
docker compose version
```

### 2. 创建目录和 deploy 用户

```bash
sudo mkdir -p /opt/lolobuyspreadsheets/{app,env,data,imports,backups,scripts}
sudo mkdir -p /opt/lolobuyspreadsheets/data/{uploads,hf-cache}
sudo mkdir -p /opt/lolobuyspreadsheets/imports/{product-domain,uploads,logs}
sudo chmod 700 /opt/lolobuyspreadsheets/env
```

### 3. 拉取新仓库

```bash
cd /opt/lolobuyspreadsheets/app
git clone https://github.com/cpf1236/lolobuyspreadsheets.com repo
cd repo
git rev-parse --short HEAD
```

要求：

- remote 使用 HTTPS。
- 不配置旧 SSH key。
- 不复制旧项目 `.env`。

### 4. 写入新生产 env

```bash
sudo install -m 600 /dev/null /opt/lolobuyspreadsheets/env/api.env
sudo install -m 600 /dev/null /opt/lolobuyspreadsheets/env/web.env
sudo install -m 600 /dev/null /opt/lolobuyspreadsheets/env/compose.env
```

人工填入 Phase 11 模板中的新值。

### 5. 启动基础服务

```bash
cd /opt/lolobuyspreadsheets/app/repo
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml up -d postgres redis meilisearch embedding-service
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml ps
```

验证：

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml exec postgres pg_isready -U lolobuy -d lolobuyspreadsheets_prod
curl -fsS http://127.0.0.1:7700/health
curl -fsS http://127.0.0.1:8001/health
```

### 6. 运行 baseline migration

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml run --rm api pnpm migration:run
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml run --rm api pnpm migration:show
```

要求：

- 只执行 baseline migrations。
- 不运行旧历史 migrations。
- 不运行 seed/reset/cleanup/delete。

### 7. 上传并导入产品域 dump

确认文件已经存在：

```bash
ls -lh /opt/lolobuyspreadsheets/imports/product-domain/lolobuy-product-domain-data.sql
```

导入：

```bash
psql "$NEW_PRODUCTION_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f /opt/lolobuyspreadsheets/imports/product-domain/lolobuy-product-domain-data.sql \
  2>&1 | tee /opt/lolobuyspreadsheets/imports/logs/import-$(date +%Y%m%d-%H%M%S).log
```

### 8. 解压 referenced uploads

```bash
tar -xf /opt/lolobuyspreadsheets/imports/uploads/referenced-uploads.tar \
  -C /opt/lolobuyspreadsheets/data/uploads
```

### 9. 执行 URL rewrite

```bash
cd /opt/lolobuyspreadsheets/app/repo
psql "$NEW_PRODUCTION_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v new_upload_base='https://api.lolobuyspreadsheets.com/uploads/' \
  -f migration-artifacts/product-domain-import/sql/10-rewrite-upload-urls.sql
```

### 10. 执行 post-import safety cleanup

```bash
psql "$NEW_PRODUCTION_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v new_upload_base='https://api.lolobuyspreadsheets.com/uploads/' \
  -f migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql
```

### 11. 运行 post-import validation

```bash
psql "$NEW_PRODUCTION_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f migration-artifacts/product-domain-import/sql/20-post-import-validation.sql \
  2>&1 | tee /opt/lolobuyspreadsheets/imports/logs/validation-$(date +%Y%m%d-%H%M%S).log
```

必须确认：

- 产品域表行数与 README expected counts 对齐。
- excluded runtime/user/referral/click/traffic/points/job tables 为空，或只有 smoke test 产生的新本地运行记录。
- `settings` 没有 bulk copy 旧数据。
- `api.findsindex.com/uploads/` 残留为 0。
- `localhost:4100/uploads/` 残留为 0。
- `platforms.inviteCode` 非空数量为 0。
- 硬编码旧 invite/ref 参数数量为 0。

### 12. 启动 API 和 Web

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml up -d api web
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml ps
```

验证：

```bash
curl -fsS http://127.0.0.1:4101/health
curl -fsS http://127.0.0.1:3101/
```

### 13. 重建 Meilisearch

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env -f docker-compose.prod.yml exec api \
  npx ts-node -r tsconfig-paths/register scripts/ops/meilisearch-sync.ts
```

验证：

- Meilisearch document count 与 active products 对齐。
- `SEARCH_ENGINE=meilisearch` 生效。
- 普通搜索返回数据。

### 14. 配置反代和 TLS

此处只允许新写配置，不复制旧 Caddy 生产配置。

建议域名：

- `lolobuyspreadsheets.com` → Web
- `www.lolobuyspreadsheets.com` → Web
- `api.lolobuyspreadsheets.com` → API

上线前先用临时 hosts 或临时子域名验证，避免过早切主域 DNS。

## 数据初始化严格顺序

必须按以下顺序执行：

1. 新 VPS 基础服务启动：Postgres、Redis、Meilisearch、embedding service。
2. baseline migration 初始化空库 schema。
3. 产品域 dump 导入。
4. 解压 `referenced-uploads.tar` 到 uploads volume。
5. 执行 `10-rewrite-upload-urls.sql`，只重写旧 `api.findsindex.com/uploads/...`。
6. 执行 `30-post-import-safety-cleanup.sql`。
7. 执行 `20-post-import-validation.sql`。
8. 启动 API/Web。
9. Meilisearch full rebuild。
10. 普通搜索和视觉搜索 smoke test。
11. 选择性重建安全 `settings`。
12. DNS 切换。

不允许跳过：

- baseline migration
- URL rewrite
- post-import safety cleanup
- post-import validation
- Meilisearch rebuild
- 视觉搜索 smoke test

## DNS 切换计划

### 切换前 24 小时

- 降低旧 DNS TTL 到 300 秒。
- 新 VPS 完成服务启动、导入、validation、Meilisearch rebuild。
- 使用临时域名或本机 hosts 验证 Web/API。
- 确认 TLS 证书可签发。
- 创建上线前快照：VPS 快照、Postgres dump、uploads 文件清单。

### 切换窗口

建议选择低流量时段。

步骤：

1. 暂停会写入旧站业务数据的操作，避免用户/日志数据误以为要迁移。
2. 确认新站 health、搜索、视觉搜索通过。
3. 修改 DNS：
   - `A lolobuyspreadsheets.com -> 新 VPS IP`
   - `A www.lolobuyspreadsheets.com -> 新 VPS IP`
   - `A api.lolobuyspreadsheets.com -> 新 VPS IP`
4. 观察 DNS 生效：
   - `dig +short lolobuyspreadsheets.com`
   - `dig +short api.lolobuyspreadsheets.com`
5. 通过公网域名跑 smoke test。

### 切换后 2 小时

- 观察 API logs。
- 观察 Web logs。
- 检查错误率、慢请求、容器重启。
- 抽样搜索和产品详情。
- 确认视觉搜索上传和 by-product 两条路径可用。

回滚原则：

- 如果 API 或 Web 无法稳定响应，先把 DNS 切回旧目标。
- 不把新站新增 runtime 数据反向写回旧站。
- 记录失败点，再从新 VPS 修复后重新切换。

## 上线前 smoke test 清单

API：

- `GET https://api.lolobuyspreadsheets.com/health`
- `GET https://api.lolobuyspreadsheets.com/products/search?q=nike&limit=5`
- `GET https://api.lolobuyspreadsheets.com/products/facets?q=nike`
- `GET https://api.lolobuyspreadsheets.com/visual-search/status`
- `GET https://api.lolobuyspreadsheets.com/visual-search/by-product/<productId>?limit=5`
- `POST https://api.lolobuyspreadsheets.com/visual-search/search` 上传 `image/webp` 或 `image/jpeg`
- 抽样访问 `https://api.lolobuyspreadsheets.com/uploads/<path>`

Web：

- `https://lolobuyspreadsheets.com/`
- `https://lolobuyspreadsheets.com/en/search?q=nike`
- 产品详情页抽样 3 个。
- 品牌页抽样：`/en/brands/a-bathing-ape`
- 平台选择器 Logo 没有坏图。
- 移动端视觉搜索入口可打开。
- by-product 视觉搜索能返回相似商品。
- 图片上传视觉搜索能返回相似商品。
- 登录/注册入口能打开，但不要求迁移旧用户。
- Account 下 Favorites、Browsing History、Referral、Points 等空态正常，不显示旧用户数据。

数据：

- `products=331776`
- `active products` 与 Meilisearch document count 对齐。
- `skus=1672709`
- `platforms=11`
- `product_image_embeddings=331776`
- `product_text_embeddings=331776`
- `api.findsindex.com/uploads/` 残留为 0。
- `localhost:4100/uploads/` 残留为 0。
- excluded runtime/user/referral/click/traffic/points/job 表没有旧导入数据。
- `settings` 只包含新站选择性重建的安全 key。

安全：

- Postgres/Redis/Meilisearch/embedding service 不对公网开放。
- API/Web 只通过反代公开。
- CORS 只允许新站域名。
- `SEARCH_ENGINE=meilisearch`。
- `VISUAL_SEARCH_UPLOAD_ENABLED=true`。
- Secret 不在 Git、日志、Markdown、终端截图中泄露。

## 明确禁止项

- 不复制旧 VPS 配置。
- 不复制旧 SSH key、SSH config、IP、key path。
- 不复制旧 GitHub Actions secrets。
- 不复制旧 Caddy 生产配置。
- 不连接旧生产 DB。
- 不在新项目窗口运行旧项目 migration/seed/reset/cleanup/delete。
- 不导入 users/favorites/browsing/referral/session/search/click/traffic/points/job 数据。
- 不 bulk copy `settings`。
- 不复用旧 DB、旧 Redis、旧 Meilisearch、旧 `COMPOSE_PROJECT_NAME`。
- 不把普通外部商品图片 URL 改成本地 uploads。
- 不把新 VPS 和旧站放进同一个 Docker compose project。

## Phase 11 完成后下一步

购买 VPS 后，先不要直接切 DNS。建议下一阶段是 Phase 12：

1. 在新 VPS 创建目录、env 和生产 compose。
2. 空库跑 baseline migration。
3. 上传 artifact 并按本文顺序导入。
4. 完成 validation、Meilisearch rebuild 和公网前 smoke test。
5. 生成上线前检查报告，再决定 DNS 切换。
