# LoloBuySpreadsheets Phase 20.2 Auth & Email Integration 报告

日期：2026-07-02

## 目标

完成上线后 Auth 与 Email 集成配置，让生产前端在 Vercel、生产 API 在新 VPS 的架构下可以正常使用邮件发送、Google 登录和 Discord 登录。

成功标准：

1. Resend 使用 `lolobuyspreadsheets.com` 新项目邮件域和新 API Key。
2. Google OAuth 使用 `lolobuyspreadsheets.com` 新 Google Cloud 项目和新 OAuth Web Client。
3. Discord OAuth 使用 `lolobuyspreadsheets.com` 新 Discord Application。
4. 新 VPS API 生产 env 已写入必要变量，真实 secret 不进入 Git、Markdown 或聊天记录。
5. API 重启后 health 正常。
6. Google / Discord OAuth 入口返回正确 302。
7. 前端完整 Google / Discord 登录链路人工 smoke test 通过。
8. Resend 真实邮件发送人工 smoke test 通过。

## 环境事实

| 项 | 值 |
| --- | --- |
| 前端生产域名 | `https://lolobuyspreadsheets.com` |
| API 生产域名 | `https://api.lolobuyspreadsheets.com` |
| VPS IP | `43.165.1.148` |
| VPS 项目目录 | `/opt/lolobuyspreadsheets` |
| VPS API env | `/opt/lolobuyspreadsheets/env/api.env` |
| VPS compose 目录 | `/opt/lolobuyspreadsheets/app/repo` |
| 前端运行平台 | Vercel |
| 后端运行平台 | 新 VPS |

## Resend 配置

Resend domain：

```text
lolobuyspreadsheets.com
```

发信地址：

```text
noreply@lolobuyspreadsheets.com
```

前端 URL：

```text
https://lolobuyspreadsheets.com
```

Cloudflare DNS / Resend 验证状态：

| 用途 | Type | Name | Content | 状态 |
| --- | --- | --- | --- | --- |
| DKIM | TXT | `resend._domainkey` | Resend DKIM public key | Verified |
| SPF return path | MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | Verified |
| SPF | TXT | `send` | `v=spf1 include:amazonses.com ~all` | Verified |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=none;` | 已配置 |

说明：

- 已启用 Resend sending。
- Resend API Key 为新项目创建，未复制旧项目 key。
- Resend API Key 仅写入 VPS 生产 env，未写入 Git 或文档。
- DNS 查询确认 `_dmarc.lolobuyspreadsheets.com TXT` 返回 `v=DMARC1; p=none;`。

## Google OAuth 配置

Google Cloud project：

```text
lolobuyspreadsheets-production
```

OAuth app：

```text
LoloBuySpreadsheets
```

OAuth audience：

```text
External
```

Publish status：

```text
Production
```

OAuth Web Client：

| 项 | 值 |
| --- | --- |
| Client name | `lolobuyspreadsheets-web-production` |
| Client ID | `1030684635863-354mjmechqjq2abb473olnf8jca2qna0.apps.googleusercontent.com` |
| Authorized JavaScript origin | `https://lolobuyspreadsheets.com` |
| Authorized redirect URI | `https://api.lolobuyspreadsheets.com/auth/google/callback` |

说明：

- Google Client Secret 为新 OAuth client 生成，未复制旧项目 secret。
- Google Client Secret 仅写入 VPS 生产 env，未写入 Git 或文档。

## Discord OAuth 配置

Discord Application：

```text
lolobuyspreadsheets.com
```

Discord OAuth2：

| 项 | 值 |
| --- | --- |
| Client ID | `1522054801121214521` |
| Redirect URI | `https://api.lolobuyspreadsheets.com/auth/discord/callback` |

说明：

- Discord Client Secret 为新 Discord application 生成。
- Discord Client Secret 仅写入 VPS 生产 env，未写入 Git 或文档。

## VPS Env 更新

已在 VPS 生产 API env 中配置以下变量类别：

| 变量 | 说明 |
| --- | --- |
| `RESEND_API_KEY` | 已配置，新项目 secret，值不记录 |
| `EMAIL_FROM` | `noreply@lolobuyspreadsheets.com` |
| `FRONTEND_URL` | `https://lolobuyspreadsheets.com` |
| `GOOGLE_CLIENT_ID` | 已配置，非 secret |
| `GOOGLE_CLIENT_SECRET` | 已配置，新项目 secret，值不记录 |
| `GOOGLE_CALLBACK_URL` | `https://api.lolobuyspreadsheets.com/auth/google/callback` |
| `DISCORD_CLIENT_ID` | 已配置，非 secret |
| `DISCORD_CLIENT_SECRET` | 已配置，新项目 secret，值不记录 |
| `DISCORD_CALLBACK_URL` | `https://api.lolobuyspreadsheets.com/auth/discord/callback` |

变更备份：

```text
/opt/lolobuyspreadsheets/env/api.env.bak-resend-20260702-010519
/opt/lolobuyspreadsheets/env/api.env.bak-google-20260702-093314
/opt/lolobuyspreadsheets/env/api.env.bak-discord-20260702-095335
```

## Smoke Test

API health：

| 检查项 | 结果 |
| --- | --- |
| `https://api.lolobuyspreadsheets.com/health` | `status=ok`, `database=ok` |

OAuth public endpoint：

| 检查项 | 结果 |
| --- | --- |
| `GET /auth/google` | `HTTP/2 302`，跳转到 `accounts.google.com` |
| Google redirect URI | `https://api.lolobuyspreadsheets.com/auth/google/callback` |
| Google scope | `email profile` |
| `GET /auth/discord` | `HTTP/2 302`，跳转到 `discord.com` |
| Discord redirect URI | `https://api.lolobuyspreadsheets.com/auth/discord/callback` |
| Discord scope | `identify email` |

人工完整链路：

| 检查项 | 结果 |
| --- | --- |
| Google 登录完整链路 | 通过。前端点击 Google 登录后可回到 `lolobuyspreadsheets.com` 账号页 |
| Discord 登录完整链路 | 通过。前端点击 Discord 登录后可回到 `lolobuyspreadsheets.com` 账号页 |
| Resend 真实发信 | 通过。用测试邮箱触发邮件后确认可收到 |

## 后续建议

1. 观察 24 小时 API logs、Caddy logs、Vercel runtime logs。
2. 如后续切换更严格邮件策略，可把 DMARC 从 `p=none` 分阶段调整为 `quarantine` 或 `reject`，调整前先观察投递情况。
3. 定期轮换 Resend / Google / Discord secrets，并确保只更新 VPS env，不写入 Git。
4. 后续如果新增 OAuth provider，继续使用新项目、新 secret、新 callback URL，不复用旧生产配置。

## 禁止项确认

- 未连接旧生产 DB。
- 未复制旧 Resend API Key。
- 未复制旧 Google OAuth client secret。
- 未复制旧 Discord client secret。
- 未复制旧 OAuth state、users、sessions、oauth accounts。
- 未导入旧 users / sessions / oauth accounts / favorites / referral / traffic 数据。
- 未把真实 secret 写入 Git、Markdown 或聊天记录。
