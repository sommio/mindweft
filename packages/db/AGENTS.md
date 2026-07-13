# DB 包指引

## What

提供 SQLite 连接、Drizzle schema、migration 与查询入口。

## Design direction

使用 `better-sqlite3` 持有连接；先加载 `sqlite-vec`，再交给 Drizzle。数据库保持单进程、同步、显式。

## Patterns

- schema 放在 `src/schema.ts`。
- migration 由 `drizzle-kit` 生成，运行 `pnpm --filter @mindweft/db db:migrate`。
- 查询通过导出的 `db` 与 schema 表完成。

## Rules

- 使用 `DATABASE_URL` 配置 SQLite 文件路径，默认 `./data/mindweft.db`。
- 任何使用 native SQLite 的 route 必须声明 `runtime = 'nodejs'`。
- schema 变更必须同时生成 migration。

## Not to do

- 不在 DB 包实现业务服务、repository 或记忆算法。
- 不添加连接池、远程数据库或 serverless adapter。
