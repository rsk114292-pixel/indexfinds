# lolobuyspreadsheets.com Schema 预检报告

> 日期：2026-06-30
> 阶段：Phase 5 预检
> 状态：预检已关闭；已按建议创建新站 baseline migration

## 本次目标

确认能否直接在新本地 DB `lolobuyspreadsheets_dev` 上执行现有 TypeORM migrations。

本次没有执行：

- `migration:run`
- seed
- reset
- cleanup/delete
- 旧项目脚本
- 旧生产数据库连接
- 数据导入

## 已确认的安全边界

- TypeORM CLI 配置文件：`apps/api/data-source.ts`
- env 加载顺序优先读取：`apps/api/.env.local`
- 当前 migration 目标：
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=15432`
  - `DB_NAME=lolobuyspreadsheets_dev`
- `migration:show` 只读检查需要提升权限，因为普通沙箱不能连接宿主机 `127.0.0.1:15432`。

## 依赖状态

`apps/api/node_modules` 原本不存在，已安装新项目 API 依赖。

pnpm 11 不再读取 `package.json` 里的 `pnpm.onlyBuiltDependencies`，因此新增/明确：

- `apps/api/pnpm-workspace.yaml`
- 允许 build scripts：`bcrypt`、`sharp`
- 禁用 build scripts：`@nestjs/core`、`@scarf/scarf`、`msgpackr-extract`、`unrs-resolver`

## 预检结果

`pnpm migration:show` 已连接新本地 DB，并列出所有 migrations 为 pending。

当前新 DB 表状态：

- `typeorm_migrations`

说明：这张表由 TypeORM CLI 创建，用于记录 migration 状态；没有业务表、没有旧项目数据。

## 发现的问题

现有 migrations 不是完整的空库初始化链。

证据：

- 未发现创建核心产品域基础表的初始 migration：
  - `products`
  - `brands`
  - `categories`
  - `skus`
- 早期 migration 会直接操作已存在表，例如：
  - `1738000001000-AddAiBrandName.ts` 会 `ALTER TABLE products`
  - `1738000002000-ClearBrands.ts` 会 `UPDATE products` 和 `DELETE FROM brands`

如果在当前新空库上直接执行 `pnpm migration:run`，预期会失败，或把历史数据清理类 migration 当成新站初始化的一部分。

## 专家建议

不要直接运行现有 `migration:run`。

建议下一步先选择 schema 基线策略：

1. 生成新站初始 baseline migration。
   - 优点：可审计、可复现，符合后续部署和迁移记录要求。
   - 风险：需要处理旧 incremental migrations 的状态，避免后续重复执行冲突。

2. 在空库上使用 TypeORM `schema:sync` 建立当前实体 schema，然后生成新的 baseline 记录方案。
   - 优点：最快验证本地 API 是否能启动。
   - 风险：不适合直接作为生产部署流程，必须补一份可审计 baseline。

3. 从旧生产只导出 schema-only dump。
   - 优点：最贴近旧生产结构。
   - 风险：当前阶段未获批准连接旧生产 DB，不能执行。

当前推荐：先在新项目里生成/整理一个可审计的初始 baseline migration，再继续 Phase 5。

## 当前结论

Phase 5 预检结论已执行。

后续结果见：

- `Docs/03-Planning/lolobuyspreadsheets-schema-baseline-report.md`

旧项目未被触碰，旧生产数据库未连接，旧项目 migration/seed/reset/cleanup/delete 未执行。
