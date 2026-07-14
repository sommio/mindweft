# mindweft Agent Guide

## 项目概览

mindweft 是自托管私人 AI 陪伴前端。当前里程碑 M1 只建设基础设施，不添加业务功能。

## 技术栈

TypeScript、pnpm workspaces、Turborepo、Next.js App Router、SQLite/Drizzle、Vitest、Playwright。

## Harness

| 范围 | 指引文件 |
| --- | --- |
| Web 应用 | `apps/web/AGENTS.md` |
| 共享配置 | `packages/config/AGENTS.md` |
| 当前任务 | GitHub Issues |
| M1 历史记录 | `docs/history/m1-foundation.md` |
| 当前领域上下文与技术决策 | `CONTEXT.md` |

## Repository Instructions

- 所有文档必须主要使用中文编写，中文习惯上不翻译的术语才保留。

## Commit 规范

- 格式：`<type>[optional scope]: <description>`。
- `<type>` 和 `[optional scope]` 使用英文。
- `<description>` 使用简体中文，中文习惯上不翻译的英文技术术语保持英文。
- `type` 可选值：`feat`、`fix`、`chore`、`docs`、`refactor`、`perf`、`test`、`ci`、`build`、`style`、`revert`。

## PR 规范

- PR 标题和描述使用简体中文，中文习惯上不翻译的英文技术术语保持英文。
- PR 标题格式：`<type>[optional scope]: <description>`，同 Commit 规范。

## 工作流

- 编辑前阅读 ticket、上下文和对应目录指引。
- 在约定 seam 使用 TDD。
- 运行 `pnpm test`；格式问题使用 `pnpm format:fix`，lint 问题使用 `pnpm lint:fix`。`pnpm test` 统一执行 format、lint、typecheck、unit test 和 E2E。
- 保持 scaffold 最小化，不提前实现 deferred 功能。

## Git 安全

- 禁止使用 `git commit --no-verify`、`git push --no-verify` 或其他方式绕过 Git hook。Hook 失败时必须修复原因，或报告阻塞并停止提交。

## Agent skills

### Issue tracker

Issues 使用 GitHub Issues；外部 PR 也作为 triage 请求来源。详见 `docs/agents/issue-tracker.md`。

### Triage labels

使用默认五组 triage labels：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详见 `docs/agents/triage-labels.md`。

### Domain docs

使用 single-context 布局：根目录 `CONTEXT.md`，架构决策放在 `docs/adr/`。详见 `docs/agents/domain.md`。
