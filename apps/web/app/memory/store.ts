import { and, db, eq, memoryChunks, messages, ne } from '@mindweft/db';
import type { ProviderConfig } from '@mindweft/ai';
import { generateEmbedding, generateText } from '@mindweft/ai';
import {
  rankCandidates,
  splitIntoChunks,
  bm25,
  cosine,
  type RetrievalMode,
} from '@mindweft/memory';

export type MemoryTrace = {
  stage: string;
  durationMs: number;
  detail?: unknown;
};
const traces: MemoryTrace[] = [];
export function getMemoryTrace(): MemoryTrace[] {
  return [...traces];
}
function trace(stage: string, started: number, detail?: unknown): void {
  if (process.env.NODE_ENV !== 'production')
    traces.push({ stage, durationMs: Date.now() - started, detail });
}

export function createPendingChunks(conversationId: string): number {
  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt, messages.id)
    .all();
  const chunks = splitIntoChunks(
    rows.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  );
  let created = 0;
  for (const chunk of chunks) {
    const exists = db
      .select({ id: memoryChunks.id })
      .from(memoryChunks)
      .where(
        and(
          eq(memoryChunks.conversationId, conversationId),
          eq(memoryChunks.startMessageId, chunk.startMessageId),
          eq(memoryChunks.endMessageId, chunk.endMessageId),
        ),
      )
      .get();
    if (exists) continue;
    const now = Date.now();
    db.insert(memoryChunks)
      .values({
        id: crypto.randomUUID(),
        conversationId,
        startMessageId: chunk.startMessageId,
        endMessageId: chunk.endMessageId,
        sourceText: chunk.sourceText,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    created++;
  }
  return created;
}

export async function processPendingChunks(
  chat: ProviderConfig,
  embedding: ProviderConfig,
): Promise<void> {
  const pending = db
    .select()
    .from(memoryChunks)
    .where(ne(memoryChunks.status, 'ready'))
    .all();
  for (const chunk of pending) {
    const started = Date.now();
    try {
      db.update(memoryChunks)
        .set({ status: 'processing', updatedAt: Date.now(), errorCode: null })
        .where(eq(memoryChunks.id, chunk.id))
        .run();
      const summary = (
        await generateText({
          config: chat,
          messages: [
            {
              role: 'system',
              content:
                '请将以下对话摘要为一至两句中文，最多80字，保留人名、地点、日期、时间和数字。只输出摘要。',
            },
            { role: 'user', content: chunk.sourceText },
          ],
        })
      ).trim();
      if (!summary) throw new Error('empty_summary');
      const vector = await generateEmbedding({
        config: embedding,
        value: summary,
      });
      if (vector.length === 0) throw new Error('invalid_embedding');
      const profile = JSON.stringify({
        baseUrl: new URL(embedding.baseUrl).origin,
        model: embedding.model,
        dimension: vector.length,
      });
      db.update(memoryChunks)
        .set({
          summary,
          embedding: JSON.stringify(vector),
          dimension: vector.length,
          profile,
          status: 'ready',
          errorCode: null,
          updatedAt: Date.now(),
        })
        .where(eq(memoryChunks.id, chunk.id))
        .run();
      trace('chunk.processed', started, { id: chunk.id, summary, profile });
    } catch (error) {
      const errorCode =
        error instanceof Error &&
        ['empty_summary', 'invalid_embedding'].includes(error.message)
          ? error.message
          : 'provider_failed';
      db.update(memoryChunks)
        .set({ status: 'failed', errorCode, updatedAt: Date.now() })
        .where(eq(memoryChunks.id, chunk.id))
        .run();
      trace('chunk.failed', started, { id: chunk.id, errorCode });
    }
  }
}

export function retrieve(
  query: string,
  conversationId: string,
  queryVector: number[],
  profile: string,
  mode: RetrievalMode = 'rrf',
  limit = 5,
) {
  const started = Date.now();
  const rows = db
    .select()
    .from(memoryChunks)
    .where(
      and(
        eq(memoryChunks.status, 'ready'),
        ne(memoryChunks.conversationId, conversationId),
        eq(memoryChunks.profile, profile),
      ),
    )
    .all();
  const texts = rows.map((r) => r.sourceText);
  const lexical = bm25(query, texts);
  const candidates = rows.flatMap((row, i) => {
    if (!row.summary || !row.embedding) return [];
    let vector: number[];
    try {
      vector = JSON.parse(row.embedding) as number[];
    } catch {
      return [];
    }
    return [
      {
        id: row.id,
        conversationId: row.conversationId,
        startMessageId: row.startMessageId,
        endMessageId: row.endMessageId,
        summary: row.summary,
        sourceText: row.sourceText,
        vectorScore: cosine(queryVector, vector),
        bm25Score: lexical[i] ?? 0,
      },
    ];
  });
  const result = rankCandidates(candidates, mode, limit);
  trace('retrieval', started, { mode, candidates: result });
  return result;
}
