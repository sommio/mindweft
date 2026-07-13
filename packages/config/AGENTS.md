# Config 包指引

## What

共享 TypeScript、ESLint 和格式化配置。

## Design direction

集中维护 strict 默认配置；消费者可以添加 framework-specific 设置。

## Patterns

通过稳定的 package 路径导出配置。

## Rules

规则必须可由机器检查，并保持依赖轻量。

## Not to do

不在此处放置应用逻辑或功能依赖。
