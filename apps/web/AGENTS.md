# Web 应用指引

## What

Next.js standalone 应用，也是未来全栈入口。

## Design direction

使用 App Router、server-first components；涉及 native database 的 route 使用 Node runtime。

## Patterns

Route handler 放在对应 route segment 旁边。显式导出 metadata 与类型。

## Rules

使用 strict TypeScript。功能 ticket 到来前保持 UI 占位页最小化。

## Not to do

T1 不添加 auth 或 database 代码；聊天与 PWA 已进入 M1 后续 ticket 范围。
