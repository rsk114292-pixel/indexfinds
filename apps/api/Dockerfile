# ============ 阶段 1: 安装依赖 ============
FROM node:20-alpine AS deps
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# 只复制依赖文件，利用 Docker 层缓存。pnpm-workspace.yaml 包含
# overrides，frozen install 必须和锁文件一起读取它。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ============ 阶段 2: 构建 ============
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY --from=deps /app/node_modules ./node_modules

# commit hash 变化时自动使 COPY 缓存失效
ARG COMMIT_SHA=unknown
COPY . .

RUN pnpm build

# ============ 阶段 3: 生产运行 ============
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# bcrypt 需要的编译工具
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# TypeORM CLI 迁移所需文件
COPY --from=builder /app/data-source.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/nest-cli.json ./
COPY --from=builder /app/scripts ./scripts

# 安装生产依赖 + 迁移工具（ts-node、typescript、tsconfig-paths）
# 使用 --prod=false 保留 devDependency 中的迁移工具
RUN pnpm install --frozen-lockfile --prod=false \
    && rm -rf /root/.local/share/pnpm/store

# 创建上传目录
RUN mkdir -p /app/uploads \
    && chmod +x /app/scripts/ops/start-prod.sh

ENV NODE_ENV=production
ENV PORT=4101
ENV UPLOADS_PATH=/app/uploads
EXPOSE 4101

# 健康检查
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["/app/scripts/ops/start-prod.sh"]
