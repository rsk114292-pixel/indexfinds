# LoloBuySpreadsheets Phase 18 Vercel 前端部署报告

日期：2026-07-01

## 目标

把 `apps/web` 部署到 Vercel，保持后端 API 在新 VPS 上运行。

成功标准：

1. Vercel 项目连接 `cpf1236/lolobuyspreadsheets.com`。
2. Root Directory 为 `apps/web`，Framework 为 Next.js。
3. 前端环境变量指向新 API：`https://api.lolobuyspreadsheets.com`。
4. 不复制旧 Vercel 项目 env、旧 VPS 配置、旧 GitHub Actions secrets。
5. Vercel 部署状态为 READY。
6. 首页、普通搜索、视觉搜索入口、图片加载 smoke test 通过。

## Vercel 项目事实

| 项 | 值 |
| --- | --- |
| Vercel Team | `cpf1236's projects` |
| Vercel Team ID | `team_nbsiCxihYzaUdImbLC4Mdxz7` |
| Vercel Project | `lolobuyspreadsheets-com` |
| Vercel Project ID | `prj_s02wzyoO9hLVQuABSVFdwjLQ7k2S` |
| GitHub repo | `cpf1236/lolobuyspreadsheets.com` |
| Git branch | `main` |
| Root Directory | `apps/web` |
| Framework | `nextjs` |
| Node.js | `24.x` |
| Region | `iad1` |

当前部署：

| 项 | 值 |
| --- | --- |
| Deployment ID | `dpl_8KEBAhAW4TzisPhKVGdj5A7oaDSR` |
| Deployment URL | `https://lolobuyspreadsheets-mpk2mh673-cpf1236s-projects.vercel.app` |
| Production alias | `https://lolobuyspreadsheets-com.vercel.app` |
| Branch alias | `https://lolobuyspreadsheets-com-git-main-cpf1236s-projects.vercel.app` |
| Target | `production` |
| State | `READY` |
| Source | `import` |
| Commit | `454e7c1 docs: record api https activation` |

## 构建配置

Vercel 默认识别后，已手动固定关键构建命令，避免同时存在 `pnpm-lock.yaml` 和 `package-lock.json` 时误选 npm。

| 项 | 值 |
| --- | --- |
| Build Command | `pnpm build` |
| Install Command | `pnpm install --frozen-lockfile` |
| Output Directory | Next.js default |

## 环境变量

已配置到 Vercel `Production and Preview`：

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

说明：

- `NEXT_PUBLIC_API_URL=https://api.lolobuyspreadsheets.com`。
- `NEXT_PUBLIC_API_HOSTNAME=api.lolobuyspreadsheets.com`。
- `REVALIDATE_SECRET` 从新 VPS API 生产 env 读取并填入 Vercel，值未写入文档或聊天记录。
- `REVALIDATE_SECRET` 长度验证为 64。
- `LEGACY_SITE_URLS` 未配置，首版不绑定旧域名或旧站 redirect。
- `REFERRAL_TRACKING_SECRET` 未配置，当前代码会使用 `REVALIDATE_SECRET` 兜底。
- 没有复制旧 Vercel env、旧 GitHub Actions secrets、旧 VPS secret。

## Smoke Test

| 检查项 | 结果 |
| --- | --- |
| 首页 | `https://lolobuyspreadsheets-com.vercel.app/en` 正常渲染 |
| 首页标题 | `LoloBuySpreadsheets | Kakobuy, CNFans & ACBuy Spreadsheet Finds` |
| 首页 H1 | `Discover Products from China` |
| 首页图片 | 65 张图片，坏图 0 |
| 首页控制台 | error 0 |
| 搜索页 | `https://lolobuyspreadsheets-com.vercel.app/en/search?q=nike` 正常渲染 |
| 搜索结果 | `nike` 返回 15866 products found |
| 搜索页图片 | 20 张图片，坏图 0 |
| 搜索页控制台 | error 0 |
| Vercel 搜索页 HTTP | `HTTP/2 200` |
| 视觉搜索 API | `available=true`, `coverage=100` |
| 视觉搜索 UI | 弹窗正常出现，上传 input `accept=image/*` 可用 |
| Vercel runtime error logs | 最近 15 分钟无 error logs |

## 尚未执行

- 未绑定 `lolobuyspreadsheets.com` 主域到 Vercel。
- 未绑定 `www.lolobuyspreadsheets.com` 到 Vercel。
- 未调整 Cloudflare root/www DNS 到新的 Vercel 项目。
- 未重新开启 `api.lolobuyspreadsheets.com` 的 Cloudflare orange proxy。

## 下一步建议

1. 在 Vercel 项目里绑定 `lolobuyspreadsheets.com` 和 `www.lolobuyspreadsheets.com`。
2. 按 Vercel 提示更新 Cloudflare root/www DNS。
3. 等 DNS 验证通过后，跑主域 smoke test。
4. 主域通过后，再决定是否为 `api.lolobuyspreadsheets.com` 开 Cloudflare orange proxy。

## 禁止项

- 不复制旧 Vercel 项目配置。
- 不复制旧 Vercel env 或 secrets。
- 不复制旧 VPS/SSH/IP/key path。
- 不复制旧 GitHub Actions secrets。
- 不复制旧 Caddy 生产配置。
- 不连接旧生产 DB。
- 不导入用户、收藏、浏览、推荐、会话、搜索、点击、流量、积分、任务数据。
