import { parseSseEvents } from './sse-parser';

export type SseCallbacks = {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (code: string) => void;
};

/**
 * 向 `/api/chat` 发送 POST 并消费 SSE 流。
 * `!res.ok` 时解析 JSON `{code}` 后回调 onError。
 */
export async function postStream(
  url: string,
  body: unknown,
  callbacks: SseCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
    if (signal !== undefined) init.signal = signal;
    res = await fetch(url, init);
  } catch {
    if (signal?.aborted) return;
    callbacks.onError('network_unreachable');
    return;
  }

  if (!res.ok) {
    let code = 'server_failed';
    try {
      const data = (await res.json()) as { code?: string };
      if (typeof data.code === 'string') code = data.code;
    } catch {
      code = 'server_failed';
    }
    callbacks.onError(code);
    return;
  }

  const reader = res.body?.getReader();
  if (reader === undefined) {
    callbacks.onError('server_failed');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, remainder } = parseSseEvents(buffer);
      buffer = remainder;
      for (const event of events) {
        if (event.type === 'delta') {
          callbacks.onDelta(event.delta);
        } else if (event.type === 'done') {
          callbacks.onDone();
          return;
        } else if (event.type === 'error') {
          callbacks.onError(event.code);
          return;
        }
      }
    }
    callbacks.onDone();
  } catch {
    if (signal?.aborted) return;
    callbacks.onError('network_unreachable');
  }
}
