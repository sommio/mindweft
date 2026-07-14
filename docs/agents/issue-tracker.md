# Issue tracker：GitHub

本仓库的 Issues 和 PRDs 使用 GitHub Issues 管理。所有相关操作使用 `gh` CLI。

## 约定

- 创建 issue：`gh issue create --title "..." --body "..."`
- 读取 issue：`gh issue view <number> --comments`
- 列出 issue：根据需要使用 `gh issue list --state open`，并获取 labels 和 comments
- 评论 issue：`gh issue comment <number> --body "..."`
- 添加或移除 label：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- 关闭 issue：`gh issue close <number> --comment "..."`

在仓库 clone 中运行时，`gh` 会根据 Git remote 自动识别仓库。

## Pull Request 作为 triage 请求来源

外部 Pull Request 纳入 triage。`triage` 应处理外部贡献者提交的请求，并将其纳入相同的 labels 和状态流；协作者正在进行中的 PR 不应被误处理。

识别外部 PR 时，保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的 PR，排除 `OWNER`、`MEMBER` 和 `COLLABORATOR`。

- 读取 PR：`gh pr view <number> --comments`，必要时使用 `gh pr diff <number>`
- 列出 PR：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`
- 评论或管理 label：使用 `gh pr comment`、`gh pr edit --add-label` / `--remove-label`
- 关闭 PR：`gh pr close`

GitHub 的 issue 和 PR 共用编号空间。遇到裸编号（例如 `#42`）时，先尝试 `gh pr view 42`，再回退到 `gh issue view 42`。

## 发布到 issue tracker

当 skill 要求发布内容到 issue tracker 时，创建 GitHub issue。

## Wayfinding

`wayfinder` 使用一个 GitHub issue 作为 map，并使用子 issue 作为 tickets。阻塞关系优先使用 GitHub 原生 issue dependencies；若不可用，则在子 issue 顶部记录 `Blocked by: #<n>`。
