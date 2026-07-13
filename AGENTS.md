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
| Tickets 与技术决策 | `tickets.md`、`CONTEXT.md` |

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
