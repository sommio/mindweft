import { getConversation } from '../../../../chat/store/conversations';
import { listMessages } from '../../../../chat/store/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
): Promise<Response> {
  const { conversationId } = await context.params;
  if (getConversation(conversationId) === undefined)
    return Response.json({ code: 'conversation_not_found' }, { status: 404 });
  return Response.json({ messages: listMessages(conversationId) });
}
