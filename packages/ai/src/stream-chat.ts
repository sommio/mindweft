import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

import type { ProviderConfig } from './provider-config';
import { AiError, classifyAiError } from './errors';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type StreamChatResult = {
  textStream: AsyncIterable<string>;
  error: Promise<Error | undefined>;
};

export type StreamChatInput = {
  config: ProviderConfig;
  messages: ChatMessage[];
  signal?: AbortSignal;
};

/**
 * 调用 OpenAI-compatible Provider 并返回流式文本。
 *
 * AI SDK 7 的 `textStream` 在 API 错误（如 401/500）时不会抛出，只结束流；
 * 原始错误通过 `onError` 捕获并经 `error` 暴露，供调用方分类。
 * 网络/中断错误会直接从 `textStream` 抛出。
 *
 * 安全：apiKey 只传给 Provider 工厂，不进入日志、返回值或错误信息。
 */
export function streamChat(input: StreamChatInput): StreamChatResult {
  const provider = createOpenAI({
    baseURL: input.config.baseUrl,
    apiKey: input.config.apiKey,
  });
  const model = provider.chat(input.config.model);

  let settle: (error: Error | undefined) => void;
  const errorPromise = new Promise<Error | undefined>((resolve) => {
    settle = resolve;
  });
  let settled = false;
  const once = (error: Error | undefined) => {
    if (!settled) {
      settled = true;
      settle(error);
    }
  };

  const base = {
    model,
    messages: input.messages,
    maxRetries: 0,
    onError: (event: { error: unknown }) => {
      once(
        event.error instanceof Error
          ? event.error
          : new Error(String(event.error)),
      );
    },
    onFinish: () => {
      once(undefined);
    },
  };

  let result;
  try {
    result =
      input.signal === undefined
        ? streamText(base)
        : streamText({ ...base, abortSignal: input.signal });
  } catch (error) {
    throw new AiError(classifyAiError(error));
  }

  return {
    textStream: result.textStream,
    error: errorPromise,
  };
}
