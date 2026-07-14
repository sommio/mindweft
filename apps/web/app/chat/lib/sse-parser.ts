export type SseEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; code: string }
  | { type: 'unknown' };

export type ParseSseResult = {
  events: SseEvent[];
  remainder: string;
};

function parseFrame(frame: string): SseEvent | null {
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
  if (data === undefined) return null;
  if (eventName === 'error') {
    let code = 'server_failed';
    try {
      const parsed = JSON.parse(data) as { code?: string };
      if (typeof parsed.code === 'string') code = parsed.code;
    } catch {
      code = 'server_failed';
    }
    return { type: 'error', code };
  }
  if (data === '[DONE]') return { type: 'done' };
  try {
    const parsed = JSON.parse(data) as { delta?: string };
    if (typeof parsed.delta === 'string')
      return { type: 'delta', delta: parsed.delta };
    return { type: 'unknown' };
  } catch {
    return { type: 'unknown' };
  }
}

/**
 * 把 SSE 字节缓冲按 `\n\n` 分帧解析为事件。未结束的尾部留给下次拼接。
 * `flush=true` 时把剩余的非空尾部当作最后一帧解析（流结束时使用），
 * 避免服务端终止帧的尾随 `\n\n` 跨 chunk 丢失导致 error/done 事件漏解析。
 */
export function parseSseEvents(buffer: string, flush = false): ParseSseResult {
  const events: SseEvent[] = [];
  const parts = buffer.split('\n\n');
  // flush 时所有分段都按完整帧处理；否则最后一段留作下次拼接的 remainder。
  const remainder = flush ? '' : (parts.pop() ?? '');

  for (const frame of parts) {
    if (frame.trim() === '') continue;
    const event = parseFrame(frame);
    if (event !== null) events.push(event);
  }

  return { events, remainder };
}
