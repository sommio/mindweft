import { conversations, db, eq } from '@mindweft/db';

import { DEFAULT_CONVERSATION_ID } from '../../../chat/store/conversations';
import { clearConversationMessages } from '../../../chat/store/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 仅 E2E 测试使用：清空默认对话的消息并删除默认对话行，使下一次访问重建空状态。
 * 当且仅当 `MINDWEFT_E2E=1` 时生效；生产/Docker 不设该 env → 404。
 */
export function POST(): Response {
  if (process.env.MINDWEFT_E2E !== '1') {
    return new Response('Not Found', { status: 404 });
  }
  clearConversationMessages(DEFAULT_CONVERSATION_ID);
  db.delete(conversations)
    .where(eq(conversations.id, DEFAULT_CONVERSATION_ID))
    .run();
  return Response.json({ ok: true });
}
