# syntax=docker/dockerfile:1.7

# deps —— 安装全量依赖（含 better-sqlite3/sqlite-vec 原生二进制；prebuilt 不匹配时兜底编译）
FROM node:22-slim AS deps
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ libsqlite3-dev ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

# builder —— 构建产物（standalone）
FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# runner —— 最小运行镜像
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next standalone server.js 用 HOSTNAME 作 bind 地址；Docker 默认注入容器名作 HOSTNAME，
# 会只绑到容器名 IPv6 导致 3000 不可达。显式设 0.0.0.0（Docker 不覆盖 image 已声明的 HOSTNAME）。
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=/data/mindweft.db
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --home-dir /app nextjs \
  && mkdir -p /data \
  && chown -R nextjs:nodejs /app /data
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# sqlite-vec 原生扩展（vec0.so）在 optionalDependencies 平台子包 sqlite-vec-linux-<arch> 内；
# index.cjs 运行时 require.resolve("sqlite-vec-linux-<arch>/vec0.so")，从 .pnpm/sqlite-vec@.../node_modules/sqlite-vec/index.cjs
# 向上查 <ancestor>/node_modules/<pkg>，命中 .pnpm/sqlite-vec@.../node_modules/，但静态 tracing 漏掉平台子包。
# 用 bind mount 从 builder 取平台子包，按 uname -m 映射 arch（x86_64→x64, arm64→arm64），放到 require 命中处。
RUN --mount=type=bind,from=builder,source=/app/node_modules/.pnpm,target=/tmp/pnpm \
  set -e; \
  case "$(uname -m)" in \
    x86_64) A=x64;; aarch64|arm64) A=arm64;; *) echo "unsupported arch $(uname -m)" >&2; exit 1;; \
  esac; \
  mkdir -p "/app/node_modules/.pnpm/sqlite-vec@0.1.9/node_modules"; \
  cp -a "/tmp/pnpm/sqlite-vec-linux-$A@0.1.9/node_modules/sqlite-vec-linux-$A" \
        "/app/node_modules/.pnpm/sqlite-vec@0.1.9/node_modules/"; \
  chown -R nextjs:nodejs "/app/node_modules/.pnpm/sqlite-vec@0.1.9/node_modules/sqlite-vec-linux-$A"
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]