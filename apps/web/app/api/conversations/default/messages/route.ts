import { ensureDefaultConversation } from '../../../../chat/store/conversations';
import { listMessages } from '../../../../chat/store/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 返回默认对话的全部有序消息。不返回任何 Provider 配置或 BYOK 凭证。
 */
export function GET(): Response {
  const conversation = ensureDefaultConversation();
  const messages = listMessages(conversation.id);
  return Response.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}
