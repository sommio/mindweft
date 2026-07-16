import {
  createPendingChunks,
  processPendingChunks,
} from '../../../memory/store';
import { validateProviderConfig, type ProviderConfig } from '@mindweft/ai';
import { getConversation } from '../../../chat/store/conversations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function config(value: unknown): ProviderConfig | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const x = value as Record<string, unknown>;
  const result = validateProviderConfig({
    baseUrl: typeof x.baseUrl === 'string' ? x.baseUrl : '',
    apiKey: typeof x.apiKey === 'string' ? x.apiKey : '',
    model: typeof x.model === 'string' ? x.model : '',
  });
  return result.ok ? result.config : undefined;
}
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const conversationId =
    typeof body?.conversationId === 'string' ? body.conversationId : 'default';
  const chat = config(body?.chatProvider);
  const embedding = config(body?.embeddingProvider);
  if (getConversation(conversationId) === undefined)
    return Response.json({ code: 'conversation_not_found' }, { status: 404 });
  createPendingChunks(conversationId);
  if (!chat || !embedding)
    return Response.json({
      ok: true,
      processed: false,
      code: 'provider_not_configured',
    });
  await processPendingChunks(chat, embedding);
  return Response.json({ ok: true, processed: true });
}
