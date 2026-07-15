import { renameConversation } from '../../../chat/store/conversations';
import { normalizeConversationName } from '../../../chat/lib/conversation-name';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * 重命名对话。请求体 `{ displayName }`，去空白、非空、不超长，否则 400。
 * 对话不存在回 404。成功返回更新后的对话摘要。
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
): Promise<Response> {
  const { conversationId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ code: 'invalid_body_shape' }, 400);
  }
  const raw =
    typeof body === 'object' &&
    body !== null &&
    'displayName' in body &&
    typeof body['displayName'] === 'string'
      ? body['displayName']
      : '';
  const name = normalizeConversationName(raw);
  if (name === null) return json({ code: 'invalid_name' }, 400);
  const updated = renameConversation(conversationId, name);
  if (updated === undefined)
    return json({ code: 'conversation_not_found' }, 404);
  return Response.json({ conversation: updated });
}
