# LoloBuySpreadsheets Phase 17 API 反代准备报告

日期：2026-07-01

## 目标

在不切 DNS、不部署 Vercel 的前提下，在新 VPS `43.165.1.148` 上完成 API 反代准备，并验证 Caddy 可以把 `api.lolobuyspreadsheets.com` 的请求转发到本机 API。

成功标准：

1. Caddy 使用新写配置，不复制旧 Caddy 生产配置。
2. API 仍只监听 `127.0.0.1:4101`。
3. Caddy 只对 `Host: api.lolobuyspreadsheets.com` 反代到 API。
4. 非目标 Host 不反代。
5. DNS 未切换前不启用自动 HTTPS。

## 执行边界

- 只操作新 VPS。
- 不连接旧 VPS。
- 不复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。
- 不切 DNS。
- 不部署 Vercel。
- 不读取或输出任何生产 secret。

## 当前 Git 状态

VPS repo 已同步到：

```text
ce37214 docs: record phase 16 vps product import
```

## Caddy 安装

安装来源：

```text
Ubuntu 24.04 official repository
```

版本：

```text
2.6.2
```

服务状态：

| 项 | 值 |
| --- | --- |
| systemd enabled | yes |
| systemd active | yes |
| listening | `*:80` |
| HTTPS | not enabled yet |

## 当前 Caddy 配置

路径：

```text
/etc/caddy/Caddyfile
```

内容：

```caddyfile
{
	auto_https off
}

:80 {
	@api host api.lolobuyspreadsheets.com
	handle @api {
		reverse_proxy 127.0.0.1:4101
	}

	respond "not found" 404
}
```

说明：

- 这是 DNS 切换前的 HTTP-only 验证配置。
- 只匹配 `api.lolobuyspreadsheets.com` Host。
- 不匹配的 Host 返回 `404 not found`。
- `auto_https off` 是临时设置，原因是 DNS 尚未指向新 VPS，无法签发真实证书。

## 验证结果

API 仍只监听本机：

```text
127.0.0.1:4101
```

Caddy 监听：

```text
*:80
```

VPS 本机通过 Caddy 访问 API health：

```bash
curl -H "Host: api.lolobuyspreadsheets.com" http://127.0.0.1/health
```

结果：

```json
{"status":"ok","database":"ok"}
```

VPS 本机通过 Caddy 访问普通搜索：

```bash
curl -H "Host: api.lolobuyspreadsheets.com" \
  "http://127.0.0.1/products/search?q=nike&limit=2"
```

摘要：

| 项 | 值 |
| --- | ---: |
| total | 2 |
| data_len | 2 |
| first title | `FC Barcelona x Spotify 2024 Third Jersey Pink` |

错误 Host 验证：

```bash
curl -i -H "Host: example.com" http://127.0.0.1/health
```

结果：

```text
HTTP/1.1 404 Not Found
Server: Caddy
not found
```

## DNS 状态

本地解析结果：

| 域名 | 当前解析 | 期望生产解析 |
| --- | --- | --- |
| `api.lolobuyspreadsheets.com` | `198.18.0.129` | `43.165.1.148` |
| `lolobuyspreadsheets.com` | `198.18.0.130` | Vercel 指定目标 |

结论：

- `api.lolobuyspreadsheets.com` 尚未指向新 VPS。
- 现在不能把 Caddy 切到生产 HTTPS 站点块。
- Vercel 生产 Web 也不能最终上线，因为 HTTPS 页面不能稳定调用 HTTP API。

## DNS 切换后的 Caddy 配置

当 `api.lolobuyspreadsheets.com` 解析到 `43.165.1.148` 后，才能切换为：

```caddyfile
api.lolobuyspreadsheets.com {
	reverse_proxy 127.0.0.1:4101
}
```

切换后验证：

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -I https://api.lolobuyspreadsheets.com/health
curl https://api.lolobuyspreadsheets.com/products/search?q=nike\&limit=2
curl https://api.lolobuyspreadsheets.com/visual-search/status
```

## 下一步建议

1. 在 DNS 控制台把 `api.lolobuyspreadsheets.com` 的 A 记录指向 `43.165.1.148`，TTL 建议 `300`。
2. DNS 生效后，将 Caddy 从 HTTP-only 切换到 HTTPS 自动证书配置。
3. 验证 API HTTPS、uploads、普通搜索、视觉搜索。
4. 再创建/配置 Vercel `apps/web` 生产项目。
5. Vercel 预览和生产部署通过后，再切主域 `lolobuyspreadsheets.com` 和 `www.lolobuyspreadsheets.com`。

## DNS 切换后 HTTPS 激活结果

执行时间：2026-07-01

DNS-over-HTTPS 验证：

```text
api.lolobuyspreadsheets.com A 43.165.1.148
TTL 300
```

说明：

- `api` 记录已从 Cloudflare 橙云代理改为灰云 DNS-only。
- 主域 `lolobuyspreadsheets.com` 和 `www.lolobuyspreadsheets.com` 未切换，仍等待 Vercel 部署阶段处理。

VPS 上已备份旧 HTTP-only 配置：

```text
/etc/caddy/Caddyfile.phase17-http-only
```

当前 `/etc/caddy/Caddyfile`：

```caddyfile
api.lolobuyspreadsheets.com {
	reverse_proxy 127.0.0.1:4101
}
```

验证结果：

| 项 | 结果 |
| --- | --- |
| `caddy validate` | `Valid configuration` |
| `systemctl is-active caddy` | `active` |
| Let’s Encrypt | `certificate obtained successfully` |
| HTTP -> HTTPS | enabled by Caddy |

公网 HTTPS smoke test：

| 检查项 | 结果 |
| --- | --- |
| `GET /health` | `status=ok`, `database=ok` |
| `GET /products/search?q=nike&limit=2` | `total=2`, `data_len=2` |
| `GET /visual-search/status` | `available=true`, `coverage=100` |
| `HEAD /uploads/1f78867ff4e0b29503dac58c7b502a4f.png` | `HTTP/2 200`, `content-type=image/png` |

结论：

- API 生产 HTTPS 入口已启用。
- API 仍通过 Caddy 反代到 `127.0.0.1:4101`，未公开容器内部数据服务端口。
- 下一步可以进入 Vercel `apps/web` 生产项目配置与预览部署。
