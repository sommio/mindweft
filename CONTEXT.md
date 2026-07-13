# mindweft — 项目上下文

## 项目定位

mindweft 是自托管私人 AI 陪伴前端：AI 对话 + 记忆系统 + 扩展，docker compose 一键起，玩家自带 AI 凭证（BYOK）。

练手项目——目标练架构 + 模仿创作者开发方式，为回去做 TextCraft（AI 文字游戏平台）做准备。决策的 why 比 what 重要。

## 核心不变量

- 自托管，docker compose 部署，不上 serverless
- BYOK，provider 无关：AI 与 embedding 都走 Base URL 抽象，可接本地自建 or 外部 API
- embedding 走 API（非本地模型）——去掉 Python 生态最大拉力，全栈 TS 单语言
- monorepo 必须
- 敏捷迭代；禁止搞事——最小 scaffold，不镀金，功能迭代着加
- 仓库开源——免费 GitHub Actions + GHCR public 镜像
- 用户 B 级：少数测试者，简单 auth（auth defer 到聊天迭代）

## Agent 友好代码库（harness）

参考 https://martinfowler.com/articles/harness-engineering.html + https://dev.to/tacoda 系列（13 部）。原则：**Constrain, verify, scope, automate**——每类会犯的错配一个机器可查的约束，给 agent 一个命令验证。

- **单 `pnpm test` 信号**：一条命令 = format + lint + typecheck + unit(vitest) + e2e(playwright)。agent 唯一确定性反馈。配对 fix 脚本（`pnpm lint:fix` / `pnpm format:fix`），错误信息指向 fix 命令（positive prompt injection）。
- **strict 类型**：tsconfig `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noUnusedLocals/Parameters` 等。TypeScript = 计算传感器，缩 agent 错误空间。
- **strict lint**：ESLint 9 flat + `@typescript-eslint` strict + next + 包边界；Prettier。机器可查，agent 自验。
- **pre-commit 统一门**：调用 `pnpm test`，执行 format + lint + typecheck + unit + e2e。hook 拦截任一失败。
- **CI 全量门**：CI 跑全量 `pnpm test` + build + push，不可跳过。本地 docker 过 = CI 过。
- **清晰 seam**：`packages/{db,memory,ai,cron,push,config}` 各一职责；架构显式且无聊；契约先于实现。
- **harness 文档**：根 `AGENTS.md`（概览 + harness 表【area→guidance file】+ 工作流 + TDD）+ 每包 `AGENTS.md`（5 段：what / design-direction / patterns / rules / not-to-do），按目录懒加载；`CLAUDE.md` 软链 → `AGENTS.md`（Claude Code 读 CLAUDE.md，AGENTS.md 当通用 agent 标准 source of truth）。
- **TDD 当通信协议**：测试 = agent 要满足的 spec。先红后绿。
- **conventional commits + trunk-based 短命分支**：agent/人通信协议，快反馈。
- **steering loop**：agent 漂移 → 是 harness 缺口？是则先补 harness 再重做，纠正永久化。

## 技术栈（locked，详见 docs/research/tech-stack.md）

| 层 | 选型 |
| --- | --- |
| 语言 | TypeScript 7 |
| monorepo | pnpm workspaces + Turborepo |
| 全栈框架 | Next.js 16（App Router + route handlers + `output:'standalone'`，单进程单容器）|
| AI 网关 | Vercel AI SDK 7（`createAnthropic/createOpenAI({baseURL})` = BYOK；`providerOptions.anthropic.cacheControl` = prompt cache）|
| DB | better-sqlite3 + Drizzle ORM + drizzle-kit |
| 向量 | sqlite-vec（`vec0`，暴力 KNN；大了迁 pgvector HNSW）|
| 中文分词 | @node-rs/jieba（预编译二进制，无 node-gyp）|
| 混合检索 | sqlite-vec KNN + 应用内 BM25 + RRF 融合 |
| 记忆图 / 遗忘 | SQLite 表 + 应用内算法（cron 更新）|
| cron | node-cron 进程内（`instrumentation.ts`）|
| PWA | Serwist（`@serwist/next`）|
| Web push | web-push（VAPID）|
| 测试 | Vitest + Playwright（`APIRequestContext` 当 API E2E）|
| 部署 | 单 docker compose 服务 + SQLite volume；CI push GHCR public 镜像，VPS Watchtower 自动拉取（pull-based，零 deploy secret）|

## 目录结构

```
mindweft/
├─ apps/web/              # Next.js 全栈（单部署物）
├─ packages/{db,memory,ai,cron,push,config}/
├─ turbo.json
├─ pnpm-workspace.yaml
├─ docker-compose.yml     # 单服务 + SQLite volume（+ Caddy for TLS when push）
└─ .github/workflows/ci.yml
```

## 当前里程碑 M1：基建空壳，全绿，无功能

scaffold wire：monorepo + Next.js standalone + DB native 二进制 de-risk + PWA 壳 + 测试骨架 + docker compose + CI/CD。
defer：AI/聊天、记忆、cron、push、扩展、auth。
ticket DAG 见 `tickets.md`。

## 关键 de-risk / 坑

- native 二进制 in docker：better-sqlite3 + @node-rs/jieba 预编译二进制，多阶段 standalone 镜像要处理
- Serwist + Next standalone 构建兼容
- 用 better-sqlite3 / sqlite-vec 的 route handler 必须 `export const runtime = 'nodejs'`（不能 Edge）
- `outputFileTracingRoot` = monorepo root（Next trace monorepo 外文件）
- sqlite-vec 无 ANN（B-tier ≤~100K 向量够）
- Safari web push 需真域名 + TLS（compose 加 Caddy）
- Drizzle v1.0 RC

## 验证入口

- `pnpm test` = lint + typecheck + unit(vitest) + e2e(playwright)
- `docker compose up` 起 + health 绿
- CI 全绿 = push main → VPS 自动部署
