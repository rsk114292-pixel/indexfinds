FROM node:24-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_HOSTNAME
ARG NEXT_PUBLIC_SITE_URL=https://indexfinds.com
ARG NEXT_PUBLIC_APP_URL=https://indexfinds.com
ARG NEXT_PUBLIC_SITE_NAME=IndexFinds
ARG NEXT_PUBLIC_APP_NAME=IndexFinds
ARG NEXT_PUBLIC_AUTH_ENTRY_ENABLED=false
ARG NEXT_PUBLIC_REGISTRATION_ENABLED=false
ARG NEXT_PUBLIC_CDN_WEBP=true

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_HOSTNAME=$NEXT_PUBLIC_API_HOSTNAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_AUTH_ENTRY_ENABLED=$NEXT_PUBLIC_AUTH_ENTRY_ENABLED \
    NEXT_PUBLIC_REGISTRATION_ENABLED=$NEXT_PUBLIC_REGISTRATION_ENABLED \
    NEXT_PUBLIC_CDN_WEBP=$NEXT_PUBLIC_CDN_WEBP \
    NEXT_PRIVATE_STANDALONE=true

RUN pnpm build

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3101

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3101
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3101/ >/dev/null || exit 1

CMD ["node", "server.js"]
