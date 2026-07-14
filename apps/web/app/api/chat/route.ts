import { classifyAiError, streamChat } from '@mindweft/ai';

import { parseChatRequest } from './parse-chat-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SSE_HEADERS: Record<string, string> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-store, no-transform',
  'x-accel-buffering': 'no',
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ code: 'invalid_body_shape' }, 400);
  }

  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return json(
      parsed.providerErrors
        ? { code: parsed.code, providerErrors: parsed.providerErrors }
        : { code: parsed.code },
      400,
    );
  }

  let stream;
  try {
    stream = streamChat({
      config: parsed.provider,
      messages: parsed.messages,
      signal: request.signal,
    });
  } catch (error) {
    // 同步创建失败（例如 Provider 工厂抛错）：返回安全类别，不含上游细节。
    return json({ code: classifyAiError(error) }, 502);
  }

  const encoder = new TextEncoder();
  const bodyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of stream.textStream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
          );
        }
        // API 错误（401/500 等）不抛入 textStream；从 error 取捕获的原始错误。
        const streamError = await stream.error;
        if (streamError === undefined) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } else {
          const category = classifyAiError(streamError);
          if (category !== 'stream_aborted') {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ code: category })}\n\n`,
              ),
            );
          }
        }
      } catch (error) {
        const category = classifyAiError(error);
        // 用户中断或客户端断开：静默关闭，不发 error 事件。
        if (category !== 'stream_aborted') {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ code: category })}\n\n`,
            ),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(bodyStream, { headers: SSE_HEADERS });
}
