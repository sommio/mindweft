# Domain docs

工程 skills 探索代码库时，应读取本仓库的领域文档。

## 探索前读取

- 根目录 `CONTEXT.md`
- `docs/adr/` 中与当前工作区域相关的 ADR

若文件或目录不存在，静默继续，不主动要求预先创建。`domain-modeling` 会在术语或决策真正确定时按需创建它们。

## 文件布局

本仓库使用 single-context 布局：

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

如果未来领域边界变得清晰，可迁移到 multi-context：在根目录增加 `CONTEXT-MAP.md`，再由它指向各 context 的 `CONTEXT.md`；系统级 ADR 放在 `docs/adr/`，context-specific ADR 放在对应 context 的 `docs/adr/`。

## 使用 glossary 术语

Issue 标题、重构提案、假设和测试名称中的领域概念，应使用 `CONTEXT.md` 定义的术语。不要随意改用 glossary 明确避免的同义词。

如果所需概念尚未出现在 glossary 中，应将其视为术语缺口，交给 `domain-modeling` 处理。

## ADR 冲突

如果输出与现有 ADR 冲突，必须明确指出冲突，不得静默覆盖。例如：

> 与 ADR-0007 冲突；但由于……，建议重新审议该 ADR。
