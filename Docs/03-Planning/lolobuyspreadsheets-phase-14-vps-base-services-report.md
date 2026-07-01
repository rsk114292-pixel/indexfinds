# LoloBuySpreadsheets Phase 14 VPS 基础服务启动报告

日期：2026-07-01

## 目标

在不启动 API、不运行 migration、不导入数据、不切 DNS、不部署 Vercel 的前提下，只启动并验证新 VPS 上的基础服务：

- Postgres
- Redis
- Meilisearch

成功标准：

1. 三个基础容器均为 healthy。
2. 三个基础服务只绑定 `127.0.0.1`，不直接公网暴露。
3. Postgres 手动健康检查通过。
4. Redis 手动 `PING` 通过。
5. Meilisearch `/health` 返回 available。
6. 当前只运行基础容器，不运行 API 或 embedding service。
7. 不输出、不记录任何真实 secret。

## 执行边界

- 只连接新 VPS：`43.165.1.148`。
- 不连接旧 VPS。
- 不连接旧生产 DB。
- 不运行旧项目 migration、seed、reset、cleanup、delete。
- 不导入 users、favorites、browsing、referral、session、search、click、traffic、points、job 数据。
- 不复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。
- 不把真实 secret 写入 Git、Markdown、聊天记录或截图。

## Git revision

VPS repo 已更新到：

```text
07949c3 fix: expose redis password to prod healthcheck
```

说明：

- Phase 14 首次启动基础服务时，Postgres 和 Meilisearch 转为 healthy。
- Redis 长时间停留在 `health: starting`。
- 原因是 `redis-server --requirepass` 使用了 compose env 的 `REDIS_PASSWORD`，但 Redis 容器自身没有该环境变量，healthcheck 内的 `$REDIS_PASSWORD` 无法解析。
- 已做外科式修复：只在 `redis` service 增加 `REDIS_PASSWORD` environment 注入。

## 已启动服务

启动命令只指定基础服务：

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env \
  -f docker-compose.prod.yml \
  up -d postgres redis meilisearch
```

当前容器状态：

```text
lolobuyspreadsheets-meilisearch-1   Up 3 minutes (healthy)     127.0.0.1:7700->7700/tcp
lolobuyspreadsheets-postgres-1      Up 3 minutes (healthy)     127.0.0.1:5432->5432/tcp
lolobuyspreadsheets-redis-1         Up 36 seconds (healthy)    127.0.0.1:6379->6379/tcp
```

## 手动健康检查

Postgres：

```text
/var/run/postgresql:5432 - accepting connections
```

Redis：

```text
PONG
```

说明：`redis-cli` 输出了官方 CLI 的命令行密码使用 warning，但没有输出密码值。

Meilisearch：

```json
{"status":"available"}
```

## 端口暴露审计

监听端口：

```text
LISTEN 0 4096 127.0.0.1:7700 0.0.0.0:*
LISTEN 0 4096 127.0.0.1:6379 0.0.0.0:*
LISTEN 0 4096 127.0.0.1:5432 0.0.0.0:*
```

结论：

- Postgres 只绑定 VPS 本机。
- Redis 只绑定 VPS 本机。
- Meilisearch 只绑定 VPS 本机。
- 当前没有 API 或 embedding service 端口。

## 资源状态

磁盘：

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda2       118G  7.0G  107G   7% /
```

内存：

```text
Mem:   7.4Gi total, 758Mi used, 6.7Gi available
Swap:  1.9Gi total, 0B used
```

## 明确未执行

- 未启动 API。
- 未启动 embedding service。
- 未执行 baseline migration。
- 未上传产品域 dump。
- 未上传或解压 `referenced-uploads.tar`。
- 未执行 upload URL rewrite。
- 未执行 post-import safety cleanup。
- 未执行 validation SQL。
- 未 rebuild Meilisearch 产品索引。
- 未部署 Vercel 前端。
- 未切 DNS。

## 下一阶段建议

Phase 15 建议只推进 API/embedding 的构建与空库 baseline：

1. 构建并启动 embedding service。
2. 构建并启动 API。
3. 让 API 在空库上执行 baseline migration。
4. 验证 API 本机 `/health`。
5. 验证 baseline 表结构存在。
6. 仍不导入产品域数据、不切 DNS、不部署 Vercel 生产域名。
