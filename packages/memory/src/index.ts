export type ChunkMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};
export type Chunk = {
  startMessageId: string;
  endMessageId: string;
  sourceText: string;
  messageCount: number;
};

export function splitIntoChunks(messages: ChunkMessage[], size = 10): Chunk[] {
  const result: Chunk[] = [];
  for (let i = 0; i + size <= messages.length; i += size) {
    const group = messages.slice(i, i + size);
    const first = group[0];
    const last = group[group.length - 1];
    if (first === undefined || last === undefined) continue;
    result.push({
      startMessageId: first.id,
      endMessageId: last.id,
      messageCount: size,
      sourceText: group
        .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
        .join('\n'),
    });
  }
  return result;
}

export type RetrievalMode = 'vector-only' | 'bm25-only' | 'hybrid' | 'rrf';
export type Candidate = {
  id: string;
  conversationId: string;
  startMessageId: string;
  endMessageId: string;
  summary: string;
  sourceText: string;
  vectorScore: number;
  bm25Score: number;
  score: number;
  rank: number;
};

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }
  return aa === 0 || bb === 0 ? 0 : dot / Math.sqrt(aa * bb);
}

function tokenize(text: string): string[] {
  return Array.from(
    text.toLocaleLowerCase().matchAll(/[\p{Script=Han}]|[\p{L}\p{N}_]+/gu),
    (m) => m[0],
  );
}
export function bm25(query: string, documents: string[]): number[] {
  const q = tokenize(query);
  const docs = documents.map(tokenize);
  const n = documents.length;
  const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, n);
  const df = new Map<string, number>();
  for (const d of docs)
    for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  return docs.map((d) =>
    q.reduce((score, term) => {
      const f = d.filter((x) => x === term).length;
      if (!f) return score;
      const idf = Math.log(
        1 + (n - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5),
      );
      return (
        score +
        (idf * (f * 2.2)) /
          (f + 1.2 * (0.8 + (0.2 * d.length) / Math.max(1, avg)))
      );
    }, 0),
  );
}

export function rankCandidates(
  items: Omit<Candidate, 'score' | 'rank'>[],
  mode: RetrievalMode,
  limit = 5,
): Candidate[] {
  const max = Math.max(1, ...items.map((x) => x.bm25Score));
  const vectorOrder = [...items].sort(
    (a, b) => b.vectorScore - a.vectorScore || a.id.localeCompare(b.id),
  );
  const lexicalOrder = [...items].sort(
    (a, b) => b.bm25Score - a.bm25Score || a.id.localeCompare(b.id),
  );
  const vectorRanks = new Map(vectorOrder.map((x, i) => [x.id, i + 1]));
  const lexicalRanks = new Map(lexicalOrder.map((x, i) => [x.id, i + 1]));
  const ranked = items.map((x) => ({
    ...x,
    score:
      mode === 'vector-only'
        ? x.vectorScore
        : mode === 'bm25-only'
          ? x.bm25Score
          : mode === 'hybrid'
            ? 0.7 * Math.max(0, Math.min(1, x.vectorScore)) +
              (0.3 * x.bm25Score) / max
            : 1 / (60 + (vectorRanks.get(x.id) ?? 999)) +
              1 / (60 + (lexicalRanks.get(x.id) ?? 999)),
    rank: 0,
  }));
  ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return ranked.slice(0, limit).map((x, i) => ({ ...x, rank: i + 1 }));
}
