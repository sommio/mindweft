export type SseEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; code: string }
  | { type: 'unknown' };

export type ParseSseResult = {
  events: SseEvent[];
  remainder: string;
};

/**
 * 把 SSE 字节缓冲按 `\n\n` 分帧解析为事件。未结束的尾部留给下次拼接。
 */
export function parseSseEvents(buffer: string): ParseSseResult {
  const events: SseEvent[] = [];
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() ?? '';

  for (const frame of parts) {
    if (frame.trim() === '') continue;
    const lines = frame.split('\n');
    let eventName: string | undefined;
    let data: string | undefined;
    for (const line of lines) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event: ')) {
        eventName = line.slice('event: '.length);
      } else if (line.startsWith('data: ')) {
        data = line.slice('data: '.length);
      }
    }
    if (data === undefined) continue;
    if (eventName === 'error') {
      let code = 'server_failed';
      try {
        const parsed = JSON.parse(data) as { code?: string };
        if (typeof parsed.code === 'string') code = parsed.code;
      } catch {
        code = 'server_failed';
      }
      events.push({ type: 'error', code });
      continue;
    }
    if (data === '[DONE]') {
      events.push({ type: 'done' });
      continue;
    }
    try {
      const parsed = JSON.parse(data) as { delta?: string };
      if (typeof parsed.delta === 'string') {
        events.push({ type: 'delta', delta: parsed.delta });
      } else {
        events.push({ type: 'unknown' });
      }
    } catch {
      events.push({ type: 'unknown' });
    }
  }

  return { events, remainder };
}
