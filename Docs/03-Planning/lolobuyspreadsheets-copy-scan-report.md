# lolobuyspreadsheets.com 代码复制与旧信息扫描报告

> 日期：2026-06-30
> 阶段：Phase 1 / Phase 2
> 源项目：`/Volumes/1T/test/11/findsspreadsheet.com`
> 新项目：`/Volumes/1T/lolobuyspreadsheets.com`

## 本次目标

把旧项目源码复制到新项目目录，并在启动任何服务前清理会导致新项目连接旧项目的默认值和旧生产信息。

本次没有执行：

- 旧项目 migration
- 旧项目 seed
- 旧项目 reset
- 旧项目 cleanup/delete
- 旧生产数据库连接
- 新项目服务启动
- 新 VPS 部署

## 复制方式

使用 `rsync` 从源项目复制到新项目。

已排除：

- `.git`
- `node_modules`
- `.next`
- `.cache`
- `.pnpm-store`
- `.vercel`
- `.trae`
- `.claude`
- `.playwright-cli`
- `.mcp.json`
- `.env`
- `.env.*`
- 旧 `Docs`
- 导入终端记录
- 微店抓取参考文档
- `server-access-notes.md`
- `docker-compose.prod.yml`
- 旧 API deploy workflow
- 生产、Caddy、备份、检查类脚本
- `apps/*/.env`
- `apps/*/.env.*`

保留并补回：

- `apps/api/.env.example`

原因：新项目需要变量名模板，但不能复制旧项目实际环境文件。

## 已清理或替换的关键默认值

已替换为新项目默认值：

- `finds_db` -> `lolobuyspreadsheets_dev`
- `finds_postgres` -> `lolobuyspreadsheets_postgres`
- `finds_redis` -> `lolobuyspreadsheets_redis`
- `finds_embedding` -> `lolobuyspreadsheets_embedding`
- `finds_meilisearch` -> `lolobuyspreadsheets_meilisearch`
- `findsindex` -> `lolobuyspreadsheets`
- `findsspreadsheet.com` -> `lolobuyspreadsheets.com`
- `FindsSpreadsheet` -> `LoloBuySpreadsheets`

主要确认文件：

- `docker-compose.yml`
- `apps/api/.env.example`
- `apps/api/data-source.ts`
- `apps/api/src/app.module.ts`
- `scripts/enable-pgvector.sh`
- `scripts/run-embedding-migration.sh`
- API scripts/seeds 中的默认 DB fallback
- Web/API 测试里的旧域名 fixture

## 扫描结果

实际环境文件扫描：

- 只发现 `apps/api/.env.example`
- 未发现旧 `.env`、`.env.local`、`.env.production`

旧本地服务名和旧域名扫描：

- 排除迁移文档、品牌素材目录、已知 Vercel 本地状态后，未发现以下旧默认值：
  - `finds_db`
  - `finds_postgres`
  - `finds_redis`
  - `finds_embedding`
  - `finds_meilisearch`
  - `findsindex`
  - `api.findsindex.com`
  - `findsspreadsheet.com`
  - `FindsSpreadsheet`

旧 Vercel 绑定扫描：

- 未发现旧 `projectId`
- 未发现旧 `orgId`
- 未发现旧 `projectName=findsspreadsheet-com`

敏感连接形式扫描：

- 未发现旧 SSH host、旧 key path、私钥、Caddy 配置路径。
- 仍有代码内本地示例连接串，例如 `postgresql://postgres:postgres@localhost:5432/lolobuyspreadsheets_dev`。
- 仍有代码根据环境变量构造 Redis URL，这是正常运行逻辑，不是旧生产连接。

## 剩余事项

### 1. `apps/web/.vercel`

复制后发现嵌套 `apps/web/.vercel/project.json` 带有旧 Vercel project/org ID。

已处理：

- 已把 `apps/web/.vercel/project.json` 改成新项目占位符。
- `.gitignore` 已忽略 `.vercel`。

后续处理：

- 已在 Phase 3 删除 `apps/web/.vercel/` 目录。
 
### 2. 旧生成文件

后续处理：

- 已在 Phase 3 删除 `apps/web/.lighthouseci/`。
- 已在 Phase 3 删除 `品牌图标` 下的旧离线页面 HTML 和 `_files` 生成目录。

### 3. 第二轮品牌和文案清理

本轮只处理环境隔离和旧生产风险。

后续还需要单独做：

- 站点名称统一为 lolobuyspreadsheets.com
- SEO 文案改写
- Header/Footer 品牌显示检查
- referral、用户、收藏、浏览记录入口是否需要首版隐藏或移除

这些属于产品迁移和首版范围裁剪，不应该混在本轮安全复制里一次性改完。

## 当前结论

Phase 1 代码复制已完成。

Phase 2 的隔离关键项已完成：新项目默认 DB、容器名、compose 身份、API example env 已改为新项目值；未发现旧生产连接信息。

还不能启动服务，下一步应先创建新的本地 `.env` 文件，并确认端口、DB、Redis、Meilisearch 都是新项目自己的。
