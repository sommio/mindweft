import { classifyAiError, type ChatMessage, streamChat } from '@mindweft/ai';

import { parseChatRequest } from './parse-chat-request';
import { ensureDefaultConversation } from '../../chat/store/conversations';
import {
  insertAssistantMessage,
  insertUserMessage,
  listMessages,
} from '../../chat/store/messages';

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

  // 绑定唯一默认对话：先持久化用户消息，再读取有序历史作为 Provider 上下文。
  const conversation = ensureDefaultConversation();
  insertUserMessage(conversation.id, parsed.content);
  const history: ChatMessage[] = listMessages(conversation.id).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let stream;
  try {
    stream = streamChat({
      config: parsed.provider,
      messages: history,
      signal: request.signal,
    });
  } catch (error) {
    // 同步创建失败（例如 Provider 工厂抛错）：返回安全类别，不含上游细节。
    return json({ code: classifyAiError(error) }, 502);
  }

  const encoder = new TextEncoder();
  const bodyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = '';
      try {
        for await (const delta of stream.textStream) {
          assistantText += delta;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
          );
        }
        const streamError = await stream.error;
        if (streamError === undefined && assistantText.trim() !== '') {
          // 流正常结束且有内容：持久化完整 assistant 消息，再发 [DONE]。
          insertAssistantMessage(conversation.id, assistantText);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } else {
          // 异常路径：Provider 错误、用户中断、或流结束但无内容（schema 拒空内容）。
          // 一律不持久化部分 assistant 内容，发安全 error 事件（用户中断静默）。
          const category =
            streamError === undefined
              ? 'server_failed'
              : classifyAiError(streamError);
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
        // 用户中断或客户端断开：静默关闭，不发 error 事件，不持久化。
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
