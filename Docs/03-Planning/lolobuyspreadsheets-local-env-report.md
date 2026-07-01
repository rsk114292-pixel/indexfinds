# lolobuyspreadsheets.com 本地环境建立报告

> 日期：2026-06-30
> 阶段：Phase 4-5
> 状态：本地基础服务已启动并通过健康检查；Phase 5 baseline 已验证；API 验证后已停止

## 本次目标

建立新项目自己的本地环境文件和本地端口约定，确保后续启动服务时不会连接旧项目。

本次没有执行：

- Web 启动
- seed
- reset
- cleanup/delete
- 旧生产数据库连接
- 新 VPS 部署

## 新增本地环境文件

新增：

- `.env`
- `apps/api/.env.local`
- `apps/web/.env.local`

保留模板：

- `apps/api/.env.example`

未创建：

- `.env.production`
- `apps/api/.env.production`
- `apps/web/.env.production`

原因：新 VPS 和生产凭据还没有确定，不能提前写生产环境值。

## 本地端口约定

| 服务 | 本地地址 |
| --- | --- |
| Web | `http://localhost:3101` |
| API | `http://localhost:4101` |
| Postgres | `localhost:15432` |
| Redis | `localhost:16379` |
| Meilisearch | `http://localhost:17700` |
| Embedding Service | `http://localhost:18001` |

Docker 容器内部端口保持服务默认值，例如 embedding service 容器内部 healthcheck 仍检查 `localhost:8001`。这是容器内部端口，不是宿主机暴露端口。

## 新项目身份

已设置：

- `COMPOSE_PROJECT_NAME=lolobuyspreadsheets`
- `POSTGRES_DB=lolobuyspreadsheets_dev`
- `DB_NAME=lolobuyspreadsheets_dev`
- `lolobuyspreadsheets_postgres`
- `lolobuyspreadsheets_redis`
- `lolobuyspreadsheets_meilisearch`
- `lolobuyspreadsheets_embedding`
- `NEXT_PUBLIC_SITE_NAME=LoloBuySpreadsheets`
- `SITE_NAME=LoloBuySpreadsheets`

视觉搜索本地开关：

- `VISUAL_SEARCH_UPLOAD_ENABLED=true`
- `EMBEDDING_SERVICE_URL=http://localhost:18001`

## 同步修改

已同步新端口到：

- `start.command`
- `stop.command`
- `docker-compose.yml`
- `apps/api/.env.example`
- `apps/api/src/main.ts`
- API embedding/search 默认值
- Web API/site 默认值
- 相关测试 fixture

已删除复制带入的新项目副本运行产物：

- `apps/web/.vercel`
- `apps/web/.lighthouseci`
- `品牌图标/Nike Nike Benassi JDI Slide Sandals - CNY 99.00 _ FindsSpreadsheet.html`
- `品牌图标/Nike Nike Benassi JDI Slide Sandals - CNY 99.00 _ FindsSpreadsheet_files/`

## 验证结果

旧项目关键值扫描：

- 未发现 `finds_db`
- 未发现 `finds_postgres`
- 未发现 `finds_redis`
- 未发现 `finds_embedding`
- 未发现 `finds_meilisearch`
- 未发现 `findsindex`
- 未发现 `api.findsindex.com`
- 未发现 `findsspreadsheet.com`
- 未发现 `FindsSpreadsheet`
- 未发现旧 Vercel project/org ID

旧常用本地端口扫描：

- 未发现宿主机侧 `localhost:3000`
- 未发现宿主机侧 `localhost:4000`
- 未发现宿主机侧 `localhost:5432`
- 未发现宿主机侧 `localhost:6379`
- 未发现宿主机侧 `localhost:7700`

生成/平台状态目录扫描：

- 未发现 `.git`
- 未发现 `node_modules`
- 未发现 `.next`
- 未发现 `.vercel`
- 未发现 `.lighthouseci`

Docker Compose 配置验证：

- `docker compose --env-file .env config --services` 能解析服务：
  - `postgres`
  - `redis`
  - `embedding-service`
  - `meilisearch`

Compose 展开结果确认：

- project name: `lolobuyspreadsheets`
- Postgres published port: `15432`
- Redis published port: `16379`
- Meilisearch published port: `17700`
- Embedding service published port: `18001`
- volumes 使用 `lolobuyspreadsheets_*` 前缀

Phase 4 本地基础设施启动结果：

- 已启动服务：`postgres`、`redis`、`meilisearch`
- 未启动服务：API、Web、embedding service
- Postgres 容器：`lolobuyspreadsheets_postgres`
- Redis 容器：`lolobuyspreadsheets_redis`
- Meilisearch 容器：`lolobuyspreadsheets_meilisearch`
- Postgres 端口：`15432 -> 5432`
- Redis 端口：`16379 -> 6379`
- Meilisearch 端口：`17700 -> 7700`
- Postgres health：`/var/run/postgresql:5432 - accepting connections`
- Redis health：`PONG`
- Meilisearch health：`{"status":"available"}`

## 当前结论

Phase 4 已完成。

Phase 5 已完成 baseline 验证。详见：

- `Docs/03-Planning/lolobuyspreadsheets-schema-precheck-report.md`
- `Docs/03-Planning/lolobuyspreadsheets-schema-baseline-report.md`

Phase 5 仍然不允许连接旧生产数据库，不允许运行旧项目脚本，不允许导入用户、收藏、浏览记录、referral 数据。
