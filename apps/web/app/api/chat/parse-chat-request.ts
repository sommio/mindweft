import {
  type ChatMessage,
  type ProviderConfig,
  validateProviderConfig,
  type ProviderConfigError,
} from '@mindweft/ai';

export type ParseChatErrorCode =
  | 'invalid_body_shape'
  | 'provider_invalid'
  | 'messages_missing'
  | 'message_invalid'
  | 'messages_empty';

export type ParseChatResult =
  | { ok: true; provider: ProviderConfig; messages: ChatMessage[] }
  | {
      ok: false;
      code: ParseChatErrorCode;
      providerErrors?: ProviderConfigError[];
    };

const ROLES = new Set(['user', 'assistant']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isMessage(value: unknown): value is ChatMessage {
  if (!isObject(value)) return false;
  const role = value['role'];
  const content = value['content'];
  return (
    typeof role === 'string' &&
    ROLES.has(role) &&
    typeof content === 'string' &&
    content.trim() !== ''
  );
}

/**
 * 校验 `/api/chat` 请求体。错误结果只暴露安全 code，绝不包含 apiKey。
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

  const messagesInput = body['messages'];
  if (!Array.isArray(messagesInput)) {
    return { ok: false, code: 'messages_missing' };
  }
  if (messagesInput.length === 0) {
    return { ok: false, code: 'messages_empty' };
  }
  const messages: ChatMessage[] = [];
  for (const item of messagesInput) {
    if (!isMessage(item)) {
      return { ok: false, code: 'message_invalid' };
    }
    messages.push({ role: item.role, content: item.content });
  }

  return { ok: true, provider: providerValidation.config, messages };
}
