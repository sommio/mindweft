import {
  type ProviderConfig,
  validateProviderConfig,
  type ProviderConfigError,
} from '@mindweft/ai';

export type ParseChatErrorCode =
  'invalid_body_shape' | 'provider_invalid' | 'message_invalid';

export type ParseChatResult =
  | {
      ok: true;
      provider: ProviderConfig;
      embeddingProvider?: ProviderConfig;
      content: string;
    }
  | {
      ok: false;
      code: ParseChatErrorCode;
      providerErrors?: ProviderConfigError[];
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * 校验 `/api/chat` 请求体：`{ provider, content }`。
 * 历史消息由服务端从数据库读取，客户端只发送本次新文本。
 * 错误结果只暴露安全 code，绝不包含 apiKey。
 */
export function parseChatRequest(body: unknown): ParseChatResult {
  if (!isObject(body)) {
    return { ok: false, code: 'invalid_body_shape' };
  }

  const providerInput = body['provider'];
  if (!isObject(providerInput)) {
    return { ok: false, code: 'provider_invalid' };
  }
  const providerValidation = validateProviderConfig({
    baseUrl: asString(providerInput['baseUrl']),
    apiKey: asString(providerInput['apiKey']),
    model: asString(providerInput['model']),
  });
  if (!providerValidation.ok) {
    return {
      ok: false,
      code: 'provider_invalid',
      providerErrors: providerValidation.errors,
    };
  }

  const content = body['content'];
  if (typeof content !== 'string' || content.trim() === '') {
    return { ok: false, code: 'message_invalid' };
  }

  const embeddingInput = body['embeddingProvider'];
  let embeddingProvider: ProviderConfig | undefined;
  if (isObject(embeddingInput)) {
    const result = validateProviderConfig({
      baseUrl: asString(embeddingInput['baseUrl']),
      apiKey: asString(embeddingInput['apiKey']),
      model: asString(embeddingInput['model']),
    });
    if (result.ok) embeddingProvider = result.config;
  }
  return {
    ok: true,
    provider: providerValidation.config,
    ...(embeddingProvider ? { embeddingProvider } : {}),
    content,
  };
}
