# LoloBuySpreadsheets 新 VPS 部署事实表

日期：2026-07-01

## 目标

把 LoloBuySpreadsheets 新生产 VPS 的身份信息和部署边界单独记录，避免后续和旧项目、其他项目、旧 VPS、旧 SSH key 或旧部署配置混淆。

成功标准：

1. 能明确识别这台机器只属于 `lolobuyspreadsheets.com`。
2. 能明确区分新 VPS、Vercel Web、旧项目和本地开发环境。
3. 不记录真实 password、token、private key 内容、旧服务器 IP 或旧部署 secret。

## 已确认的新 VPS 身份

| 项目 | 值 |
| --- | --- |
| 项目 | LoloBuySpreadsheets |
| 仓库 | `https://github.com/cpf1236/lolobuyspreadsheets.com` |
| 新项目本地目录 | `/Volumes/1T/lolobuyspreadsheets.com` |
| 云厂商 | 腾讯云轻量应用服务器 |
| 实例名称 | `lolobuyspreadsheets.com` |
| 实例 ID | `lhins-4y93v9pn` |
| 公网 IPv4 | `43.165.1.148` |
| 地域 | 法兰克福 |
| 可用区 | 法兰克福二区 |
| 操作系统 | Ubuntu 24.04 LTS |
| CPU | 4 核 |
| 内存 | 8 GB |
| 系统盘 | 120 GB SSD 云硬盘 |
| 公网带宽 | 200 Mbps 峰值带宽 |
| 到期时间 | 2026-08-01 17:12:54 |

## SSH 登录事实

腾讯云 SSH 密钥名称：

```text
lolobuyprod
```

本机新生成的 SSH 私钥路径：

```text
/Users/chenpeifeng/.ssh/lolobuy-prod-2026-07
```

本机公钥路径：

```text
/Users/chenpeifeng/.ssh/lolobuy-prod-2026-07.pub
```

SSH key fingerprint：

```text
SHA256:DyQcYm1n7XjZ5guvHldXMkTLe0Kfih7ZhI3A60jPqiw
```

SSH key comment：

```text
lolobuy-prod-2026-07
```

后续连接命令模板：

```bash
ssh -i /Users/chenpeifeng/.ssh/lolobuy-prod-2026-07 ubuntu@43.165.1.148
```

说明：

- 腾讯云控制台里的密钥名称是 `lolobuyprod`。
- 本机私钥文件名保留为 `lolobuy-prod-2026-07`。
- 两者名字不一致没有问题；真正匹配关系由公钥内容和私钥决定。
- 不把私钥内容写进 Git、文档、聊天记录或服务器文件。

## 部署拓扑

首版生产拓扑沿用旧项目形态，但所有资源必须是新项目专用：

| 层 | 部署位置 | 说明 |
| --- | --- | --- |
| Web 前端 | Vercel | `apps/web`，Root Directory 使用 `apps/web` |
| API 后端 | 新 VPS | Node API，公网通过反代暴露 |
| Postgres | 新 VPS | 新数据库，不连接旧生产 DB |
| Redis | 新 VPS | 新 Redis，不复用旧实例 |
| Meilisearch | 新 VPS | 新 Meilisearch，首次导入后全量 rebuild |
| embedding service | 新 VPS | 首版必须启用视觉搜索 |
| uploads | 新 VPS | 首版使用 VPS 本地 volume |
| 反代/TLS | 新 VPS | 只为 API/uploads 服务，不复制旧 Caddy 生产配置 |

生产 `COMPOSE_PROJECT_NAME`：

```text
lolobuyspreadsheets
```

建议 VPS 项目根目录：

```text
/opt/lolobuyspreadsheets
```

## Artifact 上传路径

产品域 dump 目标路径：

```text
/opt/lolobuyspreadsheets/imports/product-domain/lolobuy-product-domain-data.sql
```

referenced uploads tar 目标路径：

```text
/opt/lolobuyspreadsheets/imports/uploads/referenced-uploads.tar
```

uploads volume 目标路径：

```text
/opt/lolobuyspreadsheets/data/uploads
```

API 容器内挂载点：

```text
/app/uploads
```

## GitHub 部署读取方式

生产 VPS 使用 GitHub repository Deploy Key 只读拉取私有仓库，不使用旧项目 GitHub Actions secrets，不使用个人 SSH key，不把 GitHub token 写入 VPS env。

Deploy Key 事实：

| 项目 | 值 |
| --- | --- |
| GitHub Deploy Key title | `lolobuyspreadsheets-vps-43.165.1.148-readonly-2026-07` |
| GitHub Deploy Key ID | `156050576` |
| 权限 | Read-only |
| VPS 私钥路径 | `/home/ubuntu/.ssh/lolobuyspreadsheets_github_deploy` |
| VPS SSH alias | `github.com-lolobuyspreadsheets` |
| 仓库 remote | `git@github.com-lolobuyspreadsheets:cpf1236/lolobuyspreadsheets.com.git` |
| VPS repo 路径 | `/opt/lolobuyspreadsheets/app/repo` |

验证结果：

- GitHub SSH auth 返回 `Hi cpf1236/lolobuyspreadsheets.com! You've successfully authenticated, but GitHub does not provide shell access.`
- `git ls-remote` 能读取 `HEAD`。
- `/opt/lolobuyspreadsheets/app/repo` 已从一次性 `git archive` 目录切换为正式 Git clone。
- 当前 clone revision：`ce37214 docs: record phase 16 vps product import`。
- clone 后未发现 `.env`、`.env.local`、`.env.production`。

## 当前 VPS 服务状态

截至 2026-07-01，Phase 17 已启动并验证以下服务：

| 服务 | 状态 | 端口绑定 |
| --- | --- | --- |
| Postgres | healthy | `127.0.0.1:5432->5432/tcp` |
| Redis | healthy | `127.0.0.1:6379->6379/tcp` |
| Meilisearch | healthy | `127.0.0.1:7700->7700/tcp` |
| embedding service | healthy | `127.0.0.1:8001->8001/tcp` |
| API | healthy | `127.0.0.1:4101->4101/tcp` |
| Caddy | active | `*:80`, `*:443` |

已执行：

- baseline migration
- `settings` 默认 key 安全重建
- 产品域导入
- uploads 解压
- URL rewrite
- post-import safety cleanup
- validation SQL
- Meilisearch 产品索引 rebuild
- API HTTP-only 反代准备

Phase 16 关键结果：

| 项 | 值 |
| --- | ---: |
| `products` | 331776 |
| active products | 331770 |
| draft products | 6 |
| `skus` | 1672709 |
| `product_image_embeddings` | 331776 |
| `product_text_embeddings` | 331776 |
| Meilisearch documents | 331770 |
| Meilisearch `isIndexing` | false |
| uploads files | 881 |
| old uploads URL residues | 0 |
| `platforms.inviteCode` non-empty | 0 |
| imported `users` | 0 |

已执行：

- Vercel 生产部署

Phase 17 反代状态：

- Caddy 已安装：`2.6.2`。
- `api.lolobuyspreadsheets.com` 已解析到 `43.165.1.148`。
- 当前 `/etc/caddy/Caddyfile` 为生产 HTTPS 配置。
- Let’s Encrypt 证书已签发成功。
- HTTP 会自动跳转到 HTTPS。
- API 生产入口为 `https://api.lolobuyspreadsheets.com`。
- API 仍反代到 `127.0.0.1:4101`，Postgres、Redis、Meilisearch、embedding service 未公网暴露。

Phase 17 HTTPS smoke test：

| 检查项 | 结果 |
| --- | --- |
| API health | `status=ok`, `database=ok` |
| 普通搜索 | `q=nike`, `total=2` |
| 视觉搜索状态 | `available=true`, `coverage=100` |
| uploads 静态文件 | `HTTP/2 200` |

Phase 18 Vercel Web 状态：

| 项 | 值 |
| --- | --- |
| Vercel Team | `cpf1236's projects` |
| Vercel Team ID | `team_nbsiCxihYzaUdImbLC4Mdxz7` |
| Vercel Project | `lolobuyspreadsheets-com` |
| Vercel Project ID | `prj_s02wzyoO9hLVQuABSVFdwjLQ7k2S` |
| Root Directory | `apps/web` |
| Framework | `nextjs` |
| Node.js | `24.x` |
| Build Command | `pnpm build` |
| Install Command | `pnpm install --frozen-lockfile` |
| Deployment ID | `dpl_8KEBAhAW4TzisPhKVGdj5A7oaDSR` |
| Production alias | `https://lolobuyspreadsheets-com.vercel.app` |
| State | `READY` |
| Commit | `454e7c1 docs: record api https activation` |

Vercel Web env 只记录 key 名称：

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_HOSTNAME`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_PRIVACY_EMAIL`
- `NEXT_PUBLIC_LEGAL_EMAIL`
- `NEXT_PUBLIC_CDN_WEBP`
- `REVALIDATE_SECRET`

Phase 18 smoke test：

| 检查项 | 结果 |
| --- | --- |
| 首页 | `https://lolobuyspreadsheets-com.vercel.app/en` 正常渲染 |
| 首页图片 | 65 张图片，坏图 0 |
| 普通搜索 | `q=nike`, `15866 products found` |
| 搜索页图片 | 20 张图片，坏图 0 |
| Vercel 搜索页 HTTP | `HTTP/2 200` |
| 视觉搜索 API | `available=true`, `coverage=100` |
| 视觉搜索 UI | 弹窗正常出现，上传 input 可用 |
| Vercel runtime error logs | 最近 15 分钟无 error logs |

尚未绑定：

- `lolobuyspreadsheets.com`
- `www.lolobuyspreadsheets.com`

后续 VPS 拉取更新命令：

```bash
cd /opt/lolobuyspreadsheets/app/repo
git fetch --prune origin
git checkout main
git pull --ff-only origin main
```

说明：

- Deploy Key 私钥只存在于新 VPS 的 `ubuntu` 用户目录。
- 不把 Deploy Key 私钥内容写进 Git、文档、聊天记录或本机项目。
- 如果未来改成 GHCR 镜像部署，应另开 Phase，使用新仓库、新镜像名、新 token，不复用旧项目 secret。

## 后续执行边界

首次连接新 VPS 前，只做文档和本地准备。

拿到连接权限后的第一步必须是只读检查：

```bash
hostname
lsb_release -a
uname -a
df -h
free -h
```

首次部署顺序仍按 Phase 11/Phase 10 runbook 执行：

1. 初始化新 VPS 目录和基础依赖。
2. 准备新的生产 `.env`、新 DB、新 Redis、新 Meilisearch、新 `COMPOSE_PROJECT_NAME`。
3. 启动 Postgres、Redis、Meilisearch、embedding service、API。
4. 空库执行 baseline migration。
5. 上传并导入产品域 dump。
6. 解压 `referenced-uploads.tar` 到 uploads volume。
7. 执行 upload URL rewrite。
8. 执行 post-import safety cleanup。
9. 执行 validation SQL。
10. 全量 rebuild Meilisearch。
11. 跑 API、普通搜索、视觉搜索 smoke test。
12. Vercel 配置 Web 生产环境变量。
13. 通过临时域名或 hosts 验证后再切 DNS。

## 禁止项

- 不记录或复制腾讯云控制台密码、VNC 密码、OrcaTerm 免密信息。
- 不复制旧 VPS IP。
- 不复制旧 SSH alias。
- 不复制旧 SSH key path。
- 不复制旧私钥、公钥、known_hosts 绑定。
- 不复制旧 GitHub Actions secrets。
- 不复制旧 Caddy 生产配置。
- 不连接旧生产 DB。
- 不运行旧项目 migration、seed、reset、cleanup、delete。
- 不导入 users、favorites、browsing、referral、session、search、click、traffic、points、job 数据。
- 不 bulk copy 旧 `settings`。
- 不把新 VPS 和旧项目放进同一个 Docker Compose project。

## 关联文档

- `Docs/03-Planning/lolobuyspreadsheets-phase-11-new-vps-preparation.md`
- `Docs/03-Planning/lolobuyspreadsheets-phase-10-new-vps-import-runbook.md`
- `Docs/03-Planning/lolobuyspreadsheets-phase-18-vercel-frontend-deployment-report.md`
- `migration-artifacts/product-domain-import/README.md`
- `migration-artifacts/product-domain-import/sql/10-rewrite-upload-urls.sql`
- `migration-artifacts/product-domain-import/sql/20-post-import-validation.sql`
- `migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql`
