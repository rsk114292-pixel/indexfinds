# LoloBuySpreadsheets Phase 13 新 VPS 基础初始化报告

日期：2026-07-01

## 目标

在不导入数据、不切 DNS、不启动业务栈的前提下，完成新 VPS 基础初始化：系统更新、Docker/Compose、目录结构、生产 env、源码部署入口和基础安全配置。

成功标准：

1. 初始快照已创建并可用。
2. VPS 系统更新完成并运行新内核。
3. Docker、Docker Compose、Postgres client 可用。
4. `/opt/lolobuyspreadsheets` 目录结构已创建。
5. 新生产 env 已在 VPS 本地生成，且不进入 Git/Markdown/聊天记录。
6. 生产 compose 已静态校验通过。
7. UFW、fail2ban、SSH key-only hardening 生效。
8. 未启动业务容器、未执行 migration、未导入产品域数据。

## 执行边界

- 只连接新 VPS：`43.165.1.148`。
- 不连接旧 VPS。
- 不连接旧生产 DB。
- 不运行旧项目 migration、seed、reset、cleanup、delete。
- 不导入 users、favorites、browsing、referral、session、search、click、traffic、points、job 数据。
- 不复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。
- 不把真实 secret 写入 Git、Markdown、issue、聊天记录或截图。

## 快照

已在腾讯云控制台创建初始快照：

| 项目 | 值 |
| --- | --- |
| 快照 ID | `lhsnap-49avhnb7` |
| 快照名称 | `lolobuy-before-init-2026-07-01` |
| 实例 | `lolobuyspreadsheets.com（lhins-4y93v9pn）` |
| 创建时间 | `2026-07-01 17:40:35` |
| 状态 | `正常` |
| 云硬盘属性 | 系统盘 |

## 系统更新

执行内容：

- `sudo apt update`
- `sudo apt upgrade -y`
- 安装新内核后执行重启。

当前系统：

```text
Linux VM-4-4-ubuntu 6.8.0-134-generic #134-Ubuntu SMP PREEMPT_DYNAMIC Fri Jun 26 18:43:11 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
```

资源状态：

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda2       118G  6.1G  108G   6% /
```

```text
Mem:   7.4Gi total, 590Mi used, 6.1Gi free, 6.9Gi available
Swap:  1.9Gi total, 0B used
```

## 已安装基础工具

| 工具 | 当前状态 |
| --- | --- |
| Docker | `29.1.3` |
| Docker Compose plugin | `2.40.3+ds1-0ubuntu1~24.04.1` |
| psql | `16.14` |
| fail2ban | active |
| UFW | active |

Docker 当前没有运行任何业务容器：

```text
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

## 目录结构

已创建：

```text
/opt/lolobuyspreadsheets
/opt/lolobuyspreadsheets/app/repo
/opt/lolobuyspreadsheets/env
/opt/lolobuyspreadsheets/data/uploads
/opt/lolobuyspreadsheets/data/hf-cache
/opt/lolobuyspreadsheets/imports/product-domain
/opt/lolobuyspreadsheets/imports/uploads
/opt/lolobuyspreadsheets/imports/logs
/opt/lolobuyspreadsheets/backups/pre-import
/opt/lolobuyspreadsheets/backups/pre-dns-cutover
/opt/lolobuyspreadsheets/scripts
```

env 权限：

- `/opt/lolobuyspreadsheets/env`：`700`
- `/opt/lolobuyspreadsheets/env/api.env`：`600`
- `/opt/lolobuyspreadsheets/env/compose.env`：`600`

## 生产 env

已在 VPS 本地生成：

```text
/opt/lolobuyspreadsheets/env/api.env
/opt/lolobuyspreadsheets/env/compose.env
```

说明：

- secret 在 VPS 本地生成。
- 未输出 secret 值。
- 未写入 Git、Markdown、聊天记录。
- `QWEN_API_KEY`、`RESEND_API_KEY`、Google OAuth、Discord OAuth 暂留空，后续从对应控制台单独配置。

已生成或配置的核心变量类别：

- Postgres 用户、数据库名、密码。
- Redis 密码。
- Meilisearch master key。
- JWT secret。
- OAuth encryption key。
- Revalidate secret。
- Referral tracking secret。
- API/DB/Redis/Meili/embedding 内网连接地址。
- uploads 和 hf-cache host path。

## 源码部署入口

由于 GitHub 仓库是私有仓库，VPS 上没有 GitHub deploy token，直接 HTTPS clone 曾失败：

```text
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

Phase 13 初始处理采用本地 `git archive HEAD` 上传当前已推送 commit 的 tracked 文件，不包含 `.git`、本地 `.env`、未跟踪文件。

VPS 源码路径：

```text
/opt/lolobuyspreadsheets/app/repo
```

初始 archive 部署 revision：

```text
92abc7c deploy: add production compose
```

初始 archive 验证结果：

- `/opt/lolobuyspreadsheets/app/repo` 不包含 `.git`。
- 不包含 `.env`、`.env.local`、`.env.production`。
- 包含 `docker-compose.prod.yml`。

后续需要补一个正式的私有仓库部署方式：

- GitHub fine-grained deploy token；或
- GHCR 私有镜像拉取 token；或
- 继续用人工 `git archive` 上传，但不建议长期使用。

2026-07-01 已补正式读取方式：

- 在新 VPS 上生成项目专用 GitHub Deploy Key。
- GitHub 仓库添加 read-only Deploy Key：`lolobuyspreadsheets-vps-43.165.1.148-readonly-2026-07`。
- VPS SSH alias：`github.com-lolobuyspreadsheets`。
- VPS repo remote：`git@github.com-lolobuyspreadsheets:cpf1236/lolobuyspreadsheets.com.git`。
- `/opt/lolobuyspreadsheets/app/repo` 已切换为正式 Git clone。
- 当前 clone revision：`ca3db66e05d073b5c1ba3860f42991caf5344ffe`。
- clone 后未发现 `.env`、`.env.local`、`.env.production`。
- 原 archive 目录仅在 VPS 上重命名归档，没有删除。

## 生产 Compose

新增并推送：

```text
docker-compose.prod.yml
```

设计要点：

- Postgres、Redis、Meilisearch、embedding service 只绑定 `127.0.0.1`。
- API 只绑定 `127.0.0.1:4101`，后续由 Caddy/Nginx 反代到公网。
- Redis 使用 `requirepass`。
- Meilisearch 使用新 master key。
- API env 通过 `/opt/lolobuyspreadsheets/env/api.env` 注入。
- Compose env 通过 `/opt/lolobuyspreadsheets/env/compose.env` 注入。

静态校验已通过：

```bash
docker compose --env-file /opt/lolobuyspreadsheets/env/compose.env \
  -f /opt/lolobuyspreadsheets/app/repo/docker-compose.prod.yml \
  config --quiet
```

## 防火墙与 SSH

腾讯云防火墙当前建议保持：

- TCP 22：临时全 IPv4，后续建议收紧到运维公网 IP。
- TCP 80：全 IPv4。
- TCP 443：全 IPv4。
- ICMP：可选保留。

UFW 已启用：

```text
Status: active
Default: deny (incoming), allow (outgoing), deny (routed)

22/tcp  ALLOW IN
80/tcp  ALLOW IN
443/tcp ALLOW IN
```

fail2ban：

```text
Jail list: sshd
Currently failed: 0
Currently banned: 0
```

SSH hardening 生效：

```text
pubkeyauthentication yes
passwordauthentication no
permitrootlogin no
kbdinteractiveauthentication no
```

说明：

- 腾讯云 `50-cloud-init.conf` 会设置 `PasswordAuthentication yes`。
- OpenSSH 全局配置是先出现优先，因此本次使用 `/etc/ssh/sshd_config.d/00-lolobuy-hardening.conf` 确保 key-only 设置优先生效。
- key 登录已验证可用。

## 当前未做事项

- 未启动 Postgres、Redis、Meilisearch、embedding service、API。
- 未运行 baseline migration。
- 未上传产品域 dump。
- 未上传 `referenced-uploads.tar`。
- 未解压 uploads。
- 未执行 URL rewrite。
- 未执行 post-import safety cleanup。
- 未执行 validation SQL。
- 未 rebuild Meilisearch。
- 未配置 Caddy/Nginx。
- 未配置 Vercel Web 项目。
- 未切 DNS。

## 风险与观察

- 新 VPS 短时间并发 SSH 连接时偶发 `Connection timed out during banner exchange`。顺序执行 SSH 命令稳定。后续部署脚本应避免并发 SSH。
- 120 GB 系统盘首版可用，但产品数据、Meilisearch、uploads、Docker image 会持续增长；导入前后必须记录磁盘水位。
- VPS 已配置 GitHub read-only Deploy Key，可正式 `git pull` 私有仓库。后续如需 GHCR 镜像部署，应单独规划，不复用旧项目 token 或 Actions secrets。

## 下一步建议

进入 Phase 14：启动基础服务并跑空库 baseline。

建议顺序：

1. `docker compose ... up -d postgres redis meilisearch`
2. 验证 Postgres、Redis、Meilisearch health。
3. 视网络情况再 build/start `embedding-service`，因为首次构建会下载 Python 依赖和模型，耗时较长。
4. build API 镜像，但先不要导入产品域数据。
5. 空库执行 baseline migration。
6. baseline 验证通过后，再进入产品域 dump 和 uploads artifact 上传。
