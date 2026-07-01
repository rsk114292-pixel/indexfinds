# LoloBuySpreadsheets Phase 12 新 VPS 首次只读检查

日期：2026-07-01

## 目标

首次连接新 VPS 前后只做只读检查，确认服务器身份、系统版本、磁盘、内存、监听端口和基础部署状态，再决定是否进入初始化。

成功标准：

1. SSH 使用新项目专用 key 登录 `43.165.1.148` 成功。
2. 确认服务器为新购买的 Ubuntu 24.04 LTS VPS。
3. 确认磁盘、内存与购买规格一致。
4. 确认未发现异常公网监听服务。
5. 不修改服务器配置、不安装软件、不写生产 env、不导入数据。

## 执行边界

- 只连接新 VPS：`43.165.1.148`。
- 不连接旧 VPS。
- 不连接旧生产 DB。
- 不运行旧项目 migration、seed、reset、cleanup、delete。
- 不复制旧 VPS/SSH/IP/key path/GitHub Actions secrets/Caddy 生产配置。
- 本次未修改服务器配置。
- 本机首次 SSH 使用 `StrictHostKeyChecking=accept-new`，只是在本机 `known_hosts` 记录新 VPS host key。

## SSH 连接结果

SSH 命令模板：

```bash
ssh -i /Users/chenpeifeng/.ssh/lolobuy-prod-2026-07 ubuntu@43.165.1.148
```

结果：

- SSH 登录成功。
- 主机名：`VM-4-4-ubuntu`
- 登录用户：`ubuntu`
- 用户组包含 `sudo`，后续可进行受控初始化。

说明：

- 首次连接时本机新增了 `43.165.1.148` 的 ED25519 host key 到 `known_hosts`。
- 并行执行只读命令时，一个 `whoami` 连接在 SSH banner 阶段超时；顺序重试后成功。判断为并发连接/新机 SSH 响应抖动，不影响后续部署，但初始化阶段建议避免大量并发 SSH。

## 系统版本

```text
Distributor ID: Ubuntu
Description:    Ubuntu 24.04.4 LTS
Release:        24.04
Codename:       noble
```

内核：

```text
Linux VM-4-4-ubuntu 6.8.0-124-generic #124-Ubuntu SMP PREEMPT_DYNAMIC Tue May 26 13:00:45 UTC 2026 x86_64 GNU/Linux
```

结论：系统版本符合 Phase 11 建议。

## 资源检查

磁盘：

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda2       118G  5.3G  108G   5% /
```

内存：

```text
Mem:   7.4Gi total, 543Mi used, 6.5Gi free, 6.9Gi available
Swap:  1.9Gi total, 0B used
```

运行时间：

```text
up 15 min, 1 user, load average: 0.04, 0.07, 0.07
```

结论：

- 磁盘、内存符合购买规格。
- 当前机器负载很低，适合进入初始化。
- 120 GB 系统盘可用于首版，但 Meilisearch、Postgres、uploads 增长后需要监控磁盘水位。

## 网络与监听端口

网卡：

```text
lo    UNKNOWN 127.0.0.1/8 ::1/128
eth0  UP      10.9.4.4/22 fe80::5054:ff:fe4d:c013/64
```

监听端口摘要：

```text
tcp 0.0.0.0:22  ssh.socket
tcp [::]:22     ssh.socket
tcp 127.0.0.53:53 / 127.0.0.54:53 systemd-resolved
udp 127.0.0.1:323 chrony
```

结论：

- 公网入口当前只看到 SSH `22`。
- 未发现 Postgres、Redis、Meilisearch、API、embedding service 等业务端口暴露。
- 腾讯云防火墙已准备 `22/80/443/ICMP`，适合进入初始化；确认 SSH 稳定后建议把 `22` 收紧到当前运维公网 IP。

## Docker 状态

检查结果：

```text
bash: line 1: docker: command not found
```

结论：Docker 尚未安装。这符合新机状态。下一阶段需要受控安装 Docker Engine 和 Docker Compose plugin。

## 当前判断

可以进入服务器初始化，但仍不应切 DNS、不应导入数据。

建议下一步：

1. 在腾讯云控制台创建初始快照，命名建议：`lolobuy-before-init-2026-07-01`。
2. 收紧或暂时保留 SSH 防火墙：若能确认当前运维公网 IP，优先把 `22` 改为仅允许该 IP；否则初始化完成前临时保留全部 IPv4。
3. 开始 Phase 13：安装 Docker/Compose、创建 `/opt/lolobuyspreadsheets` 目录结构、生成新生产 secrets、准备生产 compose。
4. 初始化完成后再执行 baseline migration、产品域导入、uploads 解压、URL rewrite、safety cleanup、validation、Meilisearch rebuild。
