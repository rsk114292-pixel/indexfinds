# LoloBuySpreadsheets Phase 19 主域名切换报告

日期：2026-07-01

## 目标

把生产 Web 自定义域名切到 Vercel 前端，同时保持 API 后端在新 VPS 上运行。

成功标准：

1. `lolobuyspreadsheets.com` 绑定到 Vercel 项目。
2. `www.lolobuyspreadsheets.com` 绑定到 Vercel 项目。
3. Cloudflare 只调整 root/www DNS，不改 `api`。
4. Vercel 域名状态为 `Valid Configuration`。
5. 主域、www、搜索页、视觉搜索入口 smoke test 通过。
6. 不复制旧 Vercel、旧 VPS、旧 GitHub Actions、旧 Caddy 生产配置。

## Vercel 域名绑定

Vercel 项目：

```text
lolobuyspreadsheets-com
```

Vercel Project ID：

```text
prj_s02wzyoO9hLVQuABSVFdwjLQ7k2S
```

已绑定域名：

| 域名 | 状态 | 环境 |
| --- | --- | --- |
| `lolobuyspreadsheets.com` | `Valid Configuration` | Production |
| `www.lolobuyspreadsheets.com` | `Valid Configuration` | Production |
| `lolobuyspreadsheets-com.vercel.app` | `Valid Configuration` | Production |

说明：

- 添加域名时取消了 Vercel 默认的 `Redirect apex domains to www`。
- 当前主入口保持 `https://lolobuyspreadsheets.com`，与 `NEXT_PUBLIC_SITE_URL` 一致。
- `www` 先绑定到同一 Vercel 项目，后续如需强制重定向可另开小变更。

## Cloudflare DNS

按 Vercel 提示，Cloudflare DNS 调整为：

| Name | Type | Content | Proxy |
| --- | --- | --- | --- |
| `api` | A | `43.165.1.148` | DNS only |
| `@` | CNAME | `bfa45b384b6b1498.vercel-dns-016.com` | DNS only |
| `www` | CNAME | `bfa45b384b6b1498.vercel-dns-016.com` | DNS only |

变更说明：

- 删除了 root 旧 A 记录 `2.57.91.91`。
- 新增 root CNAME 指向 Vercel。
- 更新 `www` CNAME，从指向 root 改为直接指向 Vercel。
- root/www 均关闭 Cloudflare orange proxy，符合 Vercel 域名校验要求。
- `api.lolobuyspreadsheets.com` 保持指向新 VPS `43.165.1.148`。

## DNS 验证

使用 `1.1.1.1` 查询：

| 查询 | 结果 |
| --- | --- |
| `lolobuyspreadsheets.com CNAME` | 无直接 CNAME 返回，Cloudflare flatten apex |
| `lolobuyspreadsheets.com A` | `216.150.1.193`, `216.150.16.193` |
| `www.lolobuyspreadsheets.com CNAME` | `bfa45b384b6b1498.vercel-dns-016.com.` |
| `api.lolobuyspreadsheets.com A` | `43.165.1.148` |

## Smoke Test

| 检查项 | 结果 |
| --- | --- |
| 主域首页 | `https://lolobuyspreadsheets.com/en` 正常渲染 |
| 主域首页 H1 | `Discover Products from China` |
| 主域首页图片 | 65 张图片，坏图 0 |
| 主域首页控制台 | error 0 |
| www 首页 | `https://www.lolobuyspreadsheets.com/en` 正常渲染 |
| www 首页 H1 | `Discover Products from China` |
| www 首页图片 | 65 张图片，坏图 0 |
| www 首页控制台 | error 0 |
| 搜索页 | `https://lolobuyspreadsheets.com/en/search?q=nike` 正常渲染 |
| 搜索结果 | `nike` 返回 15866 products found |
| 搜索页图片 | 20 张图片，坏图 0 |
| 搜索页控制台 | error 0 |
| 视觉搜索 UI | 弹窗正常出现，上传 input `accept=image/*` 可用 |
| API health | `status=ok`, `database=ok` |
| 视觉搜索 API | `available=true`, `coverage=100` |
| Vercel runtime error logs | 最近 30 分钟无 error/fatal logs |

## 后续建议

1. 观察 24 小时 Vercel runtime logs、API logs、Caddy logs。
2. 确认 Search Console / analytics 需要的域名所有权和站点地图配置。
3. 如决定强制 `www` 跳主域或主域跳 `www`，单独做 redirect 变更并重新 smoke test。
4. 暂不打开 `api` orange proxy；如果要打开，先验证上传、CORS、body size、timeout、cache bypass。

## 禁止项

- 不复制旧 Vercel 项目配置。
- 不复制旧 Vercel env 或 secrets。
- 不复制旧 VPS/SSH/IP/key path。
- 不复制旧 GitHub Actions secrets。
- 不复制旧 Caddy 生产配置。
- 不连接旧生产 DB。
- 不导入用户、收藏、浏览、推荐、会话、搜索、点击、流量、积分、任务数据。
