# mindweft — M1 基建历史记录

里程碑 M1：基建空壳，全绿，无功能。禁止搞事——最小 scaffold，不镀金，不加半行业务代码。
技术栈与决策见 `CONTEXT.md` 与 `docs/research/tech-stack.md`。
agent 友好 / harness 原则见 `CONTEXT.md`「Agent 友好代码库」节。

这份文件记录 M1 基建阶段的目标、决策、依赖和完成结果，不是当前任务 tracker。

当前任务使用 GitHub Issues；新功能不要追加到本文件。

---

## T1 — monorepo + Next.js standalone 骨架 + strict 工具链 + harness 文档
**状态：** 已完成
**blocking edges：** 无（地基）
**做：**
- pnpm workspaces + Turborepo：`apps/web`、`packages/config`
- `apps/web`：Next.js 16 App Router，`output:'standalone'`，占位首页
- `turbo.json`：`lint`/`typecheck`/`test`/`build`/`e2e` 任务，`dependsOn` + `inputs/outputs` + cache
- **`packages/config`**：strict `tsconfig.base.json`（`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noUnusedLocals/Parameters`、`verbatimModuleSyntax`）；ESLint 9 flat config（`@typescript-eslint` strict type-checked + next + 包边界）；Prettier
- **根 `package.json` 单 `pnpm test` 入口** = `prettier --check . && turbo run lint typecheck test e2e`（agent 唯一确定性信号）；不提供单独的 lint/format 检查脚本；保留配对 fix 脚本 `pnpm lint:fix` / `pnpm format:fix`（错误信息指向 fix 命令 = positive prompt injection）
- **`.gitignore`**：node_modules、.next、.turbo、dist、.env*、*.db、*.sqlite、coverage、playwright-report、test-results、.DS_Store
- **harness 文档**：根 `AGENTS.md`（项目概览 + 技术栈 + harness 表【area→guidance file】+ `pnpm test` 工作流 + TDD）+ `apps/web/AGENTS.md`、`packages/config/AGENTS.md`（5 段式：what / design-direction / patterns / rules / not-to-do）；`CLAUDE.md` 软链 → `AGENTS.md`（Claude Code 读 CLAUDE.md，AGENTS.md 当通用 agent 标准 source of truth）
**完成定义：** `pnpm dev` 起占位页；`pnpm build` 绿；`pnpm test` 跑通 lint+typecheck（unit/e2e 待 T3 接 runner）；turbo cache 工作。

## T2 — DB 层：Drizzle + better-sqlite3 + sqlite-vec（de-risk native 二进制）
**状态：** 已完成
**blocking edges：** T1
**做：**
- `packages/db`：Drizzle schema（一条 trivial 表），better-sqlite3 `Database`，`sqliteVec.load(db)`，drizzle-kit migration
- 一个 health query route（`export const runtime = 'nodejs'`）证明 DB 通
- `packages/db/AGENTS.md`：schema/migration/query 规约 + not-to-do
**完成定义：** migration 跑通；health query 返回；本地 `pnpm dev` DB 路由绿。
**为何：** 排 native 二进制在 Node 跑通的雷——scaffold 最大基建隐患。

## T3 — PWA 壳 + 测试骨架 + pre-commit（单 `pnpm test` 信号成型）
**状态：** 已完成
**blocking edges：** T1
**做：**
- `@serwist/next`：`app/sw.ts`、manifest、可安装；`next.config` `withSerwist` + standalone 兼容
- Vitest config + 一条 trivial unit；Playwright config + 一条 trivial E2E（页加载）
- **pre-commit hook**：调用统一 `pnpm test`；format、lint、typecheck、unit(vitest)、E2E 全部通过才允许提交。失败时使用 `pnpm lint:fix` / `pnpm format:fix`
- **`pnpm test` 信号成型** = format + lint + typecheck + unit(vitest) + e2e(playwright) 一条命令全过
**完成定义：** 构建绿 + SW 注册 + 可安装；`pnpm test` 全绿；pre-commit 拦住 format/lint 错。

## T4 — Dockerfile + docker-compose（boots green，native 二进制 in image）
**状态：** 已完成
**blocking edges：** T1、T2
**做：**
- `apps/web/Dockerfile`：多阶段 standalone（参考 vercel/next.js examples/with-docker），处理 better-sqlite3 + @node-rs/jieba 预编译二进制，`outputFileTracingRoot` = monorepo root
- `docker-compose.yml`：单 web 服务 + SQLite volume
- 原则："本地 docker 过 = CI 过"——agent 环境与 CI 对齐
**完成定义：** `docker compose up` 起 + health query 通。

## T5 — GitHub Actions CI/CD 全流水线 + pull-based deploy
**状态：** 已完成
**blocking edges：** T1、T2、T3、T4
**做：**
- `.github/workflows/ci.yml`（public repo 免费）：**CI 跑全量 `pnpm test`**（lint+typecheck+unit+e2e）+ build(docker) + push image to GHCR（自动 `GITHUB_TOKEN`，public 镜像无需 secret）。CI = 不可跳过的最终门。
- **pull-based deploy，零 deploy secret in GitHub**：VPS 侧 Watchtower（或 cron `docker compose pull && up -d`）拉 public GHCR 镜像自动更新。CI 不 SSH 进 VPS，SSH key 永不进 GitHub。
- Turborepo remote cache
- conventional commits + trunk-based 短命分支（harness 通信协议）
**完成定义：** push main → CI 全绿（`pnpm test` + build + push）→ 镜像入 GHCR → VPS 自动拉取部署 + 服务起来。

---

## Frontier（当前可做）
暂无。

## Defer 到功能迭代（不在 M1）
AI/聊天（AI SDK）、记忆系统（embedding/BM25/图谱/遗忘/cron 维护）、web push、扩展（读书器/五子棋/信件/倒计时/daily/表情包/MCP）、auth（聊天迭代加）、包边界强制规则（eslint-plugin-boundaries，首个功能起加）。
