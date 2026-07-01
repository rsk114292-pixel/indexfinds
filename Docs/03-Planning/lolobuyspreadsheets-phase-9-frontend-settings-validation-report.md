# LoloBuySpreadsheets Phase 9 本地前台与安全配置验收报告

日期：2026-07-01

## 结论

Phase 9 本地验收通过。

- 本地 API：`http://localhost:4101/health` 返回 `status=ok`、`database=ok`。
- 本地前端：`http://localhost:3101/en`、`/en/search?q=nike`、`/en/search/visual` 均返回 200。
- 普通搜索前台可用：`/en/search?q=nike` 展示 15,866 个商品结果。
- 商品详情前台可用：真实商品详情页展示主图、SKU、Buy Now、Find Similar、推荐区。
- 视觉搜索前台可用：`/en/search/visual?productId=6a9bc48a-7597-466d-843e-3a200c87153a` 返回 24 个相似商品。
- 移动端搜索与移动端 by-product 视觉搜索均可渲染商品列表。
- 旧 `api.findsindex.com/uploads/` 在新本地 DB 的业务字段中无残留。
- 普通外部商品图片继续使用原外部 URL，未被误重写为本地 uploads。
- 旧平台 invite/ref code 已从新本地 DB 和默认代码中清理。

## 安全边界

本阶段只操作：

- `/Volumes/1T/lolobuyspreadsheets.com`
- 新项目本地 Docker/Postgres/Redis/Meilisearch/embedding-service/API/Web

本阶段未执行：

- 未连接旧生产 DB。
- 未运行旧项目 migration/seed/reset/cleanup/delete。
- 未导入旧 users/favorites/browsing/referral/session/search/click/traffic/points/job 数据。
- 未复制旧 settings bulk 数据。
- 未复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。

## 前台验收

### 桌面端普通搜索

- URL：`http://localhost:3101/en/search?q=nike`
- 标题：`Search: nike | LoloBuySpreadsheets`
- 页面状态：非空白，无 framework error overlay。
- 结果：显示 `15866 products found`。
- 控制台：无应用级 error；仅出现 Next.js 图片 LCP priority 警告。

### 桌面端商品详情

- URL：`http://localhost:3101/en/products/nike-tracksuit-awarpa?from=%2Fen%2Fsearch%3Fq%3Dnike`
- 标题：`Nike Nike Tech Fleece Hoodie and Joggers Gray / Black Tracksuit - CNY 348.00 | LoloBuySpreadsheets`
- 验证内容：
  - 商品标题存在。
  - 主图和缩略图存在。
  - SKU 尺码存在。
  - `Buy Now` 存在。
  - `Find Similar` 存在。
  - `Complete the Look` 推荐区存在。
- 控制台：无 error/warn。

### 桌面端视觉搜索

- URL：`http://localhost:3101/en/search/visual?productId=6a9bc48a-7597-466d-843e-3a200c87153a`
- 标题：`Image Search | LoloBuySpreadsheets`
- 结果：从 loading 进入 `Found 24 similar products`。
- 页面展示：
  - 相似商品网格。
  - 相似度百分比。
  - Category/Brands/Price Range 等筛选。
  - 商品价格和品牌。
- 控制台：无 error/warn。

### 移动端

临时视口：`390x844`

- `/en/search?q=nike`：显示搜索结果、商品卡片、底部导航，无错误遮罩。
- `/en/search/visual?productId=6a9bc48a-7597-466d-843e-3a200c87153a`：显示源商品、`Found 24 similar products`、相似商品卡片和筛选入口，无错误遮罩。

## uploads URL 验证

DB 只读检查结果：

| 字段 | 旧 uploads URL 残留 |
| --- | ---: |
| `products.images` | 0 |
| `brands.logoUrl` | 0 |
| `platforms.logoUrl` | 0 |
| `product_qc_media.url` | 0 |

商品图片统计：

| 项 | 数量 |
| --- | ---: |
| `products` total | 331,776 |
| 包含 `si.geilicdn.com` 的商品图片 | 331,776 |
| 包含 `localhost:4101/uploads` 的商品图片 | 0 |

结论：旧 uploads 域名已清理；普通外部商品图片没有被误重写。

## Settings 与平台配置清理

发现的问题：

- `SettingsService` 默认会写入具体 `loongbuy_invitecode`。
- `SettingsService.getLoongbuyConfig()` 对空值 fallback 到具体邀请码。
- `PlatformsService` 默认平台 `loongbuy` 带具体 `inviteCode`。
- 产品域 dump 导入的 `platforms` 中含旧平台 invite/ref code；个别 URL 模板中有硬编码推广码。

已处理：

- `apps/api/src/settings/settings.service.ts`
  - `loongbuy_invitecode` 默认值改为空。
  - 空值 fallback 改为空。
- `apps/api/src/platforms/platforms.service.ts`
  - 默认 `inviteCode` 改为空。
- `apps/web/src/app/admin/settings/platforms/page.tsx`
  - 示例邀请码改为 `YOUR_CODE`。
- `apps/web/src/app/admin/settings/platforms/components/PlatformConfigModal.tsx`
  - 输入框 placeholder 改为 `YOUR_CODE`。
- 新本地 DB：
  - 清空所有 `platforms.inviteCode`。
  - 将模板里硬编码的 invite/ref 参数值改为 `{inviteCode}`。
  - 清空 `settings.loongbuy_invitecode`。
  - 将 `settings.tracking_enabled` 设为 `false`。

清理后验证：

| 项 | 结果 |
| --- | ---: |
| 非空 `platforms.inviteCode` | 0 |
| 模板硬编码 invite/ref 参数 | 0 |
| `settings.tracking_enabled` | `false` |
| `settings.loongbuy_invitecode` | `empty` |
| Buy link 是否含旧邀请码 | `false` |

## 验证命令

- `pnpm --dir apps/api typecheck`
- `apps/web/node_modules/.bin/next typegen`
- `apps/web/node_modules/.bin/tsc -p tsconfig.typecheck.json --noEmit`
- `curl http://localhost:4101/health`
- 浏览器验收：
  - `/en/search?q=nike`
  - `/en/products/nike-tracksuit-awarpa?from=%2Fen%2Fsearch%3Fq%3Dnike`
  - `/en/search/visual?productId=6a9bc48a-7597-466d-843e-3a200c87153a`
  - 移动视口 `390x844`

说明：`pnpm --dir apps/web typecheck` 会触发依赖状态检查并尝试访问 npm registry；当前沙盒 DNS 不允许联网，所以已停止，改用本地 `node_modules/.bin` 工具完成同等核心检查。

## 剩余风险

- 本阶段未用浏览器真实文件选择器完成图片上传视觉搜索；Phase 8 已通过 API upload 视觉搜索 smoke，本阶段验证的是前台 by-product 视觉搜索闭环。
- 新站上线前必须重新填写新站自己的平台 invite/ref code、GA/GTM、AI key 等安全配置。
- 如果希望购买跳转首版完全禁用，需要单独加产品购买入口开关；当前行为是生成不带旧邀请码的外跳链接。

## 下一步建议

进入新 VPS 准备阶段前，先补一份部署 runbook：

1. 新 VPS 空库执行 baseline migrations。
2. 导入产品域 dump。
3. 解压 uploads tar 到新 API uploads volume。
4. 执行 uploads URL 重写。
5. 清空平台旧 invite/ref code，并填入新站参数或保持为空。
6. Meilisearch 全量重建。
7. API/Web/视觉搜索 smoke test。
8. 最后配置新域名、TLS、Caddy 和新 secrets。
