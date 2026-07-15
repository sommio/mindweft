import {
  createConversation,
  ensureDefaultConversation,
  listConversations,
} from '../../chat/store/conversations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  ensureDefaultConversation();
  return Response.json({ conversations: listConversations() });
}

export function POST(): Response {
  return Response.json({ conversation: createConversation() }, { status: 201 });
}
