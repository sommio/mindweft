# AI 包指引

## What

提供 OpenAI-compatible Provider 的流式调用与错误分类，是 Web 层与 Provider SDK 之间的独立模块边界。

## Design direction

使用 Vercel AI SDK 7 的 `createOpenAI({baseURL, apiKey})` 接入 OpenAI-compatible 服务（v2 provider 实现与 `ai@7` 的 LanguageModelV2 接口匹配）。Web 层只从此包导入，不直接散落 Provider SDK 调用。

## Patterns

- `streamChat` 是唯一流式入口，接收已校验的 Provider 配置、历史消息与 `AbortSignal`，返回文本增量异步迭代器。
- 错误经 `classifyAiError` 归类为外部安全类别，不透传上游原始错误体。
- `validateProviderConfig` 是 Provider 配置的纯校验，服务端与客户端共用。

## Rules

- 永不记录、返回 `apiKey`、请求体或上游 `responseBody`。
- 错误类别固定为 `AiErrorCategory` union，`AiError.message` 为安全串。
- 透传 `AbortSignal`，支持客户端中断。

## Not to do

- 不实现持久化、记忆、工具调用、模型列表、Markdown。
- 不兼容 Anthropic 原生协议。
- 不在 AI 包引入 DOM 依赖或业务逻辑。