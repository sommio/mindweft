export type AiErrorCategory =
  | 'provider_rejected'
  | 'provider_invalid'
  | 'network_unreachable'
  | 'stream_aborted'
  | 'server_failed';

export class AiError extends Error {
  readonly category: AiErrorCategory;
  constructor(category: AiErrorCategory) {
    super(category);
    this.name = 'AiError';
    this.category = category;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStatus(error: unknown): number | undefined {
  if (!isObject(error)) return undefined;
  const a = error['httpStatus'];
  const b = error['statusCode'];
  const c = error['responseStatus'];
  for (const v of [a, b, c]) {
    if (typeof v === 'number') return v;
  }
  return undefined;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isAbortError(error: unknown): boolean {
  if (!isObject(error)) return false;
  return (
    error['name'] === 'AbortError' ||
    error['name'] === 'ResponseAborted' ||
    error['name'] === 'TimeoutError'
  );
}

function isNetworkError(error: unknown): boolean {
  if (!isObject(error)) return false;
  const name = asString(error['name']);
  const message = asString(error['message']);
  if (name === 'TypeError' && /fetch/i.test(message)) return true;
  if (name === 'APIConnectionError') return true;
  // AI SDK 把连接级失败包成 AI_APICallError，message 以 "Cannot connect to API" 开头。
  if (/cannot connect to api/i.test(message)) return true;
  if (
    /ECONNREFUSED|ENOTFOUND|ECONNRESET|EAI_AGAIN|other side closed/i.test(
      message,
    )
  )
    return true;
  return false;
}

/**
 * 把任意错误归入外部安全类别。永不包含上游 responseBody、请求体或 apiKey。
 */
export function classifyAiError(error: unknown): AiErrorCategory {
  if (isAbortError(error)) return 'stream_aborted';
  if (isNetworkError(error)) return 'network_unreachable';
  const status = readStatus(error);
  if (status === 401 || status === 403) return 'provider_rejected';
  if (status === 400 || status === 404) return 'provider_invalid';
  if (status === 422) return 'provider_invalid';
  return 'server_failed';
}
